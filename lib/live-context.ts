export const tripCities = [
  { id: "tokyo", name: "Tokyo", latitude: 35.6762, longitude: 139.6503, jmaNames: ["東京都", "東京地方"], wbgtStationId: "44132", wbgtStation: "Tokyo" },
  { id: "hakone", name: "Hakone", latitude: 35.2324, longitude: 139.107, jmaNames: ["神奈川県", "西部"], wbgtStationId: "46166", wbgtStation: "Odawara (nearest published station)" },
  { id: "osaka", name: "Osaka", latitude: 34.6937, longitude: 135.5023, jmaNames: ["大阪府"], wbgtStationId: "62078", wbgtStation: "Osaka" },
  { id: "hiroshima", name: "Hiroshima", latitude: 34.3853, longitude: 132.4553, jmaNames: ["広島県", "広島・呉"], wbgtStationId: "67437", wbgtStation: "Hiroshima" },
  { id: "kyoto", name: "Kyoto", latitude: 35.0116, longitude: 135.7681, jmaNames: ["京都府", "京都・亀岡"], wbgtStationId: "61286", wbgtStation: "Kyoto" },
] as const;

export type TripCityId = (typeof tripCities)[number]["id"];
export type SafetyLevel = "clear" | "advisory" | "warning" | "emergency" | "unknown";
export type WbgtRisk = "low" | "caution" | "warning" | "severe" | "danger";

export type JmaEntry = {
  title: string;
  id: string;
  updatedAt: string;
  summary: string;
  sourceUrl: string;
};

export type JmaFeed = {
  updatedAt: string;
  entries: JmaEntry[];
};

export type SafetySignal = {
  level: SafetyLevel;
  title: string;
  summary: string;
  updatedAt: string | null;
  sourceUrl: string;
};

export type WbgtSignal = {
  value: number;
  risk: WbgtRisk;
  validAt: string;
  updatedAt: string;
  station: string;
  kind: "forecast";
  sourceUrl: string;
};

function cityById(id: TripCityId) {
  const city = tripCities.find((candidate) => candidate.id === id);
  if (!city) throw new Error("Unknown itinerary city.");
  return city;
}

function radians(value: number) {
  return value * Math.PI / 180;
}

function distanceSquared(latitude: number, longitude: number, city: (typeof tripCities)[number]) {
  const latDelta = radians(city.latitude - latitude);
  const lonDelta = radians(city.longitude - longitude);
  const meanLatitude = radians((latitude + city.latitude) / 2);
  return latDelta * latDelta + Math.cos(meanLatitude) ** 2 * lonDelta * lonDelta;
}

/**
 * Maps a one-shot browser coordinate to a coarse itinerary city. The returned
 * object intentionally contains no coordinate or distance that could be stored.
 */
export function nearestTripCity(latitude: number, longitude: number): { id: TripCityId; name: string } {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("A valid location is required.");
  }
  const nearest = tripCities.reduce((best, candidate) => (
    distanceSquared(latitude, longitude, candidate) < distanceSquared(latitude, longitude, best)
      ? candidate
      : best
  ));
  return { id: nearest.id, name: nearest.name };
}

function xmlText(value: string) {
  return value
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function elementText(xml: string, name: string) {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? xmlText(match[1]) : "";
}

function normalizedIso(value: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

/** Parse the documented JMA Atom PULL feed without depending on browser DOM APIs. */
export function parseJmaAtomFeed(xml: string): JmaFeed {
  if (!/<feed(?:\s|>)/i.test(xml) || !/<updated(?:\s|>)/i.test(xml)) {
    throw new Error("JMA feed was not valid Atom XML.");
  }
  const updatedAt = normalizedIso(elementText(xml, "updated"));
  if (!updatedAt) throw new Error("JMA feed had no valid update time.");

  const entries = [...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)].map((match) => {
    const body = match[1];
    const id = elementText(body, "id");
    const href = body.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i)?.[1] ?? "";
    const sourceUrl = href.startsWith("https://www.data.jma.go.jp/") ? href : id;
    return {
      title: elementText(body, "title"),
      id,
      updatedAt: normalizedIso(elementText(body, "updated")),
      summary: elementText(body, "content"),
      sourceUrl,
    };
  }).filter((entry) => entry.title && entry.updatedAt && entry.sourceUrl.startsWith("https://www.data.jma.go.jp/"));

  return { updatedAt, entries };
}

const JMA_WARNING_MAP = "https://www.jma.go.jp/bosai/map.html#contents=warning&lang=en";

