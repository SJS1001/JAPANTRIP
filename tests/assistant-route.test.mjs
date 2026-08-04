import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

import { createSessionToken } from "../lib/session-token.ts";

const SESSION_SECRET = "test-only-secret-with-enough-entropy";

globalThis.__japanTripAssistantTestEnv = {
  FAMILY_EDITOR_ACCESS_CODE: "parent-code",
  FAMILY_VIEWER_ACCESS_CODE: "kid-code",
  FAMILY_SESSION_SECRET: SESSION_SECRET,
  OPENAI_API_KEY: "test-openai-key",
};
globalThis.__japanTripAssistantTestStore = {
  async readTrip() {
    return {
      version: 7,
      items: [{
        id: "castle",
        date: "2026-08-10",
        time: "11:00",
        category: "attraction",
        title: "Osaka Castle",
        location: "Osaka Castle Park",
        notes: "Parent-only note",
        confirmation: "SECRET-123",
        viewerSummary: "Visit the castle.",
      }],
    };
  },
};
globalThis.__japanTripAssistantAttachmentStore = {
  async list(actor) {
    const records = [
      { id: "approved-ticket", tripItemId: "castle", displayName: "Castle ticket.pdf", viewerApproved: true },
      { id: "parent-receipt", tripItemId: "castle", displayName: "Private receipt.pdf", viewerApproved: false },
    ];
    return actor.role === "viewer" ? records.filter((record) => record.viewerApproved) : records;
  },
};
globalThis.__japanTripAssistantAiEnabled = true;

const cloudflareEnvironment =
  "data:text/javascript,export const env=globalThis.__japanTripAssistantTestEnv";
const tripStoreBoundary = `data:text/javascript,${encodeURIComponent(`
  const store = globalThis.__japanTripAssistantTestStore;
  export const readTrip = (...args) => store.readTrip(...args);
`)}`;
const attachmentStoreBoundary = `data:text/javascript,${encodeURIComponent(`
  export const attachmentModule = () => globalThis.__japanTripAssistantAttachmentStore;
`)}`;
const requestLimitBoundary = "data:text/javascript,export async function consumeRequestLimit(){return {allowed:true,remaining:29,retryAfter:0}}";
const aiSettingsBoundary = "data:text/javascript,export async function readFamilyAiEnabled(){return globalThis.__japanTripAssistantAiEnabled}";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return { url: cloudflareEnvironment, shortCircuit: true };
    }
    if (specifier === "@/db/trip-store") {
      return { url: tripStoreBoundary, shortCircuit: true };
    }
    if (specifier === "@/db/attachment-store") {
      return { url: attachmentStoreBoundary, shortCircuit: true };
    }
    if (specifier === "@/db/request-rate-limit-store") {
      return { url: requestLimitBoundary, shortCircuit: true };
    }
    if (specifier === "@/db/ai-settings-store") {
      return { url: aiSettingsBoundary, shortCircuit: true };
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

const assistantRoute = await import("../app/api/assistant/route.ts");

async function cookieFor(role) {
  const token = await createSessionToken(role, `japan-trip-session-v1|${SESSION_SECRET}`);
  return `japan_trip_family_access=${encodeURIComponent(token)}`;
}

test("assistant requires a signed family session", async () => {
  const response = await assistantRoute.POST(new Request("https://trip.test/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: "What is next?" }),
  }));
  assert.equal(response.status, 401);
});

test("viewer assistant context excludes editor-only agenda fields and validates citations", async (t) => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    return Response.json({
      status: "completed",
      output_text: JSON.stringify({
        text: "Osaka Castle is planned for 11:00.",
        basis: "trip-plan",
        citationIds: ["castle"],
      }),
    });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const response = await assistantRoute.POST(new Request("https://trip.test/api/assistant", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: await cookieFor("viewer"),
    },
    body: JSON.stringify({ question: "When is Osaka Castle?" }),
  }));

  assert.equal(response.status, 200);
  assert.doesNotMatch(JSON.stringify(requestBody), /Parent-only|SECRET-123/);
  assert.match(JSON.stringify(requestBody), /Visit the castle/);
  assert.match(JSON.stringify(requestBody), /Castle ticket\.pdf/);
  assert.doesNotMatch(JSON.stringify(requestBody), /Private receipt\.pdf/);
  assert.deepEqual((await response.json()).answer.citations, [{
    kind: "event",
    id: "castle",
    label: "Osaka Castle",
  }]);
});

test("viewer change requests are denied without calling the model", async (t) => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error("unexpected model call");
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const response = await assistantRoute.POST(new Request("https://trip.test/api/assistant", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: await cookieFor("viewer"),
    },
    body: JSON.stringify({ question: "Move Osaka Castle to tomorrow" }),
  }));

  assert.equal(response.status, 200);
  assert.equal(called, false);
  assert.match((await response.json()).answer.text, /read-only/i);
});

test("assistant safely falls back when the API key is not configured", async () => {
  const currentKey = globalThis.__japanTripAssistantTestEnv.OPENAI_API_KEY;
  delete globalThis.__japanTripAssistantTestEnv.OPENAI_API_KEY;
  try {
    const response = await assistantRoute.POST(new Request("https://trip.test/api/assistant", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: await cookieFor("viewer"),
      },
      body: JSON.stringify({ question: "What is next?" }),
    }));
    assert.equal(response.status, 200);
    assert.match((await response.json()).answer.text, /saved trip|connect/i);
  } finally {
    globalThis.__japanTripAssistantTestEnv.OPENAI_API_KEY = currentKey;
  }
});

test("disabled family AI setting prevents any OpenAI request", async (t) => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error("OpenAI must not be called while disabled");
  };
  globalThis.__japanTripAssistantAiEnabled = false;
  t.after(() => {
    globalThis.fetch = originalFetch;
    globalThis.__japanTripAssistantAiEnabled = true;
  });

  const response = await assistantRoute.POST(new Request("https://trip.test/api/assistant", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: await cookieFor("editor"),
    },
    body: JSON.stringify({ question: "Tell me something about our trip" }),
  }));
  assert.equal(response.status, 200);
  assert.equal(called, false);
  assert.equal((await response.json()).aiEnabled, false);
});
