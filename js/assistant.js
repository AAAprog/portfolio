import { voiceOut } from './speak.js';
import { answer, SUGGEST } from './abchat.js';
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
    say: {
      about: "That's Ahmed in one line: code and configuration.",
      experience: 'His career, written like git commits. Very him.',
      projects: "This first one is Codai, Ahmed's graduation project.",
      skills: 'His whole toolbox. Try the filters.',
      credentials: 'Certified, and fluent in two languages. Like me.',
      terminal: 'Type help here. Or try: sudo hire ahmed 😉',
      contact: 'This is the part where you say hi.',
    },
    tap: '🔊 Tap anywhere to hear me', ask: '💬 Ask me anything', ph: 'Ask about Ahmed…', send: 'Send', mic: 'Speak', watch: '▶ Watch the intro', projects: 'Show me the projects', later: "I'll browse",
    close: 'Close', name: 'AB · assistant',
    vtitle: 'From Kuala Lumpur to Riyadh', talk: "Let's talk ↗", replay: '↺ Replay',
    mute: 'Sound on', unmute: 'Sound off', cc: 'Captions',
  },
  ar: {
    hi: 'هلا، أنا AB، مساعد أحمد باوزير. تبي تتعرّف على أحمد في 85 ثانية؟',
    say: {
      about: 'هذا أحمد بسطر واحد: برمجة وتهيئة أنظمة.',
      experience: 'خبراته مكتوبة كأنها commits. هذا أسلوبه.',
      projects: 'أول واحد Codai، مشروع تخرّج أحمد.',
      skills: 'كل أدواته هنا. جرّب الفلاتر.',
      credentials: 'شهادات، ولغتين بطلاقة. مثلي.',
      terminal: 'اكتب help هنا. أو جرّب: sudo hire ahmed 😉',
      contact: 'هنا تقول له هلا.',
    },
    tap: '🔊 المس الشاشة عشان تسمعني', ask: '💬 اسألني أي شي', ph: 'اسأل عن أحمد…', send: 'إرسال', mic: 'تكلّم', watch: '▶ شاهد التعريف', projects: 'وريني المشاريع', later: 'بتصفّح بنفسي',
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
    <button type="button" class="vm-big" aria-label="Play">▶</button>
    <p class="vm-rotate mono" aria-hidden="true">↻ Rotate your phone for full screen</p>
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
    sound.textContent = v.muted ? '🔇' : '🔊';
    sound.setAttribute('aria-label', v.muted ? t.mute : t.unmute); sound.title = v.muted ? t.mute : t.unmute;
  };
  const wake = () => { el.classList.add('ui'); clearTimeout(idle); idle = setTimeout(() => { if (!v.paused) el.classList.remove('ui'); }, 2600); };

  v.addEventListener('timeupdate', () => {
    const k = v.duration ? v.currentTime / v.duration : 0;
    fill.style.transform = `scaleX(${k})`; time.textContent = fmt(v.currentTime);
  });
  v.addEventListener('play', () => { play.textContent = '❚❚'; end.hidden = true; el.classList.remove('paused'); wake(); });
  v.addEventListener('pause', () => { play.textContent = '▶'; el.classList.add('ui', 'paused'); });
  el.querySelector('.vm-big').addEventListener('click', () => v.play());
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

  const touch = matchMedia('(pointer: coarse)').matches;
  const iosNative = touch && typeof v.webkitEnterFullscreen === 'function' && !el.requestFullscreen;
  // Make sure the browser knows the video's size before a phone asks for native full screen.
  const prime = () => { if (!v.src) { v.preload = 'metadata'; v.src = 'assets/intro.mp4'; } };
  if (touch) prime();
  function open() {
    lastFocus = document.activeElement;
    prime();
    v.muted = false; // opened by a click, so sound is allowed
    label();
    el.hidden = false; root.classList.add('vmode-on');
    requestAnimationFrame(() => el.classList.add('on'));
    v.currentTime = 0;
    const p = v.play();
    if (iosNative) {
      // iPhone: the native player rotates and fills the screen like any video
      v.controls = true;
      try { v.webkitEnterFullscreen(); } catch {}
    } else {
      try {
        const fs = el.requestFullscreen ? el.requestFullscreen() : Promise.reject();
        fs.then(() => { if (touch && screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); }).catch(() => {});
      } catch {}
    }
    p && p.catch && p.catch(() => { v.muted = true; label(); v.play().catch(() => {}); });
    el.querySelector('.vm-close').focus({ preventScroll: true });
  }
  v.addEventListener('webkitendfullscreen', () => { v.controls = false; close(); });
  function close() {
    v.pause(); el.classList.remove('on'); root.classList.remove('vmode-on');
    try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch {}
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setTimeout(() => { el.hidden = true; }, 300);
    lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
  }
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && !el.hidden) close(); });
  document.addEventListener('langchange', label);
  return { open, close };
}

