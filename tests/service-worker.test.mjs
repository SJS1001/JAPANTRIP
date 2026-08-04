import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

async function loadWorker(overrides = {}) {
  const source = await readFile(new URL("../public/japan-trip-sw.js", import.meta.url), "utf8");
  const listeners = new Map();
  const cache = {
    addAll: async () => {},
    match: async () => null,
    put: async () => {},
    ...overrides.cache,
  };
  const context = {
    URL,
    Request,
    Response,
    fetch: overrides.fetch ?? (async () => new Response("ok")),
    caches: {
      open: async () => cache,
      keys: async () => [],
      delete: async () => true,
      match: async () => null,
      ...overrides.caches,
    },
    self: {
      location: { origin: "https://trip.test" },
      skipWaiting: () => {},
      clients: { claim: async () => {} },
      addEventListener: (name, listener) => listeners.set(name, listener),
    },
  };
  vm.runInNewContext(source, context, { filename: "japan-trip-sw.js" });
  return { listeners, cache };
}

test("service worker never intercepts protected API requests", async () => {
  const { listeners } = await loadWorker();
  let response;
  listeners.get("fetch")({
    request: new Request("https://trip.test/api/trip"),
    respondWith: (value) => { response = value; },
  });
  assert.equal(response, undefined);
});

test("service worker caches public same-origin attraction images", async () => {
  let stored = 0;
  const { listeners } = await loadWorker({ cache: { put: async () => { stored += 1; } } });
  let response;
  listeners.get("fetch")({
    request: new Request("https://trip.test/images/attractions/a1.jpg"),
    respondWith: (value) => { response = value; },
  });
  assert.equal((await response).status, 200);
  assert.equal(stored, 1);
});
