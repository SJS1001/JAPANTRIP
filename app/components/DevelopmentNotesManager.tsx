"use client";

import Image from "next/image";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createDevelopmentScreenshotQueue, IndexedDbDevelopmentScreenshotQueueAdapter } from "@/lib/client/offline-development-notes";
import styles from "./FieldFeatures.module.css";

type Screenshot = { id: string; noteId: string; displayName: string; mediaType: string; size: number; uploadedAt: string };
type DevelopmentNote = { id: string; body: string; createdAt: string; updatedAt: string; screenshots: Screenshot[] };
const DRAFT_KEY = "japanTripDevelopmentNoteDraftV1";

async function payload(response: Response) {
  try { return await response.json() as { notes?: DevelopmentNote[]; note?: DevelopmentNote; screenshot?: Screenshot; error?: string }; }
  catch { return {}; }
}

export default function DevelopmentNotesManager() {
  const [notes, setNotes] = useState<DevelopmentNote[]>([]);
  const [body, setBody] = useState(() => typeof localStorage === "undefined" ? "" : localStorage.getItem(DRAFT_KEY) ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [pendingScreenshots, setPendingScreenshots] = useState(0);
  const queue = useMemo(() => typeof indexedDB === "undefined" ? null : createDevelopmentScreenshotQueue(new IndexedDbDevelopmentScreenshotQueueAdapter()), []);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/development-notes", { cache: "no-store" });
      const result = await payload(response);
      if (!response.ok) throw new Error(result.error || "Development notes could not be loaded.");
      setNotes(result.notes ?? []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Development notes could not be loaded."); }
    finally { setLoading(false); }
  }, []);

  const syncScreenshots = useCallback(async () => {
    if (!queue || !navigator.onLine) return;
    const pending = await queue.list();
    setPendingScreenshots(pending.length);
    for (const item of pending) {
      const form = new FormData();
      form.set("file", new File([item.bytes.slice().buffer as ArrayBuffer], item.displayName, { type: item.mediaType }));
      try {
        const response = await fetch(`/api/development-notes/${encodeURIComponent(item.noteId)}/screenshots`, { method: "POST", body: form });
        if (!response.ok) continue;
        await queue.complete(item.id);
      } catch { break; }
    }
    const remaining = await queue.list();
    setPendingScreenshots(remaining.length);
    if (remaining.length !== pending.length) await load();
  }, [load, queue]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load().then(syncScreenshots), 0);
    const online = () => void syncScreenshots();
    window.addEventListener("online", online);
    return () => { window.clearTimeout(initial); window.removeEventListener("online", online); };
  }, [load, syncScreenshots]);

  function updateDraft(value: string) { setBody(value); if (value) localStorage.setItem(DRAFT_KEY, value); else localStorage.removeItem(DRAFT_KEY); }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const response = await fetch(editingId ? `/api/development-notes/${encodeURIComponent(editingId)}` : "/api/development-notes", {
        method: editingId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body }),
      });
      const result = await payload(response);
      if (!response.ok) throw new Error(result.error || "The development note could not be saved.");
      updateDraft(""); setEditingId(null); setMessage("Development note saved."); await load();
    } catch (error) {
      setMessage(navigator.onLine ? (error instanceof Error ? error.message : "The note could not be saved.") : "You are offline. This note remains safely drafted on this device and can be saved when you reconnect.");
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this development note? Its screenshots will also be hidden.")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/development-notes/${encodeURIComponent(id)}`, { method: "DELETE" });
      const result = await payload(response); if (!response.ok) throw new Error(result.error || "The note could not be deleted.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "The note could not be deleted."); }
    finally { setBusy(false); }
  }

  async function upload(noteId: string, file?: File) {
    if (!file) return;
    setBusy(true); setMessage("");
    const form = new FormData(); form.set("file", file);
    try {
      const response = await fetch(`/api/development-notes/${encodeURIComponent(noteId)}/screenshots`, { method: "POST", body: form });
      const result = await payload(response); if (!response.ok) throw new Error(result.error || "The screenshot could not be uploaded.");
      await load();
    } catch (error) {
      if (!navigator.onLine && queue && ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 10 * 1024 * 1024) {
        await queue.enqueue({ noteId, displayName: file.name, mediaType: file.type as "image/jpeg" | "image/png" | "image/webp", bytes: new Uint8Array(await file.arrayBuffer()) });
        setPendingScreenshots((value) => value + 1);
        setMessage("Offline: screenshot stored on this device for upload when you reconnect.");
      } else setMessage(error instanceof Error ? error.message : "The screenshot could not be uploaded.");
    } finally { setBusy(false); }
  }

  async function removeScreenshot(id: string) {
    if (!window.confirm("Delete this screenshot?")) return;
    setBusy(true);
    try { const response = await fetch(`/api/development-notes/screenshots/${encodeURIComponent(id)}`, { method: "DELETE" }); const result = await payload(response); if (!response.ok) throw new Error(result.error || "The screenshot could not be deleted."); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "The screenshot could not be deleted."); }
    finally { setBusy(false); }
  }

  return <section className={styles.panel} aria-labelledby="development-notes-title">
    <header className={styles.header}><div><h2 id="development-notes-title">Development notes</h2><p className={styles.muted}>Private to editors. Capture field-test issues and screenshots without changing the family agenda.</p></div></header>
    {message && <p className={styles.notice} role="status">{message}</p>}
    {pendingScreenshots > 0 && <p className={styles.pending}>{pendingScreenshots} screenshot{pendingScreenshots === 1 ? "" : "s"} waiting to upload.</p>}
    <form className={styles.form} onSubmit={save}>
      <label>{editingId ? "Edit note" : "New observation"}<textarea value={body} maxLength={5000} required onChange={(event) => updateDraft(event.target.value)} placeholder="What happened, where, and what did you expect?" /></label>
      <div className={styles.actions}><button className="button primary" type="submit" disabled={busy || !body.trim()}>{editingId ? "Save changes" : "Add note"}</button>{editingId && <button className="button" type="button" onClick={() => { setEditingId(null); updateDraft(""); }}>Cancel</button>}</div>
      <p className={styles.muted}>Draft text stays on this device until you save it. Avoid passwords, passport numbers, or medical details.</p>
    </form>
    {loading ? <p className={styles.muted}>Loading private notes…</p> : notes.length === 0 ? <p className={styles.muted}>No development notes yet.</p> : <ol className={styles.noteList}>{notes.map((note) => <li className={styles.note} key={note.id}>
      <p>{note.body}</p><span className={styles.noteMeta}>Updated {new Date(note.updatedAt).toLocaleString()}</span>
      {note.screenshots.length > 0 && <div className={styles.shots}>{note.screenshots.map((shot) => <div className={styles.shot} key={shot.id}>
        <a href={`/api/development-notes/screenshots/${encodeURIComponent(shot.id)}`} target="_blank" rel="noreferrer"><Image unoptimized width={160} height={96} src={`/api/development-notes/screenshots/${encodeURIComponent(shot.id)}`} alt={shot.displayName} /></a>
        <button type="button" aria-label={`Delete ${shot.displayName}`} onClick={() => void removeScreenshot(shot.id)}>×</button>
      </div>)}</div>}
      <div className={styles.actions}><button className="button" type="button" onClick={() => { setEditingId(note.id); updateDraft(note.body); }}>Edit</button><label className="button">Add screenshot<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { void upload(note.id, event.target.files?.[0]); event.target.value = ""; }} /></label><button className="button danger" type="button" onClick={() => void remove(note.id)}>Delete</button></div>
    </li>)}</ol>}
  </section>;
}
