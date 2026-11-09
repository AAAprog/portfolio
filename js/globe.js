// Journey globe: a dotted Earth seen from space. Scrolling through the
// section spins it to Kajang, flies an arc to Riyadh, then the camera dives
// from orbit down to Riyadh. Orthographic projection on a 2D canvas.
import { LAND, COARSE } from './globe-data.js';
import { roll } from './roll.js';

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || root.dataset.motion === 'off';
const RAD = Math.PI / 180;
const KAJANG = { lat: 2.99, lon: 101.79 };
const RIYADH = { lat: 24.71, lon: 46.68 };

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a));

function toVec({ lat, lon }) {
  const la = lat * RAD, lo = lon * RAD;
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
}
function toLatLon([x, y, z]) {
  return { lat: Math.asin(clamp(z, -1, 1)) / RAD, lon: Math.atan2(y, x) / RAD };
}
function slerp(a, b, t) {
  const d = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
  if (d < 1e-6) return a;
  const s = Math.sin(d), wa = Math.sin((1 - t) * d) / s, wb = Math.sin(t * d) / s;
  return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
}
function distanceKm(a, b) {
  const va = toVec(a), vb = toVec(b);
  return Math.round(6371 * Math.acos(clamp(va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2], -1, 1)));
}

export function initGlobe(section) {
  if (!section) return;
  const canvas = section.querySelector('.globe');
  const ctx = canvas.getContext('2d');
  const pin = section.querySelector('.journey-pin');
  const steps = [...section.querySelectorAll('.hud-step')];
  const km = section.querySelector('.hud-km');
  const coords = section.querySelector('.journey-coords');
  const TOTAL_KM = distanceKm(KAJANG, RIYADH);
  roll(km, '0'.padStart(String(TOTAL_KM).length, '0'), true);

  // Precompute trig for every land point.
  const n = LAND.length / 2;
  const sLat = new Float32Array(n), cLat = new Float32Array(n), lonR = new Float32Array(n);
  for (let i = 0; i < n; i++) { const la = LAND[2 * i] / 10 * RAD; sLat[i] = Math.sin(la); cLat[i] = Math.cos(la); lonR[i] = LAND[2 * i + 1] / 10 * RAD; }

  // A fixed starfield (space backdrop).
  const stars = Array.from({ length: 180 }, () => [Math.random(), Math.random(), Math.random() * 1.2 + .2, Math.random()]);

  const A = toVec(KAJANG), B = toVec(RIYADH);
  let W = 0, H = 0, dpr = 1, visible = false, raf = 0, colors = {}, lastStep = -1, lastKm = -1;

  const readColors = () => {
    const cs = getComputedStyle(root);
    colors = { ink: cs.getPropertyValue('--ink').trim(), accent: cs.getPropertyValue('--accent').trim(), bg: cs.getPropertyValue('--bg').trim(),
      dark: (root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark' };
  };
  const size = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 1.75);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const progress = () => {
    const r = pin.getBoundingClientRect();
    const span = r.height - innerHeight;
    return span > 0 ? clamp(-r.top / span) : 0;
  };

  function draw(now) {
    const p = progress();
    const mobile = W < 760;
    const t = reduce ? 0 : now / 1000;

    // Phases: 0–.3 spin to Kajang · .3–.66 fly the arc · .66–1 dive to Riyadh
    const pSpin = ease(seg(p, 0, .3)), pFly = ease(seg(p, .3, .66)), pDive = ease(seg(p, .66, .98));
    const R0 = mobile ? Math.min(W * .42, H * .3) : Math.min(W, H) * .36;
    const zoom = 1 + pFly * .18 + Math.pow(pDive, 2.2) * 9;
    const R = R0 * zoom;
    const baseCx = mobile ? W / 2 : W * .64, baseCy = mobile ? H * .64 : H * .54;
    const cx = lerp(baseCx, W / 2, pDive), cy = lerp(baseCy, mobile ? H * .6 : H * .56, pDive);

    // Camera centre: drift → Kajang → follow the arc → Riyadh
    let centre;
    if (p < .3) {
      const spinLon = 150 - 48 * pSpin + (1 - pSpin) * Math.sin(t * .15) * 10;
      centre = { lat: lerp(18, KAJANG.lat + 8, pSpin), lon: spinLon };
    } else {
      const v = slerp(A, B, Math.min(1, pFly * 1.05));
      const c = toLatLon(v);
      centre = { lat: lerp(lerp(KAJANG.lat + 8, c.lat, pFly), RIYADH.lat, pDive), lon: c.lon };
      if (pDive > 0) centre = { lat: lerp(centre.lat, RIYADH.lat, pDive), lon: lerp(centre.lon, RIYADH.lon, pDive) };
    }
    const la0 = centre.lat * RAD, lo0 = centre.lon * RAD, sl0 = Math.sin(la0), cl0 = Math.cos(la0);
    const project = (sl, cl, lo, h = 1) => {
      const dl = lo - lo0, cd = Math.cos(dl);
      const x = cl * Math.sin(dl), y = cl0 * sl - sl0 * cl * cd, z = sl0 * sl + cl0 * cl * cd;
      return [cx + R * x * h, cy - R * y * h, z, Math.hypot(x, y)];
    };

    ctx.clearRect(0, 0, W, H);

    // Stars (fade out as we dive)
    const starA = (colors.dark ? .7 : .35) * (1 - pDive);
    if (starA > .01) {
      ctx.fillStyle = colors.ink;
      for (const [sx, sy, sr, tw] of stars) {
        ctx.globalAlpha = starA * (.4 + .6 * Math.abs(Math.sin(t * .8 + tw * 6)));
        ctx.fillRect(sx * W, sy * H, sr, sr);
      }
    }

    // Atmosphere glow + sphere body
    ctx.globalAlpha = 1;
    if (R < Math.hypot(W, H)) { // atmosphere: a thin ring of light just outside the limb
      const glow = ctx.createRadialGradient(cx, cy, R, cx, cy, R * 1.22);
      glow.addColorStop(0, 'rgba(255,106,47,0.22)'); glow.addColorStop(1, 'rgba(255,106,47,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, Math.PI * 2); ctx.arc(cx, cy, R, 0, Math.PI * 2, true); ctx.fill();
    }
    const body = ctx.createRadialGradient(cx - R * .35, cy - R * .4, R * .1, cx, cy, R);
    body.addColorStop(0, colors.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)');
    body.addColorStop(1, colors.dark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.06)');
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // Land dots: coarse world + dense Arabia as we dive
    const denseA = clamp((zoom - 2.2) / 2);
    const dotBase = Math.max(1.6, Math.min(3, 1.7 * Math.sqrt(zoom)));
    ctx.fillStyle = colors.ink;
    for (let i = 0; i < n; i++) {
      const dense = i >= COARSE;
      if (dense && denseA <= 0) continue;
      const [x, y, z] = project(sLat[i], cLat[i], lonR[i]);
      if (z <= 0 || x < -4 || y < -4 || x > W + 4 || y > H + 4) continue;
      ctx.globalAlpha = (.3 + .7 * z) * (dense ? denseA * .85 : (1 - denseA * .4));
      const s = dotBase * (.55 + .45 * z);
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }

    // Arc Kajang → Riyadh (lifted above the surface)
    const arcT = Math.min(1, pFly * 1.05);
    if (arcT > 0) {
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2.2; ctx.strokeStyle = colors.accent; ctx.lineCap = 'round';
      ctx.beginPath();
      let pen = false, head = null;
      const N = 90;
      for (let k = 0; k <= N * arcT; k++) {
        const u = k / N, v = slerp(A, B, u), ll = toLatLon(v), h = 1 + .22 * Math.sin(Math.PI * u) * (1 - pDive * .85);
        const pt = project(Math.sin(ll.lat * RAD), Math.cos(ll.lat * RAD), ll.lon * RAD, h);
        const hidden = pt[2] < 0 && pt[3] * h < 1;
        if (hidden) { pen = false; continue; }
        pen ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]);
        pen = true; head = pt;
      }
      ctx.stroke();
      if (head && arcT < 1) { ctx.fillStyle = colors.accent; ctx.beginPath(); ctx.arc(head[0], head[1], 4.5, 0, Math.PI * 2); ctx.fill(); }
    }

    // City markers
    const marker = (c, strong, pulse) => {
      const pt = project(Math.sin(c.lat * RAD), Math.cos(c.lat * RAD), c.lon * RAD);
      if (pt[2] <= 0) return;
      ctx.globalAlpha = 1;
      ctx.fillStyle = strong ? colors.accent : colors.ink;
      ctx.beginPath(); ctx.arc(pt[0], pt[1], strong ? 6 : 4.5, 0, Math.PI * 2); ctx.fill();
      if (pulse) {
        const k = (t * .8) % 1;
        ctx.strokeStyle = colors.accent; ctx.lineWidth = 2; ctx.globalAlpha = 1 - k;
        ctx.beginPath(); ctx.arc(pt[0], pt[1], 6 + k * 34, 0, Math.PI * 2); ctx.stroke();
        if (pDive > .6) { // crosshair on arrival
          ctx.globalAlpha = (pDive - .6) / .4 * .8; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(pt[0] - 60, pt[1]); ctx.lineTo(pt[0] - 16, pt[1]); ctx.moveTo(pt[0] + 16, pt[1]); ctx.lineTo(pt[0] + 60, pt[1]);
          ctx.moveTo(pt[0], pt[1] - 60); ctx.lineTo(pt[0], pt[1] - 16); ctx.moveTo(pt[0], pt[1] + 16); ctx.lineTo(pt[0], pt[1] + 60); ctx.stroke();
        }
      }
    };
    marker(KAJANG, false, p < .32);
    marker(RIYADH, true, arcT >= 1);
    ctx.globalAlpha = 1;

    // HUD
    const step = p < .3 ? 0 : p < .66 ? 1 : 2;
    if (step !== lastStep) { steps.forEach((s, i) => s.classList.toggle('on', i === step)); lastStep = step; }
    const kmNow = Math.round(TOTAL_KM * arcT);
    if (kmNow !== lastKm) { roll(km, String(kmNow).padStart(String(TOTAL_KM).length, '0'), reduce); lastKm = kmNow; }
    coords.classList.toggle('on', pDive > .75);

    raf = visible ? requestAnimationFrame(draw) : 0;
  }

  readColors(); size();
  addEventListener('resize', () => { size(); });
  new MutationObserver(readColors).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColors);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(draw); }, { rootMargin: '100px' }).observe(section);
}
