import { env } from "cloudflare:workers";
import cloudBaseline from "../data/cloud-baseline.json";
import mergeAudit from "../data/merge-audit.json";
import seedItems from "../data/seed.json";

type TripRecord = Record<string, unknown> & { id: string };
const AUDITED_RESTORE_ID = "post-1am-open-map-restore-2026-07-22-v3-images";
const TOKYO_TEAMLAB_REPLAN_ID = "tokyo-teamlab-replan-2026-07-27-v1";
const TOKYO_HEAT_ROUTE_REPLAN_ID = "tokyo-heat-route-replan-2026-07-27-v1";
const FINAL_AUDIT_HEAT_REPLAN_ID = "final-audit-heat-replan-2026-07-27-v1";
const RESTAURANT_CLOSURE_REPLAN_ID = "restaurant-closure-replan-2026-07-27-v1";
const VERIFIED_TRANSPORT_PLAN_ID = "verified-transport-plan-2026-07-27-v1";
const TOKYO_TEAMLAB_REPLAN_ITEMS = new Set([
  "t09start", "m09a", "a12", "a10", "t09a", "a9", "m09c", "t09b",
  "a09c", "m09b", "a09d", "ticket-tokyo-tower", "tk2", "a09b", "tk3",
  "t21borderless", "m21a", "a58", "a59", "tok-imperial", "a59b", "m21b",
]);
const TOKYO_HEAT_ROUTE_REPLAN_ITEMS = new Set([
  "a1b", "a4", "m07a", "a1c", "a1d", "a2", "tok-ueno-park", "tok-ameyoko", "a55", "a61",
  "m08b", "m08c", "tok-shibuya-dinner", "a8", "a8b",
  "a51", "a51b", "a52",
  "tok-west-sunshine", "tok-west-lunch", "tok-west-to-nakano", "tok-west-nakano", "tok-west-to-koenji", "tok-west-koenji",
  "a59", "tok-imperial",
]);
const TOKYO_HEAT_ROUTE_REMOVED_ITEMS = new Set(["t20start", "m20", "m20b", "a59b"]);
const FINAL_AUDIT_HEAT_REPLAN_ITEMS = new Set([
  "a1b", "m07a", "a1c", "a1d", "m07lunch", "a7", "tk1", "t21borderless", "a51", "tk-gyoen",
  "pass-hakone", "t10c", "a16", "tk-oam",
  "a17", "a18", "m11", "a19", "a20", "a21", "m11b", "tk4",
  "a23", "a24b", "a25", "a29", "m13a", "a30",
  "t5b", "hr-hypo", "hr-lunch", "hr-hondori", "a33",
  "a35", "t15walk", "miy-cool", "miy-tide", "miy-senjokaku", "miy-food", "a36", "t6c", "tk-miyajima-ropeway",
  "a37", "tk-nijo", "m17b", "a42", "a43", "m17c", "t17return",
  "a47", "m18", "t18b", "a48", "t18c", "a49", "m18b",
]);
const FINAL_AUDIT_HEAT_REMOVED_ITEMS = new Set([
  "a4", "tk8", "hr-bags", "m14a", "m14b", "m15b", "a36b", "miy-return", "m15c",
]);
const VERIFIED_TRANSPORT_ITEMS = new Set([
  "pass-ic", "t1", "tkrail", "t2", "t3", "t10b", "pass-hakone", "t4", "t4b",
  "t5", "pass-kansai", "t6b", "t6c", "t7", "t7b", "t8", "t9",
]);

type D1Result<T = unknown> = {
  results?: T[];
  success: boolean;
  meta?: { changes?: number };
};

type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  first: <T = unknown>() => Promise<T | null>;
  run: <T = unknown>() => Promise<D1Result<T>>;
  all: <T = unknown>() => Promise<D1Result<T>>;
};

type D1Database = {
  prepare: (query: string) => D1Statement;
  batch: (statements: D1Statement[]) => Promise<D1Result[]>;
};

function database() {
  const binding = (env as unknown as { DB?: D1Database }).DB;
  if (!binding) throw new Error("The shared trip database is unavailable.");
  return binding;
}

