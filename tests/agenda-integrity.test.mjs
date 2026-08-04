import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const VERIFIED_AGENDA_SHA256 =
  "dce25f6e7a33aeefbf2682695f99f1c78219245da5a3f9acec4db6e3eb8ee1fe";

test("session features preserve the verified trip agenda", async () => {
  const source = await readFile(new URL("../data/seed.json", import.meta.url));
  const items = JSON.parse(source.toString("utf8"));
  const dates = [...new Set(items.map((item) => item.date))].sort();

  assert.equal(createHash("sha256").update(source).digest("hex"), VERIFIED_AGENDA_SHA256);
  assert.equal(items.length, 202);
  assert.equal(new Set(items.map((item) => item.id)).size, 202);
  assert.deepEqual([dates[0], dates.at(-1), dates.length], ["2026-08-06", "2026-08-22", 17]);
});
