import { developmentNotesModule } from "@/db/development-note-store";
import { DevelopmentNoteValidationError } from "@/lib/development-notes";
import { developmentNoteError, editorFor, PRIVATE_HEADERS, requireJson } from "./shared";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/http-body";

export async function GET(request: Request) {
  const actor = await editorFor(request);
  if (actor instanceof Response) return actor;
  try {
    return Response.json({ notes: await developmentNotesModule().list(actor) }, { headers: PRIVATE_HEADERS });
  } catch (error) { return developmentNoteError(error); }
}

export async function POST(request: Request) {
  const actor = await editorFor(request);
  if (actor instanceof Response) return actor;
  if (!requireJson(request)) return Response.json({ error: "Use JSON to create a development note." }, { status: 415, headers: PRIVATE_HEADERS });
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > 8 * 1024) return Response.json({ error: "The development note request is too large." }, { status: 413, headers: PRIVATE_HEADERS });
  try {
    const payload = await readBoundedJson(request, 8 * 1024);
    if (!payload || typeof payload !== "object") throw new DevelopmentNoteValidationError("note", "Development note details are required.");
    const note = await developmentNotesModule().create(actor, payload as { body: string });
    return Response.json({ note }, { status: 201, headers: PRIVATE_HEADERS });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return Response.json({ error: "The development note request is too large." }, { status: 413, headers: PRIVATE_HEADERS });
    return developmentNoteError(error);
  }
}
