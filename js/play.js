// Playground demos: bug hunt, absence accrual simulator, live validation rules.
import { dyn } from './i18n.js';

const t = () => dyn[document.documentElement.lang === 'ar' ? 'ar' : 'en'];
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);

/* ───────────── Bug hunt ───────────── */
export function initBugHunt(root, toast) {
  const found = new Set();
  const qtyEl = root.querySelector('.qty');
  const totalEl = root.querySelector('.total');
  const list = root.querySelector('.bug-reports');
  const score = root.querySelector('.found');
  const scoreWrap = root.querySelector('.bug-score');
  let q = 2;

  const render = () => {
    qtyEl.textContent = q;
    totalEl.textContent = `SAR ${(q * 450 + 50).toLocaleString('en')}`; // the planted bug
  };

  const report = id => {
    if (found.has(id)) return;
    found.add(id);
    const [code, title, body] = t().bugs[id];
    const li = document.createElement('li');
    li.dataset.bug = id;
    li.innerHTML = `<p class="br-title"><span class="br-id"></span><span class="br-t"></span></p><p class="br-body"></p>`;
    li.querySelector('.br-id').textContent = code;
    li.querySelector('.br-t').textContent = title;
    li.querySelector('.br-body').textContent = fmt(body, { q, shown: (q * 450 + 50).toLocaleString('en'), right: (q * 450).toLocaleString('en') });
    list.prepend(li);
    score.textContent = found.size;
    if (found.size === 4) {
      scoreWrap.classList.add('done'); toast(t().allFound);
      const r = scoreWrap.getBoundingClientRect();
      document.dispatchEvent(new CustomEvent('celebrate', { detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 } }));
    }
  };

  root.addEventListener('click', e => {
    const step = e.target.closest('.step');
    if (step) {
      q += Number(step.dataset.step);
      render();
      if (q < 1) { qtyEl.classList.add('is-found'); report('qty'); }
      return;
    }
    const target = e.target.closest('.bug-target');
    if (target) { target.classList.add('is-found'); report(target.dataset.bug); return; }
    if (e.target.closest('.checkout')) toast(t().notBug);
  });
  render();

  return { relabel() {
    list.querySelectorAll('li').forEach(li => {
      const [code, title, body] = t().bugs[li.dataset.bug];
      li.querySelector('.br-t').textContent = title;
      li.querySelector('.br-body').textContent = fmt(body, { q, shown: (q * 450 + 50).toLocaleString('en'), right: (q * 450).toLocaleString('en') });
    });
  } };
}

