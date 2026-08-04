import { developmentNotesModule } from "@/db/development-note-store";
import { DevelopmentNoteValidationError } from "@/lib/development-notes";
import { developmentNoteError, editorFor, validUuid } from "../../shared";

type RouteContext = { params: Promise<{ id: string }> };
async function screenshotId(context: RouteContext) { const id = (await context.params).id?.trim() ?? ""; if (!validUuid(id)) throw new DevelopmentNoteValidationError("id", "The screenshot ID is not valid."); return id; }

export async function GET(request: Request, context: RouteContext) {
  const actor = await editorFor(request); if (actor instanceof Response) return actor;
  try {
    const opened = await developmentNotesModule().readScreenshot(actor, await screenshotId(context));
    return new Response(opened.body.slice().buffer as ArrayBuffer, { headers: opened.headers });
  } catch (error) { return developmentNoteError(error); }
}

export async function DELETE(request: Request, context: RouteContext) {
  const actor = await editorFor(request); if (actor instanceof Response) return actor;
  try { await developmentNotesModule().removeScreenshot(actor, await screenshotId(context)); return Response.json({ ok: true }, { headers: { "cache-control": "private, no-store, max-age=0" } }); }
  catch (error) { return developmentNoteError(error); }
}
