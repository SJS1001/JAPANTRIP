import { env } from "cloudflare:workers";

import { readTrip } from "@/db/trip-store";
import { attachmentModule } from "@/db/attachment-store";
import { attachmentExtractedText } from "@/db/attachment-text-store";
import { consumeRequestLimit } from "@/db/request-rate-limit-store";
import { readFamilyAiEnabled } from "@/db/ai-settings-store";
import { AccessDeniedError, requireViewer } from "@/lib/access";
import { createOpenAiTripProvider } from "@/lib/ai/openai-trip-provider";
import {
  answerOfflineTripQuestion,
  askTripQuestion,
  projectTripQuestionContext,
  type TripAnswerProvider,
  type TripAssistantItem,
} from "@/lib/ai/trip-assistant";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/http-body";

type AssistantEnvironment = {
  OPENAI_API_KEY?: string;
  OPENAI_TRIP_MODEL?: string;
};

function offlineProvider(): TripAnswerProvider {
  return {
    async answer({ question, context }) {
      const answer = answerOfflineTripQuestion(question, context);
      return {
        text: answer.text,
        basis: answer.basis,
        citationIds: answer.citations.map((citation) => citation.id),
      };
    },
  };
}

export async function POST(request: Request) {
  try {
    const accessRole = await requireViewer(request);
    if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
      return Response.json({ error: "Use JSON to ask a trip question." }, { status: 415 });
    }
    const rateLimit = await consumeRequestLimit(request, "trip-assistant", {
      maximum: 30,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return Response.json(
        { error: "Too many trip questions. Wait briefly and try again." },
        { status: 429, headers: { "retry-after": String(rateLimit.retryAfter) } },
      );
    }
    const payload = (await readBoundedJson(request, 4 * 1024)) as { question?: unknown };
    const question = typeof payload.question === "string" ? payload.question.trim() : "";
    if (!question || question.length > 500) {
      return Response.json(
        { error: "Ask a trip question between 1 and 500 characters." },
        { status: 400 },
      );
    }

    const trip = await readTrip();
    let attachments: Array<{
      id: string;
      tripItemId: string;
      displayName: string;
      viewerApproved: boolean;
      text?: string;
    }> = [];
    try {
      attachments = await attachmentModule().list({ role: accessRole });
    } catch {
      // Agenda questions remain available when private file storage is not configured.
    }
    try {
      const extracted = await attachmentExtractedText(attachments.map(({ id }) => id));
      attachments = attachments.map((attachment) => ({
        ...attachment,
        ...(extracted.get(attachment.id) ? { text: extracted.get(attachment.id) } : {}),
      }));
    } catch {
      // Filenames still provide useful context when no Inbox extraction exists.
    }
    const attachmentsByItem = new Map<string, typeof attachments>();
    for (const attachment of attachments) {
      const current = attachmentsByItem.get(attachment.tripItemId) ?? [];
      current.push(attachment);
      attachmentsByItem.set(attachment.tripItemId, current);
    }
    const context = projectTripQuestionContext({
      role: accessRole,
      now: new Date(),
      items: (trip.items as TripAssistantItem[]).map((item) => ({
        ...item,
        attachments: (attachmentsByItem.get(item.id) ?? []).map((attachment) => ({
          id: attachment.id,
          label: attachment.displayName,
          text: attachment.text,
          viewerVisible: attachment.viewerApproved,
        })),
      })),
    });
    const configured = env as unknown as AssistantEnvironment;
    const aiEnabled = configured.OPENAI_API_KEY
      ? await readFamilyAiEnabled()
      : false;
    const provider = configured.OPENAI_API_KEY && aiEnabled
      ? createOpenAiTripProvider({
          apiKey: configured.OPENAI_API_KEY,
          model: configured.OPENAI_TRIP_MODEL,
        })
      : offlineProvider();
    const answer = await askTripQuestion(question, context, provider);

    return Response.json(
      { answer, aiEnabled },
      { headers: { "cache-control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ error: "The trip question is too large." }, { status: 413 });
    }
    if (error instanceof AccessDeniedError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      {
        error: error instanceof Error ? error.message : "The Trip Assistant is unavailable.",
      },
      { status: 503 },
    );
  }
}
