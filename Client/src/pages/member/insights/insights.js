document.documentElement.classList.add('js');

const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .06, rootMargin: '0px 0px -20px 0px' });
  reveals.forEach(item => observer.observe(item));
} else {
  reveals.forEach(item => item.classList.add('visible'));
}

const metricMeta = {
  focus: { color: '#20a34c', name: 'Focus score' },
  scroll: { color: '#37a4ee', name: 'Scrolling time' },
  depth: { color: '#aa69ff', name: 'Depth score' },
  consistency: { color: '#f2b72e', name: 'Consistency' }
};
const periods = {
  week: {
    label: 'the last 7 days', dates: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    values: { focus: ['72', '↑ +12%'], scroll: ['1.9h', '↓ −9%'], depth: ['65', '↑ +10%'], consistency: ['82%', '↑ +6%'] },
    data: {
      focus: [58, 60, 59, 63, 62, 66, 72], scroll: [33, 31, 32, 27, 26, 23, 21],
      depth: [52, 54, 55, 54, 60, 62, 65], consistency: [72, 74, 73, 77, 78, 80, 82]
    }
  },
  month: {
    label: 'the last 30 days', dates: ['Jan 1', 'Jan 8', 'Jan 15', 'Jan 22', 'Jan 29'],
    values: { focus: ['68', '↑ +31%'], scroll: ['2.1h', '↓ −43%'], depth: ['61', '↑ +27%'], consistency: ['76%', '↑ +18%'] },
    data: {
      focus: [20, 22, 23, 26, 24, 25, 22, 20, 23, 20, 18, 23, 21, 26, 34, 43, 49, 50, 54, 61, 68],
      scroll: [47, 46, 44, 42, 42, 38, 35, 35, 33, 29, 26, 26, 24, 23, 20, 17, 13, 12, 11, 12, 15],
      depth: [34, 38, 40, 43, 45, 45, 48, 50, 46, 44, 47, 51, 54, 53, 57, 60, 59, 61, 66, 72, 84],
      consistency: [56, 58, 62, 70, 75, 74, 67, 58, 57, 60, 55, 54, 56, 62, 69, 72, 73, 75, 74, 77, 80]
    }
  },
  quarter: {
    label: 'the last 3 months', dates: ['Month 1', 'Week 3', 'Month 2', 'Week 9', 'Month 3'],
    values: { focus: ['75', '↑ +42%'], scroll: ['1.8h', '↓ −47%'], depth: ['70', '↑ +36%'], consistency: ['81%', '↑ +22%'] },
    data: {
      focus: [24, 25, 29, 31, 34, 36, 41, 42, 47, 50, 52, 53, 59, 62, 66, 68, 70, 72, 73, 74, 75],
      scroll: [60, 57, 54, 51, 52, 48, 45, 44, 42, 40, 37, 36, 33, 31, 29, 27, 26, 23, 21, 19, 18],
      depth: [25, 28, 30, 32, 35, 35, 40, 43, 43, 46, 49, 52, 54, 58, 59, 62, 63, 65, 67, 69, 70],
      consistency: [49, 53, 55, 58, 57, 59, 62, 64, 62, 65, 68, 67, 70, 72, 73, 75, 76, 77, 78, 80, 81]
    }
  },
  all: {
    label: 'all time', dates: ['Start', 'Step 1', 'Step 2', 'Step 3', 'Now'],
    values: { focus: ['80', '↑ +56%'], scroll: ['1.6h', '↓ −52%'], depth: ['74', '↑ +41%'], consistency: ['86%', '↑ +25%'] },
    data: {
      focus: [12, 16, 18, 22, 25, 30, 31, 35, 38, 43, 48, 51, 55, 59, 63, 65, 69, 72, 76, 78, 80],
      scroll: [74, 70, 67, 64, 61, 57, 54, 52, 48, 45, 42, 38, 36, 33, 31, 29, 26, 23, 21, 19, 16],
      depth: [17, 18, 23, 26, 28, 31, 35, 37, 39, 44, 47, 49, 52, 56, 59, 62, 64, 67, 69, 72, 74],
      consistency: [43, 46, 49, 51, 53, 57, 59, 62, 61, 65, 67, 70, 72, 74, 76, 78, 80, 82, 83, 85, 86]
    }
  }
};

