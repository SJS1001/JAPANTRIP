import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

import {
  EmergencyContactAccessError,
  EmergencyContactNotFoundError,
  EmergencyContactValidationError,
  EmergencyContactsModule,
  MemoryEmergencyContactStore,
} from "../lib/emergency-contacts.ts";
import { createSessionToken } from "../lib/session-token.ts";

const editor = { role: "editor", id: "parent" };
const viewer = { role: "viewer", id: "kid" };

function moduleFixture() {
  const ids = [
    "019a57ab-35f1-7d34-ae19-a54d5513eb8c",
    "019a57ab-35f1-7d34-ae19-a54d5513eb8d",
    "019a57ab-35f1-7d34-ae19-a54d5513eb8e",
    "019a57ab-35f1-7d34-ae19-a54d5513eb8f",
  ];
  return new EmergencyContactsModule({
    store: new MemoryEmergencyContactStore(),
    randomId: () => ids.shift() ?? crypto.randomUUID(),
    now: () => new Date("2026-08-04T12:00:00.000Z"),
  });
}

test("editor creates a personal emergency contact that an authorized viewer can list", async () => {
  const contacts = moduleFixture();

  const created = await contacts.create(editor, {
    name: "  Aunt Maya  ",
    relationship: "Aunt",
    phone: " +1 416 555 0100 ",
    alternatePhone: "+1 647 555 0101",
    email: "maya@example.com",
    notes: "Call if the parents cannot be reached.",
  });

  assert.deepEqual(created, {
    id: "019a57ab-35f1-7d34-ae19-a54d5513eb8c",
    name: "Aunt Maya",
    relationship: "Aunt",
    phone: "+1 416 555 0100",
    alternatePhone: "+1 647 555 0101",
    email: "maya@example.com",
    notes: "Call if the parents cannot be reached.",
    sortOrder: 0,
    createdAt: "2026-08-04T12:00:00.000Z",
    updatedAt: "2026-08-04T12:00:00.000Z",
  });
  assert.deepEqual(await contacts.list(viewer), [created]);
});

test("anonymous users cannot see contacts and viewers cannot mutate them", async () => {
  const contacts = moduleFixture();

  await assert.rejects(
    contacts.list(null),
    (error) =>
      error instanceof EmergencyContactAccessError && error.status === 401,
  );
  await assert.rejects(
    contacts.create(viewer, {
      name: "Parent",
      phone: "+1 416 555 0100",
    }),
    (error) =>
      error instanceof EmergencyContactAccessError && error.status === 403,
  );
  assert.deepEqual(await contacts.list(editor), []);
});

test("contact names, phone numbers, notes, and allowed fields are validated", async () => {
  const invalidInputs = [
    [{ name: "", phone: "+1 416 555 0100" }, "name"],
    [{ name: "A".repeat(101), phone: "+1 416 555 0100" }, "name"],
    [{ name: "Parent", phone: "call me" }, "phone"],
    [
      { name: "Parent", phone: "+1 416 555 0100", notes: "x".repeat(501) },
      "notes",
    ],
    [
      {
        name: "Parent",
        phone: "+1 416 555 0100",
        passportNumber: "SECRET",
      },
      "passportNumber",
    ],
    [
      {
        name: "Parent",
        phone: "+1 416 555 0100",
        medicalInformation: "Private diagnosis",
      },
      "medicalInformation",
    ],
  ];

  for (const [input, field] of invalidInputs) {
    const contacts = moduleFixture();
    await assert.rejects(
      contacts.create(editor, input),
      (error) => {
        assert.ok(error instanceof EmergencyContactValidationError);
        assert.equal(error.field, field);
        return true;
      },
    );
    assert.deepEqual(await contacts.list(editor), []);
  }
});

