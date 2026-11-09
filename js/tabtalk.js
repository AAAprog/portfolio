// The browser tab talks: when the visitor switches away, the tab title cycles
// short messages and the favicon gets a blinking orange badge; on return it
// says welcome back, then restores itself.

const MSG = {
  en: ['👀 Still there?', '🐞 1 bug left unfound', 'Ahmed is still available', '⌛ Your next hire is waiting'],
  ar: ['👀 ما زلت هنا؟', '🐞 بقي خطأ لم تكتشفه', 'أحمد ما زال متاحاً', '⌛ موظفك القادم ينتظر'],
};
const BACK = { en: 'Welcome back 👋', ar: 'أهلاً بعودتك 👋' };

function badgeIcon(withBadge) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.beginPath(); x.roundRect ? x.roundRect(0, 0, 64, 64, 14) : x.rect(0, 0, 64, 64); x.fill();
  x.fillStyle = '#f3f1ec'; x.font = '700 28px "Space Grotesk", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('AB', 29, 35);
  if (withBadge) {
    x.fillStyle = '#ff5a1f'; x.beginPath(); x.arc(50, 14, 13, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#000'; x.font = '700 18px Arial, sans-serif'; x.fillText('!', 50, 15);
  }
  return c.toDataURL('image/png');
}

export function initTabTalk() {
  const icon = document.querySelector('link[rel="icon"]');
  const lang = () => (document.documentElement.lang === 'ar' ? 'ar' : 'en');
  let savedTitle = document.title, savedIcon = icon && icon.href, timer = 0, startT = 0, talked = false, backT = 0;
  let iconOn = null, iconOff = null;

  const setIcon = href => { if (icon) icon.href = href; };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimeout(backT);
      savedTitle = document.title; savedIcon = icon && icon.href;
      iconOn = iconOn || badgeIcon(true); iconOff = iconOff || badgeIcon(false);
      startT = setTimeout(() => {
        talked = true;
        let i = 0;
        const tick = () => { const m = MSG[lang()]; document.title = m[i % m.length]; setIcon(i % 2 ? iconOff : iconOn); i++; };
        tick();
        timer = setInterval(tick, 2400);
      }, 800);
    } else {
      clearTimeout(startT); clearInterval(timer);
      if (!talked) return;
      talked = false;
      document.title = BACK[lang()];
      setIcon(iconOff);
      backT = setTimeout(() => { document.title = savedTitle; if (savedIcon) setIcon(savedIcon); }, 2200);
    }
  });
}
