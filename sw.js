/* PRO-READY service worker — app shell cached for full offline use */
const CACHE = "proready-cache-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(a => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // App HTML: network-first so deploys show up, cache fallback for offline.
  if (e.request.mode === "navigate" || url.pathname.endsWith("/index.html")) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copy));
          return r;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Google Fonts + local assets: cache-first, populate on first use.
  e.respondWith(
    caches.match(e.request).then(hit =>
      hit ||
      fetch(e.request).then(r => {
        if (r.ok && (url.origin === location.origin || url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleapis.com"))) {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return r;
      })
    )
  );
});
