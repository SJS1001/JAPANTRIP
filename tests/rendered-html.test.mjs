import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the protected shared family calendar", async () => {
  const [page, calendar, map, store, hosting, audit, baseline] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/TripCalendar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/OpenTripMap.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/trip-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../data/merge-audit.json", import.meta.url), "utf8"),
    readFile(new URL("../data/cloud-baseline.json", import.meta.url), "utf8"),
  ]);
  const mergeAudit = JSON.parse(audit);

  assert.match(page, /TripCalendar/);
  assert.match(calendar, /Private family calendar/);
  assert.match(calendar, /Passes & tickets/);
  assert.match(calendar, /japanTripCloudCache/);
  assert.match(calendar, /OpenStreetMap route planner/);
  assert.match(calendar, /OpenTripMap/);
  assert.doesNotMatch(calendar, /@\/data\/seed/);
  assert.match(map, /tile\.openstreetmap\.org/);
  assert.match(store, /post-1am-open-map-restore-2026-07-22-v2/);
  assert.equal(JSON.parse(baseline).length, 135);
  assert.equal(mergeAudit.finalItems, 210);
  assert.equal(mergeAudit.mappedItems, 177);
  assert.deepEqual(mergeAudit.unresolved, []);
  assert.match(hosting, /"d1":\s*"DB"/);
  assert.doesNotMatch(page, /Your site is taking shape/);
});
