// Q-App service worker.
// Minimal by design: enough to make Chrome consider the app installable,
// with a network-first strategy so live queue data is always fresh.
// If a request fails while offline we return a lightweight fallback for navigations only.

const CACHE = "q-app-shell-v1";
const PRECACHE = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (request.mode === "navigate" && response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? offlineFallback(request)))
  );
});

function offlineFallback(request) {
  if (request.mode === "navigate") {
    return new Response(
      "<!doctype html><meta charset='utf-8'><title>Q-App offline</title>" +
        "<style>body{background:#101828;color:#f4ebd0;font-family:system-ui;padding:2rem;text-align:center}</style>" +
        "<h1>You are offline</h1><p>Q-App will refresh as soon as you are back on the network.</p>",
      { status: 503, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }
  return Response.error();
}
