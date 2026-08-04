import { aiInboxStore } from "@/db/ai-inbox-store";
import { reject } from "@/lib/ai/proposal-approval";

import {
  INBOX_PRIVATE_HEADERS,
  inboxEditor,
  inboxErrorResponse,
} from "../../../shared";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const editor = await inboxEditor(request);
    const { id } = await context.params;
    const proposal = await aiInboxStore().getProposal(id);
    if (!proposal) {
      return Response.json(
        { error: "Inbox proposal not found." },
        { status: 404, headers: INBOX_PRIVATE_HEADERS },
      );
    }
    const rejection = await reject(proposal, editor);
    const decision = await aiInboxStore().markRejected(id, rejection);
    return Response.json({ decision }, { headers: INBOX_PRIVATE_HEADERS });
  } catch (error) {
    return inboxErrorResponse(error);
  }
}
