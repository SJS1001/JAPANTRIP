import assert from "node:assert/strict";
import test from "node:test";

import { projectKidDay } from "../lib/kid-day.ts";

test("projects today's agenda into viewer-safe Now, Next, and Later sections without changing the source", () => {
  const items = [
    {
      id: "hotel",
      date: "2026-08-06",
      time: "Check-in",
      category: "hotel",
      title: "Tokyo Stay",
      location: "Shiomi, Tokyo",
      notes: "Private parent note",
      confirmation: "SECRET-123",
      cost: "¥99,999",
    },
    {
      id: "morning",
      date: "2026-08-07",
      time: "10:00–10:45",
      category: "attraction",
      title: "Temple visit",
      location: "Asakusa",
      notes: "Private timing contingency",
    },
    {
      id: "next",
      date: "2026-08-07",
      time: "11:15",
      category: "transport",
      title: "Subway to Ueno",
      location: "Asakusa Station",
      fareDetails: "Private fare rules",
    },
    {
      id: "later",
      date: "2026-08-07",
      time: "15:00",
      category: "attraction",
      title: "Arcade",
      location: "Akihabara",
      confirmation: "PRIVATE",
    },
  ];
  const before = structuredClone(items);

  const day = projectKidDay(items, {
    selectedDate: "2026-08-07",
    now: new Date("2026-08-07T01:30:00.000Z"),
  });

  assert.equal(day.date, "2026-08-07");
  assert.equal(day.grouping, "current");
  assert.deepEqual(day.sections.map((section) => [section.label, section.items.map((item) => item.id)]), [
    ["Now", ["morning"]],
    ["Next", ["next"]],
    ["Later", ["later"]],
  ]);
  assert.deepEqual(day.currentLocation, {
    itemId: "morning",
    name: "Asakusa",
    status: "planned",
  });
  assert.deepEqual(day.hotel, {
    itemId: "hotel",
    name: "Tokyo Stay",
    location: "Shiomi, Tokyo",
    directionsQuery: "Tokyo Stay, Shiomi, Tokyo",
  });

  const visible = JSON.stringify(day);
  assert.doesNotMatch(visible, /SECRET|Private|¥99,999|fare rules/);
  assert.deepEqual(items, before);
});

test("uses Japan's date boundary and groups another selected day by useful day parts", () => {
  const items = [
    { id: "breakfast", date: "2026-08-06", time: "08:00", category: "meal", title: "Breakfast" },
    { id: "museum", date: "2026-08-06", time: "13:15", category: "attraction", title: "Museum" },
    { id: "dinner", date: "2026-08-06", time: "18:30", category: "meal", title: "Dinner" },
    { id: "hotel", date: "2026-08-06", time: "Check-in", category: "hotel", title: "Tokyo Stay" },
    { id: "midnight", date: "2026-08-07", time: "00:10", category: "transport", title: "Late train" },
  ];

  const selectedDay = projectKidDay(items, {
    selectedDate: "2026-08-06",
    // It is still August 6 in Toronto, but already August 7 in Japan.
    now: new Date("2026-08-06T15:05:00.000Z"),
  });

  assert.equal(selectedDay.grouping, "day-parts");
  assert.deepEqual(selectedDay.sections.map((section) => [section.label, section.items.map((item) => item.id)]), [
    ["Morning", ["breakfast"]],
    ["Afternoon", ["museum", "hotel"]],
    ["Evening", ["dinner"]],
  ]);

  const japanToday = projectKidDay(items, {
    now: new Date("2026-08-06T15:05:00.000Z"),
  });
  assert.equal(japanToday.date, "2026-08-07");
  assert.equal(japanToday.grouping, "current");
});

test("returns neutral fallbacks when a day, location, or hotel address is missing", () => {
  const day = projectKidDay([
    { id: "hotel", date: "2026-08-06", time: "Check-in", category: "hotel", title: "Tokyo Stay" },
  ], {
    selectedDate: "2026-08-08",
    now: new Date("2026-08-07T00:00:00.000Z"),
  });

  assert.equal(day.emptyMessage, "Free time — nothing else planned yet.");
  assert.ok(day.sections.every((section) => section.items.length === 0));
  assert.equal(day.currentLocation, null);
  assert.deepEqual(day.hotel, {
    itemId: "hotel",
    name: "Tokyo Stay",
    directionsQuery: "Tokyo Stay",
  });

  const noHotel = projectKidDay([], {
    selectedDate: "2026-08-05",
    now: new Date("2026-08-04T00:00:00.000Z"),
  });
  assert.equal(noHotel.hotel, null);
});

test("adds only explicitly approved hotel safety details to the viewer model", () => {
  const day = projectKidDay([
    {
      id: "hotel",
      date: "2026-08-06",
      category: "hotel",
      title: "Tokyo Stay",
      location: "Shiomi, Tokyo",
      notes: "Unapproved private hotel note",
      address: "This unapproved address must not leak",
    },
  ], {
    selectedDate: "2026-08-07",
    now: new Date("2026-08-05T00:00:00.000Z"),
    hotelSafety: {
      hotel: {
        address: "2-8-16 Shiomi, Koto City",
        nearestStation: "Shiomi Station",
        meetupNote: "Meet by the front desk.",
      },
    },
  });

  assert.deepEqual(day.hotel, {
    itemId: "hotel",
    name: "Tokyo Stay",
    location: "Shiomi, Tokyo",
    address: "2-8-16 Shiomi, Koto City",
    nearestStation: "Shiomi Station",
    meetupNote: "Meet by the front desk.",
    directionsQuery: "Tokyo Stay, 2-8-16 Shiomi, Koto City",
  });
  assert.doesNotMatch(JSON.stringify(day), /Unapproved|must not leak/);
});

test("derives planned location from travel activities rather than ticket or note metadata", () => {
  const day = projectKidDay([
    {
      id: "activity",
      date: "2026-08-07",
      time: "10:00",
      category: "attraction",
      title: "Temple visit",
      location: "Asakusa",
    },
    {
      id: "admin",
      date: "2026-08-07",
      time: "10:15",
      category: "ticket",
      title: "Check train booking",
      location: "SmartEX account",
    },
  ], {
    now: new Date("2026-08-07T01:30:00.000Z"),
  });

  assert.deepEqual(day.currentLocation, {
    itemId: "activity",
    name: "Asakusa",
    status: "planned",
  });
});
