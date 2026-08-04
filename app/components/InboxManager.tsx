"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type InboxDocumentSummary = {
  id: string;
  filename: string;
  mediaType: string;
  sizeBytes: number;
  status: string;
  baseTripVersion: number;
  createdAt: string;
};

type CandidateEvent = {
  id: string;
  date: string;
  title: string;
  category: string;
  time?: string;
  location?: string;
};

type Evidence = { quote: string };
type ReviewOutcome = {
  kind: "proposal" | "question" | "duplicate" | "unclassified";
  proposalId?: string;
  candidateEventIds: string[];
  evidence: Evidence[];
  diff?: unknown;
  question?: string;
  reason?: string;
  duplicateDocumentId?: string;
};

type Review = {
  id: string;
  documentId: string;
  status: "draft" | "approved" | "rejected" | "stale";
  outcome: ReviewOutcome | null;
  createdAt: string;
};

type Queue = {
  documents: InboxDocumentSummary[];
  outcomes: Review[];
  events: CandidateEvent[];
};

type ManualDraftMode = {
  reviewId: string;
  operation: "attach-document" | "create-event-and-attach";
};

const attachableMediaTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

async function responseJson(response: Response) {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(body.error || "The Inbox request failed.");
  return body;
}

function outcomeMessage(outcome: ReviewOutcome) {
  if (outcome.kind === "question") return outcome.question;
  if (outcome.kind === "duplicate") {
    return `Possible duplicate of ${outcome.duplicateDocumentId ?? "another document"}.`;
  }
  if (outcome.kind === "unclassified") return outcome.reason;
  return undefined;
}

