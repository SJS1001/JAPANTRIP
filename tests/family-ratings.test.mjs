import assert from "node:assert/strict";
import test from "node:test";

import {
  FamilyRatingAccessError,
  FamilyRatingValidationError,
  FamilyRatingsModule,
  MemoryFamilyRatingStore,
} from "../lib/family-ratings.ts";

const editor = { role: "editor", id: "parent" };
const viewer = { role: "viewer", id: "kid" };

function fixture() {
  const ids = ["rating-1", "rating-2"];
  return new FamilyRatingsModule({
    store: new MemoryFamilyRatingStore(),
    randomId: () => ids.shift() ?? crypto.randomUUID(),
    now: () => new Date("2026-08-04T12:00:00.000Z"),
  });
}

test("editors rate for named family members while viewers get read-only summaries", async () => {
  const ratings = fixture();
  await ratings.upsert(editor, {
    targetId: "osaka-castle",
    targetKind: "attraction",
    memberName: "Maya",
    stars: 5,
    comment: "Best view of the trip.",
  });
  await ratings.upsert(editor, {
    targetId: "osaka-castle",
    targetKind: "attraction",
    memberName: "Leo",
    stars: 3,
    comment: "Too many stairs.",
  });

  const result = await ratings.list(viewer, { targetId: "osaka-castle" });
  assert.equal(result.summary.average, 4);
  assert.equal(result.summary.count, 2);
  assert.deepEqual(result.ratings.map((rating) => rating.memberName), ["Leo", "Maya"]);
  await assert.rejects(
    ratings.upsert(viewer, {
      targetId: "osaka-castle",
      targetKind: "attraction",
      memberName: "Kid",
      stars: 5,
    }),
    (error) => error instanceof FamilyRatingAccessError && error.status === 403,
  );
});

test("a member's later rating updates rather than double-counting", async () => {
  const ratings = fixture();
  const first = await ratings.upsert(editor, {
    targetId: "namba-hotel",
    targetKind: "hotel",
    memberName: "Maya",
    stars: 2,
  });
  const updated = await ratings.upsert(editor, {
    targetId: "namba-hotel",
    targetKind: "hotel",
    memberName: "  maya ",
    stars: 4,
    comment: "Quiet after all.",
  });
  assert.equal(updated.id, first.id);
  const result = await ratings.list(editor, { targetId: "namba-hotel" });
  assert.equal(result.summary.count, 1);
  assert.equal(result.summary.average, 4);
  assert.equal(result.ratings[0].comment, "Quiet after all.");
});

test("ratings validate target type, star range, names, comments and unknown fields", async () => {
  const ratings = fixture();
  for (const [input, field] of [
    [{ targetId: "place", targetKind: "meal", memberName: "Maya", stars: 5 }, "targetKind"],
    [{ targetId: "place", targetKind: "hotel", memberName: "Maya", stars: 0 }, "stars"],
    [{ targetId: "place", targetKind: "hotel", memberName: "", stars: 4 }, "memberName"],
    [{ targetId: "place", targetKind: "hotel", memberName: "Maya", stars: 4, comment: "x".repeat(501) }, "comment"],
    [{ targetId: "place", targetKind: "hotel", memberName: "Maya", stars: 4, agendaPatch: {} }, "agendaPatch"],
  ]) {
    await assert.rejects(
      ratings.upsert(editor, input),
      (error) => error instanceof FamilyRatingValidationError && error.field === field,
    );
  }
});

test("anonymous family rating reads are denied and editor deletion is soft", async () => {
  const ratings = fixture();
  await assert.rejects(ratings.list(null), (error) => error.status === 401);
  const created = await ratings.upsert(editor, {
    targetId: "osaka-castle",
    targetKind: "attraction",
    memberName: "Maya",
    stars: 5,
  });
  await ratings.remove(editor, created.id);
  assert.deepEqual((await ratings.list(viewer)).ratings, []);
});
