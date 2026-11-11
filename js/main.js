import { ar, dyn } from './i18n.js';
import { initHero } from './hero.js';
import { initLiquidBg } from './liquidbg.js';
import { initMotion } from './motion.js';
import { initTerminal } from './terminal.js';
import { roll } from './roll.js';
import { initStages } from './stage.js';
import { initLoader } from './loader.js';
import { initForm } from './form.js';
import { initSignature } from './signature.js';
import { initSignmarks } from './signmark.js';
import { initChaos } from './chaos.js';
import { initAssistant } from './assistant.js';
import { initTabTalk } from './tabtalk.js';
import { createAmbient } from './ambient.js';
import { initVoice } from './voice.js';
import { initPresent } from './present.js';

initLoader();

const root = document.documentElement;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
const L = () => dyn[root.lang === 'ar' ? 'ar' : 'en'];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off';

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
  document.dispatchEvent(new CustomEvent('langchange'));
}

/* ───────────── Theme ───────────── */
function isDark() {
  const t = root.dataset.theme;
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
}
// Theme switch: a circular View Transition that grows from the click point.
// Theme cycles light → dark → auto (room light / clock).
const ambient = createAmbient(t => applyTheme(t, null, true), src => toast(src === 'sensor' ? L().themeAutoSensor : L().themeAutoClock));
function toggleTheme(origin) {
  const mode = root.dataset.themeMode === 'auto' ? 'auto' : (isDark() ? 'dark' : 'light');
  const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light';
  if (next === 'auto') { root.dataset.themeMode = 'auto'; store.set('ab-theme-mode', 'auto'); ambient.start(); return; }
  ambient.stop(); delete root.dataset.themeMode; store.set('ab-theme-mode', '');
  toast(next === 'dark' ? L().themeDark : L().themeLight);
  applyTheme(next, origin);
}
function applyTheme(next, origin, quiet) {
  if (root.dataset.theme === next && quiet) return;
  const go = () => { root.dataset.theme = next; store.set('ab-theme', next); hero && hero.refresh(); };
  if (!document.startViewTransition || reduce) return go();
  const x = origin ? origin.x : innerWidth / 2, y = origin ? origin.y : innerHeight / 2;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  root.classList.add('vt-theme');
  const vt = document.startViewTransition(go);
  vt.ready.then(() => {
    root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' });
  }).catch(() => {});
  vt.finished.finally(() => root.classList.remove('vt-theme'));
}
// Language switch: a soft cross-fade View Transition.
function switchLang() {
  const next = root.lang === 'ar' ? 'en' : 'ar';
  if (!document.startViewTransition || reduce) return applyLang(next);
  document.startViewTransition(() => applyLang(next));
}
// Motion preference toggle (saved; reload applies it to every module cleanly).
function toggleMotion() {
  const off = root.dataset.motion !== 'off';
  store.set('ab-motion', off ? 'off' : 'on');
  try { sessionStorage.setItem('ab-scroll', String(scrollY)); } catch {}
  location.reload();
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

/* ───────────── Counters (rolling digits) ───────────── */
const fmtCount = el => parseFloat(el.dataset.count).toFixed(+(el.dataset.decimals || 0));
$$('[data-count]').forEach(el => roll(el, fmtCount(el).replace(/\d/g, '0'), true));
const cio = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    roll(e.target, fmtCount(e.target), reduce);
  });
}, { threshold: 0.6 });
$$('[data-count]').forEach(el => cio.observe(el));

/* ───────────── Scroll-linked: statement, git line, status bar ───────────── */
const topbar = $('.topbar');
const sbSection = $('.sb-section'), sbPct = $('.sb-pct'), sbProg = $('.sb-progress');
const gitlog = $('.gitlog');
const sections = $$('[data-section]');
const navLinks = $$('.toplinks a');

