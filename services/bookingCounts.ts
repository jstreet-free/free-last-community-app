import { Activity } from '../types';

type BookingLike = { sessionId: string; sessionDate: string; status?: string };

// The per-date counter stored on the activity. For weekly activities `bookedCount` is a running
// total across every week, so it must never stand in for a single date's count.
export const getStoredCountForDate = (activity: Activity, dateStr: string): number =>
  activity.sessionBookings?.[dateStr] ??
  (activity.frequency !== 'weekly' ? (activity.bookedCount || 0) : 0);

export const countActiveBookingsForDate = (bookings: BookingLike[], activityId: string, dateStr: string): number =>
  bookings.filter(b => b.sessionId === activityId && b.sessionDate === dateStr && b.status !== 'cancelled').length;

// How many places are taken on one date of an activity. When we can see everyone's bookings (admins)
// they are the source of truth; otherwise (members only see their own) we rely on the stored counter.
export const getBookedCountForDate = (
  activity: Activity,
  dateStr: string,
  bookings: BookingLike[],
  hasAllBookings: boolean
): number => {
  const actual = countActiveBookingsForDate(bookings, activity.id, dateStr);
  if (hasAllBookings) return actual;
  return Math.max(getStoredCountForDate(activity, dateStr), actual);
};
