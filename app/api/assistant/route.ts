import { env } from "cloudflare:workers";

import { readTrip } from "@/db/trip-store";
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
    const context = projectTripQuestionContext({
      role: accessRole,
      now: new Date(),
      items: trip.items as TripAssistantItem[],
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
