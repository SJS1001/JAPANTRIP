import { role } from "@/lib/access";
import { authorizeTripOperation, type AccessRole, type TripOperation } from "@/lib/session-token";
import { readTrip, recentHistory, restoreVerifiedTrip, writeTrip } from "@/db/trip-store";

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
    { status: decision.status },
  );
}

export async function GET(request: Request) {
  const access = await accessFor(request, "read");
  if (access instanceof Response) return access;
  try {
    const [trip, history] = await Promise.all([readTrip(), recentHistory()]);
    return Response.json(
      { ...trip, history, role: access },
      { headers: { "cache-control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "The trip could not be loaded." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const access = await accessFor(request, "write");
  if (access instanceof Response) return access;
  try {
    const payload = (await request.json()) as {
      items?: unknown[];
      baseVersion?: number;
      changedBy?: string;
      action?: string;
    };
    if (!Array.isArray(payload.items) || payload.items.length > 500) {
      return Response.json({ error: "The calendar data is not valid." }, { status: 400 });
    }
    if (JSON.stringify(payload.items).length > 1_500_000) {
      return Response.json({ error: "The calendar backup is too large." }, { status: 413 });
    }
    if (!Number.isInteger(payload.baseVersion) || Number(payload.baseVersion) < 1) {
      return Response.json({ error: "The calendar version is missing." }, { status: 400 });
    }
    const result = await writeTrip({
      items: payload.items,
      baseVersion: Number(payload.baseVersion),
      changedBy: payload.changedBy?.trim().slice(0, 60) || "Family member",
      action: payload.action?.trim().slice(0, 180) || "Updated the itinerary",
    });
    if (result.conflict) {
      const latest = await readTrip();
      return Response.json(
        { error: "Another family member saved a newer version.", ...latest },
        { status: 409 },
      );
    }
    return Response.json({ ok: true, version: result.version });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "The trip could not be saved." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const access = await accessFor(request, "write");
  if (access instanceof Response) return access;
  try {
    const payload = (await request.json()) as { baseVersion?: number; changedBy?: string };
    if (!Number.isInteger(payload.baseVersion) || Number(payload.baseVersion) < 1) {
      return Response.json({ error: "The calendar version is missing." }, { status: 400 });
    }
    const result = await restoreVerifiedTrip({
      baseVersion: Number(payload.baseVersion),
      changedBy: payload.changedBy?.trim().slice(0, 60) || "Family member",
    });
    if (result.conflict) {
      const latest = await readTrip();
      return Response.json({ error: "Another family member saved a newer version.", ...latest }, { status: 409 });
    }
    return Response.json({ ok: true, version: result.version });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "The verified itinerary could not be restored." },
      { status: 500 },
    );
  }
}
