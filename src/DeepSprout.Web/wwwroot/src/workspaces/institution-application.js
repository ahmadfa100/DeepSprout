/**
 * Institution Representative application: one field inventory shared by the
 * public form, the applicant's review step and the Admin verification page.
 *
 * Everything lands in Application.details (VerificationCase.ClaimJson in the
 * approved database), so no new table or column is needed. Files stay
 * browser-local name previews; `fileKinds` maps each name to its document slot.
 */
import * as u from './ui.js';

const e = u.esc;
const YEAR = 2026;

export const TYPES = ['School', 'University / college', 'Youth center', 'Public library', 'Non-profit / NGO', 'Community center', 'Sports club', 'Cultural center', 'Training center', 'Other'];
export const SECTORS = ['Government / public', 'Private', 'Non-profit / civil society', 'Semi-government', 'International organization', 'Community or volunteer group'];
export const AGES = ['Under 12', '12–14', '15–17', '18–24', '25 and older', 'Parents & educators'];
export const AUTHORITY = [
  ['head', 'I lead the institution (director, chair or owner)'],
  ['appointed', 'Appointed by its board or management'],
  ['letter', 'Authorized by a signed letter'],
  ['delegated', 'Staff member delegated by management']
];
export const DOCS = [
  ['registration', 'Registration certificate or licence', 'Proves the institution legally exists.', true],
  ['authorization', 'Representative authorization letter', 'Shows you may act for the institution. Not needed if you lead it.', false],
  ['other', 'Other supporting documents', 'Profile, annual report, past activities.', false]
];
export const DECLARATION = 'I confirm the information is accurate and that I am authorized to represent this institution on DeepSprout.';

/** Grouped field inventory: [key, label, kind, required, hint]. */
export const SECTIONS = [
  ['identity', 'The institution', 'Who you are, legally and publicly.', [
    ['entityName', 'Official institution name', 'text', true],
    ['institutionType', 'Institution type', 'select:TYPES', true],
    ['sector', 'Sector', 'select:SECTORS', true],
    ['parentBody', 'Affiliated to (optional)', 'text', false, 'Ministry, university, municipality or network'],
    ['founded', 'Year founded', 'year', true],
    ['registrationNumber', 'Registration or licence number', 'text', true],
    ['issuingAuthority', 'Issued by', 'text', true, 'e.g. Ministry of Social Development']
  ]],
  ['purpose', 'Purpose and audience', 'What you want to run on DeepSprout and for whom.', [
    ['description', 'What you want to do on DeepSprout', 'area', true],
    ['goals', 'The change you hope to see', 'area', false],
    ['audienceAges', 'Who you serve', 'ages', true],
    ['size', 'How many people you reach', 'text', false, 'e.g. About 450 students'],
    ['areasServed', 'Areas you serve', 'text', false, 'Cities or neighbourhoods']
  ]],
  ['contact', 'Location and contact', 'Official channels we can use to confirm the institution.', [
    ['country', 'Country', 'text', true],
    ['governorate', 'Governorate', 'text', true],
    ['city', 'City', 'text', true],
    ['address', 'Street address (optional)', 'text', false],
    ['officialEmail', 'Official email', 'email', true],
    ['phone', 'Official phone', 'tel', true],
    ['website', 'Website (optional)', 'text', false],
    ['social', 'Social media page (optional)', 'text', false]
  ]],
  ['representative', 'You, the representative', 'The person who will manage the institution workspace.', [
    ['representative', 'Your full name', 'text', true],
    ['position', 'Your position', 'text', true],
    ['repPhone', 'Your direct phone', 'tel', true],
    ['authority', 'Your authority to represent it', 'select:AUTHORITY', true]
  ]]
];
export const FIELDS = SECTIONS.flatMap(([, , , f]) => f);
const LISTS = {TYPES, SECTORS, AUTHORITY};
export const labelOf = key => FIELDS.find(f => f[0] === key)?.[1].replace(/ \(optional\)$/, '') || key;
export const authorityLabel = v => AUTHORITY.find(([k]) => k === v)?.[1] || v || '';
export const ages = v => (Array.isArray(v) ? v : String(v || '').split(/\s*,\s*/)).filter(Boolean);

