import { developmentNotesModule } from "@/db/development-note-store";
import { DevelopmentNoteValidationError } from "@/lib/development-notes";
import { developmentNoteError, editorFor, PRIVATE_HEADERS, requireJson, validUuid } from "../shared";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/http-body";

type RouteContext = { params: Promise<{ id: string }> };
async function noteId(context: RouteContext) {
  const id = (await context.params).id?.trim() ?? "";
  if (!validUuid(id)) throw new DevelopmentNoteValidationError("id", "The development note ID is not valid.");
  return id;
}

export async function PATCH(request: Request, context: RouteContext) {
  const actor = await editorFor(request); if (actor instanceof Response) return actor;
  if (!requireJson(request)) return Response.json({ error: "Use JSON to update a development note." }, { status: 415, headers: PRIVATE_HEADERS });
  try {
    const note = await developmentNotesModule().update(actor, await noteId(context), await readBoundedJson(request, 8 * 1024) as { body?: string });
    return Response.json({ note }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return Response.json({ error: "The development note request is too large." }, { status: 413, headers: PRIVATE_HEADERS });
    return developmentNoteError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const actor = await editorFor(request); if (actor instanceof Response) return actor;
  try {
    await developmentNotesModule().remove(actor, await noteId(context));
    return Response.json({ ok: true }, { headers: PRIVATE_HEADERS });
  } catch (error) { return developmentNoteError(error); }
}
