export const VERSION = '0.1.0';
export const POLICY = 'active-domain-1';
export const ORIGINS = ['http://127.0.0.1:8897', 'http://localhost:8897'];
export const SITES = ['instagram.com', 'youtube.com', 'tiktok.com'];
export const isPerson = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,119}$/.test(value) && value !== 'preview';
export function appURL(value) {
  try { const u = new URL(value); return ORIGINS.includes(u.origin) && /^\/src\/pages\/member\//.test(u.pathname) && !u.username && !u.password; } catch { return false; }
}
export function domains(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) throw new Error('Choose one to three supported domains.');
  const result = [...new Set(value.map(v => typeof v === 'string' ? v.toLowerCase().replace(/\.$/, '').replace(/^www\./, '') : ''))];
  if (result.some(v => !SITES.includes(v))) throw new Error('Unsupported domain. Only Instagram, YouTube and TikTok are eligible.');
  return result.sort();
}
export function siteOf(value) {
  try { const u = new URL(value); if (!['http:', 'https:'].includes(u.protocol)) return null; return SITES.find(s => u.hostname === s || u.hostname.endsWith('.' + s)) || null; } catch { return null; }
}
export function envelope(m) {
  return !!m && Object.getPrototypeOf(m) === Object.prototype && m.protocol === 1 && typeof m.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(m.id) && typeof m.command === 'string' && JSON.stringify(m).length <= 12000;
}
