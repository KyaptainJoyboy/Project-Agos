const CACHE_VERSION = 'agos-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const MAP_CACHE = `${CACHE_VERSION}-maps`;
const ROUTE_CACHE = `${CACHE_VERSION}-routes`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

const MAX_DYNAMIC_CACHE_SIZE = 50;
const MAX_MAP_CACHE_SIZE = 100;

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS.filter(url => url !== '/icon-192.png' && url !== '/icon-512.png'));
    }).catch(err => {
      console.error('[SW] Failed to cache static assets:', err);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('agos-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== MAP_CACHE && name !== ROUTE_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.pathname.includes('/functions/v1/') || url.hostname.includes('supabase')) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    return;
  }

  if (url.pathname.includes('/tiles/') || url.hostname.includes('tiles') || url.hostname.includes('mapbox')) {
    event.respondWith(cacheFirst(request, MAP_CACHE));
    return;
  }

  if (url.pathname.includes('/routes/') || url.pathname.includes('/route-packages/')) {
    event.respondWith(cacheFirst(request, ROUTE_CACHE));
    return;
  }

  if (STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname.startsWith('/assets/'))) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      limitCacheSize(cacheName, cacheName === MAP_CACHE ? MAX_MAP_CACHE_SIZE : MAX_DYNAMIC_CACHE_SIZE);
    }
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    if (request.destination === 'document') {
      const cached = await caches.match('/index.html');
      if (cached) return cached;
    }
    throw error;
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      limitCacheSize(cacheName, MAX_DYNAMIC_CACHE_SIZE);
    }
    return response;
  } catch (error) {
    console.error('[SW] Network request failed, trying cache:', error);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    if (request.destination === 'document') {
      const indexCached = await caches.match('/index.html');
      if (indexCached) return indexCached;
    }

    throw error;
  }
}

async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxSize) {
    await cache.delete(keys[0]);
    limitCacheSize(cacheName, maxSize);
  }
}

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  } else if (event.tag === 'sync-location') {
    event.waitUntil(syncLocation());
  } else if (event.tag === 'sync-reports') {
    event.waitUntil(syncReports());
  }
});

async function syncMessages() {
  console.log('[SW] Syncing offline messages...');
  const db = await openDB();
  const messages = await getFromDB(db, 'pendingMessages');

  for (const message of messages) {
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      if (response.ok) {
        await deleteFromDB(db, 'pendingMessages', message.id);
      }
    } catch (error) {
      console.error('[SW] Failed to sync message:', error);
    }
  }
}

async function syncLocation() {
  console.log('[SW] Syncing location updates...');
}

async function syncReports() {
  console.log('[SW] Syncing road condition reports...');
}

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const data = event.data ? event.data.json() : {};
  const title = data.title || 'AGOS Alert';
  const options = {
    body: data.body || 'New update available',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.priority === 'high',
    tag: data.tag || 'agos-notification'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_ROUTES') {
    event.waitUntil(cacheRoutes(event.data.routes));
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  }
});

async function cacheRoutes(routes) {
  const cache = await caches.open(ROUTE_CACHE);
  for (const route of routes) {
    if (route.url) {
      try {
        const response = await fetch(route.url);
        if (response.ok) {
          await cache.put(route.url, response);
        }
      } catch (error) {
        console.error('[SW] Failed to cache route:', error);
      }
    }
  }
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(name => caches.delete(name))
  );
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('agos-db', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getFromDB(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function deleteFromDB(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

console.log('[SW] Service worker script loaded');
