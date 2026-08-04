"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

import {
  answerOfflineTripQuestion,
  projectTripQuestionContext,
  type GroundedTripAnswer,
  type TripAssistantItem,
  type TripAssistantRole,
} from "@/lib/ai/trip-assistant";
import {
  listOfflineAttachments,
  type OfflineAttachment,
} from "@/lib/client/offline-attachments";

type TripAssistantProps = {
  items: TripAssistantItem[];
  role: TripAssistantRole;
  aiEnabled: boolean;
  onClose: () => void;
  onOpenEvent: (itemId: string) => void;
};

const starters = [
  "What are we doing next?",
  "Where is our hotel?",
  "What should I bring today?",
  "Which ticket do I need?",
];

export default function TripAssistant({ items, role, aiEnabled, onClose, onOpenEvent }: TripAssistantProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState<Array<{ id: string; question: string; answer: GroundedTripAnswer }>>([]);
  const [busy, setBusy] = useState(false);
  const offlineAttachmentsRef = useRef<OfflineAttachment[]>([]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    void listOfflineAttachments()
      .then((saved) => {
        offlineAttachmentsRef.current = saved;
      })
      .catch(() => undefined);
  }, []);

  async function ask(value: string) {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setQuestion("");
    const enrichedItems = items.map((item) => ({
      ...item,
      attachments: offlineAttachmentsRef.current
        .filter(
          (attachment) =>
            attachment.tripItemId === item.id &&
            (role === "editor" || attachment.viewerApproved),
        )
        .map((attachment) => ({
          id: attachment.id,
          label: attachment.displayName || attachment.label || "Saved file",
          viewerVisible: attachment.viewerApproved,
        })),
    }));
    const context = projectTripQuestionContext({
      role,
      now: new Date(),
      items: enrichedItems,
    });
    try {
      let answer: GroundedTripAnswer;
      if (!navigator.onLine || !aiEnabled) {
        answer = answerOfflineTripQuestion(trimmed, context);
      } else {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question: trimmed }),
        });
        if (!response.ok) {
          const failure = await response.json().catch(() => ({})) as { error?: string };
          throw new Error(failure.error || "The Trip Assistant is unavailable.");
        }
        const data = await response.json() as { answer: GroundedTripAnswer };
        answer = data.answer;
      }
      setAnswers((current) => [...current, {
        id: crypto.randomUUID(),
        question: trimmed,
        answer,
      }]);
    } catch (error) {
      const offlineAnswer = answerOfflineTripQuestion(trimmed, context);
      setAnswers((current) => [...current, {
        id: crypto.randomUUID(),
        question: trimmed,
        answer: offlineAnswer.citations.length || offlineAnswer.showEmergency
          ? offlineAnswer
          : {
              text: error instanceof Error ? error.message : "The Trip Assistant is unavailable.",
              basis: "trip-plan",
              citations: [],
              showEmergency: false,
            },
      }]);
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  async function openCitation(citation: GroundedTripAnswer["citations"][number]) {
    if (citation.kind === "event") {
      onClose();
      onOpenEvent(citation.id);
      return;
    }
    if (citation.kind === "attachment") {
      const popup = window.open("about:blank", "_blank");
      if (!popup) return;
      popup.opener = null;
      if (navigator.onLine) {
        popup.location.href = `/api/attachments/${encodeURIComponent(citation.id)}`;
        return;
      }
      const saved = offlineAttachmentsRef.current.find((attachment) => attachment.id === citation.id);
      if (!saved) {
        popup.close();
        return;
      }
      const url = URL.createObjectURL(saved.blob);
      popup.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  }

  return (
    <dialog ref={dialogRef} className="trip-assistant" aria-labelledby="trip-assistant-title" onClose={onClose}>
      <header>
        <div>
          <p className="kicker">Grounded in our trip</p>
          <h2 id="trip-assistant-title">Ask about the trip</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close Trip Assistant">×</button>
      </header>

      {!answers.length && (
        <div className="assistant-starters">
          {starters.map((starter) => <button type="button" key={starter} onClick={() => void ask(starter)}>{starter}</button>)}
        </div>
      )}

      <div className="assistant-answers" aria-live="polite">
        {answers.map((entry) => (
          <article key={entry.id}>
            <p className="assistant-question">{entry.question}</p>
            <p>{entry.answer.text}</p>
            {entry.answer.showEmergency && <Link className="button emergency-button" href="/emergency">Open Emergency page</Link>}
            {!!entry.answer.citations.length && (
              <div className="assistant-citations" aria-label="Answer sources">
                {entry.answer.citations.map((citation) => (
                  <button type="button" key={`${citation.kind}-${citation.id}`} onClick={() => void openCitation(citation)}>{citation.label}</button>
                ))}
              </div>
            )}
          </article>
        ))}
        {busy && <p>Checking the trip…</p>}
      </div>

      <form onSubmit={submit}>
        <label htmlFor="trip-question" className="sr-only">Ask a trip question</label>
        <input id="trip-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about today, tickets, trains or Japan…" maxLength={500} />
        <button type="submit" className="primary" disabled={busy || !question.trim()}>Ask</button>
      </form>
      <small>
        {!aiEnabled
          ? "OpenAI is disabled; only the private offline question set is used."
          : role === "viewer"
            ? "Kid Mode is read-only. Questions cannot change the trip."
            : "Requested changes still require review and approval."}
      </small>
    </dialog>
  );
}
