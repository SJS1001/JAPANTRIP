import { readTrip } from "@/db/trip-store";

export async function GET() {
  try {
    const trip = await readTrip();
    const items = trip.items as Array<{ lat?: unknown; lng?: unknown }>;
    return Response.json(
      {
        ready: true,
        version: trip.version,
        itemCount: items.length,
        mappedItemCount: items.filter(
          (item) =>
            typeof item.lat === "number" && typeof item.lng === "number",
        ).length,
        updatedAt: trip.updatedAt,
      },
      { headers: { "cache-control": "no-store, max-age=0" } },
    );
  } catch (error) {
    return Response.json(
      {
        ready: false,
        error:
          error instanceof Error ? error.message : "Calendar status unavailable.",
      },
      { status: 500, headers: { "cache-control": "no-store, max-age=0" } },
    );
  }
}
