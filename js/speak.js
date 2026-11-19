// AB's voice (Web Speech synthesis). Browsers only allow speech after the
// visitor has interacted with the page, so unlock() queues the first line
// until the first tap, click or key press.
const root = document.documentElement;
const synth = window.speechSynthesis;
const MUTE = 'ab-voice-muted';
let muted = false; try { muted = localStorage.getItem(MUTE) === '1'; } catch {}
let unlocked = false, pending = null;

// Pick the most natural voice the device has. Neural / premium voices sound human; the old
// compact ones sound robotic. Arabic prefers a Saudi voice (ar-SA), English a clear US/UK one.
const NATURAL = /(natural|neural|premium|enhanced|online|siri|wavenet)/i;
const ROBOTIC = /(compact|espeak|eloquence|novelty|bad news|bells|boing|bubbles|cellos|whisper|zarvox|trinoids|albert|jester|organ|superstar|wobble|fred|junior|ralph|kathy|grandma|grandpa|rocko|shelley|flo|reed|sandy)/i;
function score(v, lang) {
  let s = 0;
  if (lang === 'ar') {
    if (/^ar[-_]SA/i.test(v.lang)) s += 40; else if (/^ar[-_](AE|KW|QA|BH|OM)/i.test(v.lang)) s += 25; else if (/^ar/i.test(v.lang)) s += 10;
    if (/(majed|maged|hamed|zariyah|tarik|laila|mariam|fahed)/i.test(v.name)) s += 20;
  } else {
    if (/^en[-_](US|GB)/i.test(v.lang)) s += 30; else if (/^en/i.test(v.lang)) s += 10;
    if (/(ava|zoe|evan|nathan|andrew|brian|emma|jenny|aria|guy|samantha|daniel|serena|google us english|google uk english)/i.test(v.name)) s += 15;
  }
  if (NATURAL.test(v.name)) s += 35;
  if (ROBOTIC.test(v.name)) s -= 60;
  if (v.localService === false) s += 5; // cloud voices are usually the neural ones
  return s;
}
function pick(lang) {
  const vs = (synth ? synth.getVoices() : []).filter(v => (lang === 'ar' ? /^ar/i : /^en/i).test(v.lang));
  return vs.sort((a, b) => score(b, lang) - score(a, lang))[0] || null;
}
// Make the text sound like speech: no emoji or arrows, say the letters A B, skip the long email address.
function speechText(text, lang) {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}▶↗↺✓👇👌👋🙏😄😅]/gu, '')
    .replace(/\bAB\b/g, 'A B')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, lang === 'ar' ? 'إيميله اللي في قسم التواصل' : 'the email in the contact section')
    .replace(/\s+/g, ' ').trim();
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
    // the voice follows the text's own language, not just the page's
    const lang = /[\u0600-\u06FF]/.test(text) ? 'ar' : /[a-z]/i.test(text) ? 'en' : (root.lang === 'ar' ? 'ar' : 'en');
    const v = pick(lang);
    const u = new SpeechSynthesisUtterance(speechText(text, lang));
    u.lang = v ? v.lang : (lang === 'ar' ? 'ar-SA' : 'en-US');
    if (v) { try { u.voice = v; } catch {} } voiceOut.lastVoice = v && v.name;
    // natural voices sound best near normal speed; robotic ones a little slower
    const nat = v && NATURAL.test(v.name);
    u.rate = nat ? 0.98 : 0.9; u.pitch = 1;
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
