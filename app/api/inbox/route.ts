import { aiInboxStore } from "@/db/ai-inbox-store";
import { readTrip } from "@/db/trip-store";

import {
  INBOX_PRIVATE_HEADERS,
  inboxEditor,
  inboxErrorResponse,
} from "./shared";

const MAX_INBOX_BYTES = 10 * 1024 * 1024;
const MAX_ANALYSIS_TEXT = 250_000;
const SUPPORTED_MEDIA_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "message/rfc822",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function bytesMatchMediaType(bytes: Uint8Array, mediaType: string) {
  if (mediaType === "application/pdf") {
    return bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  }
  if (mediaType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mediaType === "image/png") {
    return bytes.length >= 8 &&
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
        .every((value, index) => bytes[index] === value);
  }
  if (mediaType === "image/webp") {
    return bytes.length >= 12 &&
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  }
  if (mediaType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b &&
      bytes[2] === 0x03 && bytes[3] === 0x04;
  }
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return !bytes.includes(0);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    await inboxEditor(request);
    return Response.json(await aiInboxStore().listReviewQueue(), {
      headers: INBOX_PRIVATE_HEADERS,
    });
  } catch (error) {
    return inboxErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const editor = await inboxEditor(request);
    if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data;")) {
      return Response.json(
        { error: "Use multipart form data to stage an Inbox document." },
        { status: 415, headers: INBOX_PRIVATE_HEADERS },
      );
    }
    const form = await request.formData();
    const files = form.getAll("file");
    const file = files[0];
    if (files.length !== 1 || !(file instanceof File)) {
      return Response.json(
        { error: "Upload exactly one document." },
        { status: 400, headers: INBOX_PRIVATE_HEADERS },
      );
    }
    if (!file.size || file.size > MAX_INBOX_BYTES) {
      return Response.json(
        { error: "Documents must be between 1 byte and 10 MB." },
        { status: file.size > MAX_INBOX_BYTES ? 413 : 400, headers: INBOX_PRIVATE_HEADERS },
      );
    }
    if (!SUPPORTED_MEDIA_TYPES.has(file.type)) {
      return Response.json(
        { error: "That document type is not supported." },
        { status: 415, headers: INBOX_PRIVATE_HEADERS },
      );
    }
    const analysisValue = form.get("analysisText");
    const analysisText = typeof analysisValue === "string" ? analysisValue.trim() : "";
    if (analysisText.length > MAX_ANALYSIS_TEXT) {
      return Response.json(
        { error: "The extracted document text is too large." },
        { status: 413, headers: INBOX_PRIVATE_HEADERS },
      );
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!bytesMatchMediaType(bytes, file.type)) {
      return Response.json(
        { error: "The file does not match the selected document type." },
        { status: 415, headers: INBOX_PRIVATE_HEADERS },
      );
    }
    const trip = await readTrip();
    const document = await aiInboxStore().uploadDocument({
      filename: file.name,
      mediaType: file.type,
      bytes,
      analysisText: analysisText || undefined,
      uploadedBy: editor.id,
      baseTripVersion: trip.version,
    });
    return Response.json(
      { document },
      { status: 201, headers: INBOX_PRIVATE_HEADERS },
    );
  } catch (error) {
    return inboxErrorResponse(error);
  }
}
