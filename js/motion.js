// Motion layer: custom cursor, magnetic buttons, tilt cards, word/letter
// reveals, kicker scramble, hero spotlight + parallax, velocity marquee,
// pinned horizontal projects, button ripples and confetti.
// Everything degrades to static when prefers-reduced-motion is set.

const root = document.documentElement;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off';
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const isAr = () => root.lang === 'ar';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

/* ───────────── Word reveal for headings ───────────── */
const wordIO = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); e.target.dataset.seen = '1'; wordIO.unobserve(e.target); }
}), { threshold: 0.35 });

function splitWords() {
  $$('[data-words]').forEach(el => {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(/\s+/).map((w, i) =>
      `<span class="wr" aria-hidden="true"><span style="--i:${i}">${w.replace(/</g, '&lt;')}</span></span>`).join(' ');
    if (el.dataset.seen) el.classList.add('in'); else wordIO.observe(el);
  });
}

/* ───────────── Hero letters ───────────── */
function splitHero() {
  if (isAr()) return; // keep Arabic letters joined
  let n = 0;
  $$('.hero-title .line').forEach(line => {
    [...line.childNodes].forEach(node => {
      if (node.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const ch of node.textContent) {
          const s = document.createElement('span');
          s.className = 'ch'; s.style.setProperty('--i', n++); s.textContent = ch;
          frag.append(s);
        }
        node.replaceWith(frag);
      } else if (node.nodeType === 1) {
        node.classList.add('ch'); node.style.setProperty('--i', n++);
      }
    });
    line.setAttribute('aria-label', line.textContent);
  });
}

/* ───────────── Kicker scramble ───────────── */
const GLYPHS = '!<>-_\\/[]{}=+*^?#01ABCDEF';
function scramble(el) {
  if (reduce || isAr()) return;
  const final = el.textContent;
  let frame = 0;
  const total = 22;
  const tick = () => {
    frame++;
    el.textContent = [...final].map((c, i) => {
      if (c === ' ') return c;
      return frame / total > i / final.length ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }).join('');
    if (frame < total) requestAnimationFrame(tick); else el.textContent = final;
  };
  tick();
}
const kickIO = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { kickIO.unobserve(e.target); const s = e.target.querySelector('[data-i18n]'); s && scramble(s); }
}), { threshold: 1 });

/* ───────────── Custom cursor ───────────── */
const LABELS = {
  en: { open: 'open ↗', copy: 'copy', hunt: 'hunt', type: 'type', drag: 'drag' },
  ar: { open: 'افتح ↗', copy: 'انسخ', hunt: 'اصطد', type: 'اكتب', drag: 'اسحب' },
};
function initCursor() {
  if (!fine || reduce) return null;
  const el = $('.cursor'), label = $('.cursor-label');
  root.classList.add('has-cursor');
  const pos = { x: innerWidth / 2, y: innerHeight / 2 }, ring = { x: pos.x, y: pos.y };
  addEventListener('pointermove', e => { pos.x = e.clientX; pos.y = e.clientY; el.classList.add('on'); }, { passive: true });
  document.addEventListener('pointerleave', () => el.classList.remove('on'));
  addEventListener('pointerdown', () => el.classList.add('down'));
  addEventListener('pointerup', () => el.classList.remove('down'));
  document.addEventListener('pointerover', e => {
    const t = e.target;
    const text = t.closest('input:not([type=range]), textarea');
    const lab = t.closest('[data-cursor]');
    const link = t.closest('a, button, label, input[type=range], [data-tilt], .bug-target');
    el.classList.toggle('hidden', !!t.closest('[data-cursor-hide]'));
    el.classList.toggle('text', !!text);
    el.classList.toggle('link', !!link && !text);
    const key = !text && lab ? lab.dataset.cursor : '';
    const txt = key ? LABELS[isAr() ? 'ar' : 'en'][key] : '';
    label.textContent = txt || '';
    el.classList.toggle('labeled', !!txt);
  });
  return () => {
    ring.x = lerp(ring.x, pos.x, 0.18); ring.y = lerp(ring.y, pos.y, 0.18);
    el.style.setProperty('--x', pos.x + 'px'); el.style.setProperty('--y', pos.y + 'px');
    el.style.setProperty('--rx', ring.x + 'px'); el.style.setProperty('--ry', ring.y + 'px');
  };
}

