import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Inbox page exposes staged uploads and explicit draft review actions", async () => {
  const [page, manager] = await Promise.all([
    readFile(new URL("../app/inbox/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/InboxManager.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /InboxManager/);
  assert.match(page, /Document Inbox/);
  assert.match(page, /await role\(/);
  assert.match(page, /accessRole !== "editor"/);
  assert.match(page, /redirect\("\/"\)/);
  assert.match(manager, /type="file"/);
  assert.match(manager, /name="analysisText"/);
  assert.match(manager, /\/api\/inbox/);
  assert.match(manager, /\/analyze/);
  assert.match(manager, /Draft — no itinerary changes yet/);
  assert.match(manager, /Suggested change/);
  assert.match(manager, /Evidence from document/);
  assert.match(manager, /JSON\.stringify\(outcome\.diff/);
  assert.match(manager, /window\.confirm/);
  assert.match(manager, /\/approve/);
  assert.match(manager, /\/reject/);
  assert.match(manager, />Approve change</);
  assert.match(manager, />Reject</);
  assert.match(manager, /Attach to existing event/);
  assert.match(manager, /Draft a new event/);
  assert.match(manager, /create-event-and-attach/);
  assert.match(manager, /Prepare exact draft/);
  assert.match(manager, /approval is always a separate step/i);
  assert.match(manager, /setManualDraft\(null\)/);
  assert.equal(
    (manager.match(/"x-openai-analysis-consent": "yes"/g) ?? []).length,
    2,
  );
  assert.match(manager, /Editor access is required/);
  assert.doesNotMatch(manager, /autoApprove|automatically approve/i);
});
