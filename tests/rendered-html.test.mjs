import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("ships the protected shared family calendar", async () => {
  const [page, calendar, map, store, tripApi, statusApi, hosting, audit, baseline, seedText, imageManifestText] = await Promise.all([
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
    readFile(new URL("../data/image-manifest.json", import.meta.url), "utf8"),
  ]);
  const mergeAudit = JSON.parse(audit);
  const seed = JSON.parse(seedText);
  const attractions = seed.filter((item) => item.category === "attraction");
  const hotels = seed.filter((item) => item.category === "hotel");
  const imageManifest = JSON.parse(imageManifestText);
  const geocodeApi = await readFile(new URL("../app/api/geocode/route.ts", import.meta.url), "utf8");

  assert.match(page, /TripCalendar/);
  assert.match(calendar, /Private family calendar/);
  assert.match(calendar, /Passes & tickets/);
  assert.match(calendar, /japanTripCloudCache/);
  assert.match(calendar, /OpenStreetMap route planner/);
  assert.match(calendar, /OpenTripMap/);
  assert.match(calendar, /Confirm calendar change/);
  assert.match(calendar, /Confirm move/);
  assert.match(calendar, /setPendingMove/);
  assert.match(calendar, /dropOnItem/);
  assert.match(calendar, /type="time"/);
  assert.match(calendar, /Pre-departure bookings/);
  assert.match(calendar, /Confirm before departure/);
  assert.match(calendar, /Completed/);

  const byId = new Map(seed.map((item) => [item.id, item]));
  assert.equal(byId.get("a9")?.time, "12:30 target · allow 2h");
  assert.equal(byId.get("a09b")?.date, "2026-08-21");
  assert.equal(byId.get("a09b")?.time, "11:30 target · allow 2h");
  assert.equal(byId.get("a09c")?.time, "18:00–19:15");
  assert.equal(byId.get("m09b")?.title, "Dinner after Tokyo Tower");
  assert.match(calendar, /card-photo/);
  assert.match(calendar, /imageCredit/);
  assert.match(calendar, /<img src=\{photo\.imageUrl\}/);
  assert.match(calendar, /lockedImageManifest/);
  assert.match(calendar, /\["attraction", "hotel"\]/);
  assert.doesNotMatch(calendar, /from "next\/image"/);

  const cacheRegistration = await readFile(new URL("../app/components/PhotoCacheRegistration.tsx", import.meta.url), "utf8");
  const photoWorker = await readFile(new URL("../public/attraction-photo-cache.js", import.meta.url), "utf8");
  assert.match(cacheRegistration, /serviceWorker\.register\("\/attraction-photo-cache\.js"/);
  assert.match(photoWorker, /japan-trip-attraction-photos/);
  assert.match(photoWorker, /cache\.match\(request, \{ ignoreSearch: true \}\)/);
  assert.match(photoWorker, /cache\.put\(request, response\.clone\(\)\)/);

  assert.doesNotMatch(calendar, /@\/data\/seed/);
  assert.match(map, /tile\.openstreetmap\.org/);
  assert.match(map, /scrollWheelZoom: true/);
  assert.match(map, /map-zoom-controls/);
  assert.match(map, /Fit route/);
  assert.match(calendar, /fetch\("\/api\/geocode"/);
  assert.match(calendar, /fetch\("\/api\/status"/);
  assert.match(calendar, /12_000/);
  assert.match(calendar, /Updated automatically from/);
  assert.match(store, /post-1am-open-map-restore-2026-07-22-v3-images/);
  assert.match(store, /CREATE TABLE IF NOT EXISTS geocode_cache/);
  assert.match(store, /countrycodes/);
  assert.match(store, /JapanFamilyTripCalendar\/1\.0/);
  assert.match(store, /1100/);
  assert.match(geocodeApi, /isAuthorized/);
  assert.match(geocodeApi, /geocodePlace/);
  assert.match(tripApi, /private, no-store/);
  assert.match(statusApi, /no-store, max-age=0/);
  assert.equal(JSON.parse(baseline).length, 135);
  assert.equal(mergeAudit.finalItems, 210);
  assert.equal(mergeAudit.mappedItems, 177);
  assert.deepEqual(mergeAudit.unresolved, []);
  assert.equal(attractions.length, 83);
  assert.ok(attractions.every((item) => item.imageUrl && item.imageSource && item.imageCredit));
  assert.ok(attractions.every((item) => imageManifest[item.id]?.imageUrl));
  assert.ok(hotels.every((item) => imageManifest[item.id]?.imageUrl));
  await Promise.all(attractions.map((item) => access(new URL(`../public${item.imageUrl}`, import.meta.url))));
  assert.match(hosting, /"d1":\s*"DB"/);
  assert.doesNotMatch(page, /Your site is taking shape/);
});
