// Branded loader: tracks real readiness (fonts + window load), never shorter
// than a beat nor longer than a few seconds, skippable, once per session.
import { roll } from './roll.js';

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
  const logs = [...el.querySelectorAll('.loader-log li')];
  roll(pct, '000', true);

  const MIN = 950, MAX = 3000, t0 = performance.now();
  let target = 0.15, shown = 0, finished = false, raf;
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise(r => addEventListener('load', r, { once: true }));
  fonts.then(() => { target = Math.max(target, 0.6); });
  loaded.then(() => { target = Math.max(target, 0.85); });
  const ready = Promise.all([fonts, loaded]);

  return new Promise(resolve => {
    const done = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      roll(pct, '100');
      bar.style.transform = 'scaleX(1)';
      logs.forEach(l => l.classList.add('on'));
      setTimeout(() => {
        el.classList.add('out');
        root.classList.add('loader-out');
        setTimeout(() => {
          root.classList.remove('is-loading', 'loader-out');
          root.classList.add('no-loader');
          try { localStorage.setItem('ab-loaded', String(Date.now())); } catch {}
          document.dispatchEvent(new Event('loader:done'));
          el.remove();
          resolve();
        }, 850);
      }, 140);
    };

    const tick = now => {
      const t = now - t0;
      // Time-based floor so it always moves; real readiness lifts the target.
      const floor = Math.min(0.9, t / MIN * 0.9);
      const goal = Math.max(target, floor);
      shown += (goal - shown) * 0.08;
      const p = Math.min(99, Math.round(shown * 100));
      roll(pct, String(p).padStart(3, '0'));
      bar.style.transform = `scaleX(${shown.toFixed(3)})`;
      logs.forEach((l, i) => l.classList.toggle('on', shown > 0.2 + i * 0.25));
      if (t > MAX) return done();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    ready.then(() => {
      const wait = Math.max(0, MIN - (performance.now() - t0));
      setTimeout(() => { target = 1; setTimeout(done, 160); }, wait);
    });
    const onKey = e => { if (['Escape', 'Enter', ' '].includes(e.key)) { removeEventListener('keydown', onKey); done(); } };
    el.addEventListener('click', done);
    addEventListener('keydown', onKey);
  });
}
