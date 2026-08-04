import { env } from "cloudflare:workers";

type Statement = {
  bind: (...values: unknown[]) => Statement;
  first: <T = unknown>() => Promise<T | null>;
  run: () => Promise<unknown>;
};
type Database = { prepare: (sql: string) => Statement };

function database() {
  const db = (env as unknown as { DB?: Database }).DB;
  if (!db) throw new Error("Family AI settings are unavailable.");
  return db;
}

async function ensureSchema() {
  await database().prepare(`CREATE TABLE IF NOT EXISTS family_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
}

export async function readFamilyAiEnabled() {
  await ensureSchema();
  const row = await database()
    .prepare("SELECT value FROM family_settings WHERE key = 'openai_enabled'")
    .first<{ value: string }>();
  return row?.value === "true";
}

export async function writeFamilyAiEnabled(enabled: boolean, updatedBy: string) {
  await ensureSchema();
  const updatedAt = new Date().toISOString();
  await database().prepare(`INSERT INTO family_settings (key, value, updated_by, updated_at)
    VALUES ('openai_enabled', ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`)
    .bind(String(enabled), updatedBy.slice(0, 80) || "Family editor", updatedAt)
    .run();
  return { enabled, updatedAt };
}
