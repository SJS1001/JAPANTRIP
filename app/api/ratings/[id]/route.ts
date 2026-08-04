import { familyRatingsModule } from "@/db/family-rating-store";
import { FamilyRatingValidationError } from "@/lib/family-ratings";
import { FAMILY_RATING_HEADERS, familyRatingActor, familyRatingError } from "../shared";

type RouteContext = { params: Promise<{ id: string }> };
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actor = await familyRatingActor(request, true);
    const id = (await context.params).id?.trim() ?? "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new FamilyRatingValidationError("id", "The rating ID is not valid.");
    await familyRatingsModule().remove(actor, id);
    return Response.json({ ok: true }, { headers: FAMILY_RATING_HEADERS });
  } catch (error) { return familyRatingError(error); }
}
