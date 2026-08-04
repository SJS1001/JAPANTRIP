import assert from "node:assert/strict";
import test from "node:test";

import { buildAgendaPdfBackupHtml } from "../lib/agenda-pdf-backup.ts";

test("settings PDF backup renders the complete current agenda as safe printable HTML", () => {
  const html = buildAgendaPdfBackupHtml({
    version: 23,
    generatedAt: new Date("2026-08-04T14:30:00.000Z"),
    items: [
      {
        id: "later",
        date: "2026-08-07",
        time: "10:00",
        category: "attraction",
        title: "TeamLab <Borderless>",
        location: "Azabudai Hills",
        notes: "Bring the QR code & arrive early.",
        ticketStatus: "booked",
        confirmed: true,
        confirmation: "AB-123",
        cost: "¥12,000",
        quantity: "4 tickets",
        fareDetails: "Timed entry",
        link: "https://example.test/ticket?a=1&b=2",
        lat: 35.6605,
        lng: 139.7292,
      },
      {
        id: "first",
        date: "2026-08-06",
        time: "15:35",
        category: "transport",
        title: "Airport arrival",
        location: "Narita Airport",
        ticketStatus: "not-needed",
      },
    ],
  });

  assert.match(html, /<!doctype html>/i);
  assert.match(html, /Japan Family Trip - Full Agenda Backup/);
  assert.match(html, /Shared agenda version 23/);
  assert.match(html, /2 agenda items across 2 days/);
  assert.ok(html.indexOf("Airport arrival") < html.indexOf("TeamLab"));
  assert.match(html, /TeamLab &lt;Borderless&gt;/);
  assert.match(html, /Bring the QR code &amp; arrive early\./);
  assert.match(html, /AB-123/);
  assert.match(html, /4 tickets/);
  assert.match(html, /Timed entry/);
  assert.match(html, /35\.6605, 139\.7292/);
  assert.match(html, /https:\/\/example\.test\/ticket\?a=1&amp;b=2/);
  assert.match(html, /@page/);
  assert.match(html, /counter\(page\).*counter\(pages\)/s);
  assert.match(html, /window\.print\(\)/);
  assert.doesNotMatch(html, /TeamLab <Borderless>/);
});
