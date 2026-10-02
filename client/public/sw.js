// Purvaj 2.0 Progressive Web App Service Worker
const CACHE_NAME = 'purvaj-v2.1.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/pwa-192x192.svg',
  '/pwa-512x512.svg',
];

// Install Event: Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA SW] Pre-caching offline shell');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event: Cleanup stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Stale-while-revalidate for static files, Network-first for navigations
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Skip non-GET and chrome-extension/external requests
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) {
    return;
  }

  // API calls: Network only (never serve stale API writes/auth)
  if (req.url.includes('/api/')) {
    return;
  }

  // HTML Page Navigation: Network first, fall back to offline cached index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Static Assets (CSS, JS, Fonts, Images): Cache first, fallback to network
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((networkRes) => {
        if (networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkRes;
      });
    })
  );
});

// Push Notification Architecture Ready
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'Purvaj 2.0 Alert', message: event.data.text() };
    }
  }

  const title = data.title || 'Purvaj 2.0 Wholesale Update';
  const options = {
    body: data.message || 'New announcement from Central Warehouse.',
    icon: '/pwa-192x192.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: {
      url: data.action_url || '/shop/notifications',
    },
    actions: data.action_label
      ? [{ action: 'open_action', title: data.action_label }]
      : [{ action: 'open_inbox', title: 'Open Notification' }],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Handler: Deep link navigation
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/shop/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
