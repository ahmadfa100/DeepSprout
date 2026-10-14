// A small allowlist of published content regions. The landing page keeps its original markup.
(() => {
  let published;
  try { published = JSON.parse(localStorage.getItem('deepsprout-admin-demo-v1'))?.content?.published; }
  catch { return; }
  if (!published) return;
  const regions = {
    'landing.hero.lead': '[data-content-key="landing.hero.lead"]',
    'landing.features.intro': '.features .section-intro > p:last-child',
    'landing.feature.focus.title': '[data-feature="focus"] h3',
    'landing.feature.focus.image': '[data-feature="focus"] img'
  };
  for (const [key, selector] of Object.entries(regions)) {
    const node = document.querySelector(selector), value = published[key];
    if (!node || !value) continue;
    if (key.endsWith('.image')) {
      if (/^assets\/[a-z0-9/_ .-]+\.(png|jpe?g|webp|svg)$/i.test(value.image || '')) {
        node.src = `../../../../${value.image}`;
        node.alt = String(value.alt || '');
        node.parentElement?.setAttribute('aria-label', String(value.alt || 'DeepSprout illustration'));
        node.style.objectFit = ['cover','contain'].includes(value.fit) ? value.fit : 'cover';
        node.style.objectPosition = ['center','top','bottom','left','right'].includes(value.position) ? value.position : 'center';
      }
    } else {
      node.textContent = String(value.text || '');
      node.classList.add('published-content');
      if (value.color === 'pine') node.style.color = '#123f34';
      if (value.color === 'muted') node.style.color = '#637b70';
      if (value.align === 'center') node.style.textAlign = 'center';
      if (value.style === 'heading') node.style.fontWeight = '700';
      if (value.style === 'eyebrow') { node.style.fontSize = '.75rem'; node.style.letterSpacing = '.12em'; }
      if (value.size === 'small') node.style.fontSize = '.85em';
      if (value.size === 'large') node.style.fontSize = '1.15em';
      if (value.weight === 'medium') node.style.fontWeight = '600';
      if (value.weight === 'bold') node.style.fontWeight = '800';
    }
  }
})();
