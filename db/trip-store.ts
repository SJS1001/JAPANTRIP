import { env } from "cloudflare:workers";
import seedItems from "../data/seed.json";

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
  ]);
}

type StateRow = {
  payload: string;
  version: number;
  updated_by: string;
  updated_at: string;
};

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
