import {
  parseJmaAtomFeed,
  parseWbgtForecast,
  summarizeHeatAlert,
  summarizeJmaSafety,
  tripCities,
  type JmaFeed,
  type SafetySignal,
  type TripCityId,
  type WbgtSignal,
} from "@/lib/live-context";

const JMA_EXTRA_FEED = "https://www.data.jma.go.jp/developer/xml/feed/extra.xml";
const JMA_EARTHQUAKE_FEED = "https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml";
const JMA_EARTHQUAKE_MAP = "https://www.jma.go.jp/bosai/map.html#contents=earthquake_map&lang=en";
const JMA_TSUNAMI_MAP = "https://www.jma.go.jp/bosai/map.html#contents=tsunami&lang=en";
const TOKYO_METRO_STATUS = "https://www.tokyometro.jp/lang_en/unkou/history/ginza.html";
const ODPT_TRAIN_INFORMATION = "https://api.odpt.org/api/v4/odpt:TrainInformation";
const officialRailLinks = {
  jrEast: { label: "JR East", url: "https://traininfo.jreast.co.jp/train_info/e/", coverage: "Tokyo and eastern Japan" },
  jrCentral: { label: "JR Central Shinkansen", url: "https://traininfo.jr-central.co.jp/shinkansen/pc/en/index.html", coverage: "Tokaido Shinkansen" },
  jrWest: { label: "JR West", url: "https://global.trafficinfo.westjr.co.jp/en/readme.html", coverage: "Osaka, Kyoto and Hiroshima area" },
  osakaMetro: { label: "Osaka Metro", url: "https://subway.osakametro.co.jp/en/guide/subway_information.php", coverage: "Osaka subway" },
  tokyoMetro: { label: "Tokyo Metro", url: TOKYO_METRO_STATUS, coverage: "Tokyo subway" },
} as const;

function railLinksForCity(cityId: TripCityId) {
  if (cityId === "tokyo") return [officialRailLinks.jrEast, officialRailLinks.jrCentral, officialRailLinks.tokyoMetro];
  if (cityId === "hakone") return [officialRailLinks.jrEast, officialRailLinks.jrCentral];
  if (cityId === "osaka") return [officialRailLinks.jrCentral, officialRailLinks.jrWest, officialRailLinks.osakaMetro];
  if (cityId === "kyoto") return [officialRailLinks.jrCentral, officialRailLinks.jrWest];
  return [officialRailLinks.jrWest];
}

export type LiveContextPayload = {
  generatedAt: string;
  city: { id: TripCityId; name: string };
  freshness: {
    status: "fresh" | "stale" | "partial" | "unavailable";
    sourceUpdatedAt: string | null;
    message: string;
    sources: Array<{
      id: "jma-warnings" | "jma-earthquake-tsunami" | "wbgt";
      label: string;
      status: "fresh" | "stale" | "unavailable";
      updatedAt: string | null;
    }>;
  };
  safety: {
    weather: SafetySignal;
    earthquake: SafetySignal;
    tsunami: SafetySignal;
    heatAlert: SafetySignal;
    heat: WbgtSignal | null;
  };
  transit: {
    tokyoMetro: {
      state: "not-configured" | "available" | "unavailable";
      notices: string[];
      updatedAt: string | null;
      sourceUrl: string;
      note: string;
    };
    officialLinks: Array<{ label: string; url: string; coverage: string }>;
  };
  links: {
    weatherWarnings: string;
    earthquake: string;
    tsunami: string;
    radar: string;
    uv: string;
    wbgt: string;
    hakone: string;
    miyajima: string;
  };
  places: {
    enabled: false;
    reason: string;
  };
  warning: string | null;
  disclaimer: string;
};

type FetchOptions = {
  now?: Date;
  odptApiKey?: string;
  fetcher?: typeof fetch;
};

type CachedContext = { payload: LiveContextPayload; savedAt: number };
const lastGoodContext = new Map<TripCityId, CachedContext>();

function safeUnknownSignal(title: string, sourceUrl: string): SafetySignal {
  return {
    level: "unknown",
    title,
    summary: "The official feed could not be refreshed. Open the official source before making safety decisions.",
    updatedAt: null,
    sourceUrl,
  };
}

function latestMatching(feed: JmaFeed, pattern: RegExp) {
  return feed.entries
    .filter((entry) => pattern.test(entry.title))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
}

export function summarizeEarthquake(feed: JmaFeed): SafetySignal {
  const latest = latestMatching(feed, /震源・震度|震度速報/);
  if (!latest) {
    return {
      level: "clear",
      title: "No recent earthquake bulletin in the feed",
      summary: "Open JMA for the complete official earthquake map.",
      updatedAt: feed.updatedAt,
      sourceUrl: JMA_EARTHQUAKE_MAP,
    };
  }
  return {
    level: "advisory",
    title: "Recent Japan earthquake bulletin",
    summary: latest.summary,
    updatedAt: latest.updatedAt,
    sourceUrl: latest.sourceUrl || JMA_EARTHQUAKE_MAP,
  };
}