test("editor updates a contact while viewers remain read-only", async () => {
  const contacts = moduleFixture();
  const created = await contacts.create(editor, {
    name: "Aunt Maya",
    phone: "+1 416 555 0100",
  });

  await assert.rejects(
    contacts.update(viewer, created.id, { notes: "Updated note" }),
    (error) =>
      error instanceof EmergencyContactAccessError && error.status === 403,
  );
  const updated = await contacts.update(editor, created.id, {
    relationship: "Aunt and emergency guardian",
    phone: "+1 416 555 0199",
    notes: "Use Signal if the phone call does not connect.",
  });

  assert.equal(updated.name, "Aunt Maya");
  assert.equal(updated.relationship, "Aunt and emergency guardian");
  assert.equal(updated.phone, "+1 416 555 0199");
  assert.equal(updated.notes, "Use Signal if the phone call does not connect.");
  assert.deepEqual(await contacts.list(viewer), [updated]);
  await assert.rejects(
    contacts.update(editor, "missing", { name: "Nobody" }),
    (error) => error instanceof EmergencyContactNotFoundError,
  );
});

test("editor reorders active contacts and viewers cannot change the order", async () => {
  const contacts = moduleFixture();
  const first = await contacts.create(editor, {
    name: "First contact",
    phone: "+1 416 555 0100",
  });
  const second = await contacts.create(editor, {
    name: "Second contact",
    phone: "+1 416 555 0101",
  });

  await assert.rejects(
    contacts.reorder(viewer, [second.id, first.id]),
    (error) =>
      error instanceof EmergencyContactAccessError && error.status === 403,
  );
  await contacts.reorder(editor, [second.id, first.id]);
  assert.deepEqual(
    (await contacts.list(viewer)).map((contact) => contact.id),
    [second.id, first.id],
  );
  await assert.rejects(
    contacts.reorder(editor, [first.id]),
    (error) =>
      error instanceof EmergencyContactValidationError &&
      error.field === "orderedIds",
  );
});

test("editor soft-deletes a contact so it is hidden from every family list", async () => {
  const contacts = moduleFixture();
  const created = await contacts.create(editor, {
    name: "Old contact",
    phone: "+1 416 555 0100",
  });

  await assert.rejects(
    contacts.softDelete(viewer, created.id),
    (error) =>
      error instanceof EmergencyContactAccessError && error.status === 403,
  );
  await contacts.softDelete(editor, created.id);
  assert.deepEqual(await contacts.list(viewer), []);
  assert.deepEqual(await contacts.list(editor), []);
  await assert.rejects(
    contacts.softDelete(editor, created.id),
    (error) => error instanceof EmergencyContactNotFoundError,
  );
});

test("a new contact appends after existing contacts even when deletion leaves an order gap", async () => {
  const contacts = moduleFixture();
  const first = await contacts.create(editor, { name: "First", phone: "+1 416 555 0100" });
  const removed = await contacts.create(editor, { name: "Removed", phone: "+1 416 555 0101" });
  const third = await contacts.create(editor, { name: "Third", phone: "+1 416 555 0102" });
  await contacts.softDelete(editor, removed.id);

  const appended = await contacts.create(editor, {
    name: "Appended",
    phone: "+1 416 555 0103",
  });

  assert.equal(appended.sortOrder, 3);
  assert.deepEqual(
    (await contacts.list(viewer)).map((contact) => contact.id),
    [first.id, third.id, appended.id],
  );
});

class FakeD1Statement {
  constructor(database, query) {
    this.database = database;
    this.query = query.replace(/\s+/g, " ").trim();
    this.bindings = [];
  }

  bind(...values) {
    this.bindings = values;
    return this;
  }

  async first() {
    if (this.query.includes("FROM emergency_contacts WHERE id = ?")) {
      return structuredClone(this.database.rows.get(this.bindings[0]) ?? null);
    }
    throw new Error(`Unsupported D1 first query: ${this.query}`);
  }