// Words light up one by one as the text scrolls through the screen (the About statement,
// section intros and the contact line). The next word fades in partially, so it feels continuous.
function updateStatement() {
  $$('[data-split]').forEach(el => {
    const words = $$('.w', el);
    if (reduce) { words.forEach(w => { w.classList.add('on'); w.style.opacity = ''; }); return; }
    const r = el.getBoundingClientRect(), vh = innerHeight;
    const big = el.classList.contains('statement-text');
    const p = Math.min(1, Math.max(0, (vh * (big ? 0.85 : 0.92) - r.top) / (r.height + vh * (big ? 0.35 : 0.25))));
    const x = p * words.length;
    words.forEach((w, i) => {
      const k = Math.min(1, Math.max(0, x - i));
      w.classList.toggle('on', k >= 1);
      w.style.opacity = k >= 1 ? '' : (0.16 + 0.84 * k).toFixed(2);
    });
  });
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
    ['skills', c.skills, '§', go('skills')],
    ['credentials', c.credentials, '§', go('credentials')],
    ['terminal', c.terminal, '>_', go('terminal')],
    ['contact', c.contact, '§', go('contact')],
    ['cv', c.cv, 'pdf', () => { const a = document.createElement('a'); a.href = 'assets/Ahmed_Bawazir_CV.pdf'; a.download = ''; a.click(); }],
    ['email', c.email, '⌘C', copyEmail],
    ['mail', c.mail, '✉', () => { location.href = 'mailto:' + EMAIL; }],
    ['linkedin', c.linkedin, '↗', () => open('https://www.linkedin.com/in/ahmed-bawazir-14b472383/', '_blank', 'noopener')],
    ['github', c.github, '↗', () => open('https://github.com/aaaprog', '_blank', 'noopener')],
    ['theme', c.theme, '◐', () => toggleTheme()],
    ['lang', c.lang, 'ع/EN', switchLang],
    ['motion', c.motion, '◎', toggleMotion],
    ['keys', c.keys, '?', openKeys],
    ['break', c.break, 'B', () => chaos && chaos.break()],
    ['intro', c.intro, '▶', () => intro.open()],
    ['present', c.present, 'P', () => present.toggle()],
    ['voice', c.voice, 'V', () => voice ? voice.start() : toast(L().voiceNone)],
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
  palInput.value = ''; palSel = 0; renderPalette();
  pal.showModal();
  palInput.focus();
}
function closePalette() { if (pal.open) pal.close(); }
pal.addEventListener('close', () => { lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); });
pal.addEventListener('click', e => { if (e.target === pal) closePalette(); }); // click on ::backdrop
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
  else if (e.key === 'Tab') { e.preventDefault(); palInput.focus(); }
});
addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.open ? closePalette() : openPalette(); }
  else if (e.key === '/' && !pal.open && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); openPalette(); }
});

/* ───────────── Global actions ───────────── */
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const a = btn.dataset.action;
  if (a === 'theme') toggleTheme(e.detail ? { x: e.clientX, y: e.clientY } : null);
  else if (a === 'lang') switchLang();
  else if (a === 'motion') toggleMotion();
  else if (a === 'palette') openPalette();
  else if (a === 'keys') openKeys();
  else if (a === 'break') chaos && chaos.break();
  else if (a === 'present') present.toggle();
  else if (a === 'copy-email') copyEmail();
});

/* ───────────── Live Riyadh clock ───────────── */
function initClock() {
  const h = $('.clock-h'), m = $('.clock-m'), day = $('.clock-day'), status = $('.clock-status'), card = $('.b-clock');
  if (!h) return;
  const tz = 'Asia/Riyadh';
  let first = true;
  const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const partsFmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', hourCycle: 'h23' });
  function tick() {
    const now = new Date();
    const [hh, mm] = timeFmt.format(now).split(':');
    roll(h, hh, first || reduce); roll(m, mm, first || reduce); first = false;
    const lang = root.lang === 'ar' ? 'ar' : 'en';
    day.textContent = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'short' }).format(now);
    const p = Object.fromEntries(partsFmt.formatToParts(now).map(x => [x.type, x.value]));
    const work = !['Fri', 'Sat'].includes(p.weekday) && +p.hour >= 8 && +p.hour < 18; // Saudi work week: Sun–Thu
    card.classList.toggle('is-open', work);
    status.textContent = work ? L().hoursOpen : L().hoursClosed;
  }
  tick();
  setTimeout(() => { tick(); setInterval(tick, 60000); }, (60 - new Date().getSeconds()) * 1000);
  document.addEventListener('langchange', tick);
}

