export type EmergencyContactRole = "viewer" | "editor";
export type EmergencyContactActor = {
  role: EmergencyContactRole;
  id?: string;
} | null;

export type EmergencyContact = {
  id: string;
  name: string;
  relationship?: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  notes?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type EmergencyContactView = Omit<EmergencyContact, "deletedAt">;

export type EmergencyContactInput = {
  name: string;
  relationship?: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  notes?: string;
};

export interface EmergencyContactStore {
  list(): Promise<EmergencyContact[]>;
  insert(contact: EmergencyContact): Promise<void>;
  get(id: string): Promise<EmergencyContact | null>;
  update(
    id: string,
    patch: Partial<EmergencyContact>,
  ): Promise<EmergencyContact | null>;
  reorder(ids: string[], updatedAt: string): Promise<void>;
}

export class EmergencyContactAccessError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403) {
    super(
      status === 401
        ? "Family access is required."
        : "Editor access is required.",
    );
    this.name = "EmergencyContactAccessError";
    this.status = status;
  }
}

export class EmergencyContactValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "EmergencyContactValidationError";
    this.field = field;
  }
}

export class EmergencyContactNotFoundError extends Error {
  readonly status = 404;

  constructor() {
    super("Emergency contact not found.");
    this.name = "EmergencyContactNotFoundError";
  }
}

export class MemoryEmergencyContactStore implements EmergencyContactStore {
  private readonly records = new Map<string, EmergencyContact>();

  async list() {
    return [...this.records.values()].map((record) => ({ ...record }));
  }

  async insert(contact: EmergencyContact) {
    this.records.set(contact.id, { ...contact });
  }

  async get(id: string) {
    const record = this.records.get(id);
    return record ? { ...record } : null;
  }

  async update(id: string, patch: Partial<EmergencyContact>) {
    const record = this.records.get(id);
    if (!record) return null;
    const updated = { ...record, ...patch, id: record.id };
    this.records.set(id, updated);
    return { ...updated };
  }

  async reorder(ids: string[], updatedAt: string) {
    ids.forEach((id, sortOrder) => {
      const record = this.records.get(id);
      if (record) this.records.set(id, { ...record, sortOrder, updatedAt });
    });
  }
}

type EmergencyContactsModuleOptions = {
  store: EmergencyContactStore;
  randomId?: () => string;
  now?: () => Date;
};

function requireViewer(
  actor: EmergencyContactActor,
): asserts actor is { role: EmergencyContactRole; id?: string } {
  if (!actor) throw new EmergencyContactAccessError(401);
}

function requireEditor(
  actor: EmergencyContactActor,
): asserts actor is { role: "editor"; id?: string } {
  if (!actor) throw new EmergencyContactAccessError(401);
  if (actor.role !== "editor") throw new EmergencyContactAccessError(403);
}

function view(record: EmergencyContact): EmergencyContactView {
  return {
    id: record.id,
    name: record.name,
    relationship: record.relationship,
    phone: record.phone,
    alternatePhone: record.alternatePhone,
    email: record.email,
    notes: record.notes,
    sortOrder: record.sortOrder,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

const INPUT_FIELDS = new Set([
  "name",
  "relationship",
  "phone",
  "alternatePhone",
  "email",
  "notes",
]);

function textField(
  value: unknown,
  field: string,
  maximum: number,
  required = false,
) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new EmergencyContactValidationError(field, `${field} is required.`);
    }
    return undefined;
  }
  if (typeof value !== "string") {
    throw new EmergencyContactValidationError(field, `${field} must be text.`);
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized && required) {
    throw new EmergencyContactValidationError(field, `${field} is required.`);
  }
  if (normalized.length > maximum) {
    throw new EmergencyContactValidationError(
      field,
      `${field} must be ${maximum} characters or fewer.`,
    );
  }
  return normalized || undefined;
}

function phoneField(value: unknown, field: string, required = false) {
  const normalized = textField(value, field, 40, required);
  if (!normalized) return undefined;
  const digitCount = normalized.replace(/\D/g, "").length;
  if (
    digitCount < 5 ||
    !/^\+?[\d\s().-]+(?:\s*(?:x|ext\.?)\s*\d+)?$/i.test(normalized)
  ) {
    throw new EmergencyContactValidationError(
      field,
      `${field} must be a valid phone number.`,
    );
  }
  return normalized;
}

