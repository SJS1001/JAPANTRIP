export type AgendaPdfBackupItem = {
  id: string;
  date: string;
  time?: string;
  category: string;
  title: string;
  location?: string;
  notes?: string;
  ticketStatus?: string;
  confirmed?: boolean;
  confirmation?: string;
  cost?: string;
  link?: string;
  lat?: number | string;
  lng?: number | string;
  quantity?: string;
  fareDetails?: string;
  order?: number;
};

export type AgendaPdfBackupInput = {
  items: readonly AgendaPdfBackupItem[];
  version: number;
  generatedAt?: Date;
};

function printableText(value: unknown) {
  return String(value ?? "")
    .replace(/[\u2010-\u2015]/g, "-")
    .trim();
}

function escapeHtml(value: unknown) {
  return printableText(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] as string);
}

function dateLabel(date: string) {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.valueOf())) return printableText(date);
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function ticketLabel(status?: string) {
  if (status === "booked") return "Booked";
  if (status === "to-buy") return "To buy or confirm";
  if (status === "not-needed") return "No advance ticket needed";
  return status ? printableText(status) : "";
}

function safeWebUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function detail(label: string, value: unknown) {
  const text = printableText(value);
  return text ? `<div class="detail"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(text)}</dd></div>` : "";
}

function renderItem(item: AgendaPdfBackupItem) {
  const confirmation = item.confirmation?.trim();
  const url = safeWebUrl(item.link);
  const coordinates = printableText(item.lat) && printableText(item.lng)
    ? `${printableText(item.lat)}, ${printableText(item.lng)}`
    : "";
  const ticket = ticketLabel(item.ticketStatus);
  const status = [ticket, item.confirmed === true ? "Confirmed" : item.confirmed === false ? "Not confirmed" : ""]
    .filter(Boolean)
    .join(" - ");

  return `<article class="agenda-item">
    <div class="item-time">${escapeHtml(item.time || "Flexible")}</div>
    <div class="item-body">
      <div class="item-heading"><span>${escapeHtml(item.category)}</span><small>ID ${escapeHtml(item.id)}</small></div>
      <h3>${escapeHtml(item.title)}</h3>
      ${item.location ? `<p class="location">${escapeHtml(item.location)}</p>` : ""}
      ${item.notes ? `<p class="notes">${escapeHtml(item.notes)}</p>` : ""}
      <dl>
        ${detail("Status", status)}
        ${detail("Confirmation", confirmation)}
        ${detail("Quantity", item.quantity)}
        ${detail("Cost", item.cost)}
        ${detail("Fare / booking details", item.fareDetails)}
        ${detail("Map coordinates", coordinates)}
      </dl>
      ${url ? `<p class="reference"><strong>Reference:</strong> <a href="${escapeHtml(url)}">${escapeHtml(item.link)}</a></p>` : ""}
    </div>
  </article>`;
}

