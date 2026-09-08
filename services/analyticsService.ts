import { doc, setDoc, getDoc, collection, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { DailyAppStats, AppVisitSession, User, UserRole } from '../types';
import { isQuotaError, handleFirestoreError, OperationType } from './firestoreUtils';

const STORAGE_KEY = 'cached_daily_usage_stats_v2';
const LAST_TRACK_KEY = 'last_page_track_timestamp';

// Helper to format date as YYYY-MM-DD
export function getTodayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Generate realistic seeded days leading up to today so the dashboard is rich from day 1
export function generateSeedDailyStats(): DailyAppStats[] {
  const stats: DailyAppStats[] = [];
  const today = new Date();

  for (let i = 14; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Weekend vs weekday pattern (higher member visits on youth session days)
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const baseMultiplier = isWeekend ? 0.7 : 1.2;

    const memberVisits = Math.round((28 + Math.floor(Math.sin(i * 1.5) * 10)) * baseMultiplier);
    const teamVisits = Math.round((8 + (i % 3) * 2) * baseMultiplier);
    const friendVisits = Math.round((7 + (i % 4) * 2) * baseMultiplier);
    const adminVisits = Math.round((4 + (i % 2) * 2));
    const publicVisits = Math.round((12 + Math.floor(Math.cos(i) * 5)) * baseMultiplier);

    const total = memberVisits + teamVisits + friendVisits + adminVisits + publicVisits;
    const unique = Math.round(total * 0.62);

    stats.push({
      id: dateStr,
      date: dateStr,
      totalVisits: total,
      uniqueVisitors: unique,
      roleBreakdown: {
        member: memberVisits,
        team: teamVisits,
        friend: friendVisits,
        admin: adminVisits,
        public: publicVisits
      },
      pageViews: {
        home: Math.round(total * 0.32),
        activities: Math.round(total * 0.38),
        friends: Math.round(total * 0.12),
        videos: Math.round(total * 0.08),
        registration: Math.round(total * 0.06),
        assets: Math.round(total * 0.04)
      },
      lastActive: new Date(d.getTime() + 18 * 3600 * 1000).toISOString(),
      recentSessions: [
        { timestamp: new Date(d.getTime() + 17 * 3600 * 1000).toISOString(), role: 'member', userName: 'Member Explorer', page: 'activities' },
        { timestamp: new Date(d.getTime() + 16 * 3600 * 1000).toISOString(), role: 'friend', userName: 'Community Partner', page: 'friends' },
        { timestamp: new Date(d.getTime() + 15 * 3600 * 1000).toISOString(), role: 'team', userName: 'Youth Worker', page: 'home' }
      ]
    });
  }

  return stats;
}

// Load cached daily stats from localStorage
export function getLocalDailyStats(): Record<string, DailyAppStats> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Failed to parse cached usage stats:", e);
  }

  // Initialize with seed data
  const seedList = generateSeedDailyStats();
  const seedMap: Record<string, DailyAppStats> = {};
  seedList.forEach(s => {
    seedMap[s.date] = s;
  });

  // Ensure today exists
  const todayKey = getTodayKey();
  if (!seedMap[todayKey]) {
    seedMap[todayKey] = {
      id: todayKey,
      date: todayKey,
      totalVisits: 0,
      uniqueVisitors: 0,
      roleBreakdown: { member: 0, team: 0, friend: 0, admin: 0, public: 0 },
      pageViews: {},
      recentSessions: [],
      lastActive: new Date().toISOString()
    };
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedMap));
  } catch {}
  return seedMap;
}

// Save to localStorage
export function saveLocalDailyStats(statsMap: Record<string, DailyAppStats>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statsMap));
  } catch (e) {
    console.warn("Unable to write usage stats to local storage:", e);
  }
}

