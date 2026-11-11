// AB — a small greeting assistant, and Video mode (the intro film, full screen).
// The bubble appears once, a moment after the loader, types its message, and
// offers three choices. Dismissing it is remembered. Video mode loads the film
// only when opened, starts muted (browsers block sound without a click) and
// unmutes on the visitor's own click.

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || root.dataset.motion === 'off';
const KEY = 'ab-assistant-done';
const store = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};

const TXT = {
  en: {
    hi: "Hi, I'm AB, Ahmed Bawazir's assistant. Want to get to know Ahmed in 85 seconds?",
    watch: '▶ Watch the intro', projects: 'Show me the projects', later: "I'll browse",
    close: 'Close', name: 'AB · assistant',
    vtitle: 'From Kuala Lumpur to Riyadh', talk: "Let's talk ↗", replay: '↺ Replay',
    mute: 'Sound on', unmute: 'Sound off', cc: 'Captions',
  },
  ar: {
    hi: 'هلا، أنا AB، مساعد أحمد باوزير. تبي تتعرّف على أحمد في 85 ثانية؟',
    watch: '▶ شاهد التعريف', projects: 'وريني المشاريع', later: 'بتصفّح بنفسي',
    close: 'إغلاق', name: 'AB · المساعد',
    vtitle: 'من كوالالمبور إلى الرياض', talk: 'لنتحدث ↗', replay: '↺ إعادة',
    mute: 'تشغيل الصوت', unmute: 'كتم الصوت', cc: 'الترجمة',
  },
};
const L = () => TXT[root.lang === 'ar' ? 'ar' : 'en'];

/* ───────── Video mode ───────── */
function createVideoMode() {
  const el = document.createElement('div');
  el.className = 'vmode';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.hidden = true;
  el.innerHTML = `
    <video class="vm-video" playsinline preload="none" poster="assets/intro-poster.jpg"></video>
    <div class="vm-top">
      <span class="vm-title"></span>
      <button type="button" class="vm-btn vm-close" aria-label="Close">✕</button>
    </div>
    <div class="vm-end" hidden>
      <a class="btn btn-solid vm-talk" href="#contact"></a>
      <button type="button" class="btn btn-ghost vm-replay"></button>
    </div>
    <div class="vm-bar">
      <button type="button" class="vm-btn vm-play" aria-label="Play or pause">❚❚</button>
      <div class="vm-track"><i></i></div>
      <span class="vm-time mono">0:00</span>
      <button type="button" class="vm-btn vm-sound"></button>
    </div>`;
  document.body.append(el);
  const v = el.querySelector('video');
  const play = el.querySelector('.vm-play'), sound = el.querySelector('.vm-sound');
  const track = el.querySelector('.vm-track'), fill = track.querySelector('i'), time = el.querySelector('.vm-time');
  const end = el.querySelector('.vm-end');
  let lastFocus = null, idle;

  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const label = () => {
    const t = L();
    el.querySelector('.vm-title').textContent = t.vtitle;
    el.querySelector('.vm-talk').textContent = t.talk;
    el.querySelector('.vm-replay').textContent = t.replay;
    sound.textContent = v.muted ? '🔇 ' + t.mute : '🔊 ' + t.unmute;
  };
  const wake = () => { el.classList.add('ui'); clearTimeout(idle); idle = setTimeout(() => { if (!v.paused) el.classList.remove('ui'); }, 2600); };

  v.addEventListener('timeupdate', () => {
    const k = v.duration ? v.currentTime / v.duration : 0;
    fill.style.transform = `scaleX(${k})`; time.textContent = fmt(v.currentTime);
  });
  v.addEventListener('play', () => { play.textContent = '❚❚'; end.hidden = true; wake(); });
  v.addEventListener('pause', () => { play.textContent = '▶'; el.classList.add('ui'); });
  v.addEventListener('ended', () => { end.hidden = false; el.classList.add('ui'); });
  play.addEventListener('click', () => (v.paused ? v.play() : v.pause()));
  v.addEventListener('click', () => (v.paused ? v.play() : v.pause()));
  sound.addEventListener('click', () => { v.muted = !v.muted; label(); });
  track.addEventListener('click', e => { const r = track.getBoundingClientRect(); v.currentTime = ((e.clientX - r.left) / r.width) * (v.duration || 0); });
  el.querySelector('.vm-replay').addEventListener('click', () => { v.currentTime = 0; v.play(); });
  el.querySelector('.vm-talk').addEventListener('click', () => close());
  el.querySelector('.vm-close').addEventListener('click', () => close());
  el.addEventListener('pointermove', wake);
  addEventListener('keydown', e => {
    if (el.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === ' ' || e.key === 'k') { e.preventDefault(); v.paused ? v.play() : v.pause(); }
    else if (e.key === 'm') { v.muted = !v.muted; label(); }
  }, true);

  function open() {
    lastFocus = document.activeElement;
    if (!v.src) { v.src = 'assets/intro.mp4'; v.load(); }
    v.muted = false; // opened by a click, so sound is allowed
    label();
    el.hidden = false; root.classList.add('vmode-on');
    requestAnimationFrame(() => el.classList.add('on'));
    try { el.requestFullscreen && el.requestFullscreen().catch(() => {}); } catch {}
    v.currentTime = 0;
    v.play().catch(() => { v.muted = true; label(); v.play().catch(() => {}); });
    el.querySelector('.vm-close').focus({ preventScroll: true });
  }
  function close() {
    v.pause(); el.classList.remove('on'); root.classList.remove('vmode-on');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setTimeout(() => { el.hidden = true; }, 300);
    lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
  }
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && !el.hidden) close(); });
  document.addEventListener('langchange', label);
  return { open, close };
}

