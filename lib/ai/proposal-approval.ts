import {
  InboxPermissionError,
  InboxValidationError,
  immutable,
  sha256,
  type InboxProposal,
  type InboxProposalDiff,
  type InboxRole,
} from "./inbox-schemas";

export type InboxEditor = { id: string; role: InboxRole };

export type AtomicProposalCommand = {
  proposalId: string;
  revision: 1;
  integrity: string;
  documentId: string;
  baseTripVersion: number;
  approvedBy: string;
  diff: InboxProposalDiff;
};

export type AtomicProposalResult =
  | { kind: "applied"; version: number }
  | { kind: "already-applied"; version: number }
  | { kind: "stale"; currentVersion: number };

export interface TripProposalAdapter {
  applyProposalAtomically(command: AtomicProposalCommand): Promise<AtomicProposalResult>;
}

export class InboxProposalIntegrityError extends Error {
  readonly code = "proposal-integrity-failed";

  constructor() {
    super("The proposal changed after analysis and must be reviewed again.");
    this.name = "InboxProposalIntegrityError";
  }
}

export class InboxStaleProposalError extends Error {
  readonly code = "stale-proposal";
  readonly currentVersion: number;

  constructor(currentVersion: number) {
    super("The itinerary changed after this proposal was created. Analyze the document again.");
    this.name = "InboxStaleProposalError";
    this.currentVersion = currentVersion;
  }
}

async function verifyProposal(proposal: InboxProposal) {
  if (proposal.schemaVersion !== 1 || proposal.revision !== 1 || proposal.kind !== "proposal") {
    throw new InboxValidationError("Only a supported proposal revision can be approved.");
  }
  const { integrity, ...unsigned } = proposal;
  if (await sha256(unsigned) !== integrity) throw new InboxProposalIntegrityError();
}

export async function approve(
  proposal: InboxProposal,
  editor: InboxEditor,
  trip: TripProposalAdapter,
): Promise<Exclude<AtomicProposalResult, { kind: "stale" }>> {
  if (editor.role !== "editor") throw new InboxPermissionError();
  if (!editor.id.trim()) throw new InboxValidationError("An approving editor ID is required.");
  await verifyProposal(proposal);

  const result = await trip.applyProposalAtomically(
    immutable({
      proposalId: proposal.proposalId,
      revision: proposal.revision,
      integrity: proposal.integrity,
      documentId: proposal.documentId,
      baseTripVersion: proposal.baseTripVersion,
      approvedBy: editor.id,
      diff: proposal.diff,
    }),
  );
  if (result.kind === "stale") throw new InboxStaleProposalError(result.currentVersion);
  return result;
}

export async function reject(proposal: InboxProposal, editor: InboxEditor) {
  if (editor.role !== "editor") throw new InboxPermissionError();
  if (!editor.id.trim()) throw new InboxValidationError("A rejecting editor ID is required.");
  await verifyProposal(proposal);
  return immutable({
    kind: "rejected" as const,
    proposalId: proposal.proposalId,
    revision: proposal.revision,
    documentId: proposal.documentId,
    rejectedBy: editor.id,
  });
}
