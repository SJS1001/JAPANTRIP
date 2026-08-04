import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("viewer startup globally reconciles revoked offline files before the assistant can cite them", async () => {
  const [calendar, storage] = await Promise.all([
    readFile(new URL("../app/components/TripCalendar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/client/offline-attachments.ts", import.meta.url), "utf8"),
  ]);
  assert.match(calendar, /loadedRole === "viewer" && navigator\.onLine/);
  assert.match(calendar, /fetch\("\/api\/attachments"/);
  assert.match(calendar, /reconcileViewerOfflineAttachments/);
  assert.match(storage, /!latest && item\.viewerApproved/);
  assert.match(storage, /removeOfflineAttachment\(item\.id\)/);
});
