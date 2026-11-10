// Voice commands (Web Speech API). A short, fixed list in English and Arabic.
// Hidden where the browser has no speech recognition.

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
  pill.innerHTML = '<span class="voice-wave"><i></i><i></i><i></i><i></i></span><span class="voice-text"></span>';
  document.body.append(pill);
  const text = pill.querySelector('.voice-text');
  let rec = null, listening = false;

  function stop() { if (rec) try { rec.abort(); } catch {} }
  function start() {
    if (listening) return stop();
    rec = new SR();
    rec.lang = root.lang === 'ar' ? 'ar-SA' : 'en-US';
    rec.interimResults = true; rec.maxAlternatives = 3; rec.continuous = false;
    listening = true;
    button.setAttribute('aria-pressed', 'true'); button.classList.add('on');
    pill.classList.add('on'); text.textContent = L().voiceListening;
    rec.onresult = e => {
      const res = e.results[e.results.length - 1];
      text.textContent = '“' + res[0].transcript + '”';
      if (!res.isFinal) return;
      let id = null;
      for (let i = 0; i < res.length && !id; i++) id = match(res[i].transcript);
      if (id) { run(id); toast('✓ ' + (L().voiceDone[id] || id)); }
      else toast(L().voiceMiss);
    };
    let heard = false, failed = false;
    const say = msg => { text.textContent = msg; pill.classList.add('on'); };
    rec.onresult = (orig => e => { heard = true; orig(e); })(rec.onresult);
    rec.onerror = e => {
      failed = true;
      console.warn('[voice] error:', e.error, e.message || '');
      const m = L().voiceErr[e.error];
      if (m) say(m); else if (e.error !== 'aborted') say(L().voiceErr.other + ' (' + e.error + ')');
    };
    rec.onend = () => {
      listening = false; button.setAttribute('aria-pressed', 'false'); button.classList.remove('on');
      if (!heard && !failed) say(L().voiceErr['no-speech']);
      setTimeout(() => pill.classList.remove('on'), heard ? 600 : 4500);
    };
    try { rec.start(); } catch (err) { listening = false; failed = true; console.warn('[voice] start failed', err); say(L().voiceErr.other); }
  }
  button.addEventListener('click', start);
  return { start };
}
