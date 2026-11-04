// TRAJECTIQ service worker template. scripts/build.mjs fills CACHE and ASSETS (every emitted file) and writes site/sw.js.
// Same semantics as the v6 worker: nothing is skipWaiting/claimed, so an update waits for the old tabs to close;
// online the network wins (a returning player always gets the latest release); the cache is only the offline
// fallback; old trajectiq-* caches are deleted on activation; cross-origin and unknown URLs are never intercepted.
const CACHE = 'trajectiq-dev';
const ASSETS = /*ASSETS*/[];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('trajectiq-') && k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope);
  const relative = './' + url.pathname.slice(scope.pathname.length);
  if (!url.pathname.startsWith(scope.pathname) || !ASSETS.includes(relative)) return;
  const key = new URL(relative, scope).href;
  event.respondWith(fetch(event.request).then(response => {
    if (response && response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(key, copy)).catch(() => {})); }
    return response;
  }).catch(() => caches.open(CACHE).then(cache => cache.match(key)).then(cached => cached || new Response('This game version is not cached yet. Reconnect once to load it.', {status: 503, headers: {'Content-Type': 'text/plain'}}))));
});
