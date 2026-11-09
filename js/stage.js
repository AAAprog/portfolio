// Faux-UI stages: small looping product demos driven by a scripted cursor.
// Principles: real words only where the story is, placeholder lines elsewhere,
// windows cropped with intent, every change has a cause (the cursor), and each
// loop ends exactly where it began so there is no visible seam.
import { roll } from './roll.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Offset of `el` inside `root`, ignoring CSS transforms (scale/tilt).
function offsetIn(el, root) {
  let x = 0, y = 0, n = el;
  while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

class Stage {
  constructor(root, def) {
    this.root = root;
    this.canvas = root.querySelector('.stage-canvas');
    this.cursor = root.querySelector('.st-cursor');
    this.def = def;
    this.pos = { ...def.home };
    this.visible = false;
    this.W = def.size[0]; this.H = def.size[1];
    this.canvas.style.width = this.W + 'px';
    this.canvas.style.height = this.H + 'px';
    new ResizeObserver(() => this.fit()).observe(root);
    this.fit();
    def.setup && def.setup(this);
    this.place(this.pos);
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }, { threshold: 0.25 }).observe(root);
    if (reduce) { def.payoff(this); this.cursor.hidden = true; return; }
    this.run();
  }
  fit() { const k = this.root.clientWidth / this.W; this.canvas.style.setProperty('--k', k); }
  $(name) { return this.canvas.querySelector(`[data-at="${name}"]`); }
  set(attrs) { for (const k in attrs) this.root.dataset[k] = attrs[k]; }
  roll(sel, str) { const el = this.canvas.querySelector(sel); el && roll(el, str, reduce); }
  place(p) { this.cursor.style.transform = `translate(${p.x}px, ${p.y}px)`; }

  async gate() { while (!this.visible || document.hidden) await sleep(250); }
  async wait(ms) { await this.gate(); await sleep(ms); }

  // Curved move (quadratic arc) with ease-in-out, sampled into keyframes.
  async move(to, ms) {
    await this.gate();
    const from = this.pos, dx = to.x - from.x, dy = to.y - from.y, dist = Math.hypot(dx, dy);
    const dur = ms || Math.min(900, 380 + dist * 1.4);
    const bend = Math.min(60, dist * 0.18);
    const cx = (from.x + to.x) / 2 - (dy / (dist || 1)) * bend, cy = (from.y + to.y) / 2 + (dx / (dist || 1)) * bend;
    const frames = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, u = 1 - t;
      frames.push({ transform: `translate(${u * u * from.x + 2 * u * t * cx + t * t * to.x}px, ${u * u * from.y + 2 * u * t * cy + t * t * to.y}px)` });
    }
    const an = this.cursor.animate(frames, { duration: dur, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' });
    await an.finished;
    this.pos = { ...to }; this.place(to); an.cancel();
  }
  aim(name) {
    const el = this.$(name);
    const o = offsetIn(el, this.canvas);
    return { x: o.x + o.w * 0.55, y: o.y + o.h * 0.6 };
  }
  async click(name, fn) {
    const el = this.$(name);
    await this.move(this.aim(name));
    this.cursor.classList.add('down');
    el.classList.add('pressed');
    const ring = document.createElement('span');
    ring.className = 'st-tap';
    ring.style.transform = `translate(${this.pos.x}px, ${this.pos.y}px)`;
    this.canvas.append(ring);
    ring.addEventListener('animationend', () => ring.remove());
    await sleep(130);
    this.cursor.classList.remove('down');
    el.classList.remove('pressed');
    fn && fn();
  }
  async run() {
    await sleep(400);
    for (;;) { await this.gate(); await this.def.script(this); }
  }
}

/* ───────────── Scripts ───────────── */
const defs = {
  // Codai: describe a system → UML appears → tests generated → reset.
  codai: {
    size: [400, 275], home: { x: 330, y: 238 },
    payoff: s => s.set({ gen: 1, tab: 'tests' }),
    async script(s) {
      await s.click('gen', () => s.set({ gen: 1, tab: 'diagram' }));
      await s.wait(1700);
      await s.click('tests', () => s.set({ tab: 'tests' }));
      await s.wait(1900);
      await s.click('reset', () => s.set({ gen: 0, tab: 'diagram' }));
      await s.wait(500);
      await s.move(s.def.home);
      await s.wait(700);
    },
  },

  // UFC Ticketing: pick a seat → book → ticket confirmed → dismiss.
  ufc: {
    size: [400, 275], home: { x: 340, y: 60 },
    setup(s) {
      const grid = s.canvas.querySelector('.uf-seats');
      const taken = new Set([2, 3, 7, 11, 12, 18, 24, 25, 26, 33, 38, 41, 47, 52, 53]);
      for (let i = 0; i < 60; i++) {
        const b = document.createElement('i');
        if (taken.has(i)) b.className = 'tk';
        if (i === 35) { b.dataset.at = 'seat'; b.className = 'pick'; }
        grid.append(b);
      }
      s.roll('.uf-count', '0'); s.roll('.uf-price', '0');
    },
    payoff: s => { s.set({ sel: 1, booked: 1 }); s.roll('.uf-count', '1'); s.roll('.uf-price', '450'); },
    async script(s) {
      await s.click('seat', () => { s.set({ sel: 1 }); s.roll('.uf-count', '1'); s.roll('.uf-price', '450'); });
      await s.wait(700);
      await s.click('book', () => s.set({ booked: 1 }));
      await s.wait(2000);
      await s.click('close', () => { s.set({ booked: 0, sel: 0 }); s.roll('.uf-count', '0'); s.roll('.uf-price', '0'); });
      await s.wait(400);
      await s.move(s.def.home);
      await s.wait(700);
    },
  },

  // EasyCal: add a meal → ring fills, kcal rolls → remove it.
  easycal: {
    size: [400, 275], home: { x: 90, y: 210 },
    setup: s => s.roll('.ec-kcal', '1,320'),
    payoff: s => { s.set({ added: 1 }); s.roll('.ec-kcal', '1,640'); },
    async script(s) {
      await s.click('add', () => { s.set({ added: 1 }); s.roll('.ec-kcal', '1,640'); });
      await s.wait(2000);
      await s.click('remove', () => { s.set({ added: 0 }); s.roll('.ec-kcal', '1,320'); });
      await s.wait(500);
      await s.move(s.def.home);
      await s.wait(800);
    },
  },

  // Oracle HCM: approve an absence request → balance deducts → undo.
  hcm: {
    size: [460, 270], home: { x: 420, y: 245 },
    setup: s => s.roll('.hc-bal', '21.0'),
    payoff: s => { s.set({ ok: 1 }); s.roll('.hc-bal', '18.0'); },
    async script(s) {
      await s.click('approve', () => { s.set({ ok: 1 }); s.roll('.hc-bal', '18.0'); });
      await s.wait(2100);
      await s.click('undo', () => { s.set({ ok: 0 }); s.roll('.hc-bal', '21.0'); });
      await s.wait(500);
      await s.move(s.def.home);
      await s.wait(800);
    },
  },
};

export function initStages() {
  document.querySelectorAll('[data-stage]').forEach(el => {
    const def = defs[el.dataset.stage];
    if (def) new Stage(el, def);
  });
}