/* ───────────── Keyboard shortcuts ───────────── */
const keysDlg = $('.keys');
function openKeys() { if (!keysDlg.open) keysDlg.showModal(); }
keysDlg.addEventListener('click', e => { if (e.target === keysDlg || e.target.closest('.keys-close')) keysDlg.close(); });
let lastG = 0;
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
  if (/input|textarea|select/i.test(document.activeElement.tagName) || document.activeElement.isContentEditable) return;
  if (pal.open || root.classList.contains('is-loading')) return;
  const k = e.key.toLowerCase();
  if (e.key === '?') { e.preventDefault(); keysDlg.open ? keysDlg.close() : openKeys(); }
  else if (keysDlg.open) return;
  else if (k === 't') toggleTheme();
  else if (k === 'l') switchLang();
  else if (k === 'm') toggleMotion();
  else if (k === 'c') copyEmail();
  else if (k === 'b') chaos && chaos.break();
  else if (k === 'p') present.toggle();
  else if (k === 'v') voice ? voice.start() : toast(L().voiceNone);
  else if (k === 'g') { const now = Date.now(); if (now - lastG < 500) scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); lastG = now; }
});

/* ───────────── Offline / installable (service worker) ───────────── */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* ───────────── Boot ───────────── */
try { const y = sessionStorage.getItem('ab-scroll'); if (y) { sessionStorage.removeItem('ab-scroll'); history.scrollRestoration = 'manual'; requestAnimationFrame(() => scrollTo(0, +y)); } } catch {}
const mBtn = $('.sb-motion'); if (mBtn) mBtn.setAttribute('aria-pressed', String(root.dataset.motion !== 'off'));
initClock();
initStages();
$$('.year').forEach(y => { y.textContent = new Date().getFullYear(); });
initLiquidBg($('.hero-liquid'));
const hero = initHero($('.hero-canvas'));
modules = [];
initTerminal($('.term'));
initForm($('.cform'), toast, L);
initSignature($('.signature'));
initSignmarks();
var chaos = initChaos(L, toast);
function runCmd(id) {
    const sec = { projects: 'projects', experience: 'experience', skills: 'skills', terminal: 'terminal', contact: 'contact', top: 'hero' }[id];
    if (sec) return go(sec)();
    if (id === 'dark' || id === 'light') { ambient.stop(); delete root.dataset.themeMode; store.set('ab-theme-mode', ''); return applyTheme(id); }
    if (id === 'arabic' && root.lang !== 'ar') return switchLang();
    if (id === 'english' && root.lang === 'ar') return switchLang();
    if (id === 'cv') { const a = document.createElement('a'); a.href = 'assets/Ahmed_Bawazir_CV.pdf'; a.download = ''; a.click(); return; }
    if (id === 'break') return chaos && chaos.break();
    if (id === 'present') return present.toggle();
    if (id === 'intro') return intro.open();
}
var intro = initAssistant({ goProjects: () => go('projects')(), ask: () => voice ? voice.start() : toast(L().voiceNone),
  act: { projects: () => go('projects')(), contact: () => go('contact')(), intro: () => intro.open(),
    cv: () => runCmd('cv'), dark: () => runCmd('dark'), light: () => runCmd('light'), break: () => runCmd('break') } });
initTabTalk();
var present = initPresent({ L, toast });
var voice = initVoice({
  button: $('.voice-btn'), L, toast, chat: q => intro.chat(q),
  run: id => runCmd(id),

});
if (store.get('ab-theme-mode') === 'auto') { root.dataset.themeMode = 'auto'; ambient.start(); }
if (root.lang === 'ar') applyLang('ar'); else { splitStatement(); typer.start(); }
initMotion();
onScroll();
