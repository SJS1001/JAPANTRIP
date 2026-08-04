import assert from "node:assert/strict";
import test from "node:test";

import {
  MemoryEmergencyContactsOfflineAdapter,
  createOfflineEmergencyContacts,
} from "../lib/client/offline-emergency-contacts.ts";

const contacts = [{
  id: "contact-1",
  name: "Grandma Smith",
  relationship: "Grandparent",
  phone: "+1 416 555 0100",
  email: "grandma@example.com",
  notes: "Use Signal first",
  sortOrder: 0,
  createdAt: "2026-08-04T12:00:00.000Z",
  updatedAt: "2026-08-04T12:00:00.000Z",
}];

test("family member explicitly keeps a private emergency-contact copy on one device", async () => {
  const adapter = new MemoryEmergencyContactsOfflineAdapter();
  const offline = createOfflineEmergencyContacts(adapter, {
    now: () => new Date("2026-08-04T13:00:00.000Z"),
  });

  await assert.rejects(offline.save(contacts, "yes"), /KEEP_CONTACTS_ON_DEVICE/);
  assert.equal(await offline.load(), null);

  const saved = await offline.save(contacts, "KEEP_CONTACTS_ON_DEVICE");
  assert.equal(saved.schemaVersion, 1);
  assert.equal(saved.savedAt, "2026-08-04T13:00:00.000Z");
  assert.deepEqual(saved.contacts, contacts);
  assert.notEqual(saved.contacts, contacts);
  assert.deepEqual(await offline.load(), saved);
});

test("offline emergency contacts can be removed only with explicit confirmation", async () => {
  const adapter = new MemoryEmergencyContactsOfflineAdapter();
  const offline = createOfflineEmergencyContacts(adapter);
  await offline.save(contacts, "KEEP_CONTACTS_ON_DEVICE");

  await assert.rejects(offline.clear("remove"), /REMOVE_CONTACTS_FROM_DEVICE/);
  assert.notEqual(await offline.load(), null);

  await offline.clear("REMOVE_CONTACTS_FROM_DEVICE");
  assert.equal(await offline.load(), null);
});
