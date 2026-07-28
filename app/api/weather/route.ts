import { isAuthorized } from "@/lib/access";

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

function valueAt(values: number[] | undefined, index: number) {
  const value = values?.[index];
  return Number.isFinite(value) ? Number(value) : null;
}

function unauthorized() {
  return Response.json({ error: "Family access is required." }, { status: 401 });
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

  try {
    const upstream = await fetch(`https://api.open-meteo.com/v1/forecast?${parameters}`, {
      headers: { accept: "application/json" },
    });
    if (!upstream.ok) throw new Error(`Weather service returned ${upstream.status}.`);

    const raw = (await upstream.json()) as OpenMeteoResult | OpenMeteoResult[];
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

    return Response.json(
      {
        generatedAt: new Date().toISOString(),
        timezone: "Asia/Tokyo",
        forecastDays: 16,
        provider: "Open-Meteo",
        cities,
      },
      {
        headers: {
          "cache-control": "private, max-age=900, stale-while-revalidate=900",
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Weather is temporarily unavailable.",
      },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
