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

type Queue = { documents: InboxDocumentSummary[]; outcomes: Review[] };

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
  const [queue, setQueue] = useState<Queue>({ documents: [], outcomes: [] });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
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
    setBusy("upload");
    setMessage("Uploading privately…");
    try {
      const response = await fetch("/api/inbox", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const body = await responseJson(response) as { document: InboxDocumentSummary };
      setMessage("Uploaded. Preparing an AI draft for review…");
      const analysis = await fetch(`/api/inbox/${encodeURIComponent(body.document.id)}/analyze`, {
        method: "POST",
      });
      await responseJson(analysis);
      formRef.current?.reset();
      await loadQueue();
      setMessage("Draft ready. Nothing has changed in the itinerary.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The document could not be uploaded.");
    } finally {
      setBusy(null);
    }
  }

  async function decide(review: Review, action: "approve" | "reject") {
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
              Paste key details for accurate matching. Scans, photos, PDFs, and DOCX files are
              stored privately but are not automatically OCRed yet; without text, the assistant
              will ask you to classify the file instead of guessing.
            </small>
          </label>
          <button type="submit" disabled={busy !== null}>
            {busy === "upload" ? "Uploading…" : "Upload and analyze"}
          </button>
        </form>
        {message ? <p role="status">{message}</p> : null}
      </section>

      <section className="inbox-panel" aria-labelledby="inbox-review-title">
        <h2 id="inbox-review-title">Review queue</h2>
        {!queue.outcomes.length ? <p>No AI drafts are waiting for review.</p> : null}
        {queue.outcomes.map((review) => {
          const outcome = review.outcome;
          const document = queue.documents.find((item) => item.id === review.documentId);
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
                  {outcome.kind === "question" ? (
                    <Link href="/">Open the full calendar to create an event</Link>
                  ) : null}
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