let schemaReady: Promise<void> | null = null;

async function initializeTripSchema() {
  const db = database();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS trip_state (
      id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_by TEXT NOT NULL DEFAULT 'Family',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS trip_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL,
      action TEXT NOT NULL,
      changed_by TEXT NOT NULL DEFAULT 'Family',
      changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS trip_history_version_idx ON trip_history(version)",
    ),
    db.prepare(`CREATE TABLE IF NOT EXISTS trip_migrations (
      id TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS geocode_cache (
      query TEXT PRIMARY KEY NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS geocode_rate_limit (
      id TEXT PRIMARY KEY NOT NULL,
      last_request_at INTEGER NOT NULL DEFAULT 0
    )`),
  ]);
}

export async function ensureTripSchema() {
  schemaReady ??= initializeTripSchema();
  try {
    await schemaReady;
  } catch (error) {
    schemaReady = null;
    throw error;
  }
}

type GeocodeRow = {
  lat: number;
  lng: number;
  display_name: string;
};

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

export async function geocodePlace(rawQuery: string) {
  await ensureTripSchema();
  const query = rawQuery.trim().replace(/\s+/g, " ").slice(0, 240);
  if (query.length < 2) return { found: false as const };

  const db = database();
  const cached = await db
    .prepare(
      "SELECT lat, lng, display_name FROM geocode_cache WHERE query = ?",
    )
    .bind(query.toLocaleLowerCase("en"))
    .first<GeocodeRow>();
  if (cached) {
    return {
      found: true as const,
      cached: true,
      lat: Number(cached.lat),
      lng: Number(cached.lng),
      displayName: cached.display_name,
    };
  }

  await db
    .prepare(
      "INSERT OR IGNORE INTO geocode_rate_limit (id, last_request_at) VALUES (?, 0)",
    )
    .bind("nominatim")
    .run();
  const claim = await db
    .prepare(
      `UPDATE geocode_rate_limit
       SET last_request_at = CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
       WHERE id = ?
         AND last_request_at <= CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) - 1100`,
    )
    .bind("nominatim")
    .run();
  if (!claim.meta?.changes) return { limited: true as const };

  const runtime = env as unknown as { GEOCODER_BASE_URL?: string };
  const endpoint = new URL(
    "/search",
    runtime.GEOCODER_BASE_URL || "https://nominatim.openstreetmap.org",
  );
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("limit", "1");
  endpoint.searchParams.set("countrycodes", "jp");
  endpoint.searchParams.set("accept-language", "en");

  const response = await fetch(endpoint, {
    headers: {
      accept: "application/json",
      referer: "https://smith-japan-family-trip-2026.djstif.chatgpt.site/",
      "user-agent":
        "JapanFamilyTripCalendar/1.0 (https://smith-japan-family-trip-2026.djstif.chatgpt.site/)",
    },
  });
  if (!response.ok) throw new Error("The map location service is temporarily unavailable.");

  const results = (await response.json()) as NominatimResult[];
  const first = results[0];
  const lat = Number(first?.lat);
  const lng = Number(first?.lon);
  if (!first || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { found: false as const };
  }

  const displayName = first.display_name?.slice(0, 500) || query;
  await db
    .prepare(
      "INSERT OR REPLACE INTO geocode_cache (query, lat, lng, display_name) VALUES (?, ?, ?, ?)",
    )
    .bind(query.toLocaleLowerCase("en"), lat, lng, displayName)
    .run();
  return { found: true as const, cached: false, lat, lng, displayName };
}

