/* 拾店 service worker —— 壳离线可用，数据在 IndexedDB 里，不缓存 /api */
const VER = 'shidian-static-v3';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VER).map(k => caches.delete(k)))
      .then(() => self.clients.claim()))
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;           // 同步请求永远走网络
  if (url.origin !== location.origin) return;

  // 页面导航：先网络，断网回壳
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(VER).then(c => c.put('./index.html', copy));
        return r;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 静态资源：先缓存，没有再取并补进缓存
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok && r.type === 'basic') {
        const copy = r.clone();
        caches.open(VER).then(c => c.put(e.request, copy));
      }
      return r;
    }).catch(() => hit))
  );
});
