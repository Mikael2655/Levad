/* Service worker — coquille hors-ligne.
 * Stratégie « réseau d'abord » pour les fichiers de l'appli (afin d'avoir
 * toujours la dernière version le jour du tournoi), avec repli sur le cache.
 * Les requêtes Firebase / CDN passent directement par le réseau.
 */
var CACHE = 'belote-tournoi-v1';
var ASSETS = [
  './', './index.html', './css/style.css',
  './js/config.js', './js/logic.js', './js/db.js', './js/app.js', './js/qrcode.js',
  './manifest.webmanifest', './icon.png'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).catch(function () {}));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase, gstatic, etc.
  e.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () { return caches.match(req).then(function (r) { return r || caches.match('./index.html'); }); })
  );
});
