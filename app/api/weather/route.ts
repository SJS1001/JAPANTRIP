import { isAuthorized } from "@/lib/access";
import { claimWeatherRefresh, readWeatherCache, writeWeatherCache } from "@/db/weather-store";

const WEATHER_FRESH_MS = 30 * 60_000;

const locations = [
  { id: "tokyo", name: "Tokyo", latitude: 35.6762, longitude: 139.6503 },
  { id: "hakone", name: "Hakone", latitude: 35.2324, longitude: 139.107 },
  { id: "osaka", name: "Osaka", latitude: 34.6937, longitude: 135.5023 },
  { id: "hiroshima", name: "Hiroshima", latitude: 34.3853, longitude: 132.4553 },
  { id: "kyoto", name: "Kyoto", latitude: 35.0116, longitude: 135.7681 },
] as const;

type OpenMeteoResult = {
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    apparent_temperature?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    apparent_temperature_max?: number[];
    precipitation_probability_max?: number[];
    precipitation_sum?: number[];
    sunrise?: string[];
    sunset?: string[];
    uv_index_max?: number[];
  };
};

type MetNoTimeseries = {
  time: string;
  data?: {
    instant?: { details?: { air_temperature?: number; relative_humidity?: number; wind_speed?: number; ultraviolet_index_clear_sky?: number } };
    next_1_hours?: { summary?: { symbol_code?: string }; details?: { precipitation_amount?: number } };
    next_6_hours?: { summary?: { symbol_code?: string } };
    next_12_hours?: { summary?: { symbol_code?: string } };
  };
};

type MetNoResult = {
  properties?: { timeseries?: MetNoTimeseries[] };
};

function valueAt(values: number[] | undefined, index: number) {
  const value = values?.[index];
  return Number.isFinite(value) ? Number(value) : null;
}

function unauthorized() {
  return Response.json({ error: "Family access is required." }, { status: 401 });
}

function buildWeatherPayload(raw: OpenMeteoResult | OpenMeteoResult[]) {
  const results = Array.isArray(raw) ? raw : [raw];
  if (results.length !== locations.length) throw new Error("Weather locations were incomplete.");

  const cities = locations.map((location, locationIndex) => {
    const result = results[locationIndex];
    const daily = result.daily;
    return {
      id: location.id,
      name: location.name,
      current: {
        time: result.current?.time ?? null,
        temperature: result.current?.temperature_2m ?? null,
        apparentTemperature: result.current?.apparent_temperature ?? null,
        humidity: result.current?.relative_humidity_2m ?? null,
        precipitation: result.current?.precipitation ?? null,
        weatherCode: result.current?.weather_code ?? null,
        windSpeed: result.current?.wind_speed_10m ?? null,
      },
      daily: (daily?.time ?? []).map((date, index) => ({
        date,
        weatherCode: valueAt(daily?.weather_code, index),
        temperatureMax: valueAt(daily?.temperature_2m_max, index),
        temperatureMin: valueAt(daily?.temperature_2m_min, index),
        apparentTemperatureMax: valueAt(daily?.apparent_temperature_max, index),
        precipitationProbability: valueAt(daily?.precipitation_probability_max, index),
        precipitationSum: valueAt(daily?.precipitation_sum, index),
        sunrise: daily?.sunrise?.[index] ?? null,
        sunset: daily?.sunset?.[index] ?? null,
        uvIndexMax: valueAt(daily?.uv_index_max, index),
      })),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    timezone: "Asia/Tokyo",
    forecastDays: 16,
    provider: "Open-Meteo",
    providerUrl: "https://open-meteo.com/",
    cities,
  };
}

function weatherResponse(payload: Record<string, unknown>, stale = false, warning?: string) {
  return Response.json(
    { ...payload, stale, warning: warning || null },
    { headers: { "cache-control": stale ? "private, no-store" : "private, max-age=300" } },
  );
}

function metNoWeatherCode(symbol = "") {
  const code = symbol.toLowerCase();
  if (code.includes("thunder")) return 95;
  if (code.includes("heavyrain")) return 65;
  if (code.includes("rainshowers")) return 80;
  if (code.includes("lightrain")) return 61;
  if (code.includes("rain")) return 63;
  if (code.includes("heavysnow")) return 75;
  if (code.includes("snowshowers")) return 85;
  if (code.includes("snow")) return 71;
  if (code.includes("sleet")) return 66;
  if (code.includes("fog")) return 45;
  if (code.includes("partlycloudy")) return 2;
  if (code.includes("cloudy")) return 3;
  if (code.includes("fair")) return 1;
  if (code.includes("clearsky")) return 0;
  return 3;
}

function metNoSymbol(entry: MetNoTimeseries) {
  return entry.data?.next_1_hours?.summary?.symbol_code
    || entry.data?.next_6_hours?.summary?.symbol_code
    || entry.data?.next_12_hours?.summary?.symbol_code
    || "cloudy";
}

function japanDate(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(iso));
}

function japanHour(iso: string) {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Tokyo" }).format(new Date(iso)));
}

async function fetchMetNo(location: (typeof locations)[number]) {
  const url = new URL("https://api.met.no/weatherapi/locationforecast/2.0/compact");
  url.searchParams.set("lat", location.latitude.toFixed(4));
  url.searchParams.set("lon", location.longitude.toFixed(4));
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "JapanFamilyTripCalendar/1.0 (https://smith-japan-family-trip-2026.djstif.chatgpt.site/)",
    },
  });
  if (!response.ok) throw new Error(`Backup weather service returned ${response.status}.`);
  return (await response.json()) as MetNoResult;
}

