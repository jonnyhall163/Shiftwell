// Minimal service worker — its only job is to satisfy Chrome's PWA
// installability check (a registered SW with a fetch handler) so the
// automatic "Add to Home Screen" prompt fires on Android.
//
// ShiftWell's pages are almost entirely auth/subscription/payment-driven
// (Supabase session state, Stripe status, AI-generated content), so this
// deliberately does NOT cache pages, navigations, or /api responses —
// doing so risks serving stale auth state or stale paywall/billing data.
// It only precaches a few static, content-addressed-enough shell assets
// and otherwise passes every request straight to the network.

const CACHE_NAME = 'shiftwell-shell-v1'
const PRECACHE_URLS = ['/manifest.json', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})
