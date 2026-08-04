export const MAX_DEVELOPMENT_NOTE_LENGTH = 5_000;
export const MAX_DEVELOPMENT_SCREENSHOT_BYTES = 10 * 1024 * 1024;

export type DevelopmentNoteRole = "viewer" | "editor";
export type DevelopmentNoteActor = { role: DevelopmentNoteRole; id?: string } | null;
export type DevelopmentScreenshotMediaType = "image/jpeg" | "image/png" | "image/webp";

export type DevelopmentScreenshotRecord = {
  id: string;
  noteId: string;
  objectKey: string;
  displayName: string;
  mediaType: DevelopmentScreenshotMediaType;
  size: number;
  uploadedAt: string;
  deletedAt: string | null;
};

export type DevelopmentScreenshot = Omit<DevelopmentScreenshotRecord, "objectKey" | "deletedAt">;

export type DevelopmentNoteRecord = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type DevelopmentNote = Omit<DevelopmentNoteRecord, "deletedAt"> & {
  screenshots: DevelopmentScreenshot[];
};

export interface DevelopmentNoteStore {
  listNotes(): Promise<DevelopmentNoteRecord[]>;
  getNote(id: string): Promise<DevelopmentNoteRecord | null>;
  insertNote(note: DevelopmentNoteRecord): Promise<void>;
  updateNote(id: string, patch: Partial<DevelopmentNoteRecord>): Promise<DevelopmentNoteRecord | null>;
  listScreenshots(noteId?: string): Promise<DevelopmentScreenshotRecord[]>;
  getScreenshot(id: string): Promise<DevelopmentScreenshotRecord | null>;
  insertScreenshot(screenshot: DevelopmentScreenshotRecord): Promise<void>;
  updateScreenshot(id: string, patch: Partial<DevelopmentScreenshotRecord>): Promise<DevelopmentScreenshotRecord | null>;
}

export interface DevelopmentNoteBlobStore {
  put(key: string, bytes: Uint8Array, mediaType: DevelopmentScreenshotMediaType): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

export class DevelopmentNoteAccessError extends Error {
  readonly status: 401 | 403;
  constructor(status: 401 | 403) {
    super(status === 401 ? "Family access is required." : "Editor access is required.");
    this.name = "DevelopmentNoteAccessError";
    this.status = status;
  }
}

export class DevelopmentNoteValidationError extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = "DevelopmentNoteValidationError";
    this.field = field;
  }
}

export class DevelopmentNoteNotFoundError extends Error {
  readonly status = 404;
  constructor(message = "Development note not found.") {
    super(message);
    this.name = "DevelopmentNoteNotFoundError";
  }
}

export class MemoryDevelopmentNoteStore implements DevelopmentNoteStore {
  private notes = new Map<string, DevelopmentNoteRecord>();
  private screenshots = new Map<string, DevelopmentScreenshotRecord>();
  async listNotes() { return [...this.notes.values()].map((value) => ({ ...value })); }
  async getNote(id: string) { const value = this.notes.get(id); return value ? { ...value } : null; }
  async insertNote(note: DevelopmentNoteRecord) { this.notes.set(note.id, { ...note }); }
  async updateNote(id: string, patch: Partial<DevelopmentNoteRecord>) {
    const value = this.notes.get(id);
    if (!value) return null;
    const updated = { ...value, ...patch, id: value.id };
    this.notes.set(id, updated);
    return { ...updated };
  }
  async listScreenshots(noteId?: string) {
    return [...this.screenshots.values()]
      .filter((value) => !noteId || value.noteId === noteId)
      .map((value) => ({ ...value }));
  }
  async getScreenshot(id: string) { const value = this.screenshots.get(id); return value ? { ...value } : null; }
  async insertScreenshot(screenshot: DevelopmentScreenshotRecord) { this.screenshots.set(screenshot.id, { ...screenshot }); }
  async updateScreenshot(id: string, patch: Partial<DevelopmentScreenshotRecord>) {
    const value = this.screenshots.get(id);
    if (!value) return null;
    const updated = { ...value, ...patch, id: value.id };
    this.screenshots.set(id, updated);
    return { ...updated };
  }
}

