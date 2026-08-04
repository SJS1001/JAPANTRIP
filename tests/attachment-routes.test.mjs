import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

import { createSessionToken } from "../lib/session-token.ts";
import { MAX_ATTACHMENT_BYTES } from "../lib/attachments.ts";

const SESSION_SECRET = "attachment-route-tests-secret-with-enough-entropy";

class MemoryD1Statement {
  constructor(database, query) {
    this.database = database;
    this.query = query.replace(/\s+/g, " ").trim();
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    if (!this.query.startsWith("SELECT")) return null;
    if (!this.database.tableReady) throw new Error("trip_attachments is not initialized");
    const record = this.database.rows.get(this.values[0]);
    return record ? { ...record } : null;
  }

  async all() {
    if (!this.query.startsWith("SELECT")) return { success: true, results: [] };
    if (!this.database.tableReady) throw new Error("trip_attachments is not initialized");
    const tripItemId = this.query.includes("WHERE trip_item_id = ?")
      ? this.values[0]
      : null;
    return {
      success: true,
      results: [...this.database.rows.values()]
        .filter((row) => !tripItemId || row.trip_item_id === tripItemId)
        .map((row) => ({ ...row })),
    };
  }

  async run() {
    if (this.query.startsWith("CREATE TABLE IF NOT EXISTS trip_attachments")) {
      this.database.tableReady = true;
      return { success: true, meta: { changes: 0 } };
    }
    if (this.query.startsWith("CREATE INDEX IF NOT EXISTS trip_attachments_")) {
      if (!this.database.tableReady) throw new Error("cannot index a missing table");
      this.database.indexes.add(this.query.split(" ")[5]);
      return { success: true, meta: { changes: 0 } };
    }
    if (!this.database.tableReady) throw new Error("trip_attachments is not initialized");
    if (this.query.startsWith("INSERT INTO trip_attachments")) {
      const [
        id,
        tripItemId,
        objectKey,
        displayName,
        mediaType,
        size,
        sha256,
        label,
        viewerApproved,
        uploadedBy,
        uploadedAt,
        deletedAt,
      ] = this.values;
      this.database.rows.set(id, {
        id,
        trip_item_id: tripItemId,
        object_key: objectKey,
        display_name: displayName,
        media_type: mediaType,
        size,
        sha256,
        label,
        viewer_approved: viewerApproved,
        uploaded_by: uploadedBy,
        uploaded_at: uploadedAt,
        deleted_at: deletedAt,
      });
      return { success: true, meta: { changes: 1 } };
    }
    if (this.query.startsWith("UPDATE trip_attachments")) {
      const [displayName, label, viewerApproved, deletedAt, id] = this.values;
      const current = this.database.rows.get(id);
      if (!current) return { success: true, meta: { changes: 0 } };
      this.database.rows.set(id, {
        ...current,
        display_name: displayName,
        label,
        viewer_approved: viewerApproved,
        deleted_at: deletedAt,
      });
      return { success: true, meta: { changes: 1 } };
    }
    throw new Error(`Unsupported test SQL: ${this.query}`);
  }
}

class MemoryD1 {
  rows = new Map();
  tableReady = false;
  indexes = new Set();

  prepare(query) {
    return new MemoryD1Statement(this, query);
  }
}

class MemoryR2 {
  objects = new Map();

  async put(key, value, options) {
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value.buffer ?? value);
    this.objects.set(key, { bytes: bytes.slice(), options });
  }

  async get(key) {
    const value = this.objects.get(key);
    if (!value) return null;
    return { arrayBuffer: async () => value.bytes.slice().buffer };
  }

  async delete(key) {
    this.objects.delete(key);
  }
}

