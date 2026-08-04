CREATE TABLE IF NOT EXISTS request_rate_limits (
  scope TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (scope, fingerprint)
);

CREATE INDEX IF NOT EXISTS request_rate_limits_updated_idx
  ON request_rate_limits(updated_at);