/* ───────────── Magnetic buttons ───────────── */
function initMagnetic() {
  if (!fine || reduce) return;
  $$('.btn, .icon-btn, .logo, .project-end-ring').forEach(el => {
    const strength = el.classList.contains('btn') ? 0.28 : 0.4;
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * strength).toFixed(1) + 'px');
      el.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * strength).toFixed(1) + 'px');
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px'); });
  });
}

/* ───────────── Tilt cards ───────────── */
function initTilt() {
  if (!fine || reduce) return;
  $$('[data-tilt]').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.classList.add('tilting');
      el.style.setProperty('--tx', ((py - 0.5) * -9).toFixed(2) + 'deg');
      el.style.setProperty('--ty', ((px - 0.5) * 11).toFixed(2) + 'deg');
      el.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
      el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      el.style.setProperty('--px', (px - 0.5).toFixed(3));
      el.style.setProperty('--py', (py - 0.5).toFixed(3));
    });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('tilting');
      ['--tx', '--ty'].forEach(p => el.style.setProperty(p, '0deg'));
      ['--px', '--py'].forEach(p => el.style.setProperty(p, '0'));
    });
  });
}

/* ───────────── Ripple ───────────── */
function initRipple() {
  if (reduce) return;
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn, .tab');
    if (!b) return;
    const r = b.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.left = e.clientX - r.left + 'px'; s.style.top = e.clientY - r.top + 'px';
    b.append(s);
    s.addEventListener('animationend', () => s.remove());
  });
}

/* ───────────── Confetti ───────────── */
export function confetti(x = innerWidth / 2, y = innerHeight / 2) {
  if (reduce) return;
  const c = $('.confetti'), ctx = c.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cs = getComputedStyle(root);
  const cols = [cs.getPropertyValue('--accent'), cs.getPropertyValue('--ok'), '#ffd23f', cs.getPropertyValue('--ink'), '#5b8cff'].map(s => s.trim());
  const ps = Array.from({ length: 160 }, () => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 7 + Math.random() * 9;
    return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
      w: 6 + Math.random() * 6, h: 3 + Math.random() * 5, c: cols[(Math.random() * cols.length) | 0] };
  });
  c.classList.add('on');
  const t0 = performance.now();
  const f = now => {
    const t = now - t0;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of ps) {
      p.vy += 0.32; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.globalAlpha = clamp(1 - (t - 1800) / 900, 0, 1);
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 1);
      ctx.restore();
    }
    if (t < 2700) requestAnimationFrame(f); else { ctx.clearRect(0, 0, innerWidth, innerHeight); c.classList.remove('on'); }
  };
  requestAnimationFrame(f);
}

/* ───────────── Pinned horizontal projects ───────────── */
function initPin() {
  const pin = $('.pin'), track = $('.pin-track'), bar = $('.pin-progress');
  const mq = matchMedia('(min-width: 1021px)');
  let dist = 0, on = false;
  function measure() {
    on = mq.matches && !reduce;
    root.classList.toggle('pin-on', on);
    if (!on) { pin.style.height = ''; track.style.transform = ''; return; }
    dist = Math.max(0, track.scrollWidth - innerWidth);
    pin.style.height = dist + innerHeight + 'px';
  }
  measure();
  addEventListener('resize', measure);
  document.fonts && document.fonts.ready.then(measure);
  document.addEventListener('langchange', () => requestAnimationFrame(measure));
  return () => {
    if (!on) return;
    const top = pin.getBoundingClientRect().top;
    const p = dist ? clamp(-top / dist, 0, 1) : 0;
    const x = p * dist * (root.dir === 'rtl' ? 1 : -1);
    track.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
    bar.style.setProperty('--pp', p.toFixed(4));
  };
}

