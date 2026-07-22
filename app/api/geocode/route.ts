import { geocodePlace } from "@/db/trip-store";
import { isAuthorized } from "@/lib/access";

function unauthorized() {
  return Response.json({ error: "Family access is required." }, { status: 401 });
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) return unauthorized();

  try {
    const payload = (await request.json()) as { query?: string };
    const query = payload.query?.trim() ?? "";
    if (query.length < 2 || query.length > 240) {
      return Response.json({ error: "Enter a place or address to map." }, { status: 400 });
    }

    const result = await geocodePlace(query);
    if ("limited" in result) {
      return Response.json(
        { error: "The map lookup is briefly busy. Trying again is safe." },
        { status: 429, headers: { "retry-after": "2" } },
      );
    }
    if (!result.found) {
      return Response.json(
        { error: "That location could not be placed automatically." },
        { status: 404 },
      );
    }

    return Response.json(result, {
      headers: { "cache-control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The location could not be mapped.",
      },
      { status: 500 },
    );
  }
}
