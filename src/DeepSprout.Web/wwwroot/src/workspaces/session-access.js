/** Access details shared by the session form and local student notices. */
export const mapUrl = address => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(address || '').trim())}`;
export const mapEmbedUrl = address => `https://maps.google.com/maps?q=${encodeURIComponent(String(address || '').trim())}&output=embed`;

/** The meeting platforms DeepSprout accepts links from. `newUrl` opens the platform's own "new meeting" page. */
export const MEETING_PLATFORMS = {
  meet:{name:'Google Meet', hosts:['meet.google.com'], newUrl:'https://meet.google.com/new'},
  zoom:{name:'Zoom', hosts:['zoom.us'], newUrl:'https://zoom.us/meeting/schedule'},
  teams:{name:'Microsoft Teams', hosts:['teams.microsoft.com', 'teams.live.com'], newUrl:'https://teams.microsoft.com/l/meeting/new'}
};
const hostMatches = (host, domain) => host === domain || host.endsWith(`.${domain}`);

export function meetingPlatform(value) {
  try {
    const host = new URL(String(value || '').trim()).hostname.toLowerCase();
    return Object.keys(MEETING_PLATFORMS).find(key => MEETING_PLATFORMS[key].hosts.some(d => hostMatches(host, d))) || '';
  } catch { return ''; }
}

/** A safe HTTPS Google Meet, Zoom or Microsoft Teams link, or ''. */
export function meetingUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:' || !meetingPlatform(url.href)) return '';
    return url.href;
  } catch { return ''; }
}

/** Groups a numeric meeting ID the way the platforms print it (Zoom 3-4-4, others in threes). */
export function formatMeetingId(id, platform) {
  const d = String(id || '').replace(/\D/g, '');
  if (!d) return String(id || '');
  if (platform === 'zoom') return d.length === 11 ? `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}` : d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : d.replace(/(\d{3})(?=\d)/g, '$1 ');
  return d.replace(/(\d{3})(?=\d)/g, '$1 ');
}

/** Reads what a pasted link tells us: platform, meeting ID and, for Teams, the passcode. */
export function parseMeetingLink(value) {
  const href = meetingUrl(value);
  if (!href) return {platform:'', meetingId:'', passcode:'', passcodeInLink:false};
  const url = new URL(href), platform = meetingPlatform(href);
  if (platform === 'meet') return {platform, meetingId:(url.pathname.match(/^\/([a-z]{3,4}-[a-z]{3,4}-[a-z]{3,4})/i) || [])[1] || '', passcode:'', passcodeInLink:false};
  if (platform === 'zoom') { const id = (url.pathname.match(/\/(?:j|w|s|my)\/(\d{9,11})/) || [])[1] || ''; return {platform, meetingId:id ? formatMeetingId(id, 'zoom') : '', passcode:'', passcodeInLink:url.searchParams.has('pwd')}; }
  const id = (url.pathname.match(/\/meet\/(\d{9,16})/) || [])[1] || '';
  return {platform, meetingId:id ? formatMeetingId(id, 'teams') : '', passcode:url.searchParams.get('p') || '', passcodeInLink:url.searchParams.has('p')};
}

const SETTING_KEYS = ['lobby', 'passcode', 'joinEarly', 'muted', 'cameraOff', 'record', 'attendance', 'cohosts'];
/** Keeps only the known meeting-setup fields. Returns null when there is no valid link. */
export function cleanMeetingSetup(raw, url) {
  const href = meetingUrl(url);
  if (!href) return null;
  let v = raw;
  if (typeof v === 'string') { try { v = JSON.parse(v || '{}'); } catch { v = {}; } }
  if (!v || typeof v !== 'object') v = {};
  const parsed = parseMeetingLink(href), str = (x, max) => String(x ?? '').trim().slice(0, max);
  const settings = {};
  for (const key of SETTING_KEYS) if (v.settings && key in v.settings) settings[key] = Boolean(v.settings[key]);
  const generated = v.source === 'generated';
  return {
    platform:parsed.platform, source:generated ? 'generated' : 'existing',
    meetingId:str(v.meetingId, 40) || parsed.meetingId, passcode:str(v.passcode, 24) || parsed.passcode,
    hostEmail:str(v.hostEmail, 120), timezone:str(v.timezone, 40),
    opensEarly:[0, 5, 10, 15].includes(Number(v.opensEarly)) ? Number(v.opensEarly) : 0,
    settings, generatedAt:generated ? str(v.generatedAt, 40) : ''
  };
}

/** "Zoom · ID 812 3456 7890 · Passcode 4KD9QX" for notices and detail pages. */
export function meetingDetail(setup, url) {
  const platform = setup?.platform || meetingPlatform(url);
  if (!platform) return 'Online meeting';
  const parts = [MEETING_PLATFORMS[platform].name];
  if (setup?.meetingId) parts.push(`ID ${setup.meetingId}`);
  if (setup?.passcode) parts.push(`Passcode ${setup.passcode}`);
  return parts.join(' · ');
}

export function sessionAccess(session, mode = session.format) {
  if (mode === 'In-person') {
    const address = session.address || session.venue;
    return {label:'On-site location', detail:`${session.venue}${session.address && session.address !== session.venue ? ` · ${session.address}` : ''}`, url:mapUrl(address)};
  }
  return {label:'Join online', detail:meetingDetail(session.meetingSetup, session.meeting), url:session.meeting};
}

export function sessionEmailPreview(session, mode = session.format, code = '') {
  const access = sessionAccess(session, mode);
  return {
    subject:`${code ? 'Booking confirmed' : 'New session'}: ${session.title}`,
    body:`${session.title}\n${session.date} · ${session.time}–${session.endTime} (${session.timezone || 'Asia/Amman'})\n${access.label}: ${access.detail}\n${access.url}${code ? `\nBooking code: ${code}` : '\nRegister for this session in DeepSprout.'}`,
    url:access.url
  };
}