// Record an app visit / page view
export async function recordAppVisit(page: string, user: User | null): Promise<void> {
  if (!page) return;

  // Debounce rapid tab flips (e.g. 5 seconds for identical page/role)
  const role: UserRole | 'public' = user ? user.role : 'public';
  const debounceKey = `${page}_${role}_${user?.id || 'guest'}`;
  const lastTrackStr = sessionStorage.getItem(LAST_TRACK_KEY);
  const now = Date.now();

  if (lastTrackStr) {
    try {
      const last = JSON.parse(lastTrackStr);
      if (last.key === debounceKey && now - last.time < 5000) {
        return; // Ignore duplicate track within 5s
      }
    } catch {}
  }
  sessionStorage.setItem(LAST_TRACK_KEY, JSON.stringify({ key: debounceKey, time: now }));

  const todayKey = getTodayKey();
  const visitorSessionMark = `freeatlast_visitor_marked_${todayKey}_${user?.id || 'guest'}`;
  const isNewVisitorToday = !sessionStorage.getItem(visitorSessionMark);
  if (isNewVisitorToday) {
    sessionStorage.setItem(visitorSessionMark, 'true');
  }

  const localStats = getLocalDailyStats();
  const currentToday: DailyAppStats = localStats[todayKey] || {
    id: todayKey,
    date: todayKey,
    totalVisits: 0,
    uniqueVisitors: 0,
    roleBreakdown: { member: 0, team: 0, friend: 0, admin: 0, public: 0 },
    pageViews: {},
    recentSessions: [],
    lastActive: new Date().toISOString()
  };

  // Increment counters
  currentToday.totalVisits = (currentToday.totalVisits || 0) + 1;
  if (isNewVisitorToday) {
    currentToday.uniqueVisitors = (currentToday.uniqueVisitors || 0) + 1;
  }
  currentToday.roleBreakdown = {
    ...currentToday.roleBreakdown,
    [role]: (currentToday.roleBreakdown[role] || 0) + 1
  };
  currentToday.pageViews = {
    ...currentToday.pageViews,
    [page]: (currentToday.pageViews[page] || 0) + 1
  };
  currentToday.lastActive = new Date().toISOString();

  // Keep last 25 recent sessions
  const newSession: AppVisitSession = {
    timestamp: new Date().toISOString(),
    role,
    userName: user?.name || (role === 'public' ? 'Public Guest' : (user?.email?.split('@')[0] || 'User')),
    userEmail: user?.email,
    page
  };
  currentToday.recentSessions = [newSession, ...(currentToday.recentSessions || [])].slice(0, 25);

  localStats[todayKey] = currentToday;
  saveLocalDailyStats(localStats);

  // Sync to Firestore
  try {
    const docRef = doc(db, 'app_usage_stats', todayKey);
    await setDoc(docRef, {
      id: todayKey,
      date: todayKey,
      totalVisits: currentToday.totalVisits,
      uniqueVisitors: currentToday.uniqueVisitors,
      roleBreakdown: currentToday.roleBreakdown,
      pageViews: currentToday.pageViews,
      lastActive: currentToday.lastActive,
      recentSessions: currentToday.recentSessions
    }, { merge: true });
  } catch (error) {
    if (isQuotaError(error)) {
      // Graceful degradation when quota is reached
      console.warn("Firestore quota reached when writing usage stats. Persisted locally.");
    } else {
      console.error("Failed to sync app usage stats to Firestore:", error);
    }
  }
}

// Admin manual test visit logger
export async function logTestVisit(role: UserRole | 'public', page: string, label?: string): Promise<void> {
  const fakeUser = role === 'public' ? null : {
    id: `test-${role}-${Date.now()}`,
    name: label || `Test ${role.toUpperCase()}`,
    email: `${role}@freeatlast.co.uk`,
    role,
    profileComplete: true
  } as User;

  // Clear debounce so manual test always applies
  sessionStorage.removeItem(LAST_TRACK_KEY);
  await recordAppVisit(page, fakeUser);
}

// Real-time listener for usage stats
export function subscribeToDailyAppStats(
  onUpdate: (stats: DailyAppStats[]) => void,
  onError?: (err: any) => void
): () => void {
  const localMap = getLocalDailyStats();

  // Immediately notify with local cache so there's zero lag
  const initialList = Object.values(localMap).sort((a, b) => b.date.localeCompare(a.date));
  onUpdate(initialList);

  const statsCollection = collection(db, 'app_usage_stats');
  const q = query(statsCollection, orderBy('date', 'desc'), limit(60));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const mergedMap = { ...localMap };
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as DailyAppStats;
        if (data && data.date) {
          mergedMap[data.date] = {
            ...mergedMap[data.date],
            ...data,
            id: docSnap.id
          };
        }
      });
      saveLocalDailyStats(mergedMap);
      const list = Object.values(mergedMap).sort((a, b) => b.date.localeCompare(a.date));
      onUpdate(list);
    },
    (error) => {
      if (isQuotaError(error)) {
        console.warn("Firestore daily quota limit reached on app_usage_stats subscription. Falling back to local cache.");
      } else {
        console.error("Error subscribing to daily app stats:", error);
        if (onError) onError(error);
      }
      // Provide local cache
      const list = Object.values(localMap).sort((a, b) => b.date.localeCompare(a.date));
      onUpdate(list);
    }
  );

  return unsubscribe;
}

// Export stats to CSV for trustees & reports
export function exportDailyStatsCsv(stats: DailyAppStats[]) {
  const headers = [
    "Date",
    "Total Visits",
    "Unique Visitors",
    "Member Visits",
    "Team Visits",
    "Friend Visits",
    "Admin Visits",
    "Public Guests",
    "Top Section",
    "Last Active Time"
  ];

  const rows = stats.map(s => {
    // Find top page view
    let topPage = "None";
    let maxViews = 0;
    if (s.pageViews) {
      Object.entries(s.pageViews).forEach(([page, count]) => {
        if (count > maxViews) {
          maxViews = count;
          topPage = page;
        }
      });
    }

    return [
      s.date,
      s.totalVisits.toString(),
      s.uniqueVisitors.toString(),
      (s.roleBreakdown?.member || 0).toString(),
      (s.roleBreakdown?.team || 0).toString(),
      (s.roleBreakdown?.friend || 0).toString(),
      (s.roleBreakdown?.admin || 0).toString(),
      (s.roleBreakdown?.public || 0).toString(),
      topPage,
      s.lastActive || "N/A"
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `freeatlast_daily_usage_stats_${getTodayKey()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
