import { attachmentModule } from "@/db/attachment-store";
import { role } from "@/lib/access";
import {
  AttachmentAccessError,
  AttachmentNotFoundError,
  AttachmentValidationError,
  type AttachmentLabel,
} from "@/lib/attachments";

const PRIVATE_HEADERS = {
  "cache-control": "private, no-store, max-age=0",
  "x-content-type-options": "nosniff",
};
const ATTACHMENT_LABELS = new Set<AttachmentLabel>([
  "ticket",
  "reservation",
  "qr-code",
  "receipt",
  "instructions",
]);

type RouteContext = { params: Promise<{ id: string }> };

function validAttachmentId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function errorResponse(error: unknown) {
  if (error instanceof AttachmentAccessError) {
    return Response.json({ error: error.message }, { status: error.status, headers: PRIVATE_HEADERS });
  }
  if (error instanceof AttachmentNotFoundError) {
    return Response.json({ error: error.message }, { status: 404, headers: PRIVATE_HEADERS });
  }
  if (error instanceof AttachmentValidationError) {
    return Response.json({ error: error.message }, { status: 400, headers: PRIVATE_HEADERS });
  }
  return Response.json(
    { error: "The attachment is unavailable." },
    { status: 500, headers: PRIVATE_HEADERS },
  );
}

async function attachmentId(context: RouteContext) {
  const id = (await context.params).id?.trim() ?? "";
  if (!validAttachmentId(id)) {
    throw new AttachmentValidationError("invalid-file", "The attachment ID is not valid.");
  }
  return id;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const accessRole = await role(request);
    if (!accessRole) throw new AttachmentAccessError(401);
    const id = await attachmentId(context);
    const opened = await attachmentModule().read(
      { role: accessRole },
      id,
    );
    const body = opened.body.slice().buffer as ArrayBuffer;
    return new Response(body, { headers: opened.headers });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const accessRole = await role(request);
    if (!accessRole) throw new AttachmentAccessError(401);
    if (accessRole !== "editor") throw new AttachmentAccessError(403);
    const id = await attachmentId(context);
    if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
      return Response.json(
        { error: "Use JSON to update attachment metadata." },
        { status: 415, headers: PRIVATE_HEADERS },
      );
    }
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > 16 * 1024) {
      return Response.json(
        { error: "The attachment metadata update is too large." },
        { status: 413, headers: PRIVATE_HEADERS },
      );
    }

    let payload: Record<string, unknown>;
    try {
      payload = (await request.json()) as Record<string, unknown>;
    } catch {
      return Response.json(
        { error: "The attachment metadata is not valid JSON." },
        { status: 400, headers: PRIVATE_HEADERS },
      );
    }
    const allowedKeys = new Set(["displayName", "label", "viewerApproved"]);
    if (
      !payload ||
      Array.isArray(payload) ||
      !Object.keys(payload).length ||
      Object.keys(payload).some((key) => !allowedKeys.has(key))
    ) {
      return Response.json(
        { error: "The attachment metadata update is not valid." },
        { status: 400, headers: PRIVATE_HEADERS },
      );
    }
    if (
      payload.displayName !== undefined &&
      (typeof payload.displayName !== "string" || payload.displayName.length > 500)
    ) {
      return Response.json(
        { error: "The attachment display name is not valid." },
        { status: 400, headers: PRIVATE_HEADERS },
      );
    }
    if (
      payload.label !== undefined &&
      (typeof payload.label !== "string" ||
        !ATTACHMENT_LABELS.has(payload.label as AttachmentLabel))
    ) {
      return Response.json(
        { error: "The attachment label is not valid." },
        { status: 400, headers: PRIVATE_HEADERS },
      );
    }
    if (
      payload.viewerApproved !== undefined &&
      typeof payload.viewerApproved !== "boolean"
    ) {
      return Response.json(
        { error: "Viewer approval must be true or false." },
        { status: 400, headers: PRIVATE_HEADERS },
      );
    }

    const attachment = await attachmentModule().label(
      { role: accessRole, id: "family-editor" },
      id,
      {
        displayName: payload.displayName as string | undefined,
        label: payload.label as AttachmentLabel | undefined,
        viewerApproved: payload.viewerApproved as boolean | undefined,
      },
    );
    return Response.json({ attachment }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const accessRole = await role(request);
    if (!accessRole) throw new AttachmentAccessError(401);
    if (accessRole !== "editor") throw new AttachmentAccessError(403);
    const id = await attachmentId(context);
    const attachment = await attachmentModule().softDelete(
      { role: accessRole, id: "family-editor" },
      id,
    );
    return Response.json({ attachment }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Restores a recoverable attachment tombstone. */
export async function POST(request: Request, context: RouteContext) {
  try {
    const accessRole = await role(request);
    if (!accessRole) throw new AttachmentAccessError(401);
    if (accessRole !== "editor") throw new AttachmentAccessError(403);
    const id = await attachmentId(context);
    const attachment = await attachmentModule().restore(
      { role: accessRole, id: "family-editor" },
      id,
    );
    return Response.json({ attachment }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}
