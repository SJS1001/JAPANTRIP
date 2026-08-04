CREATE TABLE IF NOT EXISTS development_notes (
  id TEXT PRIMARY KEY NOT NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS development_notes_updated_idx
  ON development_notes (deleted_at, updated_at);

CREATE TABLE IF NOT EXISTS development_note_screenshots (
  id TEXT PRIMARY KEY NOT NULL,
  note_id TEXT NOT NULL REFERENCES development_notes(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image/jpeg', 'image/png', 'image/webp')),
  size INTEGER NOT NULL CHECK (size > 0 AND size <= 10485760),
  uploaded_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS development_note_screenshots_note_idx
  ON development_note_screenshots (note_id, deleted_at, uploaded_at);
