import { env } from "cloudflare:workers";

type Statement = { bind: (...values: unknown[]) => Statement; all: <T = unknown>() => Promise<{ results?: T[] }> };
type Bucket = { get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null> };

/** Reads bounded extracted Inbox text only for attachment IDs already authorized by the caller. */
export async function attachmentExtractedText(ids: string[]) {
  const bindings = env as unknown as { DB?: { prepare(sql: string): Statement }; ATTACHMENTS?: Bucket };
  const uniqueIds = [...new Set(ids)].slice(0, 12);
  const result = new Map<string, string>();
  if (!uniqueIds.length || !bindings.DB || !bindings.ATTACHMENTS) return result;
  const placeholders = uniqueIds.map(() => "?").join(", ");
  const rows = await bindings.DB
    .prepare(`SELECT id, object_key FROM trip_attachments WHERE id IN (${placeholders}) AND deleted_at IS NULL`)
    .bind(...uniqueIds)
    .all<{ id: string; object_key: string }>();
  let remaining = 20_000;
  for (const row of rows.results ?? []) {
    if (remaining <= 0) break;
    const object = await bindings.ATTACHMENTS.get(`${row.object_key}.analysis.txt`);
    if (!object) continue;
    const text = new TextDecoder().decode(await object.arrayBuffer()).trim().slice(0, Math.min(4_000, remaining));
    if (text) { result.set(row.id, text); remaining -= text.length; }
  }
  return result;
}
