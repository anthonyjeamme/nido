// Service worker minimal (Lot 0) : rend l'app installable.
// La stratégie de cache offline (file d'attente de pointage, IndexedDB)
// arrive au Lot 3.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