async function buildMetNoPayload() {
  const results = await Promise.all(locations.map((location) => fetchMetNo(location)));
  const cities = results.map((result, index) => {
    const timeseries = result.properties?.timeseries ?? [];
    if (!timeseries.length) throw new Error("Backup weather locations were incomplete.");
    const first = timeseries[0];
    const firstDetails = first.data?.instant?.details;
    const daily = new Map<string, {
      temperatures: number[];
      uv: number[];
      precipitation: number;
      weatherCode: number;
      middayDistance: number;
    }>();
    timeseries.forEach((entry) => {
      const date = japanDate(entry.time);
      const details = entry.data?.instant?.details;
      const temperature = details?.air_temperature;
      const uv = details?.ultraviolet_index_clear_sky;
      const precipitation = entry.data?.next_1_hours?.details?.precipitation_amount;
      const code = metNoWeatherCode(metNoSymbol(entry));
      const distance = Math.abs(japanHour(entry.time) - 12);
      const aggregate = daily.get(date) ?? { temperatures: [], uv: [], precipitation: 0, weatherCode: code, middayDistance: Number.POSITIVE_INFINITY };
      if (Number.isFinite(temperature)) aggregate.temperatures.push(Number(temperature));
      if (Number.isFinite(uv)) aggregate.uv.push(Number(uv));
      if (Number.isFinite(precipitation)) aggregate.precipitation += Number(precipitation);
      if (distance < aggregate.middayDistance) {
        aggregate.weatherCode = code;
        aggregate.middayDistance = distance;
      }
      daily.set(date, aggregate);
    });

    return {
      id: locations[index].id,
      name: locations[index].name,
      current: {
        time: first.time,
        temperature: firstDetails?.air_temperature ?? null,
        apparentTemperature: null,
        humidity: firstDetails?.relative_humidity ?? null,
        precipitation: first.data?.next_1_hours?.details?.precipitation_amount ?? null,
        weatherCode: metNoWeatherCode(metNoSymbol(first)),
        windSpeed: firstDetails?.wind_speed !== undefined ? firstDetails.wind_speed * 3.6 : null,
      },
      daily: [...daily.entries()].map(([date, values]) => ({
        date,
        weatherCode: values.weatherCode,
        temperatureMax: values.temperatures.length ? Math.max(...values.temperatures) : null,
        temperatureMin: values.temperatures.length ? Math.min(...values.temperatures) : null,
        apparentTemperatureMax: null,
        precipitationProbability: null,
        precipitationSum: Math.round(values.precipitation * 10) / 10,
        sunrise: null,
        sunset: null,
        uvIndexMax: values.uv.length ? Math.max(...values.uv) : null,
      })),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    timezone: "Asia/Tokyo",
    forecastDays: 9,
    provider: "MET Norway fallback",
    providerUrl: "https://api.met.no/",
    cities,
  };
}

async function fetchOpenMeteo(url: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (response.ok) return response;
    if (response.status !== 429 || attempt > 0) {
      throw new Error(`Weather service returned ${response.status}.`);
    }
    const suggested = Number(response.headers.get("retry-after") || 2);
    const delay = Number.isFinite(suggested) ? Math.min(5_000, Math.max(1_000, suggested * 1000)) : 2_000;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error("Weather service is temporarily busy.");
}

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) return unauthorized();

  const parameters = new URLSearchParams({
    latitude: locations.map((location) => location.latitude).join(","),
    longitude: locations.map((location) => location.longitude).join(","),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_probability_max,precipitation_sum,sunrise,sunset,uv_index_max",
    timezone: "Asia/Tokyo",
    forecast_days: "16",
  });

  let cached: Awaited<ReturnType<typeof readWeatherCache>> = null;
  try {
    cached = await readWeatherCache();
  } catch {
    // If D1 is briefly unavailable, live weather can still be requested directly.
  }
  if (cached && Date.now() - cached.fetchedAt < WEATHER_FRESH_MS) {
    return weatherResponse(cached.payload);
  }

  let claimed = true;
  try {
    claimed = await claimWeatherRefresh();
  } catch {
    // Continue without the family-wide lock if the shared database is unavailable.
  }
  if (!claimed && cached) {
    return weatherResponse(cached.payload, true, "A weather refresh is already running; showing the last successful forecast.");
  }
  if (!claimed) {
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    const refreshed = await readWeatherCache().catch(() => null);
    if (refreshed) return weatherResponse(refreshed.payload);
    return Response.json(
      { error: "The first shared weather update is still running. Try again in a few seconds." },
      { status: 503, headers: { "retry-after": "5", "cache-control": "no-store" } },
    );
  }

  try {
    const upstream = await fetchOpenMeteo(`https://api.open-meteo.com/v1/forecast?${parameters}`);
    const payload = buildWeatherPayload((await upstream.json()) as OpenMeteoResult | OpenMeteoResult[]);
    await writeWeatherCache(payload).catch(() => undefined);
    return weatherResponse(payload);
  } catch (error) {
    try {
      const fallback = await buildMetNoPayload();
      await writeWeatherCache(fallback).catch(() => undefined);
      return weatherResponse(fallback, false, "Open-Meteo is briefly busy, so this update is using MET Norway's shorter forecast.");
    } catch {
      // The last successful family-wide response remains safer than an empty panel.
    }
    if (cached) {
      return weatherResponse(cached.payload, true, "Open-Meteo is briefly busy; showing the last successful forecast.");
    }
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Weather is temporarily unavailable.",
      },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
