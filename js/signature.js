// Footer signature: a full-width "ahmed bawazir." with a liquid-glass lens that
// follows the pointer (or drifts on its own) and shows "أحمد باوزير" through it.
import { createGlass, wordmark } from './glass.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off';

export function initSignature(wrap) {
  if (!wrap) return;
  const canvas = wrap.querySelector('canvas');
  const root = document.documentElement;
  let fs = 100, glass;

  const build = () => {
    const cs = getComputedStyle(wrap);
    const fg = getComputedStyle(root).getPropertyValue('--bg').trim(), accent = getComputedStyle(root).getPropertyValue('--accent').trim();
    glass = createGlass(canvas, {
      tint: [1, 1, 1], glass: 0.06,
      drawBase: (c, w, h) => { fs = Math.min(w * 0.135, h * 0.78); wordmark(c, w, h, { text: 'ahmed bawazir', size: fs, weight: 600, family: '"Space Grotesk"', color: fg, alpha: 0.16, accent, dot: true, y: 0.42 }); },
      drawReveal: (c, w, h) => wordmark(c, w, h, { text: 'أحمد باوزير', size: fs * 1.02, weight: 700, family: '"IBM Plex Sans Arabic"', color: fg, y: 0.42 }),
    });
    glass.layout();
  };

  const target = { x: 0, y: 0 }, pos = { x: 0, y: 0 };
  let hover = false, visible = false, raf = 0, t0 = performance.now();

  const loop = now => {
    const w = canvas.clientWidth, h = canvas.clientHeight, R = fs * 0.62;
    if (!hover) {
      const t = (now - t0) / 1000;
      target.x = w / 2 + Math.sin(t * 0.45) * w * 0.36;
      target.y = h * 0.42 + Math.sin(t * 0.9) * fs * 0.12;
    }
    const k = reduce ? 1 : hover ? 0.16 : 0.05;
    pos.x += (target.x - pos.x) * k; pos.y += (target.y - pos.y) * k;
    glass.setLens(pos.x, pos.y, R);
    raf = visible && !reduce ? requestAnimationFrame(loop) : 0;
  };
  const start = () => { if (!raf) raf = requestAnimationFrame(loop); };

  wrap.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    target.x = e.clientX - r.left; target.y = e.clientY - r.top; hover = true; start();
  });
  wrap.addEventListener('pointerleave', () => { hover = false; t0 = performance.now() - 1000 * Math.asin(Math.max(-1, Math.min(1, (pos.x - canvas.clientWidth / 2) / (canvas.clientWidth * 0.36)))) / 0.45; });

  const boot = () => {
    build();
    pos.x = target.x = canvas.clientWidth * 0.3; pos.y = target.y = canvas.clientHeight * 0.42;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }).observe(wrap);
    if (reduce) { glass.setLens(canvas.clientWidth * 0.5, canvas.clientHeight * 0.42, fs * 0.62); }
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { glass.layout(); }, 150); });
    new MutationObserver(() => build()).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  };
  (document.fonts ? Promise.all([document.fonts.load('600 80px "Space Grotesk"'), document.fonts.load('700 80px "IBM Plex Sans Arabic"', 'أحمد')]) : Promise.resolve())
    .then(boot, boot);
}
