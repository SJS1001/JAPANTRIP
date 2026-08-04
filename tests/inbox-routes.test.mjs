import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

import { createSessionToken } from "../lib/session-token.ts";

const SESSION_SECRET = "inbox-route-tests-secret-with-enough-entropy";
const DOCUMENT_ID = "11111111-1111-4111-8111-111111111111";

globalThis.__inboxRouteEnv = {
  FAMILY_EDITOR_ACCESS_CODE: "parent-code",
  FAMILY_VIEWER_ACCESS_CODE: "kid-code",
  FAMILY_SESSION_SECRET: SESSION_SECRET,
};

globalThis.__inboxRouteHarness = {
  store: {
    listCalls: 0,
    uploadCalls: 0,
    async listReviewQueue() {
      this.listCalls += 1;
      return { documents: [], outcomes: [] };
    },
    async uploadDocument(input) {
      this.uploadCalls += 1;
      this.lastUpload = input;
      return {
        id: DOCUMENT_ID,
        filename: input.filename,
        mediaType: input.mediaType,
        sizeBytes: input.bytes.byteLength,
        status: "staged",
        baseTripVersion: input.baseTripVersion,
        createdAt: "2026-08-04T12:00:00.000Z",
      };
    },
    async readDocumentForAnalysis(id) {
      this.analysisReads = (this.analysisReads ?? 0) + 1;
      if (id !== DOCUMENT_ID) return null;
      if (this.useBinaryDocument) {
        return {
          id,
          filename: "osaka-hotel.pdf",
          mediaType: "application/pdf",
          text: "",
          bytes: new TextEncoder().encode("%PDF-1.7 binary fixture"),
        };
      }
      return {
        id,
        filename: "osaka-hotel.txt",
        mediaType: "text/plain",
        text: "Reservation for Osaka Hotel",
      };
    },
    async saveOutcome(documentId, outcome) {
      this.savedOutcomes = (this.savedOutcomes ?? 0) + 1;
      this.lastOutcome = outcome;
      this.proposalStatus = "draft";
      return {
        id: outcome.kind === "proposal" ? outcome.proposalId : "outcome-1",
        documentId,
        status: "draft",
        outcome,
        createdAt: "2026-08-04T12:01:00.000Z",
      };
    },
    async saveExtractedText(documentId, text) {
      this.extractedTextWrites = (this.extractedTextWrites ?? 0) + 1;
      this.lastExtractedText = { documentId, text };
    },
    async getProposal(id) {
      this.proposalReads = (this.proposalReads ?? 0) + 1;
      if (
        id !== this.lastOutcome?.proposalId ||
        this.lastOutcome.kind !== "proposal" ||
        this.proposalStatus !== "draft"
      ) return null;
      return this.lastOutcome;
    },
    async markApproved(id, result, editorId) {
      this.approved = (this.approved ?? 0) + 1;
      this.proposalStatus = "approved";
      this.lastDecision = { id, result, editorId };
      return { status: "approved", result };
    },
    async markRejected(id, decision) {
      this.rejected = (this.rejected ?? 0) + 1;
      this.proposalStatus = "rejected";
      this.lastDecision = { id, decision };
      return { status: "rejected", decision };
    },
    async markStale(id, currentVersion) {
      this.stale = (this.stale ?? 0) + 1;
      this.proposalStatus = "stale";
      this.lastDecision = { id, currentVersion };
    },
  },
  model: {
    calls: 0,
    async propose() {
      this.calls += 1;
      return {
        kind: "proposal",
        candidateEventIds: ["osaka-hotel"],
        evidence: [{ quote: "Reservation for Osaka Hotel" }],
        diff: {
          operation: "attach-document",
          eventId: "osaka-hotel",
          documentId: DOCUMENT_ID,
        },
      };
    },
  },
  extractor: {
    calls: 0,
    async extract(document) {
      this.calls += 1;
      this.lastDocument = document;
      return "Reservation for Osaka Hotel";
    },
  },
  trip: {
    calls: 0,
    version: 7,
    applied: new Set(),
    result: "apply",
    async applyProposalAtomically(command) {
      this.calls += 1;
      this.lastCommand = command;
      if (this.result === "stale") return { kind: "stale", currentVersion: 8 };
      if (this.applied.has(command.proposalId)) {
        return { kind: "already-applied", version: this.version };
      }
      this.applied.add(command.proposalId);
      if (command.diff.operation !== "attach-document") this.version += 1;
      return { kind: "applied", version: this.version };
    },
  },
  tripSnapshot: {
    reads: 0,
    writes: 0,
    async readTrip() {
      this.reads += 1;
      return {
        version: 7,
        items: [
          {
            id: "osaka-hotel",
            date: "2026-08-10",
            title: "Osaka Hotel",
            category: "hotel",
            location: "Namba",
            confirmation: "SECRET-123",
          },
        ],
      };
    },
    async writeTrip() {
      this.writes += 1;
      throw new Error("unexpected direct trip write");
    },
  },
  attachment: {
    calls: 0,
    async read(actor, id) {
      this.calls += 1;
      return {
        metadata: { id, viewerApproved: false },
        body: new TextEncoder().encode("%PDF-1.7\napproved inbox ticket"),
        headers: {
          "content-type": "application/pdf",
          "cache-control": "private, no-store",
          "content-disposition": 'attachment; filename="ticket.pdf"',
          "x-content-type-options": "nosniff",
        },
      };
    },
  },
};