  async all() {
    if (this.query.includes("FROM emergency_contacts ORDER BY")) {
      return {
        success: true,
        results: [...this.database.rows.values()]
          .sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id))
          .map((row) => structuredClone(row)),
      };
    }
    throw new Error(`Unsupported D1 all query: ${this.query}`);
  }

  async run() {
    if (this.query.startsWith("CREATE TABLE") || this.query.startsWith("CREATE INDEX")) {
      this.database.schemaStatements.push(this.query);
      return { success: true };
    }
    if (this.query.startsWith("INSERT INTO emergency_contacts")) {
      const [
        id,
        name,
        relationship,
        phone,
        alternate_phone,
        email,
        notes,
        sort_order,
        created_at,
        updated_at,
        deleted_at,
      ] = this.bindings;
      this.database.rows.set(id, {
        id,
        name,
        relationship,
        phone,
        alternate_phone,
        email,
        notes,
        sort_order,
        created_at,
        updated_at,
        deleted_at,
      });
      return { success: true };
    }
    if (this.query.includes("SET sort_order = ?, updated_at = ?")) {
      const [sortOrder, updatedAt, id] = this.bindings;
      const row = this.database.rows.get(id);
      if (row && !row.deleted_at) {
        this.database.rows.set(id, {
          ...row,
          sort_order: sortOrder,
          updated_at: updatedAt,
        });
      }
      return { success: true };
    }
    if (this.query.startsWith("UPDATE emergency_contacts SET name = ?")) {
      const [
        name,
        relationship,
        phone,
        alternate_phone,
        email,
        notes,
        sort_order,
        created_at,
        updated_at,
        deleted_at,
        id,
      ] = this.bindings;
      if (this.database.rows.has(id)) {
        this.database.rows.set(id, {
          id,
          name,
          relationship,
          phone,
          alternate_phone,
          email,
          notes,
          sort_order,
          created_at,
          updated_at,
          deleted_at,
        });
      }
      return { success: true };
    }
    throw new Error(`Unsupported D1 run query: ${this.query}`);
  }
}

class FakeD1 {
  rows = new Map();
  schemaStatements = [];

  prepare(query) {
    return new FakeD1Statement(this, query);
  }

  async batch(statements) {
    return Promise.all(statements.map((statement) => statement.run()));
  }
}

