import { aiInboxStore, inboxAnalyzerModel } from "@/db/ai-inbox-store";
import { readTrip } from "@/db/trip-store";
import { analyze } from "@/lib/ai/inbox-analyzer";
import type { InboxCandidateEvent } from "@/lib/ai/inbox-schemas";

import {
  INBOX_PRIVATE_HEADERS,
  inboxEditor,
  inboxErrorResponse,
} from "../../shared";

type RouteContext = { params: Promise<{ id: string }> };

function candidateEvents(items: unknown[]): InboxCandidateEvent[] {
  return items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const value = item as Record<string, unknown>;
    if (
      typeof value.id !== "string" ||
      typeof value.date !== "string" ||
      typeof value.title !== "string" ||
      typeof value.category !== "string"
    ) {
      return [];
    }
    return [{
      id: value.id,
      date: value.date,
      title: value.title,
      category: value.category,
      ...(typeof value.time === "string" && value.time ? { time: value.time } : {}),
      ...(typeof value.location === "string" && value.location
        ? { location: value.location }
        : {}),
      ...(typeof value.notes === "string" && value.notes ? { notes: value.notes } : {}),
    }];
  });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const editor = await inboxEditor(request);
    const { id } = await context.params;
    const document = await aiInboxStore().readDocumentForAnalysis(id);
    if (!document) {
      return Response.json(
        { error: "Inbox document not found." },
        { status: 404, headers: INBOX_PRIVATE_HEADERS },
      );
    }
    const trip = await readTrip();
    const outcome = await analyze(
      {
        id: document.id,
        filename: document.filename,
        text: document.text,
        role: editor.role,
        tripVersion: trip.version,
      },
      candidateEvents(Array.isArray(trip.items) ? trip.items : []),
      inboxAnalyzerModel(),
    );
    const review = await aiInboxStore().saveOutcome(document.id, outcome);
    return Response.json(
      { review },
      { status: 201, headers: INBOX_PRIVATE_HEADERS },
    );
  } catch (error) {
    return inboxErrorResponse(error);
  }
}
