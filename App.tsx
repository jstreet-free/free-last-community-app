
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
import { PhotoPolicyModal } from './components/PhotoPolicyModal';
import { User, UserRole, MemberProfile, Announcement, Activity, Partner, ImpactStory, Inquiry, Booking } from './types';
import { Icons, COLORS, IMAGES as DEFAULT_IMAGES, SAMPLE_ANNOUNCEMENTS, SAMPLE_ACTIVITIES, SAMPLE_PARTNERS, SAMPLE_IMPACT_STORIES } from './constants';

import { db, auth } from './services/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, addDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { 
  signInAnonymously, 
  signOut, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged 
} from 'firebase/auth';

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Sync with Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = { ...userSnap.data(), id: firebaseUser.uid } as User;
          setUser(userData);
          localStorage.setItem('freeatlast_v2_user', JSON.stringify(userData));
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
  const [hasConfirmedPhotoPolicy, setHasConfirmedPhotoPolicy] = useState(false);
  
  const [assets, setAssets] = useState(DEFAULT_IMAGES);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [impactStories, setImpactStories] = useState<ImpactStory[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [sessionRegistrations, setSessionRegistrations] = useState<Booking[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
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
      setPartners(items.length > 0 ? items : SAMPLE_PARTNERS);
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
      setImpactStories(items.length > 0 ? items : SAMPLE_IMPACT_STORIES);
    });
    return () => unsubscribe();
  }, []);

  // Sync inquiries from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'inquiries'), orderBy('timestamp', 'desc')), (snapshot) => {
      const items: Inquiry[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Inquiry);
      });
      setInquiries(items);
    });
    return () => unsubscribe();
  }, []);

  // Sync all session registrations from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'bookings'), orderBy('bookingDate', 'desc')), (snapshot) => {
      const items: Booking[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Booking);
      });
      setSessionRegistrations(items);
    });
    return () => unsubscribe();
  }, []);

  // Sync users from Firestore (Admin only)
  useEffect(() => {
    if (user?.role !== 'admin') return;
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const items: User[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as User);
      });
      setAllUsers(items);
    });
    return () => unsubscribe();
  }, [user?.role]);

  // Sync current user specifically to handle real-time approval
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.id), (snapshot) => {
      if (snapshot.exists()) {
        const updatedData = snapshot.data() as User;
        // Only update if something meaningful changed or they were approved
        if (updatedData.status === 'approved' && user.status === 'pending') {
          setNotification("Welcome aboard! Your team access has been approved.");
          setActiveTab('home');
        }
        setUser({ ...updatedData, id: snapshot.id });
      }
    });
    return () => unsubscribe();
  }, [user?.id, user?.status]);

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

  const handleLogin = async (role: UserRole, email?: string, password?: string, isSignUp?: boolean) => {
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
              const signInResult = await signInWithEmailAndPassword(auth, email, password);
              uid = signInResult.user.uid;
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
        // Or simply, if they selected 'admin' or 'team' during signup and are currently 'member', we upgrade.
        let updatedRole = userData.role;
        let updatedStatus = userData.status;
        
        if (isSignUp) {
           if (role === 'admin' && userData.role !== 'admin') {
             updatedRole = 'admin';
             updatedStatus = 'approved';
           } else if (role === 'team' && userData.role === 'member') {
             updatedRole = 'team';
             updatedStatus = 'pending';
           }
           
           if (updatedRole !== userData.role) {
             await updateDoc(userRef, { role: updatedRole, status: updatedStatus });
           }
        }

        const finalUser = { ...userData, id: uid, role: updatedRole, status: updatedStatus };
        setUser(finalUser);
        localStorage.setItem('freeatlast_v2_user', JSON.stringify(finalUser));
        
        // Navigation based on final role
        if (updatedRole === 'admin') setActiveTab('assets');
        else if (updatedRole === 'team') setActiveTab(updatedStatus === 'approved' ? 'team' : 'registration');
        else setActiveTab(userData.profileComplete ? 'home' : 'registration');
      } else {
        // New user creation
        const newUser: User = {
          id: uid,
          name: role === 'admin' ? 'Admin User' : '',
          email: email || `${role}@freeatlast.hub`,
          role: role,
          profileComplete: role === 'admin',
          status: role === 'admin' ? 'approved' : 'pending'
        };
        await setDoc(userRef, newUser);
        setUser(newUser);
        
        setActiveTab(role === 'admin' ? 'assets' : 'registration');
      }
    } catch (error: any) {
      console.error("Auth error details:", error);
      let msg = "";
      if (error.code === 'permission-denied') msg = "Database access denied. Please contact support.";
      else if (error.code === 'auth/wrong-password') msg = "Incorrect password.";
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
      const name = isTeam ? (profile as any).name : (profile.registrationType === 'family' ? profile.familyName : profile.teenagerDetails.name);

      // Preserve status if already approved
      const newStatus = user.status === 'approved' ? 'approved' : (isTeam ? 'pending' : 'approved');

      await updateDoc(userRef, {
        name,
        profile,
        profileComplete: true,
        status: newStatus
      });

      setUser({ ...user, name, profile, profileComplete: true, status: newStatus });
      setActiveTab('home');
      setNotification("Registration successful! Welcome to the hub.");
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

  const handleBookActivity = async (detail: { participantName: string; bookerMobile: string; activity: Activity }) => {
    if (!user) return;
    
    try {
      // 1. Save to global bookings collection for admin log
      await addDoc(collection(db, 'bookings'), {
        bookerName: user.name,
        participantName: detail.participantName,
        bookerMobile: detail.bookerMobile,
        bookingDate: serverTimestamp(),
        sessionTitle: detail.activity.title,
        sessionDate: detail.activity.date,
        sessionTime: detail.activity.time,
        sessionId: detail.activity.id,
        userId: user.id
      });

      // 2. Increment activity count
      const activityRef = doc(db, 'activities', detail.activity.id);
      await updateDoc(activityRef, {
        bookedCount: (detail.activity.bookedCount || 0) + 1
      });

      // 3. Update local user bookings state
      if (!bookings.includes(detail.activity.id)) {
        setBookings([...bookings, detail.activity.id]);
        setNotification(`Registration successful for ${detail.participantName}!`);
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      console.error("Booking error:", error);
      alert("Failed to confirm booking. Please check your connection.");
    }
  };

  const LoginPortal = () => {
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('member');
    const [teamPasscode, setTeamPasscode] = useState('');

    const onSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (mode === 'signup') {
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
      let finalEmail = email.trim();
      if (!finalEmail.includes('@')) {
        // Strip all spaces for usernames to ensure valid email format
        finalEmail = `${finalEmail.toLowerCase().replace(/\s/g, '')}@freeatlast.hub`;
      }
      
      handleLogin(role, finalEmail, password, mode === 'signup');
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
                <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl">
                  {(['member', 'team', 'admin'] as UserRole[]).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all brand-heading ${
                        role === r ? 'bg-brand-dark-blue text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
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
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Password</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"><Icons.Key /></span>
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none font-bold text-slate-700 transition-all placeholder:text-slate-300"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            {mode === 'signup' && (role === 'team' || role === 'admin') && (
              <div className="space-y-2 animate-slideDown">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">
                  {role === 'admin' ? 'Admin Access Code' : 'Team Access Code'}
                </label>
                <input 
                  type="password"
                  required
                  placeholder={`Enter ${role} code`}
                  className="w-full px-6 py-4 bg-orange-50 border-2 border-orange-100 rounded-2xl focus:border-brand-orange outline-none font-bold text-brand-dark-blue transition-all"
                  value={teamPasscode}
                  onChange={e => setTeamPasscode(e.target.value)}
                />
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

          <div className="mt-8 pt-8 border-t border-slate-50">
            <button 
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
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

    if (activeTab === 'registration' && user) {
      if (user.role === 'team' && !user.profileComplete) {
        return <TeamRegistration user={user} onSubmitted={() => {
           // On submit team info, we still might want them to do member info? 
           // Usually team info is self-contained. 
           setNotification("Team profile submitted for review.");
           setActiveTab('home');
        }} />;
      }
      return <MemberRegistration user={user} onComplete={handleCompleteRegistration} />;
    }

    switch (activeTab) {
      case 'home':
        return <Home user={user} assets={assets} announcements={announcements} />;
      case 'activities':
        return <Activities 
          user={user} 
          onBook={handleBookActivity} 
          bookings={bookings} 
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
        />;
      case 'partners':
        return <Partners assets={assets} partners={partners} impactStories={impactStories} />;
      case 'team':
        return user?.role === 'team' ? <VolunteerLogView user={user} /> : <Home user={user} assets={assets} announcements={announcements} />;
      case 'wellbeing':
        return user?.role === 'member' ? <MemberWellbeing user={user} /> : <Home user={user} assets={assets} announcements={announcements} />;
      case 'assets':
        return user?.role === 'admin' ? (
          <AdminAssets 
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
          />
        ) : <Home user={user} assets={assets} announcements={announcements} />;
      default:
        return <Home user={user} assets={assets} announcements={announcements} />;
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
      {user?.role === 'member' && !hasConfirmedPhotoPolicy && activeTab !== 'login' && activeTab !== 'registration' && (
        <PhotoPolicyModal onConfirm={() => setHasConfirmedPhotoPolicy(true)} />
      )}
      {renderContent()}
    </Layout>
  );
};

export default App;
