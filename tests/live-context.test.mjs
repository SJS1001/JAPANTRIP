import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyWbgt,
  nearestTripCity,
  parseJmaAtomFeed,
  parseWbgtForecast,
  summarizeHeatAlert,
  summarizeJmaSafety,
} from "../lib/live-context.ts";

const atom = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" lang="ja">
  <updated>2026-08-04T23:43:22+09:00</updated>
  <entry>
    <title>気象特別警報・警報・注意報</title>
    <id>https://www.data.jma.go.jp/developer/xml/data/osaka.xml</id>
    <updated>2026-08-04T14:40:00Z</updated>
    <link type="application/xml" href="https://www.data.jma.go.jp/developer/xml/data/osaka.xml"/>
    <content type="text">【大阪府気象警報・注意報】大阪府では、雷に注意してください。</content>
  </entry>
  <entry>
    <title>気象特別警報・警報・注意報</title>
    <id>https://www.data.jma.go.jp/developer/xml/data/tokyo.xml</id>
    <updated>2026-08-04T14:41:00Z</updated>
    <content type="text">【東京都気象警報・注意報】警報を解除します。</content>
  </entry>
  <entry>
    <title>熱中症警戒アラート</title>
    <id>https://www.data.jma.go.jp/developer/xml/data/osaka-heat.xml</id>
    <updated>2026-08-04T08:00:00Z</updated>
    <content type="text">【大阪府熱中症警戒アラート】大阪府では、熱中症の危険性が極めて高くなると予測されます。</content>
  </entry>
</feed>`;

test("nearestTripCity chooses a fixed itinerary city without retaining coordinates", () => {
  const city = nearestTripCity(34.69, 135.50);
  assert.deepEqual(city, { id: "osaka", name: "Osaka" });
  assert.deepEqual(Object.keys(city), ["id", "name"]);
});

test("JMA Atom parsing produces safe normalized entries and local warning state", () => {
  const parsed = parseJmaAtomFeed(atom);
  assert.equal(parsed.updatedAt, "2026-08-04T14:43:22.000Z");
  assert.equal(parsed.entries.length, 3);
  assert.deepEqual(summarizeJmaSafety(parsed, "osaka"), {
    level: "advisory",
    title: "Weather advisory for Osaka",
    summary: "【大阪府気象警報・注意報】大阪府では、雷に注意してください。",
    updatedAt: "2026-08-04T14:40:00.000Z",
    sourceUrl: "https://www.data.jma.go.jp/developer/xml/data/osaka.xml",
  });
  assert.equal(summarizeJmaSafety(parsed, "tokyo").level, "clear");
  assert.equal(summarizeJmaSafety(parsed, "kyoto").level, "unknown");
  assert.deepEqual(summarizeHeatAlert(parsed, "osaka"), {
    level: "warning",
    title: "Heat Stroke Alert for Osaka",
    summary: "【大阪府熱中症警戒アラート】大阪府では、熱中症の危険性が極めて高くなると予測されます。",
    updatedAt: "2026-08-04T08:00:00.000Z",
    sourceUrl: "https://www.data.jma.go.jp/developer/xml/data/osaka-heat.xml",
  });
});

test("official WBGT forecast selects the next Japan-time value and classifies risk", () => {
  const csv = [
    ",,2026080512,2026080515,2026080518",
    "62078,2026/08/05 10:25, 290, 320, 280",
  ].join("\n");
  const forecast = parseWbgtForecast(csv, "osaka", new Date("2026-08-05T03:30:00Z"));
  assert.deepEqual(forecast, {
    value: 32,
    risk: "danger",
    validAt: "2026-08-05T06:00:00.000Z",
    updatedAt: "2026-08-05T01:25:00.000Z",
    station: "Osaka",
    kind: "forecast",
    sourceUrl: "https://www.wbgt.env.go.jp/en/",
  });
  assert.equal(classifyWbgt(27.9), "warning");
  assert.equal(classifyWbgt(28), "severe");
});

test("official WBGT parsing skips blank forecast cells instead of reporting a false low risk", () => {
  const csv = [
    ",,2026080512,2026080515",
    "62078,2026/08/05 10:25, , 320",
  ].join("\n");
  const forecast = parseWbgtForecast(csv, "osaka", new Date("2026-08-05T02:00:00Z"));
  assert.equal(forecast.value, 32);
  assert.equal(forecast.validAt, "2026-08-05T06:00:00.000Z");
});

test("malformed upstream data fails closed instead of inventing safety information", () => {
  assert.throws(() => parseJmaAtomFeed("<html>blocked</html>"), /JMA feed/i);
  assert.throws(() => parseWbgtForecast("not,csv", "osaka"), /WBGT/i);
});
