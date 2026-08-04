-- AI Inbox staging and review records. This migration intentionally has no
-- trigger that can mutate trip_state: applying an approved proposal must use
-- the explicit, editor-only compare-and-swap transaction in application code.

CREATE TABLE IF NOT EXISTS inbox_documents (
  id TEXT PRIMARY KEY NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  media_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  content_sha256 TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_role TEXT NOT NULL CHECK (uploaded_role = 'editor'),
  base_trip_version INTEGER NOT NULL CHECK (base_trip_version >= 1),
  status TEXT NOT NULL DEFAULT 'staged'
    CHECK (status IN ('staged', 'analyzing', 'review', 'approved', 'rejected', 'failed')),
  failure_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS inbox_documents_status_created_idx
  ON inbox_documents(status, created_at);

CREATE TABLE IF NOT EXISTS inbox_proposals (
  id TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision = 1),
  document_id TEXT NOT NULL REFERENCES inbox_documents(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  kind TEXT NOT NULL
    CHECK (kind IN ('proposal', 'question', 'duplicate', 'unclassified')),
  base_trip_version INTEGER NOT NULL CHECK (base_trip_version >= 1),
  candidate_event_ids_json TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  outcome_json TEXT NOT NULL,
  integrity_sha256 TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'stale')),
  decided_by TEXT,
  decided_at TEXT,
  applied_trip_version INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, revision),
  CHECK (
    (kind = 'proposal' AND integrity_sha256 IS NOT NULL)
    OR (kind <> 'proposal' AND integrity_sha256 IS NULL)
  ),
  CHECK (
    (status = 'pending' AND decided_by IS NULL AND decided_at IS NULL)
    OR (status <> 'pending' AND decided_by IS NOT NULL AND decided_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS inbox_proposals_document_status_idx
  ON inbox_proposals(document_id, status, created_at);

-- One durable application receipt per immutable proposal revision. The unique
-- proposal key is the database half of idempotent approval/replay protection.
CREATE TABLE IF NOT EXISTS inbox_proposal_applications (
  proposal_id TEXT NOT NULL,
  proposal_revision INTEGER NOT NULL CHECK (proposal_revision = 1),
  integrity_sha256 TEXT NOT NULL,
  base_trip_version INTEGER NOT NULL,
  applied_trip_version INTEGER NOT NULL,
  approved_by TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (proposal_id, proposal_revision),
  FOREIGN KEY (proposal_id, proposal_revision)
    REFERENCES inbox_proposals(id, revision) ON DELETE RESTRICT,
  CHECK (applied_trip_version = base_trip_version + 1)
);
