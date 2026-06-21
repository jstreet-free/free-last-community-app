
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
  }) => void;
  bookings: string[];
  assets: any;
  hasConfirmedPhotoPolicy: boolean;
  activities: Activity[];
  allBookings: any[];
  setActiveTab: (tab: string) => void;
}

export const Activities: React.FC<ActivitiesProps> = ({ user, onBook, bookings, assets, hasConfirmedPhotoPolicy, activities, allBookings, setActiveTab }) => {
  const [filter, setFilter] = useState<'all' | 'youth' | 'community' | 'sports' | 'education'>('all');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [bookingForm, setBookingForm] = useState({
    participantName: '',
    bookerMobile: ''
  });

  const handleOpenBooking = (activity: Activity) => {
    setSelectedActivity(activity);
    setBookingForm({
      participantName: user?.name || '',
      bookerMobile: user?.profile?.mobile || ''
    });
  };

  const handleConfirmBooking = () => {
    if (!selectedActivity) return;
    if (!bookingForm.participantName || !bookingForm.bookerMobile) {
      alert("Please fill in all details to confirm your booking.");
      return;
    }

    onBook({
      participantName: bookingForm.participantName,
      bookerMobile: bookingForm.bookerMobile,
      activity: selectedActivity
    });
    setSelectedActivity(null);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16">
        <div>
          <h1 style={{ color: COLORS.secondary }} className="text-5xl font-bold mb-4 brand-heading uppercase tracking-tight">Session Booking</h1>
          <p className="text-gray-500 text-lg font-light">Explore and join our weekly community activities at the Nechells Hub.</p>
        </div>
        
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredActivities.map((activity) => {
          const effective = getEffectiveSession(activity);
          const effectiveDate = effective.date;
          
          // Calculate dynamic booking count for this specific occurrence
          const occurrenceBookings = allBookings.filter(b => b.sessionId === activity.id && b.sessionDate === effectiveDate);
          const currentBookedCount = occurrenceBookings.length;
          
          // Check if current user is booked for THIS specific occurrence
          const isBooked = user ? allBookings.some(b => 
            b.sessionId === activity.id && 
            b.sessionDate === effectiveDate && 
            b.userId === user.id
          ) : false;

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
                    <button
                      disabled={isBooked || isFull}
                      onClick={() => handleOpenBooking(bookableActivity)}
                      style={{ backgroundColor: isBooked ? COLORS.green : (isFull ? '#e2e8f0' : COLORS.orange) }}
                      className={`px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest text-white transition-all shadow-md active:scale-95 brand-heading ${
                        !isBooked && !isFull ? 'hover:brightness-110' : 'cursor-default'
                      }`}
                    >
                      {isBooked ? 'Success' : isFull ? 'Full' : 'Book Now'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
