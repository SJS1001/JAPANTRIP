"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createOfflineRatingQueue, LocalStorageOfflineRatingQueueAdapter } from "@/lib/client/offline-ratings";
import type { RatingTargetKind } from "@/lib/family-ratings";
import styles from "./FieldFeatures.module.css";

type Rating = { id: string; targetId: string; targetKind: RatingTargetKind; memberName: string; stars: number; comment?: string; updatedAt: string };
type Props = { targetId: string; targetKind: RatingTargetKind; role: "viewer" | "editor"; defaultMemberName?: string };

export default function FamilyRatings({ targetId, targetKind, role, defaultMemberName = "" }: Props) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [memberName, setMemberName] = useState(() => defaultMemberName || (typeof localStorage === "undefined" ? "" : localStorage.getItem("japanTripFamilyName") ?? ""));
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(0);
  const queue = useMemo(() => typeof localStorage === "undefined" ? null : createOfflineRatingQueue(new LocalStorageOfflineRatingQueueAdapter()), []);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/ratings?targetId=${encodeURIComponent(targetId)}`, { cache: "no-store" });
      const result = await response.json() as { ratings?: Rating[]; summary?: { average: number | null; count: number }; error?: string };
      if (!response.ok) throw new Error(result.error || "Family ratings could not be loaded.");
      setRatings(result.ratings ?? []); setAverage(result.summary?.average ?? null);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Family ratings could not be loaded."); }
  }, [targetId]);

  const sync = useCallback(async () => {
    if (!queue || !navigator.onLine || role !== "editor") return;
    const values = await queue.list(); setPending(values.length);
    for (const value of values) {
      try {
        const response = await fetch("/api/ratings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetId: value.targetId, targetKind: value.targetKind, memberName: value.memberName, stars: value.stars, comment: value.comment }) });
        if (!response.ok) continue;
        await queue.complete(value.id);
      } catch { break; }
    }
    const remaining = await queue.list(); setPending(remaining.length);
    if (remaining.length !== values.length) await load();
  }, [load, queue, role]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load().then(sync), 0);
    const online = () => void sync(); window.addEventListener("online", online);
    return () => { window.clearTimeout(initial); window.removeEventListener("online", online); };
  }, [load, sync]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const input = { targetId, targetKind, memberName, stars, comment: comment.trim() || undefined };
    try {
      const response = await fetch("/api/ratings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error || "The rating could not be saved.");
      setComment(""); setMessage("Family rating saved."); await load();
    } catch (error) {
      if (!navigator.onLine && queue) {
        await queue.enqueue(input); setPending((value) => value + 1); setMessage("Offline: rating queued on this device and will sync when you reconnect.");
      } else setMessage(error instanceof Error ? error.message : "The rating could not be saved.");
    } finally { setBusy(false); }
  }

  return <section className={styles.panel} aria-label="Family ratings">
    <header className={styles.header}><div><h3>Family rating</h3><p className={styles.muted}>Your family’s own trip score—not a public internet rating.</p></div>{average !== null && <div className={styles.summary} aria-label={`${average} out of 5 from ${ratings.length} ratings`}><strong>{average}</strong><span aria-hidden="true">★</span><small>({ratings.length})</small></div>}</header>
    {message && <p className={styles.notice} role="status">{message}</p>}{pending > 0 && <p className={styles.pending}>{pending} rating{pending === 1 ? "" : "s"} waiting to sync.</p>}
    {ratings.length > 0 && <ol className={styles.ratingList}>{ratings.map((rating) => <li className={styles.rating} key={rating.id}><strong>{rating.memberName}</strong><span aria-label={`${rating.stars} out of 5 stars`}>{"★".repeat(rating.stars)}{"☆".repeat(5 - rating.stars)}</span>{rating.comment && <p>{rating.comment}</p>}</li>)}</ol>}
    {ratings.length === 0 && <p className={styles.muted}>No family rating yet.</p>}
    {role === "editor" && <form className={styles.form} onSubmit={submit}>
      <label>Family member<input value={memberName} maxLength={60} required onChange={(event) => setMemberName(event.target.value)} /></label>
      <fieldset><legend className={styles.muted}>Stars</legend><div className={styles.stars}>{[1, 2, 3, 4, 5].map((value) => <button className={`${styles.star} ${value <= stars ? styles.starOn : ""}`} type="button" aria-label={`${value} star${value === 1 ? "" : "s"}`} aria-pressed={stars === value} key={value} onClick={() => setStars(value)}>★</button>)}</div></fieldset>
      <label>Short comment (optional)<input value={comment} maxLength={500} onChange={(event) => setComment(event.target.value)} /></label>
      <button className="button primary" type="submit" disabled={busy || !memberName.trim() || stars === 0}>Save rating</button>
    </form>}
  </section>;
}
