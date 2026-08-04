import assert from "node:assert/strict";
import test from "node:test";

import {
  DevelopmentNoteAccessError,
  DevelopmentNoteValidationError,
  DevelopmentNotesModule,
  MemoryDevelopmentNoteBlobStore,
  MemoryDevelopmentNoteStore,
} from "../lib/development-notes.ts";

const editor = { role: "editor", id: "parent" };
const viewer = { role: "viewer", id: "kid" };

function fixture() {
  const ids = ["note-1", "shot-1", "note-2"];
  return new DevelopmentNotesModule({
    store: new MemoryDevelopmentNoteStore(),
    blobs: new MemoryDevelopmentNoteBlobStore(),
    randomId: () => ids.shift() ?? crypto.randomUUID(),
    now: () => new Date("2026-08-04T12:00:00.000Z"),
  });
}

test("development notes are editor-private and support text CRUD", async () => {
  const notes = fixture();
  await assert.rejects(notes.list(null), DevelopmentNoteAccessError);
  await assert.rejects(notes.list(viewer), (error) => error.status === 403);

  const created = await notes.create(editor, { body: "  Map button failed after lunch.  " });
  assert.equal(created.body, "Map button failed after lunch.");
  assert.equal(created.screenshots.length, 0);
  assert.deepEqual(await notes.list(editor), [created]);

  const updated = await notes.update(editor, created.id, { body: "Map button froze after lunch." });
  assert.equal(updated.body, "Map button froze after lunch.");
  await notes.remove(editor, created.id);
  assert.deepEqual(await notes.list(editor), []);
});

test("development-note screenshots are private images with safe metadata", async () => {
  const notes = fixture();
  const note = await notes.create(editor, { body: "Calendar layout issue" });
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);
  const screenshot = await notes.addScreenshot(editor, note.id, {
    bytes: png,
    displayName: "../screen.png",
    claimedMediaType: "image/png",
  });

  assert.equal(screenshot.displayName, "screen.png");
  assert.equal("objectKey" in screenshot, false);
  const opened = await notes.readScreenshot(editor, screenshot.id);
  assert.deepEqual(opened.body, png);
  assert.equal(opened.headers["content-type"], "image/png");
  await assert.rejects(notes.readScreenshot(viewer, screenshot.id), (error) => error.status === 403);
  await notes.remove(editor, note.id);
  await assert.rejects(notes.readScreenshot(editor, screenshot.id), (error) => error.status === 404);
});

test("development notes reject empty/oversized text and disguised screenshots", async () => {
  const notes = fixture();
  await assert.rejects(
    notes.create(editor, { body: "   " }),
    (error) => error instanceof DevelopmentNoteValidationError && error.field === "body",
  );
  await assert.rejects(
    notes.create(editor, { body: "x".repeat(5001) }),
    (error) => error instanceof DevelopmentNoteValidationError && error.field === "body",
  );
  const note = await notes.create(editor, { body: "Screenshot validation" });
  await assert.rejects(
    notes.addScreenshot(editor, note.id, {
      bytes: new TextEncoder().encode("not an image"),
      displayName: "fake.png",
      claimedMediaType: "image/png",
    }),
    (error) => error instanceof DevelopmentNoteValidationError && error.field === "file",
  );
});
