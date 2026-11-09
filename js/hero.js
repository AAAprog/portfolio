// Particle monogram: "ab" is sampled from text into points; each particle
// springs to its home point, flees the pointer, and scatters on click.

export function initHero(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off';
  const hero = canvas.parentElement;
  let W = 0, H = 0, dpr = 1, parts = [], raf = 0, visible = true;
  const mouse = { x: -9999, y: -9999, active: false };
  let colors = readColors();

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    return { ink: cs.getPropertyValue('--ink').trim(), accent: cs.getPropertyValue('--accent').trim() };
  }

  function sample() {
    const rect = hero.getBoundingClientRect();
    W = rect.width; H = rect.height; dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const mobile = W < 700;
    const rtl = document.documentElement.dir === 'rtl';
    // Monogram sits on the opposite side to the text column on desktop,
    // and behind the title (faint) on small screens.
    const size = mobile ? Math.min(W * 0.95, 420) : Math.min(W * 0.32, H * 0.8, 560);
    const cx = mobile ? W * 0.5 : (rtl ? W * 0.2 : W * 0.8);
    const cy = mobile ? H * 0.62 : H * 0.52;

    const off = document.createElement('canvas');
    const ow = Math.ceil(size * 1.3), oh = Math.ceil(size);
    off.width = ow; off.height = oh;
    const o = off.getContext('2d');
    o.fillStyle = '#000';
    o.textAlign = 'center'; o.textBaseline = 'middle';
    o.font = `700 ${size * 0.92}px "Space Grotesk", system-ui, sans-serif`;
    o.fillText('ab', ow / 2, oh * 0.5);
    const data = o.getImageData(0, 0, ow, oh).data;

    const gap = mobile ? 7 : Math.max(6, Math.round(size / 85));
    const pts = [];
    for (let y = 0; y < oh; y += gap) {
      for (let x = 0; x < ow; x += gap) {
        if (data[(y * ow + x) * 4 + 3] > 128) pts.push([cx - ow / 2 + x, cy - oh / 2 + y]);
      }
    }
    // A few accent particles form the "dot" (echo of the logo).
    const dotR = size * 0.06;
    const dx = cx + ow * 0.36, dy = cy + oh * 0.2;
    for (let a = 0; a < 40; a++) {
      const r = Math.sqrt(Math.random()) * dotR, t = Math.random() * Math.PI * 2;
      pts.push([dx + Math.cos(t) * r, dy + Math.sin(t) * r, true]);
    }

    const prev = parts;
    parts = pts.map((p, i) => {
      const old = prev[i];
      return {
        hx: p[0], hy: p[1], accent: !!p[2] || Math.random() < 0.035,
        x: old ? old.x : Math.random() * W, y: old ? old.y : Math.random() * H,
        vx: 0, vy: 0, r: (mobile ? 1.6 : 1.9) * (0.75 + Math.random() * 0.5),
      };
    });
    canvas.style.opacity = mobile ? '0.22' : '1';
    if (reduce) parts.forEach(p => { p.x = p.hx; p.y = p.hy; });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      ctx.fillStyle = p.accent ? colors.accent : colors.ink;
      ctx.globalAlpha = p.accent ? 1 : 0.78;
      ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
    ctx.globalAlpha = 1;
  }

  function step() {
    const R = 110, R2 = R * R;
    for (const p of parts) {
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
      if (mouse.active && d2 < R2) {
        const d = Math.sqrt(d2) || 1, f = (1 - d / R) * 6;
        p.vx += (dx / d) * f; p.vy += (dy / d) * f;
      }
      p.vx += (p.hx - p.x) * 0.045; p.vy += (p.hy - p.y) * 0.045;
      p.vx *= 0.82; p.vy *= 0.82;
      p.x += p.vx; p.y += p.vy;
    }
    draw();
    raf = visible ? requestAnimationFrame(step) : 0;
  }

  function scatter(x, y) {
    for (const p of parts) {
      const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
      const f = 40 * Math.exp(-d / 260) + Math.random() * 6;
      p.vx += (dx / d) * f; p.vy += (dy / d) * f;
    }
  }

  const local = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  hero.addEventListener('pointermove', e => { [mouse.x, mouse.y] = local(e); mouse.active = true; });
  hero.addEventListener('pointerleave', () => { mouse.active = false; });
  hero.addEventListener('pointerdown', e => {
    if (e.target.closest('a, button')) return;
    const [x, y] = local(e); scatter(x, y);
  });

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { sample(); if (reduce) draw(); }, 150); });
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !raf && !reduce) raf = requestAnimationFrame(step);
  }).observe(hero);

  const start = () => { sample(); reduce ? draw() : (raf = requestAnimationFrame(step)); };
  const boot = () => (document.fonts && document.fonts.load) ? document.fonts.load('700 100px "Space Grotesk"').then(start, start) : start();
  // Wait for the loader curtain so the particles assemble in view.
  if (document.documentElement.classList.contains('is-loading')) document.addEventListener('loader:done', boot, { once: true });
  else boot();

  return {
    refresh() { colors = readColors(); sample(); if (reduce) draw(); },
  };
}