export function buildAgendaPdfBackupHtml(input: AgendaPdfBackupInput) {
  const generatedAt = input.generatedAt ?? new Date();
  const items = [...input.items].sort((left, right) =>
    left.date.localeCompare(right.date) ||
    Number(left.order ?? Number.MAX_SAFE_INTEGER) - Number(right.order ?? Number.MAX_SAFE_INTEGER) ||
    printableText(left.time).localeCompare(printableText(right.time)) ||
    left.title.localeCompare(right.title),
  );
  const byDate = new Map<string, AgendaPdfBackupItem[]>();
  for (const item of items) {
    const day = byDate.get(item.date) ?? [];
    day.push(item);
    byDate.set(item.date, day);
  }
  const daySections = [...byDate.entries()].map(([date, dayItems]) => `
    <section class="agenda-day">
      <header class="day-heading"><span>${escapeHtml(date)}</span><h2>${escapeHtml(dateLabel(date))}</h2></header>
      ${dayItems.map(renderItem).join("\n")}
    </section>`).join("\n");
  const itemWord = items.length === 1 ? "item" : "items";
  const dayWord = byDate.size === 1 ? "day" : "days";
  const generatedLabel = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(generatedAt);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Japan Family Trip - Full Agenda Backup v${escapeHtml(input.version)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 13mm 17mm;
      @bottom-left { content: "Japan Family Trip - private agenda backup"; color: #666; font-size: 8pt; }
      @bottom-right { content: "Page " counter(page) " of " counter(pages); color: #666; font-size: 8pt; }
    }
    * { box-sizing: border-box; }
    body { margin: 0; color: #1f2926; background: #f3f0e8; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 10.5pt; line-height: 1.42; }
    main { width: min(900px, 100%); margin: 0 auto; padding: 28px; background: #fff; }
    .cover { margin-bottom: 24px; padding: 22px; border-top: 6px solid #b7412d; background: #f7f3e9; }
    .eyebrow, .item-heading span { color: #8c3324; font-size: 8pt; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    h1 { margin: 5px 0 8px; font-family: Georgia, serif; font-size: 27pt; font-weight: 500; line-height: 1.08; }
    .cover p { margin: 4px 0; }
    .privacy { color: #5c625f; font-size: 8.5pt; }
    .screen-only { margin: 0 0 20px; padding: 12px 14px; border: 1px solid #8ba79d; background: #edf5f1; }
    .agenda-day { margin: 0 0 22px; break-before: auto; }
    .day-heading { margin: 0 0 9px; padding: 8px 0; border-bottom: 2px solid #263c35; }
    .day-heading span { color: #66706c; font-size: 8pt; font-weight: 800; letter-spacing: .08em; }
    .day-heading h2 { margin: 2px 0 0; font-family: Georgia, serif; font-size: 18pt; font-weight: 500; }
    .agenda-item { display: grid; grid-template-columns: 31mm 1fr; gap: 12px; margin: 0; padding: 11px 0; border-bottom: 1px solid #d8d8d2; break-inside: avoid; }
    .item-time { padding-top: 2px; color: #2f4a41; font-weight: 800; }
    .item-heading { display: flex; justify-content: space-between; gap: 12px; }
    .item-heading small { color: #7a807d; font-size: 7.5pt; }
    h3 { margin: 3px 0; font-family: Georgia, serif; font-size: 13.5pt; font-weight: 600; }
    .location { margin: 2px 0; color: #35584d; font-weight: 700; }
    .notes { margin: 7px 0; white-space: pre-wrap; }
    dl { display: grid; gap: 3px; margin: 7px 0 0; }
    .detail { display: grid; grid-template-columns: 35mm 1fr; gap: 8px; }
    dt { color: #686e6b; font-size: 8.5pt; font-weight: 800; }
    dd { margin: 0; }
    .reference { margin: 7px 0 0; font-size: 8.5pt; overflow-wrap: anywhere; }
    a { color: #234f7a; }
    @media print {
      body { background: #fff; }
      main { width: auto; padding: 0; }
      .screen-only { display: none; }
      a { color: #1f2926; text-decoration: none; }
    }
    @media (max-width: 620px) {
      main { padding: 16px; }
      .agenda-item { grid-template-columns: 1fr; gap: 3px; }
      .detail { grid-template-columns: 1fr; gap: 0; }
    }
  </style>
</head>
<body>
  <main>
    <aside class="screen-only"><strong>PDF backup ready.</strong> In the print dialog, choose <b>Save as PDF</b>. Nothing is uploaded.</aside>
    <header class="cover">
      <div class="eyebrow">Private family itinerary</div>
      <h1>Japan Family Trip</h1>
      <p><strong>Full agenda backup</strong> - ${items.length} agenda ${itemWord} across ${byDate.size} ${dayWord}</p>
      <p>Shared agenda version ${escapeHtml(input.version)} - generated ${escapeHtml(generatedLabel)}</p>
      <p class="privacy">Human-readable backup. Keep it private. Use the JSON backup in Settings if you need to restore data into the app.</p>
    </header>
    ${daySections || "<p>No agenda items were available.</p>"}
  </main>
  <script>window.addEventListener("load", () => setTimeout(() => window.print(), 150));</script>
</body>
</html>`;
}

export function openAgendaPdfBackup(input: AgendaPdfBackupInput) {
  const backupWindow = window.open("", "_blank");
  if (!backupWindow) throw new Error("The browser blocked the PDF window. Allow pop-ups and try again.");
  backupWindow.opener = null;
  backupWindow.document.open();
  backupWindow.document.write(buildAgendaPdfBackupHtml(input));
  backupWindow.document.close();
}
