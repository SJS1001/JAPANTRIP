import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the protected shared family calendar", async () => {
  const [page, calendar, hosting] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/TripCalendar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);
  assert.match(page, /TripCalendar/);
  assert.match(calendar, /Private family calendar/);
  assert.match(calendar, /Passes & tickets/);
  assert.match(calendar, /japanTripCloudCache/);
  assert.match(hosting, /"d1":\s*"DB"/);
  assert.doesNotMatch(page, /Your site is taking shape/);
});