type StateRow = {
  payload: string;
  version: number;
  updated_by: string;
  updated_at: string;
};

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function mergeAuditedItems(currentItems: TripRecord[]) {
  const baseline = new Map(
    (cloudBaseline as TripRecord[]).map((item) => [item.id, item]),
  );
  const current = new Map(currentItems.map((item) => [item.id, item]));
  const aliases = mergeAudit.aliases as Record<string, string[]>;
  const excluded = new Set([
    ...Object.keys(aliases),
    ...Object.keys(mergeAudit.explicitlyExcluded),
  ]);

  const result = (seedItems as TripRecord[]).map((canonical) => {
    const live = current.get(canonical.id);
    if (!live) return canonical;
    const original = baseline.get(canonical.id);
    if (!original) return { ...canonical, ...live, id: canonical.id };

    const preserved = { ...canonical };
    for (const [key, value] of Object.entries(live)) {
      if (!sameValue(value, original[key])) preserved[key] = value;
    }
    return preserved;
  });

  // Preserve genuine family-created records that appeared after the deployed
  // baseline. Old duplicate IDs and the explicitly removed museum stay out.
  for (const item of currentItems) {
    if (
      !baseline.has(item.id) &&
      !result.some((candidate) => candidate.id === item.id) &&
      !excluded.has(item.id)
    ) {
      result.push(item);
    }
  }

  return result.sort((left, right) =>
    String(left.date ?? "").localeCompare(String(right.date ?? "")) ||
    String(left.time ?? "").localeCompare(String(right.time ?? "")) ||
    left.id.localeCompare(right.id),
  );
}

async function restoreAuditedBackups(row: StateRow) {
  const db = database();
  const applied = await db
    .prepare("SELECT id FROM trip_migrations WHERE id = ?")
    .bind(AUDITED_RESTORE_ID)
    .first<{ id: string }>();
  if (applied) return row;

  const currentItems = JSON.parse(row.payload) as TripRecord[];
  const mergedItems = mergeAuditedItems(currentItems);
  const nextVersion = row.version + 1;
  const update = await db
    .prepare(
      "UPDATE trip_state SET payload = ?, version = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ?",
    )
    .bind(
      JSON.stringify(mergedItems),
      nextVersion,
      "Trip recovery audit",
      "family-trip",
      row.version,
    )
    .run();

  if (update.meta?.changes) {
    await db.batch([
      db
        .prepare(
          "INSERT OR IGNORE INTO trip_migrations (id) VALUES (?)",
        )
        .bind(AUDITED_RESTORE_ID),
      db
        .prepare(
          "INSERT INTO trip_history (version, action, changed_by) VALUES (?, ?, ?)",
        )
        .bind(
          nextVersion,
          `Restored and reconciled all post-1 AM backups (${mergedItems.length} items)`,
          "Trip recovery audit",
        ),
    ]);
  }

  return (
    (await db
      .prepare(
        "SELECT payload, version, updated_by, updated_at FROM trip_state WHERE id = ?",
      )
      .bind("family-trip")
      .first<StateRow>()) ?? row
  );
}

async function applyTokyoTeamlabReplan(row: StateRow) {
  const db = database();
  const applied = await db
    .prepare("SELECT id FROM trip_migrations WHERE id = ?")
    .bind(TOKYO_TEAMLAB_REPLAN_ID)
    .first<{ id: string }>();
  if (applied) return row;

  const currentItems = JSON.parse(row.payload) as TripRecord[];
  const current = new Map(currentItems.map((item) => [item.id, item]));
  const canonical = new Map((seedItems as TripRecord[]).map((item) => [item.id, item]));
  const preservedBookingFields = ["ticketStatus", "confirmed", "confirmation", "cost", "quantity", "fareDetails"];

  for (const id of TOKYO_TEAMLAB_REPLAN_ITEMS) {
    const planned = canonical.get(id);
    if (!planned) continue;
    const live = current.get(id);
    if (!live) {
      current.set(id, planned);
      continue;
    }
    const merged: TripRecord = { ...live, ...planned, id };
    for (const field of preservedBookingFields) {
      if (live[field] !== undefined) merged[field] = live[field];
    }
    delete merged.order;
    current.set(id, merged);
  }

  // The two affected days must return to chronological sorting after this
  // planner-directed reflow, even if a previous drag operation stored order.
  for (const item of current.values()) {
    if (item.date === "2026-08-09" || item.date === "2026-08-21") delete item.order;
  }

  const replannedItems = [...current.values()];
  const nextVersion = row.version + 1;
  const update = await db
    .prepare(
      "UPDATE trip_state SET payload = ?, version = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ?",
    )
    .bind(
      JSON.stringify(replannedItems),
      nextVersion,
      "Trip planner",
      "family-trip",
      row.version,
    )
    .run();

  if (update.meta?.changes) {
    await db.batch([
      db.prepare("INSERT OR IGNORE INTO trip_migrations (id) VALUES (?)").bind(TOKYO_TEAMLAB_REPLAN_ID),
      db.prepare("INSERT INTO trip_history (version, action, changed_by) VALUES (?, ?, ?)")
        .bind(nextVersion, "Moved Borderless to Aug 21 and protected the Aug 9 Tokyo Tower sunset", "Trip planner"),
    ]);
  }

  return (
    (await db
      .prepare("SELECT payload, version, updated_by, updated_at FROM trip_state WHERE id = ?")
      .bind("family-trip")
      .first<StateRow>()) ?? row
  );
}

