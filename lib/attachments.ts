export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export type AttachmentRole = "viewer" | "editor";
export type AttachmentActor = { role: AttachmentRole; id?: string } | null;
export type AttachmentMediaType =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/webp";
export type AttachmentLabel =
  | "ticket"
  | "reservation"
  | "qr-code"
  | "receipt"
  | "instructions";

export type AttachmentRecord = {
  id: string;
  tripItemId: string;
  objectKey: string;
  displayName: string;
  mediaType: AttachmentMediaType;
  size: number;
  sha256: string;
  label?: AttachmentLabel;
  viewerApproved: boolean;
  uploadedBy: string;
  uploadedAt: string;
  deletedAt: string | null;
};

export type AttachmentSummary = Omit<
  AttachmentRecord,
  "objectKey" | "sha256" | "uploadedBy"
>;

export interface AttachmentBlobStore {
  put(key: string, bytes: Uint8Array, mediaType: AttachmentMediaType): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

/** Minimal private R2 binding contract for a future production blob adapter. */
export interface R2AttachmentBucket {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView,
    options: { httpMetadata: { contentType: AttachmentMediaType } },
  ): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
  delete(key: string): Promise<void>;
}

export interface AttachmentMetadataStore {
  insert(record: AttachmentRecord): Promise<void>;
  get(id: string): Promise<AttachmentRecord | null>;
  list(tripItemId?: string): Promise<AttachmentRecord[]>;
  update(id: string, patch: Partial<AttachmentRecord>): Promise<AttachmentRecord | null>;
}

export class AttachmentAccessError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403) {
    super(status === 401 ? "Family access is required." : "Editor access is required.");
    this.name = "AttachmentAccessError";
    this.status = status;
  }
}

export class AttachmentValidationError extends Error {
  readonly code: "file-too-large" | "invalid-file";

  constructor(code: "file-too-large" | "invalid-file", message: string) {
    super(message);
    this.name = "AttachmentValidationError";
    this.code = code;
  }
}

export class AttachmentNotFoundError extends Error {
  readonly status = 404;

  constructor() {
    super("Attachment not found.");
    this.name = "AttachmentNotFoundError";
  }
}

export class MemoryAttachmentBlobStore implements AttachmentBlobStore {
  private readonly records = new Map<string, Uint8Array>();

  async put(key: string, bytes: Uint8Array): Promise<void> {
    this.records.set(key, bytes.slice());
  }

  async get(key: string): Promise<Uint8Array | null> {
    return this.records.get(key)?.slice() ?? null;
  }

  async delete(key: string): Promise<void> {
    this.records.delete(key);
  }

  get size() {
    return this.records.size;
  }

  keys() {
    return [...this.records.keys()];
  }
}

export class MemoryAttachmentMetadataStore implements AttachmentMetadataStore {
  private readonly records = new Map<string, AttachmentRecord>();

  async insert(record: AttachmentRecord): Promise<void> {
    this.records.set(record.id, { ...record });
  }

  async get(id: string): Promise<AttachmentRecord | null> {
    const record = this.records.get(id);
    return record ? { ...record } : null;
  }

  async list(tripItemId?: string): Promise<AttachmentRecord[]> {
    return [...this.records.values()]
      .filter((record) => !tripItemId || record.tripItemId === tripItemId)
      .map((record) => ({ ...record }));
  }

  async update(id: string, patch: Partial<AttachmentRecord>): Promise<AttachmentRecord | null> {
    const record = this.records.get(id);
    if (!record) return null;
    const updated = { ...record, ...patch, id: record.id };
    this.records.set(id, updated);
    return { ...updated };
  }
}

export type AttachmentModuleOptions = {
  blobs: AttachmentBlobStore;
  metadata: AttachmentMetadataStore;
  randomId?: () => string;
  now?: () => Date;
};

function requireEditor(actor: AttachmentActor): asserts actor is { role: "editor"; id?: string } {
  if (!actor) throw new AttachmentAccessError(401);
  if (actor.role !== "editor") throw new AttachmentAccessError(403);
}

function requireViewer(actor: AttachmentActor): asserts actor is { role: AttachmentRole; id?: string } {
  if (!actor) throw new AttachmentAccessError(401);
  if (actor.role !== "viewer" && actor.role !== "editor") {
    throw new AttachmentAccessError(403);
  }
}

