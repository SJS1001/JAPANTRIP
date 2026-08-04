import { env } from "cloudflare:workers";

import type {
  EmergencyContact,
  EmergencyContactStore,
} from "@/lib/emergency-contacts";

type D1Result<T = unknown> = {
  results?: T[];
  success: boolean;
};

type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  first: <T = unknown>() => Promise<T | null>;
  run: <T = unknown>() => Promise<D1Result<T>>;
  all: <T = unknown>() => Promise<D1Result<T>>;
};

export type EmergencyContactDatabase = {
  prepare: (query: string) => D1Statement;
  batch: (statements: D1Statement[]) => Promise<D1Result[]>;
};

type ContactRow = {
  id: string;
  name: string;
  relationship: string | null;
  phone: string;
  alternate_phone: string | null;
  email: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const COLUMNS = `id, name, relationship, phone, alternate_phone, email, notes,
  sort_order, created_at, updated_at, deleted_at`;

let schemaReady: Promise<void> | null = null;

async function initializeEmergencyContactSchema(db: EmergencyContactDatabase) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS emergency_contacts (
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
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS emergency_contacts_active_order_idx
      ON emergency_contacts(deleted_at, sort_order)`),
  ]);
}

async function ensureEmergencyContactSchema(db: EmergencyContactDatabase) {
  schemaReady ??= initializeEmergencyContactSchema(db);
  try {
    await schemaReady;
  } catch (error) {
    schemaReady = null;
    throw error;
  }
}

function fromRow(row: ContactRow): EmergencyContact {
  return {
    id: row.id,
    name: row.name,
    relationship: row.relationship ?? undefined,
    phone: row.phone,
    alternatePhone: row.alternate_phone ?? undefined,
    email: row.email ?? undefined,
    notes: row.notes ?? undefined,
    sortOrder: Number(row.sort_order),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function values(contact: EmergencyContact) {
  return [
    contact.id,
    contact.name,
    contact.relationship ?? null,
    contact.phone,
    contact.alternatePhone ?? null,
    contact.email ?? null,
    contact.notes ?? null,
    contact.sortOrder,
    contact.createdAt,
    contact.updatedAt,
    contact.deletedAt,
  ];
}

export function emergencyContactDatabase(): EmergencyContactDatabase {
  const binding = (env as unknown as { DB?: EmergencyContactDatabase }).DB;
  if (!binding) throw new Error("The emergency contact database is unavailable.");
  return binding;
}

export class D1EmergencyContactStore implements EmergencyContactStore {
  private readonly db: EmergencyContactDatabase;

  constructor(db: EmergencyContactDatabase) {
    this.db = db;
  }

  async list() {
    await ensureEmergencyContactSchema(this.db);
    const result = await this.db
      .prepare(
        `SELECT ${COLUMNS} FROM emergency_contacts ORDER BY sort_order, id`,
      )
      .all<ContactRow>();
    return (result.results ?? []).map(fromRow);
  }

  async insert(contact: EmergencyContact) {
    await ensureEmergencyContactSchema(this.db);
    await this.db
      .prepare(
        `INSERT INTO emergency_contacts (${COLUMNS})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(...values(contact))
      .run();
  }

  async get(id: string) {
    await ensureEmergencyContactSchema(this.db);
    const row = await this.db
      .prepare(`SELECT ${COLUMNS} FROM emergency_contacts WHERE id = ?`)
      .bind(id)
      .first<ContactRow>();
    return row ? fromRow(row) : null;
  }

  async update(id: string, patch: Partial<EmergencyContact>) {
    await ensureEmergencyContactSchema(this.db);
    const existing = await this.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, id: existing.id };
    await this.db
      .prepare(
        `UPDATE emergency_contacts
         SET name = ?, relationship = ?, phone = ?, alternate_phone = ?,
             email = ?, notes = ?, sort_order = ?, created_at = ?,
             updated_at = ?, deleted_at = ?
         WHERE id = ?`,
      )
      .bind(
        updated.name,
        updated.relationship ?? null,
        updated.phone,
        updated.alternatePhone ?? null,
        updated.email ?? null,
        updated.notes ?? null,
        updated.sortOrder,
        updated.createdAt,
        updated.updatedAt,
        updated.deletedAt,
        id,
      )
      .run();
    return updated;
  }

  async reorder(ids: string[], updatedAt: string) {
    if (!ids.length) return;
    await ensureEmergencyContactSchema(this.db);
    await this.db.batch(
      ids.map((id, sortOrder) =>
        this.db
          .prepare(
            "UPDATE emergency_contacts SET sort_order = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
          )
          .bind(sortOrder, updatedAt, id),
      ),
    );
  }
}
