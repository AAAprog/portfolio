// Presentation mode: the page becomes a deck. Each section is a slide; arrow
// keys / Space move between them, full screen where allowed, Esc to leave.

const NAMES = {
  en: { hero: 'Intro', about: 'About', experience: 'Experience', projects: 'Projects', playground: 'Playground', skills: 'Skills', journey: 'Journey', credentials: 'Credentials', terminal: 'Terminal', contact: 'Contact' },
  ar: { hero: 'المقدمة', about: 'نبذة', experience: 'الخبرات', projects: 'المشاريع', playground: 'العروض', skills: 'المهارات', journey: 'الرحلة', credentials: 'الشهادات', terminal: 'الطرفية', contact: 'التواصل' },
};

export function initPresent({ L, toast }) {
  const root = document.documentElement;
  const slides = [...document.querySelectorAll('main > [data-section]')];
  const hud = document.createElement('div');
  hud.className = 'present-hud mono';
  hud.innerHTML = `<button type="button" class="ph-btn ph-prev" aria-label="Previous slide">←</button>
    <span class="ph-count"></span><span class="ph-name"></span>
    <span class="ph-bar"><i></i></span>
    <button type="button" class="ph-btn ph-next" aria-label="Next slide">→</button>
    <button type="button" class="ph-exit">Esc</button>`;
  document.body.append(hud);
  let on = false, idx = 0;

  const lang = () => (root.lang === 'ar' ? 'ar' : 'en');
  const label = () => {
    const id = slides[idx].dataset.section;
    hud.querySelector('.ph-count').textContent = `${String(idx + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    hud.querySelector('.ph-name').textContent = NAMES[lang()][id] || id;
    hud.querySelector('.ph-bar i').style.transform = `scaleX(${(idx + 1) / slides.length})`;
  };
  const go = i => {
    idx = Math.max(0, Math.min(slides.length - 1, i));
    slides[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
    label();
  };
  const nearest = () => {
    let best = 0, d = Infinity;
    slides.forEach((s, i) => { const t = Math.abs(s.getBoundingClientRect().top); if (t < d) { d = t; best = i; } });
    return best;
  };

  function enter() {
    if (on) return;
    on = true; root.classList.add('presenting');
    try { root.requestFullscreen && root.requestFullscreen().catch(() => {}); } catch {}
    idx = nearest(); go(idx);
    toast(L().presentOn);
  }
  function exit() {
    if (!on) return;
    on = false; root.classList.remove('presenting');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  addEventListener('keydown', e => {
    if (!on) return;
    if (/input|textarea/i.test(document.activeElement.tagName)) return;
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(k)) { e.preventDefault(); go(idx + (root.dir === 'rtl' && k === 'ArrowRight' ? -1 : 1)); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(k)) { e.preventDefault(); go(idx - (root.dir === 'rtl' && k === 'ArrowLeft' ? -1 : 1)); }
    else if (k === 'Home') { e.preventDefault(); go(0); }
    else if (k === 'End') { e.preventDefault(); go(slides.length - 1); }
    else if (k === 'Escape') exit();
  }, true);
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && on) exit(); });
  hud.querySelector('.ph-prev').addEventListener('click', () => go(idx - 1));
  hud.querySelector('.ph-next').addEventListener('click', () => go(idx + 1));
  hud.querySelector('.ph-exit').addEventListener('click', exit);
  addEventListener('scroll', () => { if (on) { const n = nearest(); if (n !== idx) { idx = n; label(); } } }, { passive: true });

  return { toggle: () => (on ? exit() : enter()), get on() { return on; } };
}
