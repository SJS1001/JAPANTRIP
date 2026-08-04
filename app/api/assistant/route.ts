import { env } from "cloudflare:workers";

import { readTrip } from "@/db/trip-store";
import { attachmentModule } from "@/db/attachment-store";
import { AccessDeniedError, requireViewer } from "@/lib/access";
import { createOpenAiTripProvider } from "@/lib/ai/openai-trip-provider";
import {
  answerOfflineTripQuestion,
  askTripQuestion,
  projectTripQuestionContext,
  type TripAnswerProvider,
  type TripAssistantItem,
} from "@/lib/ai/trip-assistant";

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
    const payload = (await request.json()) as { question?: unknown };
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
    }> = [];
    try {
      attachments = await attachmentModule().list({ role: accessRole });
    } catch {
      // Agenda questions remain available when private file storage is not configured.
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
          viewerVisible: attachment.viewerApproved,
        })),
      })),
    });
    const configured = env as unknown as AssistantEnvironment;
    const provider = configured.OPENAI_API_KEY
      ? createOpenAiTripProvider({
          apiKey: configured.OPENAI_API_KEY,
          model: configured.OPENAI_TRIP_MODEL,
        })
      : offlineProvider();
    const answer = await askTripQuestion(question, context, provider);

    return Response.json(
      { answer },
      { headers: { "cache-control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
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
