import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("ships the protected shared family calendar", async () => {
  const [page, calendar, map, store, tripApi, statusApi, hosting, audit, baseline, seedText] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/TripCalendar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/OpenTripMap.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/trip-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/trip/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/status/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../data/merge-audit.json", import.meta.url), "utf8"),
    readFile(new URL("../data/cloud-baseline.json", import.meta.url), "utf8"),
    readFile(new URL("../data/seed.json", import.meta.url), "utf8"),
  ]);
  const mergeAudit = JSON.parse(audit);
  const seed = JSON.parse(seedText);
  const attractions = seed.filter((item) => item.category === "attraction");

  assert.match(page, /TripCalendar/);
  assert.match(calendar, /Private family calendar/);
  assert.match(calendar, /Passes & tickets/);
  assert.match(calendar, /japanTripCloudCache/);
  assert.match(calendar, /OpenStreetMap route planner/);
  assert.match(calendar, /OpenTripMap/);
  assert.match(calendar, /card-photo/);
  assert.match(calendar, /imageCredit/);
  assert.doesNotMatch(calendar, /@\/data\/seed/);
  assert.match(map, /tile\.openstreetmap\.org/);
  assert.match(map, /scrollWheelZoom: true/);
  assert.match(map, /map-zoom-controls/);
  assert.match(map, /Fit route/);
  assert.match(store, /post-1am-open-map-restore-2026-07-22-v3-images/);
  assert.match(tripApi, /private, no-store/);
  assert.match(statusApi, /no-store, max-age=0/);
  assert.equal(JSON.parse(baseline).length, 135);
  assert.equal(mergeAudit.finalItems, 210);
  assert.equal(mergeAudit.mappedItems, 177);
  assert.deepEqual(mergeAudit.unresolved, []);
  assert.equal(attractions.length, 86);
  assert.ok(attractions.every((item) => item.imageUrl && item.imageSource && item.imageCredit));
  await Promise.all(attractions.map((item) => access(new URL(`../public${item.imageUrl}`, import.meta.url))));
  assert.match(hosting, /"d1":\s*"DB"/);
  assert.doesNotMatch(page, /Your site is taking shape/);
});
