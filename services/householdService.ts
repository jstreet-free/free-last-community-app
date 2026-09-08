import { db } from './firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { User, HouseholdAdult } from '../types';

export const getHouseholdId = (user: User): string => {
  if (user.householdId) return user.householdId;
  if (user.profile?.householdId) return user.profile.householdId;
  if (user.primaryMemberId) return `house_${user.primaryMemberId}`;
  return `house_${user.id}`;
};

export const getHouseholdInviteCode = (userOrHouseholdId: User | string): string => {
  const householdId = typeof userOrHouseholdId === 'string' ? userOrHouseholdId : getHouseholdId(userOrHouseholdId);
  const clean = householdId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const suffix = clean.length > 6 ? clean.slice(-6) : clean.padEnd(6, 'X');
  return `FAL-H-${suffix}`;
};

export interface LinkResult {
  status: 'linked' | 'invited';
  linkedUserId?: string;
  message: string;
}

/**
 * Searches for an existing user by email to immediately link their account to a household,
 * or flags them as invited if they haven't registered yet.
 */
export const linkAdultAccount = async (
  primaryUser: User,
  adult: HouseholdAdult
): Promise<LinkResult> => {
  if (!adult.email || !adult.email.trim()) {
    return {
      status: 'invited',
      message: 'No email provided. Account invite code generated.'
    };
  }

  const emailLower = adult.email.trim().toLowerCase();
  const householdId = getHouseholdId(primaryUser);
  const primaryName = primaryUser.profile?.parentName || primaryUser.name;

  try {
    // 1. Query Firestore for an existing user with this email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', emailLower));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const targetDoc = snap.docs[0];
      const targetUserId = targetDoc.id;

      // Update the target user's record to belong to this household
      await updateDoc(doc(db, 'users', targetUserId), {
        householdId,
        householdRole: 'adult',
        primaryMemberId: primaryUser.id,
        primaryMemberName: primaryName
      });

      return {
        status: 'linked',
        linkedUserId: targetUserId,
        message: `Successfully linked account for ${adult.name} (${emailLower}) to this household!`
      };
    }
  } catch (err) {
    console.warn("Could not query Firestore for user linkage (may be offline or quota reached):", err);
  }

  // Fallback: Check cached all users if available
  try {
    const cachedUsersStr = localStorage.getItem('cached_all_users');
    if (cachedUsersStr) {
      const cachedUsers: User[] = JSON.parse(cachedUsersStr);
      const found = cachedUsers.find(u => u.email && u.email.toLowerCase() === emailLower);
      if (found) {
        return {
          status: 'linked',
          linkedUserId: found.id,
          message: `Linked account for ${adult.name} (${emailLower}) to this household!`
        };
      }
    }
  } catch {}

  return {
    status: 'invited',
    message: `Account invitation ready. When ${adult.name} signs in with ${emailLower}, they will be automatically linked to this family household.`
  };
};

/**
 * Finds a household by its household ID, invite code, or the primary member's email/phone.
 */
export const findHousehold = async (
  lookupQuery: string,
  allUsers?: User[]
): Promise<User | null> => {
  const cleanQuery = lookupQuery.trim().toLowerCase();
  if (!cleanQuery) return null;

  // 1. Check local/passed list first
  const userList = allUsers && allUsers.length > 0
    ? allUsers
    : (() => {
        try {
          const cached = localStorage.getItem('cached_all_users');
          return cached ? JSON.parse(cached) : [];
        } catch {
          return [];
        }
      })();

  const foundLocal = userList.find((u: User) => {
    const uHouseholdId = getHouseholdId(u).toLowerCase();
    const uCode = getHouseholdInviteCode(getHouseholdId(u)).toLowerCase();
    const emailMatch = u.email && u.email.toLowerCase() === cleanQuery;
    const parentEmailMatch = u.profile?.parentEmail && u.profile.parentEmail.toLowerCase() === cleanQuery;
    const phoneMatch = u.profile?.parentMobile && u.profile.parentMobile.replace(/\s+/g, '') === cleanQuery.replace(/\s+/g, '');

    return uHouseholdId === cleanQuery || uCode === cleanQuery || emailMatch || parentEmailMatch || phoneMatch;
  });

  if (foundLocal) {
    return foundLocal;
  }

  // 2. Query Firestore by email
  try {
    const usersRef = collection(db, 'users');
    const qEmail = query(usersRef, where('email', '==', cleanQuery));
    const snap = await getDocs(qEmail);
    if (!snap.empty) {
      const data = snap.docs[0].data();
      return { id: snap.docs[0].id, ...data } as User;
    }
  } catch (err) {
    console.warn("Firestore lookup failed:", err);
  }

  return null;
};