/* ───────────── Absence accrual ───────────── */
export function initAccrual(root) {
  const svg = root.querySelector('.chart');
  const inputs = [...root.querySelectorAll('input[type=range]')];
  const outs = Object.fromEntries([...root.querySelectorAll('[data-out]')].map(o => [o.dataset.out, o]));
  const balEl = root.querySelector('.acc-bal');
  const lostEl = root.querySelector('.acc-lost');
  const NS = 'http://www.w3.org/2000/svg';
  const M = 24, W = 360, H = 150, pad = { l: 22, r: 4, t: 8, b: 18 };
  const bw = (W - pad.l - pad.r) / M;
  const el = (n, a) => { const x = document.createElementNS(NS, n); for (const k in a) x.setAttribute(k, a[k]); return x; };

  // Build static scaffolding once; update attributes after.
  svg.append(el('line', { class: 'axis', x1: pad.l, x2: W - pad.r, y1: H - pad.b, y2: H - pad.b }));
  const bars = [], lost = [];
  for (let i = 0; i < M; i++) {
    const x = pad.l + i * bw + 1.5;
    const b = el('rect', { class: 'bar' + (i >= 12 ? ' y2' : ''), x, width: bw - 3, rx: 1.5 });
    const l = el('rect', { class: 'lost', x, width: bw - 3, rx: 1.5 });
    svg.append(l, b); bars.push(b); lost.push(l);
  }
  const cap = el('line', { class: 'cap', x1: pad.l, x2: W - pad.r });
  const capLabel = el('text', { x: W - pad.r, 'text-anchor': 'end' });
  const yMax = el('text', { x: pad.l - 4, y: pad.t + 6, 'text-anchor': 'end' });
  const lbl1 = el('text', { x: pad.l + bw * 6, y: H - 4, 'text-anchor': 'middle' });
  const lbl2 = el('text', { x: pad.l + bw * 18, y: H - 4, 'text-anchor': 'middle' });
  lbl1.textContent = 'Y1'; lbl2.textContent = 'Y2';
  svg.append(cap, capLabel, yMax, lbl1, lbl2);

  function update() {
    const v = Object.fromEntries(inputs.map(i => [i.name, Number(i.value)]));
    inputs.forEach(i => i.style.setProperty('--p', ((i.value - i.min) / (i.max - i.min)) * 100 + '%'));
    const d = t().days;
    outs.rate.textContent = `${v.rate} ${d}`;
    outs.cap.textContent = `${v.cap} ${d}`;
    outs.taken.textContent = `${v.taken} ${d}`;

    let bal = 0, forfeited = 0;
    const series = [];
    for (let m = 1; m <= M; m++) {
      bal += v.rate;
      if (m === 7 || m === 19) bal = Math.max(0, bal - v.taken);
      let lostNow = 0;
      if (m % 12 === 0 && bal > v.cap) { lostNow = bal - v.cap; forfeited += lostNow; }
      series.push({ bal, lostNow });
      bal -= lostNow;
    }
    const max = Math.max(36, ...series.map(s => s.bal));
    const sy = val => (H - pad.b) - (val / max) * (H - pad.t - pad.b);
    series.forEach((s, i) => {
      const kept = s.bal - s.lostNow;
      bars[i].setAttribute('y', sy(kept)); bars[i].setAttribute('height', (H - pad.b) - sy(kept));
      lost[i].setAttribute('y', sy(s.bal)); lost[i].setAttribute('height', Math.max(0, sy(kept) - sy(s.bal)));
    });
    const cy = sy(v.cap);
    cap.setAttribute('y1', cy); cap.setAttribute('y2', cy);
    capLabel.setAttribute('y', cy - 4); capLabel.textContent = `cap ${v.cap}`;
    yMax.textContent = Math.round(max);
    balEl.textContent = `${+bal.toFixed(2)} ${d}`;
    lostEl.textContent = `${+forfeited.toFixed(2)} ${d}`;
  }
  inputs.forEach(i => i.addEventListener('input', update));
  update();
  return { relabel: update };
}

/* ───────────── Validation rules ───────────── */
export function initRules(root) {
  const form = root.querySelector('form');
  const list = root.querySelector('.tests');
  const f = form.elements;
  const iso = d => d.toISOString().slice(0, 10);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const hire = new Date(today); hire.setDate(hire.getDate() - 30);
  const prob = new Date(hire); prob.setDate(prob.getDate() + 90);
  f.hire.value = iso(hire); f.prob.value = iso(prob);

  function run() {
    const L = t().tests;
    const emp = f.emp.value.trim();
    const h = f.hire.value ? new Date(f.hire.value + 'T00:00') : null;
    const p = f.prob.value ? new Date(f.prob.value + 'T00:00') : null;
    const days = (a, b) => Math.round((b - a) / 864e5);
    const tests = [
      [L.emp, /^E-\d{4,5}$/.test(emp), 'emp'],
      [L.hireReq, !!h, 'hire'],
      [L.hireFuture, !!h && days(today, h) <= 90, 'hire'],
      [L.probAfter, !!h && !!p && p > h, 'prob'],
      [L.probLen, !!h && !!p && days(h, p) >= 90 && days(h, p) <= 180, 'prob'],
    ];
    const bad = new Set(tests.filter(x => !x[1]).map(x => x[2]));
    ['emp', 'hire', 'prob'].forEach(n => f[n].classList.toggle('bad', bad.has(n)));
    list.innerHTML = '';
    let pass = 0;
    tests.forEach(([label, ok]) => {
      if (ok) pass++;
      const li = document.createElement('li');
      li.className = ok ? 'pass' : 'fail';
      li.innerHTML = `<span class="st">${ok ? 'PASS' : 'FAIL'}</span><span dir="auto"></span>`;
      li.lastChild.textContent = label;
      list.append(li);
    });
    const sum = document.createElement('li');
    sum.className = 'sum';
    sum.textContent = fmt(L.sum, { p: pass, f: tests.length - pass });
    list.append(sum);
  }
  form.addEventListener('input', run);
  form.addEventListener('submit', e => e.preventDefault());
  run();
  return { relabel: run };
}
