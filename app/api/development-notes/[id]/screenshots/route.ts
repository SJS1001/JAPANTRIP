import { developmentNotesModule } from "@/db/development-note-store";
import { DevelopmentNoteValidationError, MAX_DEVELOPMENT_SCREENSHOT_BYTES } from "@/lib/development-notes";
import { developmentNoteError, editorFor, PRIVATE_HEADERS, validUuid } from "../../shared";
import { readBoundedFormData, RequestBodyTooLargeError } from "@/lib/http-body";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const actor = await editorFor(request); if (actor instanceof Response) return actor;
  try {
    const noteId = (await context.params).id?.trim() ?? "";
    if (!validUuid(noteId)) throw new DevelopmentNoteValidationError("id", "The development note ID is not valid.");
    if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data;")) {
      return Response.json({ error: "Use multipart form data to upload a screenshot." }, { status: 415, headers: PRIVATE_HEADERS });
    }
    const length = Number(request.headers.get("content-length"));
    if (Number.isFinite(length) && length > MAX_DEVELOPMENT_SCREENSHOT_BYTES + 64 * 1024) return Response.json({ error: "The screenshot request is too large." }, { status: 413, headers: PRIVATE_HEADERS });
    const form = await readBoundedFormData(request, MAX_DEVELOPMENT_SCREENSHOT_BYTES + 64 * 1024);
    if ([...form.keys()].some((key) => key !== "file") || form.getAll("file").length !== 1) throw new DevelopmentNoteValidationError("file", "Upload exactly one screenshot.");
    const file = form.get("file");
    if (!(file instanceof File)) throw new DevelopmentNoteValidationError("file", "Upload exactly one screenshot.");
    if (file.size > MAX_DEVELOPMENT_SCREENSHOT_BYTES) return Response.json({ error: "Screenshots must be 10 MB or smaller." }, { status: 413, headers: PRIVATE_HEADERS });
    const screenshot = await developmentNotesModule().addScreenshot(actor, noteId, { bytes: new Uint8Array(await file.arrayBuffer()), displayName: file.name, claimedMediaType: file.type || undefined });
    return Response.json({ screenshot }, { status: 201, headers: PRIVATE_HEADERS });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return Response.json({ error: "The screenshot request is too large." }, { status: 413, headers: PRIVATE_HEADERS });
    return developmentNoteError(error);
  }
}
