export type TripAssistantRole = "viewer" | "editor";

export type TripAssistantAttachment = {
  id: string;
  label: string;
  text?: string;
  viewerVisible: boolean;
};

export type TripAssistantItem = {
  id: string;
  date: string;
  time?: string;
  category: string;
  title: string;
  location?: string;
  notes?: string;
  cost?: string;
  confirmation?: string;
  viewerSummary?: string;
  attachments?: TripAssistantAttachment[];
};

export type TripQuestionContextItem = {
  id: string;
  date: string;
  time?: string;
  category: string;
  title: string;
  location?: string;
  summary?: string;
  notes?: string;
  cost?: string;
  confirmation?: string;
  attachments: Array<{ id: string; label: string; text?: string }>;
};

export type TripQuestionContext = {
  role: TripAssistantRole;
  today: string;
  nowMinutes: number;
  items: TripQuestionContextItem[];
};

function japanDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function japanMinutes(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

export function projectTripQuestionContext(input: {
  role: TripAssistantRole;
  now: Date;
  items: TripAssistantItem[];
}): TripQuestionContext {
  return {
    role: input.role,
    today: japanDate(input.now),
    nowMinutes: japanMinutes(input.now),
    items: input.items.map((item) => {
      const common: TripQuestionContextItem = {
        id: item.id,
        date: item.date,
        ...(item.time ? { time: item.time } : {}),
        category: item.category,
        title: item.title,
        ...(item.location ? { location: item.location } : {}),
        attachments: (item.attachments ?? [])
          .filter((attachment) => input.role === "editor" || attachment.viewerVisible)
          .map(({ id, label, text }) => ({ id, label, ...(text ? { text } : {}) })),
      };

      if (input.role === "viewer") {
        return item.viewerSummary ? { ...common, summary: item.viewerSummary } : common;
      }

      return {
        ...common,
        ...(item.notes ? { notes: item.notes } : {}),
        ...(item.cost ? { cost: item.cost } : {}),
        ...(item.confirmation ? { confirmation: item.confirmation } : {}),
      };
    }),
  };
}

export type TripCitation = {
  kind: "event" | "attachment" | "live-source";
  id: string;
  label: string;
};

export type GroundedTripAnswer = {
  text: string;
  basis: "trip-plan" | "approved-document" | "live-source" | "mixed";
  citations: TripCitation[];
  showEmergency: boolean;
};

export type TripAnswerProviderResult = {
  text: string;
  basis: GroundedTripAnswer["basis"];
  citationIds: string[];
  retrievedAt?: string;
};

export type TripAnswerProvider = {
  answer(input: {
    question: string;
    context: TripQuestionContext;
  }): Promise<TripAnswerProviderResult>;
};

export type TripQuestionIntent =
  | "question"
  | "emergency"
  | "proposal-required"
  | "change-denied";

export function classifyTripQuestionIntent(
  question: string,
  role: TripAssistantRole,
): TripQuestionIntent {
  if (/\b(emergency|ambulance|police|fire|coast guard|immediate danger)\b/i.test(question)) {
    return "emergency";
  }
  if (/\b(add|change|move|remove|delete|cancel|reschedule|update|book|reserve)\b/i.test(question)) {
    return role === "editor" ? "proposal-required" : "change-denied";
  }
  return "question";
}

function startMinutes(time?: string) {
  const match = time?.match(/^(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function answerOfflineTripQuestion(
  question: string,
  context: TripQuestionContext,
): GroundedTripAnswer {
  if (classifyTripQuestionIntent(question, context.role) === "emergency") {
    return {
      text: "Open the Emergency page now for official call buttons and family safety information.",
      basis: "trip-plan",
      citations: [],
      showEmergency: true,
    };
  }

  if (/\bnext\b/i.test(question)) {
    const next = context.items
      .filter((item) => item.date === context.today)
      .map((item) => ({ item, minutes: startMinutes(item.time) }))
      .filter((candidate): candidate is { item: TripQuestionContextItem; minutes: number } =>
        candidate.minutes !== null && candidate.minutes >= context.nowMinutes)
      .sort((left, right) => left.minutes - right.minutes)[0]?.item;

    if (next) {
      const location = next.location ? ` · ${next.location}` : "";
      return {
        text: `Next: ${next.title}${next.time ? ` at ${next.time}` : ""}${location}.`,
        basis: "trip-plan",
        citations: [{ kind: "event", id: next.id, label: next.title }],
        showEmergency: false,
      };
    }
  }

  return {
    text: "That answer is not available in the saved trip. Connect to ask the Trip Assistant.",
    basis: "trip-plan",
    citations: [],
    showEmergency: false,
  };
}

export async function askTripQuestion(
  question: string,
  context: TripQuestionContext,
  provider: TripAnswerProvider,
): Promise<GroundedTripAnswer> {
  const intent = classifyTripQuestionIntent(question, context.role);
  if (intent === "emergency") return answerOfflineTripQuestion(question, context);
  if (intent === "change-denied") {
    return {
      text: "Kid Mode is read-only. Ask an editor to change the shared trip.",
      basis: "trip-plan",
      citations: [],
      showEmergency: false,
    };
  }
  if (intent === "proposal-required") {
    return {
      text: "I can prepare a draft, but the exact change must be reviewed and approved before the trip is updated.",
      basis: "trip-plan",
      citations: [],
      showEmergency: false,
    };
  }

  const result = await provider.answer({ question, context });
  const sources = new Map<string, TripCitation>();
  for (const item of context.items) {
    sources.set(item.id, { kind: "event", id: item.id, label: item.title });
    for (const attachment of item.attachments) {
      sources.set(attachment.id, {
        kind: "attachment",
        id: attachment.id,
        label: attachment.label,
      });
    }
  }

  const citations = result.citationIds.map((id) => sources.get(id)).filter(
    (citation): citation is TripCitation => Boolean(citation),
  );
  if (result.citationIds.length > 0 && citations.length === 0) {
    return {
      text: "I couldn’t verify that answer from the trip information available to you.",
      basis: "trip-plan",
      citations: [],
      showEmergency: false,
    };
  }
  return {
    text: result.text,
    basis: result.basis,
    citations,
    showEmergency: false,
  };
}