/* ------------------------------------------------------------ form */

function input([key, label, kind, required, hint], value, person) {
  const v = value ?? (key === 'representative' ? person?.name : key === 'country' ? 'Jordan' : '') ?? '';
  const help = hint ? `<small class="app-hint">${e(hint)}</small>` : '';
  if (kind === 'area') return `<div class="app-wide">${u.area(key, label, v, required)}${help}</div>`;
  if (kind === 'ages') {
    const chosen = ages(v);
    return `<fieldset class="app-wide app-chips" data-required-group="${key}"><legend>${e(label)}${required ? ' <span class="required">*</span>' : ''}</legend><div>${AGES.map(a => `<label><input type="checkbox" name="${key}" value="${e(a)}" ${chosen.includes(a) ? 'checked' : ''}><span>${e(a)}</span></label>`).join('')}</div><p class="app-group-error" role="alert" hidden>Choose at least one group.</p></fieldset>`;
  }
  if (kind.startsWith('select:')) {
    const list = LISTS[kind.slice(7)].map(o => (Array.isArray(o) ? o : [o, o]));
    if (v && !list.some(([k]) => k === v)) list.push([v, v]);
    const field = u.select(key, label, [['', 'Choose…'], ...list], v, required).replace('</span>', `${required ? ' <span class="required">*</span>' : ''}</span>`);
    return `<div class="${key === 'authority' ? 'app-wide' : ''}">${field}${help}</div>`;
  }
  const extra = kind === 'year' ? `inputmode="numeric" min="1900" max="${YEAR}"` : kind === 'email' ? 'autocomplete="email"' : kind === 'tel' ? 'autocomplete="tel"' : '';
  return `<div class="${key === 'entityName' ? 'app-wide' : ''}">${u.field(key, label, v, kind === 'year' ? 'number' : kind, required, extra)}${help}</div>`;
}

export function formMarkup(existing, person) {
  const d = existing?.details || {}, kinds = existing?.fileKinds || {};
  const kept = slot => (existing?.files || []).filter(f => (kinds[f] || 'other') === slot);
  const sections = SECTIONS.map(([id, title, lead, fields], n) => `<section class="app-section" aria-labelledby="app-${id}"><header><span class="app-step">${n + 1}</span><div><h2 id="app-${id}">${e(title)}</h2><p>${e(lead)}</p></div></header><div class="form-grid">${fields.map(f => input(f, d[f[0]], person)).join('')}</div></section>`).join('');
  const docs = `<section class="app-section" aria-labelledby="app-docs"><header><span class="app-step">${SECTIONS.length + 1}</span><div><h2 id="app-docs">Supporting documents</h2><p>They help the DeepSprout team verify the institution faster. PDF or image.</p></div></header><div class="app-docs">${DOCS.map(([slot, label, hint, req]) => `<label class="app-doc"><span class="app-doc-text"><strong>${e(label)}${req ? ' <em>Recommended</em>' : ''}</strong><small>${e(hint)}</small>${kept(slot).length ? `<small class="app-doc-kept">Attached: ${e(kept(slot).join(', '))}</small>` : ''}</span><input type="file" name="doc-${slot}" ${slot === 'other' ? 'multiple' : ''} accept=".pdf,.png,.jpg,.jpeg"></label>`).join('')}</div><p class="static-info">Files remain on this device. Only selected names appear in your application; no file content is uploaded.</p></section>`;
  return sections + docs;
}

/** Reads the form into {details, files, fileKinds}, keeping earlier files for slots left empty. */
export function collect(form, previous) {
  const data = new FormData(form), details = {};
  for (const [key, , kind] of FIELDS) details[key] = kind === 'ages' ? data.getAll(key) : String(data.get(key) || '').trim();
  const files = [], fileKinds = {};
  for (const [slot] of DOCS) {
    const picked = Array.from(form.elements[`doc-${slot}`]?.files || []).map(f => f.name);
    const names = picked.length ? picked : (previous?.files || []).filter(f => (previous.fileKinds?.[f] || 'other') === slot);
    for (const name of names) { files.push(name); fileKinds[name] = slot; }
  }
  return {details, files, fileKinds};
}

