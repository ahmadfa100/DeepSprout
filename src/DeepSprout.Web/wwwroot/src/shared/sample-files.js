/**
 * Sample files for demo task records (`ref.sample === true`).
 *
 * Demo assignments and submissions are seeded without real uploads, so their
 * files are generated on demand: a small one-page PDF for documents and an
 * illustrated SVG for images. Nothing here is stored; opening a sample twice
 * builds the same file twice.
 */

const pdfText = value => String(value).replace(/[^\x20-\x7E]/g, ' ').replace(/([\\()])/g, '\\$1');

/** Wrap a paragraph to roughly `width` characters per line. */
function wrap(text, width = 78) {
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      if ((line + ' ' + word).trim().length > width) { lines.push(line.trim()); line = word; } else line += ` ${word}`;
    }
    lines.push(line.trim());
  }
  return lines;
}

/** A valid single-page PDF with a title and wrapped body text. */
export function samplePdf(title, body) {
  const lines = wrap(body);
  const stream = [
    'BT', '/F2 20 Tf', '0.09 0.24 0.21 rg', '64 770 Td', `(${pdfText(title)}) Tj`, 'ET',
    '0.18 0.42 0.29 RG', '2 w', '64 752 m 531 752 l S',
    'BT', '/F1 11.5 Tf', '0.17 0.29 0.25 rg', '64 724 Td', '17 TL',
    ...lines.map(l => `(${pdfText(l)}) '`), 'ET',
    'BT', '/F1 9 Tf', '0.45 0.5 0.47 rg', '64 48 Td', '(DeepSprout demo file - generated in this browser.) Tj', 'ET'
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  ];
  let out = '%PDF-1.4\n';
  const offsets = objects.map((obj, i) => { const at = out.length; out += `${i + 1} 0 obj\n${obj}\nendobj\n`; return at; });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([out], {type:'application/pdf'});
}

/** A calm illustrated image (SVG) with a caption. */
export function sampleImage(caption, hue = 140) {
  const esc = v => String(v).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 45% 94%)"/><stop offset="1" stop-color="hsl(${hue + 20} 40% 86%)"/></linearGradient>
  <linearGradient id="hill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 32% 52%)"/><stop offset="1" stop-color="hsl(${hue} 38% 34%)"/></linearGradient></defs>
  <rect width="1200" height="800" fill="url(#sky)"/>
  <circle cx="930" cy="190" r="70" fill="hsl(42 90% 70%)" opacity=".85"/>
  <path d="M0 560 C 240 470 420 520 620 480 S 980 420 1200 500 V800 H0Z" fill="hsl(${hue} 28% 70%)"/>
  <path d="M0 640 C 260 560 520 640 760 590 S 1060 560 1200 610 V800 H0Z" fill="url(#hill)"/>
  <g fill="hsl(${hue} 40% 26%)"><path d="M300 600 l26 -90 26 90z"/><rect x="322" y="598" width="8" height="26"/><path d="M380 610 l20 -70 20 70z"/><rect x="396" y="608" width="7" height="20"/></g>
  <rect x="60" y="690" width="${Math.min(1080, 40 + caption.length * 17)}" height="64" rx="18" fill="#fffef9" opacity=".92"/>
  <text x="88" y="732" font-family="DM Sans, Segoe UI, sans-serif" font-size="28" fill="#173e35">${esc(caption)}</text>
</svg>`;
  return new Blob([svg], {type:'image/svg+xml'});
}

/** Build the stored-file shape `attachments.read()` returns, for a sample reference. */
export function sampleFile(ref) {
  const isImage = /\.(png|jpe?g|webp|svg)$/i.test(ref.name) || String(ref.type).startsWith('image/');
  const title = ref.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ');
  const blob = isImage ? sampleImage(ref.caption || title, ref.hue ?? 140) : samplePdf(title, ref.body || 'A sample document for this demo task.');
  return {id:ref.id, blob, name:ref.name, type:blob.type, size:blob.size, sample:true};
}
