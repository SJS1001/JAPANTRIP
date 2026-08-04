import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

import {
  authorizeTripOperation,
  classifyAccessCode,
  createSessionToken,
  verifySessionToken,
} from "../lib/session-token.ts";

const SESSION_SECRET = "test-only-secret-with-enough-entropy";
const NOW = Date.UTC(2026, 7, 4, 12, 0, 0);

globalThis.__japanTripTestEnv = {
  FAMILY_EDITOR_ACCESS_CODE: "parent-code",
  FAMILY_VIEWER_ACCESS_CODE: "kid-code",
  FAMILY_ACCESS_CODE: "legacy-family-code",
  FAMILY_SESSION_SECRET: SESSION_SECRET,
};
globalThis.__japanTripTestStore = {
  async readTrip() {
    return { items: [], version: 1 };
  },
  async recentHistory() {
    return [];
  },
  async writeTrip() {
    return { conflict: false, version: 2 };
  },
  async restoreVerifiedTrip() {
    return { conflict: false, version: 2 };
  },
};

const cloudflareEnvironment =
  "data:text/javascript,export const env=globalThis.__japanTripTestEnv";
const tripStoreBoundary = `data:text/javascript,${encodeURIComponent(`
  const store = globalThis.__japanTripTestStore;
  export const readTrip = (...args) => store.readTrip(...args);
  export const recentHistory = (...args) => store.recentHistory(...args);
  export const writeTrip = (...args) => store.writeTrip(...args);
  export const restoreVerifiedTrip = (...args) => store.restoreVerifiedTrip(...args);
`)}`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return { url: cloudflareEnvironment, shortCircuit: true };
    }
    if (specifier === "@/db/trip-store") {
      return { url: tripStoreBoundary, shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      return {
        url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
        shortCircuit: true,
      };
    }
    if (specifier === "./session-token") {
      return {
        url: new URL("../lib/session-token.ts", import.meta.url).href,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const authRoute = await import("../app/api/auth/route.ts");
const logoutRoute = await import("../app/api/logout/route.ts");
const tripRoute = await import("../app/api/trip/route.ts");

async function signIn(code) {
  return authRoute.POST(
    new Request("https://trip.test/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    }),
  );
}

function sessionCookie(response) {
  return response.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
}

test("signed family sessions preserve their role and reject tampering", async () => {
  for (const role of ["viewer", "editor"]) {
    const token = await createSessionToken(role, SESSION_SECRET, NOW);
    const replacement = token.endsWith("a") ? "b" : "a";

    assert.equal(await verifySessionToken(token, SESSION_SECRET, NOW), role);
    assert.equal(
      await verifySessionToken(`${token.slice(0, -1)}${replacement}`, SESSION_SECRET, NOW),
      null,
    );
  }
});

test("signed family sessions expire and cannot be verified with another secret", async () => {
  const token = await createSessionToken("viewer", SESSION_SECRET, NOW);
  const thirtyDaysLater = NOW + 30 * 24 * 60 * 60 * 1_000;

  assert.equal(await verifySessionToken(token, SESSION_SECRET, thirtyDaysLater - 1), "viewer");
  assert.equal(await verifySessionToken(token, SESSION_SECRET, thirtyDaysLater), null);
  assert.equal(await verifySessionToken(token, "different-secret", NOW), null);
});

test("trip access allows family reads but reserves writes for editors", () => {
  assert.deepEqual(authorizeTripOperation("viewer", "read"), {
    allowed: true,
    role: "viewer",
  });
  assert.deepEqual(authorizeTripOperation("editor", "write"), {
    allowed: true,
    role: "editor",
  });
  assert.deepEqual(authorizeTripOperation("viewer", "write"), {
    allowed: false,
    status: 403,
  });
  assert.deepEqual(authorizeTripOperation(null, "read"), {
    allowed: false,
    status: 401,
  });
  assert.deepEqual(authorizeTripOperation(null, "write"), {
    allowed: false,
    status: 401,
  });
});

test("family codes select viewer or editor while the legacy code remains an editor fallback", async () => {
  const configuredCodes = {
    editorCode: "parent-code",
    viewerCode: "kid-code",
    legacyEditorCode: "legacy-family-code",
  };

  assert.equal(await classifyAccessCode("parent-code", configuredCodes), "editor");
  assert.equal(await classifyAccessCode("kid-code", configuredCodes), "viewer");
  assert.equal(await classifyAccessCode("legacy-family-code", configuredCodes), "editor");
  assert.equal(await classifyAccessCode("wrong-code", configuredCodes), null);
});

test("a viewer access code creates a signed session that can read the trip", async () => {
  const login = await signIn("kid-code");
  const cookie = sessionCookie(login);

  assert.equal(login.status, 200);
  assert.equal((await login.json()).role, "viewer");
  assert.match(login.headers.get("set-cookie") ?? "", /HttpOnly/);
  assert.match(login.headers.get("set-cookie") ?? "", /SameSite=Strict/);
  assert.match(login.headers.get("set-cookie") ?? "", /Secure/);

  const response = await tripRoute.GET(
    new Request("https://trip.test/api/trip", { headers: { cookie } }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { items: [], version: 1, history: [], role: "viewer" });
});

test("trip mutations return 403 for viewers, succeed for editors, and return 401 without a session", async () => {
  const viewerCookie = sessionCookie(await signIn("kid-code"));
  const editorCookie = sessionCookie(await signIn("parent-code"));
  const updateRequest = (cookie = "") =>
    new Request("https://trip.test/api/trip", {
      method: "PUT",
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ items: [], baseVersion: 1 }),
    });
  const restoreRequest = (cookie = "") =>
    new Request("https://trip.test/api/trip", {
      method: "POST",
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ baseVersion: 1 }),
    });

  assert.equal((await tripRoute.PUT(updateRequest(viewerCookie))).status, 403);
  assert.equal((await tripRoute.POST(restoreRequest(viewerCookie))).status, 403);
  assert.equal((await tripRoute.PUT(updateRequest(editorCookie))).status, 200);
  assert.equal(
    (
      await tripRoute.GET(new Request("https://trip.test/api/trip"))
    ).status,
    401,
  );
  assert.equal((await tripRoute.PUT(updateRequest())).status, 401);
});

test("the legacy family code remains an editor login and logout invalidates the role cookie", async () => {
  const login = await signIn("legacy-family-code");
  assert.equal(login.status, 200);
  assert.equal((await login.json()).role, "editor");

  const logout = await logoutRoute.POST(
    new Request("https://trip.test/api/logout", { method: "POST" }),
  );
  const cleared = logout.headers.get("set-cookie") ?? "";
  assert.match(cleared, /^japan_trip_family_access=;/);
  assert.match(cleared, /HttpOnly/);
  assert.match(cleared, /SameSite=Strict/);
  assert.match(cleared, /Max-Age=0/);
  assert.match(cleared, /Secure/);
});