export function summarizeJmaSafety(feed: JmaFeed, cityId: TripCityId): SafetySignal {
  const city = cityById(cityId);
  const relevant = feed.entries
    .filter((entry) => /気象.*(?:警報|注意報)/.test(entry.title))
    .filter((entry) => city.jmaNames.some((name) => entry.summary.includes(name)))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];

  if (!relevant) {
    return {
      level: "unknown",
      title: `Local warning status not present for ${city.name}`,
      summary: "The short public feed is not proof of an all-clear. Check JMA for the latest official map.",
      updatedAt: feed.updatedAt,
      sourceUrl: JMA_WARNING_MAP,
    };
  }

  const bulletinBody = relevant.summary.replace(/^【[^】]+】/, "");
  const cancelled = /解除|発表なし/.test(bulletinBody);
  const level: SafetyLevel = cancelled
    ? "clear"
    : /特別警報/.test(bulletinBody) ? "emergency"
      : /警報/.test(bulletinBody) ? "warning" : "advisory";
  return {
    level,
    title: cancelled ? `No active warning in the latest ${city.name} bulletin`
      : level === "advisory" ? `Weather advisory for ${city.name}`
        : level === "emergency" ? `Emergency weather warning for ${city.name}`
          : `Weather warning for ${city.name}`,
    summary: relevant.summary,
    updatedAt: relevant.updatedAt,
    sourceUrl: relevant.sourceUrl || JMA_WARNING_MAP,
  };
}

export function summarizeHeatAlert(feed: JmaFeed, cityId: TripCityId): SafetySignal {
  const city = cityById(cityId);
  const relevant = feed.entries
    .filter((entry) => /熱中症.*(?:警戒|アラート)/.test(`${entry.title}${entry.summary}`))
    .filter((entry) => city.jmaNames.some((name) => entry.summary.includes(name)))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
  if (!relevant) {
    return {
      level: "unknown",
      title: `Heat alert status not present for ${city.name}`,
      summary: "The short public feed is not proof of an all-clear. Confirm on the official WBGT and alert site.",
      updatedAt: feed.updatedAt,
      sourceUrl: "https://www.wbgt.env.go.jp/en/",
    };
  }
  const body = relevant.summary.replace(/^【[^】]+】/, "");
  const cancelled = /解除|発表なし/.test(body);
  const level: SafetyLevel = cancelled ? "clear" : /特別警戒/.test(`${relevant.title}${body}`) ? "emergency" : "warning";
  return {
    level,
    title: cancelled ? `No active heat alert in the latest ${city.name} bulletin`
      : level === "emergency" ? `Heat Stroke Special Alert for ${city.name}`
        : `Heat Stroke Alert for ${city.name}`,
    summary: relevant.summary,
    updatedAt: relevant.updatedAt,
    sourceUrl: relevant.sourceUrl || "https://www.wbgt.env.go.jp/en/",
  };
}

export function classifyWbgt(value: number): WbgtRisk {
  if (value >= 31) return "danger";
  if (value >= 28) return "severe";
  if (value >= 25) return "warning";
  if (value >= 21) return "caution";
  return "low";
}

function japanTimestampToIso(value: string) {
  const matched = value.trim().match(/^(\d{4})[\/-](\d{2})[\/-](\d{2})[ T]?(\d{2}):?(\d{2})$/);
  if (!matched) return "";
  const [, year, month, day, hour, minute] = matched;
  const normalizedHour = hour === "24" ? "00" : hour;
  const candidate = new Date(`${year}-${month}-${day}T${normalizedHour}:${minute}:00+09:00`);
  if (hour === "24") candidate.setUTCDate(candidate.getUTCDate() + 1);
  return Number.isNaN(candidate.getTime()) ? "" : candidate.toISOString();
}

function forecastHeaderToIso(value: string) {
  const matched = value.trim().match(/^(\d{4})(\d{2})(\d{2})(\d{2})$/);
  if (!matched) return "";
  const [, year, month, day, hour] = matched;
  const candidate = new Date(`${year}-${month}-${day}T${hour === "24" ? "00" : hour}:00:00+09:00`);
  if (hour === "24") candidate.setUTCDate(candidate.getUTCDate() + 1);
  return Number.isNaN(candidate.getTime()) ? "" : candidate.toISOString();
}

export function parseWbgtForecast(csv: string, cityId: TripCityId, now = new Date()): WbgtSignal {
  const city = cityById(cityId);
  const rows = csv.replace(/^\uFEFF/, "").trim().split(/\r?\n/).map((row) => row.split(","));
  if (rows.length < 2) throw new Error("WBGT forecast was incomplete.");
  const header = rows[0].slice(2).map(forecastHeaderToIso);
  const stationRow = rows.slice(1).find((row) => row[0]?.trim() === city.wbgtStationId);
  if (!stationRow) throw new Error("WBGT forecast did not include the expected station.");
  const updatedAt = japanTimestampToIso(stationRow[1] ?? "");
  if (!updatedAt) throw new Error("WBGT forecast had no valid update time.");

  const candidates = header.flatMap((validAt, index) => {
    const rawValue = (stationRow[index + 2] ?? "").trim();
    if (!validAt || !/^\d+$/.test(rawValue)) return [];
    return [{ validAt, value: Number(rawValue) / 10 }];
  });
  const next = candidates.find((candidate) => Date.parse(candidate.validAt) >= now.getTime()) ?? candidates.at(-1);
  if (!next) throw new Error("WBGT forecast had no usable values.");

  return {
    value: next.value,
    risk: classifyWbgt(next.value),
    validAt: next.validAt,
    updatedAt,
    station: city.wbgtStation,
    kind: "forecast",
    sourceUrl: "https://www.wbgt.env.go.jp/en/",
  };
}