async function applyTokyoHeatRouteReplan(row: StateRow) {
  const db = database();
  const applied = await db
    .prepare("SELECT id FROM trip_migrations WHERE id = ?")
    .bind(TOKYO_HEAT_ROUTE_REPLAN_ID)
    .first<{ id: string }>();
  if (applied) return row;

  const currentItems = JSON.parse(row.payload) as TripRecord[];
  const current = new Map(currentItems.map((item) => [item.id, item]));
  const canonical = new Map((seedItems as TripRecord[]).map((item) => [item.id, item]));
  const preservedBookingFields = ["ticketStatus", "confirmed", "confirmation", "cost", "quantity", "fareDetails"];

  for (const id of TOKYO_HEAT_ROUTE_REPLAN_ITEMS) {
    const planned = canonical.get(id);
    if (!planned) continue;
    const live = current.get(id);
    if (!live) {
      current.set(id, planned);
      continue;
    }
    const merged: TripRecord = { ...live, ...planned, id };
    for (const field of preservedBookingFields) {
      if (live[field] !== undefined) merged[field] = live[field];
    }
    delete merged.order;
    current.set(id, merged);
  }

  for (const id of TOKYO_HEAT_ROUTE_REMOVED_ITEMS) current.delete(id);
  for (const item of current.values()) {
    if (["2026-08-07", "2026-08-08", "2026-08-19", "2026-08-20", "2026-08-21"].includes(String(item.date))) {
      delete item.order;
    }
  }

  const replannedItems = [...current.values()];
  const nextVersion = row.version + 1;
  const update = await db
    .prepare(
      "UPDATE trip_state SET payload = ?, version = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ?",
    )
    .bind(JSON.stringify(replannedItems), nextVersion, "Trip planner", "family-trip", row.version)
    .run();

  if (update.meta?.changes) {
    await db.batch([
      db.prepare("INSERT OR IGNORE INTO trip_migrations (id) VALUES (?)").bind(TOKYO_HEAT_ROUTE_REPLAN_ID),
      db.prepare("INSERT INTO trip_history (version, action, changed_by) VALUES (?, ?, ?)")
        .bind(nextVersion, "Reordered Tokyo days for heat, route efficiency and Shibuya Bon Odori", "Trip planner"),
    ]);
  }

  return (
    (await db
      .prepare("SELECT payload, version, updated_by, updated_at FROM trip_state WHERE id = ?")
      .bind("family-trip")
      .first<StateRow>()) ?? row
  );
}

