/* ============================================================
   Service worker : rend l'app utilisable hors-ligne.
   Stratégie « réseau d'abord » : en ligne on sert la version
   fraîche (et on met la copie locale à jour) ; sans réseau — ou
   si le serveur répond une erreur — on sert la copie locale.
   ============================================================ */

const CACHE = "belote-v23";
const CORE = [
  "./",
  "index.html",
  "css/style.css",
  "js/app.js",
  "manifest.webmanifest",
  "icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        if (resp && (resp.ok || resp.type === "opaque")) {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return resp;
        }
        return caches.match(event.request).then((cached) => cached || resp);
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === "navigate") return caches.match("index.html");
          return Response.error();
        })
      )
  );
});