/* ───────────── Hero: spotlight + parallax ───────────── */
function initHeroFx() {
  const hero = $('.hero'), inner = $('.hero-inner'), canvas = $('.hero-canvas');
  if (fine && !reduce) {
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--sx', e.clientX - r.left + 'px');
      hero.style.setProperty('--sy', e.clientY - r.top + 'px');
      hero.classList.add('lit');
    });
    hero.addEventListener('pointerleave', () => hero.classList.remove('lit'));
  }
  if (reduce) return () => {};
  return y => {
    if (y > innerHeight * 1.2) return;
    inner.style.transform = `translate3d(0, ${(y * 0.28).toFixed(1)}px, 0)`;
    inner.style.opacity = clamp(1 - y / (innerHeight * 0.75), 0, 1).toFixed(3);
    canvas.style.transform = `translate3d(0, ${(y * 0.12).toFixed(1)}px, 0)`;
  };
}

/* ───────────── Velocity marquee ───────────── */
function initMarquee() {
  const track = $('.marquee-track');
  if (!track || reduce) return () => {};
  track.style.animation = 'none';
  let off = 0, dir = 1;
  return vel => {
    if (Math.abs(vel) > 0.5) dir = vel > 0 ? 1 : -1;
    const speed = (0.6 + Math.min(Math.abs(vel) * 0.25, 18)) * dir;
    const half = track.scrollWidth / 2;
    off = (off - speed) % half;
    if (off > 0) off -= half;
    const skew = clamp(-vel * 0.35, -10, 10);
    track.style.transform = `translate3d(${off.toFixed(1)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
  };
}

/* ───────────── Kinetic variable-weight type (hero) ───────────── */
// Letters near the pointer ease from bold (700) to light (320) using the
// variable 'wght' axis of Plus Jakarta Sans, a calm, typographic interaction.
function initKinetic() {
  if (!fine || reduce) return () => {};
  const hero = $('.hero');
  const p = { x: -1e4, y: -1e4 }, cur = new Map();
  hero.addEventListener('pointermove', e => { p.x = e.clientX; p.y = e.clientY; });
  hero.addEventListener('pointerleave', () => { p.x = p.y = -1e4; });
  return () => {
    const chars = hero.querySelectorAll('.hero-title .ch');
    if (!chars.length) return;
    chars.forEach(ch => {
      const r = ch.getBoundingClientRect();
      const d = Math.hypot(r.left + r.width / 2 - p.x, r.top + r.height / 2 - p.y);
      const t = Math.pow(clamp(1 - d / 260, 0, 1), 1.6);
      const target = 700 - 380 * t;
      const w = lerp(cur.get(ch) ?? 700, target, 0.14);
      cur.set(ch, w);
      ch.style.fontVariationSettings = `'wght' ${w.toFixed(0)}`;
    });
  };
}

/* ───────────── Boot ───────────── */
export function initMotion() {
  splitWords();
  splitHero();
  $$('.kicker').forEach(k => kickIO.observe(k));
  const cursorTick = initCursor();
  initMagnetic();
  initTilt();
  initRipple();
  // Light that follows the pointer across bento cards (glass shine)
  if (fine && !reduce) $$('.bento-card').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--gx', (e.clientX - r.left) + 'px');
    c.style.setProperty('--gy', (e.clientY - r.top) + 'px');
  }));
  const pinTick = initPin();
  const heroTick = initHeroFx();
  const marqTick = initMarquee();
  const kinTick = initKinetic();

  document.addEventListener('langchange', () => { splitWords(); splitHero(); });
  document.addEventListener('celebrate', e => confetti(e.detail && e.detail.x, e.detail && e.detail.y));

  let lastY = scrollY, vel = 0;
  const loop = () => {
    const y = scrollY;
    vel = lerp(vel, y - lastY, 0.2); lastY = y;
    cursorTick && cursorTick();
    pinTick();
    heroTick(y);
    marqTick(vel);
    if (scrollY < innerHeight) kinTick();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
