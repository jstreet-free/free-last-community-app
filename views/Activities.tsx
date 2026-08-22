import React, { useState } from 'react';
import { SAMPLE_ACTIVITIES, Icons, COLORS } from '../constants';
import { Activity, User } from '../types';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { motion, AnimatePresence } from 'motion/react';

export interface BookingDetail {
  participantName: string;
  bookerMobile: string;
  activity: Activity;
  foodChoice?: string;
  foodConflictConfirmed?: boolean;
}

interface ActivitiesProps {
  user: User | null;
  onBook: (bookingDetail: BookingDetail | BookingDetail[]) => void;
  onCancel?: (bookingId: string) => void;
  bookings: string[];
  assets: any;
  hasConfirmedPhotoPolicy: boolean;
  activities: Activity[];
  allBookings: any[];
  setActiveTab: (tab: string) => void;
}

export interface AccountMember {
  id: string;
  name: string;
  roleTag: string;
  dietaryAllergies: string;
}

export interface BookingParticipant {
  id: string;
  name: string;
  isAccountMember: boolean;
  accountMemberId?: string;
  foodChoice: string;
  foodConflictWarning: string | null;
  conflictConfirmed: boolean;
}

export const Activities: React.FC<ActivitiesProps> = ({ 
  user, 
  onBook, 
  onCancel, 
  bookings, 
  assets, 
  hasConfirmedPhotoPolicy, 
  activities, 
  allBookings, 
  setActiveTab 
}) => {
  const [filter, setFilter] = useState<'all' | 'youth' | 'community' | 'sports' | 'education'>('all');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'explore' | 'history'>('explore');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [bookerMobile, setBookerMobile] = useState<string>('');
  const [participants, setParticipants] = useState<BookingParticipant[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const parseLocalDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const dateOnly = dateStr.split('T')[0];
    const parts = dateOnly.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day, 12, 0, 0);
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date();
    return d;
  };

  const formatLocalDateStr = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getEffectiveSession = (activity: Activity) => {
    if (activity.frequency !== 'weekly') {
      return { 
        date: activity.date,
        isBookable: activity.status === 'upcoming' 
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let occurrenceDate = parseLocalDate(activity.date);

    // If the initial date is in the past, move it forward week by week until it's today or in the future
    while (occurrenceDate < today) {
      occurrenceDate.setDate(occurrenceDate.getDate() + 7);
    }

    return {
      date: formatLocalDateStr(occurrenceDate),
      isBookable: true
    };
  };

  const getDayOfWeek = (activity: Activity): string => {
    const effective = getEffectiveSession(activity);
    const dateStr = effective.date || activity.date;
    if (!dateStr) return '';
    const d = parseLocalDate(dateStr);
    return d.toLocaleDateString('en-GB', { weekday: 'long' });
  };

  const DAYS_OF_WEEK = [
    { id: 'all', label: 'All Days' },
    { id: 'Monday', label: 'Mondays' },
    { id: 'Tuesday', label: 'Tuesdays' },
    { id: 'Wednesday', label: 'Wednesdays' },
    { id: 'Thursday', label: 'Thursdays' },
    { id: 'Friday', label: 'Fridays' },
    { id: 'Saturday', label: 'Saturdays' },
    { id: 'Sunday', label: 'Sundays' }
  ];

  const getDietaryAllergies = (name: string): string => {
    if (!user || !user.profile) return '';
    
    // Teenager mode
    if (user.profile.registrationType === 'teenager') {
      const isTeen = user.profile.teenagerDetails?.name?.toLowerCase().trim() === name.toLowerCase().trim();
      if (isTeen) {
        return user.profile.teenagerDetails?.dietaryAllergies || '';
      }
    }
    
    // Family mode: find matching child
    if (user.profile.registrationType === 'family' && user.profile.children) {
      const matchingChild = user.profile.children.find(
        (c: any) => c.name?.toLowerCase().trim() === name.toLowerCase().trim()
      );
      if (matchingChild) {
        return matchingChild.dietaryAllergies || '';
      }
    }
    
    // Fallback: search all child profiles or parent details
    if (user.profile.children) {
      const child = user.profile.children.find((c: any) => c.name?.toLowerCase().trim() === name.toLowerCase().trim());
      if (child) return child.dietaryAllergies || '';
    }
    
    return '';
  };

  const checkFoodConflict = (choice: string, allergies: string): string | null => {
    if (!choice || !allergies) return null;
    const choiceLower = choice.toLowerCase();
    const allergyLower = allergies.toLowerCase();

    const allergyWords = ['nut', 'peanut', 'dairy', 'milk', 'egg', 'gluten', 'wheat', 'fish', 'shellfish', 'soya', 'soy', 'sesame', 'mustard', 'celery'];
    
    // Check if user has specific allergies that conflict with chosen food
    if ((allergyLower.includes('vegetarian') || allergyLower.includes('veg')) && 
        (choiceLower.includes('chicken') || choiceLower.includes('beef') || choiceLower.includes('pork') || choiceLower.includes('meat') || choiceLower.includes('fish') || choiceLower.includes('pepperoni'))) {
      return `Warning: You selected a meat/fish option (${choice}), but the participant profile states they are Vegetarian/Vegan.`;
    }

    if (allergyLower.includes('vegan') && 
        (choiceLower.includes('chicken') || choiceLower.includes('beef') || choiceLower.includes('pork') || choiceLower.includes('meat') || choiceLower.includes('fish') || choiceLower.includes('cheese') || choiceLower.includes('dairy') || choiceLower.includes('milk') || choiceLower.includes('egg') || choiceLower.includes('pepperoni'))) {
      return `Warning: You selected non-vegan food (${choice}), but the participant profile states they are Vegan.`;
    }

    for (const word of allergyWords) {
      if (allergyLower.includes(word) && choiceLower.includes(word)) {
        return `Warning: This food contains ${word} (${choice}), which conflicts with the participant's registered allergy to ${word}.`;
      }
    }

    if ((allergyLower.includes('gluten') || allergyLower.includes('coeliac') || allergyLower.includes('celiac')) && 
        (choiceLower.includes('pasta') || choiceLower.includes('pizza') || choiceLower.includes('bread') || choiceLower.includes('wheat') || choiceLower.includes('noodle'))) {
      return `Warning: This food may contain gluten (${choice}), conflicting with registered Gluten sensitivity/Coeliac disease.`;
    }

    if ((allergyLower.includes('dairy') || allergyLower.includes('lactose')) && 
        (choiceLower.includes('cheese') || choiceLower.includes('milk') || choiceLower.includes('cream') || choiceLower.includes('butter') || choiceLower.includes('dairy') || choiceLower.includes('yogurt') || choiceLower.includes('pizza'))) {
      return `Warning: This food may contain dairy (${choice}), conflicting with registered lactose intolerance or dairy allergy.`;
    }

    const choiceWords = choiceLower.split(/\s+/).filter(w => w.length > 3);
    for (const w of choiceWords) {
      if (allergyLower.includes(w)) {
        return `Warning: The food choice "${choice}" contains "${w}", which is listed in the participant's dietary/allergy notes: "${allergies}".`;
      }
    }

    return null;
  };

  const getAccountMembers = (currentUser: User | null): AccountMember[] => {
    if (!currentUser) return [];
    const list: AccountMember[] = [];

    const mainName = currentUser.profile?.parentName || currentUser.name;
    if (mainName) {
      list.push({
        id: 'parent-main',
        name: mainName,
        roleTag: 'Main Account Holder',
        dietaryAllergies: getDietaryAllergies(mainName)
      });
    }

    if (currentUser.profile?.teenagerDetails?.name) {
      const teenName = currentUser.profile.teenagerDetails.name;
      if (!list.some(m => m.name.toLowerCase().trim() === teenName.toLowerCase().trim())) {
        list.push({
          id: 'teenager-main',
          name: teenName,
          roleTag: 'Teenager',
          dietaryAllergies: currentUser.profile.teenagerDetails.dietaryAllergies || ''
        });
      }
    }

    if (currentUser.profile?.children && Array.isArray(currentUser.profile.children)) {
      currentUser.profile.children.forEach((c: any, idx: number) => {
        if (c.name && !list.some(m => m.name.toLowerCase().trim() === c.name.toLowerCase().trim())) {
          list.push({
            id: `child-${idx}`,
            name: c.name,
            roleTag: `Child${c.age ? ` (${c.age} yrs)` : ''}`,
            dietaryAllergies: c.dietaryAllergies || ''
          });
        }
      });
    }

    return list;
  };

  const handleOpenBooking = (activity: Activity) => {
    let defaultFood = '';
    if (activity.includesFood && activity.foodOptions) {
      const options = activity.foodOptions.split(',').map(s => s.trim());
      if (options.length > 0) {
        defaultFood = options[0];
      }
    }

    setSelectedActivity(activity);
    const mobile = user?.profile?.parentMobile || (user?.profile as any)?.mobileNumber || '';
    setBookerMobile(mobile);

    const accountMembers = getAccountMembers(user);
    if (accountMembers.length > 0) {
      const effective = getEffectiveSession(activity);
      const alreadyBookedNames = allBookings
        .filter(b => b.sessionId === activity.id && b.sessionDate === effective.date && b.userId === user?.id && b.status !== 'cancelled')
        .map(b => b.participantName.toLowerCase().trim());

      const initialMember = accountMembers.find(m => !alreadyBookedNames.includes(m.name.toLowerCase().trim())) || accountMembers[0];

      setSelectedMemberIds([initialMember.id]);
      const allergies = getDietaryAllergies(initialMember.name);
      const warning = activity.includesFood && defaultFood ? checkFoodConflict(defaultFood, allergies) : null;

      setParticipants([
        {
          id: initialMember.id,
          name: initialMember.name,
          isAccountMember: true,
          accountMemberId: initialMember.id,
          foodChoice: defaultFood,
          foodConflictWarning: warning,
          conflictConfirmed: false,
        }
      ]);
    } else {
      setSelectedMemberIds([]);
      const defaultName = user?.name || '';
      const allergies = getDietaryAllergies(defaultName);
      const warning = activity.includesFood && defaultFood ? checkFoodConflict(defaultFood, allergies) : null;

      setParticipants([
        {
          id: 'custom-' + Date.now(),
          name: defaultName,
          isAccountMember: false,
          foodChoice: defaultFood,
          foodConflictWarning: warning,
          conflictConfirmed: false,
        }
      ]);
    }
  };

  const toggleAccountMember = (member: AccountMember, defaultFood: string) => {
    if (!selectedActivity) return;
    const isSelected = selectedMemberIds.includes(member.id);

    if (isSelected) {
      setSelectedMemberIds(prev => prev.filter(id => id !== member.id));
      setParticipants(prev => prev.filter(p => p.accountMemberId !== member.id));
    } else {
      setSelectedMemberIds(prev => [...prev, member.id]);
      const allergies = getDietaryAllergies(member.name);
      const warning = selectedActivity.includesFood && defaultFood ? checkFoodConflict(defaultFood, allergies) : null;

      setParticipants(prev => [
        ...prev,
        {
          id: member.id,
          name: member.name,
          isAccountMember: true,
          accountMemberId: member.id,
          foodChoice: defaultFood,
          foodConflictWarning: warning,
          conflictConfirmed: false,
        }
      ]);
    }
  };

  const addCustomParticipant = (defaultFood: string) => {
    if (!selectedActivity) return;
    const newId = 'custom-' + Date.now() + Math.random().toString(36).substring(2, 5);
    setParticipants(prev => [
      ...prev,
      {
        id: newId,
        name: '',
        isAccountMember: false,
        foodChoice: defaultFood,
        foodConflictWarning: null,
        conflictConfirmed: false,
      }
    ]);
  };

  const removeParticipant = (id: string, accountMemberId?: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
    if (accountMemberId) {
      setSelectedMemberIds(prev => prev.filter(mId => mId !== accountMemberId));
    }
  };

  const updateParticipantName = (id: string, name: string) => {
    setParticipants(prev => prev.map(p => {
      if (p.id !== id) return p;
      const allergies = getDietaryAllergies(name);
      const warning = selectedActivity?.includesFood && p.foodChoice ? checkFoodConflict(p.foodChoice, allergies) : null;
      return {
        ...p,
        name,
        foodConflictWarning: warning,
        conflictConfirmed: false
      };
    }));
  };

  const updateParticipantFood = (id: string, foodChoice: string) => {
    setParticipants(prev => prev.map(p => {
      if (p.id !== id) return p;
      const allergies = getDietaryAllergies(p.name);
      const warning = selectedActivity?.includesFood ? checkFoodConflict(foodChoice, allergies) : null;
      return {
        ...p,
        foodChoice,
        foodConflictWarning: warning,
        conflictConfirmed: false
      };
    }));
  };

  const updateParticipantConflictConfirmed = (id: string, conflictConfirmed: boolean) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, conflictConfirmed } : p));
  };

  const handleConfirmBooking = () => {
    if (!selectedActivity) return;

    if (participants.length === 0) {
      alert("Please select or enter at least one participant from your family.");
      return;
    }

    if (!bookerMobile.trim()) {
      alert("Please enter a contact mobile number.");
      return;
    }

    const emptyParticipant = participants.find(p => !p.name.trim());
    if (emptyParticipant) {
      alert("Please ensure all participant names are filled in.");
      return;
    }

    const effective = getEffectiveSession(selectedActivity);
    const occurrenceBookings = allBookings.filter(
      b => b.sessionId === selectedActivity.id && b.sessionDate === effective.date && b.status !== 'cancelled'
    );
    const currentBookedCount = occurrenceBookings.length;
    const remainingSpaces = selectedActivity.capacity - currentBookedCount;

    if (participants.length > remainingSpaces) {
      alert(`Sorry, only ${remainingSpaces} space(s) remain for this session, but you have ${participants.length} participant(s) selected. Please adjust your selection.`);
      return;
    }

    const unconfirmed = participants.find(p => p.foodConflictWarning && !p.conflictConfirmed);
    if (unconfirmed) {
      alert(`Please confirm the dietary/allergy warning for ${unconfirmed.name} before completing the booking.`);
      return;
    }

    const detailsList: BookingDetail[] = participants.map(p => ({
      participantName: p.name.trim(),
      bookerMobile: bookerMobile.trim(),
      activity: { ...selectedActivity, date: effective.date },
      foodChoice: selectedActivity.includesFood ? p.foodChoice : undefined,
      foodConflictConfirmed: p.conflictConfirmed,
    }));

    onBook(detailsList);

    setSelectedActivity(null);
    setParticipants([]);
    setSelectedMemberIds([]);
  };

  const upcomingActivities = activities.filter(a => a.status === 'upcoming');

  const getCountForDay = (dayId: string) => {
    let baseList = upcomingActivities;
    if (filter !== 'all') {
      baseList = baseList.filter(a => a.category === filter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      baseList = baseList.filter(a => 
        a.title.toLowerCase().includes(q) || 
        a.description.toLowerCase().includes(q) ||
        (a.location && a.location.toLowerCase().includes(q))
      );
    }
    if (dayId === 'all') return baseList.length;
    return baseList.filter(a => getDayOfWeek(a) === dayId).length;
  };

  const filteredActivities = upcomingActivities.filter(activity => {
    // 1. Category filter
    if (filter !== 'all' && activity.category !== filter) {
      return false;
    }
    // 2. Day of week filter
    if (selectedDay !== 'all') {
      const day = getDayOfWeek(activity);
      if (day !== selectedDay) {
        return false;
      }
    }
    // 3. Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const matchesTitle = activity.title.toLowerCase().includes(q);
      const matchesDesc = activity.description.toLowerCase().includes(q);
      const matchesLocation = activity.location?.toLowerCase().includes(q);
      if (!matchesTitle && !matchesDesc && !matchesLocation) {
        return false;
      }
    }
    return true;
  });

  const getActivityImage = (activity: Activity) => {
    if (activity.imageUrl) return activity.imageUrl;
    const images: Record<string, string> = {
      '1': assets.HENNA_ART,
      '2': assets.MUDDY_ADVENTURE,
      '3': assets.FIRE_FIGHTERS,
      '4': assets.CAMPFIRE
    };
    return images[activity.id] || assets.YOUTH_HOODIES;
  };

  const getCategoryColor = (cat: string) => {
    switch(cat) {
      case 'youth': return COLORS.orange;
      case 'sports': return COLORS.green;
      case 'education': return COLORS.lightBlue;
      case 'community': return COLORS.yellow;
      default: return COLORS.secondary;
    }
  };

  const myBookings = user ? allBookings.filter(b => b.userId === user.id) : [];
  const sortedMyBookings = [...myBookings].sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-12">
        <div>
          <h1 style={{ color: COLORS.secondary }} className="text-5xl font-bold mb-4 brand-heading uppercase tracking-tight">Session Booking</h1>
          <p className="text-gray-500 text-lg font-light">Explore and join our weekly community activities at the Nechells Hub.</p>
        </div>
      </div>

      {user && (
        <div className="flex gap-6 mb-12 border-b border-gray-100 pb-4">
          <button 
            onClick={() => setViewMode('explore')}
            className={`pb-3 px-4 font-black text-xs uppercase tracking-widest brand-heading transition-all ${
              viewMode === 'explore' 
                ? 'border-b-4 border-brand-orange text-brand-dark-blue' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Explore Activities
          </button>
          <button 
            onClick={() => setViewMode('history')}
            className={`pb-3 px-4 font-black text-xs uppercase tracking-widest brand-heading transition-all ${
              viewMode === 'history' 
                ? 'border-b-4 border-brand-orange text-brand-dark-blue' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            My Booking History ({myBookings.length})
          </button>
        </div>
      )}

      {viewMode === 'history' ? (
        <div className="space-y-8 animate-fadeIn">
          <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 style={{ color: COLORS.secondary }} className="text-2xl font-black mb-2 brand-heading uppercase">My Booking Records</h2>
              <p className="text-gray-500 text-sm font-light">View your complete booking history, verify attendance status, or cancel scheduled bookings.</p>
            </div>
            <div className="bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <span style={{ color: COLORS.orange }} className="text-2xl"><Icons.Calendar /></span>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest brand-heading">Total Bookings</p>
                <p style={{ color: COLORS.secondary }} className="text-xl font-black brand-heading">{myBookings.length} sessions</p>
              </div>
            </div>
          </div>

          {sortedMyBookings.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] border border-dashed border-slate-200 py-24 text-center">
              <span className="text-slate-300 block mb-6 text-4xl"><Icons.Calendar /></span>
              <p className="text-slate-400 font-bold brand-heading uppercase text-sm tracking-widest mb-2">No booking records found</p>
              <p className="text-slate-400 text-xs font-light max-w-sm mx-auto mb-8">You haven't registered for any activity sessions yet. Browse our activities to make your first booking.</p>
              <button 
                onClick={() => setViewMode('explore')}
                style={{ backgroundColor: COLORS.orange }}
                className="text-white px-8 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all brand-heading"
              >
                Browse Activities
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Session Details</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Date & Time</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Participant</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading text-center">Status</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedMyBookings.map((b) => {
                      const sessionDateObj = parseLocalDate(b.sessionDate);
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const isUpcoming = sessionDateObj >= today;
                      
                      let statusText = 'Booked';
                      let statusStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                      
                      if (b.status === 'cancelled') {
                        statusText = 'Cancelled';
                        statusStyle = 'bg-red-50 text-red-500 border-red-100';
                      } else if (b.attended === true) {
                        statusText = 'Attended';
                        statusStyle = 'bg-green-50 text-green-700 border-green-200';
                      } else if (b.attended === false) {
                        statusText = 'Absent';
                        statusStyle = 'bg-amber-50 text-amber-600 border-amber-200';
                      } else if (isUpcoming) {
                        statusText = 'Upcoming';
                        statusStyle = 'bg-blue-50 text-blue-700 border-blue-200';
                      } else {
                        statusText = 'Completed';
                        statusStyle = 'bg-slate-50 text-slate-500 border-slate-200';
                      }

                      return (
                        <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6">
                            <p className="text-brand-dark-blue font-black brand-heading text-sm">{b.sessionTitle}</p>
                            <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-1 tracking-wider">ID: {b.id?.slice(-6) || b.sessionId?.slice(-6)}</p>
                          </td>
                          <td className="px-8 py-6 text-xs font-semibold text-slate-700">
                            <p>{parseLocalDate(b.sessionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            <p className="text-[10px] text-slate-400 font-bold brand-heading uppercase mt-1">{b.sessionTime}</p>
                          </td>
                          <td className="px-8 py-6 text-xs font-semibold text-slate-600">
                            {b.participantName}
                          </td>
                          <td className="px-8 py-6 text-center">
                            <span className={`inline-block px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusStyle}`}>
                              {statusText}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            {b.status !== 'cancelled' && b.attended === undefined && isUpcoming && onCancel && (
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to cancel your booking for ${b.sessionTitle}?`)) {
                                    onCancel(b.id);
                                  }
                                }}
                                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-100 hover:scale-105 active:scale-95 brand-heading"
                              >
                                Cancel Booking
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200/60">
              <div>
                <h3 style={{ color: COLORS.secondary }} className="text-sm font-black brand-heading uppercase tracking-wider flex items-center gap-2">
                  <span style={{ color: COLORS.orange }}><Icons.Calendar /></span>
                  Filter & Search Sessions
                </h3>
                <p className="text-xs text-slate-500 font-light mt-0.5">
                  Select a day of the week or category to easily navigate available bookable sessions.
                </p>
              </div>

              {/* Search Input & Reset Button */}
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="relative flex-grow lg:w-72">
                  <input
                    type="text"
                    placeholder="Search session title or topic..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-brand-orange transition-all shadow-inner"
                  />
                  <span className="absolute left-3 top-3 text-slate-400 pointer-events-none text-xs">
                    🔍
                  </span>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {(filter !== 'all' || selectedDay !== 'all' || searchQuery !== '') && (
                  <button
                    onClick={() => {
                      setFilter('all');
                      setSelectedDay('all');
                      setSearchQuery('');
                    }}
                    className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider brand-heading transition-all whitespace-nowrap shadow-sm"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Day of the Week Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 brand-heading uppercase tracking-widest flex items-center gap-1.5">
                  📅 Select Day of the Week
                </label>
                {selectedDay !== 'all' && (
                  <button
                    onClick={() => setSelectedDay('all')}
                    className="text-[10px] font-bold text-brand-orange brand-heading uppercase hover:underline"
                  >
                    Show All Days
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((dayItem) => {
                  const isSelected = selectedDay === dayItem.id;
                  const count = getCountForDay(dayItem.id);

                  return (
                    <button
                      key={dayItem.id}
                      onClick={() => setSelectedDay(dayItem.id)}
                      style={{
                        backgroundColor: isSelected ? COLORS.orange : '#ffffff',
                        color: isSelected ? '#ffffff' : COLORS.secondary,
                        borderColor: isSelected ? COLORS.orange : '#e2e8f0'
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold brand-heading transition-all border flex items-center gap-2 ${
                        isSelected ? 'shadow-md scale-102 font-extrabold' : 'hover:bg-slate-100'
                      } ${count === 0 && !isSelected ? 'opacity-40' : ''}`}
                    >
                      <span>{dayItem.label}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        isSelected ? 'bg-white/30 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Selector */}
            <div className="space-y-2 pt-3 border-t border-slate-200/60">
              <label className="text-[10px] font-black text-slate-400 brand-heading uppercase tracking-widest">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'All Categories' },
                  { id: 'youth', label: 'Youth' },
                  { id: 'community', label: 'Community' },
                  { id: 'sports', label: 'Sports' },
                  { id: 'education', label: 'Education' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setFilter(cat.id as any)}
                    style={{
                      backgroundColor: filter === cat.id ? COLORS.secondary : '#ffffff',
                      color: filter === cat.id ? '#ffffff' : COLORS.secondary,
                      borderColor: filter === cat.id ? COLORS.secondary : '#e2e8f0'
                    }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border brand-heading ${
                      filter === cat.id ? 'shadow-md scale-102' : 'hover:bg-slate-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 py-16 px-6 text-center shadow-sm">
              <div className="w-16 h-16 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                📅
              </div>
              <h3 style={{ color: COLORS.secondary }} className="text-xl font-bold brand-heading uppercase mb-2">
                No Sessions Found
              </h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto mb-6 font-light">
                {selectedDay !== 'all' 
                  ? `There are currently no upcoming sessions scheduled for ${selectedDay}s${filter !== 'all' ? ` in the ${filter} category` : ''}.`
                  : `No sessions match your selected category or search filters.`}
              </p>
              <button
                onClick={() => {
                  setFilter('all');
                  setSelectedDay('all');
                  setSearchQuery('');
                }}
                style={{ backgroundColor: COLORS.orange }}
                className="text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-md hover:brightness-110 active:scale-95 transition-all brand-heading"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredActivities.map((activity) => {
                const effective = getEffectiveSession(activity);
                const effectiveDate = effective.date;
                const weekday = getDayOfWeek(activity);
                
                // Calculate dynamic booking count for this specific occurrence (excluding cancelled)
                const occurrenceBookings = allBookings.filter(
                  b => b.sessionId === activity.id && b.sessionDate === effectiveDate && b.status !== 'cancelled'
                );
                const currentBookedCount = occurrenceBookings.length;
                
                // Check if current user is booked for THIS specific occurrence (excluding cancelled)
                const occurrenceUserBookings = user ? allBookings.filter(b => 
                  b.sessionId === activity.id && 
                  b.sessionDate === effectiveDate && 
                  b.userId === user.id &&
                  b.status !== 'cancelled'
                ) : [];
                const isBooked = occurrenceUserBookings.length > 0;

                const isFull = currentBookedCount >= activity.capacity;
                const catColor = getCategoryColor(activity.category);

                const bookableActivity = {
                  ...activity,
                  date: effectiveDate,
                  bookedCount: currentBookedCount
                };

                const formattedDate = parseLocalDate(effectiveDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

                return (
                  <div key={activity.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row hover:shadow-xl transition-all">
                    <div className="md:w-2/5 h-56 md:h-auto relative overflow-hidden">
                      <ImageWithFallback
                        src={getActivityImage(activity)} 
                        alt={activity.title}
                        className="w-full h-full object-cover"
                      />
                      <div style={{ backgroundColor: catColor }} className="absolute top-4 left-4 text-white px-4 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-lg brand-heading">
                        {activity.category}
                        {activity.frequency === 'weekly' && " • Weekly"}
                      </div>
                      {weekday && (
                        <div className="absolute bottom-4 left-4 bg-slate-900/85 backdrop-blur-md text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest brand-heading border border-white/10">
                          📅 {weekday}s
                        </div>
                      )}
                    </div>
                    
                    <div className="p-8 flex-grow flex flex-col md:w-3/5">
                      <h3 style={{ color: COLORS.secondary }} className="text-2xl font-bold mb-4 brand-heading">{activity.title}</h3>
                      <p className="text-gray-500 mb-6 text-sm font-light leading-relaxed h-12 overflow-hidden">{activity.description}</p>
                      
                      <div className="space-y-3 mb-8">
                        <div className="flex items-center gap-3 text-brand-dark-blue font-bold text-[10px] uppercase tracking-wider brand-heading">
                          <span style={{ color: COLORS.orange }}><Icons.Calendar /></span>
                          <span>
                            {weekday ? `${weekday}, ` : ''}{formattedDate}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-brand-dark-blue font-bold text-[10px] uppercase tracking-wider brand-heading">
                          <span style={{ color: COLORS.orange }}><Icons.Clock /></span>
                          <span>{activity.time}</span>
                        </div>
                      </div>

                  <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 brand-heading uppercase tracking-widest">
                      {activity.capacity - currentBookedCount} spaces left
                    </span>
                    {!user ? (
                      <button 
                        onClick={() => setActiveTab('login')} 
                        className="text-[9px] font-bold text-brand-orange uppercase brand-heading hover:underline"
                      >
                        Sign in to book
                      </button>
                    ) : user.role === 'friend' ? (
                      <span 
                        className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg uppercase brand-heading"
                        title="Friends of free@last are supportive sponsors and are not registered to attend member activities."
                      >
                        Supporter
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        {isBooked ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="bg-green-600 text-white px-3.5 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest brand-heading">
                                ✓ Booked ({occurrenceUserBookings.length})
                              </span>
                              {!isFull && (
                                <button
                                  onClick={() => handleOpenBooking(bookableActivity)}
                                  style={{ backgroundColor: COLORS.orange }}
                                  className="px-3 py-2 rounded-xl font-bold text-[9px] uppercase tracking-wider text-white hover:brightness-110 transition-all brand-heading shadow-sm"
                                  title="Add another family member"
                                >
                                  + Add Person
                                </button>
                              )}
                              {onCancel && (
                                <button
                                  onClick={() => {
                                    if (occurrenceUserBookings.length === 1) {
                                      if (confirm(`Are you sure you want to cancel your booking for ${activity.title}?`)) {
                                        onCancel(occurrenceUserBookings[0].id);
                                      }
                                    } else {
                                      const names = occurrenceUserBookings.map(b => b.participantName).join('\n- ');
                                      if (confirm(`Cancel all ${occurrenceUserBookings.length} family bookings for this session?\n\nParticipants:\n- ${names}`)) {
                                        occurrenceUserBookings.forEach(b => onCancel(b.id));
                                      }
                                    }
                                  }}
                                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 border border-red-100 hover:border-red-200 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all brand-heading"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold truncate max-w-[200px]" title={occurrenceUserBookings.map(b => b.participantName).join(', ')}>
                              Attending: {occurrenceUserBookings.map(b => b.participantName).join(', ')}
                            </p>
                          </div>
                        ) : (
                          <button
                            disabled={isFull}
                            onClick={() => handleOpenBooking(bookableActivity)}
                            style={{ backgroundColor: isFull ? '#e2e8f0' : COLORS.orange }}
                            className={`px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest text-white transition-all shadow-md active:scale-95 brand-heading ${
                              !isFull ? 'hover:brightness-110' : 'cursor-default text-slate-400'
                            }`}
                          >
                            {isFull ? 'Full' : 'Book Now'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </div>
      )}

      <AnimatePresence>
        {selectedActivity && (() => {
          const accountMembers = getAccountMembers(user);
          const defaultFood = selectedActivity.includesFood && selectedActivity.foodOptions 
            ? selectedActivity.foodOptions.split(',').map(s => s.trim())[0] || '' 
            : '';
          const effective = getEffectiveSession(selectedActivity);
          const occurrenceBookings = allBookings.filter(
            b => b.sessionId === selectedActivity.id && b.sessionDate === effective.date && b.status !== 'cancelled'
          );
          const remainingSpaces = selectedActivity.capacity - occurrenceBookings.length;

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedActivity(null)}
                className="fixed inset-0 bg-brand-dark-blue/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col z-10"
              >
                <div style={{ backgroundColor: COLORS.secondary }} className="p-8 md:p-10 text-white relative shrink-0">
                  <button 
                    onClick={() => setSelectedActivity(null)}
                    className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
                  >
                    <Icons.Plus className="rotate-45 h-8 w-8" />
                  </button>
                  <div style={{ color: COLORS.yellow }} className="mb-4"><Icons.Calendar /></div>
                  <h2 className="text-2xl md:text-3xl font-black brand-heading uppercase tracking-tight leading-none mb-3">
                    Confirm Session Registration
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-white/80 font-bold text-xs uppercase tracking-[0.15em] brand-heading">
                    <span className="bg-white/10 px-3 py-1 rounded-lg">{selectedActivity.title}</span>
                    <span className="bg-brand-orange/40 text-orange-200 px-3 py-1 rounded-lg">
                      {remainingSpaces} {remainingSpaces === 1 ? 'Space' : 'Spaces'} Left
                    </span>
                  </div>
                </div>

                <div className="p-8 md:p-10 space-y-6 overflow-y-auto flex-grow">
                  {/* Session Overview */}
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div style={{ backgroundColor: COLORS.orange }} className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0">
                        <Icons.Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Date</p>
                        <p className="text-brand-dark-blue font-black text-sm brand-heading">
                          {parseLocalDate(selectedActivity.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div style={{ backgroundColor: COLORS.lightBlue }} className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0">
                        <Icons.Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Time</p>
                        <p className="text-brand-dark-blue font-black text-sm brand-heading">{selectedActivity.time}</p>
                      </div>
                    </div>
                  </div>

                  {/* Account Family Members Checklist */}
                  {accountMembers.length > 0 && (
                    <div className="space-y-3 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/70">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-brand-dark-blue uppercase tracking-widest brand-heading">
                          Select Registered Family Members
                        </label>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Account Members</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {accountMembers.map((member) => {
                          const isChecked = selectedMemberIds.includes(member.id);
                          const isAlreadyBooked = allBookings.some(
                            b => b.sessionId === selectedActivity.id &&
                                 b.sessionDate === effective.date &&
                                 b.userId === user?.id &&
                                 b.status !== 'cancelled' &&
                                 b.participantName.toLowerCase().trim() === member.name.toLowerCase().trim()
                          );

                          return (
                            <label 
                              key={member.id}
                              className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                                isChecked
                                  ? 'border-brand-orange bg-orange-50/50 text-brand-dark-blue shadow-sm'
                                  : 'border-slate-100 bg-white hover:border-slate-200 text-slate-600'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleAccountMember(member, defaultFood)}
                                  className="h-5 w-5 text-brand-orange focus:ring-brand-orange border-slate-300 rounded cursor-pointer"
                                />
                                <div>
                                  <p className="font-bold text-sm text-slate-800">{member.name}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{member.roleTag}</p>
                                </div>
                              </div>
                              {isAlreadyBooked && (
                                <span className="text-[9px] font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full uppercase brand-heading">
                                  Already Registered
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Individual Space per Participant */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <h4 className="text-xs font-black text-brand-dark-blue uppercase tracking-widest brand-heading">
                          People Being Booked ({participants.length})
                        </h4>
                        <p className="text-[11px] text-slate-400 font-medium">Specific space and preferences for each person</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addCustomParticipant(defaultFood)}
                        className="px-3.5 py-2 bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange text-xs font-bold rounded-xl uppercase tracking-wider transition-all brand-heading flex items-center gap-1"
                      >
                        <Icons.Plus className="h-4 w-4" /> Add Person
                      </button>
                    </div>

                    {participants.map((p, index) => (
                      <div key={p.id} className="p-5 bg-slate-50/90 rounded-2xl border-2 border-slate-100 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-brand-orange uppercase tracking-widest brand-heading bg-orange-100/80 px-2.5 py-1 rounded-md">
                            Person {index + 1} {p.isAccountMember ? '• Account Family Member' : ''}
                          </span>
                          {participants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeParticipant(p.id, p.accountMemberId)}
                              className="text-slate-400 hover:text-red-500 text-xs font-bold transition-colors"
                            >
                              ✕ Remove
                            </button>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">
                            Participant Full Name
                          </label>
                          <input
                            type="text"
                            placeholder="Enter participant full name"
                            value={p.name}
                            onChange={(e) => updateParticipantName(p.id, e.target.value)}
                            className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-slate-700 text-sm"
                          />
                        </div>

                        {selectedActivity.includesFood && (
                          <div className="space-y-2.5 pt-2 border-t border-slate-200/60">
                            <label className="text-[10px] font-bold text-brand-orange uppercase tracking-widest brand-heading">
                              Food Choice for {p.name || `Person ${index + 1}`}
                            </label>
                            {selectedActivity.foodOptions ? (
                              <div className="grid grid-cols-2 gap-2">
                                {selectedActivity.foodOptions.split(',').map(s => s.trim()).map((option) => (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => updateParticipantFood(p.id, option)}
                                    className={`p-3 rounded-xl border-2 text-xs font-bold text-left transition-all ${
                                      p.foodChoice === option
                                        ? 'border-brand-orange bg-orange-50 text-brand-orange font-black'
                                        : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
                                    }`}
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <input
                                type="text"
                                placeholder="Dietary requirements / food choice"
                                value={p.foodChoice}
                                onChange={(e) => updateParticipantFood(p.id, e.target.value)}
                                className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none text-xs font-bold text-slate-600"
                              />
                            )}

                            {p.foodConflictWarning && (
                              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-amber-800 space-y-3">
                                <div className="flex items-start gap-2.5">
                                  <Icons.AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                  <div className="space-y-1">
                                    <p className="font-bold text-amber-900 uppercase text-[10px] brand-heading">Dietary & Allergy Notice</p>
                                    <p className="text-xs font-medium text-amber-800 leading-snug">{p.foodConflictWarning}</p>
                                  </div>
                                </div>
                                <label className="flex items-center gap-2.5 pt-2 border-t border-amber-200 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={p.conflictConfirmed}
                                    onChange={(e) => updateParticipantConflictConfirmed(p.id, e.target.checked)}
                                    className="h-4 w-4 text-brand-orange focus:ring-brand-orange border-amber-300 rounded"
                                  />
                                  <span className="text-xs font-bold text-amber-900">
                                    I confirm this food choice is safe for {p.name || 'this participant'}.
                                  </span>
                                </label>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Booker Contact Mobile */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">
                      Booker Contact Mobile Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 07123 456 789"
                      value={bookerMobile}
                      onChange={(e) => setBookerMobile(e.target.value)}
                      className="w-full px-5 py-3.5 bg-white border-2 border-slate-100 rounded-xl focus:border-brand-orange outline-none font-bold text-slate-700 text-sm"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button 
                      onClick={handleConfirmBooking}
                      style={{ backgroundColor: COLORS.orange }}
                      className="w-full py-5 rounded-2xl text-white font-black text-sm md:text-base brand-heading uppercase tracking-[0.15em] shadow-xl hover:brightness-110 transition-all active:scale-95"
                    >
                      Complete Booking ({participants.length} {participants.length === 1 ? 'Person' : 'People'})
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};
