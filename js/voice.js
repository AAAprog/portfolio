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
    rec.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast(L().voiceDenied); };
    rec.onend = () => { listening = false; button.setAttribute('aria-pressed', 'false'); button.classList.remove('on'); setTimeout(() => pill.classList.remove('on'), 500); };
    try { rec.start(); } catch { listening = false; }
  }
  button.addEventListener('click', start);
  return { start };
}
