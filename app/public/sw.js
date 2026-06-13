// =====================================================
// VMT minimal service worker
// =====================================================
// Caches the app shell (icons, fonts, manifest) so the
// PWA launches offline. Network-first for everything
// else — full offline sync (background queue) is Phase 2+.
// =====================================================

const CACHE = "vmt-v1";
const SHELL = [
  "/manifest.json",
  "/logo/vmt/vmt-app-icon.svg",
  "/logo/vmt/vmt-mark.svg",
  "/logo/vmt/vmt-wordmark-onpurple.svg",
  "/fonts/Product-Sans-Regular.ttf",
  "/fonts/Product-Sans-Bold.ttf",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GETs.
  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Static asset paths → cache-first.
  const isStatic =
    url.pathname.startsWith("/logo/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/illustrations/") ||
    url.pathname === "/manifest.json";

  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then((hit) => {
        if (hit) return hit;
        return fetch(event.request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, copy));
          }
          return res;
        });
      }),
    );
    return;
  }

  // Everything else: network-first, fall back to cache.
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});
