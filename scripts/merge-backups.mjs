import { readFile, writeFile } from "node:fs/promises";

const [basePath, laterPath, outputPath, auditPath, ...supplementalPaths] = process.argv.slice(2);
if (!basePath || !laterPath || !outputPath || !auditPath) {
  throw new Error("Usage: merge-backups <full-backup> <later-backup> <output> <audit>");
}

const [baseBackup, laterBackup] = await Promise.all([
  readFile(basePath, "utf8").then(JSON.parse),
  readFile(laterPath, "utf8").then(JSON.parse),
]);
const supplementalBackups = await Promise.all(
  supplementalPaths.map((path) => readFile(path, "utf8").then(JSON.parse)),
);

const base = new Map(baseBackup.items.map((item) => [item.id, item]));
const later = new Map(laterBackup.items.map((item) => [item.id, item]));

// These later records are replacements or regressions of richer records in the
// full-map backup. Every omitted ID is accounted for in aliases below.
const skipLater = new Set([
  "tok-kappa",
  "tok-borderless",
  "tok-tower",
  "tok-roppongi",
  "a11",
  "hk-bus1",
  "hk-bus2",
  "hk-metro",
  "hk-dinner",
  "hk-taxi",
  "hk-lunch",
  "hk-mountain",
  "hk-sounzan",
  "hk-rope1",
  "hk-return",
  "hk-freepass",
  "hk-buffer",
  "tk-borderless",
  "tok-shibuya-bon",
  "a62",
  "tok-west-mega-check",
]);

const removeBase = new Set([
  "a2b",
  "a2c",
  "a7b",
  "a53",
  "a54",
  "lug1",
  "tkhakone",
  "tkpass",
  "tknijo",
]);

const aliases = {
  "tok-kappa": ["a1c"],
  a2b: ["tok-ueno-park", "tok-ameyoko"],
  a2c: ["a55", "a61"],
  a7b: ["tok-hachiko", "tok-megadonki"],
  "tok-borderless": ["a09b"],
  "tok-tower": ["a09c"],
  "tok-roppongi": ["a09d"],
  lug1: ["hk-luggage"],
  "hk-bus1": ["t10b"],
  "hk-bus2": ["t10c"],
  "hk-metro": ["t10g"],
  "hk-dinner": ["m10d"],
  "hk-taxi": ["t10a"],
  "hk-lunch": ["m10b"],
  "hk-mountain": ["t10d"],
  "hk-sounzan": ["a14x"],
  "hk-rope1": ["t10e"],
  "hk-return": ["t10f"],
  "hk-freepass": ["pass-hakone"],
  "hk-buffer": ["m10c"],
  a53: ["tok-imperial"],
  a54: ["tok-west-sunshine"],
  tkhakone: ["pass-hakone"],
  tkpass: ["pass-kansai"],
  tknijo: ["tk-nijo"],
  "tk-borderless": ["tk3"],
  "tok-shibuya-bon": ["a8b"],
  a62: ["a60"],
  "tok-west-mega-check": ["a60"],
};

const explicitlyExcluded = {
  a11: "Removed at the traveler’s request: Museum of Emerging Science and Innovation.",
};

const statusRank = { "not-needed": 0, "to-buy": 1, booked: 2 };
function mergeCommon(full, newer) {
  const result = { ...full };
  if ((statusRank[newer.ticketStatus] ?? -1) > (statusRank[full.ticketStatus] ?? -1)) {
    result.ticketStatus = newer.ticketStatus;
  }
  if (newer.confirmed === true) result.confirmed = true;
  if (newer.confirmation) result.confirmation = newer.confirmation;
  if (newer.cost) result.cost = newer.cost;
  for (const key of ["quantity", "fareDetails", "imageUrl", "link", "lat", "lng"]) {
    if ((result[key] === undefined || result[key] === "") && newer[key] !== undefined && newer[key] !== "") {
      result[key] = newer[key];
    }
  }
  return result;
}

const merged = [];
for (const item of baseBackup.items) {
  if (removeBase.has(item.id)) continue;
  merged.push(later.has(item.id) ? mergeCommon(item, later.get(item.id)) : item);
}
for (const item of laterBackup.items) {
  if (base.has(item.id) || skipLater.has(item.id)) continue;
  merged.push(item);
}
for (const backup of supplementalBackups) {
  for (const item of backup.items) {
    if (merged.some((candidate) => candidate.id === item.id) || skipLater.has(item.id) || removeBase.has(item.id)) continue;
    merged.push(item);
  }
}

const peaceMuseum = merged.find((item) => item.id === "a32");
const peaceTicket = merged.find((item) => item.id === "tk5");
if (peaceMuseum?.ticketStatus === "booked" && peaceTicket) {
  peaceTicket.ticketStatus = "booked";
  peaceTicket.confirmed = true;
  peaceTicket.confirmation = peaceMuseum.confirmation;
  peaceTicket.cost = peaceMuseum.cost;
}

merged.sort((a, b) => a.date.localeCompare(b.date) || String(a.time ?? "").localeCompare(String(b.time ?? "")) || a.id.localeCompare(b.id));

const finalIds = new Set(merged.map((item) => item.id));
const unionIds = new Set([
  ...base.keys(),
  ...later.keys(),
  ...supplementalBackups.flatMap((backup) => backup.items.map((item) => item.id)),
]);
const unresolved = [...unionIds].filter(
  (id) => !finalIds.has(id) && !aliases[id] && !explicitlyExcluded[id],
);
if (unresolved.length) throw new Error(`Unresolved backup records: ${unresolved.join(", ")}`);

const missingAliasTargets = Object.entries(aliases).filter(([, targets]) =>
  targets.some((id) => !finalIds.has(id)),
);
if (missingAliasTargets.length) {
  throw new Error(`Missing canonical replacements: ${JSON.stringify(missingAliasTargets)}`);
}

const audit = {
  generatedAt: new Date().toISOString(),
  fullBackup: { exportedAt: baseBackup.exportedAt, version: baseBackup.version, items: baseBackup.items.length },
  laterBackup: { exportedAt: laterBackup.exportedAt, version: laterBackup.version, items: laterBackup.items.length },
  supplementalBackups: supplementalBackups.map((backup) => ({ exportedAt: backup.exportedAt, version: backup.version, items: backup.items.length })),
  unionIds: unionIds.size,
  finalItems: merged.length,
  mappedItems: merged.filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng)).length,
  bookedItems: merged.filter((item) => item.ticketStatus === "booked").length,
  aliases,
  explicitlyExcluded,
  unresolved,
};

await Promise.all([
  writeFile(outputPath, `${JSON.stringify(merged, null, 2)}\n`),
  writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`),
]);
console.log(`Merged ${baseBackup.items.length} + ${laterBackup.items.length} records into ${merged.length} verified items.`);
