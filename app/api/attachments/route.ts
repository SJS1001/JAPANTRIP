import { attachmentModule } from "@/db/attachment-store";
import { readTrip } from "@/db/trip-store";
import { role } from "@/lib/access";
import {
  AttachmentAccessError,
  AttachmentNotFoundError,
  AttachmentValidationError,
  MAX_ATTACHMENT_BYTES,
  type AttachmentLabel,
} from "@/lib/attachments";
import { readBoundedFormData, RequestBodyTooLargeError } from "@/lib/http-body";

const PRIVATE_HEADERS = {
  "cache-control": "private, no-store, max-age=0",
  "x-content-type-options": "nosniff",
};
const MAX_MULTIPART_BYTES = MAX_ATTACHMENT_BYTES + 64 * 1024;
const ATTACHMENT_LABELS = new Set<AttachmentLabel>([
  "ticket",
  "reservation",
  "qr-code",
  "receipt",
  "instructions",
]);

function validTripItemId(value: string) {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(value);
}

function errorResponse(error: unknown) {
  if (error instanceof AttachmentAccessError) {
    return Response.json({ error: error.message }, { status: error.status, headers: PRIVATE_HEADERS });
  }
  if (error instanceof AttachmentNotFoundError) {
    return Response.json({ error: error.message }, { status: 404, headers: PRIVATE_HEADERS });
  }
  if (error instanceof AttachmentValidationError) {
    return Response.json(
      { error: error.message },
      {
        status: error.code === "file-too-large" ? 413 : 400,
        headers: PRIVATE_HEADERS,
      },
    );
  }
  return Response.json(
    { error: "Attachments are unavailable." },
    { status: 500, headers: PRIVATE_HEADERS },
  );
}

export async function GET(request: Request) {
  try {
    const accessRole = await role(request);
    if (!accessRole) throw new AttachmentAccessError(401);
    const tripItemId = new URL(request.url).searchParams.get("tripItemId")?.trim();
    if (tripItemId && !validTripItemId(tripItemId)) {
      return Response.json(
        { error: "The trip item ID is not valid." },
        { status: 400, headers: PRIVATE_HEADERS },
      );
    }
    const attachments = await attachmentModule().list(
      { role: accessRole },
      { tripItemId },
    );
    return Response.json({ attachments }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const accessRole = await role(request);
    if (!accessRole) throw new AttachmentAccessError(401);
    if (accessRole !== "editor") throw new AttachmentAccessError(403);

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
      return Response.json(
        { error: "Use multipart form data to upload an attachment." },
        { status: 415, headers: PRIVATE_HEADERS },
      );
    }
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
      return Response.json(
        { error: "The upload request is too large." },
        { status: 413, headers: PRIVATE_HEADERS },
      );
    }

    const form = await readBoundedFormData(request, MAX_MULTIPART_BYTES);
    const allowedFields = new Set(["tripItemId", "file", "label", "viewerApproved"]);
    if (
      [...form.keys()].some((key) => !allowedFields.has(key)) ||
      form.getAll("tripItemId").length !== 1 ||
      form.getAll("label").length > 1 ||
      form.getAll("viewerApproved").length > 1
    ) {
      return Response.json(
        { error: "The attachment upload fields are not valid." },
        { status: 400, headers: PRIVATE_HEADERS },
      );
    }
    const files = form.getAll("file");
    const file = files[0];
    if (files.length !== 1 || !(file instanceof File)) {
      return Response.json(
        { error: "Upload exactly one attachment file." },
        { status: 400, headers: PRIVATE_HEADERS },
      );
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return Response.json(
        { error: "Attachments must be 10 MB or smaller." },
        { status: 413, headers: PRIVATE_HEADERS },
      );
    }

    const tripItemIdValue = form.get("tripItemId");
    const tripItemId = typeof tripItemIdValue === "string" ? tripItemIdValue.trim() : "";
    if (!validTripItemId(tripItemId)) {
      return Response.json(
        { error: "The trip item ID is not valid." },
        { status: 400, headers: PRIVATE_HEADERS },
      );
    }
    const trip = await readTrip();
    if (!trip.items.some((item: { id?: string }) => item.id === tripItemId)) {
      return Response.json(
        { error: "That agenda item does not exist." },
        { status: 404, headers: PRIVATE_HEADERS },
      );
    }
    const labelValue = form.get("label");
    const label = typeof labelValue === "string" && labelValue
      ? labelValue
      : undefined;
    if (label && !ATTACHMENT_LABELS.has(label as AttachmentLabel)) {
      return Response.json(
        { error: "The attachment label is not valid." },
        { status: 400, headers: PRIVATE_HEADERS },
      );
    }
    const approvalValue = form.get("viewerApproved");
    if (
      approvalValue !== null &&
      approvalValue !== "true" &&
      approvalValue !== "false"
    ) {
      return Response.json(
        { error: "Viewer approval must be true or false." },
        { status: 400, headers: PRIVATE_HEADERS },
      );
    }

    const attachment = await attachmentModule().upload(
      { role: accessRole, id: "family-editor" },
      {
        tripItemId,
        displayName: file.name,
        bytes: new Uint8Array(await file.arrayBuffer()),
        claimedMediaType: file.type || undefined,
        label: label as AttachmentLabel | undefined,
        viewerApproved: approvalValue === "true",
      },
    );
    return Response.json(
      { attachment },
      { status: 201, headers: PRIVATE_HEADERS },
    );
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ error: "The upload request is too large." }, { status: 413, headers: PRIVATE_HEADERS });
    }
    return errorResponse(error);
  }
}