function normalizeInput(input: EmergencyContactInput) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new EmergencyContactValidationError(
      "contact",
      "Contact details are required.",
    );
  }
  for (const field of Object.keys(input)) {
    if (!INPUT_FIELDS.has(field)) {
      throw new EmergencyContactValidationError(
        field,
        `${field} is not an allowed emergency contact field.`,
      );
    }
  }
  const email = textField(input.email, "email", 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new EmergencyContactValidationError("email", "email must be valid.");
  }
  return {
    name: textField(input.name, "name", 100, true)!,
    relationship: textField(input.relationship, "relationship", 80),
    phone: phoneField(input.phone, "phone", true)!,
    alternatePhone: phoneField(input.alternatePhone, "alternatePhone"),
    email,
    notes: textField(input.notes, "notes", 500),
  };
}

export class EmergencyContactsModule {
  private readonly store: EmergencyContactStore;
  private readonly randomId: () => string;
  private readonly now: () => Date;

  constructor(options: EmergencyContactsModuleOptions) {
    this.store = options.store;
    this.randomId = options.randomId ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => new Date());
  }

  async list(actor: EmergencyContactActor): Promise<EmergencyContactView[]> {
    requireViewer(actor);
    return (await this.store.list())
      .filter((record) => !record.deletedAt)
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder || left.id.localeCompare(right.id),
      )
      .map(view);
  }

  async create(
    actor: EmergencyContactActor,
    input: EmergencyContactInput,
  ): Promise<EmergencyContactView> {
    requireEditor(actor);
    const normalized = normalizeInput(input);
    const timestamp = this.now().toISOString();
    const existingContacts = await this.store.list();
    const record: EmergencyContact = {
      id: this.randomId(),
      ...normalized,
      sortOrder:
        existingContacts.reduce(
          (highest, contact) => Math.max(highest, contact.sortOrder),
          -1,
        ) + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    };
    await this.store.insert(record);
    return view(record);
  }

  async update(
    actor: EmergencyContactActor,
    id: string,
    patch: Partial<EmergencyContactInput>,
  ): Promise<EmergencyContactView> {
    requireEditor(actor);
    const existing = await this.store.get(id);
    if (!existing || existing.deletedAt) throw new EmergencyContactNotFoundError();
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
      throw new EmergencyContactValidationError(
        "contact",
        "Contact details are required.",
      );
    }
    for (const field of Object.keys(patch)) {
      if (!INPUT_FIELDS.has(field)) {
        throw new EmergencyContactValidationError(
          field,
          `${field} is not an allowed emergency contact field.`,
        );
      }
    }
    const normalized = normalizeInput({
      name: patch.name ?? existing.name,
      relationship:
        "relationship" in patch ? patch.relationship : existing.relationship,
      phone: patch.phone ?? existing.phone,
      alternatePhone:
        "alternatePhone" in patch
          ? patch.alternatePhone
          : existing.alternatePhone,
      email: "email" in patch ? patch.email : existing.email,
      notes: "notes" in patch ? patch.notes : existing.notes,
    });
    const updated = await this.store.update(id, {
      ...normalized,
      updatedAt: this.now().toISOString(),
    });
    if (!updated) throw new EmergencyContactNotFoundError();
    return view(updated);
  }

  async reorder(actor: EmergencyContactActor, orderedIds: string[]) {
    requireEditor(actor);
    if (
      !Array.isArray(orderedIds) ||
      orderedIds.some((id) => typeof id !== "string" || !id) ||
      new Set(orderedIds).size !== orderedIds.length
    ) {
      throw new EmergencyContactValidationError(
        "orderedIds",
        "Contact order is invalid.",
      );
    }
    const activeIds = (await this.store.list())
      .filter((contact) => !contact.deletedAt)
      .map((contact) => contact.id);
    if (
      activeIds.length !== orderedIds.length ||
      activeIds.some((id) => !orderedIds.includes(id))
    ) {
      throw new EmergencyContactValidationError(
        "orderedIds",
        "Contact order must contain every active contact exactly once.",
      );
    }
    await this.store.reorder(orderedIds, this.now().toISOString());
  }

  async softDelete(actor: EmergencyContactActor, id: string) {
    requireEditor(actor);
    const existing = await this.store.get(id);
    if (!existing || existing.deletedAt) throw new EmergencyContactNotFoundError();
    const updated = await this.store.update(id, {
      deletedAt: this.now().toISOString(),
      updatedAt: this.now().toISOString(),
    });
    if (!updated) throw new EmergencyContactNotFoundError();
  }
}
