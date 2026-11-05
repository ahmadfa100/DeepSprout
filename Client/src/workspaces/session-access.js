/** Access details shared by the session form and local student notices. */
export const mapUrl = address => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(address || '').trim())}`;
export const mapEmbedUrl = address => `https://maps.google.com/maps?q=${encodeURIComponent(String(address || '').trim())}&output=embed`;

export function meetingUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || !['meet.google.com', 'zoom.us'].some(domain => host === domain || host.endsWith(`.${domain}`))) return '';
    return url.href;
  } catch { return ''; }
}

export function sessionAccess(session, mode = session.format) {
  if (mode === 'In-person') {
    const address = session.address || session.venue;
    return {label:'On-site location', detail:`${session.venue}${session.address && session.address !== session.venue ? ` · ${session.address}` : ''}`, url:mapUrl(address)};
  }
  return {label:'Join online', detail:'Google Meet or Zoom', url:session.meeting};
}

export function sessionEmailPreview(session, mode = session.format, code = '') {
  const access = sessionAccess(session, mode);
  return {
    subject:`${code ? 'Booking confirmed' : 'New session'}: ${session.title}`,
    body:`${session.title}\n${session.date} · ${session.time}–${session.endTime} (${session.timezone || 'Asia/Amman'})\n${access.label}: ${access.detail}\n${access.url}${code ? `\nBooking code: ${code}` : '\nRegister for this session in DeepSprout.'}`,
    url:access.url
  };
}
