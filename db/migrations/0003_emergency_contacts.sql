CREATE TABLE IF NOT EXISTS emergency_contacts (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT NOT NULL,
  alternate_phone TEXT,
  email TEXT,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS emergency_contacts_active_order_idx
  ON emergency_contacts(deleted_at, sort_order);
