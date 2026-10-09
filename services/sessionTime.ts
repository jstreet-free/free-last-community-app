// Activity times are free text entered by admins, e.g. "16:00", "11:00 - 15:00", "4pm" or "4:30pm - 6pm".
// A session is treated as finished at the last time mentioned (the end time when a range is given,
// otherwise the start time). If no time can be read, it runs until the end of its day.

const TIME_TOKEN = /(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/gi;

const parseMinutes = (hourStr: string, minuteStr: string | undefined, meridiem: string | undefined): number | null => {
  let hours = parseInt(hourStr, 10);
  const minutes = minuteStr ? parseInt(minuteStr, 10) : 0;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    const pm = meridiem.toLowerCase() === 'pm';
    if (pm && hours < 12) hours += 12;
    if (!pm && hours === 12) hours = 0;
  }
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const parseDateOnly = (dateStr: string): Date | null => {
  const parts = (dateStr || '').split('T')[0].split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(p => parseInt(p, 10));
  if ([y, m, d].some(isNaN)) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

// Every time of day mentioned in the text, in order, as minutes after midnight.
const parseTimesOfDay = (timeStr?: string): number[] => {
  const times: number[] = [];
  for (const match of (timeStr || '').matchAll(TIME_TOKEN)) {
    // Ignore bare numbers with neither minutes nor am/pm (e.g. a stray "2" in "2 hours").
    if (!match[2] && !match[3]) continue;
    const mins = parseMinutes(match[1], match[2], match[3]);
    if (mins !== null) times.push(mins);
  }
  return times;
};

// Start and end as local date-times, for calendar invites. A session with only a start time is
// assumed to last an hour; null means no time could be read, so treat it as an all-day event.
export const getSessionTimes = (dateStr: string, timeStr?: string): { start: Date; end: Date } | null => {
  const day = parseDateOnly(dateStr);
  const times = parseTimesOfDay(timeStr);
  if (!day || times.length === 0) return null;
  const start = new Date(day);
  start.setMinutes(times[0]);
  const end = new Date(day);
  const endMinutes = times[times.length - 1];
  if (times.length > 1 && endMinutes > times[0]) end.setMinutes(endMinutes);
  else end.setMinutes(times[0] + 60);
  return { start, end };
};

export const getSessionEnd = (dateStr: string, timeStr?: string): Date | null => {
  const day = parseDateOnly(dateStr);
  if (!day) return null;

  const times = parseTimesOfDay(timeStr);
  const endMinutes = times.length > 0 ? times[times.length - 1] : null;

  const end = new Date(day);
  if (endMinutes === null) {
    end.setHours(23, 59, 59, 999);
  } else {
    end.setMinutes(endMinutes);
  }
  return end;
};

export const hasSessionEnded = (dateStr: string, timeStr?: string, now: Date = new Date()): boolean => {
  const end = getSessionEnd(dateStr, timeStr);
  return end !== null && now.getTime() >= end.getTime();
};
