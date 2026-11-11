// "I break things on purpose" — literally.
// Break this page: what's on screen falls under gravity, bounces, piles up,
// and can be grabbed and thrown. "Run tests to fix" puts every piece back.
// A tiny dependency-free 2D physics loop (AABB bodies, gravity, restitution).
// Also: shake a phone to break it; type "hire" anywhere for a surprise.

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || root.dataset.motion === 'off';
const PICK = [
  '.topbar .logo', '.toplinks a', '.top-actions > *',
  '.eyebrow', '.hero-title .line', '.hero-role', '.hero-lede', '.hero-ctas > *', '.hero-hint', '.scroll-cue',
  '.kicker', '.section-head h2', '.section-sub', '.statement-text', '.bento-card', '.stat',
  '.commit-body', '.project', '.play', '.skill-group', '.tab', '.map', '.certs li', '.lang-row',
  '.term', '.term-chips .tab', '.contact-title', '.contact-sub', '.email-btn', '.contact-links > *', '.cform',
  '.footer > *', '.signature',
].join(',');

let state = 'idle', bodies = [], raf = 0, ui = null, grabbed = null;

function visibleTargets() {
  const H = innerHeight, W = innerWidth;
  const all = [...document.querySelectorAll(PICK)].filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < H - 40 && r.right > 0 && r.left < W && r.width < W * 0.98;
  });
  // keep outermost pieces only
  return all.filter(el => !all.some(o => o !== el && o.contains(el))).slice(0, 48);
}

function makeUI(L) {
  const bar = document.createElement('div');
  bar.className = 'chaos-bar mono';
  bar.setAttribute('role', 'status');
  bar.innerHTML = `<span class="chaos-dot"></span><span class="chaos-msg"></span><button type="button" class="chaos-fix"></button>`;
  document.body.append(bar);
  bar.querySelector('.chaos-fix').addEventListener('click', () => fix(L));
  return bar;
}

export function breakPage(L, toast) {
  if (state !== 'idle') return;
  if (reduce) { toast(L().chaosOff); return; }
  const targets = visibleTargets();
  if (!targets.length) return;
  state = 'broken';
  root.classList.add('chaos');
  const stage = document.getElementById('main') || document.body;
  stage.classList.add('chaos-shake');
  setTimeout(() => stage.classList.remove('chaos-shake'), 500);

  const floor = () => innerHeight - 34 - 10; // above the status bar
  bodies = targets.map((el, i) => {
    const r = el.getBoundingClientRect();
    el.classList.add('chaos-piece');
    el.style.transition = 'none';
    return {
      el, x0: r.left, y0: r.top, x: r.left, y: r.top, w: r.width, h: r.height,
      vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 4, a: 0, va: (Math.random() - 0.5) * 0.06,
      delay: i * 22 + Math.random() * 120, mass: Math.max(1, (r.width * r.height) / 40000),
    };
  });

  const t0 = performance.now();
  let last = t0;
  const step = now => {
    const dt = Math.min(2, (now - last) / 16.67); last = now;
    const W = innerWidth, F = floor();
    for (const b of bodies) {
      if (b === grabbed || now - t0 < b.delay) continue;
      b.vy += 0.55 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.va * dt;
      if (b.y + b.h > F) { b.y = F - b.h; b.vy *= -0.32; b.vx *= 0.86; b.va *= 0.7; if (Math.abs(b.vy) < 0.6) b.vy = 0; }
      if (b.x < 0) { b.x = 0; b.vx *= -0.5; }
      if (b.x + b.w > W) { b.x = W - b.w; b.vx *= -0.5; }
      b.a = Math.max(-0.5, Math.min(0.5, b.a));
    }
    // simple pile-up: push overlapping pieces apart vertically (the lighter one moves)
    for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
      const p = bodies[i], q = bodies[j];
      if (p.x < q.x + q.w && p.x + p.w > q.x && p.y < q.y + q.h && p.y + p.h > q.y) {
        const top = p.y < q.y ? p : q, bot = top === p ? q : p;
        const overlap = top.y + top.h - bot.y;
        if (overlap > 0 && overlap < Math.min(top.h, bot.h) * 0.9 && top !== grabbed) {
          top.y -= overlap * 0.5; if (top.vy > 0) top.vy *= -0.2; top.vx += (top.x + top.w / 2 < bot.x + bot.w / 2 ? -0.15 : 0.15);
        }
      }
    }
    for (const b of bodies) b.el.style.transform = `translate(${(b.x - b.x0).toFixed(1)}px, ${(b.y - b.y0).toFixed(1)}px) rotate(${b.a.toFixed(3)}rad)`;
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);

  ui = ui || makeUI(L);
  ui.querySelector('.chaos-msg').textContent = L().chaosBroken.replace('{n}', bodies.length);
  ui.querySelector('.chaos-fix').textContent = L().chaosFix;
  ui.classList.add('on');
}

