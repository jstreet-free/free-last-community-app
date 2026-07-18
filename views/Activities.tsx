import React, { useState } from 'react';
import { SAMPLE_ACTIVITIES, Icons, COLORS } from '../constants';
import { Activity, User } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ActivitiesProps {
  user: User | null;
  onBook: (bookingDetail: {
    participantName: string;
    bookerMobile: string;
    activity: Activity;
    foodChoice?: string;
    foodConflictConfirmed?: boolean;
  }) => void;
  onCancel?: (bookingId: string) => void;
  bookings: string[];
  assets: any;
  hasConfirmedPhotoPolicy: boolean;
  activities: Activity[];
  allBookings: any[];
  setActiveTab: (tab: string) => void;
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
  const [viewMode, setViewMode] = useState<'explore' | 'history'>('explore');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [bookingForm, setBookingForm] = useState({
    participantName: '',
    bookerMobile: '',
    foodChoice: ''
  });
  const [showFoodConflictWarning, setShowFoodConflictWarning] = useState<string | null>(null);
  const [conflictConfirmed, setConflictConfirmed] = useState(false);

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

  const handleOpenBooking = (activity: Activity) => {
    let defaultFood = '';
    if (activity.includesFood && activity.foodOptions) {
      const options = activity.foodOptions.split(',').map(s => s.trim());
      if (options.length > 0) {
        defaultFood = options[0];
      }
    }

    setSelectedActivity(activity);
    setBookingForm({
      participantName: user?.name || '',
      bookerMobile: user?.profile?.parentMobile || user?.profile?.parentMobile || '',
      foodChoice: defaultFood
    });
    setShowFoodConflictWarning(null);
    setConflictConfirmed(false);
  };

  const handleConfirmBooking = () => {
    if (!selectedActivity) return;
    if (!bookingForm.participantName || !bookingForm.bookerMobile) {
      alert("Please fill in all details to confirm your booking.");
      return;
    }

    if (selectedActivity.includesFood && bookingForm.foodChoice) {
      const allergies = getDietaryAllergies(bookingForm.participantName);
      const conflictMsg = checkFoodConflict(bookingForm.foodChoice, allergies);
      
      if (conflictMsg && !conflictConfirmed) {
        setShowFoodConflictWarning(conflictMsg);
        return;
      }
    }

    onBook({
      participantName: bookingForm.participantName,
      bookerMobile: bookingForm.bookerMobile,
      activity: selectedActivity,
      foodChoice: selectedActivity.includesFood ? bookingForm.foodChoice : undefined,
      foodConflictConfirmed: conflictConfirmed,
    });
    
    setSelectedActivity(null);
    setShowFoodConflictWarning(null);
    setConflictConfirmed(false);
  };

  const upcomingActivities = activities.filter(a => a.status === 'upcoming');

  const filteredActivities = filter === 'all' 
    ? upcomingActivities 
    : upcomingActivities.filter(a => a.category === filter);

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

  const getEffectiveSession = (activity: Activity) => {
    if (activity.frequency !== 'weekly') {
      return { 
        date: activity.date,
        isBookable: activity.status === 'upcoming' 
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let occurrenceDate = new Date(activity.date);
    occurrenceDate.setHours(0, 0, 0, 0);

    // If the initial date is in the past, move it forward week by week until it's today or in the future
    while (occurrenceDate < today) {
      occurrenceDate.setDate(occurrenceDate.getDate() + 7);
    }

    return {
      date: occurrenceDate.toISOString().split('T')[0],
      isBookable: true
    };
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16">
        <div>
          <h1 style={{ color: COLORS.secondary }} className="text-5xl font-bold mb-4 brand-heading uppercase tracking-tight">Session Booking</h1>
          <p className="text-gray-500 text-lg font-light">Explore and join our weekly community activities at the Nechells Hub.</p>
        </div>
        
        {viewMode === 'explore' && (
          <div className="flex flex-wrap gap-2">
            {['all', 'youth', 'community', 'sports', 'education'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                style={{ 
                  backgroundColor: filter === f ? COLORS.secondary : '#ffffff',
                  color: filter === f ? '#ffffff' : COLORS.secondary,
                  borderColor: COLORS.secondary
                }}
                className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border-2 brand-heading ${
                  filter === f ? 'shadow-lg scale-105' : 'hover:bg-gray-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
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
                      const sessionDateObj = new Date(b.sessionDate);
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
                            <p>{new Date(b.sessionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredActivities.map((activity) => {
            const effective = getEffectiveSession(activity);
            const effectiveDate = effective.date;
            
            // Calculate dynamic booking count for this specific occurrence (excluding cancelled)
            const occurrenceBookings = allBookings.filter(
              b => b.sessionId === activity.id && b.sessionDate === effectiveDate && b.status !== 'cancelled'
            );
            const currentBookedCount = occurrenceBookings.length;
            
            // Check if current user is booked for THIS specific occurrence (excluding cancelled)
            const matchedBooking = user ? allBookings.find(b => 
              b.sessionId === activity.id && 
              b.sessionDate === effectiveDate && 
              b.userId === user.id &&
              b.status !== 'cancelled'
            ) : null;
            const isBooked = !!matchedBooking;

            const isFull = currentBookedCount >= activity.capacity;
            const catColor = getCategoryColor(activity.category);

            const bookableActivity = {
              ...activity,
              date: effectiveDate,
              bookedCount: currentBookedCount
            };

            return (
              <div key={activity.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row hover:shadow-xl transition-all">
                <div className="md:w-2/5 h-56 md:h-auto relative overflow-hidden">
                  <img 
                    src={getActivityImage(activity)} 
                    alt={activity.title}
                    className="w-full h-full object-cover"
                  />
                  <div style={{ backgroundColor: catColor }} className="absolute top-4 left-4 text-white px-4 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-lg brand-heading">
                    {activity.category}
                    {activity.frequency === 'weekly' && " • Weekly"}
                  </div>
                </div>
                
                <div className="p-8 flex-grow flex flex-col md:w-3/5">
                  <h3 style={{ color: COLORS.secondary }} className="text-2xl font-bold mb-4 brand-heading">{activity.title}</h3>
                  <p className="text-gray-500 mb-6 text-sm font-light leading-relaxed h-12 overflow-hidden">{activity.description}</p>
                  
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3 text-brand-dark-blue font-bold text-[10px] uppercase tracking-wider brand-heading">
                      <span style={{ color: COLORS.orange }}><Icons.Calendar /></span>
                      <span>{new Date(effectiveDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
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
                          <div className="flex items-center gap-2">
                            <span className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest brand-heading">
                              ✓ Booked
                            </span>
                            {onCancel && matchedBooking && (
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to cancel your booking for ${activity.title}?`)) {
                                    onCancel(matchedBooking.id);
                                  }
                                }}
                                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 border border-red-100 hover:border-red-200 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all brand-heading"
                              >
                                Cancel
                              </button>
                            )}
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

      <AnimatePresence>
        {selectedActivity && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedActivity(null)}
              className="absolute inset-0 bg-brand-dark-blue/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden"
            >
              <div style={{ backgroundColor: COLORS.secondary }} className="p-12 text-white relative">
                <button 
                  onClick={() => setSelectedActivity(null)}
                  className="absolute top-10 right-10 text-white/50 hover:text-white transition-colors"
                >
                  <Icons.Plus className="rotate-45 h-10 w-10" />
                </button>
                <div style={{ color: COLORS.yellow }} className="mb-6"><Icons.Calendar /></div>
                <h2 className="text-3xl font-black brand-heading uppercase tracking-tight leading-none mb-4">Confirm Registration</h2>
                <div className="flex items-center gap-4 text-white/70 font-bold text-xs uppercase tracking-[0.2em] brand-heading">
                  <span className="bg-white/10 px-3 py-1 rounded-lg">{selectedActivity.title}</span>
                </div>
              </div>

              <div className="p-12 space-y-8">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                  <div className="flex items-center gap-4">
                    <div style={{ backgroundColor: COLORS.orange }} className="w-10 h-10 rounded-xl flex items-center justify-center text-white">
                      <Icons.Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Session Date</p>
                      <p className="text-brand-dark-blue font-black brand-heading">{new Date(selectedActivity.date).toLocaleDateString('en-GB', { dateStyle: 'long' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div style={{ backgroundColor: COLORS.lightBlue }} className="w-10 h-10 rounded-xl flex items-center justify-center text-white">
                      <Icons.Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading">Session Time</p>
                      <p className="text-brand-dark-blue font-black brand-heading">{selectedActivity.time}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading px-2">Participant Name (who is attending?)</label>
                    <input 
                      type="text"
                      placeholder="Enter full name"
                      value={bookingForm.participantName}
                      onChange={(e) => setBookingForm({...bookingForm, participantName: e.target.value})}
                      className="w-full px-8 py-5 bg-white border-2 border-slate-100 rounded-2xl focus:border-brand-orange outline-none transition-all font-bold text-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading px-2">Booker Contact No.</label>
                    <input 
                      type="tel"
                      placeholder="e.g. 07123 456 789"
                      value={bookingForm.bookerMobile}
                      onChange={(e) => setBookingForm({...bookingForm, bookerMobile: e.target.value})}
                      className="w-full px-8 py-5 bg-white border-2 border-slate-100 rounded-2xl focus:border-brand-orange outline-none transition-all font-bold text-slate-600"
                    />
                  </div>

                  {selectedActivity.includesFood && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest brand-heading px-2 text-brand-orange">
                          Preferred Food Option (Included in Activity)
                        </label>
                        {selectedActivity.foodOptions ? (
                          <div className="grid grid-cols-2 gap-3">
                            {selectedActivity.foodOptions.split(',').map(s => s.trim()).map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => {
                                  setBookingForm({...bookingForm, foodChoice: option});
                                  setShowFoodConflictWarning(null);
                                  setConflictConfirmed(false);
                                }}
                                className={`p-4 rounded-xl border-2 text-sm font-bold text-left transition-all ${
                                  bookingForm.foodChoice === option
                                    ? 'border-brand-orange bg-orange-50/50 text-brand-orange'
                                    : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                                }`}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="e.g. Vegetarian meal, halal, none"
                            value={bookingForm.foodChoice}
                            onChange={(e) => {
                              setBookingForm({...bookingForm, foodChoice: e.target.value});
                              setShowFoodConflictWarning(null);
                              setConflictConfirmed(false);
                            }}
                            className="w-full px-8 py-5 bg-white border-2 border-slate-100 rounded-2xl focus:border-brand-orange outline-none transition-all font-bold text-slate-600"
                          />
                        )}
                      </div>

                      {showFoodConflictWarning && (
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-amber-800 space-y-4 animate-fadeIn">
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 mt-0.5 text-amber-600">
                              <Icons.AlertTriangle className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                              <p className="font-bold text-amber-900 uppercase tracking-wide text-xs brand-heading">Dietary & Allergy Warning</p>
                              <p className="text-sm font-light leading-relaxed">{showFoodConflictWarning}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 pt-2 border-t border-amber-200">
                            <input 
                              type="checkbox" 
                              id="confirmConflict"
                              checked={conflictConfirmed}
                              onChange={(e) => setConflictConfirmed(e.target.checked)}
                              className="h-5 w-5 text-brand-orange focus:ring-brand-orange border-amber-300 rounded"
                            />
                            <label htmlFor="confirmConflict" className="text-xs font-bold text-amber-900 cursor-pointer select-none">
                              I confirm this food choice is safe and I want to proceed.
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-6">
                  <button 
                    onClick={handleConfirmBooking}
                    style={{ backgroundColor: COLORS.orange }}
                    className="w-full py-6 rounded-2xl text-white font-black text-lg brand-heading uppercase tracking-[0.2em] shadow-xl hover:brightness-110 transition-all active:scale-95"
                  >
                    Complete Booking
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
