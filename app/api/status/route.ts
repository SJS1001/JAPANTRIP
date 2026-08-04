import { readTrip } from "@/db/trip-store";
import { AccessDeniedError, requireViewer } from "@/lib/access";

export async function GET(request: Request) {
  try {
    await requireViewer(request);
    const trip = await readTrip();
    return Response.json(
      {
        ready: true,
        version: trip.version,
      },
      { headers: { "cache-control": "no-store, max-age=0" } },
    );
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
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
