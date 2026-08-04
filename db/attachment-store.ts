import { env } from "cloudflare:workers";

import {
  AttachmentModule,
  type AttachmentBlobStore,
  type AttachmentMediaType,
  type AttachmentMetadataStore,
  type AttachmentRecord,
  type R2AttachmentBucket,
} from "@/lib/attachments";

type D1Result<T = unknown> = {
  results?: T[];
  success: boolean;
  meta?: { changes?: number };
};

type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  first: <T = unknown>() => Promise<T | null>;
  run: <T = unknown>() => Promise<D1Result<T>>;
  all: <T = unknown>() => Promise<D1Result<T>>;
};

type D1Database = {
  prepare: (query: string) => D1Statement;
};

type AttachmentEnvironment = {
  DB?: D1Database;
  ATTACHMENTS?: R2AttachmentBucket;
};

type AttachmentRow = {
  id: string;
  trip_item_id: string;
  object_key: string;
  display_name: string;
  media_type: AttachmentMediaType;
  size: number;
  sha256: string;
  label: AttachmentRecord["label"] | null;
  viewer_approved: number;
  uploaded_by: string;
  uploaded_at: string;
  deleted_at: string | null;
};

const SELECT_COLUMNS = `
  id, trip_item_id, object_key, display_name, media_type, size, sha256,
  label, viewer_approved, uploaded_by, uploaded_at, deleted_at
`;

function bindings() {
  return env as unknown as AttachmentEnvironment;
}

function database() {
  const value = bindings().DB;
  if (!value) throw new Error("The attachment metadata database is unavailable.");
  return value;
}

function bucket() {
  const value = bindings().ATTACHMENTS;
  if (!value) throw new Error("The private attachment bucket is unavailable.");
  return value;
}

let schemaReady: Promise<void> | null = null;

async function initializeAttachmentSchema() {
  const db = database();
  await db.prepare(`CREATE TABLE IF NOT EXISTS trip_attachments (
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
  )`).run();
  await Promise.all([
    db.prepare(`CREATE INDEX IF NOT EXISTS trip_attachments_item_idx
      ON trip_attachments (trip_item_id)`).run(),
    db.prepare(`CREATE INDEX IF NOT EXISTS trip_attachments_uploaded_at_idx
      ON trip_attachments (uploaded_at)`).run(),
    db.prepare(`CREATE INDEX IF NOT EXISTS trip_attachments_deleted_at_idx
      ON trip_attachments (deleted_at)`).run(),
  ]);
}

export async function ensureAttachmentSchema() {
  schemaReady ??= initializeAttachmentSchema();
  try {
    await schemaReady;
  } catch (error) {
    schemaReady = null;
    throw error;
  }
}

function fromRow(row: AttachmentRow): AttachmentRecord {
  return {
    id: row.id,
    tripItemId: row.trip_item_id,
    objectKey: row.object_key,
    displayName: row.display_name,
    mediaType: row.media_type,
    size: Number(row.size),
    sha256: row.sha256,
    label: row.label ?? undefined,
    viewerApproved: Boolean(row.viewer_approved),
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
    deletedAt: row.deleted_at,
  };
}

export class D1AttachmentMetadataStore implements AttachmentMetadataStore {
  async insert(record: AttachmentRecord): Promise<void> {
    await ensureAttachmentSchema();
    await database()
      .prepare(`INSERT INTO trip_attachments (
        id, trip_item_id, object_key, display_name, media_type, size, sha256,
        label, viewer_approved, uploaded_by, uploaded_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        record.id,
        record.tripItemId,
        record.objectKey,
        record.displayName,
        record.mediaType,
        record.size,
        record.sha256,
        record.label ?? null,
        record.viewerApproved ? 1 : 0,
        record.uploadedBy,
        record.uploadedAt,
        record.deletedAt,
      )
      .run();
  }

  async get(id: string): Promise<AttachmentRecord | null> {
    await ensureAttachmentSchema();
    const row = await database()
      .prepare(`SELECT ${SELECT_COLUMNS} FROM trip_attachments WHERE id = ?`)
      .bind(id)
      .first<AttachmentRow>();
    return row ? fromRow(row) : null;
  }

  async list(tripItemId?: string): Promise<AttachmentRecord[]> {
    await ensureAttachmentSchema();
    const statement = tripItemId
      ? database()
          .prepare(`SELECT ${SELECT_COLUMNS} FROM trip_attachments WHERE trip_item_id = ?`)
          .bind(tripItemId)
      : database().prepare(`SELECT ${SELECT_COLUMNS} FROM trip_attachments`);
    const result = await statement.all<AttachmentRow>();
    return (result.results ?? []).map(fromRow);
  }

  async update(
    id: string,
    patch: Partial<AttachmentRecord>,
  ): Promise<AttachmentRecord | null> {
    await ensureAttachmentSchema();
    const current = await this.get(id);
    if (!current) return null;
    const updated = { ...current, ...patch, id: current.id };
    const result = await database()
      .prepare(`UPDATE trip_attachments
        SET display_name = ?, label = ?, viewer_approved = ?, deleted_at = ?
        WHERE id = ?`)
      .bind(
        updated.displayName,
        updated.label ?? null,
        updated.viewerApproved ? 1 : 0,
        updated.deletedAt,
        id,
      )
      .run();
    return result.meta?.changes ? updated : null;
  }
}

export class R2AttachmentBlobStore implements AttachmentBlobStore {
  async put(
    key: string,
    bytes: Uint8Array,
    mediaType: AttachmentMediaType,
  ): Promise<void> {
    await bucket().put(key, bytes, { httpMetadata: { contentType: mediaType } });
  }

  async get(key: string): Promise<Uint8Array | null> {
    const object = await bucket().get(key);
    return object ? new Uint8Array(await object.arrayBuffer()) : null;
  }

  async delete(key: string): Promise<void> {
    await bucket().delete(key);
  }
}

export function attachmentModule() {
  return new AttachmentModule({
    blobs: new R2AttachmentBlobStore(),
    metadata: new D1AttachmentMetadataStore(),
  });
}