/* ───────── AB bubble ───────── */
export function initAssistant({ goProjects }) {
  const video = createVideoMode();
  document.querySelectorAll('[data-action="intro"]').forEach(b => b.addEventListener('click', () => video.open()));

  const bubble = document.createElement('aside');
  bubble.className = 'abot';
  bubble.setAttribute('aria-live', 'polite');
  bubble.innerHTML = `
    <div class="abot-head"><span class="abot-av">AB</span><span class="abot-name mono"></span>
      <button type="button" class="abot-x" aria-label="Close">✕</button></div>
    <p class="abot-msg"><span class="abot-text"></span><span class="abot-caret"></span></p>
    <div class="abot-actions">
      <button type="button" class="btn btn-solid btn-sm abot-watch"></button>
      <button type="button" class="btn btn-ghost btn-sm abot-proj"></button>
      <button type="button" class="abot-later"></button>
    </div>`;
  document.body.append(bubble);
  const text = bubble.querySelector('.abot-text');
  const label = () => {
    const t = L();
    bubble.querySelector('.abot-name').textContent = t.name;
    bubble.querySelector('.abot-watch').textContent = t.watch;
    bubble.querySelector('.abot-proj').textContent = t.projects;
    bubble.querySelector('.abot-later').textContent = t.later;
    bubble.querySelector('.abot-x').setAttribute('aria-label', t.close);
    if (bubble.classList.contains('typed')) text.textContent = t.hi;
  };
  const dismiss = () => { store.set(KEY, '1'); bubble.classList.remove('on'); setTimeout(() => bubble.remove(), 400); };
  bubble.querySelector('.abot-watch').addEventListener('click', () => { dismiss(); video.open(); });
  bubble.querySelector('.abot-proj').addEventListener('click', () => { dismiss(); goProjects(); });
  bubble.querySelector('.abot-later').addEventListener('click', dismiss);
  bubble.querySelector('.abot-x').addEventListener('click', dismiss);
  document.addEventListener('langchange', label);
  label();

  if (store.get(KEY)) { bubble.remove(); return video; }

  const show = () => {
    // on small phones, wait until the visitor has scrolled a little
    const ready = () => {
      bubble.classList.add('on');
      const msg = L().hi;
      if (reduce) { text.textContent = msg; bubble.classList.add('typed'); return; }
      let i = 0;
      const tick = () => { text.textContent = msg.slice(0, ++i); if (i < msg.length) setTimeout(tick, 26); else bubble.classList.add('typed'); };
      setTimeout(tick, 350);
    };
    if (innerWidth < 560) {
      const onScroll = () => { if (scrollY > 200) { removeEventListener('scroll', onScroll); ready(); } };
      addEventListener('scroll', onScroll, { passive: true });
    } else ready();
  };
  const start = () => setTimeout(show, 2600);
  if (root.classList.contains('is-loading')) document.addEventListener('loader:done', start, { once: true });
  else start();
  return video;
}
