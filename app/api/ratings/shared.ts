import { role } from "@/lib/access";
import { FamilyRatingAccessError, FamilyRatingNotFoundError, FamilyRatingValidationError } from "@/lib/family-ratings";

export const FAMILY_RATING_HEADERS = { "cache-control": "private, no-store, max-age=0", "x-content-type-options": "nosniff" };

export function familyRatingError(error: unknown) {
  if (error instanceof FamilyRatingAccessError || error instanceof FamilyRatingNotFoundError) return Response.json({ error: error.message }, { status: error.status, headers: FAMILY_RATING_HEADERS });
  if (error instanceof FamilyRatingValidationError || error instanceof SyntaxError) return Response.json({ error: error instanceof FamilyRatingValidationError ? error.message : "Rating details must be valid JSON.", ...(error instanceof FamilyRatingValidationError ? { field: error.field } : {}) }, { status: 400, headers: FAMILY_RATING_HEADERS });
  return Response.json({ error: "Family ratings are temporarily unavailable." }, { status: 500, headers: FAMILY_RATING_HEADERS });
}

export async function familyRatingActor(request: Request, mutation: boolean) {
  const accessRole = await role(request);
  if (!accessRole) throw new FamilyRatingAccessError(401);
  if (mutation && accessRole !== "editor") throw new FamilyRatingAccessError(403);
  return { role: accessRole } as const;
}
