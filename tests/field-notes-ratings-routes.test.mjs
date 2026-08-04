import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

import { createSessionToken } from "../lib/session-token.ts";

const SESSION_SECRET = "field-feature-route-secret-long-enough";
class Statement {
  constructor(query) { this.query = query; }
  bind() { return this; }
  async first() { return null; }
  async all() { return { success: true, results: [] }; }
  async run() { return { success: true, meta: { changes: 1 } }; }
}
class Database {
  schemas = [];
  prepare(query) { if (query.startsWith("CREATE")) this.schemas.push(query); return new Statement(query); }
  async batch(statements) { return statements.map(() => ({ success: true })); }
}

globalThis.__fieldFeatureRouteEnv = {
  FAMILY_EDITOR_ACCESS_CODE: "parent-code",
  FAMILY_VIEWER_ACCESS_CODE: "kid-code",
  FAMILY_SESSION_SECRET: SESSION_SECRET,
  DB: new Database(),
  ATTACHMENTS: {
    async put() {}, async get() { return null; }, async delete() {},
  },
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") return { url: "data:text/javascript,export const env=globalThis.__fieldFeatureRouteEnv", shortCircuit: true };
    if (specifier === "@/db/trip-store") return {
      url: `data:text/javascript,${encodeURIComponent(`export async function readTrip(){return {version:1,items:[{id:"hotel-1",category:"hotel"}]}}`)}`,
      shortCircuit: true,
    };
    if (specifier.startsWith("@/")) return { url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, shortCircuit: true };
    if (specifier.startsWith(".") && context.parentURL?.includes("/app/api/") && !specifier.endsWith(".ts")) return { url: new URL(`${specifier}.ts`, context.parentURL).href, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});

const notesRoute = await import("../app/api/development-notes/route.ts");
const ratingsRoute = await import("../app/api/ratings/route.ts");

async function request(path, role) {
  const headers = {};
  if (role) {
    const token = await createSessionToken(role, `japan-trip-session-v1|${SESSION_SECRET}`);
    headers.cookie = `japan_trip_family_access=${encodeURIComponent(token)}`;
  }
  return new Request(`https://trip.test${path}`, { headers });
}

test("development notes route is private to editors", async () => {
  const anonymous = await notesRoute.GET(await request("/api/development-notes"));
  const viewer = await notesRoute.GET(await request("/api/development-notes", "viewer"));
  const editor = await notesRoute.GET(await request("/api/development-notes", "editor"));
  assert.equal(anonymous.status, 401);
  assert.equal(viewer.status, 403);
  assert.equal(editor.status, 200);
  assert.deepEqual(await editor.json(), { notes: [] });
  assert.match(editor.headers.get("cache-control") ?? "", /private/);
  assert.match(editor.headers.get("cache-control") ?? "", /no-store/);
});

test("family ratings are visible to viewers but remain editor-writable", async () => {
  const anonymous = await ratingsRoute.GET(await request("/api/ratings?targetId=hotel-1"));
  const viewer = await ratingsRoute.GET(await request("/api/ratings?targetId=hotel-1", "viewer"));
  assert.equal(anonymous.status, 401);
  assert.equal(viewer.status, 200);
  assert.deepEqual(await viewer.json(), { ratings: [], summary: { average: null, count: 0 }, role: "viewer" });

  const viewerWrite = await ratingsRoute.POST(new Request("https://trip.test/api/ratings", {
    method: "POST",
    headers: { cookie: (await request("/api/ratings", "viewer")).headers.get("cookie"), "content-type": "application/json" },
    body: JSON.stringify({ targetId: "hotel-1", targetKind: "hotel", memberName: "Kid", stars: 5 }),
  }));
  assert.equal(viewerWrite.status, 403);

  const editorCookie = (await request("/api/ratings", "editor")).headers.get("cookie");
  const validWrite = await ratingsRoute.POST(new Request("https://trip.test/api/ratings", {
    method: "POST",
    headers: { cookie: editorCookie, "content-type": "application/json" },
    body: JSON.stringify({ targetId: "hotel-1", targetKind: "hotel", memberName: "Parent", stars: 5 }),
  }));
  assert.equal(validWrite.status, 201);

  const unknownTarget = await ratingsRoute.POST(new Request("https://trip.test/api/ratings", {
    method: "POST",
    headers: { cookie: editorCookie, "content-type": "application/json" },
    body: JSON.stringify({ targetId: "invented-hotel", targetKind: "hotel", memberName: "Parent", stars: 5 }),
  }));
  assert.equal(unknownTarget.status, 400);
});
