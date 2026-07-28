import { env } from "cloudflare:workers";

type D1Result = { success: boolean; meta?: { changes?: number } };
type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  first: <T = unknown>() => Promise<T | null>;
  run: () => Promise<D1Result>;
};
type D1Database = { prepare: (query: string) => D1Statement };

type WeatherRow = {
  payload: string;
  fetched_at: number;
};

function database() {
  const binding = (env as unknown as { DB?: D1Database }).DB;
  if (!binding) throw new Error("The shared weather cache is unavailable.");
  return binding;
}

let schemaReady: Promise<void> | null = null;

async function ensureWeatherSchema() {
  schemaReady ??= (async () => {
    const db = database();
    await db.prepare(`CREATE TABLE IF NOT EXISTS weather_cache (
      id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      fetched_at INTEGER NOT NULL
    )`).run();
    await db.prepare(`CREATE TABLE IF NOT EXISTS weather_refresh_lock (
      id TEXT PRIMARY KEY NOT NULL,
      last_request_at INTEGER NOT NULL DEFAULT 0
    )`).run();
  })();
  try {
    await schemaReady;
  } catch (error) {
    schemaReady = null;
    throw error;
  }
}

export async function readWeatherCache() {
  await ensureWeatherSchema();
  const row = await database()
    .prepare("SELECT payload, fetched_at FROM weather_cache WHERE id = ?")
    .bind("japan-route")
    .first<WeatherRow>();
  if (!row) return null;
  try {
    return {
      payload: JSON.parse(row.payload) as Record<string, unknown>,
      fetchedAt: Number(row.fetched_at),
    };
  } catch {
    return null;
  }
}

export async function claimWeatherRefresh(minimumIntervalMs = 60_000) {
  await ensureWeatherSchema();
  const db = database();
  await db
    .prepare("INSERT OR IGNORE INTO weather_refresh_lock (id, last_request_at) VALUES (?, 0)")
    .bind("open-meteo")
    .run();
  const claim = await db
    .prepare(`UPDATE weather_refresh_lock
      SET last_request_at = ?
      WHERE id = ? AND last_request_at <= ?`)
    .bind(Date.now(), "open-meteo", Date.now() - minimumIntervalMs)
    .run();
  return Boolean(claim.meta?.changes);
}

export async function writeWeatherCache(payload: Record<string, unknown>) {
  await ensureWeatherSchema();
  await database()
    .prepare("INSERT OR REPLACE INTO weather_cache (id, payload, fetched_at) VALUES (?, ?, ?)")
    .bind("japan-route", JSON.stringify(payload), Date.now())
    .run();
}