function fix(L) {
  if (state !== 'broken') return;
  state = 'fixing';
  cancelAnimationFrame(raf);
  const msg = ui.querySelector('.chaos-msg');
  const btn = ui.querySelector('.chaos-fix');
  btn.disabled = true;
  let n = 0;
  bodies.forEach((b, i) => {
    setTimeout(() => {
      b.el.style.transition = 'transform .7s cubic-bezier(.2,.9,.25,1.15)';
      b.el.style.transform = 'translate(0px, 0px) rotate(0rad)';
      n++;
      msg.textContent = L().chaosFixing.replace('{n}', n).replace('{t}', bodies.length);
    }, i * 45);
  });
  setTimeout(() => {
    bodies.forEach(b => { b.el.style.transform = ''; b.el.style.transition = ''; b.el.classList.remove('chaos-piece'); });
    bodies = [];
    root.classList.remove('chaos');
    msg.textContent = L().chaosDone;
    ui.classList.add('ok');
    btn.disabled = false;
    setTimeout(() => { ui.classList.remove('on', 'ok'); state = 'idle'; }, 1800);
    document.dispatchEvent(new CustomEvent('celebrate', { detail: { x: innerWidth / 2, y: innerHeight - 80 } }));
  }, bodies.length * 45 + 800);
}

export function initChaos(L, toast) {
  // Grab and throw pieces while broken.
  let lastX = 0, lastY = 0, offX = 0, offY = 0;
  addEventListener('pointerdown', e => {
    if (state !== 'broken') return;
    const el = e.target.closest('.chaos-piece');
    const b = el && bodies.find(x => x.el === el);
    if (!b) return;
    e.preventDefault();
    grabbed = b; offX = e.clientX - b.x; offY = e.clientY - b.y; lastX = e.clientX; lastY = e.clientY;
  }, { capture: true });
  addEventListener('pointermove', e => {
    if (!grabbed) return;
    grabbed.vx = (e.clientX - lastX); grabbed.vy = (e.clientY - lastY);
    grabbed.x = e.clientX - offX; grabbed.y = e.clientY - offY;
    grabbed.va = grabbed.vx * 0.004;
    lastX = e.clientX; lastY = e.clientY;
  });
  addEventListener('pointerup', () => { grabbed = null; });
  // Don't let clicks on broken pieces navigate.
  addEventListener('click', e => { if (state === 'broken' && e.target.closest('.chaos-piece')) { e.preventDefault(); e.stopPropagation(); } }, true);

  // Shake to break (phones).
  let lastShake = 0;
  addEventListener('devicemotion', e => {
    const a = e.accelerationIncludingGravity; if (!a) return;
    const g = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
    if (g > 30 && Date.now() - lastShake > 1500) { lastShake = Date.now(); breakPage(L, toast); }
  });

  // Type "hire" anywhere (outside inputs).
  let buf = '';
  addEventListener('keydown', e => {
    if (/input|textarea/i.test(document.activeElement.tagName) || e.metaKey || e.ctrlKey) return;
    buf = (buf + e.key.toLowerCase()).slice(-4);
    if (buf === 'hire') {
      buf = '';
      document.dispatchEvent(new CustomEvent('celebrate', { detail: { x: innerWidth / 2, y: innerHeight / 2 } }));
      toast(L().hireEgg);
      setTimeout(() => document.getElementById('contact').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }), 700);
    }
  });

  // A note for the curious who open DevTools.
  try {
    console.log('%cAB.', 'font: 700 64px "Plus Jakarta Sans", sans-serif; color: #ff6a2f;');
    console.log('%cYou opened the console. That is exactly what I would do.\nHiring? aaa.bawazir0@gmail.com  ·  try typing  hire  on the page, or press B.', 'font: 13px/1.6 "JetBrains Mono", monospace; color: #8e8e93;');
  } catch {}

  return { break: () => breakPage(L, toast) };
}
