
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Home } from './views/Home';
import { Activities } from './views/Activities';
import { Gallery } from './views/Gallery';
import { VolunteerLogView } from './views/VolunteerLog';
import { MemberWellbeing } from './views/MemberWellbeing';
import { MemberRegistration } from './views/MemberRegistration';
import { Partners } from './views/Partners';
import { AdminAssets } from './views/AdminAssets';
import { TeamRegistration } from './views/TeamRegistration';
import { FriendsOf } from './views/FriendsOf';
import { Videos } from './views/Videos';
import { PhotoPolicyModal } from './components/PhotoPolicyModal';
import { MemberSupportWidget } from './components/MemberSupportWidget';
import { User, UserRole, MemberProfile, Announcement, Activity, Partner, ImpactStory, Inquiry, Booking, TeamLog, GalleryAlbum, MailLog, MoodLog, CaseStudyRequest, CaseStudy } from './types';
import { Icons, COLORS, IMAGES as DEFAULT_IMAGES, SAMPLE_ANNOUNCEMENTS, SAMPLE_ACTIVITIES, SAMPLE_PARTNERS, SAMPLE_IMPACT_STORIES } from './constants';

import { db, auth } from './services/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, addDoc, updateDoc, serverTimestamp, getDoc, where, increment } from 'firebase/firestore';
import { 
  signInAnonymously, 
  signOut, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';

import { handleFirestoreError, OperationType } from './services/firestoreUtils';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('freeatlast_v2_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('freeatlast_v2_active_tab') || 'home';
  });

  // Persist active tab
  useEffect(() => {
    localStorage.setItem('freeatlast_v2_active_tab', activeTab);
  }, [activeTab]);

  // Auth State Listener
  useEffect(() => {
    // Ensure persistence is set to local
    setPersistence(auth, browserLocalPersistence);
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Sync with Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            let userData = { ...userSnap.data(), id: firebaseUser.uid } as User;
            
            // Force admin status for owner
            if (firebaseUser.email?.toLowerCase() === 'jstreet@freeatlast.st' && (userData.role !== 'admin' || !userData.profileComplete)) {
              userData = { ...userData, role: 'admin', profileComplete: true, status: 'approved' };
              try {
                await updateDoc(userRef, { role: 'admin', profileComplete: true, status: 'approved' });
              } catch (err) {
                console.error("Owner upgrade failed to write to Firestore:", err);
              }
            }

            // Ensure team members or friends are marked as complete and approved
            if (userData.role === 'team' && (userData.name || userData.status === 'approved') && !userData.profileComplete) {
              userData.profileComplete = true;
              try {
                await updateDoc(userRef, { profileComplete: true });
              } catch (err) {
                console.error("Team complete update failed to write to Firestore:", err);
              }
            }

            if (userData.role === 'friend' && (!userData.profileComplete || userData.status !== 'approved')) {
              userData.profileComplete = true;
              userData.status = 'approved';
              try {
                await updateDoc(userRef, { profileComplete: true, status: 'approved' });
              } catch (err) {
                console.error("Friend complete update failed to write to Firestore:", err);
              }
            }
            
            setUser(userData);
            localStorage.setItem('freeatlast_v2_user', JSON.stringify(userData));
          } else {
            // User authenticated but not found in Firestore. Check cache.
            const saved = localStorage.getItem('freeatlast_v2_user');
            if (saved) {
              const cachedUser = JSON.parse(saved);
              if (cachedUser.id === firebaseUser.uid) {
                setUser(cachedUser);
                return;
              }
            }
            // Fallback for new user with missing profile document
            const defaultUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              role: 'member',
              profileComplete: false,
              status: 'approved',
              registeredAt: new Date().toISOString()
            };
            setUser(defaultUser);
          }
        } catch (error) {
          console.error("Firestore error in onAuthStateChanged (potentially Quota Exceeded):", error);
          // Graceful fallback to cached user profile
          const saved = localStorage.getItem('freeatlast_v2_user');
          if (saved) {
            const cachedUser = JSON.parse(saved);
            if (cachedUser.id === firebaseUser.uid) {
              setUser(cachedUser);
              return;
            }
          }
          // Ultimate safe fallback
          const defaultUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email || '',
            role: 'member',
            profileComplete: true,
            status: 'approved',
            registeredAt: new Date().toISOString()
          };
          setUser(defaultUser);
        }
      } else {
        setUser(null);
        localStorage.removeItem('freeatlast_v2_user');
      }
    });
    return () => unsubscribe();
  }, []);

  const [bookings, setBookings] = useState<string[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [hasConfirmedPhotoPolicy, setHasConfirmedPhotoPolicy] = useState(() => {
    return localStorage.getItem('freeatlast_photo_policy_confirmed') === 'true';
  });
  
  const [assets, setAssets] = useState(() => {
    const saved = localStorage.getItem('cached_assets');
    return saved ? JSON.parse(saved) : DEFAULT_IMAGES;
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem('cached_announcements');
    return saved ? JSON.parse(saved) : [];
  });
  const [activities, setActivities] = useState<Activity[]>(() => {
    const saved = localStorage.getItem('cached_activities');
    return saved ? JSON.parse(saved) : [];
  });
  const [partners, setPartners] = useState<Partner[]>(() => {
    const saved = localStorage.getItem('cached_partners');
    return saved ? JSON.parse(saved) : SAMPLE_PARTNERS;
  });
  const [impactStories, setImpactStories] = useState<ImpactStory[]>(() => {
    const saved = localStorage.getItem('cached_impact_stories');
    return saved ? JSON.parse(saved) : SAMPLE_IMPACT_STORIES;
  });
  const [inquiries, setInquiries] = useState<Inquiry[]>(() => {
    const saved = localStorage.getItem('cached_inquiries');
    return saved ? JSON.parse(saved) : [];
  });
  const [sessionRegistrations, setSessionRegistrations] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('cached_session_registrations');
    return saved ? JSON.parse(saved) : [];
  });
  const [userRegistrations, setUserRegistrations] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('cached_user_registrations');
    return saved ? JSON.parse(saved) : [];
  });
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('cached_all_users');
    return saved ? JSON.parse(saved) : [];
  });
  const [teamLogs, setTeamLogs] = useState<TeamLog[]>(() => {
    const saved = localStorage.getItem('cached_team_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [wellbeingLogs, setWellbeingLogs] = useState<MoodLog[]>(() => {
    const saved = localStorage.getItem('cached_wellbeing_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [galleryAlbums, setGalleryAlbums] = useState<GalleryAlbum[]>(() => {
    const saved = localStorage.getItem('cached_gallery_albums');
    return saved ? JSON.parse(saved) : [];
  });
  const [mailLogs, setMailLogs] = useState<MailLog[]>(() => {
    const saved = localStorage.getItem('cached_mail_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [warnings, setWarnings] = useState<any[]>(() => {
    const saved = localStorage.getItem('cached_warnings');
    return saved ? JSON.parse(saved) : [];
  });
  const [caseStudyRequests, setCaseStudyRequests] = useState<CaseStudyRequest[]>(() => {
    const saved = localStorage.getItem('cached_case_study_requests');
    return saved ? JSON.parse(saved) : [];
  });
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>(() => {
    const saved = localStorage.getItem('cached_case_studies');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Persist user and tab
  useEffect(() => {
    if (user) {
      localStorage.setItem('freeatlast_v2_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('freeatlast_v2_user');
    }
  }, [user]);

  // Sync assets from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'assets'), (snapshot) => {
      const newAssets = { ...DEFAULT_IMAGES };
      snapshot.forEach((doc) => {
        newAssets[doc.id] = doc.data().value;
      });
      setAssets(newAssets);
      localStorage.setItem('cached_assets', JSON.stringify(newAssets));
    }, (error) => {
      console.error("Assets snapshot error:", error);
    });
    return () => unsubscribe();
  }, []);

  // Sync announcements from Firestore
  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Announcement[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Announcement);
      });
      setAnnouncements(items);
      localStorage.setItem('cached_announcements', JSON.stringify(items));
    }, (error) => {
      console.error("Announcements snapshot error:", error);
    });
    return () => unsubscribe();
  }, []);

  // Sync activities from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'activities'), (snapshot) => {
      const items: Activity[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Activity);
      });
      setActivities(items);
      localStorage.setItem('cached_activities', JSON.stringify(items));
    }, (error) => {
      console.error("Activities snapshot error:", error);
    });
    return () => unsubscribe();
  }, []);

  // Sync partners from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'partners'), (snapshot) => {
      const items: Partner[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Partner);
      });
      // Fallback to SAMPLE_PARTNERS if empty (to seed initial load)
      const finalItems = items.length > 0 ? items : SAMPLE_PARTNERS;
      setPartners(finalItems);
      localStorage.setItem('cached_partners', JSON.stringify(finalItems));
    }, (error) => {
      console.error("Partners snapshot error:", error);
    });
    return () => unsubscribe();
  }, []);

  // Sync impact stories from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'impact_stories'), (snapshot) => {
      const items: ImpactStory[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as ImpactStory);
      });
      // Fallback to SAMPLE_IMPACT_STORIES if empty
      const finalItems = items.length > 0 ? items : SAMPLE_IMPACT_STORIES;
      setImpactStories(finalItems);
      localStorage.setItem('cached_impact_stories', JSON.stringify(finalItems));
    }, (error) => {
      console.error("Impact stories snapshot error:", error);
    });
    return () => unsubscribe();
  }, []);

  // Sync inquiries from Firestore based on user role
  useEffect(() => {
    let q;
    if (user?.role === 'admin') {
      q = query(collection(db, 'inquiries'), orderBy('timestamp', 'desc'));
    } else if (user?.id) {
      q = query(collection(db, 'inquiries'), where('userId', '==', user.id));
    } else {
      setInquiries([]);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Inquiry[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Inquiry);
      });
      items.sort((a, b) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
        return timeB - timeA;
      });
      setInquiries(items);
      localStorage.setItem('cached_inquiries', JSON.stringify(items));
    }, (error) => {
      console.error("Inquiries snapshot error:", error);
    });
    return () => unsubscribe();
  }, [user?.role, user?.id]);

  // Sync all session registrations from Firestore (Admin only)
  useEffect(() => {
    if (user?.role !== 'admin') {
      setSessionRegistrations([]);
      return;
    }
    const unsubscribe = onSnapshot(query(collection(db, 'bookings'), orderBy('bookingDate', 'desc')), (snapshot) => {
      const items: Booking[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Booking);
      });
      setSessionRegistrations(items);
      localStorage.setItem('cached_session_registrations', JSON.stringify(items));
    }, (error) => {
      console.error("Session registrations snapshot error:", error);
    });
    return () => unsubscribe();
  }, [user?.role]);

  // Sync current user's personal bookings (for highlight UI and recurring logic)
  useEffect(() => {
    if (!user?.id) {
      setBookings([]);
      setUserRegistrations([]);
      return;
    }
    const q = query(collection(db, 'bookings'), where('userId', '==', user.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ids: string[] = [];
      const fullBookings: Booking[] = [];
      snapshot.forEach(doc => {
        const data = { id: doc.id, ...doc.data() } as Booking;
        ids.push(data.sessionId);
        fullBookings.push(data);
      });
      setBookings(ids);
      setUserRegistrations(fullBookings);
      localStorage.setItem('cached_user_registrations', JSON.stringify(fullBookings));
    }, (error) => {
      console.error("User bookings snapshot error:", error);
    });
    return () => unsubscribe();
  }, [user?.id]);

  // Sync users from Firestore (Admin only)
  useEffect(() => {
    if (user?.role !== 'admin') return;
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const items: User[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as User);
      });
      setAllUsers(items);
      localStorage.setItem('cached_all_users', JSON.stringify(items));
    }, (error) => {
      console.error("Users snapshot error:", error);
    });
    return () => unsubscribe();
  }, [user?.role]);

  // Sync warnings from Firestore (Admin only)
  useEffect(() => {
    if (user?.role !== 'admin') return;
    const unsubscribe = onSnapshot(collection(db, 'warnings'), (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      // Sort client-side
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setWarnings(items);
      localStorage.setItem('cached_warnings', JSON.stringify(items));
    }, (error) => {
      console.error("Warnings snapshot error:", error);
    });
    return () => unsubscribe();
  }, [user?.role]);

  // Sync team logs from Firestore
  useEffect(() => {
    if (!user) {
      setTeamLogs([]);
      return;
    }
    
    // Admins see all logs, Team members only see their own
    // Removed orderBy to avoid index requirements; sorting client-side
    let q = query(collection(db, 'team_logs'));
    if (user.role !== 'admin') {
      q = query(collection(db, 'team_logs'), where('teamMemberId', '==', user.id));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: TeamLog[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as TeamLog);
      });
      // Sort client-side by date desc
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTeamLogs(items);
      localStorage.setItem('cached_team_logs', JSON.stringify(items));
    }, (error) => {
      console.error("Team logs sync error:", error);
      if (error.message.includes('index')) {
        setNotification("System update: Some data might be slow to load while indexes are building.");
      }
    });
    return () => unsubscribe();
  }, [user?.role, user?.id]);

  // Sync wellbeing logs from Firestore
  useEffect(() => {
    if (!user) {
      setWellbeingLogs([]);
      return;
    }
    
    // Admins see all, others see only theirs
    let q = query(collection(db, 'wellbeing_logs'));
    if (user.role !== 'admin') {
      q = query(collection(db, 'wellbeing_logs'), where('memberId', '==', user.id));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: MoodLog[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as MoodLog);
      });
      // Sort client-side by date desc
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setWellbeingLogs(items);
      localStorage.setItem('cached_wellbeing_logs', JSON.stringify(items));
    }, (error) => {
      console.error("Wellbeing logs sync error:", error);
    });
    return () => unsubscribe();
  }, [user?.role, user?.id]);

  // Sync gallery albums from Firestore
  useEffect(() => {
    const q = query(collection(db, 'gallery_albums'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: GalleryAlbum[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as GalleryAlbum);
      });
      setGalleryAlbums(items);
      localStorage.setItem('cached_gallery_albums', JSON.stringify(items));
    }, (error) => {
      console.error("Gallery albums snapshot error:", error);
    });
    return () => unsubscribe();
  }, []);

  // Sync case study requests from Firestore
  useEffect(() => {
    const q = query(collection(db, 'case_study_requests'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: CaseStudyRequest[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as CaseStudyRequest);
      });
      setCaseStudyRequests(items);
      localStorage.setItem('cached_case_study_requests', JSON.stringify(items));
    }, (error) => {
      console.error("Case study requests sync error:", error);
    });
    return () => unsubscribe();
  }, []);

  // Sync case studies from Firestore (Admin sees all, members see only theirs)
  useEffect(() => {
    if (!user) {
      setCaseStudies([]);
      return;
    }
    let q = query(collection(db, 'case_studies'));
    if (user.role !== 'admin') {
      q = query(collection(db, 'case_studies'), where('memberId', '==', user.id));
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: CaseStudy[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as CaseStudy);
      });
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setCaseStudies(items);
      localStorage.setItem('cached_case_studies', JSON.stringify(items));
    }, (error) => {
      console.error("Case studies sync error:", error);
    });
    return () => unsubscribe();
  }, [user?.role, user?.id]);

  // Sync current user specifically to handle real-time approval
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.id), (snapshot) => {
      if (snapshot.exists()) {
        const updatedData = snapshot.data() as User;
        
        // Deep check for changes to prevent redundant re-renders
        const hasStatusChange = updatedData.status !== user.status;
        const hasRoleChange = updatedData.role !== user.role;
        const hasApproval = updatedData.status === 'approved' && user.status === 'pending';

        if (hasApproval) {
          setNotification("Welcome aboard! Your team access has been approved.");
          setActiveTab('home');
        }

        // Only update if something meaningful changed to prevent remounting sub-components
        const currentDataStr = JSON.stringify({ ...user, id: undefined });
        const newDataStr = JSON.stringify({ ...updatedData, id: undefined });
        
        if (currentDataStr !== newDataStr) {
          setUser({ ...updatedData, id: snapshot.id });
        }
      }
    });
    return () => unsubscribe();
  }, [user?.id, user?.status]);

  // Sync mail logs from Firestore (Admin only)
  useEffect(() => {
    if (user?.role !== 'admin') {
      setMailLogs([]);
      return;
    }
    const q = query(collection(db, 'mail')); 
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: MailLog[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as MailLog);
      });
      items.sort((a, b) => {
        const timeA = a.delivery?.endTime?.seconds ? a.delivery.endTime.seconds * 1000 : 0;
        const timeB = b.delivery?.endTime?.seconds ? b.delivery.endTime.seconds * 1000 : 0;
        return timeB - timeA;
      });
      setMailLogs(items);
      localStorage.setItem('cached_mail_logs', JSON.stringify(items));
    }, (error) => {
      console.error("Mail logs snapshot error:", error);
    });
    return () => unsubscribe();
  }, [user?.role]);

  const handleUpdateAsset = async (key: string, newValue: string) => {
    try {
      await setDoc(doc(db, 'assets', key), { value: newValue });
    } catch (error) {
      console.error("Error updating asset:", error);
      setNotification("Failed to save image. Storage might be full.");
    }
  };

  const handleUpdateAnnouncements = async (newAnnouncements: Announcement[]) => {
    // Note: AdminAssets handles individual adds/deletes via service if possible, 
    // but here we might need to reconcile. For now, we'll implement individual handlers in AdminAssets.
  };

  const handleUpdateActivities = async (newActivities: Activity[]) => {
    // Similar to announcements
  };

  const handleResetAssets = () => {
    if (window.confirm("Are you sure you want to reset all images to stock photos?")) {
      setAssets(DEFAULT_IMAGES);
    }
  };

  const handleForgotPassword = async (email: string) => {
    if (!email || email.length < 3) {
      setNotification("Please enter your username or email above first so we know where to send the link.");
      return;
    }
    
    let finalEmail = email.trim().toLowerCase();
    if (!finalEmail.includes('@')) {
      finalEmail = `${finalEmail.replace(/\s/g, '')}@freeatlast.hub`;
    }

    try {
      await sendPasswordResetEmail(auth, finalEmail);
      setNotification(`Password reset email sent to ${finalEmail}. Check your inbox!`);
    } catch (error: any) {
      console.error("Reset error:", error);
      setNotification("Failed to send reset email. Ensure the email is correct.");
    }
  };

  const handleLogin = async (role: UserRole, email?: string, password?: string, isSignUp?: boolean, extraFields?: { name?: string; mobile?: string; businessName?: string }) => {
    setIsLoggingIn(true);
    try {
      let uid = '';
      if (email && password) {
        if (isSignUp) {
          try {
            const authResult = await createUserWithEmailAndPassword(auth, email, password);
            uid = authResult.user.uid;
          } catch (signUpError: any) {
            if (signUpError.code === 'auth/email-already-in-use') {
              // Sign in existing user to see if they are trying to upgrade or just logging in
              try {
                const signInResult = await signInWithEmailAndPassword(auth, email, password);
                uid = signInResult.user.uid;
              } catch (signInError: any) {
                // Throw custom error to show meaningful instruction instead of "Incorrect password" during SignUp
                const customError = new Error("This email is already registered. If you are trying to sign up or log in, please enter your correct existing password, or go back to the 'Sign In' page and click 'Forgot Password' to reset it.");
                (customError as any).code = 'auth/email-already-in-use-wrong-password';
                throw customError;
              }
            } else {
              throw signUpError;
            }
          }
        } else {
          const authResult = await signInWithEmailAndPassword(auth, email, password);
          uid = authResult.user.uid;
        }
      } else {
        const authResult = await signInAnonymously(auth);
        uid = authResult.user.uid;
      }
      
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data() as User;
        
        // UPGRADE LOGIC: If a user logs in (or signs up with existing email) and provides a specific role
        // that is more privileged than their current role, we allow upgrade if conditions met.
        // Or simply, if they selected 'admin' or 'team' during signup and are currently 'member' or 'friend', we upgrade.
        let updatedRole = userData.role;
        let updatedStatus = userData.status;
        
        // Special case for owner email
        if (email?.toLowerCase() === 'jstreet@freeatlast.st') {
          updatedRole = 'admin';
          updatedStatus = 'approved';
        } else if (isSignUp) {
           if (role === 'admin' && userData.role !== 'admin') {
             updatedRole = 'admin';
             updatedStatus = 'approved';
           } else if (role === 'team' && userData.role !== 'team' && userData.role !== 'admin') {
             updatedRole = 'team';
             updatedStatus = 'pending';
           } else if (role === 'friend' && userData.role !== 'friend' && userData.role !== 'admin') {
             updatedRole = 'friend';
             updatedStatus = 'approved';
           }
        }
           
        const isFriendRole = updatedRole === 'friend';
        if (updatedRole !== userData.role || updatedStatus !== userData.status || (updatedRole === 'admin' && !userData.profileComplete) || (updatedStatus === 'approved' && !userData.profileComplete) || (isFriendRole && !userData.profileComplete)) {
          const updates: any = { role: updatedRole, status: updatedStatus };
          if (updatedRole === 'admin' || updatedStatus === 'approved' || isFriendRole) updates.profileComplete = true;
          if (isFriendRole && (!userData.profile || userData.profile.registrationType !== 'friend')) {
            updates.profile = {
              registrationType: 'friend' as any,
              parentName: extraFields?.name || userData.name || '',
              parentEmail: email || userData.email || '',
              parentMobile: extraFields?.mobile || '',
              businessName: extraFields?.businessName || '',
              isFriendSignup: true,
              dataConsent: true
            };
          }
          await updateDoc(userRef, updates);
        }

        const finalUser = { 
          ...userData, 
          id: uid, 
          role: updatedRole, 
          status: updatedStatus, 
          profileComplete: (updatedRole === 'admin' || updatedStatus === 'approved' || isFriendRole) ? true : userData.profileComplete 
        };
        setUser(finalUser);
        localStorage.setItem('freeatlast_v2_user', JSON.stringify(finalUser));
        
        // Navigation based on final role
        if (updatedRole === 'admin') setActiveTab('assets');
        else if (updatedRole === 'team') setActiveTab(updatedStatus === 'approved' ? 'team' : 'registration');
        else if (updatedRole === 'friend') setActiveTab('friends');
        else setActiveTab(userData.profileComplete ? 'home' : 'registration');
      } else {
        // New user creation
        const isOwner = email?.toLowerCase() === 'jstreet@freeatlast.st';
        const finalRole = isOwner ? 'admin' : role;
        const finalStatus = isOwner ? 'approved' : (finalRole === 'friend' ? 'approved' : (finalRole === 'admin' ? 'approved' : 'pending'));

        const newUser: User = {
          id: uid,
          name: isOwner ? 'James Street' : (extraFields?.name || (email ? email.split('@')[0] : 'Friend')),
          email: email || `${finalRole}@freeatlast.hub`,
          role: finalRole,
          profileComplete: finalRole === 'friend' || finalRole === 'admin',
          status: finalStatus,
          registeredAt: new Date().toISOString()
        };

        if (finalRole === 'friend') {
          newUser.profile = {
            registrationType: 'friend' as any,
            parentName: extraFields?.name || '',
            parentEmail: email || '',
            parentMobile: extraFields?.mobile || '',
            livingWith: '',
            address: '',
            dataConsent: true,
            mobileNumber: extraFields?.mobile || '',
            businessName: extraFields?.businessName || '',
            isFriendSignup: true
          } as any;
        }
        await setDoc(userRef, newUser);
        setUser(newUser);
        
        setActiveTab(finalRole === 'admin' ? 'assets' : (finalRole === 'friend' ? 'friends' : 'registration'));
      }
    } catch (error: any) {
      console.error("Auth error details:", error);
      let msg = "";
      if (error.code === 'auth/email-already-in-use-wrong-password') {
        msg = error.message;
      } else if (error.code === 'permission-denied') msg = "Database access denied. Please contact support.";
      else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') msg = "Incorrect password or email.";
      else if (error.code === 'auth/user-not-found') msg = "No account found. Please Sign Up first.";
      else if (error.code === 'auth/invalid-email') msg = "Invalid format.";
      else if (error.code === 'auth/weak-password') msg = "Password too short (6+ chars).";
      else if (error.code === 'auth/operation-not-allowed') msg = "Login method not enabled in console.";
      else msg = error.message || "Failed to log in.";
      setNotification(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCompleteRegistration = async (profile: MemberProfile) => {
    if (!user) return;
    
    try {
      const userRef = doc(db, 'users', user.id);
      const isTeam = user.role === 'team';
      const name = isTeam 
        ? (profile as any).name 
        : (profile.registrationType === 'family' 
            ? (profile.parentName || profile.familyName) 
            : (profile.registrationType === 'teenager' ? profile.teenagerDetails?.name : profile.parentName));

      // Preserve status if already approved
      const newStatus = user.status === 'approved' ? 'approved' : (isTeam ? 'pending' : 'approved');
      const isFriend = profile.isFriendSignup || false;
      const finalRole = isFriend ? 'friend' : user.role;

      await updateDoc(userRef, {
        name,
        profile,
        profileComplete: true,
        status: newStatus,
        role: finalRole
      });

      setUser({ ...user, name, profile, profileComplete: true, status: newStatus, role: finalRole });
      setActiveTab('home');
      setNotification(isFriend ? "Friend registration successful! Welcome to the hub." : "Registration successful! Welcome to the hub.");
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error("Registration finalization error:", error);
      setNotification("Failed to save your profile. Please try again.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setHasConfirmedPhotoPolicy(false);
    setActiveTab('home');
  };

  const handleBookActivity = async (bookingDetails: { 
    participantName: string; 
    bookerMobile: string; 
    activity: Activity;
    foodChoice?: string;
    foodConflictConfirmed?: boolean;
  } | Array<{
    participantName: string; 
    bookerMobile: string; 
    activity: Activity;
    foodChoice?: string;
    foodConflictConfirmed?: boolean;
  }>) => {
    if (!user) return;
    
    // Explicitly check photo policy for members/team
    if (!hasConfirmedPhotoPolicy && (user.role === 'member' || user.role === 'team')) {
      setNotification("Please acknowledge the photo policy before booking.");
      return;
    }
    
    const detailsList = Array.isArray(bookingDetails) ? bookingDetails : [bookingDetails];
    if (detailsList.length === 0) return;

    const path = 'bookings';
    try {
      for (const detail of detailsList) {
        // Raise a warning note with admin if they confirmed against their medical/dietary info
        if (detail.foodConflictConfirmed) {
          try {
            await addDoc(collection(db, 'warnings'), {
              type: 'dietary_conflict_confirmed',
              title: 'Dietary Conflict Confirmed',
              message: `${detail.participantName} booked ${detail.activity.title} and chose "${detail.foodChoice || 'Unknown'}" which conflicts with their registered dietary/allergies information.`,
              personName: detail.participantName,
              userEmail: user.email || '',
              details: {
                sessionTitle: detail.activity.title,
                sessionDate: detail.activity.date,
                sessionTime: detail.activity.time,
                sessionId: detail.activity.id,
                foodChoice: detail.foodChoice || '',
                bookerName: user.name,
                bookerMobile: detail.bookerMobile,
              },
              timestamp: new Date().toISOString()
            });

            // Send warning email to admin as well
            await addDoc(collection(db, 'mail'), {
              to: ['jstreet@freeatlast.co.uk'],
              replyTo: user.email,
              message: {
                subject: `⚠️ DIETARY WARNING: Booking Conflict for ${detail.participantName}`,
                text: `Warning: A booking was completed with a confirmed dietary conflict!\nParticipant: ${detail.participantName}\nActivity: ${detail.activity.title}\nFood Chosen: ${detail.foodChoice}\nBooked by: ${user.name}\nMobile: ${detail.bookerMobile}\nEmail: ${user.email}`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; border: 2px solid #ea580c; padding: 20px; border-radius: 15px;">
                    <h2 style="color: #ea580c; margin-top: 0;">⚠️ Dietary Booking Conflict Confirmed</h2>
                    <p>A participant was registered with a food option that conflicts with their medical or dietary information on file, and the booker explicitly bypassed the alert.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <div style="background: #fffbeb; padding: 15px; border-radius: 10px; border: 1px solid #fef3c7;">
                      <p style="margin: 5px 0;"><strong>Participant:</strong> ${detail.participantName}</p>
                      <p style="margin: 5px 0;"><strong>Activity:</strong> ${detail.activity.title}</p>
                      <p style="margin: 5px 0;"><strong>Chosen Food Option:</strong> <span style="color: #ea580c; font-weight: bold;">${detail.foodChoice || 'None'}</span></p>
                      <p style="margin: 5px 0;"><strong>Booker Name:</strong> ${user.name}</p>
                      <p style="margin: 5px 0;"><strong>Contact Mobile:</strong> ${detail.bookerMobile}</p>
                      <p style="margin: 5px 0;"><strong>Contact Email:</strong> ${user.email}</p>
                      <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${detail.activity.date} @ ${detail.activity.time}</p>
                    </div>
                    <p style="font-size: 11px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
                      free@last Hub Automated Dietary Alert
                    </p>
                  </div>
                `
              }
            });
          } catch (err) {
            console.error("Error raising admin warning for dietary conflict:", err);
          }
        }

        // 1. Save to global bookings collection for admin log
        await addDoc(collection(db, path), {
          bookerName: user.name,
          participantName: detail.participantName,
          bookerMobile: detail.bookerMobile,
          bookingDate: serverTimestamp(),
          sessionTitle: detail.activity.title,
          sessionDate: detail.activity.date,
          sessionTime: detail.activity.time,
          sessionId: detail.activity.id,
          userId: user.id,
          targetEmail: 'jstreet@freeatlast.co.uk',
          status: 'booked',
          foodChoice: detail.foodChoice || '',
          foodConflictConfirmed: detail.foodConflictConfirmed || false,
          foodConflictWarningRaised: detail.foodConflictConfirmed || false,
        });

        // 2. Trigger email for the booking
        await addDoc(collection(db, 'mail'), {
          to: ['jstreet@freeatlast.co.uk'],
          replyTo: user.email,
          message: {
            subject: `New Booking: ${detail.activity.title}`,
            text: `Booking for ${detail.activity.title}\nParticipant: ${detail.participantName}\nDate: ${detail.activity.date}\nTime: ${detail.activity.time}\nBooked by: ${user.name}\nMobile: ${detail.bookerMobile}\nEmail: ${user.email}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #7e2b33; padding: 20px; border-radius: 15px;">
                <h2 style="color: #2b337e;">New Activity Booking</h2>
                <p>A new registration has been received for <strong>${detail.activity.title}</strong>.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <div style="background: #f9f9f9; padding: 15px; border-radius: 10px;">
                  <p style="margin: 5px 0;"><strong>Session:</strong> ${detail.activity.title}</p>
                  <p style="margin: 5px 0;"><strong>Session Date:</strong> ${detail.activity.date}</p>
                  <p style="margin: 5px 0;"><strong>Session Time:</strong> ${detail.activity.time}</p>
                  <p style="margin: 20px 0 5px 0; border-top: 1px solid #ddd; padding-top: 10px;"><strong>Participant:</strong> ${detail.participantName}</p>
                  <p style="margin: 5px 0;"><strong>Booked By:</strong> ${user.name}</p>
                  <p style="margin: 5px 0;"><strong>Mobile:</strong> ${detail.bookerMobile}</p>
                  <p style="margin: 5px 0;"><strong>Email:</strong> ${user.email}</p>
                </div>
                <p style="font-size: 11px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
                  System generated booking alert
                </p>
              </div>
            `
          }
        });
      }

      // 3. Increment activity count by the number of booked participants
      const activityRef = doc(db, 'activities', detailsList[0].activity.id);
      await updateDoc(activityRef, {
        bookedCount: increment(detailsList.length)
      });
      
      const namesJoined = detailsList.map(d => d.participantName).join(', ');
      setNotification(`Registration successful for ${namesJoined}!`);
      setTimeout(() => setNotification(null), 3500);
    } catch (error: any) {
      console.error("Booking error:", error);
      setNotification(`Booking failed: ${error.message || "Please check your connection"}`);
      try {
        handleFirestoreError(error, OperationType.WRITE, path);
      } catch (err) {
        console.error("Firestore Error logged:", err);
      }
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!user) return;
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingSnap = await getDoc(bookingRef);
      if (!bookingSnap.exists()) {
        throw new Error("Booking record not found.");
      }
      
      const bookingData = bookingSnap.data() as Booking;
      
      // 1. Update status to 'cancelled'
      await updateDoc(bookingRef, {
        status: 'cancelled'
      });

      // 2. Decrement activity count
      const activityRef = doc(db, 'activities', bookingData.sessionId);
      await updateDoc(activityRef, {
        bookedCount: increment(-1)
      });

      // 3. Trigger cancellation email alert
      await addDoc(collection(db, 'mail'), {
        to: ['jstreet@freeatlast.co.uk'],
        replyTo: user.email || 'no-reply@freeatlast.co.uk',
        message: {
          subject: `Cancelled Booking: ${bookingData.sessionTitle}`,
          text: `Booking Cancelled for ${bookingData.sessionTitle}\nParticipant: ${bookingData.participantName}\nDate: ${bookingData.sessionDate}\nTime: ${bookingData.sessionTime}\nCancelled by: ${user.name}\nEmail: ${user.email}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #7e2b33; padding: 20px; border-radius: 15px;">
              <h2 style="color: #7e2b33;">Booking Cancelled</h2>
              <p>A registration has been cancelled for <strong>${bookingData.sessionTitle}</strong>.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <div style="background: #f9f9f9; padding: 15px; border-radius: 10px;">
                <p style="margin: 5px 0;"><strong>Session:</strong> ${bookingData.sessionTitle}</p>
                <p style="margin: 5px 0;"><strong>Session Date:</strong> ${bookingData.sessionDate}</p>
                <p style="margin: 5px 0;"><strong>Session Time:</strong> ${bookingData.sessionTime}</p>
                <p style="margin: 20px 0 5px 0; border-top: 1px solid #ddd; padding-top: 10px;"><strong>Participant:</strong> ${bookingData.participantName}</p>
                <p style="margin: 5px 0;"><strong>Cancelled By:</strong> ${user.name}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${user.email}</p>
              </div>
              <p style="font-size: 11px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
                System generated cancellation alert
              </p>
            </div>
          `
        }
      });

      setNotification(`Successfully cancelled booking for ${bookingData.participantName}`);
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error("Cancellation error:", error);
      setNotification(`Failed to cancel booking: ${error.message}`);
    }
  };

  const LoginPortal = () => {
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState<UserRole>('member');
    const [teamPasscode, setTeamPasscode] = useState('');
    const [showPasscode, setShowPasscode] = useState(false);

    // Friend simple fields
    const [friendName, setFriendName] = useState('');
    const [friendMobile, setFriendMobile] = useState('');
    const [friendBusinessName, setFriendBusinessName] = useState('');

    const onSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setNotification("Passwords do not match. Please ensure both passwords are identical.");
          return;
        }
        if (role === 'team' && teamPasscode !== 'HUB2024') {
          setNotification("Invalid team access code.");
          return;
        }
        if (role === 'admin' && teamPasscode !== 'ADMIN2024') {
          setNotification("Invalid admin access code.");
          return;
        }
      }
      
      // Handle "username" by appending a domain if it doesn't look like an email
      let finalEmail = email.trim().toLowerCase();
      if (!finalEmail.includes('@')) {
        // Strip all spaces for usernames to ensure valid email format
        finalEmail = `${finalEmail.replace(/\s/g, '')}@freeatlast.hub`;
      }
      
      handleLogin(role, finalEmail, password, mode === 'signup', {
        name: friendName,
        mobile: friendMobile,
        businessName: friendBusinessName
      });
    };

    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 text-center relative overflow-hidden">
          <div style={{ backgroundColor: COLORS.primary }} className="absolute top-0 left-0 right-0 h-3"></div>
          
          <Icons.Logo className="mb-8 justify-center h-12" />
          
          <h2 style={{ color: COLORS.secondary }} className="text-3xl font-black mb-1 brand-heading uppercase tracking-tight">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="text-slate-400 mb-8 font-bold text-[10px] uppercase tracking-[0.2em] brand-heading">
            {mode === 'signin' ? (
              <>Welcome back! Sign in to your account</>
            ) : (
              <>Join the hub: Select your role below</>
            )}
          </p>
          
          <form onSubmit={onSubmit} className="space-y-4 text-left">
            {mode === 'signup' && (
              <div className="space-y-3 mb-8">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">I am joining as a:</label>
                <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl flex-wrap">
                  {(['member', 'friend', 'team', 'admin'] as UserRole[]).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex-1 min-w-[70px] py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all brand-heading ${
                        role === r ? 'bg-brand-dark-blue text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'signup' && role === 'friend' && (
              <div className="space-y-4 mb-4 animate-slideDown">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Smith"
                    value={friendName}
                    onChange={(e) => setFriendName(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-700 placeholder:text-slate-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 07123456789"
                    value={friendMobile}
                    onChange={(e) => setFriendMobile(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-700 placeholder:text-slate-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Business Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Deloitte"
                    value={friendBusinessName}
                    onChange={(e) => setFriendBusinessName(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-700 placeholder:text-slate-300"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Username or Email</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"><Icons.Mail /></span>
                <input 
                  type="text"
                  required
                  placeholder="e.g. johnsmith or john@example.com"
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-700 transition-all placeholder:text-slate-300"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Password</label>
                {mode === 'signin' && (
                  <button 
                    type="button"
                    onClick={() => handleForgotPassword(email)}
                    className="text-[9px] font-bold text-brand-orange hover:underline uppercase tracking-widest brand-heading"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"><Icons.Key /></span>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-700 transition-all placeholder:text-slate-300"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div className="space-y-2 animate-slideDown">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Confirm Password</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"><Icons.Key /></span>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-700 transition-all placeholder:text-slate-300"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && (role === 'team' || role === 'admin') && (
              <div className="space-y-2 animate-slideDown">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">
                  {role === 'admin' ? 'Admin Access Code' : 'Team Access Code'}
                </label>
                <div className="relative">
                  <input 
                    type={showPasscode ? 'text' : 'password'}
                    required
                    placeholder={`Enter ${role} code`}
                    className="w-full px-6 pr-12 py-4 bg-orange-50 border-2 border-orange-100 rounded-2xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue transition-all"
                    value={teamPasscode}
                    onChange={e => setTeamPasscode(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-orange/40 hover:text-brand-orange transition-colors"
                  >
                    {showPasscode ? <Icons.EyeOff /> : <Icons.Eye />}
                  </button>
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoggingIn}
              style={{ backgroundColor: COLORS.orange }}
              className="w-full text-white font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95 hover:opacity-90 text-lg brand-heading uppercase tracking-widest disabled:opacity-50 mt-6"
            >
              {isLoggingIn ? 'Connecting...' : (mode === 'signin' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-50 flex flex-col gap-4">
            <button 
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-brand-orange transition-colors brand-heading"
            >
              {mode === 'signin' ? "Need an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (activeTab === 'login') {
      return <LoginPortal />;
    }

    if (user && !user.profileComplete && user.role !== 'admin' && user.role !== 'friend') {
      if (user.role === 'team') {
        return <TeamRegistration user={user} onSubmitted={(updatedUser) => {
           setUser(updatedUser);
           setNotification("Team profile submitted for review.");
           setActiveTab('home');
        }} />;
      }
      return <MemberRegistration user={user} onComplete={handleCompleteRegistration} />;
    }

    // Friend access restriction: Friends have access to home, photos (gallery), wellbeing, and responding on friends page
    if (user?.role === 'friend' && activeTab !== 'home' && activeTab !== 'gallery' && activeTab !== 'friends' && activeTab !== 'wellbeing') {
      return <FriendsOf user={user} setActiveTab={setActiveTab} />;
    }

    switch (activeTab) {
      case 'home':
        return <Home user={user} assets={assets} announcements={announcements} setActiveTab={setActiveTab} caseStudyRequests={caseStudyRequests} caseStudies={caseStudies} />;
      case 'friends':
        return <FriendsOf user={user} setActiveTab={setActiveTab} />;
      case 'videos':
        return <Videos user={user} />;
      case 'activities':
        return <Activities 
          user={user} 
          onBook={handleBookActivity} 
          onCancel={handleCancelBooking}
          bookings={bookings} 
          allBookings={user?.role === 'admin' ? sessionRegistrations : userRegistrations}
          assets={assets} 
          hasConfirmedPhotoPolicy={hasConfirmedPhotoPolicy}
          activities={activities}
          setActiveTab={setActiveTab}
        />;
      case 'gallery':
        return <Gallery 
          user={user} 
          assets={assets} 
          hasConfirmedPhotoPolicy={hasConfirmedPhotoPolicy} 
          activities={activities}
          galleryAlbums={galleryAlbums}
        />;
      case 'partners':
        return <Partners assets={assets} partners={partners} impactStories={impactStories} />;
      case 'team':
        return ((user?.role === 'team' && user?.status === 'approved') || user?.role === 'admin') ? <VolunteerLogView user={user} logs={teamLogs} /> : <Home user={user} assets={assets} announcements={announcements} caseStudyRequests={caseStudyRequests} caseStudies={caseStudies} />;
      case 'wellbeing':
        return user ? <MemberWellbeing user={user} logs={wellbeingLogs} allUsers={allUsers} /> : <Home user={user} assets={assets} announcements={announcements} setActiveTab={setActiveTab} caseStudyRequests={caseStudyRequests} caseStudies={caseStudies} />;
      case 'assets':
        return user?.role === 'admin' ? (
          <AdminAssets 
            user={user!}
            assets={assets} 
            onUpdate={handleUpdateAsset} 
            onReset={handleResetAssets}
            announcements={announcements}
            activities={activities}
            partners={partners}
            impactStories={impactStories}
            inquiries={inquiries}
            bookings={sessionRegistrations}
            users={allUsers}
            teamLogs={teamLogs}
            wellbeingLogs={wellbeingLogs}
            galleryAlbums={galleryAlbums}
            mailLogs={mailLogs}
            warnings={warnings}
            caseStudyRequests={caseStudyRequests}
            caseStudies={caseStudies}
          />
        ) : <Home user={user} assets={assets} announcements={announcements} caseStudyRequests={caseStudyRequests} caseStudies={caseStudies} />;
      default:
        return <Home user={user} assets={assets} announcements={announcements} caseStudyRequests={caseStudyRequests} caseStudies={caseStudies} />;
    }
  };

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
    >
      {notification && (
        <div className="fixed top-24 right-8 z-[100] animate-slideIn">
          <div style={{ backgroundColor: COLORS.green }} className="text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-b-4 border-black/10">
            <Icons.Shield />
            <p className="font-bold brand-heading uppercase text-xs tracking-widest">{notification}</p>
            <button onClick={() => setNotification(null)} className="ml-4 opacity-50 hover:opacity-100">✕</button>
          </div>
        </div>
      )}
      {(user?.role === 'member' || user?.role === 'team' || user?.role === 'admin' || user?.role === 'friend') && !hasConfirmedPhotoPolicy && activeTab !== 'login' && (
        <PhotoPolicyModal onConfirm={() => {
          setHasConfirmedPhotoPolicy(true);
          localStorage.setItem('freeatlast_photo_policy_confirmed', 'true');
        }} />
      )}
      {renderContent()}
      <MemberSupportWidget user={user} inquiries={inquiries} />
    </Layout>
  );
};

export default App;
