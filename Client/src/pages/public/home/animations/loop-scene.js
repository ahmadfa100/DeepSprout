/* A small projected ribbon: SVG surface + HTML feed fragments, no WebGL dependency.
   The very same curve unfolds into the path, keeping the visual metaphor continuous. */
(() => {
  const TAU = Math.PI * 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = v => Math.max(0, Math.min(1, v));
  const smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
  const NS = 'http://www.w3.org/2000/svg';

  window.DeepSproutLoop = class {
    constructor(stage, mobile, economical) {
      this.stage = stage;
      this.mobile = mobile;
      this.svg = stage.querySelector('.feed-ribbon');
      this.group = stage.querySelector('.ribbon-segments');
      this.container = stage.querySelector('.feed-fragments');
      this.segmentCount = economical ? 44 : 72;
      this.segments = Array.from({ length: this.segmentCount }, (_, i) => {
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('stroke-width', '.6');
        return { path, t: i / this.segmentCount * TAU };
      }).sort((a, b) => Math.cos(a.t) - Math.cos(b.t));
      this.segments.forEach(({ path }) => this.group.append(path));
      const symbols = ['▷', '♡', '↗', '◌', '▷', '↑', '♡', '▷', '◌', '↑', '▷', '+'];
      const captions = ['0:08', '2.4k', 'NEXT', '18 replies', '0:15', 'swipe', '+99', '0:06', '12 new', 'next', '0:12', '+99'];
      this.cards = Array.from({ length: mobile ? 8 : economical ? 10 : 12 }, (_, i) => {
        const el = document.createElement('div');
        el.className = `feed-fragment${i % 3 === 1 ? ' is-chip' : ''}${i % 4 === 1 ? ' is-petal' : ''}`;
        el.innerHTML = `<small>JUST ONE MORE</small><span class="fragment-symbol">${symbols[i]}</span><span class="fragment-lines"></span><span class="fragment-foot"><span>${captions[i]}</span><span>···</span></span><span class="fragment-leaf"></span>`;
        this.container.append(el);
        return { el, leaf:el.querySelector('.fragment-leaf'), contents:[...el.children].filter(x => !x.classList.contains('fragment-leaf')), i };
      });
      this.resize();
    }
    resize() {
      this.width = this.stage.clientWidth;
      this.height = this.stage.clientHeight;
      this.cx = this.width * (this.mobile ? .52 : .68);
      this.cy = this.height * (this.mobile ? .67 : .53);
      this.rx = this.width * (this.mobile ? .35 : .255);
      this.ry = this.height * (this.mobile ? .13 : .22);
      this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
      this.cards.forEach(card => { card.w = card.el.offsetWidth; card.h = card.el.offsetHeight; });
    }
    point(t, opening, phase) {
      // Lemniscate projection. Front and rear passes have separate depth and light.
      const depth = Math.cos(t);
      const perspective = 1 + depth * .13;
      const tilt = Math.sin(phase * .2) * .055 - .13;
      const x = Math.sin(t) * this.rx;
      const y = Math.sin(2 * t) * this.ry;
      return {
        x:lerp(this.cx + (x * Math.cos(tilt) - y * Math.sin(tilt)) * perspective, this.width * .13 + t / TAU * this.width * .76, opening),
        y:lerp(this.cy + (y * Math.cos(tilt) + x * Math.sin(tilt)) * perspective, this.height * .75 - Math.sin(t * .75) * this.height * .13, opening),
        z:depth, scale:perspective
      };
    }
    render({ progress, phase, speed, calm, release, descent, time }) {
      const assemble = smooth((progress - .25) / .25);
      const opening = smooth((release - .15) / .7);
      const ribbonAlpha = assemble * (1 - smooth((descent - .05) / .5));
      this.svg.style.opacity = ribbonAlpha;
      if (ribbonAlpha > .002) {
        for (const { path, t } of this.segments) {
          const a = this.point(t, opening, phase);
          const b = this.point(t + TAU / this.segmentCount + .004, opening, phase);
          const band = (this.mobile ? 13 : 23) * (1 - opening * .55);
          const twistA = .5 + .5 * Math.sin(t + .6);
          const twistB = .5 + .5 * Math.sin(t + TAU / this.segmentCount + .6);
          const wa = band * (.55 + twistA * .65) * a.scale;
          const wb = band * (.55 + twistB * .65) * b.scale;
          path.setAttribute('d', `M${a.x},${a.y-wa}L${b.x},${b.y-wb}L${b.x},${b.y+wb}L${a.x},${a.y+wa}Z`);
          const light = 74 + a.z * 10 + twistA * 6 + opening * 5;
          const color = `hsl(${lerp(83, 68, opening)} 22% ${light}%)`;
          path.setAttribute('fill', color);
          path.setAttribute('stroke', color);
        }
      }
      for (const card of this.cards) {
        const i = card.i;
        const appear = smooth((progress - .11 - i * .019) / .065);
        const t = ((i / this.cards.length * TAU + phase) % TAU + TAU) % TAU;
        const loop = this.point(t, opening, phase);
        const scatterX = this.cx + Math.sin(i * 2.39) * this.rx * (1.05 + speed * .09);
        const scatterY = this.cy + Math.cos(i * 1.91) * this.ry * 1.6;
        const jitter = speed * (1 - calm) * (this.mobile ? 4 : 10);
        let x = lerp(scatterX, loop.x, assemble) + Math.sin(time * (3 + i % 3) + i) * jitter;
        let y = lerp(scatterY, loop.y, assemble) + Math.cos(time * (4 + i % 2) + i) * jitter;
        let rotation = lerp(Math.sin(i * 6) * 18, Math.sin(t * 2) * 15 - 8, assemble) + Math.sin(time * 7 + i) * jitter * .7;
        const leafAmount = smooth((release - i * .025) / .34);
        const drift = smooth((release - .28) / .72);
        // The first video frame folds into the seed; other interruptions become leaves/petals.
        if (i === 0) {
          x = lerp(x, this.width * .5, leafAmount);
          y = lerp(y, this.height * .47, leafAmount);
        } else {
          y += drift * (this.height * .3 + Math.sin(i) * 30);
          x += Math.sin(i * 1.7) * drift * 70;
          rotation += drift * Math.sin(i) * 50;
        }
        const alpha = appear * (1 - smooth((descent - .03) / .35)) * (i === 0 ? 1 - leafAmount : 1 - drift * .85);
        const scale = loop.scale * (i === 0 ? 1 - leafAmount * .8 : 1 - leafAmount * .23);
        card.el.style.opacity = alpha;
        card.el.style.transform = `translate3d(${x-card.w/2}px,${y-card.h/2}px,0) rotate(${rotation}deg) scale(${scale})`;
        card.el.style.zIndex = Math.round((loop.z + 1) * 10);
        card.el.style.backgroundColor = leafAmount > .5 ? 'transparent' : '';
        card.el.style.borderColor = leafAmount > .5 ? 'transparent' : '';
        card.el.style.boxShadow = leafAmount > .5 ? 'none' : '';
        card.contents.forEach(el => { el.style.opacity = 1 - leafAmount; });
        card.leaf.style.opacity = i === 0 ? 0 : leafAmount;
      }
    }
    destroy() { this.group.replaceChildren(); this.container.replaceChildren(); }
  };
})();
