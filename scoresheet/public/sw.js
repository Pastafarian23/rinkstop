/**
 * RinkStop Scoresheet — service worker
 *
 * Responsibilities:
 *   1. Cache the app shell (HTML, CSS, JS, manifest, icons) for offline access.
 *   2. Network-first for navigation requests, falling back to the cached
 *      shell when offline.
 *   3. Cache-first for static assets (/_next/static/*, /icons, etc).
 *   4. Pass-through for /api/* (Clerk/Supabase calls); the offline event
 *      queue in IndexedDB handles the write side. Reads while offline will
 *      fail with a network error — that's intentional; the dashboard
 *      shows a "you're offline" banner.
 *   5. Listen for 'sync' events (Background Sync API) to flush the
 *      offline event queue when connectivity returns. Fallback: flush
 *      on every page load if online.
 *
 * Versioning: bump CACHE_NAME on any breaking shell change. Old caches
 * are pruned on activate.
 */

const CACHE_NAME = 'rinkstop-scoresheet-v1';
const SHELL_CACHE = `${CACHE_NAME}-shell`;
const RUNTIME_CACHE = `${CACHE_NAME}-runtime`;

// App shell — pages we want available offline.
const SHELL_URLS = [
  '/',
  '/scoresheet',
  '/favorites',
  '/manifest.json',
  '/offline',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE && k.startsWith('rinkstop-scoresheet-'))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET. POST/PUT/DELETE go to network; the offline queue
  // in the page handles the retry side.
  if (req.method !== 'GET') return;

  // Don't intercept Supabase/Clerk/other cross-origin API calls.
  if (url.origin !== self.location.origin) return;

  // Static assets — cache-first.
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/icon-') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/sw.js'
  ) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Navigation requests — network-first, fall back to cached shell, then offline.
  if (req.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(req));
    return;
  }

  // Everything else: try network, fall back to cache.
  event.respondWith(networkFirstWithCache(req));
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const resp = await fetch(req);
    if (resp.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, resp.clone()).catch(() => undefined);
    }
    return resp;
  } catch (err) {
    // Not in cache and no network.
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function networkFirstWithCache(req) {
  try {
    const resp = await fetch(req);
    if (resp.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, resp.clone()).catch(() => undefined);
    }
    return resp;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function networkFirstWithOfflineFallback(req) {
  try {
    const resp = await fetch(req);
    if (resp.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, resp.clone()).catch(() => undefined);
    }
    return resp;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    const offlinePage = await caches.match('/');
    if (offlinePage) return offlinePage;
    return new Response(
      '<!doctype html><html><body style="background:#0F172A;color:#F8FAFC;font-family:system-ui;padding:2rem"><h1>Offline</h1><p>RinkStop Scoresheet is offline. Reconnect to load the latest data.</p></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// Background Sync: when supported, the page can register a 'sync' tag
// and we'll attempt a flush here. The page-side code handles the
// actual queue flush; this listener is a hook for future enhancement.
self.addEventListener('sync', (event) => {
  if (event.tag === 'scoresheet-flush') {
    // Notify the active client to flush; the page owns the queue.
    event.waitUntil(notifyClientsToFlush());
  }
});

async function notifyClientsToFlush() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const c of clients) {
    c.postMessage({ type: 'flush-queue' });
  }
}
