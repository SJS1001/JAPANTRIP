import { readFamilyAiEnabled, writeFamilyAiEnabled } from "@/db/ai-settings-store";
import { AccessDeniedError, requireEditor, requireViewer } from "@/lib/access";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/http-body";

const HEADERS = { "cache-control": "private, no-store, max-age=0" };

export async function GET(request: Request) {
  try {
    await requireViewer(request);
    return Response.json({ enabled: await readFamilyAiEnabled() }, { headers: HEADERS });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return Response.json({ error: error.message }, { status: error.status, headers: HEADERS });
    }
    return Response.json({ error: "Family AI settings are unavailable." }, { status: 503, headers: HEADERS });
  }
}

export async function PUT(request: Request) {
  try {
    await requireEditor(request);
    if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
      return Response.json({ error: "Use JSON to update AI settings." }, { status: 415, headers: HEADERS });
    }
    const input = (await readBoundedJson(request, 4 * 1024)) as { enabled?: unknown; updatedBy?: unknown };
    if (typeof input.enabled !== "boolean") {
      return Response.json({ error: "The AI setting must be true or false." }, { status: 400, headers: HEADERS });
    }
    const updatedBy = typeof input.updatedBy === "string" ? input.updatedBy.trim() : "Family editor";
    return Response.json(await writeFamilyAiEnabled(input.enabled, updatedBy), { headers: HEADERS });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ error: "The AI settings request is too large." }, { status: 413, headers: HEADERS });
    }
    if (error instanceof AccessDeniedError) {
      return Response.json({ error: error.message }, { status: error.status, headers: HEADERS });
    }
    return Response.json({ error: "Family AI settings are unavailable." }, { status: 503, headers: HEADERS });
  }
}
