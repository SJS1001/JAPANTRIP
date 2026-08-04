import assert from "node:assert/strict";
import test from "node:test";

import { createOfflineTrip } from "../lib/client/offline-trip.ts";
import { MemoryTripAdapter } from "../lib/client/memory-trip-adapter.ts";

const snapshot = {
  version: 7,
  savedAt: "2026-08-04T12:00:00.000Z",
  items: [{ id: "osaka-1", title: "Osaka Castle", date: "2026-08-11" }],
};

test("a downloaded trip can be saved and loaded through the public module", async () => {
  const trip = createOfflineTrip({
    adapter: new MemoryTripAdapter(),
    role: "viewer",
  });

  assert.equal(await trip.load(), null);
  await trip.save(snapshot);
  assert.deepEqual(await trip.load(), snapshot);
});

test("editor mutations retain their stable IDs, order, and base versions", async () => {
  const trip = createOfflineTrip({
    adapter: new MemoryTripAdapter(),
    role: "editor",
    now: () => "2026-08-04T12:30:00.000Z",
  });

  await trip.enqueue({
    id: "mutation-a",
    baseVersion: 7,
    action: "Update Osaka Castle time",
    changedIds: ["osaka-1"],
    items: [{ ...snapshot.items[0], time: "09:00" }],
  });
  await trip.enqueue({
    id: "mutation-b",
    baseVersion: 8,
    action: "Add lunch",
    changedIds: ["osaka-lunch"],
    items: [...snapshot.items, { id: "osaka-lunch", title: "Lunch" }],
  });

  assert.deepEqual(await trip.status(), {
    state: "pending",
    hasSnapshot: false,
    pendingCount: 2,
    pendingMutationIds: ["mutation-a", "mutation-b"],
    conflict: null,
  });
});

test("viewer sessions cannot enqueue itinerary mutations", async () => {
  const trip = createOfflineTrip({
    adapter: new MemoryTripAdapter(),
    role: "viewer",
  });

  await assert.rejects(
    trip.enqueue({
      id: "viewer-mutation",
      baseVersion: 7,
      action: "Try to change the agenda",
      changedIds: ["osaka-1"],
      items: snapshot.items,
    }),
    (error) => error?.name === "OfflineTripPermissionError" && error?.code === "EDITOR_REQUIRED",
  );
  assert.equal((await trip.status()).pendingCount, 0);
});

test("sync replays mutations once in order and treats an already-applied ID as success", async () => {
  const trip = createOfflineTrip({
    adapter: new MemoryTripAdapter(),
    role: "editor",
    now: () => "2026-08-04T13:00:00.000Z",
  });
  await trip.save(snapshot);
  await trip.enqueue({
    id: "mutation-a",
    baseVersion: 7,
    action: "First edit",
    changedIds: ["osaka-1"],
    items: [{ ...snapshot.items[0], time: "09:00" }],
  });
  await trip.enqueue({
    id: "mutation-b",
    baseVersion: 8,
    action: "Second edit",
    changedIds: ["osaka-lunch"],
    items: [
      { ...snapshot.items[0], time: "09:00" },
      { id: "osaka-lunch", title: "Lunch" },
    ],
  });

  const attempts = [];
  const responses = [
    { kind: "applied", version: 8 },
    { kind: "already-applied", version: 9 },
  ];
  await trip.sync(async (mutation) => {
    attempts.push({ id: mutation.id, baseVersion: mutation.baseVersion });
    return responses.shift();
  });
  await trip.sync(async () => {
    throw new Error("a drained mutation must never be replayed");
  });

  assert.deepEqual(attempts, [
    { id: "mutation-a", baseVersion: 7 },
    { id: "mutation-b", baseVersion: 8 },
  ]);
  assert.equal((await trip.load()).version, 9);
  assert.deepEqual(await trip.status(), {
    state: "ready",
    hasSnapshot: true,
    pendingCount: 0,
    pendingMutationIds: [],
    conflict: null,
  });
});

test("a server conflict remains visible after reload and blocks silent replay", async () => {
  const adapter = new MemoryTripAdapter();
  const trip = createOfflineTrip({
    adapter,
    role: "editor",
    now: () => "2026-08-04T14:00:00.000Z",
  });
  await trip.save(snapshot);
  await trip.enqueue({
    id: "mutation-conflict",
    baseVersion: 7,
    action: "Move Osaka Castle",
    changedIds: ["osaka-1"],
    items: [{ ...snapshot.items[0], date: "2026-08-12" }],
  });

  let attempts = 0;
  await trip.sync(async () => {
    attempts += 1;
    return {
      kind: "conflict",
      serverSnapshot: {
        version: 8,
        savedAt: "2026-08-04T13:59:00.000Z",
        items: [{ ...snapshot.items[0], time: "10:00" }],
      },
      conflictingItemIds: ["osaka-1"],
    };
  });

  const reloaded = createOfflineTrip({ adapter, role: "editor" });
  await reloaded.sync(async () => {
    attempts += 1;
    return { kind: "applied", version: 9 };
  });

  assert.equal(attempts, 1);
  assert.deepEqual(await reloaded.status(), {
    state: "conflict",
    hasSnapshot: true,
    pendingCount: 1,
    pendingMutationIds: ["mutation-conflict"],
    conflict: {
      mutationId: "mutation-conflict",
      baseVersion: 7,
      detectedAt: "2026-08-04T14:00:00.000Z",
      conflictingItemIds: ["osaka-1"],
      serverSnapshot: {
        version: 8,
        savedAt: "2026-08-04T13:59:00.000Z",
        items: [{ ...snapshot.items[0], time: "10:00" }],
      },
    },
  });
});

