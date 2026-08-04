const SHELL_CACHE = "japan-trip-shell-v1";
const ASSET_CACHE = "japan-trip-public-assets-v1";
const SHELL_URLS = ["/", "/offline", "/emergency", "/favicon.svg", "/japan-watercolor-pokemon.jpg"];
const PUBLIC_NAVIGATIONS = new Set(["/", "/offline", "/emergency"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("japan-trip-") && ![SHELL_CACHE, ASSET_CACHE, "japan-trip-attraction-photos"].includes(key))
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request, url.pathname));
    return;
  }

  if (isPublicAsset(url.pathname)) {
    event.respondWith(cacheFirstPublicAsset(request));
  }
});

function isPublicAsset(pathname) {
  return pathname.startsWith("/_next/static/")
    || pathname.startsWith("/images/attractions/")
    || pathname === "/favicon.svg"
    || pathname === "/og.png"
    || pathname === "/japan-watercolor-pokemon.jpg";
}

async function cacheFirstPublicAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const stored = await cache.match(request, { ignoreSearch: true });
  if (stored) return stored;

  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function networkFirstNavigation(request, pathname) {
  try {
    const response = await fetch(request);
    if (response.ok && PUBLIC_NAVIGATIONS.has(pathname)) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) || (await caches.match("/offline")) || Response.error();
  }
}
