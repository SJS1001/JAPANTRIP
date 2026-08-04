import assert from "node:assert/strict";
import test from "node:test";

import {
  answerOfflineTripQuestion,
  askTripQuestion,
  classifyTripQuestionIntent,
  projectTripQuestionContext,
} from "../lib/ai/trip-assistant.ts";

test("viewer question context excludes editor-only trip fields", () => {
  const context = projectTripQuestionContext({
    role: "viewer",
    now: new Date("2026-08-10T01:00:00.000Z"),
    items: [{
      id: "osaka-hotel",
      date: "2026-08-10",
      time: "15:00",
      category: "hotel",
      title: "Osaka hotel",
      location: "Namba",
      notes: "Parent-only booking notes",
      cost: "¥100,000",
      confirmation: "SECRET-123",
      viewerSummary: "Our hotel in Namba.",
      attachments: [
        { id: "ticket", label: "Hotel card", viewerVisible: true, text: "Hotel address card" },
        { id: "invoice", label: "Invoice", viewerVisible: false, text: "Private invoice" },
      ],
    }],
  });

  assert.deepEqual(context.items, [{
    id: "osaka-hotel",
    date: "2026-08-10",
    time: "15:00",
    category: "hotel",
    title: "Osaka hotel",
    location: "Namba",
    summary: "Our hotel in Namba.",
    attachments: [{ id: "ticket", label: "Hotel card", text: "Hotel address card" }],
  }]);
  assert.doesNotMatch(JSON.stringify(context), /SECRET|100,000|Parent-only|invoice/i);
});

test("offline next question is answered from the Japan-time agenda with a citation", () => {
  const context = projectTripQuestionContext({
    role: "viewer",
    now: new Date("2026-08-10T01:00:00.000Z"),
    items: [
      { id: "breakfast", date: "2026-08-10", time: "09:00–09:45", category: "meal", title: "Breakfast" },
      { id: "castle", date: "2026-08-10", time: "11:00–13:00", category: "attraction", title: "Osaka Castle", location: "Osaka Castle Park" },
    ],
  });

  assert.deepEqual(answerOfflineTripQuestion("What are we doing next?", context), {
    text: "Next: Osaka Castle at 11:00–13:00 · Osaka Castle Park.",
    basis: "trip-plan",
    citations: [{ kind: "event", id: "castle", label: "Osaka Castle" }],
    showEmergency: false,
  });
});

test("emergency intent surfaces deterministic emergency actions", () => {
  const context = projectTripQuestionContext({ role: "viewer", now: new Date("2026-08-10T01:00:00Z"), items: [] });
  const answer = answerOfflineTripQuestion("We need an ambulance right now", context);

  assert.equal(answer.showEmergency, true);
  assert.match(answer.text, /Emergency page/i);
  assert.deepEqual(answer.citations, []);
});

test("change requests require an editor proposal and never become direct writes", () => {
  assert.equal(classifyTripQuestionIntent("Add lunch tomorrow", "viewer"), "change-denied");
  assert.equal(classifyTripQuestionIntent("Add lunch tomorrow", "editor"), "proposal-required");
  assert.equal(classifyTripQuestionIntent("What is for lunch tomorrow?", "viewer"), "question");
});

test("online answers expose only validated citations from the supplied trip context", async () => {
  const context = projectTripQuestionContext({
    role: "viewer",
    now: new Date("2026-08-10T01:00:00Z"),
    items: [{ id: "castle", date: "2026-08-10", time: "11:00", category: "attraction", title: "Osaka Castle" }],
  });
  const provider = {
    async answer() {
      return { text: "Osaka Castle is next.", basis: "trip-plan", citationIds: ["castle"] };
    },
  };

  assert.deepEqual(await askTripQuestion("What is next?", context, provider), {
    text: "Osaka Castle is next.",
    basis: "trip-plan",
    citations: [{ kind: "event", id: "castle", label: "Osaka Castle" }],
    showEmergency: false,
  });
});

test("an answer with only fabricated citations is replaced by a safe abstention", async () => {
  const context = projectTripQuestionContext({ role: "viewer", now: new Date("2026-08-10T01:00:00Z"), items: [] });
  const provider = {
    async answer() {
      return { text: "Your secret booking is ABC.", basis: "trip-plan", citationIds: ["not-in-context"] };
    },
  };

  const answer = await askTripQuestion("What is my booking code?", context, provider);
  assert.equal(answer.text, "I couldn’t verify that answer from the trip information available to you.");
  assert.deepEqual(answer.citations, []);
});