/* ───────── AB bubble ───────── */
export function initAssistant({ goProjects, ask, act = {} }) {
  const video = createVideoMode();
  document.querySelectorAll('[data-action="intro"]').forEach(b => b.addEventListener('click', () => video.open()));

  const bubble = document.createElement('aside');
  bubble.className = 'abot';
  bubble.setAttribute('aria-live', 'polite');
  bubble.innerHTML = `
    <div class="abot-head"><span class="abot-av"><span class="abot-face" aria-hidden="true"><i class="ab-eye"></i><i class="ab-eye"></i><i class="ab-mouth"></i></span></span><span class="abot-name mono"></span>
      <button type="button" class="abot-snd" aria-label="Voice">🔊</button><button type="button" class="abot-x" aria-label="Close">✕</button></div>
    <p class="abot-tap mono" hidden></p><p class="abot-msg"><span class="abot-text"></span><span class="abot-caret"></span></p>
    <div class="abot-actions">
      <button type="button" class="btn btn-solid btn-sm abot-watch"></button>
      <button type="button" class="btn btn-ghost btn-sm abot-proj"></button>
      <button type="button" class="btn btn-ghost btn-sm abot-ask"></button>
      <button type="button" class="abot-later"></button>
    </div>
    <div class="abot-chat" hidden>
      <div class="abot-log" aria-live="polite"></div>
      <div class="abot-sugg"></div>
      <form class="abot-form"><input class="abot-in" type="text" autocomplete="off" enterkeyhint="send" maxlength="160">
        <button type="button" class="abot-mic" aria-label="Speak">🎤</button><button type="submit" class="abot-send" aria-label="Send">↑</button></form>
    </div>`;
  document.body.append(bubble);
  const text = bubble.querySelector('.abot-text');
  const snd = bubble.querySelector('.abot-snd');
  const chatEl = bubble.querySelector('.abot-chat'), log = bubble.querySelector('.abot-log'), sugg = bubble.querySelector('.abot-sugg');
  const input = bubble.querySelector('.abot-in');
  if (!voiceOut.ok) snd.hidden = true;
  const tapHint = bubble.querySelector('.abot-tap');
  document.addEventListener('ab:needtap', () => { tapHint.textContent = L().tap; tapHint.hidden = false; });
  document.addEventListener('ab:speaking', () => { tapHint.hidden = true; });
  const label = () => {
    const t = L();
    bubble.querySelector('.abot-name').textContent = t.name;
    bubble.querySelector('.abot-watch').textContent = t.watch;
    bubble.querySelector('.abot-proj').textContent = t.projects;
    bubble.querySelector('.abot-later').textContent = t.later;
    bubble.querySelector('.abot-ask').textContent = t.ask;
    input.placeholder = t.ph; bubble.querySelector('.abot-send').setAttribute('aria-label', t.send); bubble.querySelector('.abot-mic').setAttribute('aria-label', t.mic);
    sugg.innerHTML = ''; SUGGEST[root.lang === 'ar' ? 'ar' : 'en'].forEach(q => { const b = document.createElement('button'); b.type = 'button'; b.textContent = q; b.addEventListener('click', () => chat(q)); sugg.append(b); });
    snd.textContent = voiceOut.muted ? '🔇' : '🔊';
    bubble.querySelector('.abot-x').setAttribute('aria-label', t.close);
    if (bubble.classList.contains('typed')) text.textContent = t.hi;
  };
  // Closing collapses AB to a small avatar in the corner; tapping it opens the message again.
  const pill = document.createElement('button');
  pill.type = 'button'; pill.className = 'abot-pill';
  pill.innerHTML = '<span class="abot-face" aria-hidden="true"><i class="ab-eye"></i><i class="ab-eye"></i><i class="ab-mouth"></i></span><span class="abot-tip" role="status"></span>';
  document.body.append(pill);
  let typedOnce = false;
  const collapse = () => { store.set(KEY, '1'); bubble.classList.remove('on'); setTimeout(() => pill.classList.add('on'), 250); };
  const expand = () => { pill.classList.remove('on'); bubble.classList.add('on'); if (!bubble.classList.contains('chatting')) voiceOut.speak(L().hi); if (!typedOnce) type(); };
  pill.addEventListener('click', expand);
  bubble.querySelector('.abot-watch').addEventListener('click', () => { voiceOut.stop(); collapse(); video.open(); });
  bubble.querySelector('.abot-proj').addEventListener('click', () => { collapse(); goProjects(); });
  bubble.querySelector('.abot-later').addEventListener('click', () => { voiceOut.stop(); collapse(); });
  const openChat = () => {
    if (chatEl.hidden) { chatEl.hidden = false; bubble.classList.add('chatting'); if (!log.children.length) add('ab', L().open); }
    pill.classList.remove('on'); bubble.classList.add('on'); bubble.classList.add('typed');
  };
  bubble.querySelector('.abot-ask').addEventListener('click', () => { voiceOut.stop(); openChat(); setTimeout(() => input.focus({ preventScroll: true }), 50); });
  bubble.querySelector('.abot-mic').addEventListener('click', () => { voiceOut.stop(); ask && ask(); });
  bubble.querySelector('.abot-form').addEventListener('submit', e => { e.preventDefault(); const q = input.value.trim(); if (q) { input.value = ''; chat(q); } });
  const add = (who, txt) => { const p = document.createElement('p'); p.className = 'abot-m ' + who; p.dir = 'auto'; p.textContent = txt; log.append(p); log.scrollTop = log.scrollHeight; return p; };
  let busy = Promise.resolve();
  // One exchange: show the question, AB "thinks" briefly, then types and speaks the answer at a calm pace.
  function chat(q) {
    openChat(); voiceOut.stop();
    add('me', q);
    const a = answer(q, root.lang === 'ar' ? 'ar' : 'en');
    busy = busy.then(() => new Promise(done => {
      const p = add('ab', ''); p.classList.add('thinking'); p.dir = a.lang === 'ar' ? 'rtl' : 'ltr';
      setTimeout(() => {
        p.classList.remove('thinking');
        voiceOut.speak(a.text);
        let i = 0;
        const step = () => { p.textContent = a.text.slice(0, ++i); log.scrollTop = log.scrollHeight; if (i < a.text.length) setTimeout(step, reduce ? 0 : 28); else { done(); if (a.act && act[a.act]) setTimeout(act[a.act], 900); } };
        step();
      }, reduce ? 0 : 650);
    }));
    return a;
  }
  snd.addEventListener('click', () => { voiceOut.setMuted(!voiceOut.muted); label(); if (!voiceOut.muted) voiceOut.speak(L().hi); });
  bubble.querySelector('.abot-x').addEventListener('click', () => { voiceOut.stop(); collapse(); });
  document.addEventListener('langchange', () => { label(); pill.setAttribute('aria-label', L().name); });
  label(); pill.setAttribute('aria-label', L().name);

  function type() {
    typedOnce = true;
    const msg = L().hi;
    if (reduce) { text.textContent = msg; bubble.classList.add('typed'); return; }
    let i = 0;
    const tick = () => { text.textContent = msg.slice(0, ++i); if (i < msg.length) setTimeout(tick, 48); else bubble.classList.add('typed'); };
    setTimeout(tick, 250);
  }
  /* ── AB as a character: eyes follow the pointer and the scroll, it blinks, and it
     comments once on each section while the visitor scrolls down with it. ── */
  const tip = pill.querySelector('.abot-tip');
  const eyesOf = () => document.querySelectorAll('.abot-face');
  let lookX = 0, lookY = 0;
  const look = (x, y) => { lookX = Math.max(-1, Math.min(1, x)); lookY = Math.max(-1, Math.min(1, y)); eyesOf().forEach(f => { f.style.setProperty('--lx', lookX.toFixed(2)); f.style.setProperty('--ly', lookY.toFixed(2)); }); };
  addEventListener('pointermove', e => { const r = pill.getBoundingClientRect(); const cx = r.left + r.width / 2 || innerWidth - 50, cy = r.top + r.height / 2 || innerHeight - 80; look((e.clientX - cx) / (innerWidth / 2), (e.clientY - cy) / (innerHeight / 2)); }, { passive: true });
  let lastY = scrollY, scrollT;
  addEventListener('scroll', () => {
    const dy = scrollY - lastY; lastY = scrollY;
    if (Math.abs(dy) > 2) { look(lookX * 0.3, dy > 0 ? 0.9 : -0.9); pill.classList.add('moving'); clearTimeout(scrollT); scrollT = setTimeout(() => { pill.classList.remove('moving'); look(0, 0); }, 500); }
  }, { passive: true });
  if (!reduce) (function blink() { setTimeout(() => { eyesOf().forEach(f => f.classList.add('blink')); setTimeout(() => eyesOf().forEach(f => f.classList.remove('blink')), 140); blink(); }, 2600 + Math.random() * 3200); })();
  const seen = new Set(); let tipT;
  const comment = id => {
    const msg = (L().say || {})[id];
    if (!msg || seen.has(id) || !pill.classList.contains('on') || bubble.classList.contains('on')) return;
    seen.add(id);
    tip.textContent = msg; tip.dir = 'auto'; pill.classList.add('talking');
    clearTimeout(tipT); tipT = setTimeout(() => pill.classList.remove('talking'), 4200);
  };
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) comment(e.target.id); }), { threshold: 0.35 });
  Object.keys(TXT.en.say).forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
  // While the visitor scrolls past the hero with the greeting still open, AB shrinks into the character and comes along.
  addEventListener('scroll', () => { if (scrollY > innerHeight * 0.6 && bubble.classList.contains('on') && !bubble.classList.contains('chatting')) collapse(); }, { passive: true });

  // First visit: open the full greeting. Returning visitor who closed it: just the avatar.
  const start = () => setTimeout(() => (store.get(KEY) ? pill.classList.add('on') : expand()), 2200); // after the hero name has finished arriving
  if (root.classList.contains('is-loading')) document.addEventListener('loader:done', start, { once: true });
  else start();
  return Object.assign(video, { chat });
}
