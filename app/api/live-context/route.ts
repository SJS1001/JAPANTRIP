import { env } from "cloudflare:workers";

import { isAuthorized } from "@/lib/access";
import { tripCities, type TripCityId } from "@/lib/live-context";
import { fetchLiveContext } from "@/lib/live-context-service";

type LiveContextEnvironment = {
  ODPT_API_KEY?: string;
};

function isTripCity(value: string): value is TripCityId {
  return tripCities.some((city) => city.id === value);
}

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return Response.json({ error: "Family access is required." }, { status: 401, headers: { "cache-control": "no-store" } });
  }
  const city = new URL(request.url).searchParams.get("city") ?? "tokyo";
  if (!isTripCity(city)) {
    return Response.json({ error: "Choose a supported itinerary city." }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  try {
    const configured = env as unknown as LiveContextEnvironment;
    const payload = await fetchLiveContext(city, { odptApiKey: configured.ODPT_API_KEY });
    return Response.json(payload, {
      headers: {
        "cache-control": "private, max-age=60, stale-while-revalidate=300",
        vary: "Cookie",
      },
    });
  } catch {
    return Response.json(
      { error: "Official live context is temporarily unavailable. Use the official source links." },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
