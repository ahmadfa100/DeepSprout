/**
 * My Garden — grown only from what the user actually logged.
 *
 * One isometric plot per week of the plan. Each practice or offline-routine
 * day recorded in that week moves its plot up a growth stage. Four rewards
 * unlock on plain, visible rules. There is no XP and nothing to buy: the
 * garden is a picture of the record, not a score.
 */
(() => {
  const DS = window.DeepSprout;
  const Art = window.GardenArt;
  if (!DS || !Art) return;

  const $ = id => document.getElementById(id);
  const reducedMotion = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const readStored = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };
  const writeStored = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* The garden still renders without storage. */ }
  };

  const STAGES = [
    { name: 'Seed', from: 0 },
    { name: 'Sprout', from: 1 },
    { name: 'Sapling', from: 2 },
    { name: 'Tree', from: 4 },
    { name: 'Blossom', from: 6 }
  ];
  const stageFor = count => STAGES.reduce((stage, entry, index) => (count >= entry.from ? index : stage), 0);

  const state = DS.get();
  const stats = DS.stats();
  const plan = stats.hasPlan ? state.plan : null;

  /* ------------------------------------------------------------ the plots */

  const plots = plan
    ? stats.perWeek.map(entry => ({
      key: `week-${entry.week}`,
      label: `Week ${entry.week}`,
      title: plan.direction?.[entry.week - 1]?.title || `Week ${entry.week}`,
      count: entry.practices + entry.routine,
      practices: entry.practices,
      routine: entry.routine,
      reached: entry.week <= stats.week,
      current: entry.week === stats.week,
      opens: DS.formatDate(DS.addDays(new Date(`${plan.startDate}T12:00:00`), (entry.week - 1) * 7))
    }))
    : [{
      key: 'first', label: 'Your first plot', title: 'Your first plot',
      count: stats.totalPractices + stats.totalRoutineDays,
      practices: stats.totalPractices, routine: stats.totalRoutineDays, reached: true, current: true
    }];

  /* --------------------------------------------------------- the rewards */

  const activeDays = new Set([
    ...state.activityLog.map(entry => DS.dayKey(entry.at)),
    ...state.routine.flatMap(item => Object.entries(item.log || {}).filter(([, status]) => status === 'done').map(([key]) => key))
  ]);
  const REWARDS = {
    flower: { label: 'New Flower', rule: 'Log 3 practices', have: stats.totalPractices, need: 3, gives: 'Wildflowers spread across every plot you have grown.', glyph: '✿' },
    bloom: { label: 'Special Bloom', rule: 'Finish your first weekly review', have: stats.reviewsDone, need: 1, gives: 'A golden bloom grows on the plot of the week you reviewed.', glyph: '❀' },
    decor: { label: 'Garden Decor', rule: 'Tick your offline routine on 5 days', have: stats.totalRoutineDays, need: 5, gives: 'A lantern and a stepping-stone path appear by your plots.', glyph: '⌂' },
    effect: { label: 'Visual Effect', rule: 'Record something on 5 different days', have: activeDays.size, need: 5, gives: 'Petals drift through the garden and fireflies come out.', glyph: '✦' }
  };
  Object.values(REWARDS).forEach(reward => { reward.unlocked = reward.have >= reward.need; });

  /* ------------------------------------------------------------ the scene */

  const svg = $('garden-svg');
  const VIEW_W = 900;
  const positions = (() => {
    const step = Art.TILE_W / 2;
    const count = plots.length;
    const width = (count - 1) * step + Art.TILE_W;
    const startX = (VIEW_W - width) / 2 + Art.TILE_W / 2;
    // A zigzag row: each plot shares an edge with the one before it.
    return plots.map((_, index) => ({ x: startX + index * step, y: 250 + (index % 2) * (Art.TILE_H / 2) }));
  })();

  function drawScene() {
    // Back plots first so the lower (nearer) ones overlap them correctly.
    // Unstarted weeks are flat outlines, so they sit underneath everything.
    const order = plots.map((plot, index) => index)
      .sort((a, b) => (plots[a].reached - plots[b].reached) || positions[a].y - positions[b].y || a - b);
    let markup = Art.defs;
    order.forEach((index, drawIndex) => {
      const plot = plots[index];
      const { x, y } = positions[index];
      if (!plot.reached) {
        markup += `<g class="g-plot is-ghost" data-plot="${index}" tabindex="0" role="button" aria-label="${plot.label}, opens ${plot.opens}" style="--i:${drawIndex}">${Art.ghostTile(x, y, plot.label)}</g>`;
        return;
      }
      const stage = stageFor(plot.count);
      let extras = '';
      if (REWARDS.flower.unlocked && stage > 0) extras += Art.flowerBed(x, y, index + 1);
      if (REWARDS.bloom.unlocked && state.reviews.some(review => review.week === index + 1)) extras += Art.goldenBloom(x - 52, y + 18);
      markup += `<g class="g-plot${plot.current ? ' is-current' : ''}" data-plot="${index}" tabindex="0" role="button" aria-label="${plot.label}: ${STAGES[stage].name}, ${plot.count} logged" style="--i:${drawIndex}">
        <g class="g-drop">${Art.tile(x, y, index + 1)}${extras}<g class="g-sway" style="transform-origin:${x}px ${y + 4}px">${Art.plant(stage, x, y + 4, index + 1)}</g></g>
        ${plot.current ? `<g class="g-marker"><path d="M${x},${y - [30, 66, 98, 140, 150][stage]} l-7,-12 h14Z" fill="#168557"/></g>` : ''}
      </g>`;
    });
    if (REWARDS.decor.unlocked) {
      const first = positions[0];
      markup += Art.decor(first.x - 150, first.y + 30);
    }
    svg.insertAdjacentHTML('beforeend', markup);
    // On narrow screens, frame just the plots so the garden stays large.
    if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 900px)').matches) {
      const left = positions[0].x - Art.TILE_W / 2 - (REWARDS.decor.unlocked ? 110 : 20);
      const right = positions[positions.length - 1].x + Art.TILE_W / 2 + 20;
      svg.setAttribute('viewBox', `${left} 70 ${right - left} 330`);
    }
    svg.querySelectorAll('.g-plot').forEach(node => {
      const open = () => select({ type: 'plot', index: Number(node.dataset.plot) });
      node.addEventListener('click', open);
      node.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
    });
    if (REWARDS.effect.unlocked && !reducedMotion) drawEffects();
  }

  function drawEffects() {
    const host = $('garden-effects');
    const pieces = [];
    for (let index = 0; index < 14; index += 1) {
      pieces.push(`<span class="petal" style="--x:${(index * 7.3 + 4) % 100}%;--d:${(index * .9) % 9}s;--t:${8 + (index % 5)}s"></span>`);
    }
    for (let index = 0; index < 10; index += 1) {
      pieces.push(`<span class="firefly" style="--x:${18 + (index * 13) % 66}%;--y:${30 + (index * 17) % 50}%;--d:${(index * .7) % 4}s"></span>`);
    }
    host.innerHTML = pieces.join('');
  }

  /* ----------------------------------------------------------- rewards UI */

  const seen = readStored('deepsprout-garden-seen', []);
  const fresh = [];
  document.querySelectorAll('[data-reward]').forEach(button => {
    const key = button.dataset.reward;
    const reward = REWARDS[key];
    button.classList.toggle('is-unlocked', reward.unlocked);
    button.querySelector('.reward-icon').textContent = reward.glyph;
    button.setAttribute('aria-label', reward.unlocked
      ? `${reward.label}, unlocked`
      : `${reward.label}, locked: ${reward.rule} (${Math.min(reward.have, reward.need)} of ${reward.need})`);
    if (!reward.unlocked) {
      button.style.setProperty('--progress', Math.min(1, reward.have / reward.need));
    }
    if (reward.unlocked && !seen.includes(key)) {
      fresh.push(key);
      button.classList.add('is-new');
    }
    button.addEventListener('click', () => select({ type: 'reward', key }));
  });
  if (fresh.length) {
    writeStored('deepsprout-garden-seen', [...seen, ...fresh]);
    const toast = $('garden-toast');
    const names = fresh.map(key => REWARDS[key].label);
    toast.textContent = `Unlocked: ${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]}`;
    toast.hidden = false;
    setTimeout(() => { toast.hidden = true; }, 5200);
  }

  /* --------------------------------------------------------------- detail */

  const detail = $('garden-detail');
  function select(target) {
    svg.querySelectorAll('.g-plot').forEach(node => node.classList.toggle('is-selected', target.type === 'plot' && Number(node.dataset.plot) === target.index));
    document.querySelectorAll('[data-reward]').forEach(node => node.classList.toggle('is-selected', target.type === 'reward' && node.dataset.reward === target.key));
    let html;
    if (target.type === 'plot') {
      const plot = plots[target.index];
      if (!plot.reached) {
        html = `<span class="d-tag">${plot.label}</span><h2>${escape(plot.title)}</h2><p>This plot opens on ${plot.opens}. Anything you log that week grows it.</p>`;
      } else {
        const stage = stageFor(plot.count);
        const next = STAGES[stage + 1];
        const meter = next ? Math.min(1, (plot.count - STAGES[stage].from) / (next.from - STAGES[stage].from)) : 1;
        html = `<span class="d-tag${plot.current ? ' is-now' : ''}">${plot.label}${plot.current ? ' · this week' : ''}</span>
          <h2>${escape(plot.title)}</h2>
          <div class="d-stats"><span><strong>${plot.practices}</strong> practices</span><span><strong>${plot.routine}</strong> routine days</span><span><strong>${STAGES[stage].name}</strong> stage</span></div>
          <div class="d-meter"><i style="--m:${meter}"></i></div>
          <p>${next ? `${next.from - plot.count} more logged ${next.from - plot.count === 1 ? 'thing grows' : 'things grow'} it into a ${next.name.toLowerCase()}.` : 'Fully grown — in full blossom.'}${plot.current ? '' : ' This week is finished, so this plot keeps the shape it reached.'}</p>`;
      }
    } else {
      const reward = REWARDS[target.key];
      html = `<span class="d-tag${reward.unlocked ? ' is-now' : ''}">${reward.unlocked ? 'Unlocked' : 'Locked'}</span>
        <h2>${reward.label}</h2>
        <p><strong>${reward.rule}.</strong> ${reward.gives}</p>
        ${reward.unlocked ? '' : `<div class="d-meter"><i style="--m:${Math.min(1, reward.have / reward.need)}"></i></div><p class="d-small">${Math.min(reward.have, reward.need)} of ${reward.need} so far.</p>`}`;
    }
    detail.innerHTML = html;
    detail.classList.remove('is-entering');
    void detail.offsetWidth;
    detail.classList.add('is-entering');
  }
  const escape = value => String(value).replace(/[&<>"']/g, char => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  /* --------------------------------------------------------------- counts */

  $('count-practices').textContent = stats.totalPractices;
  $('count-routine').textContent = stats.totalRoutineDays;
  $('count-reviews').textContent = stats.reviewsDone;
  if (!plan) {
    $('garden-subtitle').textContent = stats.totalPractices + stats.totalRoutineDays
      ? 'Your first plot is growing. Once your plan starts, each week gets a plot of its own.'
      : 'Your first plot is ready. Log a practice or tick your offline routine to plant it.';
  } else {
    $('garden-subtitle').textContent = `Week ${stats.week} of 4 · one plot for each week of your plan.`;
  }

  drawScene();
  const currentIndex = Math.max(0, plots.findIndex(plot => plot.current));
  select({ type: 'plot', index: currentIndex });
  if (fresh.length) select({ type: 'reward', key: fresh[0] });
})();