async function applyFinalAuditHeatReplan(row: StateRow) {
  const db = database();
  const applied = await db
    .prepare("SELECT id FROM trip_migrations WHERE id = ?")
    .bind(FINAL_AUDIT_HEAT_REPLAN_ID)
    .first<{ id: string }>();
  if (applied) return row;

  const currentItems = JSON.parse(row.payload) as TripRecord[];
  const current = new Map(currentItems.map((item) => [item.id, item]));
  const canonical = new Map((seedItems as TripRecord[]).map((item) => [item.id, item]));
  const bookingFields = ["ticketStatus", "confirmed", "confirmation", "cost", "quantity", "fareDetails"];

  for (const id of FINAL_AUDIT_HEAT_REPLAN_ITEMS) {
    const planned = canonical.get(id);
    if (!planned) continue;
    const live = current.get(id);
    if (!live) {
      current.set(id, planned);
      continue;
    }

    const merged: TripRecord = { ...live, ...planned, id };
    const hasLiveBooking = live.ticketStatus === "booked" || String(live.confirmation ?? "").trim().length > 0;
    if (hasLiveBooking) {
      for (const field of bookingFields) {
        if (live[field] !== undefined) merged[field] = live[field];
      }
    }
    delete merged.order;
    current.set(id, merged);
  }

  for (const id of FINAL_AUDIT_HEAT_REMOVED_ITEMS) current.delete(id);
  for (const item of current.values()) {
    if ([
      "2026-08-07", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13",
      "2026-08-14", "2026-08-15", "2026-08-16", "2026-08-17", "2026-08-18",
      "2026-08-19", "2026-08-21",
    ].includes(String(item.date))) {
      delete item.order;
    }
  }

  const replannedItems = [...current.values()];
  const nextVersion = row.version + 1;
  const update = await db
    .prepare(
      "UPDATE trip_state SET payload = ?, version = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ?",
    )
    .bind(JSON.stringify(replannedItems), nextVersion, "Trip planner", "family-trip", row.version)
    .run();

  if (update.meta?.changes) {
    await db.batch([
      db.prepare("INSERT OR IGNORE INTO trip_migrations (id) VALUES (?)").bind(FINAL_AUDIT_HEAT_REPLAN_ID),
      db.prepare("INSERT INTO trip_history (version, action, changed_by) VALUES (?, ?, ?)")
        .bind(nextVersion, "Applied final route, ticket and heat audit for Tokyo, Hakone, Osaka, Nara, Hiroshima, Miyajima and Kyoto", "Trip planner"),
    ]);
  }

  return (
    (await db
      .prepare("SELECT payload, version, updated_by, updated_at FROM trip_state WHERE id = ?")
      .bind("family-trip")
      .first<StateRow>()) ?? row
  );
}

async function applyRestaurantClosureReplan(row: StateRow) {
  const db = database();
  const applied = await db
    .prepare("SELECT id FROM trip_migrations WHERE id = ?")
    .bind(RESTAURANT_CLOSURE_REPLAN_ID)
    .first<{ id: string }>();
  if (applied) return row;

  const currentItems = JSON.parse(row.payload) as TripRecord[];
  const replacement = (seedItems as TripRecord[]).find((item) => item.id === "hr-lunch");
  const nextItems = replacement
    ? currentItems.map((item) => item.id === "hr-lunch" ? { ...replacement } : item)
    : currentItems;
  const nextVersion = row.version + 1;
  const update = await db
    .prepare("UPDATE trip_state SET payload = ?, version = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ?")
    .bind(JSON.stringify(nextItems), nextVersion, "Restaurant audit", "family-trip", row.version)
    .run();

  if (update.meta?.changes) {
    await db.batch([
      db.prepare("INSERT OR IGNORE INTO trip_migrations (id) VALUES (?)").bind(RESTAURANT_CLOSURE_REPLAN_ID),
      db.prepare("INSERT INTO trip_history (version, action, changed_by) VALUES (?, ?, ?)")
        .bind(nextVersion, "Replaced the closed Aug 14 Nagata-ya lunch and removed stale restaurant leads", "Restaurant audit"),
    ]);
  }

  return (
    (await db
      .prepare("SELECT payload, version, updated_by, updated_at FROM trip_state WHERE id = ?")
      .bind("family-trip")
      .first<StateRow>()) ?? row
  );
}