export default function InboxManager() {
  const [queue, setQueue] = useState<Queue>({ documents: [], outcomes: [], events: [] });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [aiConsent, setAiConsent] = useState(false);
  const [manualDraft, setManualDraft] = useState<ManualDraftMode | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const loadQueue = useCallback(async () => {
    const response = await fetch("/api/inbox", { cache: "no-store" });
    if (response.status === 401 || response.status === 403) {
      throw new Error("Editor access is required to use the document Inbox.");
    }
    const body = await responseJson(response) as Queue;
    setQueue(body);
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadQueue().catch((error) =>
        setMessage(error instanceof Error ? error.message : "Inbox unavailable."),
      );
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadQueue]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy("upload");
    setMessage("Uploading privately…");
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const analyzeWithAi = submitter?.value === "analyze";
    if (analyzeWithAi && !aiConsent) {
      setBusy(null);
      setMessage("Confirm the OpenAI disclosure before requesting AI analysis.");
      return;
    }
    try {
      const response = await fetch("/api/inbox", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const body = await responseJson(response) as { document: InboxDocumentSummary };
      if (analyzeWithAi) {
        setMessage("Uploaded. Preparing an OpenAI draft for review…");
        const analysis = await fetch(`/api/inbox/${encodeURIComponent(body.document.id)}/analyze`, {
          method: "POST",
          headers: { "x-openai-analysis-consent": "yes" },
        });
        await responseJson(analysis);
      }
      formRef.current?.reset();
      setAiConsent(false);
      await loadQueue();
      setMessage(analyzeWithAi
        ? "Draft ready. Nothing has changed in the itinerary."
        : "File uploaded privately without AI analysis. Nothing has changed in the itinerary.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The document could not be uploaded.");
    } finally {
      setBusy(null);
    }
  }

  async function decide(review: Review, action: "approve" | "reject") {
    if (busy) return;
    if (
      action === "approve" &&
      !window.confirm("Approve this exact draft and apply it to the trip?")
    ) {
      return;
    }
    setBusy(review.id);
    setMessage(action === "approve" ? "Applying approved draft…" : "Rejecting draft…");
    try {
      const proposalPath = `/api/inbox/proposals/${encodeURIComponent(review.id)}`;
      const endpoint = action === "approve" ? `${proposalPath}/approve` : `${proposalPath}/reject`;
      const response = await fetch(endpoint, { method: "POST" });
      await responseJson(response);
      await loadQueue();
      setMessage(action === "approve" ? "Approved change applied." : "Draft rejected. No trip change was made.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The decision could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  async function retryAnalysis(document: InboxDocumentSummary) {
    if (busy) return;
    if (!window.confirm(
      "Analyze this staged document with OpenAI? Its file bytes and extracted or pasted text will be sent to the configured OpenAI API. The result remains a draft until you approve it.",
    )) return;
    setBusy(document.id);
    setMessage(`Analyzing ${document.filename}…`);
    try {
      const response = await fetch(`/api/inbox/${encodeURIComponent(document.id)}/analyze`, {
        method: "POST",
        headers: { "x-openai-analysis-consent": "yes" },
      });
      await responseJson(response);
      await loadQueue();
      setMessage("Draft ready. Nothing has changed in the itinerary.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The document could not be analyzed.");
    } finally {
      setBusy(null);
    }
  }

  async function prepareManualDraft(
    event: FormEvent<HTMLFormElement>,
    review: Review,
    operation: ManualDraftMode["operation"],
  ) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const payload = operation === "attach-document"
      ? {
          operation,
          eventId: String(form.get("eventId") ?? ""),
        }
      : {
          operation,
          event: Object.fromEntries(
            ["id", "date", "title", "category", "time", "location", "notes"]
              .map((key) => [key, String(form.get(key) ?? "").trim()] as const)
              .filter(([, value]) => value),
          ),
        };
    setBusy(review.id);
    setMessage("Preparing an exact filing draft…");
    try {
      const response = await fetch(
        `/api/inbox/reviews/${encodeURIComponent(review.id)}/draft`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      await responseJson(response);
      setManualDraft(null);
      await loadQueue();
      setMessage("Filing draft ready. Review and approve it separately; the itinerary is unchanged.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The filing draft could not be prepared.");
    } finally {
      setBusy(null);
    }
  }

  function eventPrefill(review: Review, document?: InboxDocumentSummary) {
    const matched = queue.events.find((event) => review.outcome?.candidateEventIds.includes(event.id));
    const evidenceText = review.outcome?.evidence.map(({ quote }) => quote).join(" ") ?? "";
    const evidenceDate = evidenceText.match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0];
    const evidenceTime = evidenceText.match(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/)?.[0];
    const title = (document?.filename ?? "new-trip-item")
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .trim() || "New trip item";
    const idBase = title.toLocaleLowerCase("en")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "trip-item";
    let id = `${idBase}-inbox`;
    let suffix = 2;
    while (queue.events.some((event) => event.id === id)) id = `${idBase}-inbox-${suffix++}`;
    return {
      id,
      title,
      date: evidenceDate ?? matched?.date ?? queue.events[0]?.date ?? "2026-08-06",
      time: evidenceTime ?? "",
    };
  }

  return (
    <main className="inbox-page">
      <header className="inbox-hero">
        <div>
          <p className="inbox-eyebrow">Private family workspace</p>
          <h1>Document Inbox</h1>
          <p>
            Upload tickets and reservations. The assistant can suggest where they belong, but
            every itinerary addition remains a draft until an editor approves it.
          </p>
        </div>
        <Link className="inbox-back" href="/">Back to trip</Link>
      </header>

      <section className="inbox-panel" aria-labelledby="inbox-upload-title">
        <h2 id="inbox-upload-title">Add a document</h2>
        <form ref={formRef} onSubmit={upload}>
          <label>
            Ticket, reservation, image, email, or document
            <input
              type="file"
              name="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.eml,.docx"
              required
            />
          </label>
          <label>
            Text or notes for analysis
            <textarea
              name="analysisText"
              rows={5}
              maxLength={250000}
              placeholder="Paste confirmation details or OCR text if available."
            />
            <small>
              Paste key details as a correction or fallback. AI analysis is optional and never
              changes the itinerary without approval.
            </small>
          </label>
          <div className="inbox-ai-disclosure">
            <strong>Optional OpenAI analysis</strong>
            <p>
              If selected, the uploaded file bytes and text are sent to the configured OpenAI
              API to prepare a draft. Originals remain in private family storage; this app does
              not currently apply an automatic deletion schedule.
            </p>
            <label>
              <input
                type="checkbox"
                checked={aiConsent}
                onChange={(event) => setAiConsent(event.target.checked)}
              />
              I understand and want OpenAI to analyze this upload
            </label>
          </div>
          <div className="inbox-actions">
            <button type="submit" name="uploadAction" value="upload" disabled={busy !== null}>
              {busy === "upload" ? "Uploading…" : "Upload only"}
            </button>
            <button type="submit" name="uploadAction" value="analyze" disabled={busy !== null || !aiConsent}>
              {busy === "upload" ? "Uploading…" : "Upload and analyze with OpenAI"}
            </button>
          </div>
          <small>
            Prefer manual filing? Upload directly under Tickets &amp; documents on the matching calendar event.
          </small>
        </form>
        {message ? <p role="status">{message}</p> : null}
      </section>

      <section className="inbox-panel" aria-labelledby="inbox-review-title">
        <h2 id="inbox-review-title">Review queue</h2>
        {queue.documents.filter((document) => !queue.outcomes.some((review) => review.documentId === document.id)).map((document) => (
          <article key={document.id} className="inbox-review-card">
            <p className="inbox-eyebrow">Uploaded privately</p>
            <h3>{document.filename}</h3>
            <p>No review draft exists yet. The file is still safely staged and can be analyzed again.</p>
            <button type="button" disabled={busy !== null} onClick={() => void retryAnalysis(document)}>
              {busy === document.id ? "Analyzing…" : "Analyze with OpenAI"}
            </button>
          </article>
        ))}
        {!queue.outcomes.length ? <p>No AI drafts are waiting for review.</p> : null}
        {queue.outcomes.map((review) => {
          const outcome = review.outcome;
          const document = queue.documents.find((item) => item.id === review.documentId);
          const hasPreparedProposal = queue.outcomes.some((other) =>
            other.documentId === review.documentId &&
            other.status === "draft" &&
            other.outcome?.kind === "proposal"
          );
          const canAttach = document ? attachableMediaTypes.has(document.mediaType) : false;
          const prefill = eventPrefill(review, document);
          return (
            <article key={review.id} className="inbox-review-card">
              <p className="inbox-eyebrow">{document?.filename ?? "Inbox document"}</p>
              <h3>
                {review.status === "draft"
                  ? "Draft — no itinerary changes yet"
                  : `Decision: ${review.status}`}
              </h3>
              {!outcome ? <p>This draft could not be read safely.</p> : null}
              {outcome?.kind === "proposal" ? (
                <>
                  <h4>Suggested change</h4>
                  <pre>{JSON.stringify(outcome.diff, null, 2)}</pre>
                </>
              ) : outcome ? (
                <div className="inbox-question">
                  <p>{outcomeMessage(outcome)}</p>
                </div>
              ) : null}
              {outcome?.evidence?.length ? (
                <>
                  <h4>Evidence from document</h4>
                  <ul>
                    {outcome.evidence.map((evidence, index) => (
                      <li key={`${review.id}-evidence-${index}`}>{evidence.quote}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              {review.status === "draft" &&
              (outcome?.kind === "question" || outcome?.kind === "unclassified") &&
              !hasPreparedProposal ? (
                <div className="inbox-question">
                  <h4>File this document manually</h4>
                  {canAttach ? (
                    <>
                      <p>
                        Choose where it belongs. This prepares another exact draft only;
                        approval is always a separate step.
                      </p>
                      {!manualDraft || manualDraft.reviewId !== review.id ? (
                        <div className="inbox-actions">
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => setManualDraft({ reviewId: review.id, operation: "attach-document" })}
                          >
                            Attach to existing event
                          </button>
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => setManualDraft({ reviewId: review.id, operation: "create-event-and-attach" })}
                          >
                            Draft a new event
                          </button>
                        </div>
                      ) : manualDraft.operation === "attach-document" ? (
                        <form onSubmit={(event) => void prepareManualDraft(event, review, "attach-document")}>
                          <label>
                            Existing itinerary event
                            <select name="eventId" required defaultValue={outcome.candidateEventIds[0] ?? ""}>
                              <option value="" disabled>Choose an event</option>
                              {queue.events.map((event) => (
                                <option key={event.id} value={event.id}>
                                  {event.date} — {event.title}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="inbox-actions">
                            <button type="submit" disabled={busy !== null}>Prepare exact draft</button>
                            <button type="button" disabled={busy !== null} onClick={() => setManualDraft(null)}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <form onSubmit={(event) => void prepareManualDraft(event, review, "create-event-and-attach")}>
                          <p>
                            Review these prefilled details. Approval will create this event and attach
                            the source document together, or make no change.
                          </p>
                          <label>Event ID<input name="id" required defaultValue={prefill.id} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
                          <label>Date<input name="date" type="date" required defaultValue={prefill.date} /></label>
                          <label>Title<input name="title" required maxLength={240} defaultValue={prefill.title} /></label>
                          <label>
                            Category
                            <select name="category" defaultValue="ticket" required>
                              {['hotel', 'transport', 'attraction', 'meal', 'ticket', 'note'].map((category) => (
                                <option key={category} value={category}>{category}</option>
                              ))}
                            </select>
                          </label>
                          <label>Time<input name="time" maxLength={80} defaultValue={prefill.time} /></label>
                          <label>Location<input name="location" maxLength={300} /></label>
                          <label>Notes<textarea name="notes" rows={3} maxLength={8000} /></label>
                          <div className="inbox-actions">
                            <button type="submit" disabled={busy !== null}>Prepare exact draft</button>
                            <button type="button" disabled={busy !== null} onClick={() => setManualDraft(null)}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </>
                  ) : (
                    <p>
                      This source type cannot become a calendar attachment. Convert it to PDF or an
                      image and upload that copy before filing it.
                    </p>
                  )}
                </div>
              ) : null}
              {review.status === "draft" && outcome?.kind === "proposal" ? (
                <div className="inbox-actions">
                  <button type="button" disabled={busy !== null} onClick={() => decide(review, "approve")}>Approve change</button>
                  <button type="button" disabled={busy !== null} onClick={() => decide(review, "reject")}>Reject</button>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