let activePeriod = 'month';
let highlightedMetric = 'focus';
const visibleMetrics = { focus: true, scroll: true, depth: true, consistency: true };
const metricKeys = Object.keys(metricMeta);
const svgNS = 'http://www.w3.org/2000/svg';
const createSvg = (tag, attributes) => {
  const element = document.createElementNS(svgNS, tag);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
  return element;
};
const linePath = (values, width, height, inset = 0) => values.map((value, index) => {
  const x = inset + (index / (values.length - 1)) * (width - inset * 2);
  const y = height - (value / 100) * height;
  return `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
}).join(' ');
const areaPath = (values, width, height, inset = 0) => `${linePath(values, width, height, inset)} L${width - inset} ${height} L${inset} ${height} Z`;

const mainChart = document.getElementById('main-chart');
const renderChart = () => {
  mainChart.replaceChildren();
  const grid = createSvg('g', { stroke: '#e8eeea', 'stroke-width': '1' });
  [0, 25, 50, 75, 100].forEach(value => grid.append(createSvg('line', { x1: 0, y1: 170 - value * 1.7, x2: 480, y2: 170 - value * 1.7 })));
  mainChart.append(grid);
  [...metricKeys.filter(key => key !== highlightedMetric), highlightedMetric].forEach(key => {
    if (!visibleMetrics[key]) return;
    const values = periods[activePeriod].data[key];
    const isActive = key === highlightedMetric;
    if (isActive) mainChart.append(createSvg('path', { d: areaPath(values, 480, 170), fill: metricMeta[key].color, stroke: 'none', opacity: '.08' }));
    mainChart.append(createSvg('path', {
      d: linePath(values, 480, 170), class: 'chart-line', pathLength: 1, fill: 'none', stroke: metricMeta[key].color,
      'stroke-width': isActive ? 3 : 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      opacity: isActive ? 1 : .63
    }));
  });
  const names = metricKeys.filter(key => visibleMetrics[key]).map(key => metricMeta[key].name).join(', ');
  mainChart.setAttribute('aria-label', `Sample ${names || 'metric'} trends for ${periods[activePeriod].label}`);
};

const renderSparklines = () => {
  document.querySelectorAll('.metric-card').forEach(card => {
    const key = card.dataset.metric;
    const svg = card.querySelector('.sparkline');
    const values = periods[activePeriod].data[key];
    const color = metricMeta[key].color;
    svg.replaceChildren(
      createSvg('path', { d: areaPath(values, 280, 42), fill: color, stroke: 'none', opacity: '.11' }),
      createSvg('path', { d: linePath(values, 280, 42), class: 'chart-line', pathLength: 1, fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
    );
    card.querySelector('[data-value]').textContent = periods[activePeriod].values[key][0];
    card.querySelector('[data-change]').textContent = periods[activePeriod].values[key][1];
    svg.setAttribute('aria-label', `${metricMeta[key].name} trend for ${periods[activePeriod].label}`);
  });
};
const renderDates = () => periods[activePeriod].dates.forEach((date, index) => {
  document.getElementById(['date-first', 'date-second', 'date-third', 'date-fourth', 'date-fifth'][index]).textContent = date;
});
const renderAll = () => { renderSparklines(); renderChart(); renderDates(); };
renderAll();

document.querySelectorAll('[data-period]').forEach(button => button.addEventListener('click', () => {
  activePeriod = button.dataset.period;
  document.querySelectorAll('[data-period]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  renderAll();
}));
document.getElementById('highlight-metric').addEventListener('change', event => {
  highlightedMetric = event.target.value;
  visibleMetrics[highlightedMetric] = true;
  document.querySelector(`[data-series="${highlightedMetric}"]`).setAttribute('aria-pressed', 'true');
  renderChart();
});
document.querySelectorAll('[data-series]').forEach(button => button.addEventListener('click', () => {
  const key = button.dataset.series;
  if (visibleMetrics[key] && metricKeys.filter(metric => visibleMetrics[metric]).length === 1) return;
  visibleMetrics[key] = !visibleMetrics[key];
  button.setAttribute('aria-pressed', String(visibleMetrics[key]));
  if (!visibleMetrics[highlightedMetric]) {
    highlightedMetric = metricKeys.find(metric => visibleMetrics[metric]) || key;
    document.getElementById('highlight-metric').value = highlightedMetric;
  }
  renderChart();
}));

const metricsPanel = document.getElementById('metrics');
document.getElementById('latest-button').addEventListener('click', () => {
  metricsPanel.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  metricsPanel.classList.remove('is-highlighted');
  void metricsPanel.offsetWidth;
  metricsPanel.classList.add('is-highlighted');
});

const dialog = document.getElementById('insight-dialog');
const dialogEyebrow = document.getElementById('dialog-eyebrow');
const dialogTitle = document.getElementById('dialog-title');
const dialogDescription = document.getElementById('dialog-description');
const dialogAction = document.getElementById('dialog-action');
const showDialog = (eyebrow, title, description, action) => {
  dialogEyebrow.textContent = eyebrow;
  dialogTitle.textContent = title;
  dialogDescription.textContent = description;
  dialogAction.replaceChildren();
  if (action) {
    const link = document.createElement('a');
    link.className = 'button primary';
    link.href = action.href;
    link.textContent = action.label;
    dialogAction.append(link);
  }
  dialog.showModal();
};
document.getElementById('how-button').addEventListener('click', () => showDialog(
  'HOW IT WORKS', 'A clearer view of your habits',
  'These charts use sample data to demonstrate how DeepSprout can summarize focus, scrolling time, reading depth, and consistency. Choose a time range or metric to explore the patterns.',
  null
));
const insightDetails = {
  focus: ['Your focus is improving', 'Your focus score is trending upward. Keep giving your attention small stretches of uninterrupted time.', { href: '../training/training.html?session=depth', label: 'Try Depth Training →' }],
  scroll: ['Less time on short-form content', 'Your scrolling trend is moving downward. Notice which moments make it easier to leave the screen and keep those cues nearby.', { href: '../training/training.html?session=offline', label: 'Try an Offline Quest →' }],
  depth: ['Reading stamina is growing', 'Your depth score shows steadier practice. A slightly longer reading session is a good next step.', { href: '../training/training.html?session=depth', label: 'Start reading practice →' }],
  consistency: ['You’ve been consistent', 'Small actions repeated over time become a routine. Keep your next goal achievable and enjoy the momentum.', { href: '../recovery-plan/recovery-plan.html?setup=1', label: 'Review your plan →' }]
};
document.querySelectorAll('[data-insight]').forEach(button => button.addEventListener('click', () => {
  const [title, description, action] = insightDetails[button.dataset.insight];
  showDialog(`INSIGHT · ${periods[activePeriod].label.toUpperCase()}`, title, description, action);
}));
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