const database = new MemoryD1();
const bucket = new MemoryR2();
globalThis.__attachmentRouteEnv = {
  FAMILY_EDITOR_ACCESS_CODE: "parent-code",
  FAMILY_VIEWER_ACCESS_CODE: "kid-code",
  FAMILY_SESSION_SECRET: SESSION_SECRET,
  DB: database,
  ATTACHMENTS: bucket,
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        url: "data:text/javascript,export const env=globalThis.__attachmentRouteEnv",
        shortCircuit: true,
      };
    }
    if (specifier.startsWith("@/")) {
      return {
        url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const collectionRoute = await import("../app/api/attachments/route.ts");
const itemRoute = await import("../app/api/attachments/[id]/route.ts");

async function cookieFor(role) {
  const token = await createSessionToken(role, `japan-trip-session-v1|${SESSION_SECRET}`);
  return `japan_trip_family_access=${encodeURIComponent(token)}`;
}

async function request(url, { method = "GET", role, body, headers = {} } = {}) {
  return new Request(url, {
    method,
    body,
    headers: {
      ...headers,
      ...(role ? { cookie: await cookieFor(role) } : {}),
    },
  });
}

test("attachment collection reads allow viewers and editors but deny anonymous callers", async () => {
  database.tableReady = false;
  database.indexes.clear();
  for (const role of ["viewer", "editor"]) {
    const response = await collectionRoute.GET(
      await request("https://trip.test/api/attachments?tripItemId=osaka-hotel", { role }),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { attachments: [] });
    assert.match(response.headers.get("cache-control") ?? "", /private/);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  }

  const anonymous = await collectionRoute.GET(
    await request("https://trip.test/api/attachments"),
  );
  assert.equal(anonymous.status, 401);
  assert.equal(database.tableReady, true);
  assert.deepEqual([...database.indexes].sort(), [
    "trip_attachments_deleted_at_idx",
    "trip_attachments_item_idx",
    "trip_attachments_uploaded_at_idx",
  ]);
});

test("malformed identifiers do not let anonymous callers probe attachment validation", async () => {
  const collection = await collectionRoute.GET(
    await request("https://trip.test/api/attachments?tripItemId=..%2Fprivate"),
  );
  const item = await itemRoute.GET(
    await request("https://trip.test/api/attachments/not-an-id"),
    itemContext("not-an-id"),
  );

  assert.equal(collection.status, 401);
  assert.equal(item.status, 401);
});

function pdfForm({ tripItemId = "osaka-hotel", viewerApproved = "true" } = {}) {
  const form = new FormData();
  form.set("tripItemId", tripItemId);
  form.set("label", "ticket");
  form.set("viewerApproved", viewerApproved);
  form.set(
    "file",
    new Blob([new TextEncoder().encode("%PDF-1.7\nroute ticket")], {
      type: "application/pdf",
    }),
    "rail-ticket.pdf",
  );
  return form;
}

test("editor multipart upload stores a private file and viewers list it only after approval", async () => {
  database.rows.clear();
  bucket.objects.clear();

  const viewerAttempt = await collectionRoute.POST(
    await request("https://trip.test/api/attachments", {
      method: "POST",
      role: "viewer",
      body: pdfForm(),
    }),
  );
  assert.equal(viewerAttempt.status, 403);
  assert.equal(bucket.objects.size, 0);

  const response = await collectionRoute.POST(
    await request("https://trip.test/api/attachments", {
      method: "POST",
      role: "editor",
      body: pdfForm(),
    }),
  );
  assert.equal(response.status, 201);
  assert.match(response.headers.get("cache-control") ?? "", /private/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const uploaded = await response.json();
  assert.equal(uploaded.attachment.tripItemId, "osaka-hotel");
  assert.equal(uploaded.attachment.mediaType, "application/pdf");
  assert.equal(uploaded.attachment.viewerApproved, true);
  assert.equal("objectKey" in uploaded.attachment, false);
  assert.equal(bucket.objects.size, 1);

  const listed = await collectionRoute.GET(
    await request("https://trip.test/api/attachments?tripItemId=osaka-hotel", {
      role: "viewer",
    }),
  );
  assert.deepEqual(
    (await listed.json()).attachments.map((attachment) => attachment.id),
    [uploaded.attachment.id],
  );
});

test("multipart uploads reject invalid trip IDs, excess envelope size, and multiple files", async () => {
  database.rows.clear();
  bucket.objects.clear();

  const invalidId = await collectionRoute.POST(
    await request("https://trip.test/api/attachments", {
      method: "POST",
      role: "editor",
      body: pdfForm({ tripItemId: "../agenda" }),
    }),
  );
  assert.equal(invalidId.status, 400);

  const excessiveEnvelope = await collectionRoute.POST(
    await request("https://trip.test/api/attachments", {
      method: "POST",
      role: "editor",
      body: pdfForm(),
      headers: { "content-length": String(MAX_ATTACHMENT_BYTES + 64 * 1024 + 1) },
    }),
  );
  assert.equal(excessiveEnvelope.status, 413);

  const multiple = pdfForm();
  multiple.append(
    "file",
    new Blob([new TextEncoder().encode("%PDF-1.7\nsecond")], { type: "application/pdf" }),
    "second.pdf",
  );
  const multipleFiles = await collectionRoute.POST(
    await request("https://trip.test/api/attachments", {
      method: "POST",
      role: "editor",
      body: multiple,
    }),
  );
  assert.equal(multipleFiles.status, 400);

  const unexpected = pdfForm();
  unexpected.set("agenda", "must never be accepted as attachment metadata");
  const unexpectedField = await collectionRoute.POST(
    await request("https://trip.test/api/attachments", {
      method: "POST",
      role: "editor",
      body: unexpected,
    }),
  );
  assert.equal(unexpectedField.status, 400);
  assert.equal(bucket.objects.size, 0);
  assert.equal(database.rows.size, 0);
});

async function uploadAsEditor(form) {
  const response = await collectionRoute.POST(
    await request("https://trip.test/api/attachments", {
      method: "POST",
      role: "editor",
      body: form,
    }),
  );
  assert.equal(response.status, 201);
  return (await response.json()).attachment;
}

function itemContext(id) {
  return { params: Promise.resolve({ id }) };
}

test("approved attachment download is private while hidden files remain unavailable to viewers", async () => {
  database.rows.clear();
  bucket.objects.clear();
  const approved = await uploadAsEditor(pdfForm({ viewerApproved: "true" }));
  const hidden = await uploadAsEditor(pdfForm({ viewerApproved: "false" }));

  const response = await itemRoute.GET(
    await request(`https://trip.test/api/attachments/${approved.id}`, { role: "viewer" }),
    itemContext(approved.id),
  );
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "%PDF-1.7\nroute ticket");
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.match(response.headers.get("cache-control") ?? "", /private/);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.has("location"), false);

  assert.equal(
    (
      await itemRoute.GET(
        await request(`https://trip.test/api/attachments/${hidden.id}`, { role: "viewer" }),
        itemContext(hidden.id),
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await itemRoute.GET(
        await request(`https://trip.test/api/attachments/${hidden.id}`, { role: "editor" }),
        itemContext(hidden.id),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await itemRoute.GET(
        await request(`https://trip.test/api/attachments/${approved.id}`),
        itemContext(approved.id),
      )
    ).status,
    401,
  );
});

test("only editors can rename, label, and approve attachment metadata", async () => {
  database.rows.clear();
  bucket.objects.clear();
  const hidden = await uploadAsEditor(pdfForm({ viewerApproved: "false" }));
  const patchRequest = (role) => request(
    `https://trip.test/api/attachments/${hidden.id}`,
    {
      method: "PATCH",
      role,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: "Osaka rail ticket.pdf",
        label: "ticket",
        viewerApproved: true,
      }),
    },
  );

  assert.equal(
    (await itemRoute.PATCH(await patchRequest("viewer"), itemContext(hidden.id))).status,
    403,
  );
  const response = await itemRoute.PATCH(
    await patchRequest("editor"),
    itemContext(hidden.id),
  );
  assert.equal(response.status, 200);
  const updated = (await response.json()).attachment;
  assert.equal(updated.displayName, "Osaka rail ticket.pdf");
  assert.equal(updated.label, "ticket");
  assert.equal(updated.viewerApproved, true);

  assert.equal(
    (
      await itemRoute.GET(
        await request(`https://trip.test/api/attachments/${hidden.id}`, { role: "viewer" }),
        itemContext(hidden.id),
      )
    ).status,
    200,
  );
});

test("only editors can soft-delete and restore an attachment without removing its private blob", async () => {
  database.rows.clear();
  bucket.objects.clear();
  const uploaded = await uploadAsEditor(pdfForm({ viewerApproved: "true" }));
  const url = `https://trip.test/api/attachments/${uploaded.id}`;

  assert.equal(
    (
      await itemRoute.DELETE(
        await request(url, { method: "DELETE", role: "viewer" }),
        itemContext(uploaded.id),
      )
    ).status,
    403,
  );
  const deleted = await itemRoute.DELETE(
    await request(url, { method: "DELETE", role: "editor" }),
    itemContext(uploaded.id),
  );
  assert.equal(deleted.status, 200);
  assert.ok((await deleted.json()).attachment.deletedAt);
  assert.equal(bucket.objects.size, 1);
  assert.equal(
    (await itemRoute.GET(await request(url, { role: "viewer" }), itemContext(uploaded.id))).status,
    404,
  );

  assert.equal(
    (
      await itemRoute.POST(
        await request(url, { method: "POST", role: "viewer" }),
        itemContext(uploaded.id),
      )
    ).status,
    403,
  );
  const restored = await itemRoute.POST(
    await request(url, { method: "POST", role: "editor" }),
    itemContext(uploaded.id),
  );
  assert.equal(restored.status, 200);
  assert.equal((await restored.json()).attachment.deletedAt, null);
  assert.equal(
    (await itemRoute.GET(await request(url, { role: "viewer" }), itemContext(uploaded.id))).status,
    200,
  );
});
