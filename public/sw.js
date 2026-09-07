// وركِر الخدمة الأساسي لدعم العمل دون اتصال جزئيًا (تخزين الموارد الثابتة)
const STATIC_CACHE = 'lablims-static-v1';
const PAGE_CACHE = 'lablims-pages-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== STATIC_CACHE && k !== PAGE_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // نكتفي بالمسارات الداخلية فقط
  if (url.origin !== self.location.origin) return;

  // طلبات Next الثابتة: cache-first مع استعادة من الشبكة للتحديث
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // الصفحات والتنقلات: network-first، ومع فشل الشبكة نرجع آخر نسخة مخزنة
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(PAGE_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/technician/login')))
    );
  }
});