export class MemoryDevelopmentNoteBlobStore implements DevelopmentNoteBlobStore {
  private values = new Map<string, Uint8Array>();
  async put(key: string, bytes: Uint8Array) { this.values.set(key, bytes.slice()); }
  async get(key: string) { return this.values.get(key)?.slice() ?? null; }
  async delete(key: string) { this.values.delete(key); }
}

function requireEditor(actor: DevelopmentNoteActor): asserts actor is { role: "editor"; id?: string } {
  if (!actor) throw new DevelopmentNoteAccessError(401);
  if (actor.role !== "editor") throw new DevelopmentNoteAccessError(403);
}

function normalizeBody(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new DevelopmentNoteValidationError("body", "A development note is required.");
  }
  const body = value.trim();
  if (body.length > MAX_DEVELOPMENT_NOTE_LENGTH) {
    throw new DevelopmentNoteValidationError("body", `Development notes must be ${MAX_DEVELOPMENT_NOTE_LENGTH} characters or fewer.`);
  }
  return body;
}

function validateFields(value: unknown, allowed: Set<string>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DevelopmentNoteValidationError("note", "Development note details are required.");
  }
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  if (unknown) throw new DevelopmentNoteValidationError(unknown, `${unknown} is not an allowed development note field.`);
}

function mediaType(bytes: Uint8Array): DevelopmentScreenshotMediaType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  return null;
}

function safeName(value: string) {
  return (value.split(/[\\/]/).at(-1) ?? "screenshot")
    .replace(/[\u0000-\u001f\u007f]/g, "_")
    .trim()
    .slice(0, 180) || "screenshot";
}

function screenshotView(value: DevelopmentScreenshotRecord): DevelopmentScreenshot {
  return {
    id: value.id,
    noteId: value.noteId,
    displayName: value.displayName,
    mediaType: value.mediaType,
    size: value.size,
    uploadedAt: value.uploadedAt,
  };
}

function noteView(value: DevelopmentNoteRecord) {
  return { id: value.id, body: value.body, createdAt: value.createdAt, updatedAt: value.updatedAt };
}

type DevelopmentNotesOptions = {
  store: DevelopmentNoteStore;
  blobs: DevelopmentNoteBlobStore;
  randomId?: () => string;
  now?: () => Date;
};

