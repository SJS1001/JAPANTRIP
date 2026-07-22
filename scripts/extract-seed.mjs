import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(here, "../../japan-family-trip-calendar.html");
const outputPath = resolve(here, "../data/seed.json");
const html = await readFile(sourcePath, "utf8");

function capture(pattern, label) {
  const match = html.match(pattern);
  if (!match) throw new Error(`Could not find ${label} in the offline calendar.`);
  return Function(`"use strict"; return (${match[1]});`)();
}

const baseItems = capture(/const BASE_ITEMS=(\[[\s\S]*?\]);\s*const RECOMMENDED=/, "BASE_ITEMS");
const recommended = capture(/const RECOMMENDED=(\[[\s\S]*?\]);\s*const DAYS=/, "RECOMMENDED");
const items = structuredClone(baseItems);

for (const addition of recommended) {
  const existing = items.find(
    (item) => item.id === addition.id || item.title === addition.title,
  );
  if (!existing) items.push(structuredClone(addition));
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
console.log(`Prepared ${items.length} itinerary records.`);
