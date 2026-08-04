import { AccessDeniedError, requireEditor } from "@/lib/access";
import {
  InboxDecisionStateError,
  InboxPermissionError,
  InboxValidationError,
} from "@/lib/ai/inbox-schemas";
import {
  InboxProposalIntegrityError,
  InboxStaleProposalError,
} from "@/lib/ai/proposal-approval";

export const INBOX_PRIVATE_HEADERS = {
  "cache-control": "private, no-store, max-age=0",
  "x-content-type-options": "nosniff",
};

export async function inboxEditor(request: Request) {
  await requireEditor(request);
  return { id: "family-editor", role: "editor" as const };
}

export function inboxErrorResponse(error: unknown) {
  if (error instanceof AccessDeniedError || error instanceof InboxPermissionError) {
    return Response.json(
      { error: error.message },
      { status: error.status, headers: INBOX_PRIVATE_HEADERS },
    );
  }
  if (error instanceof InboxStaleProposalError) {
    return Response.json(
      { error: error.message, currentVersion: error.currentVersion },
      { status: 409, headers: INBOX_PRIVATE_HEADERS },
    );
  }
  if (error instanceof InboxDecisionStateError) {
    return Response.json(
      { error: error.message },
      { status: error.status, headers: INBOX_PRIVATE_HEADERS },
    );
  }
  if (error instanceof InboxValidationError || error instanceof InboxProposalIntegrityError) {
    return Response.json(
      { error: error.message },
      { status: 400, headers: INBOX_PRIVATE_HEADERS },
    );
  }
  return Response.json(
    { error: error instanceof Error ? error.message : "The Inbox is unavailable." },
    { status: 500, headers: INBOX_PRIVATE_HEADERS },
  );
}
