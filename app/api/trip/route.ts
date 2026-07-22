import { isAuthorized } from "@/lib/access";
import { readTrip, recentHistory, writeTrip } from "@/db/trip-store";

function unauthorized() {
  return Response.json({ error: "Family access is required." }, { status: 401 });
}

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) return unauthorized();
  try {
    const [trip, history] = await Promise.all([readTrip(), recentHistory()]);
    return Response.json({ ...trip, history });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "The trip could not be loaded." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  if (!(await isAuthorized(request))) return unauthorized();
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
