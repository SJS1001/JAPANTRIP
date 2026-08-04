export type InboxRole = "viewer" | "editor";

export type InboxDocument = {
  id: string;
  filename: string;
  text: string;
  role: InboxRole;
  tripVersion: number;
  mediaType?: string;
};

export type InboxCandidateEvent = {
  id: string;
  date: string;
  title: string;
  category: string;
  time?: string;
  location?: string;
  notes?: string;
};

export type InboxEvidence = { quote: string };

export type InboxEventChanges = Partial<
  Pick<InboxCandidateEvent, "date" | "title" | "category" | "time" | "location" | "notes">
>;

export type InboxProposalDiff =
  | { operation: "update-event"; eventId: string; changes: InboxEventChanges }
  | {
      operation: "create-event-and-attach";
      event: InboxCandidateEvent;
      documentId: string;
    }
  | { operation: "attach-document"; eventId: string; documentId: string };

export type InboxManualDraftInput =
  | { operation: "attach-document"; eventId: string }
  | { operation: "create-event-and-attach"; event: InboxCandidateEvent };

export type InboxProposal = {
  schemaVersion: 1;
  kind: "proposal";
  proposalId: string;
  revision: 1;
  integrity: string;
  documentId: string;
  baseTripVersion: number;
  candidateEventIds: string[];
  evidence: InboxEvidence[];
  diff: InboxProposalDiff;
};

export type InboxQuestion = {
  schemaVersion: 1;
  kind: "question";
  documentId: string;
  baseTripVersion: number;
  candidateEventIds: string[];
  evidence: InboxEvidence[];
  question: string;
};

export type InboxDuplicate = {
  schemaVersion: 1;
  kind: "duplicate";
  documentId: string;
  baseTripVersion: number;
  candidateEventIds: string[];
  evidence: InboxEvidence[];
  duplicateDocumentId: string;
};

export type InboxUnclassified = {
  schemaVersion: 1;
  kind: "unclassified";
  documentId: string;
  baseTripVersion: number;
  candidateEventIds: string[];
  evidence: InboxEvidence[];
  reason: string;
};

export type InboxAnalysisOutcome =
  | InboxProposal
  | InboxQuestion
  | InboxDuplicate
  | InboxUnclassified;

export type InboxAnalyzerModelInput = {
  instruction: string;
  document: {
    id: string;
    filename: string;
    trust: "untrusted-document-content";
    text: string;
    mediaType?: string;
    attachmentAllowed?: boolean;
  };
  candidates: InboxCandidateEvent[];
  allowedCandidateEventIds: string[];
};

export interface InboxAnalyzerModel {
  propose(input: InboxAnalyzerModelInput): Promise<unknown>;
}

export class InboxValidationError extends Error {
  readonly code = "invalid-inbox-outcome";

  constructor(message: string) {
    super(message);
    this.name = "InboxValidationError";
  }
}

export class InboxPermissionError extends Error {
  readonly status = 403;

  constructor() {
    super("Editor access is required for Inbox operations.");
    this.name = "InboxPermissionError";
  }
}

export class InboxDecisionStateError extends Error {
  readonly status = 409;

  constructor() {
    super("This Inbox proposal already has a terminal decision.");
    this.name = "InboxDecisionStateError";
  }
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assertClosedKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
) {
  const extras = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extras.length) {
    throw new InboxValidationError(`${label} contains unsupported fields: ${extras.join(", ")}.`);
  }
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isPlainRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stableStringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function immutable<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) immutable(nested);
  }
  return value;
}
