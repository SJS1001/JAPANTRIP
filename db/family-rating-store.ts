import { env } from "cloudflare:workers";

import {
  FamilyRatingsModule,
  type FamilyRatingRecord,
  type FamilyRatingStore,
  type RatingTargetKind,
} from "@/lib/family-ratings";

type D1Result<T = unknown> = { results?: T[]; success: boolean; meta?: { changes?: number } };
type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  first: <T = unknown>() => Promise<T | null>;
  run: <T = unknown>() => Promise<D1Result<T>>;
  all: <T = unknown>() => Promise<D1Result<T>>;
};
type D1Database = { prepare: (query: string) => D1Statement; batch: (statements: D1Statement[]) => Promise<D1Result[]> };
type Environment = { DB?: D1Database };
function database() { const value = (env as unknown as Environment).DB; if (!value) throw new Error("The family ratings database is unavailable."); return value; }

let schemaReady: Promise<void> | null = null;
async function initializeSchema() {
  const db = database();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS family_ratings (
      id TEXT PRIMARY KEY NOT NULL, target_id TEXT NOT NULL,
      target_kind TEXT NOT NULL CHECK (target_kind IN ('attraction', 'hotel')),
      member_name TEXT NOT NULL, member_key TEXT NOT NULL,
      stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
      comment TEXT CHECK (comment IS NULL OR length(comment) <= 500),
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT,
      UNIQUE (target_id, member_key)
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS family_ratings_target_idx ON family_ratings (target_id, deleted_at, member_name)`),
  ]);
}
async function ensureSchema() { schemaReady ??= initializeSchema(); try { await schemaReady; } catch (error) { schemaReady = null; throw error; } }

type RatingRow = { id: string; target_id: string; target_kind: RatingTargetKind; member_name: string; member_key: string; stars: number; comment: string | null; created_at: string; updated_at: string; deleted_at: string | null };
const COLUMNS = "id, target_id, target_kind, member_name, member_key, stars, comment, created_at, updated_at, deleted_at";
function fromRow(row: RatingRow): FamilyRatingRecord { return { id: row.id, targetId: row.target_id, targetKind: row.target_kind, memberName: row.member_name, memberKey: row.member_key, stars: Number(row.stars), comment: row.comment ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at, deletedAt: row.deleted_at }; }

export class D1FamilyRatingStore implements FamilyRatingStore {
  async list(targetId?: string) { await ensureSchema(); const statement = targetId ? database().prepare(`SELECT ${COLUMNS} FROM family_ratings WHERE target_id = ?`).bind(targetId) : database().prepare(`SELECT ${COLUMNS} FROM family_ratings`); const result = await statement.all<RatingRow>(); return (result.results ?? []).map(fromRow); }
  async get(id: string) { await ensureSchema(); const row = await database().prepare(`SELECT ${COLUMNS} FROM family_ratings WHERE id = ?`).bind(id).first<RatingRow>(); return row ? fromRow(row) : null; }
  async find(targetId: string, memberKey: string) { await ensureSchema(); const row = await database().prepare(`SELECT ${COLUMNS} FROM family_ratings WHERE target_id = ? AND member_key = ?`).bind(targetId, memberKey).first<RatingRow>(); return row ? fromRow(row) : null; }
  async insert(value: FamilyRatingRecord) { await ensureSchema(); await database().prepare(`INSERT INTO family_ratings (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(value.id, value.targetId, value.targetKind, value.memberName, value.memberKey, value.stars, value.comment ?? null, value.createdAt, value.updatedAt, value.deletedAt).run(); }
  async update(id: string, patch: Partial<FamilyRatingRecord>) { const current = await this.get(id); if (!current) return null; const value = { ...current, ...patch, id: current.id }; const result = await database().prepare(`UPDATE family_ratings SET target_id = ?, target_kind = ?, member_name = ?, member_key = ?, stars = ?, comment = ?, created_at = ?, updated_at = ?, deleted_at = ? WHERE id = ?`).bind(value.targetId, value.targetKind, value.memberName, value.memberKey, value.stars, value.comment ?? null, value.createdAt, value.updatedAt, value.deletedAt, id).run(); return result.meta?.changes === 0 ? null : value; }
}

export function familyRatingsModule() { return new FamilyRatingsModule({ store: new D1FamilyRatingStore() }); }
