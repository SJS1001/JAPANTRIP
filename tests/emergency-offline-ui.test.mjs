import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Emergency page offers an explicit private device copy and uses it offline", async () => {
  const source = await readFile(
    new URL("../app/components/EmergencyContacts.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /IndexedDbEmergencyContactsAdapter/);
  assert.match(source, /createOfflineEmergencyContacts/);
  assert.match(source, /KEEP_CONTACTS_ON_DEVICE/);
  assert.match(source, /REMOVE_CONTACTS_FROM_DEVICE/);
  assert.match(source, /window\.confirm/);
  assert.match(source, /Keep contacts offline on this device/);
  assert.match(source, /anyone who can unlock this device/i);
  assert.match(source, /offline\.load\(\)/);
  assert.match(source, /Offline device copy/);
  assert.match(source, /disabled=\{busy \|\| !online/);
});