const inboxStoreBoundary = `data:text/javascript,${encodeURIComponent(`
  export const aiInboxStore = () => globalThis.__inboxRouteHarness.store;
  export const inboxAnalyzerModel = () => globalThis.__inboxRouteHarness.model;
  export const inboxDocumentTextExtractor = () => globalThis.__inboxRouteHarness.extractor;
  export const inboxTripAdapter = () => globalThis.__inboxRouteHarness.trip;
`)}`;
const tripStoreBoundary = `data:text/javascript,${encodeURIComponent(`
  export const readTrip = (...args) => globalThis.__inboxRouteHarness.tripSnapshot.readTrip(...args);
  export const writeTrip = (...args) => globalThis.__inboxRouteHarness.tripSnapshot.writeTrip(...args);
`)}`;
const attachmentStoreBoundary = `data:text/javascript,${encodeURIComponent(`
  export const attachmentModule = () => globalThis.__inboxRouteHarness.attachment;
`)}`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        url: "data:text/javascript,export const env=globalThis.__inboxRouteEnv",
        shortCircuit: true,
      };
    }
    if (specifier === "@/db/ai-inbox-store") {
      return { url: inboxStoreBoundary, shortCircuit: true };
    }
    if (specifier === "@/db/trip-store") {
      return { url: tripStoreBoundary, shortCircuit: true };
    }
    if (specifier === "@/db/attachment-store") {
      return { url: attachmentStoreBoundary, shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      return {
        url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
        shortCircuit: true,
      };
    }
    if (
      specifier.startsWith(".") &&
      (context.parentURL?.includes("/lib/ai/") ||
        context.parentURL?.includes("/app/api/inbox/")) &&
      !specifier.endsWith(".ts")
    ) {
      return {
        url: new URL(`${specifier}.ts`, context.parentURL).href,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const collectionRoute = await import("../app/api/inbox/route.ts");
const analyzeRoute = await import("../app/api/inbox/[id]/analyze/route.ts");
const approveRoute = await import("../app/api/inbox/proposals/[id]/approve/route.ts");
const rejectRoute = await import("../app/api/inbox/proposals/[id]/reject/route.ts");
const attachmentItemRoute = await import("../app/api/attachments/[id]/route.ts");

async function cookieFor(role) {
  const token = await createSessionToken(role, `japan-trip-session-v1|${SESSION_SECRET}`);
  return `japan_trip_family_access=${encodeURIComponent(token)}`;
}

async function request(url, { method = "GET", role, body } = {}) {
  return new Request(url, {
    method,
    body,
    headers: role ? { cookie: await cookieFor(role) } : undefined,
  });
}

function itemContext(id) {
  return { params: Promise.resolve({ id }) };
}

test("Inbox collection denies anonymous and viewer requests before storage runs", async () => {
  const harness = globalThis.__inboxRouteHarness;
  harness.store.listCalls = 0;
  harness.store.uploadCalls = 0;

  assert.equal(
    (await collectionRoute.GET(await request("https://trip.test/api/inbox"))).status,
    401,
  );
  assert.equal(
    (
      await collectionRoute.GET(
        await request("https://trip.test/api/inbox", { role: "viewer" }),
      )
    ).status,
    403,
  );
  assert.equal(harness.store.listCalls, 0);
  assert.equal(harness.store.uploadCalls, 0);
});

test("editor stages one private document without changing the itinerary", async () => {
  const harness = globalThis.__inboxRouteHarness;
  harness.store.uploadCalls = 0;
  harness.tripSnapshot.reads = 0;
  harness.tripSnapshot.writes = 0;

  const viewerForm = new FormData();
  viewerForm.set("file", new File(["booking text"], "booking.txt", { type: "text/plain" }));
  assert.equal(
    (
      await collectionRoute.POST(
        await request("https://trip.test/api/inbox", {
          method: "POST",
          role: "viewer",
          body: viewerForm,
        }),
      )
    ).status,
    403,
  );

  const form = new FormData();
  form.set(
    "file",
    new File(["Reservation for Osaka Hotel"], "osaka-hotel.txt", {
      type: "text/plain",
    }),
  );
  form.set("analysisText", "Reservation for Osaka Hotel");
  const response = await collectionRoute.POST(
    await request("https://trip.test/api/inbox", {
      method: "POST",
      role: "editor",
      body: form,
    }),
  );

  assert.equal(response.status, 201);
  assert.match(response.headers.get("cache-control") ?? "", /private/);
  assert.deepEqual(await response.json(), {
    document: {
      id: DOCUMENT_ID,
      filename: "osaka-hotel.txt",
      mediaType: "text/plain",
      sizeBytes: 27,
      status: "staged",
      baseTripVersion: 7,
      createdAt: "2026-08-04T12:00:00.000Z",
    },
  });
  assert.equal(harness.store.uploadCalls, 1);
  assert.equal(harness.store.lastUpload.analysisText, "Reservation for Osaka Hotel");
  assert.equal(harness.tripSnapshot.reads, 1);
  assert.equal(harness.tripSnapshot.writes, 0);
});

test("Inbox rejects a file whose claimed type does not match its bytes", async () => {
  const harness = globalThis.__inboxRouteHarness;
  harness.store.uploadCalls = 0;
  const form = new FormData();
  form.set(
    "file",
    new File(["not a pdf"], "fake.pdf", { type: "application/pdf" }),
  );

  const response = await collectionRoute.POST(
    await request("https://trip.test/api/inbox", {
      method: "POST",
      role: "editor",
      body: form,
    }),
  );

  assert.equal(response.status, 415);
  assert.match((await response.json()).error, /does not match/i);
  assert.equal(harness.store.uploadCalls, 0);
});

test("analysis stores an evidenced draft and performs zero itinerary writes", async () => {
  const harness = globalThis.__inboxRouteHarness;
  harness.store.analysisReads = 0;
  harness.store.savedOutcomes = 0;
  harness.model.calls = 0;
  harness.tripSnapshot.reads = 0;
  harness.tripSnapshot.writes = 0;

  const viewer = await analyzeRoute.POST(
    await request(`https://trip.test/api/inbox/${DOCUMENT_ID}/analyze`, {
      method: "POST",
      role: "viewer",
    }),
    itemContext(DOCUMENT_ID),
  );
  assert.equal(viewer.status, 403);
  assert.equal(harness.model.calls, 0);

  const response = await analyzeRoute.POST(
    await request(`https://trip.test/api/inbox/${DOCUMENT_ID}/analyze`, {
      method: "POST",
      role: "editor",
    }),
    itemContext(DOCUMENT_ID),
  );
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.review.status, "draft");
  assert.equal(body.review.outcome.kind, "proposal");
  assert.equal(body.review.outcome.diff.operation, "attach-document");
  assert.equal(body.review.outcome.baseTripVersion, 7);
  assert.equal(harness.store.analysisReads, 1);
  assert.equal(harness.store.savedOutcomes, 1);
  assert.equal(harness.model.calls, 1);
  assert.equal(harness.tripSnapshot.reads, 1);
  assert.equal(harness.tripSnapshot.writes, 0);
  assert.doesNotMatch(JSON.stringify(harness.store.lastOutcome), /SECRET-123/);
});

test("analysis extracts text from a staged binary document before drafting", async () => {
  const harness = globalThis.__inboxRouteHarness;
  harness.store.useBinaryDocument = true;
  harness.extractor.calls = 0;
  harness.model.calls = 0;
  harness.store.extractedTextWrites = 0;
  try {
    const response = await analyzeRoute.POST(
      await request(`https://trip.test/api/inbox/${DOCUMENT_ID}/analyze`, {
        method: "POST",
        role: "editor",
      }),
      itemContext(DOCUMENT_ID),
    );

    assert.equal(response.status, 201);
    assert.equal(harness.extractor.calls, 1);
    assert.equal(harness.extractor.lastDocument.mediaType, "application/pdf");
    assert.equal(harness.extractor.lastDocument.filename, "osaka-hotel.pdf");
    assert.equal(harness.store.extractedTextWrites, 1);
    assert.deepEqual(harness.store.lastExtractedText, {
      documentId: DOCUMENT_ID,
      text: "Reservation for Osaka Hotel",
    });
    assert.equal(harness.model.calls, 1);
    assert.equal(harness.store.lastOutcome.evidence[0].quote, "Reservation for Osaka Hotel");
  } finally {
    harness.store.useBinaryDocument = false;
  }
});

async function stageDraftProposal() {
  const response = await analyzeRoute.POST(
    await request(`https://trip.test/api/inbox/${DOCUMENT_ID}/analyze`, {
      method: "POST",
      role: "editor",
    }),
    itemContext(DOCUMENT_ID),
  );
  assert.equal(response.status, 201);
  return (await response.json()).review.outcome;
}

test("only explicit editor approval invokes the atomic adapter with the stored draft", async () => {
  const harness = globalThis.__inboxRouteHarness;
  const proposal = await stageDraftProposal();
  harness.trip.calls = 0;
  harness.trip.result = "apply";
  harness.trip.version = 7;
  harness.trip.applied.clear();
  harness.store.approved = 0;
  harness.store.rejected = 0;

  const viewer = await approveRoute.POST(
    await request(`https://trip.test/api/inbox/proposals/${proposal.proposalId}/approve`, {
      method: "POST",
      role: "viewer",
    }),
    itemContext(proposal.proposalId),
  );
  assert.equal(viewer.status, 403);
  assert.equal(harness.trip.calls, 0);

  const response = await approveRoute.POST(
    await request(`https://trip.test/api/inbox/proposals/${proposal.proposalId}/approve`, {
      method: "POST",
      role: "editor",
      body: JSON.stringify({ diff: { operation: "create-event", event: { title: "Injected" } } }),
    }),
    itemContext(proposal.proposalId),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    decision: { status: "approved", result: { kind: "applied", version: 7 } },
  });
  assert.equal(harness.trip.calls, 1);
  assert.deepEqual(harness.trip.lastCommand.diff, proposal.diff);
  assert.equal(harness.store.approved, 1);
  assert.equal(harness.tripSnapshot.writes, 0);

  assert.equal(
    (
      await rejectRoute.POST(
        await request(`https://trip.test/api/inbox/proposals/${proposal.proposalId}/reject`, {
          method: "POST",
          role: "editor",
        }),
        itemContext(proposal.proposalId),
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await approveRoute.POST(
        await request(`https://trip.test/api/inbox/proposals/${proposal.proposalId}/approve`, {
          method: "POST",
          role: "editor",
        }),
        itemContext(proposal.proposalId),
      )
    ).status,
    404,
  );
  assert.equal(harness.trip.calls, 1);
  assert.equal(harness.store.rejected ?? 0, 0);
});

test("editor rejection records the immutable draft decision with zero trip adapter calls", async () => {
  const harness = globalThis.__inboxRouteHarness;
  const proposal = await stageDraftProposal();
  harness.trip.calls = 0;
  harness.store.rejected = 0;

  const viewer = await rejectRoute.POST(
    await request(`https://trip.test/api/inbox/proposals/${proposal.proposalId}/reject`, {
      method: "POST",
      role: "viewer",
    }),
    itemContext(proposal.proposalId),
  );
  assert.equal(viewer.status, 403);

  const response = await rejectRoute.POST(
    await request(`https://trip.test/api/inbox/proposals/${proposal.proposalId}/reject`, {
      method: "POST",
      role: "editor",
    }),
    itemContext(proposal.proposalId),
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.decision.status, "rejected");
  assert.equal(body.decision.decision.proposalId, proposal.proposalId);
  assert.equal(harness.store.rejected, 1);
  assert.equal(harness.trip.calls, 0);
  assert.equal(harness.tripSnapshot.writes, 0);

  assert.equal(
    (
      await approveRoute.POST(
        await request(`https://trip.test/api/inbox/proposals/${proposal.proposalId}/approve`, {
          method: "POST",
          role: "editor",
        }),
        itemContext(proposal.proposalId),
      )
    ).status,
    404,
  );
  assert.equal(harness.trip.calls, 0);
});

test("stale approval is terminal and never reports the draft as applied", async () => {
  const harness = globalThis.__inboxRouteHarness;
  const proposal = await stageDraftProposal();
  harness.trip.calls = 0;
  harness.trip.result = "stale";
  harness.store.stale = 0;
  harness.store.approved = 0;

  const response = await approveRoute.POST(
    await request(`https://trip.test/api/inbox/proposals/${proposal.proposalId}/approve`, {
      method: "POST",
      role: "editor",
    }),
    itemContext(proposal.proposalId),
  );
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: "The itinerary changed after this proposal was created. Analyze the document again.",
    currentVersion: 8,
  });
  assert.equal(harness.trip.calls, 1);
  assert.equal(harness.store.stale, 1);
  assert.equal(harness.store.approved, 0);

  const retry = await approveRoute.POST(
    await request(`https://trip.test/api/inbox/proposals/${proposal.proposalId}/approve`, {
      method: "POST",
      role: "editor",
    }),
    itemContext(proposal.proposalId),
  );
  assert.equal(retry.status, 404);
  assert.equal(harness.trip.calls, 1);
});

test("approved Inbox attachments retain a UUID accepted by the private download route", async () => {
  const storeSource = await readFile(
    new URL("../db/ai-inbox-store.ts", import.meta.url),
    "utf8",
  );
  assert.match(storeSource, /const attachmentId = command\.documentId/);

  const response = await attachmentItemRoute.GET(
    await request(`https://trip.test/api/attachments/${DOCUMENT_ID}`, { role: "editor" }),
    itemContext(DOCUMENT_ID),
  );
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "%PDF-1.7\napproved inbox ticket");
  assert.equal(globalThis.__inboxRouteHarness.attachment.calls, 1);
});
