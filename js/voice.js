// Voice commands (Web Speech API). A short, fixed list in English and Arabic.
import { voiceOut } from './speak.js';
// AB answers out loud. Hidden where the browser has no speech recognition.

const COMMANDS = [
  { id: 'projects', words: ['project', 'work', 'مشاريع', 'المشاريع', 'أعمال', 'اعمال'] },
  { id: 'experience', words: ['experience', 'career', 'خبرات', 'الخبرات', 'خبرة'] },
  { id: 'playground', words: ['playground', 'play', 'demo', 'جرب', 'العروض'] },
  { id: 'skills', words: ['skill', 'stack', 'مهارات', 'المهارات'] },
  { id: 'terminal', words: ['terminal', 'console', 'الطرفية', 'طرفية'] },
  { id: 'contact', words: ['contact', 'email', 'hire', 'تواصل', 'اتصال', 'ايميل', 'بريد', 'وظف'] },
  { id: 'top', words: ['top', 'home', 'start', 'البداية', 'الرئيسية', 'فوق'] },
  { id: 'dark', words: ['dark', 'night', 'داكن', 'ليلي', 'ظلام', 'غامق'] },
  { id: 'light', words: ['light', 'day', 'فاتح', 'نهاري'] },
  { id: 'arabic', words: ['arabic', 'عربي', 'العربية'] },
  { id: 'english', words: ['english', 'انجليزي', 'إنجليزي', 'الإنجليزية'] },
  { id: 'cv', words: ['cv', 'resume', 'سيرة', 'السيرة'] },
  { id: 'break', words: ['break', 'اكسر', 'كسر'] },
  { id: 'who', words: ['who is', 'who are', 'about ahmed', 'tell me about', 'introduce', 'مين', 'من هو', 'من انت', 'عرفني', 'عن أحمد', 'عن احمد'] },
  { id: 'study', words: ['study', 'studied', 'university', 'degree', 'education', 'gpa', 'درس', 'دراسة', 'جامعة', 'تخرج', 'المعدل'] },
  { id: 'where', words: ['where', 'live', 'based', 'location', 'وين', 'أين', 'يسكن', 'مكان'] },
  { id: 'hello', words: ['hello', 'hi ab', 'hey', 'مرحبا', 'هلا', 'السلام'] },
  { id: 'intro', words: ['intro', 'video', 'film', 'فيديو', 'المقطع', 'الفيلم', 'التعريف'] },
  { id: 'present', words: ['present', 'presentation', 'slides', 'عرض تقديمي', 'العرض'] },
];

function match(text) {
  const t = ' ' + text.toLowerCase().trim() + ' ';
  // Prefer the longest matching word so "عرض تقديمي" wins over shorter hits.
  let best = null, len = 0;
  for (const c of COMMANDS) for (const w of c.words) if (t.includes(w) && w.length > len) { best = c.id; len = w.length; }
  return best;
}

export function initVoice({ button, L, run, toast }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR || !button) { if (button) button.hidden = true; return null; }
  const root = document.documentElement;
  const pill = document.createElement('div');
  pill.className = 'voice-pill';
  pill.setAttribute('role', 'status');
  pill.innerHTML = '<span class="voice-wave"><i></i><i></i><i></i><i></i></span><span class="voice-body"><span class="voice-text"></span><span class="voice-hints"></span></span>';
  document.body.append(pill);
  const text = pill.querySelector('.voice-text');
  const hintsEl = pill.querySelector('.voice-hints');
  let rec = null, listening = false;

  function stop() { if (rec) try { rec.abort(); } catch {} }
  const say = (msg, hints) => {
    text.textContent = msg;
    hintsEl.textContent = hints ? L().voiceHints : '';
    pill.classList.add('on');
  };
  function start(retry) {
    voiceOut.stop();
    if (listening && retry !== true) return stop();
    rec = new SR();
    rec.lang = root.lang === 'ar' ? 'ar-SA' : 'en-US';
    rec.interimResults = true; rec.maxAlternatives = 3; rec.continuous = false;
    listening = true;
    let done = false, heard = false, failed = false, last = '';
    button.setAttribute('aria-pressed', 'true'); button.classList.add('on');
    say(L().voiceListening, true);
    const act = transcripts => {
      for (const t of transcripts) {
        const id = match(t);
        if (id) { done = true; const ans = (L().abSay || {})[id]; if (ans) { say(ans); voiceOut.speak(ans); } else { say('✓ ' + (L().voiceDone[id] || id)); voiceOut.speak((L().abOk || '') + ' ' + (L().voiceDone[id] || '')); } run(id); try { rec.stop(); } catch {} return true; }
      }
      return false;
    };
    rec.onresult = e => {
      if (done) return;
      heard = true;
      const res = e.results[e.results.length - 1];
      const alts = Array.from(res, a => a.transcript);
      last = alts[0];
      text.textContent = '“' + last + '”';
      if (act(alts)) return;                 // act as soon as a command word is heard
      if (res.isFinal) { done = true; say(L().voiceMiss, true); voiceOut.speak(L().voiceMiss); }
    };
    rec.onerror = e => {
      failed = true;
      console.warn('[voice] error:', e.error, e.message || '');
      if (e.error === 'no-speech' && retry !== true) { failed = false; return; } // retried in onend
      const m = L().voiceErr[e.error];
      if (m) say(m); else if (e.error !== 'aborted') say(L().voiceErr.other + ' (' + e.error + ')');
    };
    rec.onend = () => {
      listening = false; button.setAttribute('aria-pressed', 'false'); button.classList.remove('on');
      if (!done && last && act([last])) return finish(900);     // Chrome sometimes ends without a final result
      if (!heard && !failed && retry !== true) return start(true); // heard nothing: listen once more
      if (!done && !failed) say(heard ? L().voiceMiss : L().voiceErr['no-speech'], true);
      finish(done ? 900 : 5000);
    };
    try { rec.start(); } catch (err) { listening = false; console.warn('[voice] start failed', err); say(L().voiceErr.other); finish(5000); }
  }
  let hideT;
  function finish(ms) { clearTimeout(hideT); hideT = setTimeout(() => { if (!listening) pill.classList.remove('on'); }, ms); }
  button.addEventListener('click', () => start());
  return { start: () => start() };
}
