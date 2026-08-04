import { familyRatingsModule } from "@/db/family-rating-store";
import { readTrip } from "@/db/trip-store";
import { FAMILY_RATING_HEADERS as HEADERS, familyRatingActor as actor, familyRatingError as errorResponse } from "./shared";

export async function GET(request: Request) {
  try {
    const accessActor = await actor(request, false);
    const targetId = new URL(request.url).searchParams.get("targetId")?.trim() || undefined;
    const result = await familyRatingsModule().list(accessActor, { targetId });
    return Response.json({ ...result, role: accessActor.role }, { headers: HEADERS });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const accessActor = await actor(request, true);
    if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return Response.json({ error: "Use JSON to save a rating." }, { status: 415, headers: HEADERS });
    const length = Number(request.headers.get("content-length"));
    if (Number.isFinite(length) && length > 4 * 1024) return Response.json({ error: "The rating request is too large." }, { status: 413, headers: HEADERS });
    const input = await request.json() as { targetId?: unknown; targetKind?: unknown };
    const trip = await readTrip();
    const target = Array.isArray(trip.items)
      ? trip.items.find((item) => {
          if (!item || typeof item !== "object") return false;
          const value = item as Record<string, unknown>;
          return value.id === input.targetId && value.category === input.targetKind;
        })
      : undefined;
    if (!target || !["attraction", "hotel"].includes(String(input.targetKind))) {
      return Response.json(
        { error: "Ratings can only be saved for an attraction or hotel in the current agenda." },
        { status: 400, headers: HEADERS },
      );
    }
    const rating = await familyRatingsModule().upsert(accessActor, input);
    return Response.json({ rating }, { status: 201, headers: HEADERS });
  } catch (error) { return errorResponse(error); }
}