const SESSION_SECRET = "emergency-contacts-test-secret";
const fakeD1 = new FakeD1();
globalThis.__emergencyContactsTestEnv = {
  DB: fakeD1,
  FAMILY_EDITOR_ACCESS_CODE: "parent-code",
  FAMILY_VIEWER_ACCESS_CODE: "kid-code",
  FAMILY_SESSION_SECRET: SESSION_SECRET,
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return {
        url: "data:text/javascript,export const env=globalThis.__emergencyContactsTestEnv",
        shortCircuit: true,
      };
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

const collectionRoute = await import("../app/api/emergency-contacts/route.ts");
const itemRoute = await import("../app/api/emergency-contacts/[id]/route.ts");

async function roleCookie(role) {
  const token = await createSessionToken(role, `japan-trip-session-v1|${SESSION_SECRET}`);
  return `japan_trip_family_access=${encodeURIComponent(token)}`;
}

test("HTTP contact routes keep personal contacts private and reserve all mutations for editors", async () => {
  fakeD1.rows.clear();
  fakeD1.schemaStatements.length = 0;
  const viewerCookie = await roleCookie("viewer");
  const editorCookie = await roleCookie("editor");

  const anonymousList = await collectionRoute.GET(
    new Request("https://trip.test/api/emergency-contacts"),
  );
  assert.equal(anonymousList.status, 401);
  assert.deepEqual(await anonymousList.json(), {
    error: "Family access is required.",
  });
  assert.equal(fakeD1.schemaStatements.length, 0);

  const viewerCreate = await collectionRoute.POST(
    new Request("https://trip.test/api/emergency-contacts", {
      method: "POST",
      headers: { cookie: viewerCookie, "content-type": "application/json" },
      body: JSON.stringify({ name: "Private", phone: "+1 416 555 0100" }),
    }),
  );
  assert.equal(viewerCreate.status, 403);
  assert.equal(fakeD1.schemaStatements.length, 0);

  const forbiddenField = await collectionRoute.POST(
    new Request("https://trip.test/api/emergency-contacts", {
      method: "POST",
      headers: { cookie: editorCookie, "content-type": "application/json" },
      body: JSON.stringify({
        name: "Private",
        phone: "+1 416 555 0100",
        passportNumber: "DO-NOT-STORE",
      }),
    }),
  );
  assert.equal(forbiddenField.status, 400);
  assert.equal(fakeD1.rows.size, 0);

  const invalidOrder = await collectionRoute.PUT(
    new Request("https://trip.test/api/emergency-contacts", {
      method: "PUT",
      headers: { cookie: editorCookie, "content-type": "application/json" },
      body: "null",
    }),
  );
  assert.equal(invalidOrder.status, 400);

  const create = await collectionRoute.POST(
    new Request("https://trip.test/api/emergency-contacts", {
      method: "POST",
      headers: { cookie: editorCookie, "content-type": "application/json" },
      body: JSON.stringify({
        name: "Grandparent",
        relationship: "Grandparent",
        phone: "+1 416 555 0100",
        notes: "Emergency contact only",
      }),
    }),
  );
  assert.equal(create.status, 201);
  assert.equal(fakeD1.schemaStatements.length, 2);
  const created = await create.json();
  assert.equal(created.contact.name, "Grandparent");

  const list = await collectionRoute.GET(
    new Request("https://trip.test/api/emergency-contacts", {
      headers: { cookie: viewerCookie },
    }),
  );
  assert.equal(list.status, 200);
  assert.match(list.headers.get("cache-control") ?? "", /private/);
  const listPayload = await list.json();
  assert.equal(listPayload.role, "viewer");
  assert.deepEqual(listPayload.contacts, [created.contact]);

  const secondCreate = await collectionRoute.POST(
    new Request("https://trip.test/api/emergency-contacts", {
      method: "POST",
      headers: { cookie: editorCookie, "content-type": "application/json" },
      body: JSON.stringify({ name: "Family friend", phone: "+1 647 555 0102" }),
    }),
  );
  const second = await secondCreate.json();
  const reversedIds = [second.contact.id, created.contact.id];
  const viewerReorder = await collectionRoute.PUT(
    new Request("https://trip.test/api/emergency-contacts", {
      method: "PUT",
      headers: { cookie: viewerCookie, "content-type": "application/json" },
      body: JSON.stringify({ orderedIds: reversedIds }),
    }),
  );
  assert.equal(viewerReorder.status, 403);
  const reorder = await collectionRoute.PUT(
    new Request("https://trip.test/api/emergency-contacts", {
      method: "PUT",
      headers: { cookie: editorCookie, "content-type": "application/json" },
      body: JSON.stringify({ orderedIds: reversedIds }),
    }),
  );
  assert.equal(reorder.status, 200);
  const reorderedList = await collectionRoute.GET(
    new Request("https://trip.test/api/emergency-contacts", {
      headers: { cookie: viewerCookie },
    }),
  );
  assert.deepEqual(
    (await reorderedList.json()).contacts.map((contact) => contact.id),
    reversedIds,
  );

  const viewerUpdate = await itemRoute.PATCH(
    new Request(`https://trip.test/api/emergency-contacts/${created.contact.id}`, {
      method: "PATCH",
      headers: { cookie: viewerCookie, "content-type": "application/json" },
      body: JSON.stringify({ notes: "Changed by kid" }),
    }),
    { params: Promise.resolve({ id: created.contact.id }) },
  );
  assert.equal(viewerUpdate.status, 403);

  const update = await itemRoute.PATCH(
    new Request(`https://trip.test/api/emergency-contacts/${created.contact.id}`, {
      method: "PATCH",
      headers: { cookie: editorCookie, "content-type": "application/json" },
      body: JSON.stringify({ notes: "Call after local emergency services" }),
    }),
    { params: Promise.resolve({ id: created.contact.id }) },
  );
  assert.equal(update.status, 200);
  assert.equal((await update.json()).contact.notes, "Call after local emergency services");

  const remove = await itemRoute.DELETE(
    new Request(`https://trip.test/api/emergency-contacts/${created.contact.id}`, {
      method: "DELETE",
      headers: { cookie: editorCookie },
    }),
    { params: Promise.resolve({ id: created.contact.id }) },
  );
  assert.equal(remove.status, 200);

  const emptyList = await collectionRoute.GET(
    new Request("https://trip.test/api/emergency-contacts", {
      headers: { cookie: viewerCookie },
    }),
  );
  assert.deepEqual(
    (await emptyList.json()).contacts.map((contact) => contact.id),
    [second.contact.id],
  );
  assert.equal(fakeD1.schemaStatements.length, 2);
});
