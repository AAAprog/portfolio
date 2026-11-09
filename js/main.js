import { ar, dyn } from './i18n.js';
import { initHero } from './hero.js';
import { initBugHunt, initAccrual, initRules } from './play.js';

const root = document.documentElement;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
const L = () => dyn[root.lang === 'ar' ? 'ar' : 'en'];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ───────────── Toast ───────────── */
const toastEl = $('.toast');
let toastT;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

/* ───────────── Statement: split into words ───────────── */
const HL = new Set(['code', 'configuration.', 'edge', 'case', 'الكود', 'والتهيئة.', 'الحالة', 'الحدّية']);
function splitStatement() {
  $$('[data-split]').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(w => `<span class="w${HL.has(w) ? ' hl' : ''}">${w}</span>`).join(' ');
  });
}

/* ───────────── i18n ───────────── */
const nodes = $$('[data-i18n]');
nodes.forEach(n => { n.dataset.en = n.innerHTML; });
let modules = [];

function applyLang(lang) {
  root.lang = lang;
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  nodes.forEach(n => {
    const key = n.dataset.i18n;
    n.innerHTML = lang === 'ar' && ar[key] ? ar[key] : n.dataset.en;
  });
  $('.lang-label').textContent = lang === 'ar' ? 'EN' : 'ع';
  $('.palette-input').placeholder = L().palettePh;
  document.title = lang === 'ar'
    ? 'أحمد باوزير — مهندس برمجيات واستشاري Oracle Fusion HCM'
    : 'Ahmed Bawazir — Software Engineer & Oracle Fusion HCM Consultant';
  splitStatement();
  updateStatement();
  typer.reset();
  modules.forEach(m => m.relabel && m.relabel());
  hero && hero.refresh();
  store.set('ab-lang', lang);
}

/* ───────────── Theme ───────────── */
function isDark() {
  const t = root.dataset.theme;
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
}
function toggleTheme() {
  const next = isDark() ? 'light' : 'dark';
  const go = () => { root.dataset.theme = next; store.set('ab-theme', next); hero && hero.refresh(); };
  if (document.startViewTransition && !reduce) document.startViewTransition(go); else go();
  toast(next === 'dark' ? L().themeDark : L().themeLight);
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => hero && hero.refresh());

/* ───────────── Typed role ───────────── */
const typer = (() => {
  const el = $('.typed');
  let i = 0, ch = 0, del = false, timer;
  function tick() {
    const words = L().roles, w = words[i % words.length];
    ch += del ? -1 : 1;
    el.textContent = w.slice(0, ch);
    let wait = del ? 35 : 70;
    if (!del && ch === w.length) { del = true; wait = 1800; }
    else if (del && ch === 0) { del = false; i++; wait = 350; }
    timer = setTimeout(tick, wait);
  }
  return {
    start() { if (reduce) { el.textContent = L().roles[0]; return; } tick(); },
    reset() { clearTimeout(timer); i = 0; ch = 0; del = false; this.start(); },
  };
})();

/* ───────────── Reveal on scroll ───────────── */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
$$('.reveal, .project, .map, .langs').forEach(el => io.observe(el));

/* ───────────── Counters ───────────── */
const cio = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target, to = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0);
    if (reduce) { el.textContent = to.toFixed(dec); return; }
    const t0 = performance.now(), dur = 1400;
    const f = now => {
      const p = Math.min(1, (now - t0) / dur), eased = 1 - Math.pow(1 - p, 4);
      el.textContent = (to * eased).toFixed(dec);
      if (p < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
}, { threshold: 0.6 });
$$('[data-count]').forEach(el => cio.observe(el));

/* ───────────── Scroll-linked: statement, git line, status bar ───────────── */
const topbar = $('.topbar');
const sbSection = $('.sb-section'), sbPct = $('.sb-pct'), sbProg = $('.sb-progress');
const gitlog = $('.gitlog');
const sections = $$('[data-section]');
const navLinks = $$('.toplinks a');

function updateStatement() {
  const el = $('.statement-text');
  if (!el) return;
  const words = $$('.w', el);
  if (reduce) { words.forEach(w => w.classList.add('on')); return; }
  const r = el.getBoundingClientRect(), vh = innerHeight;
  const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
  const n = Math.round(p * words.length);
  words.forEach((w, i) => w.classList.toggle('on', i < n));
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? y / max : 0;
    topbar.classList.toggle('is-scrolled', y > 20);
    sbPct.textContent = Math.round(p * 100);
    sbProg.style.setProperty('--p', p.toFixed(4));
    updateStatement();

    if (gitlog) {
      const r = gitlog.getBoundingClientRect();
      const d = Math.min(1, Math.max(0, (innerHeight * 0.7 - r.top) / r.height));
      gitlog.style.setProperty('--draw', d.toFixed(3));
    }

    let current = sections[0];
    for (const s of sections) if (s.getBoundingClientRect().top < innerHeight * 0.4) current = s;
    const id = current.dataset.section;
    if (sbSection.textContent !== id) {
      sbSection.textContent = id;
      navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
    }
  });
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);

