import { aiInboxStore } from "@/db/ai-inbox-store";
import { readTrip } from "@/db/trip-store";
import { draftManualProposal } from "@/lib/ai/inbox-analyzer";
import {
  InboxValidationError,
  assertClosedKeys,
  isPlainRecord,
  type InboxCandidateEvent,
  type InboxManualDraftInput,
} from "@/lib/ai/inbox-schemas";

import {
  INBOX_PRIVATE_HEADERS,
  inboxEditor,
  inboxErrorResponse,
} from "../../../shared";

type RouteContext = { params: Promise<{ id: string }> };

const MAX_DRAFT_BODY_BYTES = 24 * 1024;
const ATTACHABLE_MEDIA_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function candidateEvents(items: unknown[]): InboxCandidateEvent[] {
  return items.flatMap((item) => {
    if (!isPlainRecord(item)) return [];
    if (
      typeof item.id !== "string" ||
      typeof item.date !== "string" ||
      typeof item.title !== "string" ||
      typeof item.category !== "string"
    ) return [];
    return [{
      id: item.id,
      date: item.date,
      title: item.title,
      category: item.category,
      ...(typeof item.time === "string" && item.time ? { time: item.time } : {}),
      ...(typeof item.location === "string" && item.location ? { location: item.location } : {}),
      ...(typeof item.notes === "string" && item.notes ? { notes: item.notes } : {}),
    }];
  });
}

function parseInput(value: unknown): InboxManualDraftInput {
  if (!isPlainRecord(value) || typeof value.operation !== "string") {
    throw new InboxValidationError("Choose how to file this document.");
  }
  if (value.operation === "attach-document") {
    assertClosedKeys(value, ["operation", "eventId"], "Manual attachment draft");
    if (typeof value.eventId !== "string") {
      throw new InboxValidationError("Choose an existing itinerary event.");
    }
    return { operation: "attach-document", eventId: value.eventId };
  }
  if (value.operation === "create-event-and-attach") {
    assertClosedKeys(value, ["operation", "event"], "Manual create draft");
    if (!isPlainRecord(value.event)) {
      throw new InboxValidationError("Enter the new itinerary event details.");
    }
    return {
      operation: "create-event-and-attach",
      event: value.event as InboxCandidateEvent,
    };
  }
  throw new InboxValidationError("The manual filing operation is not supported.");
}

export async function POST(request: Request, context: RouteContext) {
  const store = aiInboxStore();
  try {
    await inboxEditor(request);
    if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
      return Response.json(
        { error: "Use JSON to prepare a manual Inbox draft." },
        { status: 415, headers: INBOX_PRIVATE_HEADERS },
      );
    }
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_DRAFT_BODY_BYTES) {
      return Response.json(
        { error: "The manual draft request is too large." },
        { status: 413, headers: INBOX_PRIVATE_HEADERS },
      );
    }
    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > MAX_DRAFT_BODY_BYTES) {
      return Response.json(
        { error: "The manual draft request is too large." },
        { status: 413, headers: INBOX_PRIVATE_HEADERS },
      );
    }
    let input: InboxManualDraftInput;
    try {
      input = parseInput(JSON.parse(bodyText));
    } catch (error) {
      if (error instanceof InboxValidationError) throw error;
      throw new InboxValidationError("The manual draft request is not valid JSON.");
    }

    const { id } = await context.params;
    const source = await store.getManualReview(id);
    if (!source) {
      return Response.json(
        { error: "Question or unclassified Inbox review not found." },
        { status: 404, headers: INBOX_PRIVATE_HEADERS },
      );
    }
    const document = await store.readDocumentForAnalysis(source.documentId);
    if (!document) {
      return Response.json(
        { error: "Inbox document not found." },
        { status: 404, headers: INBOX_PRIVATE_HEADERS },
      );
    }
    if (!ATTACHABLE_MEDIA_TYPES.has(document.mediaType)) {
      return Response.json(
        { error: "Convert this source document to PDF or an image before attaching it." },
        { status: 415, headers: INBOX_PRIVATE_HEADERS },
      );
    }

    const trip = await readTrip();
    if (trip.version !== source.outcome.baseTripVersion) {
      return Response.json(
        { error: "The itinerary changed after this review. Analyze the document again." },
        { status: 409, headers: INBOX_PRIVATE_HEADERS },
      );
    }
    const proposal = await draftManualProposal(
      source.outcome,
      input,
      candidateEvents(Array.isArray(trip.items) ? trip.items : []),
    );
    const review = await store.saveManualProposal(id, source.documentId, proposal);
    return Response.json(
      { review },
      { status: 201, headers: INBOX_PRIVATE_HEADERS },
    );
  } catch (error) {
    return inboxErrorResponse(error);
  }
}
