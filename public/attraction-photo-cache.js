const PHOTO_CACHE = "japan-trip-attraction-photos";
const PHOTO_PATH = "/images/attractions/";
const LOCKED_THEME_ASSETS = new Set(["/japan-watercolor-pokemon.jpg"]);

self.addEventListener("install", () => {
  // Control the current calendar as soon as the worker is ready. Photos are
  // intentionally not preloaded; a photo is stored only after its card needs it.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !(url.pathname.startsWith(PHOTO_PATH) || LOCKED_THEME_ASSETS.has(url.pathname))
  ) {
    return;
  }

  event.respondWith(
    caches.open(PHOTO_CACHE).then(async (cache) => {
      // Ignore a display-only query string so the same item is never downloaded
      // again just because the calendar release number changed.
      const stored = await cache.match(request, { ignoreSearch: true });
      if (stored) return stored;

      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    }),
  );
});