/* ───────────── Skills filter ───────────── */
const tabs = $$('.tab');
tabs.forEach(tab => tab.addEventListener('click', () => {
  tabs.forEach(t => { t.classList.toggle('is-on', t === tab); t.setAttribute('aria-selected', t === tab); });
  const f = tab.dataset.filter;
  $$('.skill-group').forEach(g => g.classList.toggle('dim', f !== 'all' && !g.dataset.group.split(' ').includes(f)));
}));

/* ───────────── Copy email ───────────── */
const EMAIL = 'aaa.bawazir0@gmail.com';
async function copyEmail() {
  const state = $('.copy-state');
  try {
    await navigator.clipboard.writeText(EMAIL);
    toast(L().copied);
    if (state) { state.textContent = L().copyState; setTimeout(() => applyText(state), 2200); }
  } catch { toast(L().copyFail); }
}
function applyText(n) { n.innerHTML = root.lang === 'ar' && ar[n.dataset.i18n] ? ar[n.dataset.i18n] : n.dataset.en; }

/* ───────────── Command palette ───────────── */
const pal = $('.palette'), palInput = $('.palette-input'), palList = $('.palette-list');
let palItems = [], palSel = 0, lastFocus = null;
const go = id => () => document.getElementById(id).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
const commands = () => {
  const c = L().cmds;
  return [
    ['experience', c.experience, '§', go('experience')],
    ['projects', c.projects, '§', go('projects')],
    ['playground', c.playground, '§', go('playground')],
    ['skills', c.skills, '§', go('skills')],
    ['journey', c.journey, '§', go('journey')],
    ['credentials', c.credentials, '§', go('credentials')],
    ['contact', c.contact, '§', go('contact')],
    ['cv', c.cv, 'pdf', () => { const a = document.createElement('a'); a.href = 'assets/Ahmed_Bawazir_CV.pdf'; a.download = ''; a.click(); }],
    ['email', c.email, '⌘C', copyEmail],
    ['mail', c.mail, '✉', () => { location.href = 'mailto:' + EMAIL; }],
    ['linkedin', c.linkedin, '↗', () => open('https://www.linkedin.com/in/ahmed-bawazir-14b472383/', '_blank', 'noopener')],
    ['github', c.github, '↗', () => open('https://github.com/aaaprog', '_blank', 'noopener')],
    ['theme', c.theme, '◐', toggleTheme],
    ['lang', c.lang, 'ع/EN', () => applyLang(root.lang === 'ar' ? 'en' : 'ar')],
    ['top', c.top, '↑', go('hero')],
  ];
};
function renderPalette() {
  const q = palInput.value.trim().toLowerCase();
  palItems = commands().filter(([id, label]) => !q || label.toLowerCase().includes(q) || id.includes(q));
  palSel = Math.min(palSel, Math.max(0, palItems.length - 1));
  palList.innerHTML = '';
  if (!palItems.length) {
    const li = document.createElement('li'); li.className = 'empty'; li.textContent = L().noMatch; palList.append(li); return;
  }
  palItems.forEach(([id, label, hint], i) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option'); li.setAttribute('aria-selected', i === palSel); li.dataset.i = i;
    li.innerHTML = '<span></span><span class="hint"></span>';
    li.firstChild.textContent = label; li.lastChild.textContent = hint;
    palList.append(li);
  });
}
function openPalette() {
  lastFocus = document.activeElement;
  pal.hidden = false; palInput.value = ''; palSel = 0; renderPalette();
  requestAnimationFrame(() => palInput.focus());
}
function closePalette() { pal.hidden = true; lastFocus && lastFocus.focus && lastFocus.focus(); }
function runPalette(i) { const item = palItems[i]; if (!item) return; closePalette(); item[3](); }
palInput.addEventListener('input', () => { palSel = 0; renderPalette(); });
palList.addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (li) runPalette(+li.dataset.i); });
palList.addEventListener('mousemove', e => {
  const li = e.target.closest('li[data-i]'); if (!li || +li.dataset.i === palSel) return;
  palSel = +li.dataset.i; $$('li[data-i]', palList).forEach(x => x.setAttribute('aria-selected', +x.dataset.i === palSel));
});
pal.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    palSel = (palSel + (e.key === 'ArrowDown' ? 1 : -1) + palItems.length) % Math.max(1, palItems.length);
    renderPalette();
    const sel = $('li[aria-selected="true"]', palList); sel && sel.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') { e.preventDefault(); runPalette(palSel); }
  else if (e.key === 'Escape') closePalette();
  else if (e.key === 'Tab') { e.preventDefault(); palInput.focus(); }
});
addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? openPalette() : closePalette(); }
  else if (e.key === '/' && pal.hidden && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); openPalette(); }
});

/* ───────────── Global actions ───────────── */
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const a = btn.dataset.action;
  if (a === 'theme') toggleTheme();
  else if (a === 'lang') applyLang(root.lang === 'ar' ? 'en' : 'ar');
  else if (a === 'palette') openPalette();
  else if (a === 'palette-close') closePalette();
  else if (a === 'copy-email') copyEmail();
});

/* ───────────── Boot ───────────── */
$$('.year').forEach(y => { y.textContent = new Date().getFullYear(); });
const hero = initHero($('.hero-canvas'));
modules = [
  initBugHunt($('#bughunt'), toast),
  initAccrual($('#accrual')),
  initRules($('#rules')),
];
if (root.lang === 'ar') applyLang('ar'); else { splitStatement(); typer.start(); }
onScroll();