export function summarizeTsunami(feed: JmaFeed): SafetySignal {
  const latest = latestMatching(feed, /津波(?:警報|注意報|予報|情報)/);
  if (!latest) {
    return {
      level: "clear",
      title: "No tsunami bulletin in the current feed",
      summary: "Open JMA for the complete official tsunami map.",
      updatedAt: feed.updatedAt,
      sourceUrl: JMA_TSUNAMI_MAP,
    };
  }
  const body = latest.summary.replace(/^【[^】]+】/, "");
  const level = /心配はありません|解除/.test(body) ? "clear"
    : /大津波警報/.test(body) ? "emergency"
      : /津波警報/.test(body) ? "warning"
        : /津波注意報/.test(body) ? "advisory" : "clear";
  return {
    level,
    title: level === "emergency" ? "Major tsunami warning"
      : level === "warning" ? "Tsunami warning"
        : level === "advisory" ? "Tsunami advisory"
          : "No tsunami threat in the latest bulletin",
    summary: latest.summary,
    updatedAt: latest.updatedAt,
    sourceUrl: latest.sourceUrl || JMA_TSUNAMI_MAP,
  };
}

function localeText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  const localized = value as Record<string, unknown>;
  return String(localized.en || localized.ja || "").trim();
}

function parseOdpt(payload: unknown) {
  if (!Array.isArray(payload)) throw new Error("ODPT response was not an array.");
  const records = payload.filter((record): record is Record<string, unknown> => Boolean(record && typeof record === "object"));
  const notices = [...new Set(records.map((record) => localeText(record["odpt:trainInformationText"])).filter(Boolean))];
  const updatedAt = records
    .map((record) => String(record["dc:date"] || ""))
    .filter((value) => !Number.isNaN(Date.parse(value)))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
  return { notices, updatedAt };
}

