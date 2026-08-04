import { aiInboxStore, inboxTripAdapter } from "@/db/ai-inbox-store";
import { approve, InboxStaleProposalError } from "@/lib/ai/proposal-approval";

import {
  INBOX_PRIVATE_HEADERS,
  inboxEditor,
  inboxErrorResponse,
} from "../../../shared";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const store = aiInboxStore();
  try {
    const editor = await inboxEditor(request);
    const { id } = await context.params;
    const proposal = await store.getProposal(id);
    if (!proposal) {
      return Response.json(
        { error: "Inbox proposal not found." },
        { status: 404, headers: INBOX_PRIVATE_HEADERS },
      );
    }
    try {
      const result = await approve(proposal, editor, inboxTripAdapter());
      const decision = await store.markApproved(id, result, editor.id);
      return Response.json({ decision }, { headers: INBOX_PRIVATE_HEADERS });
    } catch (error) {
      if (error instanceof InboxStaleProposalError) {
        await store.markStale(id, error.currentVersion);
      }
      throw error;
    }
  } catch (error) {
    return inboxErrorResponse(error);
  }
}
