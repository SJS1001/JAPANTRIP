CREATE TABLE IF NOT EXISTS trip_attachments (
  id TEXT PRIMARY KEY NOT NULL,
  trip_item_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (
    media_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
  ),
  size INTEGER NOT NULL CHECK (size > 0 AND size <= 10485760),
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  label TEXT CHECK (
    label IS NULL OR label IN ('ticket', 'reservation', 'qr-code', 'receipt', 'instructions')
  ),
  viewer_approved INTEGER NOT NULL DEFAULT 0 CHECK (viewer_approved IN (0, 1)),
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS trip_attachments_item_idx
  ON trip_attachments (trip_item_id);

CREATE INDEX IF NOT EXISTS trip_attachments_uploaded_at_idx
  ON trip_attachments (uploaded_at);

CREATE INDEX IF NOT EXISTS trip_attachments_deleted_at_idx
  ON trip_attachments (deleted_at);