test("a viewer cannot replay mutations left by an editor session", async () => {
  const adapter = new MemoryTripAdapter();
  const editor = createOfflineTrip({ adapter, role: "editor" });
  await editor.enqueue({
    id: "editor-mutation",
    baseVersion: 7,
    action: "Editor change",
    changedIds: ["osaka-1"],
    items: snapshot.items,
  });

  const viewer = createOfflineTrip({ adapter, role: "viewer" });
  let attempted = false;
  await assert.rejects(
    viewer.sync(async () => {
      attempted = true;
      return { kind: "applied", version: 8 };
    }),
    (error) => error?.code === "EDITOR_REQUIRED",
  );

  assert.equal(attempted, false);
  assert.deepEqual((await viewer.status()).pendingMutationIds, ["editor-mutation"]);
});

test("clearing an offline copy requires confirmation and protects pending edits", async () => {
  const adapter = new MemoryTripAdapter();
  const editor = createOfflineTrip({ adapter, role: "editor" });
  await editor.save(snapshot);
  await editor.enqueue({
    id: "unsynced-mutation",
    baseVersion: 7,
    action: "Unsynced change",
    changedIds: ["osaka-1"],
    items: snapshot.items,
  });

  await assert.rejects(
    editor.clear({ confirmation: "not-the-confirmation" }),
    (error) => error?.code === "CONFIRMATION_REQUIRED",
  );
  await assert.rejects(
    editor.clear({ confirmation: "REMOVE_OFFLINE_COPY" }),
    (error) => error?.code === "PENDING_CHANGES",
  );

  await editor.clear({
    confirmation: "REMOVE_OFFLINE_COPY",
    discardPending: true,
  });
  assert.deepEqual(await editor.status(), {
    state: "empty",
    hasSnapshot: false,
    pendingCount: 0,
    pendingMutationIds: [],
    conflict: null,
  });
});

test("enqueue is idempotent for the same stable mutation ID", async () => {
  const trip = createOfflineTrip({
    adapter: new MemoryTripAdapter(),
    role: "editor",
    now: () => "2026-08-04T15:00:00.000Z",
  });
  const mutation = {
    id: "stable-mutation",
    baseVersion: 7,
    action: "Stable change",
    changedIds: ["osaka-1"],
    items: snapshot.items,
  };

  await trip.enqueue(mutation);
  await trip.enqueue(mutation);
  assert.equal((await trip.status()).pendingCount, 1);

  await assert.rejects(
    trip.enqueue({ ...mutation, action: "Different change with reused ID" }),
    (error) => error?.code === "DUPLICATE_MUTATION_ID",
  );
});

test("concurrent sync requests share one replay", async () => {
  const trip = createOfflineTrip({
    adapter: new MemoryTripAdapter(),
    role: "editor",
  });
  await trip.enqueue({
    id: "single-flight",
    baseVersion: 7,
    action: "One replay",
    changedIds: ["osaka-1"],
    items: snapshot.items,
  });

  let release;
  let attempts = 0;
  const sender = async () => {
    attempts += 1;
    await new Promise((resolve) => {
      release = resolve;
    });
    return { kind: "applied", version: 8 };
  };
  const first = trip.sync(sender);
  const second = trip.sync(sender);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(attempts, 1);
  release();
  await Promise.all([first, second]);

  assert.equal(attempts, 1);
  assert.equal((await trip.status()).pendingCount, 0);
});

test("an indeterminate sync failure keeps the stable ID for an idempotent retry", async () => {
  const trip = createOfflineTrip({
    adapter: new MemoryTripAdapter(),
    role: "editor",
  });
  await trip.enqueue({
    id: "retry-stable-id",
    baseVersion: 7,
    action: "Retry safely",
    changedIds: ["osaka-1"],
    items: snapshot.items,
  });

  await assert.rejects(
    trip.sync(async () => {
      throw new Error("response was lost");
    }),
    /response was lost/,
  );
  assert.deepEqual((await trip.status()).pendingMutationIds, ["retry-stable-id"]);

  let retriedId;
  await trip.sync(async (mutation) => {
    retriedId = mutation.id;
    return { kind: "already-applied", version: 8 };
  });
  assert.equal(retriedId, "retry-stable-id");
  assert.equal((await trip.status()).pendingCount, 0);
});
