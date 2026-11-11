// AB's voice (Web Speech synthesis). Browsers only allow speech after the
// visitor has interacted with the page, so unlock() queues the first line
// until the first tap, click or key press.
const root = document.documentElement;
const synth = window.speechSynthesis;
const MUTE = 'ab-voice-muted';
let muted = false; try { muted = localStorage.getItem(MUTE) === '1'; } catch {}
let unlocked = false, pending = null;

function pick(lang) {
  const vs = synth ? synth.getVoices() : [];
  const want = lang === 'ar' ? /^ar/i : /^en/i;
  const pref = lang === 'ar' ? /(maged|tarik|hamed|laila|google)/i : /(daniel|google uk english male|samantha|google us|aaron|alex)/i;
  return vs.filter(v => want.test(v.lang)).sort((a, b) => pref.test(b.name) - pref.test(a.name))[0] || null;
}

export const voiceOut = {
  ok: !!synth,
  get muted() { return muted; },
  setMuted(m) { muted = m; try { localStorage.setItem(MUTE, m ? '1' : ''); } catch {} if (m) this.stop(); },
  stop() { if (synth) synth.cancel(); },
  speak(text, { onend } = {}) {
    if (!synth || muted) { onend && onend(); return; }
    // Try straight away (some browsers allow it); if blocked, say it on the first tap.
    if (!unlocked && navigator.userActivation && !navigator.userActivation.hasBeenActive) { pending = { text, onend }; tryNow(text, onend); return; }
    synth.cancel();
    const lang = root.lang === 'ar' ? 'ar' : 'en';
    const u = new SpeechSynthesisUtterance(text.replace(/[▶↗↺✓]/g, ''));
    u.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    const v = pick(lang); if (v) u.voice = v;
    u.rate = 0.88; u.pitch = 1;
    u.onstart = () => { unlocked = true; pending = null; document.dispatchEvent(new Event('ab:speaking')); };
    u.onend = () => onend && onend();
    u.onerror = e => { if (e.error === 'not-allowed') { pending = { text, onend }; document.dispatchEvent(new Event('ab:needtap')); } else onend && onend(); };
    synth.speak(u);
  },
};

function tryNow(text, onend) {
  const was = unlocked; unlocked = true;
  voiceOut.speak(text, { onend });
  unlocked = was;
  // No start within a moment means the browser is holding it back.
  setTimeout(() => { if (!unlocked && pending) { synth.cancel(); document.dispatchEvent(new Event('ab:needtap')); } }, 900);
}

if (synth) {
  synth.getVoices(); synth.addEventListener && synth.addEventListener('voiceschanged', () => synth.getVoices());
  const unlock = () => {
    if (unlocked) return; unlocked = true;
    ['pointerdown', 'keydown', 'touchend'].forEach(e => removeEventListener(e, unlock, true));
    if (pending) { const p = pending; pending = null; voiceOut.speak(p.text, p); }
  };
  ['pointerdown', 'keydown', 'touchend'].forEach(e => addEventListener(e, unlock, true));
}
