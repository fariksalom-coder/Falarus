/* Falarus PWA Service Worker
   - network-first for HTML navigations
   - network-first for JS/CSS so new deployments reflect immediately
   - fallback to cache if network fails
*/
/*
 * Versiya oshirilsa `activate` da eski kesh butunlay o'chiriladi.
 * v20: platforma logotipi yangilandi (`/icons/*`). Rasmlar bu SW'da
 * KESH-BIRINCHI olinadi, shuning uchun versiyani oshirmasak eski ikonka
 * foydalanuvchilarda qolib ketardi.
 * v21: jonli efir uchun push bildirishnomasi qo'shildi (`push` va
 * `notificationclick`) — ilova yopiq bo'lganda ham xabar keladi.
 * v22: push kelganda ochiq oynalarga xabar beriladi — qo'ng'iroq ekrani
 * darhol ko'tariladi va JIRINGLAYDI (SW o'zi ovoz chiqara olmaydi).
 */
const CACHE_NAME = 'falarus-pwa-v22';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  // User avatars and other uploads must always hit the network (avoid stale HTML/error bodies).
  if (url.pathname.startsWith('/uploads/')) return;

  // Always prefer the newest JS/CSS from the network.
  // Otherwise users may keep seeing old UI logic after a deployment.
  const isScriptOrStyle =
    request.destination === 'script' ||
    request.destination === 'style' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css');

  if (isScriptOrStyle) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok && res.type === 'basic' && request.method === 'GET') {
            const copy = res.clone();
            void caches.open(CACHE_NAME).then((cache) =>
              cache.put(request, copy).catch(() => {})
            );
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            // Last resort: try app shell
            return caches.match('/index.html');
          })
        )
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok && res.type === 'basic' && request.method === 'GET') {
            const clone = res.clone();
            void caches.open(CACHE_NAME).then((cache) =>
              cache.put(request, clone).catch(() => {})
            );
          }
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          if (res.ok && res.type === 'basic' && request.method === 'GET') {
            const clone = res.clone();
            void caches.open(CACHE_NAME).then((cache) =>
              cache.put(request, clone).catch(() => {})
            );
          }
          return res;
        })
        .catch(() => Response.error());
    })
  );
});

/* ---------------------------------------------------------------------------
   PUSH — jonli efir boshlanganda, ilova YOPIQ bo'lsa ham.

   Server `{ title, body, url, tag }` yuboradi. `requireInteraction` qo'yilgan:
   qo'ng'iroqday bildirishnoma o'zi yo'qolib ketmasin, odam ko'rib javob
   bersin. Bosilganda ochiq oyna bo'lsa o'shanga o'tamiz, bo'lmasa yangisini
   ochamiz — ikkinchi nusxa ochilib qolmasligi uchun.
--------------------------------------------------------------------------- */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || 'FalaRus';
  const url = data.url || '/';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'falarus',
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 200, 300],
    data: { url },
    actions: [{ action: 'join', title: "Qo'shilish" }],
  };

  /*
   * ILOVA OCHIQ BO'LSA — jiringlatamiz. Service worker o'zi ovoz chiqara
   * olmaydi (unda Audio yo'q), shuning uchun ochiq oynalarga xabar beramiz:
   * ular qo'ng'iroq ekranini DARHOL ko'taradi va ohangni chaladi. Aks holda
   * ekran keyingi tekshiruvgacha (25 s) kutib turardi.
   */
  const uygot = self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clientList) => {
      for (const client of clientList) client.postMessage({ turi: 'efir-qongiroq', url });
    })
    .catch(() => undefined);

  event.waitUntil(Promise.all([self.registration.showNotification(title, options), uygot]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          // Ochiq oyna bor — o'shani ko'tarib, kerakli sahifaga o'tkazamiz.
          return client.focus().then((c) => (c && 'navigate' in c ? c.navigate(url) : c));
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
