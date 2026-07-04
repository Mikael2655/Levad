/* ============================================================
   Service worker : rend l'app utilisable hors-ligne.
   Stratégie « réseau d'abord » : en ligne, on sert toujours la
   version fraîche (et on met la copie locale à jour) ; sans
   réseau — ou si le serveur répond une erreur — on sert la
   copie locale.
   ============================================================ */

const CACHE = "hebreu-vocab-v1";
const CORE = [
  "./",
  "index.html",
  "css/style.css",
  "js/vocab.js",
  "js/verbes.js",
  "js/app.js",
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
        // Le serveur répond mais mal (404 pendant un déploiement…) :
        // on préfère notre copie locale si on en a une
        return caches.match(event.request).then((cached) => cached || resp);
      })
      .catch(() =>
        // Pas de réseau du tout : copie locale, ou la page d'accueil
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === "navigate") return caches.match("index.html");
          return Response.error();
        })
      )
  );
});
