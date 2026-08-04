import { env } from "cloudflare:workers";

import {
  DevelopmentNotesModule,
  type DevelopmentNoteBlobStore,
  type DevelopmentNoteRecord,
  type DevelopmentNoteStore,
  type DevelopmentScreenshotMediaType,
  type DevelopmentScreenshotRecord,
} from "@/lib/development-notes";

type D1Result<T = unknown> = { results?: T[]; success: boolean; meta?: { changes?: number } };
type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  first: <T = unknown>() => Promise<T | null>;
  run: <T = unknown>() => Promise<D1Result<T>>;
  all: <T = unknown>() => Promise<D1Result<T>>;
};
type D1Database = { prepare: (query: string) => D1Statement; batch: (statements: D1Statement[]) => Promise<D1Result[]> };
type PrivateBucket = {
  put(key: string, value: ArrayBuffer | ArrayBufferView, options: { httpMetadata: { contentType: DevelopmentScreenshotMediaType } }): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
  delete(key: string): Promise<void>;
};
type Environment = { DB?: D1Database; ATTACHMENTS?: PrivateBucket };

function bindings() { return env as unknown as Environment; }
function database() { const db = bindings().DB; if (!db) throw new Error("The development notes database is unavailable."); return db; }
function bucket() { const value = bindings().ATTACHMENTS; if (!value) throw new Error("The private development notes bucket is unavailable."); return value; }

let schemaReady: Promise<void> | null = null;
async function initializeSchema() {
  const db = database();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS development_notes (
      id TEXT PRIMARY KEY NOT NULL, body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS development_notes_updated_idx ON development_notes (deleted_at, updated_at)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS development_note_screenshots (
      id TEXT PRIMARY KEY NOT NULL, note_id TEXT NOT NULL REFERENCES development_notes(id) ON DELETE CASCADE,
      object_key TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
      media_type TEXT NOT NULL CHECK (media_type IN ('image/jpeg', 'image/png', 'image/webp')),
      size INTEGER NOT NULL CHECK (size > 0 AND size <= 10485760), uploaded_at TEXT NOT NULL, deleted_at TEXT
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS development_note_screenshots_note_idx ON development_note_screenshots (note_id, deleted_at, uploaded_at)`),
  ]);
}
async function ensureSchema() {
  schemaReady ??= initializeSchema();
  try { await schemaReady; } catch (error) { schemaReady = null; throw error; }
}

type NoteRow = { id: string; body: string; created_at: string; updated_at: string; deleted_at: string | null };
type ShotRow = { id: string; note_id: string; object_key: string; display_name: string; media_type: DevelopmentScreenshotMediaType; size: number; uploaded_at: string; deleted_at: string | null };
const NOTE_COLUMNS = "id, body, created_at, updated_at, deleted_at";
const SHOT_COLUMNS = "id, note_id, object_key, display_name, media_type, size, uploaded_at, deleted_at";
function noteFromRow(row: NoteRow): DevelopmentNoteRecord { return { id: row.id, body: row.body, createdAt: row.created_at, updatedAt: row.updated_at, deletedAt: row.deleted_at }; }
function shotFromRow(row: ShotRow): DevelopmentScreenshotRecord { return { id: row.id, noteId: row.note_id, objectKey: row.object_key, displayName: row.display_name, mediaType: row.media_type, size: Number(row.size), uploadedAt: row.uploaded_at, deletedAt: row.deleted_at }; }

export class D1DevelopmentNoteStore implements DevelopmentNoteStore {
  async listNotes() { await ensureSchema(); const result = await database().prepare(`SELECT ${NOTE_COLUMNS} FROM development_notes`).all<NoteRow>(); return (result.results ?? []).map(noteFromRow); }
  async getNote(id: string) { await ensureSchema(); const row = await database().prepare(`SELECT ${NOTE_COLUMNS} FROM development_notes WHERE id = ?`).bind(id).first<NoteRow>(); return row ? noteFromRow(row) : null; }
  async insertNote(note: DevelopmentNoteRecord) { await ensureSchema(); await database().prepare(`INSERT INTO development_notes (${NOTE_COLUMNS}) VALUES (?, ?, ?, ?, ?)`).bind(note.id, note.body, note.createdAt, note.updatedAt, note.deletedAt).run(); }
  async updateNote(id: string, patch: Partial<DevelopmentNoteRecord>) {
    const current = await this.getNote(id); if (!current) return null;
    const value = { ...current, ...patch, id: current.id };
    const result = await database().prepare(`UPDATE development_notes SET body = ?, created_at = ?, updated_at = ?, deleted_at = ? WHERE id = ?`).bind(value.body, value.createdAt, value.updatedAt, value.deletedAt, id).run();
    return result.meta?.changes === 0 ? null : value;
  }
  async listScreenshots(noteId?: string) {
    await ensureSchema();
    const statement = noteId ? database().prepare(`SELECT ${SHOT_COLUMNS} FROM development_note_screenshots WHERE note_id = ?`).bind(noteId) : database().prepare(`SELECT ${SHOT_COLUMNS} FROM development_note_screenshots`);
    const result = await statement.all<ShotRow>(); return (result.results ?? []).map(shotFromRow);
  }
  async getScreenshot(id: string) { await ensureSchema(); const row = await database().prepare(`SELECT ${SHOT_COLUMNS} FROM development_note_screenshots WHERE id = ?`).bind(id).first<ShotRow>(); return row ? shotFromRow(row) : null; }
  async insertScreenshot(value: DevelopmentScreenshotRecord) { await ensureSchema(); await database().prepare(`INSERT INTO development_note_screenshots (${SHOT_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(value.id, value.noteId, value.objectKey, value.displayName, value.mediaType, value.size, value.uploadedAt, value.deletedAt).run(); }
  async updateScreenshot(id: string, patch: Partial<DevelopmentScreenshotRecord>) {
    const current = await this.getScreenshot(id); if (!current) return null;
    const value = { ...current, ...patch, id: current.id };
    const result = await database().prepare(`UPDATE development_note_screenshots SET display_name = ?, deleted_at = ? WHERE id = ?`).bind(value.displayName, value.deletedAt, id).run();
    return result.meta?.changes === 0 ? null : value;
  }
}

export class R2DevelopmentNoteBlobStore implements DevelopmentNoteBlobStore {
  async put(key: string, bytes: Uint8Array, mediaType: DevelopmentScreenshotMediaType) { await bucket().put(key, bytes, { httpMetadata: { contentType: mediaType } }); }
  async get(key: string) { const object = await bucket().get(key); return object ? new Uint8Array(await object.arrayBuffer()) : null; }
  async delete(key: string) { await bucket().delete(key); }
}

export function developmentNotesModule() {
  return new DevelopmentNotesModule({ store: new D1DevelopmentNoteStore(), blobs: new R2DevelopmentNoteBlobStore() });
}
