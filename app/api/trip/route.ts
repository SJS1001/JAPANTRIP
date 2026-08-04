import { role } from "@/lib/access";
import { authorizeTripOperation, type AccessRole, type TripOperation } from "@/lib/session-token";
import { readTrip, recentHistory, restoreVerifiedTrip, writeTrip } from "@/db/trip-store";
import {
  projectViewerTrip,
  TripValidationError,
  validateTripItems,
} from "@/lib/trip-schema";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/http-body";

const PRIVATE_HEADERS = { "cache-control": "private, no-store, max-age=0" };
const MAX_TRIP_WRITE_BYTES = 2 * 1024 * 1024;

function writeRequestError(request: Request) {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return Response.json(
      { error: "Use JSON to update the family agenda." },
      { status: 415, headers: PRIVATE_HEADERS },
    );
  }
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_TRIP_WRITE_BYTES) {
    return Response.json(
      { error: "The agenda update is too large." },
      { status: 413, headers: PRIVATE_HEADERS },
    );
  }
  return null;
}

async function accessFor(request: Request, operation: TripOperation): Promise<AccessRole | Response> {
  const accessRole = await role(request);
  const decision = authorizeTripOperation(accessRole, operation);
  if (decision.allowed) return decision.role;
  return Response.json(
    {
      error:
        decision.status === 401
          ? "Family access is required."
          : "Editor access is required.",
    },
    { status: decision.status, headers: PRIVATE_HEADERS },
  );
}

export async function GET(request: Request) {
  const access = await accessFor(request, "read");
  if (access instanceof Response) return access;
  try {
    const [trip, history] = await Promise.all([readTrip(), recentHistory()]);
    const items = access === "viewer" ? projectViewerTrip(trip.items) : validateTripItems(trip.items);
    return Response.json(
      { ...trip, items, history, role: access },
      { headers: PRIVATE_HEADERS },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "The trip could not be loaded." },
      { status: 500, headers: PRIVATE_HEADERS },
    );
  }
}

export async function PUT(request: Request) {
  const access = await accessFor(request, "write");
  if (access instanceof Response) return access;
  const requestError = writeRequestError(request);
  if (requestError) return requestError;
  try {
    const value = await readBoundedJson(request, MAX_TRIP_WRITE_BYTES);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return Response.json({ error: "Agenda update details are required." }, { status: 400, headers: PRIVATE_HEADERS });
    }
    const payload = value as {
      items?: unknown[];
      baseVersion?: number;
      changedBy?: string;
      action?: string;
    };
    const items = validateTripItems(payload.items);
    if (!Number.isInteger(payload.baseVersion) || Number(payload.baseVersion) < 1) {
      return Response.json({ error: "The calendar version is missing." }, { status: 400, headers: PRIVATE_HEADERS });
    }
    const result = await writeTrip({
      items,
      baseVersion: Number(payload.baseVersion),
      changedBy: typeof payload.changedBy === "string" ? payload.changedBy.trim().slice(0, 60) || "Family member" : "Family member",
      action: typeof payload.action === "string" ? payload.action.trim().slice(0, 180) || "Updated the itinerary" : "Updated the itinerary",
    });
    if (result.conflict) {
      const latest = await readTrip();
      return Response.json(
        { error: "Another family member saved a newer version.", ...latest },
        { status: 409, headers: PRIVATE_HEADERS },
      );
    }
    return Response.json({ ok: true, version: result.version }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ error: "The agenda update is too large." }, { status: 413, headers: PRIVATE_HEADERS });
    }
    if (error instanceof TripValidationError) {
      return Response.json({ error: error.message }, { status: 400, headers: PRIVATE_HEADERS });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "The trip could not be saved." },
      { status: 500, headers: PRIVATE_HEADERS },
    );
  }
}

export async function POST(request: Request) {
  const access = await accessFor(request, "write");
  if (access instanceof Response) return access;
  const requestError = writeRequestError(request);
  if (requestError) return requestError;
  try {
    const value = await readBoundedJson(request, MAX_TRIP_WRITE_BYTES);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return Response.json({ error: "Restore details are required." }, { status: 400, headers: PRIVATE_HEADERS });
    }
    const payload = value as { baseVersion?: number; changedBy?: string };
    if (!Number.isInteger(payload.baseVersion) || Number(payload.baseVersion) < 1) {
      return Response.json({ error: "The calendar version is missing." }, { status: 400, headers: PRIVATE_HEADERS });
    }
    const result = await restoreVerifiedTrip({
      baseVersion: Number(payload.baseVersion),
      changedBy: typeof payload.changedBy === "string" ? payload.changedBy.trim().slice(0, 60) || "Family member" : "Family member",
    });
    if (result.conflict) {
      const latest = await readTrip();
      return Response.json({ error: "Another family member saved a newer version.", ...latest }, { status: 409, headers: PRIVATE_HEADERS });
    }
    return Response.json({ ok: true, version: result.version }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ error: "The restore request is too large." }, { status: 413, headers: PRIVATE_HEADERS });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "The verified itinerary could not be restored." },
      { status: 500, headers: PRIVATE_HEADERS },
    );
  }
}