function detectedMediaType(bytes: Uint8Array): AttachmentMediaType | null {
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return "application/pdf";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function safeSummary(record: AttachmentRecord): AttachmentSummary {
  return {
    id: record.id,
    tripItemId: record.tripItemId,
    displayName: record.displayName,
    mediaType: record.mediaType,
    size: record.size,
    label: record.label,
    viewerApproved: record.viewerApproved,
    uploadedAt: record.uploadedAt,
    deletedAt: record.deletedAt,
  };
}

function safeDisplayName(value: string, mediaType: AttachmentMediaType) {
  const fallback = mediaType === "application/pdf" ? "attachment.pdf" : "attachment";
  const basename = value.split(/[\\/]/).at(-1) ?? "";
  const cleaned = basename
    .replace(/[\u0000-\u001f\u007f]/g, "_")
    .trim()
    .slice(0, 180);
  return cleaned || fallback;
}

function contentDisposition(displayName: string) {
  const ascii = displayName
    .replace(/["\\]/g, "_")
    .replace(/[^\x20-\x7e]/g, "_");
  return `attachment; filename="${ascii}"`;
}

async function sha256(bytes: Uint8Array) {
  const input = new Uint8Array(bytes);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export class AttachmentModule {
  private readonly blobs: AttachmentBlobStore;
  private readonly metadata: AttachmentMetadataStore;
  private readonly randomId: () => string;
  private readonly now: () => Date;

  constructor(options: AttachmentModuleOptions) {
    this.blobs = options.blobs;
    this.metadata = options.metadata;
    this.randomId = options.randomId ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => new Date());
  }

  async list(
    actor: AttachmentActor,
    options: { tripItemId?: string; includeDeleted?: boolean } = {},
  ): Promise<AttachmentSummary[]> {
    requireViewer(actor);
    const records = await this.metadata.list(options.tripItemId);
    return records
      .filter((record) => {
        if (actor.role === "viewer") return record.viewerApproved && !record.deletedAt;
        return options.includeDeleted || !record.deletedAt;
      })
      .sort((left, right) =>
        left.uploadedAt.localeCompare(right.uploadedAt) || left.id.localeCompare(right.id),
      )
      .map(safeSummary);
  }

  async read(
    actor: AttachmentActor,
    id: string,
  ): Promise<{
    metadata: AttachmentSummary;
    body: Uint8Array;
    headers: Record<string, string>;
  }> {
    requireViewer(actor);
    const record = await this.metadata.get(id);
    if (
      !record ||
      record.deletedAt ||
      (actor.role === "viewer" && !record.viewerApproved)
    ) {
      throw new AttachmentNotFoundError();
    }
    const body = await this.blobs.get(record.objectKey);
    if (!body) throw new AttachmentNotFoundError();
    return {
      metadata: safeSummary(record),
      body,
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": contentDisposition(record.displayName),
        "content-length": String(record.size),
        "content-type": record.mediaType,
        "x-content-type-options": "nosniff",
      },
    };
  }

  async label(
    actor: AttachmentActor,
    id: string,
    input: {
      displayName?: string;
      label?: AttachmentLabel;
      viewerApproved?: boolean;
    },
  ): Promise<AttachmentSummary> {
    requireEditor(actor);
    const current = await this.metadata.get(id);
    if (!current || current.deletedAt) throw new AttachmentNotFoundError();
    const labels = new Set<AttachmentLabel>([
      "ticket",
      "reservation",
      "qr-code",
      "receipt",
      "instructions",
    ]);
    if (input.label !== undefined && !labels.has(input.label)) {
      throw new AttachmentValidationError("invalid-file", "Unknown attachment label.");
    }
    const patch: Partial<AttachmentRecord> = {};
    if (input.displayName !== undefined) {
      patch.displayName = safeDisplayName(input.displayName, current.mediaType);
    }
    if (input.label !== undefined) patch.label = input.label;
    if (input.viewerApproved !== undefined) {
      patch.viewerApproved = input.viewerApproved;
    }
    const updated = await this.metadata.update(id, patch);
    if (!updated) throw new AttachmentNotFoundError();
    return safeSummary(updated);
  }

  async softDelete(actor: AttachmentActor, id: string): Promise<AttachmentSummary> {
    requireEditor(actor);
    const current = await this.metadata.get(id);
    if (!current) throw new AttachmentNotFoundError();
    if (current.deletedAt) return safeSummary(current);
    const updated = await this.metadata.update(id, {
      deletedAt: this.now().toISOString(),
    });
    if (!updated) throw new AttachmentNotFoundError();
    return safeSummary(updated);
  }

  async restore(actor: AttachmentActor, id: string): Promise<AttachmentSummary> {
    requireEditor(actor);
    const current = await this.metadata.get(id);
    if (!current) throw new AttachmentNotFoundError();
    if (!current.deletedAt) return safeSummary(current);
    const updated = await this.metadata.update(id, { deletedAt: null });
    if (!updated) throw new AttachmentNotFoundError();
    return safeSummary(updated);
  }

  async upload(
    actor: AttachmentActor,
    input: {
      tripItemId: string;
      displayName: string;
      bytes: Uint8Array;
      claimedMediaType?: string;
      label?: AttachmentLabel;
      viewerApproved?: boolean;
    },
  ): Promise<AttachmentSummary> {
    requireEditor(actor);
    if (input.bytes.byteLength > MAX_ATTACHMENT_BYTES) {
      throw new AttachmentValidationError(
        "file-too-large",
        "Attachments must be 10 MB or smaller.",
      );
    }
    const mediaType = detectedMediaType(input.bytes);
    if (!mediaType || (input.claimedMediaType && input.claimedMediaType !== mediaType)) {
      throw new AttachmentValidationError(
        "invalid-file",
        "The file signature does not match an allowed attachment type.",
      );
    }
    const id = this.randomId();
    const objectKey = this.randomId();
    const record: AttachmentRecord = {
      id,
      tripItemId: input.tripItemId,
      objectKey,
      displayName: safeDisplayName(input.displayName, mediaType),
      mediaType,
      size: input.bytes.byteLength,
      sha256: await sha256(input.bytes),
      label: input.label,
      viewerApproved: input.viewerApproved ?? false,
      uploadedBy: actor.id ?? "editor",
      uploadedAt: this.now().toISOString(),
      deletedAt: null,
    };
    await this.blobs.put(objectKey, input.bytes, mediaType);
    try {
      await this.metadata.insert(record);
    } catch (error) {
      await this.blobs.delete(objectKey);
      throw error;
    }
    return safeSummary(record);
  }
}
