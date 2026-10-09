import { buildIcsInvite, googleCalendarUrl, outlookCalendarUrl } from './calendarInvite';

// The email a member gets when they book, with "add to calendar" links and an .ics invite attached
// so their own calendar reminds them. Returned as a 'mail' collection message.

interface ConfirmationDetails {
  bookingId: string;
  bookerName: string;
  participantNames: string[];
  title: string;
  date: string; // YYYY-MM-DD, the booked session date
  time?: string;
  location?: string;
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const formatSessionDate = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(p => parseInt(p, 10));
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export const buildBookingConfirmationMessage = (details: ConfirmationDetails) => {
  const names = details.participantNames.join(', ');
  const when = `${formatSessionDate(details.date)}${details.time ? `, ${details.time}` : ''}`;
  const event = {
    uid: details.bookingId,
    title: `free@last: ${details.title}`,
    date: details.date,
    time: details.time,
    location: details.location,
    description: `Booked for: ${names}. Can't make it? Please cancel in the free@last app so someone else can have the place.`
  };
  const google = googleCalendarUrl(event);
  const outlook = outlookCalendarUrl(event);

  const text = [
    `Hi ${details.bookerName},`,
    '',
    `You're booked in for ${details.title}.`,
    '',
    `When: ${when}`,
    ...(details.location ? [`Where: ${details.location}`] : []),
    `Who: ${names}`,
    '',
    'Add it to your calendar so you get a reminder:',
    `Google Calendar: ${google}`,
    `Outlook: ${outlook}`,
    'Apple Calendar and others: open the attached invite.ics file.',
    '',
    "If you can't make it, please cancel in the app so someone on the waitlist can have the place.",
    '',
    'See you there!',
    'free@last'
  ].join('\n');

  const row = (label: string, value: string) =>
    `<p style="margin: 5px 0;"><strong>${label}:</strong> ${escapeHtml(value)}</p>`;
  const button = (href: string, label: string) =>
    `<a href="${escapeHtml(href)}" style="display: inline-block; margin: 4px 8px 4px 0; padding: 10px 16px; background: #2b337e; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">${label}</a>`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #7e2b33; padding: 20px; border-radius: 15px;">
      <h2 style="color: #2b337e; margin-top: 0;">You're booked in!</h2>
      <p>Hi ${escapeHtml(details.bookerName)}, your booking for <strong>${escapeHtml(details.title)}</strong> is confirmed.</p>
      <div style="background: #f9f9f9; padding: 15px; border-radius: 10px;">
        ${row('When', when)}
        ${details.location ? row('Where', details.location) : ''}
        ${row('Who', names)}
      </div>
      <p style="margin-top: 20px;"><strong>Add it to your calendar so you get a reminder:</strong></p>
      <p>
        ${button(google, 'Google Calendar')}
        ${button(outlook, 'Outlook')}
      </p>
      <p style="font-size: 13px; color: #555;">Apple Calendar and others: open the attached <strong>invite.ics</strong> file.</p>
      <p>If you can't make it, please cancel in the app so someone on the waitlist can have the place.</p>
      <p>See you there!<br />free@last</p>
    </div>
  `;

  return {
    subject: `Booking confirmed: ${details.title} on ${formatSessionDate(details.date)}`,
    text,
    html,
    attachments: [{ filename: 'invite.ics', content: buildIcsInvite(event), contentType: 'text/calendar; charset=utf-8; method=PUBLISH' }]
  };
};

interface CancellationDetails {
  bookerName: string;
  participantNames: string[];
  title: string;
  date: string; // YYYY-MM-DD, the cancelled session date
  time?: string;
  byOffice?: boolean; // cancelled by the free@last team rather than the member
}

// The email a member gets when they cancel a booking, or when the office cancels it for them.
// Returned as a 'mail' collection message.
export const buildBookingCancellationMessage = (details: CancellationDetails) => {
  const names = details.participantNames.join(', ');
  const when = `${formatSessionDate(details.date)}${details.time ? `, ${details.time}` : ''}`;
  const cancelledBy = details.byOffice ? ' by the free@last team' : '';
  const nextSteps = details.byOffice
    ? "If you added it to your calendar, you can delete it from there now. If you'd still like to come, you can book again in the free@last app while places are available, or contact the office by replying to this email."
    : "If you added it to your calendar, you can delete it from there now. If you didn't mean to cancel, you can book again in the free@last app while places are available.";

  const text = [
    `Hi ${details.bookerName},`,
    '',
    `Your booking for ${details.title} has been cancelled${cancelledBy} for ${names}.`,
    '',
    `When: ${when}`,
    `Who: ${names}`,
    '',
    nextSteps,
    '',
    'free@last'
  ].join('\n');

  const row = (label: string, value: string) =>
    `<p style="margin: 5px 0;"><strong>${label}:</strong> ${escapeHtml(value)}</p>`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #7e2b33; padding: 20px; border-radius: 15px;">
      <h2 style="color: #7e2b33; margin-top: 0;">Booking cancelled</h2>
      <p>Hi ${escapeHtml(details.bookerName)}, your booking for <strong>${escapeHtml(details.title)}</strong> has been cancelled${cancelledBy} for ${escapeHtml(names)}.</p>
      <div style="background: #f9f9f9; padding: 15px; border-radius: 10px;">
        ${row('When', when)}
        ${row('Who', names)}
      </div>
      <p>${escapeHtml(nextSteps)}</p>
      <p>free@last</p>
    </div>
  `;

  return {
    subject: `Booking cancelled: ${details.title} on ${formatSessionDate(details.date)}`,
    text,
    html
  };
};
