import React, { useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Booking } from '../types';
import { COLORS } from '../constants';
import { hasSessionEnded } from '../services/sessionTime';

// Reminds the signed-in person about sessions they've booked for today or tomorrow.

interface UpcomingBookingsBannerProps {
  bookings: Booking[];
  onViewBookings: () => void;
}

const localDateString = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const DISMISS_KEY = 'upcoming_bookings_banner_dismissed';

export const UpcomingBookingsBanner: React.FC<UpcomingBookingsBannerProps> = ({ bookings, onViewBookings }) => {
  const now = new Date();
  const today = localDateString(now);
  const tomorrow = localDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));

  const sessions = useMemo(() => {
    const grouped = new Map<string, { title: string; date: string; time: string; names: string[] }>();
    bookings
      .filter(b => b.status !== 'cancelled' && (b.sessionDate === today || b.sessionDate === tomorrow))
      .filter(b => !hasSessionEnded(b.sessionDate, b.sessionTime))
      .forEach(b => {
        const key = `${b.sessionId}|${b.sessionDate}`;
        const entry = grouped.get(key) || { title: b.sessionTitle, date: b.sessionDate, time: b.sessionTime, names: [] };
        if (b.participantName && !entry.names.includes(b.participantName)) entry.names.push(b.participantName);
        grouped.set(key, entry);
      });
    return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
  }, [bookings, today, tomorrow]);

  // Dismissing hides the banner for the rest of the day, until the list of sessions changes.
  const signature = `${today}:${sessions.map(s => `${s.title}|${s.date}|${s.names.length}`).join(',')}`;
  const [dismissed, setDismissed] = useState<string | null>(() => {
    try { return localStorage.getItem(DISMISS_KEY); } catch { return null; }
  });

  if (sessions.length === 0 || dismissed === signature) return null;

  const dismiss = () => {
    setDismissed(signature);
    try { localStorage.setItem(DISMISS_KEY, signature); } catch {}
  };

  return (
    <div style={{ borderColor: COLORS.orange }} className="bg-orange-50 border-b-2 px-4 py-3 text-sm text-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-start gap-3">
        <CalendarClock style={{ color: COLORS.orange }} className="w-5 h-5 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold">Don't forget, you're booked in:</p>
          <ul className="mt-1 space-y-0.5">
            {sessions.map(s => (
              <li key={`${s.title}|${s.date}`}>
                <strong>{s.date === today ? 'Today' : 'Tomorrow'}{s.time ? `, ${s.time}` : ''}</strong>: {s.title}
                {s.names.length > 0 && <span className="text-slate-600"> ({s.names.join(', ')})</span>}
              </li>
            ))}
          </ul>
          <button onClick={onViewBookings} className="mt-1 font-semibold underline hover:no-underline" style={{ color: COLORS.secondary }}>
            View my bookings
          </button>
        </div>
        <button onClick={dismiss} className="text-slate-500 hover:text-slate-900 font-bold text-sm px-2 py-0.5 rounded hover:bg-orange-100" title="Dismiss reminder">
          ✕
        </button>
      </div>
    </div>
  );
};