async function fetchText(fetcher: typeof fetch, url: string) {
  const response = await fetcher(url, {
    headers: { accept: "application/xml,text/csv,text/plain;q=0.9" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Official source returned ${response.status}.`);
  return response.text();
}

function newestTimestamp(values: Array<string | null | undefined>) {
  const usable = values.filter((value): value is string => Boolean(value && !Number.isNaN(Date.parse(value))));
  return usable.sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
}

function freshness(sources: LiveContextPayload["freshness"]["sources"]) {
  const sourceUpdatedAt = newestTimestamp(sources.map((source) => source.updatedAt));
  if (sources.every((source) => source.status === "unavailable")) return {
    status: "unavailable" as const,
    sourceUpdatedAt: null,
    message: "Official live sources are unavailable. Use the direct links below.",
    sources,
  };
  if (sources.some((source) => source.status === "unavailable")) return {
    status: "partial" as const,
    sourceUpdatedAt,
    message: "Some official sources could not refresh. Check timestamps and direct links.",
    sources,
  };
  if (sources.some((source) => source.status === "stale")) return {
    status: "stale" as const,
    sourceUpdatedAt,
    message: "One or more official sources are older than their expected update window. Confirm with the direct links.",
    sources,
  };
  return {
    status: "fresh" as const,
    sourceUpdatedAt,
    message: "Official sources refreshed recently.",
    sources,
  };
}

function sourceStatus(updatedAt: string | null | undefined, now: Date, maximumAgeMs: number) {
  if (!updatedAt || Number.isNaN(Date.parse(updatedAt))) return "unavailable" as const;
  return now.getTime() - Date.parse(updatedAt) > maximumAgeMs ? "stale" as const : "fresh" as const;
}

export async function fetchLiveContext(cityId: TripCityId, options: FetchOptions = {}): Promise<LiveContextPayload> {
  const city = tripCities.find((candidate) => candidate.id === cityId);
  if (!city) throw new Error("Unknown itinerary city.");
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? new Date();
  const wbgtUrl = `https://www.wbgt.env.go.jp/prev15WG/dl/yohou_${city.wbgtStationId}.csv`;
  const [extraResult, earthquakeResult, wbgtResult] = await Promise.allSettled([
    fetchText(fetcher, JMA_EXTRA_FEED).then(parseJmaAtomFeed),
    fetchText(fetcher, JMA_EARTHQUAKE_FEED).then(parseJmaAtomFeed),
    fetchText(fetcher, wbgtUrl).then((csv) => parseWbgtForecast(csv, cityId, now)),
  ]);

  const failures: string[] = [];
  const extra = extraResult.status === "fulfilled" ? extraResult.value : (failures.push("JMA warnings"), null);
  const earthquakes = earthquakeResult.status === "fulfilled" ? earthquakeResult.value : (failures.push("JMA earthquake/tsunami"), null);
  const heat = wbgtResult.status === "fulfilled" ? wbgtResult.value : (failures.push("Ministry WBGT"), null);

  if (!extra && !earthquakes && !heat) {
    const cached = lastGoodContext.get(cityId);
    if (cached) {
      return {
        ...cached.payload,
        generatedAt: now.toISOString(),
        freshness: {
          ...cached.payload.freshness,
          status: "stale",
          message: "Live refresh failed; showing the last successful in-memory update. Confirm with official links.",
          sources: cached.payload.freshness.sources.map((source) => ({
            ...source,
            status: source.status === "unavailable" ? "unavailable" : "stale",
          })),
        },
        warning: "All official feeds failed to refresh.",
      };
    }
  }

  let tokyoMetro: LiveContextPayload["transit"]["tokyoMetro"] = {
    state: "not-configured",
    notices: [],
    updatedAt: null,
    sourceUrl: TOKYO_METRO_STATUS,
    note: "Live Tokyo Metro data is off until an approved ODPT API key is configured. Use the official status page.",
  };
  if (options.odptApiKey) {
    try {
      const url = new URL(ODPT_TRAIN_INFORMATION);
      url.searchParams.set("odpt:operator", "odpt.Operator:TokyoMetro");
      url.searchParams.set("acl:consumerKey", options.odptApiKey);
      const response = await fetcher(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8_000) });
      if (!response.ok) throw new Error("ODPT unavailable.");
      const parsed = parseOdpt(await response.json());
      tokyoMetro = {
        state: "available",
        notices: parsed.notices,
        updatedAt: parsed.updatedAt,
        sourceUrl: TOKYO_METRO_STATUS,
        note: "Source: ODPT / Tokyo Metro. Confirm operational decisions with the operator; data has no availability warranty.",
      };
    } catch {
      tokyoMetro = {
        state: "unavailable",
        notices: [],
        updatedAt: null,
        sourceUrl: TOKYO_METRO_STATUS,
        note: "ODPT could not refresh. Use the official Tokyo Metro status page.",
      };
    }
  }

  const freshnessSources: LiveContextPayload["freshness"]["sources"] = [
    {
      id: "jma-warnings",
      label: "JMA warnings",
      status: sourceStatus(extra?.updatedAt, now, 15 * 60_000),
      updatedAt: extra?.updatedAt ?? null,
    },
    {
      id: "jma-earthquake-tsunami",
      label: "JMA earthquake and tsunami",
      status: sourceStatus(earthquakes?.updatedAt, now, 15 * 60_000),
      updatedAt: earthquakes?.updatedAt ?? null,
    },
    {
      id: "wbgt",
      label: "Official WBGT forecast",
      status: sourceStatus(heat?.updatedAt, now, 6 * 60 * 60_000),
      updatedAt: heat?.updatedAt ?? null,
    },
  ];
  const payload: LiveContextPayload = {
    generatedAt: now.toISOString(),
    city: { id: city.id, name: city.name },
    freshness: freshness(freshnessSources),
    safety: {
      weather: extra ? summarizeJmaSafety(extra, cityId) : safeUnknownSignal("Local weather warning status unavailable", "https://www.jma.go.jp/bosai/map.html#contents=warning&lang=en"),
      earthquake: earthquakes ? summarizeEarthquake(earthquakes) : safeUnknownSignal("Earthquake bulletin unavailable", JMA_EARTHQUAKE_MAP),
      tsunami: earthquakes ? summarizeTsunami(earthquakes) : safeUnknownSignal("Tsunami bulletin unavailable", JMA_TSUNAMI_MAP),
      heatAlert: extra ? summarizeHeatAlert(extra, cityId) : safeUnknownSignal("Heat alert status unavailable", "https://www.wbgt.env.go.jp/en/"),
      heat,
    },
    transit: {
      tokyoMetro,
      officialLinks: railLinksForCity(cityId),
    },
    links: {
      weatherWarnings: "https://www.jma.go.jp/bosai/map.html#contents=warning&lang=en",
      earthquake: JMA_EARTHQUAKE_MAP,
      tsunami: JMA_TSUNAMI_MAP,
      radar: "https://www.jma.go.jp/bosai/nowc/#zoom:7/&lang=en",
      uv: "https://www.data.jma.go.jp/env/uvindex/en/",
      wbgt: "https://www.wbgt.env.go.jp/en/",
      hakone: "https://www.hakonenavi.jp/international/en/status_information",
      miyajima: "https://www.miyajima.or.jp/english/sio/sio.php",
    },
    places: {
      enabled: false,
      reason: "Google Places is disabled by default. Popular-times data is not available through the official Places API.",
    },
    warning: failures.length ? `Could not refresh: ${failures.join(", ")}.` : null,
    disclaimer: "Informational only. Public feeds can be delayed or unavailable and do not replace local alerts, station boards, broadcasters, sirens, or evacuation instructions. Live context never changes the agenda.",
  };
  if (extra || earthquakes || heat) lastGoodContext.set(cityId, { payload, savedAt: now.getTime() });
  return payload;
}
