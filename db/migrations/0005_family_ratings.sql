CREATE TABLE IF NOT EXISTS family_ratings (
  id TEXT PRIMARY KEY NOT NULL,
  target_id TEXT NOT NULL,
  target_kind TEXT NOT NULL CHECK (target_kind IN ('attraction', 'hotel')),
  member_name TEXT NOT NULL,
  member_key TEXT NOT NULL,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT CHECK (comment IS NULL OR length(comment) <= 500),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  UNIQUE (target_id, member_key)
);

CREATE INDEX IF NOT EXISTS family_ratings_target_idx
  ON family_ratings (target_id, deleted_at, member_name);
