import { env } from "cloudflare:workers";

const WINDOW_MS = 15 * 60_000;
const BLOCK_MS = 15 * 60_000;
const MAX_FAILURES = 5;

type Row = { attempts: number; window_started: number; blocked_until: number };
type Statement = {
  bind: (...values: unknown[]) => Statement;
  first: <T = unknown>() => Promise<T | null>;
  run: () => Promise<unknown>;
};
type Database = { prepare: (sql: string) => Statement };

function database() {
  const db = (env as unknown as { DB?: Database }).DB;
  if (!db) throw new Error("Authentication protection is unavailable.");
  return db;
}

async function ensureSchema() {
  await database().prepare(`CREATE TABLE IF NOT EXISTS auth_rate_limits (
    fingerprint TEXT PRIMARY KEY NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    window_started INTEGER NOT NULL,
    blocked_until INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  )`).run();
}

export async function authFingerprint(request: Request) {
  const address = request.headers.get("cf-connecting-ip") || "unknown";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`japan-trip-auth-v2|${address}`),
  );
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function authRateLimitDecision(row: Row | null, now = Date.now()) {
  if (!row || row.blocked_until <= now) return { allowed: true as const, retryAfter: 0 };
  return {
    allowed: false as const,
    retryAfter: Math.max(1, Math.ceil((row.blocked_until - now) / 1000)),
  };
}

export async function consumeAuthAttempt(request: Request) {
  await ensureSchema();
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const db = database();
  await db
    .prepare("DELETE FROM auth_rate_limits WHERE updated_at < ?")
    .bind(now - WINDOW_MS - BLOCK_MS)
    .run();
  const row = await db.prepare(`INSERT INTO auth_rate_limits
      (fingerprint, attempts, window_started, blocked_until, updated_at)
    VALUES (?, 1, ?, 0, ?)
    ON CONFLICT(fingerprint) DO UPDATE SET
      attempts = CASE WHEN window_started <= ? THEN 1 ELSE attempts + 1 END,
      window_started = CASE WHEN window_started <= ? THEN ? ELSE window_started END,
      blocked_until = CASE
        WHEN blocked_until > ? THEN blocked_until
        WHEN window_started <= ? THEN 0
        WHEN attempts + 1 > ? THEN ?
        ELSE 0
      END,
      updated_at = ?
    RETURNING attempts, window_started, blocked_until`)
    .bind(
      await authFingerprint(request),
      now,
      now,
      cutoff,
      cutoff,
      now,
      now,
      cutoff,
      MAX_FAILURES,
      now + BLOCK_MS,
      now,
    )
    .first<Row>();
  if (!row) throw new Error("Authentication protection could not be checked.");
  return authRateLimitDecision(row);
}

export async function clearAuthFailures(request: Request) {
  await ensureSchema();
  await database()
    .prepare("DELETE FROM auth_rate_limits WHERE fingerprint = ?")
    .bind(await authFingerprint(request))
    .run();
}
