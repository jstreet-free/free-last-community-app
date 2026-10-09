import { getSessionTimes } from './sessionTime';

// "Add to calendar" links and an .ics invite for a booked session, so the person's own calendar
// reminds them. Times are written as local wall-clock times (the centre is in the UK), with no
// timezone conversion, because session times are free text entered for UK local time.

export interface CalendarEvent {
  uid: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // free text, e.g. "16:00 - 18:00"
  location?: string;
  description?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const compactDate = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const compactDateTime = (d: Date) => `${compactDate(d)}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

const dayOf = (dateStr: string) => {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(p => parseInt(p, 10));
  return new Date(y, m - 1, d);
};
const nextDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

export const googleCalendarUrl = (event: CalendarEvent): string => {
  const times = getSessionTimes(event.date, event.time);
  const day = dayOf(event.date);
  const dates = times
    ? `${compactDateTime(times.start)}/${compactDateTime(times.end)}`
    : `${compactDate(day)}/${compactDate(nextDay(day))}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates,
    ctz: 'Europe/London',
    details: event.description || '',
    location: event.location || ''
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export const outlookCalendarUrl = (event: CalendarEvent): string => {
  const times = getSessionTimes(event.date, event.time);
  const day = dayOf(event.date);
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: times ? isoLocal(times.start) : isoLocal(day),
    enddt: times ? isoLocal(times.end) : isoLocal(nextDay(day)),
    allday: times ? 'false' : 'true',
    location: event.location || '',
    body: event.description || ''
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};

const escapeIcsText = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// iCalendar lines longer than 75 characters must be folded onto continuation lines starting with a space.
const foldLine = (line: string) => {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ' ' + rest.slice(75);
  }
  parts.push(rest);
  return parts.join('\r\n');
};

// An .ics file (works with Apple Calendar, Outlook and most others) with alarms a day and two hours before.
export const buildIcsInvite = (event: CalendarEvent): string => {
  const times = getSessionTimes(event.date, event.time);
  const day = dayOf(event.date);
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const alarm = (trigger: string) => [
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(event.title)}`,
    `TRIGGER:${trigger}`,
    'END:VALARM'
  ];
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//free@last//Community Hub//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}@freeatlast.co.uk`,
    `DTSTAMP:${stamp}`,
    ...(times
      ? [`DTSTART:${compactDateTime(times.start)}`, `DTEND:${compactDateTime(times.end)}`]
      : [`DTSTART;VALUE=DATE:${compactDate(day)}`, `DTEND;VALUE=DATE:${compactDate(nextDay(day))}`]),
    `SUMMARY:${escapeIcsText(event.title)}`,
    ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
    ...(event.description ? [`DESCRIPTION:${escapeIcsText(event.description)}`] : []),
    ...alarm('-P1D'),
    ...alarm('-PT2H'),
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  return lines.map(foldLine).join('\r\n') + '\r\n';
};
