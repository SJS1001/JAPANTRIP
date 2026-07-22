import { env } from "cloudflare:workers";
import cloudBaseline from "../data/cloud-baseline.json";
import mergeAudit from "../data/merge-audit.json";
import seedItems from "../data/seed.json";

type TripRecord = Record<string, unknown> & { id: string };
const AUDITED_RESTORE_ID = "post-1am-open-map-restore-2026-07-22-v1";

type D1Result<T = unknown> = {
  results?: T[];
  success: boolean;
  meta?: { changes?: number };
};

type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  first: <T = unknown>() => Promise<T | null>;
  run: <T = unknown>() => Promise<D1Result<T>>;
  all: <T = unknown>() => Promise<D1Result<T>>;
};

type D1Database = {
  prepare: (query: string) => D1Statement;
  batch: (statements: D1Statement[]) => Promise<D1Result[]>;
};

function database() {
  const binding = (env as unknown as { DB?: D1Database }).DB;
  if (!binding) throw new Error("The shared trip database is unavailable.");
  return binding;
}

export async function ensureTripSchema() {
  const db = database();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS trip_state (
      id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_by TEXT NOT NULL DEFAULT 'Family',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS trip_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL,
      action TEXT NOT NULL,
      changed_by TEXT NOT NULL DEFAULT 'Family',
      changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS trip_history_version_idx ON trip_history(version)",
    ),
    db.prepare(`CREATE TABLE IF NOT EXISTS trip_migrations (
      id TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
  ]);
}

type StateRow = {
  payload: string;
  version: number;
  updated_by: string;
  updated_at: string;
};

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function mergeAuditedItems(currentItems: TripRecord[]) {
  const baseline = new Map(
    (cloudBaseline as TripRecord[]).map((item) => [item.id, item]),
  );
  const current = new Map(currentItems.map((item) => [item.id, item]));
  const aliases = mergeAudit.aliases as Record<string, string[]>;
  const excluded = new Set([
    ...Object.keys(aliases),
    ...Object.keys(mergeAudit.explicitlyExcluded),
  ]);

  const result = (seedItems as TripRecord[]).map((canonical) => {
    const live = current.get(canonical.id);
    if (!live) return canonical;
    const original = baseline.get(canonical.id);
    if (!original) return { ...canonical, ...live, id: canonical.id };

    const preserved = { ...canonical };
    for (const [key, value] of Object.entries(live)) {
      if (!sameValue(value, original[key])) preserved[key] = value;
    }
    return preserved;
  });

  // A missing item that existed in the exact cloud baseline represents a
  // deliberate family deletion. Canonical items added by the recovered full
  // agenda are unaffected.
  const liveIds = new Set(current.keys());
  const deletedBaselineIds = new Set(
    [...baseline.keys()].filter((id) => !liveIds.has(id)),
  );
  const withoutDeleted = result.filter(
    (item) => !deletedBaselineIds.has(item.id),
  );

  // Preserve genuine family-created records that appeared after the deployed
  // baseline. Old duplicate IDs and the explicitly removed museum stay out.
  for (const item of currentItems) {
    if (
      !baseline.has(item.id) &&
      !withoutDeleted.some((candidate) => candidate.id === item.id) &&
      !excluded.has(item.id)
    ) {
      withoutDeleted.push(item);
    }
  }

  return withoutDeleted.sort((left, right) =>
    String(left.date ?? "").localeCompare(String(right.date ?? "")) ||
    String(left.time ?? "").localeCompare(String(right.time ?? "")) ||
    left.id.localeCompare(right.id),
  );
}

async function restoreAuditedBackups(row: StateRow) {
  const db = database();
  const applied = await db
    .prepare("SELECT id FROM trip_migrations WHERE id = ?")
    .bind(AUDITED_RESTORE_ID)
    .first<{ id: string }>();
  if (applied) return row;

  const currentItems = JSON.parse(row.payload) as TripRecord[];
  const mergedItems = mergeAuditedItems(currentItems);
  const nextVersion = row.version + 1;
  const update = await db
    .prepare(
      "UPDATE trip_state SET payload = ?, version = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ?",
    )
    .bind(
      JSON.stringify(mergedItems),
      nextVersion,
      "Trip recovery audit",
      "family-trip",
      row.version,
    )
    .run();

  if (update.meta?.changes) {
    await db.batch([
      db
        .prepare(
          "INSERT OR IGNORE INTO trip_migrations (id) VALUES (?)",
        )
        .bind(AUDITED_RESTORE_ID),
      db
        .prepare(
          "INSERT INTO trip_history (version, action, changed_by) VALUES (?, ?, ?)",
        )
        .bind(
          nextVersion,
          `Restored and reconciled all post-1 AM backups (${mergedItems.length} items)`,
          "Trip recovery audit",
        ),
    ]);
  }

  return (
    (await db
      .prepare(
        "SELECT payload, version, updated_by, updated_at FROM trip_state WHERE id = ?",
      )
      .bind("family-trip")
      .first<StateRow>()) ?? row
  );
}

export async function readTrip() {
  await ensureTripSchema();
  const db = database();
  let row = await db
    .prepare(
      "SELECT payload, version, updated_by, updated_at FROM trip_state WHERE id = ?",
    )
    .bind("family-trip")
    .first<StateRow>();

  if (!row) {
    const payload = JSON.stringify(seedItems);
    await db
      .prepare(
        "INSERT INTO trip_state (id, payload, version, updated_by) VALUES (?, ?, 1, ?)",
      )
      .bind("family-trip", payload, "Trip planner")
      .run();
    row = await db
      .prepare(
        "SELECT payload, version, updated_by, updated_at FROM trip_state WHERE id = ?",
      )
      .bind("family-trip")
      .first<StateRow>();
  }

  if (!row) throw new Error("The trip could not be initialized.");
  row = await restoreAuditedBackups(row);
  return {
    items: JSON.parse(row.payload),
    version: row.version,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export async function recentHistory() {
  await ensureTripSchema();
  const result = await database()
    .prepare(
      "SELECT id, version, action, changed_by AS changedBy, changed_at AS changedAt FROM trip_history ORDER BY id DESC LIMIT 30",
    )
    .all();
  return result.results ?? [];
}

export async function writeTrip(input: {
  items: unknown[];
  baseVersion: number;
  changedBy: string;
  action: string;
}) {
  await ensureTripSchema();
  const db = database();
  const nextVersion = input.baseVersion + 1;
  const payload = JSON.stringify(input.items);
  const update = await db
    .prepare(
      "UPDATE trip_state SET payload = ?, version = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ?",
    )
    .bind(
      payload,
      nextVersion,
      input.changedBy,
      "family-trip",
      input.baseVersion,
    )
    .run();

  if (!update.meta?.changes) return { conflict: true as const };

  await db
    .prepare(
      "INSERT INTO trip_history (version, action, changed_by) VALUES (?, ?, ?)",
    )
    .bind(nextVersion, input.action, input.changedBy)
    .run();

  return { conflict: false as const, version: nextVersion };
}

export async function restoreVerifiedTrip(input: { baseVersion: number; changedBy: string }) {
  return writeTrip({
    items: seedItems,
    baseVersion: input.baseVersion,
    changedBy: input.changedBy,
    action: "Restored the verified complete itinerary",
  });
}
