import assert from "node:assert/strict";
import test from "node:test";

import { createDevelopmentScreenshotQueue, MemoryDevelopmentScreenshotQueueAdapter } from "../lib/client/offline-development-notes.ts";
import { createOfflineRatingQueue, MemoryOfflineRatingQueueAdapter } from "../lib/client/offline-ratings.ts";

test("development screenshot queue keeps image bytes until upload succeeds", async () => {
  const queue = createDevelopmentScreenshotQueue(new MemoryDevelopmentScreenshotQueueAdapter());
  const queued = await queue.enqueue({ noteId: "note-1", displayName: "screen.png", mediaType: "image/png", bytes: new Uint8Array([1, 2, 3]) });
  assert.equal((await queue.list()).length, 1);
  assert.deepEqual((await queue.list())[0].bytes, new Uint8Array([1, 2, 3]));
  await queue.complete(queued.id);
  assert.deepEqual(await queue.list(), []);
});

test("offline rating queue coalesces later edits from the same member and target", async () => {
  const queue = createOfflineRatingQueue(new MemoryOfflineRatingQueueAdapter());
  await queue.enqueue({ targetId: "hotel-1", targetKind: "hotel", memberName: "Maya", stars: 2 });
  await queue.enqueue({ targetId: "hotel-1", targetKind: "hotel", memberName: " maya ", stars: 5, comment: "Much better." });
  const pending = await queue.list();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].stars, 5);
  assert.equal(pending[0].comment, "Much better.");
});
