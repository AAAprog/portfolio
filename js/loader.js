// Branded loader with a liquid-glass lens.
// "Ahmed Bawazir." sits on the page; a glass lens glides across it and shows
// "أحمد باوزير" through the glass. When the page is ready the lens swells to
// fill the screen (the Arabic name takes over), then the curtain lifts.
// Tracks real readiness (fonts + load), skippable, shown on every visit.
import { roll } from './roll.js';
import { createGlass, wordmark } from './glass.js';
import { AR, svgFor, write } from './signmark.js';

const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const out3 = t => 1 - Math.pow(1 - t, 3);

export function initLoader() {
  const root = document.documentElement;
  const el = document.querySelector('.loader');
  if (!el || !root.classList.contains('is-loading')) {
    el && el.remove();
    document.dispatchEvent(new Event('loader:done'));
    return Promise.resolve();
  }
  const pct = el.querySelector('.loader-pct');
  const bar = el.querySelector('.loader-bar i');
  const canvas = el.querySelector('.loader-glass');
  roll(pct, '000', true);

  const accent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#ff6a2f';
  let fs = 100;
  const arBox = (w, h) => { const bw = Math.min(w * 0.82, h * 0.42 * AR.w / AR.h, 760); return { w: bw, h: bw * AR.h / AR.w }; };
  // Once the lens fills the screen, the signature writes itself in (stroke, then fill).
  const sig = svgFor(AR, 'أحمد باوزير', 'sig-ar loader-sig');
  sig.svg.style.visibility = 'hidden';
  el.append(sig.svg);
  const reduceM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const glass = createGlass(canvas, {
    tint: [1, 1, 1], glass: 0.07,
    drawBase: (c, w, h) => { fs = Math.min(w * 0.115, h * 0.2); wordmark(c, w, h, { text: 'Ahmed Bawazir', size: fs, weight: 600, family: '"Space Grotesk"', color: '#f1efe9', accent, dot: true }); },
    // Through the glass: the Ruqaa signature, the same outline the footer signature writes.
    drawReveal: (c, w, h) => {
      c.clearRect(0, 0, w, h);
      const k = arBox(w, h).w / AR.w;
      c.save(); c.translate((w - AR.w * k) / 2, (h - AR.h * k) / 2); c.scale(k, k);
      c.fillStyle = '#ffffff'; c.fill(new Path2D(AR.d)); c.restore();
    },
  });

  const MIN = 1700, MAX = 4000, t0 = performance.now();
  let target = 0.15, shown = 0, finished = false, raf, expandStart = 0, writing = false;
  const fontsReady = (document.fonts ? Promise.all([
    document.fonts.load('600 80px "Space Grotesk"'),
    document.fonts.load('700 80px "IBM Plex Sans Arabic"', 'أحمد'),
  ]) : Promise.resolve()).catch(() => {});
  const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise(r => addEventListener('load', r, { once: true }));
  fontsReady.then(() => { target = Math.max(target, 0.6); glass.layout(); });
  loaded.then(() => { target = Math.max(target, 0.85); });
  glass.layout();
  const onResize = () => glass.layout();
  addEventListener('resize', onResize);

  return new Promise(resolve => {
    const finish = () => {
      el.classList.add('out');
      root.classList.add('loader-out');
      setTimeout(() => {
        cancelAnimationFrame(raf);
        removeEventListener('resize', onResize);
        root.classList.remove('is-loading', 'loader-out');
        root.classList.add('no-loader');
        document.dispatchEvent(new Event('loader:done'));
        el.remove();
        resolve();
      }, 850);
    };
    const done = () => {
      if (finished) return;
      finished = true;
      roll(pct, '100');
      bar.style.transform = 'scaleX(1)';
      expandStart = performance.now();
      el.classList.add('expanding');
      // The glass fades away and the signature writes itself on black, once.
      const b = arBox(canvas.clientWidth, canvas.clientHeight);
      Object.assign(sig.svg.style, { width: b.w + 'px', height: b.h + 'px' });
      writing = true;
      if (reduceM) setTimeout(finish, 400);
      else setTimeout(() => write(sig, 1900).then(() => setTimeout(finish, 450)), 250);
    };

    const tick = now => {
      const t = now - t0;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const R = fs * 0.78;
      // Glide in from the left and rest over the name, breathing slightly.
      const g = ease(Math.min(1, t / 1500));
      let x = -R + (w / 2 + R) * g + Math.sin(t / 520) * fs * 0.06 * g;
      let y = h / 2 + Math.sin(t / 380) * fs * 0.05;
      let r = R;
      if (expandStart) {
        const e = out3(Math.min(1, (now - expandStart) / 650));
        x += (w / 2 - x) * e; y += (h / 2 - y) * e;
        // the lens stays its size and fades with the glass (no giant magnified name)
      }
      glass.setGlass(expandStart ? 0.07 * (1 - Math.min(1, (now - expandStart) / 500)) : 0.07); // no grey film when full-screen
      glass.setLens(x, y, r);

      if (!finished) {
        const floor = Math.min(0.9, (t / MIN) * 0.9);
        shown += (Math.max(target, floor) - shown) * 0.08;
        roll(pct, String(Math.min(99, Math.round(shown * 100))).padStart(3, '0'));
        bar.style.transform = `scaleX(${shown.toFixed(3)})`;
        if (t > MAX) done();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    Promise.all([fontsReady, loaded]).then(() => {
      const wait = Math.max(0, MIN - (performance.now() - t0));
      setTimeout(() => { target = 1; setTimeout(done, 150); }, wait);
    });
    const onKey = e => { if (['Escape', 'Enter', ' '].includes(e.key)) { removeEventListener('keydown', onKey); done(); } };
    el.addEventListener('click', done);
    addEventListener('keydown', onKey);
  });
}
