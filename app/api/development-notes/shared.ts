import { role } from "@/lib/access";
import {
  DevelopmentNoteAccessError,
  DevelopmentNoteNotFoundError,
  DevelopmentNoteValidationError,
  type DevelopmentNoteActor,
} from "@/lib/development-notes";

export const PRIVATE_HEADERS = {
  "cache-control": "private, no-store, max-age=0",
  "x-content-type-options": "nosniff",
};

export async function editorFor(request: Request): Promise<Exclude<DevelopmentNoteActor, null> | Response> {
  const accessRole = await role(request);
  if (!accessRole) return Response.json({ error: "Family access is required." }, { status: 401, headers: PRIVATE_HEADERS });
  if (accessRole !== "editor") return Response.json({ error: "Editor access is required." }, { status: 403, headers: PRIVATE_HEADERS });
  return { role: "editor", id: "family-editor" };
}

export function developmentNoteError(error: unknown) {
  if (error instanceof DevelopmentNoteAccessError || error instanceof DevelopmentNoteNotFoundError) {
    return Response.json({ error: error.message }, { status: error.status, headers: PRIVATE_HEADERS });
  }
  if (error instanceof DevelopmentNoteValidationError || error instanceof SyntaxError) {
    return Response.json(
      { error: error instanceof DevelopmentNoteValidationError ? error.message : "Development note details must be valid JSON.", ...(error instanceof DevelopmentNoteValidationError ? { field: error.field } : {}) },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }
  return Response.json({ error: "Development notes are temporarily unavailable." }, { status: 500, headers: PRIVATE_HEADERS });
}

export function validUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function requireJson(request: Request) {
  return (request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json");
}
