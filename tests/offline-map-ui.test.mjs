import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("route map reacts to connection changes and retains a text route offline", async () => {
  const source = await readFile(new URL("../app/components/OpenTripMap.tsx", import.meta.url), "utf8");
  assert.match(source, /navigator\.onLine/);
  assert.match(source, /addEventListener\("offline"/);
  assert.match(source, /Interactive map requires a connection/);
  assert.match(source, /saved route order is still available/i);
  assert.match(source, /hidden=\{!online\}/);
});
