import { env } from "cloudflare:workers";

type RateLimitRow = { attempts: number; window_started: number };
type Statement = {
  bind: (...values: unknown[]) => Statement;
  first: <T = unknown>() => Promise<T | null>;
  run: () => Promise<unknown>;
};
type Database = { prepare: (sql: string) => Statement };

function database() {
  const db = (env as unknown as { DB?: Database }).DB;
  if (!db) throw new Error("Request protection is unavailable.");
  return db;
}

async function ensureSchema() {
  await database().prepare(`CREATE TABLE IF NOT EXISTS request_rate_limits (
    scope TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    window_started INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (scope, fingerprint)
  )`).run();
}

export async function requestFingerprint(request: Request, scope: string) {
  const address = request.headers.get("cf-connecting-ip") || "unknown";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`japan-trip-request-v2|${scope}|${address}`),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function requestRateLimitDecision(
  row: RateLimitRow,
  maximum: number,
  windowMs: number,
  now = Date.now(),
) {
  if (row.attempts <= maximum) {
    return { allowed: true as const, remaining: Math.max(0, maximum - row.attempts), retryAfter: 0 };
  }
  return {
    allowed: false as const,
    remaining: 0,
    retryAfter: Math.max(1, Math.ceil((row.window_started + windowMs - now) / 1000)),
  };
}

export async function consumeRequestLimit(
  request: Request,
  scope: string,
  options: { maximum: number; windowMs: number },
) {
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(scope)) {
    throw new Error("The request limit scope is invalid.");
  }
  await ensureSchema();
  const now = Date.now();
  const cutoff = now - options.windowMs;
  const key = await requestFingerprint(request, scope);
  const db = database();
  await db.prepare("DELETE FROM request_rate_limits WHERE updated_at < ?")
    .bind(now - options.windowMs * 2)
    .run();
  await db.prepare(`INSERT INTO request_rate_limits
      (scope, fingerprint, attempts, window_started, updated_at)
    VALUES (?, ?, 1, ?, ?)
    ON CONFLICT(scope, fingerprint) DO UPDATE SET
      attempts = CASE WHEN window_started <= ? THEN 1 ELSE attempts + 1 END,
      window_started = CASE WHEN window_started <= ? THEN ? ELSE window_started END,
      updated_at = ?`)
    .bind(scope, key, now, now, cutoff, cutoff, now, now)
    .run();
  const row = await db.prepare(
    "SELECT attempts, window_started FROM request_rate_limits WHERE scope = ? AND fingerprint = ?",
  ).bind(scope, key).first<RateLimitRow>();
  if (!row) throw new Error("The request limit could not be checked.");
  return requestRateLimitDecision(row, options.maximum, options.windowMs, now);
}
