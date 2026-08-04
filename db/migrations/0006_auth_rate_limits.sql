CREATE TABLE IF NOT EXISTS auth_rate_limits (
  fingerprint TEXT PRIMARY KEY NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started INTEGER NOT NULL,
  blocked_until INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_rate_limits_updated_idx
  ON auth_rate_limits(updated_at);
