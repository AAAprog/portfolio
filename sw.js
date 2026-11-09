// Offline + fast repeat visits.
// Pages: network-first (always fresh when online). Assets: stale-while-revalidate.
const VERSION = 'ab-v5';
const CORE = ['./', 'index.html', 'css/style.css', 'js/main.js', 'js/i18n.js', 'js/hero.js', 'js/play.js',
  'js/motion.js', 'js/terminal.js', 'js/roll.js', 'js/stage.js', 'js/loader.js', 'js/form.js',
  'js/glass.js', 'js/signature.js', 'js/signmark.js',
  'favicon.svg', '404.html', 'manifest.webmanifest', 'assets/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(cached => {
    const net = fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => cached);
    return cached || net;
  }));
});
