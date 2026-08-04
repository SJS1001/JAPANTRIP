export type FamilyRatingRole = "viewer" | "editor";
export type FamilyRatingActor = { role: FamilyRatingRole; id?: string } | null;
export type RatingTargetKind = "attraction" | "hotel";

export type FamilyRatingRecord = {
  id: string;
  targetId: string;
  targetKind: RatingTargetKind;
  memberName: string;
  memberKey: string;
  stars: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type FamilyRating = Omit<FamilyRatingRecord, "memberKey" | "deletedAt">;
export type FamilyRatingsResult = {
  ratings: FamilyRating[];
  summary: { average: number | null; count: number };
};

export interface FamilyRatingStore {
  list(targetId?: string): Promise<FamilyRatingRecord[]>;
  get(id: string): Promise<FamilyRatingRecord | null>;
  find(targetId: string, memberKey: string): Promise<FamilyRatingRecord | null>;
  insert(rating: FamilyRatingRecord): Promise<void>;
  update(id: string, patch: Partial<FamilyRatingRecord>): Promise<FamilyRatingRecord | null>;
}

export class MemoryFamilyRatingStore implements FamilyRatingStore {
  private values = new Map<string, FamilyRatingRecord>();
  async list(targetId?: string) { return [...this.values.values()].filter((rating) => !targetId || rating.targetId === targetId).map((rating) => ({ ...rating })); }
  async get(id: string) { const value = this.values.get(id); return value ? { ...value } : null; }
  async find(targetId: string, memberKey: string) { return [...this.values.values()].find((rating) => rating.targetId === targetId && rating.memberKey === memberKey) ?? null; }
  async insert(rating: FamilyRatingRecord) { this.values.set(rating.id, { ...rating }); }
  async update(id: string, patch: Partial<FamilyRatingRecord>) {
    const current = this.values.get(id);
    if (!current) return null;
    const updated = { ...current, ...patch, id: current.id };
    this.values.set(id, updated);
    return { ...updated };
  }
}

export class FamilyRatingAccessError extends Error {
  readonly status: 401 | 403;
  constructor(status: 401 | 403) {
    super(status === 401 ? "Family access is required." : "Editor access is required.");
    this.name = "FamilyRatingAccessError";
    this.status = status;
  }
}

export class FamilyRatingValidationError extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = "FamilyRatingValidationError";
    this.field = field;
  }
}

export class FamilyRatingNotFoundError extends Error {
  readonly status = 404;
  constructor() { super("Family rating not found."); this.name = "FamilyRatingNotFoundError"; }
}

function requireViewer(actor: FamilyRatingActor): asserts actor is { role: FamilyRatingRole; id?: string } {
  if (!actor) throw new FamilyRatingAccessError(401);
}
function requireEditor(actor: FamilyRatingActor): asserts actor is { role: "editor"; id?: string } {
  if (!actor) throw new FamilyRatingAccessError(401);
  if (actor.role !== "editor") throw new FamilyRatingAccessError(403);
}

const ALLOWED = new Set(["targetId", "targetKind", "memberName", "stars", "comment"]);
function normalizeInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new FamilyRatingValidationError("rating", "Rating details are required.");
  const unknown = Object.keys(input).find((key) => !ALLOWED.has(key));
  if (unknown) throw new FamilyRatingValidationError(unknown, `${unknown} is not an allowed rating field.`);
  const value = input as Record<string, unknown>;
  const targetId = typeof value.targetId === "string" ? value.targetId.trim() : "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(targetId)) throw new FamilyRatingValidationError("targetId", "A valid attraction or hotel ID is required.");
  if (value.targetKind !== "attraction" && value.targetKind !== "hotel") throw new FamilyRatingValidationError("targetKind", "Ratings are available only for attractions and hotels.");
  const memberName = typeof value.memberName === "string" ? value.memberName.trim().replace(/\s+/g, " ") : "";
  if (!memberName || memberName.length > 60) throw new FamilyRatingValidationError("memberName", "Family member name must be between 1 and 60 characters.");
  if (!Number.isInteger(value.stars) || Number(value.stars) < 1 || Number(value.stars) > 5) throw new FamilyRatingValidationError("stars", "Stars must be a whole number from 1 to 5.");
  const comment = value.comment === undefined || value.comment === null || value.comment === "" ? undefined : typeof value.comment === "string" ? value.comment.trim() : null;
  if (comment === null || (comment && comment.length > 500)) throw new FamilyRatingValidationError("comment", "Comments must be 500 characters or fewer.");
  return { targetId, targetKind: value.targetKind as RatingTargetKind, memberName, memberKey: memberName.toLocaleLowerCase("en-US"), stars: Number(value.stars), comment: comment || undefined };
}

function view(record: FamilyRatingRecord): FamilyRating {
  return {
    id: record.id, targetId: record.targetId, targetKind: record.targetKind,
    memberName: record.memberName, stars: record.stars, comment: record.comment,
    createdAt: record.createdAt, updatedAt: record.updatedAt,
  };
}

type FamilyRatingsOptions = { store: FamilyRatingStore; randomId?: () => string; now?: () => Date };
export class FamilyRatingsModule {
  private store: FamilyRatingStore;
  private randomId: () => string;
  private now: () => Date;
  constructor(options: FamilyRatingsOptions) {
    this.store = options.store;
    this.randomId = options.randomId ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => new Date());
  }

  async list(actor: FamilyRatingActor, options: { targetId?: string } = {}): Promise<FamilyRatingsResult> {
    requireViewer(actor);
    if (options.targetId && !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(options.targetId)) throw new FamilyRatingValidationError("targetId", "The target ID is not valid.");
    const ratings = (await this.store.list(options.targetId)).filter((rating) => !rating.deletedAt).sort((a, b) => a.memberName.localeCompare(b.memberName)).map(view);
    return {
      ratings,
      summary: {
        average: ratings.length ? Math.round((ratings.reduce((sum, rating) => sum + rating.stars, 0) / ratings.length) * 10) / 10 : null,
        count: ratings.length,
      },
    };
  }

  async upsert(actor: FamilyRatingActor, input: unknown): Promise<FamilyRating> {
    requireEditor(actor);
    const normalized = normalizeInput(input);
    const existing = await this.store.find(normalized.targetId, normalized.memberKey);
    const timestamp = this.now().toISOString();
    if (existing) {
      const updated = await this.store.update(existing.id, { ...normalized, updatedAt: timestamp, deletedAt: null });
      if (!updated) throw new FamilyRatingNotFoundError();
      return view(updated);
    }
    const record: FamilyRatingRecord = { id: this.randomId(), ...normalized, createdAt: timestamp, updatedAt: timestamp, deletedAt: null };
    try {
      await this.store.insert(record);
      return view(record);
    } catch (error) {
      // Two devices can submit the same member/target at once. The database's
      // unique constraint chooses one row; update that row instead of failing.
      const raced = await this.store.find(normalized.targetId, normalized.memberKey);
      if (!raced) throw error;
      const updated = await this.store.update(raced.id, { ...normalized, updatedAt: timestamp, deletedAt: null });
      if (!updated) throw error;
      return view(updated);
    }
  }

  async remove(actor: FamilyRatingActor, id: string) {
    requireEditor(actor);
    const rating = await this.store.get(id);
    if (!rating || rating.deletedAt) throw new FamilyRatingNotFoundError();
    await this.store.update(id, { deletedAt: this.now().toISOString() });
  }
}