async function applyVerifiedTransportPlan(row: StateRow) {
  const db = database();
  const applied = await db
    .prepare("SELECT id FROM trip_migrations WHERE id = ?")
    .bind(VERIFIED_TRANSPORT_PLAN_ID)
    .first<{ id: string }>();
  if (applied) return row;

  const currentItems = JSON.parse(row.payload) as TripRecord[];
  const current = new Map(currentItems.map((item) => [item.id, item]));
  const canonical = new Map((seedItems as TripRecord[]).map((item) => [item.id, item]));
  const liveBookingFields = ["ticketStatus", "confirmed", "confirmation", "cost", "quantity"];

  for (const id of VERIFIED_TRANSPORT_ITEMS) {
    const planned = canonical.get(id);
    if (!planned) continue;
    const live = current.get(id);
    if (!live) {
      current.set(id, planned);
      continue;
    }

    const merged: TripRecord = { ...live, ...planned, id };
    const hasLiveBooking = live.ticketStatus === "booked" || String(live.confirmation ?? "").trim().length > 0;
    if (hasLiveBooking) {
      for (const field of liveBookingFields) {
        if (live[field] !== undefined) merged[field] = live[field];
      }
    }
    delete merged.order;
    current.set(id, merged);
  }

  const nextVersion = row.version + 1;
  const update = await db
    .prepare("UPDATE trip_state SET payload = ?, version = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ?")
    .bind(JSON.stringify([...current.values()]), nextVersion, "Transport audit", "family-trip", row.version)
    .run();

  if (update.meta?.changes) {
    await db.batch([
      db.prepare("INSERT OR IGNORE INTO trip_migrations (id) VALUES (?)").bind(VERIFIED_TRANSPORT_PLAN_ID),
      db.prepare("INSERT INTO trip_history (version, action, changed_by) VALUES (?, ?, ?)")
        .bind(nextVersion, "Verified airport and intercity train times, booking channels, passes, seats, views and luggage rules", "Transport audit"),
    ]);
  }

  return (
    (await db
      .prepare("SELECT payload, version, updated_by, updated_at FROM trip_state WHERE id = ?")
      .bind("family-trip")
      .first<StateRow>()) ?? row
  );
}

export async function readTrip() {
  await ensureTripSchema();
  const db = database();
  let row = await db
    .prepare(
      "SELECT payload, version, updated_by, updated_at FROM trip_state WHERE id = ?",
    )
    .bind("family-trip")
    .first<StateRow>();

  if (!row) {
    const payload = JSON.stringify(seedItems);
    await db
      .prepare(
        "INSERT INTO trip_state (id, payload, version, updated_by) VALUES (?, ?, 1, ?)",
      )
      .bind("family-trip", payload, "Trip planner")
      .run();
    row = await db
      .prepare(
        "SELECT payload, version, updated_by, updated_at FROM trip_state WHERE id = ?",
      )
      .bind("family-trip")
      .first<StateRow>();
  }

  if (!row) throw new Error("The trip could not be initialized.");
  row = await restoreAuditedBackups(row);
  row = await applyTokyoTeamlabReplan(row);
  row = await applyTokyoHeatRouteReplan(row);
  row = await applyFinalAuditHeatReplan(row);
  row = await applyRestaurantClosureReplan(row);
  row = await applyVerifiedTransportPlan(row);
  return {
    items: JSON.parse(row.payload),
    version: row.version,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export async function recentHistory() {
  await ensureTripSchema();
  const result = await database()
    .prepare(
      "SELECT id, version, action, changed_by AS changedBy, changed_at AS changedAt FROM trip_history ORDER BY id DESC LIMIT 30",
    )
    .all();
  return result.results ?? [];
}

export async function writeTrip(input: {
  items: unknown[];
  baseVersion: number;
  changedBy: string;
  action: string;
}) {
  await ensureTripSchema();
  const db = database();
  const nextVersion = input.baseVersion + 1;
  const payload = JSON.stringify(input.items);
  const update = await db
    .prepare(
      "UPDATE trip_state SET payload = ?, version = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND version = ?",
    )
    .bind(
      payload,
      nextVersion,
      input.changedBy,
      "family-trip",
      input.baseVersion,
    )
    .run();

  if (!update.meta?.changes) return { conflict: true as const };

  await db
    .prepare(
      "INSERT INTO trip_history (version, action, changed_by) VALUES (?, ?, ?)",
    )
    .bind(nextVersion, input.action, input.changedBy)
    .run();

  return { conflict: false as const, version: nextVersion };
}

export async function restoreVerifiedTrip(input: { baseVersion: number; changedBy: string }) {
  return writeTrip({
    items: seedItems,
    baseVersion: input.baseVersion,
    changedBy: input.changedBy,
    action: "Restored the verified complete itinerary",
  });
}
