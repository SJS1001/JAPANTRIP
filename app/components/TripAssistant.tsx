"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import {
  answerOfflineTripQuestion,
  projectTripQuestionContext,
  type GroundedTripAnswer,
  type TripAssistantItem,
  type TripAssistantRole,
} from "@/lib/ai/trip-assistant";

type TripAssistantProps = {
  items: TripAssistantItem[];
  role: TripAssistantRole;
  onClose: () => void;
};

const starters = [
  "What are we doing next?",
  "Where is our hotel?",
  "What should I bring today?",
  "Which ticket do I need?",
];

export default function TripAssistant({ items, role, onClose }: TripAssistantProps) {
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState<Array<{ question: string; answer: GroundedTripAnswer }>>([]);
  const [busy, setBusy] = useState(false);
  const context = useMemo(
    () => projectTripQuestionContext({ role, now: new Date(), items }),
    [items, role],
  );

  async function ask(value: string) {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setQuestion("");
    try {
      let answer: GroundedTripAnswer;
      if (!navigator.onLine) {
        answer = answerOfflineTripQuestion(trimmed, context);
      } else {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question: trimmed }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "The Trip Assistant is unavailable.");
        answer = data.answer as GroundedTripAnswer;
      }
      setAnswers((current) => [...current, { question: trimmed, answer }]);
    } catch (error) {
      const offlineAnswer = answerOfflineTripQuestion(trimmed, context);
      setAnswers((current) => [...current, {
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

  return (
    <aside className="trip-assistant" role="dialog" aria-modal="true" aria-labelledby="trip-assistant-title">
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
        {answers.map((entry, index) => (
          <article key={`${entry.question}-${index}`}>
            <p className="assistant-question">{entry.question}</p>
            <p>{entry.answer.text}</p>
            {entry.answer.showEmergency && <Link className="button emergency-button" href="/emergency">Open Emergency page</Link>}
            {!!entry.answer.citations.length && (
              <div className="assistant-citations" aria-label="Answer sources">
                {entry.answer.citations.map((citation) => (
                  <a key={`${citation.kind}-${citation.id}`} href={citation.kind === "event" ? `#trip-item-${citation.id}` : `#attachment-${citation.id}`}>{citation.label}</a>
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
      <small>{role === "viewer" ? "Kid Mode is read-only. Questions cannot change the trip." : "Requested changes still require review and approval."}</small>
    </aside>
  );
}
