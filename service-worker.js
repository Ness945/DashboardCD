// === SERVICE WORKER - PWA OFFLINE SUPPORT ===

const CACHE_NAME = 'michelin-cd-v1';
const CACHE_VERSION = '1.0.0';

// Fichiers à mettre en cache pour fonctionnement hors ligne
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/toast.css',
  '/loading.css',
  '/design-enhancements.css',
  '/comparative-stats.css',
  '/visual-alerts.css',
  '/app.js',
  '/toast.js',
  '/storage.js',
  '/validation.js',
  '/loading.js',
  '/undo-redo.js',
  '/shortcuts.js',
  '/charts.js',
  '/excel-export.js',
  '/analytics.js',
  '/insights-ui.js',
  '/advanced-filters.js',
  '/ui-enhancements.js',
  '/comparative-stats.js',
  '/visual-alerts.js',
  '/indexeddb-storage.js',
  '/manifest.json'
];

// CDN externes (optionnel - mise en cache si disponible)
const cdnUrls = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js'
];

// === INSTALLATION ===
self.addEventListener('install', (event) => {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {

        // Mettre en cache les fichiers locaux
        cache.addAll(urlsToCache).catch((err) => {
          console.warn('[Service Worker] Erreur cache fichiers locaux:', err);
        });

        // Mettre en cache les CDN (en mode no-cors pour éviter les erreurs CORS)
        cdnUrls.forEach((url) => {
          fetch(url, { mode: 'no-cors' })
            .then((response) => {
              cache.put(url, response);
            })
            .catch((err) => {
              console.warn('[Service Worker] CDN non disponible:', url);
            });
        });

        return cache;
      })
      .then(() => {
        // Forcer l'activation immédiate
        return self.skipWaiting();
      })
  );
});

// === ACTIVATION ===
self.addEventListener('activate', (event) => {

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Supprimer les anciens caches
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Prendre le contrôle immédiatement
        return self.clients.claim();
      })
  );
});

// === STRATÉGIE DE CACHE ===
// Cache-First pour les assets statiques
// Network-First pour les données dynamiques

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorer les requêtes vers chrome-extension://
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Stratégie Cache-First pour les assets statiques
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Stratégie Network-First pour tout le reste
  event.respondWith(networkFirst(request));
});

// === HELPERS ===

// Vérifier si c'est un asset statique
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.json', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2'];
  const pathname = url.pathname.toLowerCase();
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Stratégie Cache-First
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Retourner du cache immédiatement

    // Mettre à jour en arrière-plan
    updateCache(request);

    return cachedResponse;
  }

  // Si pas en cache, récupérer du réseau
  return fetchAndCache(request);
}

// Stratégie Network-First
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // Mettre en cache si la réponse est valide
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // En cas d'erreur réseau, essayer le cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Si rien en cache non plus, retourner une page d'erreur
    return new Response('Hors ligne - Ressource non disponible', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    });
  }
}

// Récupérer et mettre en cache
async function fetchAndCache(request) {
  try {
    const response = await fetch(request);

    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[Service Worker] Fetch failed:', error);
    throw error;
  }
}

// Mettre à jour le cache en arrière-plan
async function updateCache(request) {
  try {
    const response = await fetch(request);

    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response);
    }
  } catch (error) {
    // Ignorer les erreurs de mise à jour silencieuse
    console.warn('[Service Worker] Background update failed:', request.url);
  }
}

// === MESSAGES ===
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// === NOTIFICATIONS ===
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Michelin CD Dashboard', options)
  );
});

// === SYNC EN ARRIÈRE-PLAN (optionnel) ===
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-cd-data') {
    event.waitUntil(syncCDData());
  }
});

async function syncCDData() {
  // Placeholder pour sync future si serveur backend
}