export class DevelopmentNotesModule {
  private store: DevelopmentNoteStore;
  private blobs: DevelopmentNoteBlobStore;
  private randomId: () => string;
  private now: () => Date;
  constructor(options: DevelopmentNotesOptions) {
    this.store = options.store;
    this.blobs = options.blobs;
    this.randomId = options.randomId ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => new Date());
  }

  async list(actor: DevelopmentNoteActor): Promise<DevelopmentNote[]> {
    requireEditor(actor);
    const [notes, screenshots] = await Promise.all([this.store.listNotes(), this.store.listScreenshots()]);
    return notes
      .filter((note) => !note.deletedAt)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))
      .map((note) => ({
        ...noteView(note),
        screenshots: screenshots
          .filter((shot) => shot.noteId === note.id && !shot.deletedAt)
          .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt))
          .map(screenshotView),
      }));
  }

  async create(actor: DevelopmentNoteActor, input: { body: string }): Promise<DevelopmentNote> {
    requireEditor(actor);
    validateFields(input, new Set(["body"]));
    const timestamp = this.now().toISOString();
    const record: DevelopmentNoteRecord = {
      id: this.randomId(), body: normalizeBody(input.body), createdAt: timestamp, updatedAt: timestamp, deletedAt: null,
    };
    await this.store.insertNote(record);
    return { ...noteView(record), screenshots: [] };
  }

  async update(actor: DevelopmentNoteActor, id: string, input: { body?: string }): Promise<DevelopmentNote> {
    requireEditor(actor);
    validateFields(input, new Set(["body"]));
    const current = await this.store.getNote(id);
    if (!current || current.deletedAt) throw new DevelopmentNoteNotFoundError();
    const updated = await this.store.updateNote(id, {
      body: normalizeBody(input.body), updatedAt: this.now().toISOString(),
    });
    if (!updated) throw new DevelopmentNoteNotFoundError();
    const screenshots = (await this.store.listScreenshots(id)).filter((shot) => !shot.deletedAt).map(screenshotView);
    return { ...noteView(updated), screenshots };
  }

  async remove(actor: DevelopmentNoteActor, id: string) {
    requireEditor(actor);
    const current = await this.store.getNote(id);
    if (!current || current.deletedAt) throw new DevelopmentNoteNotFoundError();
    const deletedAt = this.now().toISOString();
    await this.store.updateNote(id, { deletedAt, updatedAt: deletedAt });
    const screenshots = (await this.store.listScreenshots(id)).filter((shot) => !shot.deletedAt);
    await Promise.all(screenshots.map((shot) => this.store.updateScreenshot(shot.id, { deletedAt })));
    await Promise.all(screenshots.map((shot) => this.blobs.delete(shot.objectKey)));
  }

  async addScreenshot(actor: DevelopmentNoteActor, noteId: string, input: {
    bytes: Uint8Array; displayName: string; claimedMediaType?: string;
  }): Promise<DevelopmentScreenshot> {
    requireEditor(actor);
    const note = await this.store.getNote(noteId);
    if (!note || note.deletedAt) throw new DevelopmentNoteNotFoundError();
    if (!(input.bytes instanceof Uint8Array) || !input.bytes.length || input.bytes.length > MAX_DEVELOPMENT_SCREENSHOT_BYTES) {
      throw new DevelopmentNoteValidationError("file", `Screenshots must be between 1 byte and ${MAX_DEVELOPMENT_SCREENSHOT_BYTES / 1024 / 1024} MB.`);
    }
    const detected = mediaType(input.bytes);
    if (!detected || (input.claimedMediaType && input.claimedMediaType !== detected)) {
      throw new DevelopmentNoteValidationError("file", "The screenshot must be a real PNG, JPEG, or WebP image.");
    }
    const id = this.randomId();
    const timestamp = this.now().toISOString();
    const record: DevelopmentScreenshotRecord = {
      id, noteId, objectKey: `development-notes/${noteId}/${id}`, displayName: safeName(input.displayName),
      mediaType: detected, size: input.bytes.length, uploadedAt: timestamp, deletedAt: null,
    };
    await this.blobs.put(record.objectKey, input.bytes, detected);
    try {
      await this.store.insertScreenshot(record);
    } catch (error) {
      await this.blobs.delete(record.objectKey).catch(() => undefined);
      throw error;
    }
    return screenshotView(record);
  }

  async readScreenshot(actor: DevelopmentNoteActor, id: string) {
    requireEditor(actor);
    const screenshot = await this.store.getScreenshot(id);
    if (!screenshot || screenshot.deletedAt) throw new DevelopmentNoteNotFoundError("Screenshot not found.");
    const note = await this.store.getNote(screenshot.noteId);
    if (!note || note.deletedAt) throw new DevelopmentNoteNotFoundError("Screenshot not found.");
    const body = await this.blobs.get(screenshot.objectKey);
    if (!body) throw new DevelopmentNoteNotFoundError("Screenshot not found.");
    return {
      body,
      headers: {
        "cache-control": "private, no-store, max-age=0",
        "content-type": screenshot.mediaType,
        "content-length": String(screenshot.size),
        "content-disposition": `inline; filename="${screenshot.displayName.replace(/["\\]/g, "_")}"`,
        "x-content-type-options": "nosniff",
      },
    };
  }

  async removeScreenshot(actor: DevelopmentNoteActor, id: string) {
    requireEditor(actor);
    const screenshot = await this.store.getScreenshot(id);
    if (!screenshot || screenshot.deletedAt) throw new DevelopmentNoteNotFoundError("Screenshot not found.");
    await this.store.updateScreenshot(id, { deletedAt: this.now().toISOString() });
    await this.blobs.delete(screenshot.objectKey);
  }
}
