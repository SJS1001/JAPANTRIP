import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("ships the protected shared family calendar", async () => {
  const [page, calendar, map, store, tripApi, statusApi, hosting, audit, baseline, seedText, imageManifestText, cardGuides, restaurantGuidesText, weatherApi, weatherStore] = await Promise.all([
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
    readFile(new URL("../data/card-guides.ts", import.meta.url), "utf8"),
    readFile(new URL("../data/restaurant-guides.json", import.meta.url), "utf8"),
    readFile(new URL("../app/api/weather/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/weather-store.ts", import.meta.url), "utf8"),
  ]);
  const mergeAudit = JSON.parse(audit);
  const seed = JSON.parse(seedText);
  const attractions = seed.filter((item) => item.category === "attraction");
  const hotels = seed.filter((item) => item.category === "hotel");
  const meals = seed.filter((item) => item.category === "meal");
  const transports = seed.filter((item) => item.category === "transport");
  const imageManifest = JSON.parse(imageManifestText);
  const restaurantGuides = JSON.parse(restaurantGuidesText);
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
  assert.match(calendar, /Tap for secrets, food & local tips/);
  assert.match(calendar, /Tap for booking, seats & views/);
  assert.match(calendar, /Tap for nearby restaurant choices/);
  assert.match(calendar, /Restaurant \/ place/);
  assert.match(calendar, /Check tables \/ reserve/);
  assert.match(calendar, /Reservation recommended/);
  assert.match(calendar, /Walk-in · expect a possible queue/);
  assert.match(calendar, /Best-rated nearby/);
  assert.match(calendar, /Gluten-friendly nearby/);
  assert.match(calendar, /not a medical guarantee/);
  assert.match(calendar, /More nearby/);
  assert.match(calendar, /Best seats & views/);
  assert.match(calendar, /Weather & heat plan/);
  assert.match(calendar, /Current conditions refresh automatically every 30 minutes/);
  assert.match(calendar, /japanTripWeatherCache/);
  assert.match(calendar, /30 \* 60_000/);
  assert.match(calendar, /Forecast not open yet/);
  assert.match(calendar, /Extreme heat plan/);
  assert.match(calendar, /Current source:/);
  assert.match(weatherApi, /api\.open-meteo\.com\/v1\/forecast/);
  assert.match(weatherApi, /forecast_days: "16"/);
  assert.match(weatherApi, /isAuthorized/);
  assert.match(weatherApi, /Asia\/Tokyo/);
  assert.match(weatherApi, /current: "temperature_2m/);
  assert.match(weatherApi, /WEATHER_FRESH_MS/);
  assert.match(weatherApi, /claimWeatherRefresh/);
  assert.match(weatherApi, /response\.status !== 429/);
  assert.match(weatherApi, /showing the last successful forecast/);
  assert.match(weatherApi, /api\.met\.no\/weatherapi\/locationforecast\/2\.0\/compact/);
  assert.match(weatherApi, /JapanFamilyTripCalendar\/1\.0/);
  assert.match(weatherApi, /MET Norway fallback/);
  assert.match(weatherStore, /CREATE TABLE IF NOT EXISTS weather_cache/);
  assert.match(weatherStore, /CREATE TABLE IF NOT EXISTS weather_refresh_lock/);
  assert.match(weatherStore, /INSERT OR REPLACE INTO weather_cache/);
  assert.match(calendar, /25 \* 60_000/);
  assert.doesNotMatch(calendar, /fetch\("\/api\/weather", \{ cache: "no-store" \}\)/);
  assert.doesNotMatch(weatherApi, /apikey|apiKey|API_KEY/);

  const byId = new Map(seed.map((item) => [item.id, item]));
  assert.equal(byId.get("a9")?.time, "12:30 target · allow 2h");
  assert.equal(byId.get("a09b")?.date, "2026-08-21");
  assert.equal(byId.get("a09b")?.time, "11:30 target · allow 2h");
  assert.equal(byId.get("a09c")?.time, "18:00–19:15");
  assert.equal(byId.get("m09b")?.title, "Dinner after Tokyo Tower");
  assert.equal(byId.get("hr-lunch")?.location, "Caffè Ponte, Hiroshima");
  assert.match(byId.get("hr-lunch")?.notes || "", /Nagata-ya.*closed/);
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
  assert.match(store, /restaurant-closure-replan-2026-07-27-v1/);
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
  const areaMappings = cardGuides.slice(cardGuides.indexOf("export const areaByItem"), cardGuides.indexOf("export const transportGuides"));
  const transportMappings = cardGuides.slice(cardGuides.indexOf("export const transportGuideByItem"));
  const mapped = (block, id) => new RegExp(`(?:^|[,{\\s])(?:"${id}"|${id.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")})\\s*:`).test(block);
  assert.ok([...attractions, ...hotels, ...meals].every((item) => mapped(areaMappings, item.id)), "every attraction, hotel and meal needs a nearby-area guide");
  assert.ok(transports.every((item) => mapped(transportMappings, item.id)), "every transport card needs booking and seat guidance");
  const usedAreas = new Set([...attractions, ...hotels, ...meals].map((item) => {
    const match = areaMappings.match(new RegExp(`(?:^|[,{\\s])(?:"${item.id}"|${item.id.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")})\\s*:\\s*"([^"]+)"`));
    return match?.[1];
  }));
  assert.ok([...usedAreas].every((area) => area && restaurantGuides[area]), "every scheduled attraction, hotel and meal area needs ranked restaurants");
  assert.ok(Object.values(restaurantGuides).every((guide) => guide.glutenFriendly.length >= 2), "every area needs two gluten-aware choices or clearly marked nearest alternatives");
  assert.ok(Object.values(restaurantGuides).every((guide) => guide.restaurants.length >= 10 || guide.availabilityNote), "areas with fewer than ten credible choices must explain the verified shortfall");
  const reservationStatuses = new Set(["required", "recommended", "walk-in", "unknown"]);
  assert.ok(Object.values(restaurantGuides).flatMap((guide) => guide.restaurants).every((restaurant) => reservationStatuses.has(restaurant.reservation)), "reservation status must render with a supported label and style");
  for (const area of ["asakusa", "ueno", "akihabara", "shibuya", "namba", "umeda", "gion", "shinjuku", "ginza", "marunouchi"]) {
    assert.equal(restaurantGuides[area].restaurants.length, 10, `${area} should expose a complete top ten`);
  }
  assert.doesNotMatch(cardGuides, /Tokyo Shiba Tōfuya Ukai|Nagata-ya okonomiyaki|Omen Kodaiji|Tsunahachi Sohonten/);
  await Promise.all(attractions.map((item) => access(new URL(`../public${item.imageUrl}`, import.meta.url))));
  assert.match(hosting, /"d1":\s*"DB"/);
  assert.doesNotMatch(page, /Your site is taking shape/);
});
