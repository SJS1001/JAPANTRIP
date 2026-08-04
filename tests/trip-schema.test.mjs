import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  TripValidationError,
  createTripBackup,
  parseTripBackup,
  projectViewerTrip,
  validateTripItems,
} from "../lib/trip-schema.ts";

const seed = JSON.parse(
  await readFile(new URL("../data/seed.json", import.meta.url), "utf8"),
);

test("the verified agenda satisfies the closed trip-item schema", () => {
  const validated = validateTripItems(seed);

  assert.equal(validated.length, seed.length);
  assert.equal(validated[0].id, "n1");
});

test("agenda validation rejects malformed items, duplicate IDs, and unknown fields", () => {
  const valid = seed[0];
  const invalidCases = [
    [null],
    [{ ...valid, id: "" }],
    [{ ...valid, date: "2026-09-01" }],
    [{ ...valid, category: "shopping" }],
    [{ ...valid }, { ...valid }],
    [{ ...valid, executable: "never" }],
  ];

  for (const items of invalidCases) {
    assert.throws(
      () => validateTripItems(items),
      (error) => error instanceof TripValidationError,
    );
  }
});

test("versioned backups round-trip only after full agenda validation", () => {
  const backup = createTripBackup(seed, {
    exportedAt: "2026-08-04T12:00:00.000Z",
    tripVersion: 23,
  });

  assert.equal(backup.format, "japan-family-trip-backup");
  assert.equal(backup.schemaVersion, 1);
  assert.equal(backup.tripVersion, 23);
  assert.deepEqual(parseTripBackup(JSON.stringify(backup)), seed);
  assert.throws(
    () => parseTripBackup(JSON.stringify({ ...backup, schemaVersion: 2 })),
    (error) => error instanceof TripValidationError,
  );
  assert.throws(
    () => parseTripBackup(JSON.stringify(seed)),
    (error) => error instanceof TripValidationError,
  );
});

test("viewer projection never exposes editor-only agenda fields", () => {
  const projected = projectViewerTrip([{ ...seed[0], confirmation: "SECRET", cost: "$100", notes: "private" }]);

  assert.deepEqual(Object.keys(projected[0]).sort(), [
    "category",
    "date",
    "id",
    "lat",
    "lng",
    "location",
    "order",
    "ticketStatus",
    "time",
    "title",
  ]);
  assert.equal("confirmation" in projected[0], false);
  assert.equal("cost" in projected[0], false);
  assert.equal("notes" in projected[0], false);
});