/** Checkbox groups have no native `required`; report them like other fields. */
export function groupsValid(form) {
  let ok = true;
  for (const set of form.querySelectorAll('[data-required-group]')) {
    const any = set.querySelector('input:checked'), msg = set.querySelector('.app-group-error');
    if (msg) msg.hidden = !!any;
    set.classList.toggle('is-invalid', !any);
    if (!any && ok) { set.querySelector('input')?.focus(); ok = false; }
  }
  return ok;
}

/** Applicant's review step: the same groups, read-only. */
export function reviewMarkup(a) {
  const d = a.details || {}, kinds = a.fileKinds || {};
  const value = ([key, , kind]) => kind === 'ages' ? ages(d[key]).join(', ') : key === 'authority' ? authorityLabel(d[key]) : d[key];
  return SECTIONS.map(([, title, , fields]) => `<h3 class="app-review-head">${e(title)}</h3><dl class="preview-facts">${fields.map(f => `<div><dt>${e(labelOf(f[0]))}</dt><dd>${e(value(f) || '—')}</dd></div>`).join('')}</dl>`).join('')
    + `<h3 class="app-review-head">Supporting documents</h3><dl class="preview-facts">${DOCS.map(([slot, label]) => `<div><dt>${e(label)}</dt><dd>${e((a.files || []).filter(f => (kinds[f] || 'other') === slot).join(', ') || 'Not attached')}</dd></div>`).join('')}</dl>`;
}

/* ------------------------------------------------------------ admin signals */

const domainOf = v => String(v || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];

/**
 * Readiness signals for the Admin. They only say what was provided; the Admin
 * still verifies the documents and the representative's authority personally.
 */
export function readiness(a, rep) {
  const d = a.details || {}, kinds = a.fileKinds || {}, files = a.files || [];
  const has = slot => files.some(f => kinds[f] === slot);
  // Older records have no slots: a file whose name looks like a registration proof still counts.
  const registrationDoc = has('registration') || (!a.fileKinds && files.some(f => /regist|licen|certif/i.test(f)));
  const authorityDoc = has('authorization') || (!a.fileKinds && files.some(f => /letter|author|board/i.test(f)));
  const email = domainOf(String(d.officialEmail || a.email || '').split('@')[1]), site = domainOf(d.website);
  return [
    ['Registration number given', !!d.registrationNumber, d.registrationNumber ? `${d.registrationNumber}${d.issuingAuthority ? ` · ${d.issuingAuthority}` : ''}` : 'Not provided'],
    ['Registration document attached', registrationDoc, registrationDoc ? 'Open it and compare the name and number' : 'Not attached'],
    ['Representative authority shown', d.authority === 'head' || authorityDoc, d.authority === 'head' ? 'Says they lead the institution' : authorityDoc ? 'Authorization document attached' : d.authority ? `${authorityLabel(d.authority)} — no letter attached` : 'Not stated'],
    ['Representative email verified', !!rep?.verified, rep?.verified ? rep.email : 'Not verified yet'],
    ['Official email matches website', !!(email && site && (email === site || email.endsWith(`.${site}`))), !site ? 'No website given' : email ? `@${email} · ${site}` : 'No official email'],
    ['Accuracy declaration signed', !!a.declaration, a.declaration ? `Signed ${u.date(a.declaration.at)}` : 'Not signed']
  ];
}

/** Suggested text for "Ask for more information": every missing signal, in plain words. */
export function missingAsk(a, rep) {
  const ask = {
    'Registration number given': 'your registration or licence number and the authority that issued it',
    'Registration document attached': 'a copy of your registration certificate or licence',
    'Representative authority shown': 'a letter showing you are authorized to represent the institution',
    'Official email matches website': 'confirmation of an official email on your institution’s domain, if you have one'
  };
  const items = readiness(a, rep).filter(([k, ok]) => !ok && ask[k]).map(([k]) => ask[k]);
  return items.length ? `To complete our review, please send ${items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : items[0]}.` : '';
}
