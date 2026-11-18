// Branded loader with a liquid-glass lens.
// "Ahmed Bawazir." sits on the page; a glass lens glides across it and shows
// "أحمد باوزير" through the glass. When the page is ready the lens swells to
// fill the screen (the Arabic name takes over), then the curtain lifts.
// Tracks real readiness (fonts + load), skippable, shown on every visit.
import { roll } from './roll.js';
import { createGlass, wordmark } from './glass.js';
import { AR } from './signmark.js';

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
  // match the site: same light/dark colours, same font as the hero name
  const isDark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const INK = isDark ? '#f1efe9' : '#111111', BG = isDark ? [0, 0, 0] : [242 / 255, 241 / 255, 238 / 255];
  let fs = 100, fillLevel = 0, fillStart = 0, holding = false, gw = 0, gh = 0;
  const geo = (w, h) => { gw = w; gh = h; const bw = Math.min(w * 0.58, fs * 5.6), k = bw / AR.w; return { k, x0: (w - AR.w * k) / 2 + bw * 0.04, y0: h / 2 - AR.h * k * 0.52 }; };
  // css px of the fill line for a level 0..1 (the ink sits between y 6 and 176 of the outline's box)
  const fillLine = lv => { const { y0, k } = geo(gw, gh); return y0 + (6 + 170 * (1 - lv)) * k; };
  const glass = createGlass(canvas, {
    tint: [1, 1, 1], glass: 0.07, bg: BG,
    drawBase: (c, w, h) => { fs = Math.min(w * 0.115, h * 0.2); wordmark(c, w, h, { text: 'Ahmed Bawazir', size: fs, weight: 700, family: '"Plus Jakarta Sans"', color: INK, accent, dot: true }); },
    // Through the glass: the Ruqaa name as an outline (with the orange dot) …
    drawReveal: (c, w, h) => {
      c.clearRect(0, 0, w, h);
      const { x0, y0, k } = geo(w, h), path = new Path2D(AR.d);
      c.save(); c.translate(x0, y0); c.scale(k, k);
      c.lineWidth = 1.6 / k * Math.max(1, fs / 60); c.lineJoin = 'round'; c.strokeStyle = INK; c.stroke(path);
      c.restore();
      const d = fs * 0.17; // orange dot after the name (on its left, as Arabic reads right to left)
      c.fillStyle = accent; c.fillRect(x0 - d - fs * 0.12, y0 + 128 * k - d, d, d);
    },
    // … and the same name filled in. The shader shows it below a line that rises, so the
    // fill animates without redrawing or re-uploading anything.
    drawFill: (c, w, h) => {
      c.clearRect(0, 0, w, h);
      const { x0, y0, k } = geo(w, h);
      c.save(); c.translate(x0, y0); c.scale(k, k); c.fillStyle = INK; c.fill(new Path2D(AR.d)); c.restore();
    },
    // sharp enough for the glass, without giant textures on 3× phones
    dprMax: 2, ss: 1,
  });

  const MIN = 1300, MAX = 3600, t0 = performance.now();
  let readyAt = 0, target = 0.15, shown = 0, finished = false, raf, expandStart = 0;
  const fontsReady = (document.fonts ? Promise.all([
    document.fonts.load('700 80px "Plus Jakarta Sans"'),
    document.fonts.load('700 80px "IBM Plex Sans Arabic"', 'أحمد'),
  ]) : Promise.resolve()).catch(() => {});
  const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise(r => addEventListener('load', r, { once: true }));
  // Build the glass textures once, with the real fonts (wait up to 400 ms for them), instead of
  // twice. Each build is a big texture upload that freezes a frame.
  let laidOut = false;
  const build = () => { if (laidOut) return; laidOut = true; glass.layout(); };
  fontsReady.then(() => { target = Math.max(target, 0.6); build(); });
  setTimeout(build, 400);
  loaded.then(() => { target = Math.max(target, 0.85); });
  let rz; const onResize = () => { clearTimeout(rz); rz = setTimeout(() => glass.layout(), 150); };
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
      }, 700);
    };
    const done = () => {
      if (finished) return;
      finished = true;
      roll(pct, '100');
      bar.style.transform = 'scaleX(1)';
      expandStart = performance.now();
      el.classList.add('expanding');
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
        r = R + (Math.hypot(w, h) - R) * e;
        // Once the bubble fills the screen, the outlined name fills with white from the bottom up.
        if (e >= 1) {
          if (!fillStart) fillStart = now;
          const f = Math.min(1, (now - fillStart) / 950);
          fillLevel = 0.12 + 0.88 * (f < .5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2);
          if (f >= 1 && !el.classList.contains('out') && !holding) { holding = true; setTimeout(finish, 180); }
        }
      }
      glass.setGlass(expandStart ? 0.07 * (1 - Math.min(1, (now - expandStart) / 500)) : 0.07); // no grey film when full-screen
      glass.setFillY(fillLine(fillLevel));
      glass.setLens(x, y, r);

      if (!finished) {
        const floor = Math.min(0.9, (t / MIN) * 0.9);
        shown += (Math.max(target, floor) - shown) * (target === 1 ? 0.14 : 0.08);
        roll(pct, String(Math.min(99, Math.round(shown * 100))).padStart(3, '0'));
        bar.style.transform = `scaleX(${shown.toFixed(3)})`;
        fillLevel = Math.min(0.12, shown * 0.12); // just a hint of ink while loading
        // once everything is ready, finish counting in 350 ms whatever the frame rate
        if (target === 1) { if (!readyAt) readyAt = now; shown = Math.max(shown, 0.6 + 0.4 * Math.min(1, (now - readyAt) / 350)); if (now - readyAt >= 350) done(); }
        if (t > MAX) done();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    Promise.all([fontsReady, loaded]).then(() => {
      const wait = Math.max(0, MIN - (performance.now() - t0));
      setTimeout(() => { target = 1; }, wait);
    });
    const onKey = e => { if (['Escape', 'Enter', ' '].includes(e.key)) { removeEventListener('keydown', onKey); done(); } };
    el.addEventListener('click', done);
    addEventListener('keydown', onKey);
  });
}
