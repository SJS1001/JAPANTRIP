import assert from "node:assert/strict";
import test from "node:test";

import {
  emergencyView,
  officialEmergencyDirectory,
} from "../lib/emergency.ts";

test("locked emergency view exposes verified official help without family data", () => {
  const view = emergencyView({ authorized: false });

  assert.deepEqual(
    view.official.slice(0, 5).map((entry) => [entry.label, entry.number]),
    [
      ["Police", "110"],
      ["Ambulance or fire", "119"],
      ["Coast Guard", "118"],
      ["Japan Visitor Hotline", "050-3816-2787"],
      ["Canada 24/7 consular emergency", "+1-613-996-8885"],
    ],
  );
  assert.equal(view.family, null);
  assert.ok(view.official.every((entry) => entry.verifiedAt === "2026-08-04"));
});

test("authorized emergency view may include protected family context", () => {
  const family = {
    hotel: { name: "Example Hotel", address: "1 Example Street", phone: "+81-6-0000-0000" },
    contacts: [{ id: "parent", name: "Parent", relationship: "Parent", phone: "+1-555-0100" }],
    instructions: "Meet in the hotel lobby.",
  };

  assert.deepEqual(emergencyView({ authorized: true, family }).family, family);
  assert.equal(emergencyView({ authorized: false, family }).family, null);
});

test("emergency directory separates call actions from live internet links", () => {
  assert.ok(officialEmergencyDirectory.calls.every((entry) => entry.href.startsWith("tel:")));
  assert.ok(officialEmergencyDirectory.liveLinks.every((entry) => entry.internetRequired));
  assert.ok(officialEmergencyDirectory.liveLinks.some((entry) => entry.publisher === "JMA"));
});
