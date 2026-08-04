import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

globalThis.__liveContextAuthorized = true;
globalThis.__liveContextEnv = {};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return { url: "data:text/javascript,export const env=globalThis.__liveContextEnv", shortCircuit: true };
    }
    if (specifier === "@/lib/access") {
      return {
        url: "data:text/javascript,export const isAuthorized=async()=>globalThis.__liveContextAuthorized",
        shortCircuit: true,
      };
    }
    if (specifier.startsWith("@/")) {
      return { url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const route = await import("../app/api/live-context/route.ts");

const extraFeed = `<?xml version="1.0"?><feed><updated>2026-08-04T23:43:22+09:00</updated><entry><title>気象特別警報・警報・注意報</title><id>https://www.data.jma.go.jp/developer/xml/data/osaka.xml</id><updated>2026-08-04T14:40:00Z</updated><content>【大阪府気象警報・注意報】大阪府では、雷に注意してください。</content></entry><entry><title>熱中症警戒アラート</title><id>https://www.data.jma.go.jp/developer/xml/data/osaka-heat.xml</id><updated>2026-08-04T08:00:00Z</updated><content>【大阪府熱中症警戒アラート】大阪府では、熱中症の危険性が極めて高くなると予測されます。</content></entry></feed>`;
const earthquakeFeed = `<?xml version="1.0"?><feed><updated>2026-08-04T23:46:41+09:00</updated><entry><title>震源・震度に関する情報</title><id>https://www.data.jma.go.jp/developer/xml/data/quake.xml</id><updated>2026-08-04T14:46:20Z</updated><content>【震源・震度情報】４日２３時４２分ころ、地震がありました。</content></entry><entry><title>津波警報・注意報・予報</title><id>https://www.data.jma.go.jp/developer/xml/data/tsunami.xml</id><updated>2026-08-04T13:00:00Z</updated><content>【津波予報】津波の心配はありません。</content></entry></feed>`;
const wbgt = ",,2026080512,2026080515\n62078,2026/08/05 10:25, 290, 320";

test("live context API requires family access", async () => {
  globalThis.__liveContextAuthorized = false;
  try {
    const response = await route.GET(new Request("https://trip.test/api/live-context?city=osaka"));
    assert.equal(response.status, 401);
  } finally {
    globalThis.__liveContextAuthorized = true;
  }
});

test("live context API returns official, read-only signals without location coordinates", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("extra.xml")) return new Response(extraFeed);
    if (url.includes("eqvol.xml")) return new Response(earthquakeFeed);
    if (url.includes("yohou_62078.csv")) return new Response(wbgt);
    throw new Error(`Unexpected upstream ${url}`);
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const response = await route.GET(new Request("https://trip.test/api/live-context?city=osaka"));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /private/);
  const payload = await response.json();
  assert.equal(payload.city.id, "osaka");
  assert.equal(payload.safety.weather.level, "advisory");
  assert.equal(payload.safety.heatAlert.level, "warning");
  assert.equal(payload.safety.heat.station, "Osaka");
  assert.deepEqual(payload.freshness.sources.map((source) => source.id), ["jma-warnings", "jma-earthquake-tsunami", "wbgt"]);
  assert.ok(payload.freshness.sources.every((source) => ["fresh", "stale", "unavailable"].includes(source.status)));
  assert.equal(payload.transit.tokyoMetro.state, "not-configured");
  assert.deepEqual(payload.transit.officialLinks.map((link) => link.label), ["JR Central Shinkansen", "JR West", "Osaka Metro"]);
  assert.equal(payload.places.enabled, false);
  assert.match(payload.links.hakone, /hakonenavi\.jp/);
  assert.match(payload.links.miyajima, /miyajima\.or\.jp/);
  assert.doesNotMatch(JSON.stringify(payload), /latitude|longitude|coordinates/i);
});

test("invalid city is rejected instead of fetching arbitrary sources", async () => {
  const response = await route.GET(new Request("https://trip.test/api/live-context?city=../../private"));
  assert.equal(response.status, 400);
});

test("live context falls back to a clearly stale last-good response when every official feed fails", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("offline"); };
  t.after(() => { globalThis.fetch = originalFetch; });
  const response = await route.GET(new Request("https://trip.test/api/live-context?city=osaka"));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.freshness.status, "stale");
  assert.match(payload.freshness.message, /last successful/i);
  assert.match(payload.warning, /failed/i);
});
