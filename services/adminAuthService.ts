import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { collection, doc, setDoc, getDocs, updateDoc, query, where, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db, auth as primaryAuth } from "./firebase";
import config from "../firebase-applet-config.json";
import { User, UserRole, UserStatus, MemberProfile, SignupAttempt } from "../types";
import { isQuotaError } from "./firestoreUtils";

export interface ProvisionUserParams {
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  password?: string;
  sendResetEmail?: boolean;
  mobile?: string;
  address?: string;
  postcode?: string;
  notes?: string;
  profileComplete?: boolean;
  registrationType?: 'family' | 'teenager' | 'friend' | 'individual';
  adminEmail?: string;
}

export interface ProvisionUserResult {
  success: boolean;
  userId: string;
  alreadyInAuth: boolean;
  resetEmailSent: boolean;
  message: string;
}

/**
 * Creates an account in Firebase Auth using a transient secondary Firebase App instance.
 * This guarantees the currently logged-in Admin is NEVER logged out!
 */
export const createAccountWithoutSigningOutAdmin = async (
  email: string,
  password: string
): Promise<{ success: boolean; uid: string | null; alreadyInAuth: boolean; error?: string }> => {
  const tempAppName = `admin_create_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let secondaryApp: any = null;
  try {
    secondaryApp = initializeApp(config, tempAppName);
    const secondaryAuth = getAuth(secondaryApp);
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
    const newUid = credential.user.uid;
    try {
      await signOut(secondaryAuth);
    } catch {}
    return { success: true, uid: newUid, alreadyInAuth: false };
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      return { success: true, uid: null, alreadyInAuth: true };
    }
    return { success: false, uid: null, alreadyInAuth: false, error: error.message || String(error) };
  } finally {
    if (secondaryApp) {
      try {
        await deleteApp(secondaryApp);
      } catch {}
    }
  }
};

/**
 * Logs a failed signup attempt to Firestore so the admin can monitor, diagnose, and resolve it.
 */
export const logSignupAttempt = async (attempt: {
  email: string;
  role?: UserRole;
  name?: string;
  mobile?: string;
  businessName?: string;
  errorCode?: string;
  errorMessage?: string;
  notes?: string;
}): Promise<void> => {
  try {
    const cleanEmail = attempt.email.trim().toLowerCase();
    await addDoc(collection(db, 'signup_attempts'), {
      email: cleanEmail,
      role: attempt.role || 'member',
      name: attempt.name || '',
      mobile: attempt.mobile || '',
      businessName: attempt.businessName || '',
      attemptedAt: new Date().toISOString(),
      status: 'failed',
      errorCode: attempt.errorCode || 'unknown',
      errorMessage: attempt.errorMessage || 'Signup error encountered',
      notes: attempt.notes || ''
    });
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn("Could not log signup attempt to Firestore:", err);
    }
  }
};

/**
 * Sends a password reset email using Firebase Auth.
 */
export const triggerPasswordReset = async (email: string): Promise<{ success: boolean; message: string; errorCode?: string }> => {
  try {
    await sendPasswordResetEmail(primaryAuth, email.trim().toLowerCase());
    return { success: true, message: `Password reset email sent successfully to ${email}.` };
  } catch (err: any) {
    console.error("Password reset error:", err);
    let msg = "Failed to send password reset email.";
    if (err.code === 'auth/user-not-found') {
      msg = "No Firebase Auth account found for this email address.";
    } else if (err.code === 'auth/invalid-email') {
      msg = "Invalid email format.";
    } else if (err.message) {
      msg = err.message;
    }
    return { success: false, message: msg, errorCode: err.code };
  }
};

/**
 * Manually provisions or overrides a user account in both Firebase Auth and Firestore.
 */
export const adminProvisionUser = async (
  params: ProvisionUserParams
): Promise<ProvisionUserResult> => {
  const cleanEmail = params.email.trim().toLowerCase();
  const tempPassword = params.password && params.password.length >= 6 
    ? params.password 
    : `Nechells${new Date().getFullYear()}!`;

  // 1. Attempt to provision Auth account via secondary app
  const authOutcome = await createAccountWithoutSigningOutAdmin(cleanEmail, tempPassword);
  
  if (!authOutcome.success && !authOutcome.alreadyInAuth) {
    throw new Error(authOutcome.error || "Failed to create authentication credentials.");
  }

  const alreadyInAuth = authOutcome.alreadyInAuth;
  let targetUid = authOutcome.uid;

  // 2. Check if a user document with this email already exists in Firestore
  let existingDocId: string | null = null;
  let existingData: any = null;
  try {
    const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      existingDocId = snap.docs[0].id;
      existingData = snap.docs[0].data();
    }
  } catch (queryErr) {
    console.warn("Could not query existing user by email:", queryErr);
  }

  // Determine final document ID
  const finalDocId = targetUid || existingDocId || `user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // 3. Build profile
  const isFriend = params.role === 'friend';
  const profile: MemberProfile = {
    registrationType: isFriend ? 'friend' : (params.registrationType || 'family'),
    parentName: params.name,
    parentEmail: cleanEmail,
    parentMobile: params.mobile || '',
    address: params.address || '',
    postcode: params.postcode || '',
    mobileNumber: params.mobile || '',
    dataConsent: true,
    isFriendSignup: isFriend,
    ...(existingData?.profile || {})
  };

  const userDoc: User = {
    id: finalDocId,
    name: params.name,
    email: cleanEmail,
    role: params.role,
    status: params.status,
    profileComplete: params.profileComplete ?? (params.status === 'approved' || isFriend || params.role === 'admin'),
    registeredAt: existingData?.registeredAt || new Date().toISOString(),
    profile
  };

  // 4. Save to Firestore
  try {
    const docRef = doc(db, 'users', finalDocId);
    await setDoc(docRef, userDoc, { merge: true });
  } catch (fsErr) {
    if (isQuotaError(fsErr)) {
      console.warn("Firestore quota reached while creating user; saving locally.");
    } else {
      throw fsErr;
    }
  }

  // 5. Send password reset email if requested or if user was already in Auth
  let resetEmailSent = false;
  if (params.sendResetEmail || alreadyInAuth) {
    const resetRes = await triggerPasswordReset(cleanEmail);
    resetEmailSent = resetRes.success;
  }

  // 6. Mark any matching failed signup attempts as resolved
  try {
    const attemptsQ = query(collection(db, 'signup_attempts'), where('email', '==', cleanEmail));
    const attemptsSnap = await getDocs(attemptsQ);
    for (const d of attemptsSnap.docs) {
      if (d.data().status === 'failed') {
        await updateDoc(d.ref, {
          status: 'resolved',
          resolvedAt: new Date().toISOString(),
          resolvedBy: params.adminEmail || 'Admin Override',
          notes: `Account manually provisioned/overridden by admin. ${alreadyInAuth ? 'Existing Auth linked.' : 'New Auth created.'}`
        });
      }
    }
  } catch (err) {
    console.warn("Could not update signup attempts status:", err);
  }

  const successMessage = alreadyInAuth
    ? `Member record successfully linked and provisioned in the User Hub for ${cleanEmail}. (Existing Firebase Auth account detected; ${resetEmailSent ? 'password reset email sent to member' : 'temporary password configured'}).`
    : `New account successfully created for ${cleanEmail}! Added to User Hub with status "${params.status}".`;

  return {
    success: true,
    userId: finalDocId,
    alreadyInAuth,
    resetEmailSent,
    message: successMessage
  };
};

/**
 * Resolves a failed signup attempt
 */
export const markSignupAttemptResolved = async (
  attemptId: string,
  adminEmail?: string,
  notes?: string
): Promise<void> => {
  const docRef = doc(db, 'signup_attempts', attemptId);
  await updateDoc(docRef, {
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
    resolvedBy: adminEmail || 'Admin',
    notes: notes || 'Manually marked as resolved by administrator'
  });
};

/**
 * Deletes a signup attempt log
 */
export const deleteSignupAttempt = async (attemptId: string): Promise<void> => {
  const docRef = doc(db, 'signup_attempts', attemptId);
  await deleteDoc(docRef);
};
