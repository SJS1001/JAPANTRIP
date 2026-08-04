import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("live context panel is explicit, accessible, read-only, and keeps raw location on device", async () => {
  const source = await readFile(new URL("../app/components/LiveContextPanel.tsx", import.meta.url), "utf8");
  assert.match(source, /Use my location once/);
  assert.match(source, /getCurrentPosition/);
  assert.match(source, /nearestTripCity/);
  assert.match(source, /city=\$\{encodeURIComponent\(cityId\)\}/);
  assert.match(source, /Raw coordinates are discarded/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /Open JMA radar/);
  assert.match(source, /Official rail status/);
  assert.match(source, /Hakone operations/);
  assert.match(source, /Miyajima tides/);
  assert.match(source, /never changes the agenda/i);
  assert.doesNotMatch(source, /watchPosition/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /searchParams\.set\(["'](?:lat|lng|latitude|longitude)/);
});
