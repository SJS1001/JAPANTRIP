"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AttachmentLabel, AttachmentSummary } from "@/lib/attachments";

type AttachmentManagerProps = {
  tripItemId: string;
  role: "viewer" | "editor";
  title?: string;
};

const LABELS: { value: AttachmentLabel; label: string }[] = [
  { value: "ticket", label: "Ticket" },
  { value: "reservation", label: "Reservation" },
  { value: "qr-code", label: "QR code" },
  { value: "receipt", label: "Receipt" },
  { value: "instructions", label: "Instructions" },
];

async function responseError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || "The attachment request failed.";
  } catch {
    return "The attachment request failed.";
  }
}

export default function AttachmentManager({
  tripItemId,
  role,
  title = "Attachments",
}: AttachmentManagerProps) {
  const [attachments, setAttachments] = useState<AttachmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [label, setLabel] = useState<AttachmentLabel>("ticket");
  const [viewerApproved, setViewerApproved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const isEditor = role === "editor";

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/attachments?tripItemId=${encodeURIComponent(tripItemId)}`,
        { cache: "no-store", signal },
      );
      if (!response.ok) throw new Error(await responseError(response));
      const body = (await response.json()) as { attachments?: AttachmentSummary[] };
      if (signal?.aborted) return;
      setAttachments(Array.isArray(body.attachments) ? body.attachments : []);
    } catch (loadError) {
      if (signal?.aborted) return;
      setError(loadError instanceof Error ? loadError.message : "Attachments could not be loaded.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [tripItemId]);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    queueMicrotask(() => {
      if (current) void load(controller.signal);
    });
    return () => {
      current = false;
      controller.abort();
    };
  }, [load, role]);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isEditor) return;
    const file = fileInput.current?.files?.[0];
    if (!file) {
      setError("Choose a PDF, JPEG, PNG, or WebP file.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      form.set("tripItemId", tripItemId);
      form.set("file", file);
      form.set("label", label);
      form.set("viewerApproved", String(viewerApproved));
      const response = await fetch("/api/attachments", { method: "POST", body: form });
      if (!response.ok) throw new Error(await responseError(response));
      if (fileInput.current) fileInput.current.value = "";
      setViewerApproved(false);
      setMessage("Attachment uploaded.");
      await load();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The file could not be uploaded.");
    } finally {
      setBusy(false);
    }
  }

  async function setApproval(attachment: AttachmentSummary, approved: boolean) {
    if (!isEditor) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/attachments/${attachment.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ viewerApproved: approved }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setMessage(approved ? "Attachment approved for My Day." : "Attachment hidden from My Day.");
      await load();
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : "Approval could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(attachment: AttachmentSummary) {
    if (!isEditor) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/attachments/${attachment.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await responseError(response));
      setMessage("Attachment removed. It can still be restored by an editor.");
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "The attachment could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="attachment-manager" aria-labelledby={`attachments-${tripItemId}`}>
      <header>
        <p className="kicker">Private family files</p>
        <h3 id={`attachments-${tripItemId}`}>{title}</h3>
        <p>{isEditor ? "Upload and choose which files appear in My Day." : "Files approved for My Day."}</p>
      </header>

      {isEditor && (
        <form onSubmit={upload} aria-label="Upload attachment">
          <label>
            <span>File</span>
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              required
              disabled={busy}
            />
          </label>
          <label>
            <span>Type</span>
            <select value={label} onChange={(event) => setLabel(event.target.value as AttachmentLabel)} disabled={busy}>
              {LABELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={viewerApproved}
              onChange={(event) => setViewerApproved(event.target.checked)}
              disabled={busy}
            />
            Show this file in My Day
          </label>
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? "Uploading…" : "Upload attachment"}
          </button>
          <small>PDF, JPEG, PNG, or WebP · maximum 10 MB</small>
        </form>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="notice saved" role="status">{message}</p>}
      {loading && <p role="status">Loading attachments…</p>}
      {!loading && !attachments.length && <p className="empty">No attachments available.</p>}

      {!loading && attachments.length > 0 && (
        <ul aria-label={`${title} files`}>
          {attachments.map((attachment) => (
            <li key={attachment.id}>
              <div>
                <a href={`/api/attachments/${attachment.id}`} target="_blank" rel="noreferrer">
                  {attachment.displayName}
                </a>
                <small>
                  {attachment.label?.replaceAll("-", " ") || "attachment"} · {Math.max(1, Math.ceil(attachment.size / 1024))} KB
                  {isEditor ? ` · ${attachment.viewerApproved ? "Shown in My Day" : "Editor only"}` : ""}
                </small>
              </div>
              {isEditor && (
                <div>
                  <button
                    type="button"
                    className="button"
                    disabled={busy}
                    onClick={() => void setApproval(attachment, !attachment.viewerApproved)}
                  >
                    {attachment.viewerApproved ? "Hide from My Day" : "Approve for My Day"}
                  </button>
                  <button
                    type="button"
                    className="button"
                    disabled={busy}
                    onClick={() => void remove(attachment)}
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
