"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { areaByItem, areaGuides, transportGuideByItem, transportGuides } from "../../data/card-guides";
import lockedImageManifest from "../../data/image-manifest.json";
import rankedRestaurantGuides from "../../data/restaurant-guides.json";
import { OpenTripMap, type MapPoint } from "./OpenTripMap";

type Category = "hotel" | "transport" | "attraction" | "meal" | "ticket" | "note";
type TicketStatus = "to-buy" | "booked" | "not-needed";

type TripItem = {
  id: string;
  date: string;
  time?: string;
  category: Category;
  title: string;
  location?: string;
  notes?: string;
  ticketStatus?: TicketStatus;
  confirmed?: boolean;
  confirmation?: string;
  cost?: string;
  link?: string;
  lat?: number;
  lng?: number;
  quantity?: string;
  fareDetails?: string;
  imageUrl?: string;
  imageSource?: string;
  imageCredit?: string;
  order?: number;
};

type HistoryItem = {
  id: number;
  version: number;
  action: string;
  changedBy: string;
  changedAt: string;
};

type WeatherDay = {
  date: string;
  weatherCode: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  apparentTemperatureMax: number | null;
  precipitationProbability: number | null;
  precipitationSum: number | null;
  sunrise: string | null;
  sunset: string | null;
  uvIndexMax: number | null;
};

type WeatherCity = {
  id: string;
  name: string;
  current: {
    time: string | null;
    temperature: number | null;
    apparentTemperature: number | null;
    humidity: number | null;
    precipitation: number | null;
    weatherCode: number | null;
    windSpeed: number | null;
  };
  daily: WeatherDay[];
};

type WeatherPayload = {
  generatedAt: string;
  timezone: string;
  forecastDays: number;
  provider: string;
  providerUrl?: string;
  cities: WeatherCity[];
  stale?: boolean;
  warning?: string | null;
};

type LockedImage = { imageUrl: string; imageSource?: string; imageCredit?: string };
const lockedImages = lockedImageManifest as Record<string, LockedImage>;

function itemImage(item: TripItem): LockedImage | null {
  return lockedImages[item.id] || (item.imageUrl ? {
    imageUrl: item.imageUrl,
    imageSource: item.imageSource,
    imageCredit: item.imageCredit,
  } : null);
}

const categories: Category[] = ["hotel", "transport", "attraction", "meal", "ticket", "note"];
const preDepartureNow = new Set(["tkrail", "tk1", "tk2", "tk3", "ticket-tokyo-tower", "pass-hakone", "tk-oam", "pass-kansai", "tk-nijo", "t9"]);
const preDepartureConfirm = new Set(["t07start", "t08start", "hk-luggage", "t10a", "lug2", "t6", "tk-miyajima-ropeway", "m16b", "t17a", "t18a", "m21b"]);
const transportPlanIds = ["t1", "hk-luggage", "t2", "t3", "t4", "t4b", "t5", "t6b", "t6c", "t7", "t7b", "t8", "t9"];
const days = Array.from({ length: 17 }, (_, index) => {
  const date = new Date("2026-08-06T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + index);
  return date.toISOString().slice(0, 10);
});

const hotelSchedule = [
  ["2026-08-06", "Tokyo Bay Shiomi Prince Hotel", "h1"],
  ["2026-08-10", "APA Hotel Osaka Namba", "h2"],
  ["2026-08-14", "Hilton Hiroshima", "h3"],
  ["2026-08-16", "KOKO Kyoto Nijo Castle", "h4"],
  ["2026-08-19", "Cava House Shinjuku", "h5"],
] as const;

const descriptions: Record<string, string> = {
  "Senso-ji Temple & Nakamise": "Tokyo’s oldest temple district: the Kaminarimon gate, incense-filled main hall and traditional Nakamise shopping street.",
  "Meiji Shrine": "A forested Shinto sanctuary dedicated to Emperor Meiji and Empress Shoken, offering a quiet contrast to nearby Harajuku.",
  "Shibuya Sky & Crossing": "An open-air skyline deck above Tokyo’s most famous crossing, with broad views over Shibuya and toward Mount Fuji in clear weather.",
  "teamLab Planets": "An immersive digital-art experience where you move barefoot through water, mirrored light rooms and changing gardens.",
  "Tokyo Tower Main Deck": "Tokyo’s red-and-white postwar landmark, with a 150-metre observation deck and glass floor panels over the city.",
  "Hakone Shrine & lakeside torii": "A cedar-forest shrine beside Lake Ashi, known for its vermilion torii standing at the water’s edge.",
  "Hakone Open-Air Museum": "A mountain sculpture garden combining large outdoor works, landscape views and an indoor Picasso collection.",
  "Owakudani": "Hakone’s active volcanic valley, with steam vents, sulfurous terrain and the region’s famous black eggs.",
  "Todai-ji & Great Buddha": "A monumental wooden temple hall housing one of Japan’s largest bronze Buddha statues.",
  "Peace Memorial Museum": "A deeply moving account of the atomic bombing told through personal belongings, testimony and historical evidence.",
  "Itsukushima Shrine & Great Torii": "Miyajima’s tide-shaped shrine complex, whose vermilion corridors and great torii appear to float at high water.",
  "Nijo Castle": "The Kyoto residence of the Tokugawa shoguns, known for ornate palace rooms, gardens and singing nightingale floors.",
  "Gozan Okuribi": "Kyoto’s Obon finale, when giant fire symbols are lit across five surrounding mountains.",
  "Fushimi Inari Taisha": "A mountainside Shinto shrine threaded by thousands of vermilion torii gates.",
  "Kiyomizu-dera": "A celebrated hillside temple whose wooden stage looks across Kyoto and the Higashiyama district.",
  "Arashiyama Bamboo Grove": "A short but striking path enclosed by towering bamboo in western Kyoto.",
  "Kinkaku-ji": "Kyoto’s Golden Pavilion, reflected in its garden pond and set against wooded northern hills.",
};

function dayHotel(date: string) {
  let hotel = hotelSchedule[0][1];
  hotelSchedule.forEach(([start, name]) => {
    if (date >= start) hotel = name;
  });
  return hotel;
}

function dayStartHotel(date: string) {
  let index = 0;
  hotelSchedule.forEach(([start], candidate) => {
    if (date >= start) index = candidate;
  });
  if (index > 0 && date === hotelSchedule[index][0]) index -= 1;
  return hotelSchedule[index];
}

function dayEndHotel(date: string) {
  let selected: (typeof hotelSchedule)[number] = hotelSchedule[0];
  hotelSchedule.forEach((hotel) => {
    if (date >= hotel[0]) selected = hotel;
  });
  return selected;
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function weatherCityId(date: string) {
  if (date === "2026-08-10") return "hakone";
  if (date >= "2026-08-11" && date <= "2026-08-13") return "osaka";
  if (date >= "2026-08-14" && date <= "2026-08-15") return "hiroshima";
  if (date >= "2026-08-16" && date <= "2026-08-18") return "kyoto";
  return "tokyo";
}

function weatherCondition(code: number | null) {
  if (code === 0) return { icon: "☀️", label: "Clear sky" };
  if (code === 1) return { icon: "🌤️", label: "Mainly clear" };
  if (code === 2) return { icon: "⛅", label: "Partly cloudy" };
  if (code === 3) return { icon: "☁️", label: "Overcast" };
  if (code === 45 || code === 48) return { icon: "🌫️", label: "Fog" };
  if ([51, 53, 55, 56, 57].includes(Number(code))) return { icon: "🌦️", label: "Drizzle" };
  if ([61, 63, 65, 66, 67].includes(Number(code))) return { icon: "🌧️", label: "Rain" };
  if ([71, 73, 75, 77, 85, 86].includes(Number(code))) return { icon: "🌨️", label: "Snow" };
  if ([80, 81, 82].includes(Number(code))) return { icon: "🌦️", label: "Rain showers" };
  if ([95, 96, 99].includes(Number(code))) return { icon: "⛈️", label: "Thunderstorms" };
  return { icon: "◌", label: "Forecast pending" };
}

function weatherNumber(value: number | null, suffix = "°") {
  return value === null ? "—" : `${Math.round(value)}${suffix}`;
}

function japanTime(value: string | null) {
  return value?.includes("T") ? value.split("T")[1].slice(0, 5) : "—";
}

function forecastOpens(date: string) {
  const available = new Date(`${date}T12:00:00Z`);
  available.setUTCDate(available.getUTCDate() - 15);
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }).format(available);
}

function weatherPlan(day: WeatherDay) {
  if ((day.apparentTemperatureMax ?? 0) >= 38) return { tone: "danger", label: "Extreme heat plan", detail: "Move outdoor sights early, take a long indoor break and carry electrolytes." };
  if ((day.precipitationProbability ?? 0) >= 70) return { tone: "rain", label: "Rain backup likely", detail: "Pack a light rain layer and recheck transport before leaving the hotel." };
  if ((day.apparentTemperatureMax ?? 0) >= 33) return { tone: "heat", label: "Heat caution", detail: "Prioritize shade, water refills and the planned midday cooling stop." };
  return { tone: "calm", label: "Normal summer plan", detail: "Recheck the evening before; mountain and coastal weather can change quickly." };
}

function sortItems(list: TripItem[]) {
  return [...list].sort((a, b) => {
    if (Number.isFinite(a.order) || Number.isFinite(b.order)) {
      const orderA = Number.isFinite(a.order) ? Number(a.order) : Number.MAX_SAFE_INTEGER;
      const orderB = Number.isFinite(b.order) ? Number(b.order) : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
    }
    return String(a.time ?? "").localeCompare(String(b.time ?? ""));
  });
}

function hasCoordinates(item: TripItem): item is TripItem & { lat: number; lng: number } {
  return Number.isFinite(item.lat) && Number.isFinite(item.lng);
}

function hotelPoint(items: TripItem[], hotel: (typeof hotelSchedule)[number], label: string): MapPoint | null {
  const item = items.find((candidate) => candidate.id === hotel[2]) || items.find((candidate) => candidate.category === "hotel" && candidate.title.includes(hotel[1]));
  if (!item || !hasCoordinates(item)) return null;
  return { id: `${item.id}-${label}`, label, title: item.title, subtitle: label === "H" ? "Start hotel" : "Destination hotel", category: "hotel", lat: item.lat, lng: item.lng };
}

function dayMapPoints(date: string, items: TripItem[]) {
  const startHotel = dayStartHotel(date);
  const endHotel = dayEndHotel(date);
  const start = hotelPoint(items, startHotel, "H");
  const mapped = sortItems(items.filter((item) => item.date === date && hasCoordinates(item) && !["hotel", "ticket", "note"].includes(item.category)));
  const points: MapPoint[] = [];
  if (start) points.push(start);
  mapped.forEach((item, index) => points.push({ id: item.id, label: String(index + 1), title: item.title, subtitle: `${item.time || "Flexible"} · ${item.category}`, category: item.category, lat: item.lat, lng: item.lng }));
  const end = hotelPoint(items, endHotel, startHotel[2] === endHotel[2] ? "↩" : "H");
  if (end) points.push({ ...end, id: `${end.id}-end`, title: startHotel[2] === endHotel[2] ? `Return to ${end.title}` : end.title, subtitle: startHotel[2] === endHotel[2] ? "Return to hotel" : "Destination hotel", showMarker: startHotel[2] !== endHotel[2] });
  return points;
}

function masterMapPoints(items: TripItem[]) {
  return sortItems(items.filter((item) => hasCoordinates(item) && ["hotel", "attraction"].includes(item.category))).sort((a, b) => a.date.localeCompare(b.date) || String(a.time ?? "").localeCompare(String(b.time ?? ""))).map((item, index) => ({ id: item.id, label: item.category === "hotel" ? "H" : String(index + 1), title: item.title, subtitle: `${dateLabel(item.date)} · ${item.time || item.category}`, category: item.category, lat: item.lat, lng: item.lng }));
}

function haversine(a: MapPoint, b: MapPoint) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const earth = 6371;
  const latitude = radians(b.lat - a.lat);
  const longitude = radians(b.lng - a.lng);
  const value = Math.sin(latitude / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(longitude / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function distanceLabel(distance: number) {
  return distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(distance < 10 ? 1 : 0)} km`;
}

function directionsUrl(origin: string, destination: string, mode = "transit") {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${mode}`;
}

function mapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function reservationSearchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${query} official reservation booking`)}`;
}

function reservationAdvice(kind: string, detail: string) {
  const text = detail.toLowerCase();
  if (text.includes("already included") || text.includes("dinner is already included")) return { label: "Included with hotel · no extra booking", link: false };
  if (text.includes("reservation-only") || text.includes("reservation-essential") || text.includes("books out")) return { label: "Reservation needed", link: true };
  if (text.includes("reserve") || text.includes("reservation")) return { label: "Reservation recommended", link: true };
  if (kind === "Top restaurant") return { label: "Usually walk-in · check current policy", link: false };
  if (["Viral food", "Coffee/sweets"].includes(kind)) return { label: "Walk-in · expect a possible queue", link: false };
  return null;
}

type RankedRestaurant = {
  rank: number;
  name: string;
  cuisine: string;
  rating: number | null;
  reviews: number | null;
  walk: string;
  reservation: "required" | "recommended" | "walk-in" | "unknown";
  placeUrl: string;
  reserveUrl: string | null;
  why: string;
};

type GlutenChoice = {
  name: string;
  cuisine: string;
  walk: string;
  safety: "dedicated" | "gluten-free-menu" | "accommodates-request" | "uncertain";
  note: string;
  placeUrl: string;
  officialUrl: string | null;
};

type RankedAreaGuide = {
  updatedAt: string;
  ratingSource: string;
  availabilityNote?: string;
  restaurants: RankedRestaurant[];
  glutenFriendly: GlutenChoice[];
};

const restaurantGuides = rankedRestaurantGuides as Record<string, RankedAreaGuide>;

function RestaurantDirectory({ guide }: { guide: RankedAreaGuide }) {
  const restaurantCard = (restaurant: RankedRestaurant) => <article className="ranked-restaurant" key={`${restaurant.rank}-${restaurant.name}`}>
    <div className="restaurant-rank"><b>#{restaurant.rank}</b><span>{restaurant.cuisine}</span><em>{restaurant.walk}</em></div>
    <strong>{restaurant.name}</strong>
    <div className="restaurant-score">{restaurant.rating !== null ? <span>★ {restaurant.rating.toFixed(1)}{restaurant.reviews !== null ? ` · ${restaurant.reviews.toLocaleString()} reviews` : ""}</span> : <span>Rating not independently verified</span>}<i className={`reservation-${restaurant.reservation}`}>{restaurant.reservation === "walk-in" ? "Walk-in" : restaurant.reservation === "required" ? "Reserve" : restaurant.reservation === "recommended" ? "Reservation recommended" : "Check policy"}</i></div>
    <p>{restaurant.why}</p>
    <div className="pick-links"><a href={restaurant.placeUrl} target="_blank" rel="noreferrer">Restaurant ↗</a>{restaurant.reserveUrl && restaurant.reservation !== "walk-in" && <a href={restaurant.reserveUrl} target="_blank" rel="noreferrer">Reserve / check tables ↗</a>}</div>
  </article>;

  return <section className="restaurant-directory">
    <header><div><div className="back-label">Best-rated nearby</div><h4>{guide.restaurants.length} practical choices</h4></div><small>Checked {guide.updatedAt}</small></header>
    <p className="ranking-method">Ranked using rating strength, review volume, proximity and fit with the scheduled meal window—not star score alone. {guide.ratingSource}.</p>
    {guide.availabilityNote && <p className="availability-note">{guide.availabilityNote}</p>}
    <div className="restaurant-list">{guide.restaurants.slice(0, 3).map(restaurantCard)}</div>
    {guide.restaurants.length > 3 && <details className="all-restaurants"><summary>Show all {guide.restaurants.length} ranked restaurants</summary><div className="restaurant-list">{guide.restaurants.slice(3).map(restaurantCard)}</div></details>}
    <div className="gluten-guide"><div className="back-label">Gluten-friendly nearby</div><p>These are planning leads, not a medical guarantee. “Accommodates” and “uncertain” options may have soy sauce, shared fryers or cross-contact—confirm directly.</p><div>{guide.glutenFriendly.map((choice) => <article key={choice.name}><div><strong>{choice.name}</strong><span className={`safety-${choice.safety}`}>{choice.safety.replaceAll("-", " ")}</span></div><small>{choice.cuisine} · {choice.walk}</small><p>{choice.note}</p><div className="pick-links"><a href={choice.placeUrl} target="_blank" rel="noreferrer">Restaurant ↗</a>{choice.officialUrl && <a href={choice.officialUrl} target="_blank" rel="noreferrer">Menu / dietary details ↗</a>}</div></article>)}</div></div>
  </section>;
}

function newItem(): TripItem {
  return {
    id: `u${Date.now()}`,
    date: days[0],
    time: "",
    category: "note",
    title: "",
    location: "",
    notes: "",
    ticketStatus: "not-needed",
    confirmation: "",
    cost: "",
    link: "",
    quantity: "",
    fareDetails: "",
  };
}

export function TripCalendar() {
  const [phase, setPhase] = useState<"loading" | "locked" | "ready">("loading");
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState("");
  const [items, setItems] = useState<TripItem[]>([]);
  const [version, setVersion] = useState(1);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [updatedBy, setUpdatedBy] = useState("Trip planner");
  const [updatedAt, setUpdatedAt] = useState("");
  const [name, setName] = useState("Family member");
  const [sync, setSync] = useState<"saved" | "saving" | "offline" | "error">("saved");
  const [syncMessage, setSyncMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"calendar" | "transport" | "tickets" | "weather" | "route" | "history">("calendar");
  const [mapDate, setMapDate] = useState(days[0]);
  const [mapMode, setMapMode] = useState<"day" | "master">("day");
  const [visible, setVisible] = useState<Set<Category>>(new Set(categories));
  const [flipped, setFlipped] = useState<string | null>(null);
  const [draft, setDraft] = useState<TripItem | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ itemId: string; date: string; time: string; beforeItemId?: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionRef = useRef(1);
  const editRevisionRef = useRef(0);
  const dirtyRef = useRef(false);
  const refreshingRef = useRef(false);
  const locatingRef = useRef(false);
  const saveChain = useRef(Promise.resolve());
  const importRef = useRef<HTMLInputElement>(null);

  const loadWeather = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherError("");
    try {
      const response = await fetch("/api/weather");
      const data = (await response.json()) as WeatherPayload & { error?: string };
      if (!response.ok) throw new Error(data.error || "Weather is temporarily unavailable.");
      setWeather(data);
      setWeatherError(data.warning || "");
      localStorage.setItem("japanTripWeatherCache", JSON.stringify(data));
    } catch (error) {
      setWeatherError(error instanceof Error ? error.message : "Weather is temporarily unavailable.");
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  async function loadTrip() {
    setSyncMessage("");
    try {
      const response = await fetch("/api/trip", { cache: "no-store" });
      if (response.status === 401) {
        setPhase("locked");
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The trip could not be loaded.");
      setItems(data.items);
      setVersion(data.version);
      versionRef.current = data.version;
      setHistory(data.history ?? []);
      setUpdatedBy(data.updatedBy ?? "Trip planner");
      setUpdatedAt(data.updatedAt ?? "");
      localStorage.setItem("japanTripCloudCache", JSON.stringify(data.items));
      setPhase("ready");
      setSync("saved");
      dirtyRef.current = false;
      const pending = localStorage.getItem("japanTripPending");
      if (pending) {
        try {
          const queued = JSON.parse(pending) as { items?: TripItem[]; action?: string; changedIds?: string[] };
          if (Array.isArray(queued.items)) {
            const revision = ++editRevisionRef.current;
            dirtyRef.current = true;
            setItems(queued.items);
            setSync("saving");
            setSyncMessage("Uploading changes made while this device was offline…");
            setTimeout(() => {
              saveChain.current = saveChain.current.then(() =>
                sendSave(
                  queued.items as TripItem[],
                  `${queued.action || "Offline changes"} · reconnected`,
                  revision,
                  queued.changedIds?.length
                    ? queued.changedIds
                    : (queued.items as TripItem[]).map((item) => item.id),
                ),
              );
            }, 50);
          }
        } catch {
          localStorage.removeItem("japanTripPending");
        }
      }
    } catch (error) {
      const cache = localStorage.getItem("japanTripCloudCache");
      if (cache) {
        setItems(JSON.parse(cache));
        setPhase("ready");
        setSync("offline");
        setSyncMessage("Showing the last saved device copy. Reconnect before editing.");
      } else {
        setPhase("locked");
        setAccessError(error instanceof Error ? error.message : "The trip is unavailable.");
      }
    }
  }

  useEffect(() => {
    const savedName = localStorage.getItem("japanTripFamilyName") || "Family member";
    queueMicrotask(() => setName(savedName));
    const initialLoad = window.setTimeout(() => void loadTrip(), 0);
    const reconnect = () => void loadTrip();
    window.addEventListener("online", reconnect);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("online", reconnect);
    };
    // The loader intentionally runs only at mount and when the browser reconnects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "ready") return;
    let cancelled = false;
    let messageTimer: ReturnType<typeof setTimeout> | null = null;

    const checkForFamilyChanges = async () => {
      if (
        cancelled ||
        !navigator.onLine ||
        document.hidden ||
        dirtyRef.current ||
        refreshingRef.current
      ) return;

      try {
        const statusResponse = await fetch("/api/status", { cache: "no-store" });
        if (!statusResponse.ok) return;
        const status = (await statusResponse.json()) as { version?: number };
        if (!status.version || status.version <= versionRef.current) return;

        refreshingRef.current = true;
        const response = await fetch("/api/trip", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled || dirtyRef.current || data.version <= versionRef.current) return;

        setItems(data.items);
        setVersion(data.version);
        versionRef.current = data.version;
        setHistory(data.history ?? []);
        setUpdatedBy(data.updatedBy ?? "Family member");
        setUpdatedAt(data.updatedAt ?? "");
        localStorage.setItem("japanTripCloudCache", JSON.stringify(data.items));
        setSync("saved");
        setSyncMessage(`Updated automatically from ${data.updatedBy || "another family member"}.`);
        if (messageTimer) clearTimeout(messageTimer);
        messageTimer = setTimeout(() => setSyncMessage(""), 5000);
      } catch {
        // The existing calendar remains usable; the next poll or focus retries.
      } finally {
        refreshingRef.current = false;
      }
    };

    const interval = window.setInterval(() => void checkForFamilyChanges(), 12_000);
    const checkWhenVisible = () => void checkForFamilyChanges();
    window.addEventListener("focus", checkWhenVisible);
    document.addEventListener("visibilitychange", checkWhenVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      if (messageTimer) clearTimeout(messageTimer);
      window.removeEventListener("focus", checkWhenVisible);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "ready") return;
    const cached = localStorage.getItem("japanTripWeatherCache");
    let cacheIsFresh = false;
    if (cached) {
      try {
        const savedWeather = JSON.parse(cached) as WeatherPayload;
        cacheIsFresh = Date.now() - Date.parse(savedWeather.generatedAt) < 25 * 60_000;
        queueMicrotask(() => setWeather(savedWeather));
      } catch {
        localStorage.removeItem("japanTripWeatherCache");
      }
    }
    const initial = cacheIsFresh ? null : window.setTimeout(() => void loadWeather(), 0);
    const interval = window.setInterval(() => void loadWeather(), 30 * 60_000);
    return () => {
      if (initial !== null) window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [loadWeather, phase]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setAccessError("");
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: accessCode }),
    });
    const data = await response.json();
    if (!response.ok) {
      setAccessError(data.error || "The access code did not work.");
      return;
    }
    setAccessCode("");
    setPhase("loading");
    await loadTrip();
  }

  async function sendSave(
    snapshot: TripItem[],
    action: string,
    revision: number,
    changedIds: string[],
    canRetry = true,
  ) {
    if (!navigator.onLine) {
      setSync("offline");
      setSyncMessage("Changes are held on this device until you reconnect.");
      localStorage.setItem(
        "japanTripPending",
        JSON.stringify({ items: snapshot, action, changedIds }),
      );
      return;
    }
    setSync("saving");
    const response = await fetch("/api/trip", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: snapshot,
        baseVersion: versionRef.current,
        changedBy: name,
        action,
      }),
    });
    const data = await response.json();
    if (
      response.status === 409 &&
      canRetry &&
      Array.isArray(data.items) &&
      changedIds.length
    ) {
      const changed = new Set(changedIds);
      const localChanged = new Map(
        snapshot
          .filter((item) => changed.has(item.id))
          .map((item) => [item.id, item]),
      );
      const merged = (data.items as TripItem[])
        .filter((item) => !changed.has(item.id) || localChanged.has(item.id))
        .map((item) => localChanged.get(item.id) ?? item);
      const remoteIds = new Set((data.items as TripItem[]).map((item) => item.id));
      for (const item of localChanged.values()) {
        if (!remoteIds.has(item.id)) merged.push(item);
      }

      versionRef.current = data.version;
      setVersion(data.version);
      setItems(merged);
      localStorage.setItem("japanTripCloudCache", JSON.stringify(merged));
      return sendSave(merged, `${action} · merged with family changes`, revision, changedIds, false);
    }
    if (!response.ok) {
      setSync("error");
      setSyncMessage(data.error || "The change could not be saved.");
      return;
    }
    versionRef.current = data.version;
    setVersion(data.version);
    setUpdatedBy(name);
    setUpdatedAt(new Date().toISOString());
    setHistory((current) => [
      { id: Date.now(), version: data.version, action, changedBy: name, changedAt: new Date().toISOString() },
      ...current,
    ].slice(0, 30));
    localStorage.setItem("japanTripCloudCache", JSON.stringify(snapshot));
    localStorage.removeItem("japanTripPending");
    if (revision === editRevisionRef.current) dirtyRef.current = false;
    setSync("saved");
    setSyncMessage("");
  }

  function commit(next: TripItem[], action: string) {
    const before = new Map(items.map((item) => [item.id, JSON.stringify(item)]));
    const after = new Map(next.map((item) => [item.id, JSON.stringify(item)]));
    const changedIds = [...new Set([...before.keys(), ...after.keys()])].filter(
      (id) => before.get(id) !== after.get(id),
    );
    const revision = ++editRevisionRef.current;
    dirtyRef.current = true;
    setItems(next);
    localStorage.setItem("japanTripCloudCache", JSON.stringify(next));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      saveChain.current = saveChain.current.then(() =>
        sendSave(next, action, revision, changedIds),
      );
    }, 550);
  }

  async function locateForMap(item: TripItem, original?: TripItem) {
    const mappable = ["hotel", "transport", "attraction", "meal"].includes(
      item.category,
    );
    const hasSearchablePlace = Boolean(
      item.location?.trim() ||
        (["hotel", "attraction"].includes(item.category) && item.title.trim()),
    );
    const placeChanged =
      !original ||
      original.title !== item.title ||
      original.location !== item.location ||
      original.category !== item.category;
    const hasCoordinates = Number.isFinite(item.lat) && Number.isFinite(item.lng);
    if (!mappable || !hasSearchablePlace || (hasCoordinates && !placeChanged)) {
      return item;
    }

    const located = { ...item };
    delete located.lat;
    delete located.lng;
    const query = [item.title.trim(), item.location?.trim(), "Japan"]
      .filter(Boolean)
      .join(", ");

    locatingRef.current = true;
    setLocating(true);
    setLocationMessage("");
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await fetch("/api/geocode", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query }),
        });
        if (response.status === 429 && attempt === 0) {
          const retrySeconds = Number(response.headers.get("retry-after") || 2);
          await new Promise((resolve) =>
            window.setTimeout(resolve, retrySeconds * 1000),
          );
          continue;
        }

        const data = await response.json();
        if (response.ok && Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
          return { ...located, lat: Number(data.lat), lng: Number(data.lng) };
        }
        setLocationMessage(
          `${item.title} was saved, but its map position needs a more specific location.`,
        );
        return located;
      }
    } catch {
      setLocationMessage(
        `${item.title} was saved, but automatic map placement is temporarily unavailable.`,
      );
    } finally {
      locatingRef.current = false;
      setLocating(false);
    }
    return located;
  }

  async function saveDraft(event: FormEvent) {
    event.preventDefault();
    if (!draft?.title.trim() || locatingRef.current) return;
    const original = items.find((item) => item.id === draft.id);
    const ready = await locateForMap(draft, original);
    const exists = Boolean(original);
    const next = exists
      ? items.map((item) => (item.id === ready.id ? ready : item))
      : [...items, ready];
    commit(next, `${exists ? "Updated" : "Added"} ${ready.title}`);
    setDraft(null);
  }

  function removeDraft() {
    if (!draft) return;
    commit(items.filter((item) => item.id !== draft.id), `Removed ${draft.title}`);
    setDraft(null);
  }

  function dropOnDay(date: string) {
    if (!dragging) return;
    const moved = items.find((item) => item.id === dragging);
    if (!moved) return setDragging(null);
    setPendingMove({ itemId: dragging, date, time: moved.time || "" });
    setDragging(null);
  }

  function dropOnItem(target: TripItem, before: boolean) {
    if (!dragging || dragging === target.id) return setDragging(null);
    const moved = items.find((item) => item.id === dragging);
    if (!moved) return setDragging(null);
    const ordered = sortItems(items.filter((item) => item.date === target.date && item.id !== moved.id));
    const targetIndex = ordered.findIndex((item) => item.id === target.id);
    const beforeItemId = before ? target.id : ordered[targetIndex + 1]?.id;
    setPendingMove({ itemId: moved.id, date: target.date, time: target.time || moved.time || "", beforeItemId });
    setDragging(null);
  }

  function confirmMove() {
    if (!pendingMove) return;
    const moved = items.find((item) => item.id === pendingMove.itemId);
    if (!moved) {
      setPendingMove(null);
      return;
    }
    const updated = items.map((item) => item.id === moved.id ? { ...item, date: pendingMove.date, time: pendingMove.time } : item);
    const targetDay = sortItems(updated.filter((item) => item.date === pendingMove.date && item.id !== moved.id));
    const insertionIndex = pendingMove.beforeItemId ? Math.max(0, targetDay.findIndex((item) => item.id === pendingMove.beforeItemId)) : targetDay.length;
    targetDay.splice(insertionIndex, 0, updated.find((item) => item.id === moved.id)!);
    const normalized = new Map(targetDay.map((item, index) => [item.id, (index + 1) * 10]));
    const next = updated.map((item) => normalized.has(item.id) ? { ...item, order: normalized.get(item.id) } : item);
    const change = moved.date === pendingMove.date
      ? `Reordered ${moved.title} on ${dateLabel(moved.date)} at ${pendingMove.time || "a flexible time"}`
      : `Moved ${moved.title} from ${dateLabel(moved.date)} to ${dateLabel(pendingMove.date)} at ${pendingMove.time || "a flexible time"}`;
    commit(next, change);
    setPendingMove(null);
  }

  function nextFrom(item: TripItem) {
    const dayItems = sortItems(
      items.filter(
        (candidate) =>
          candidate.date === item.date &&
          candidate.id !== item.id &&
          ["attraction", "transport", "meal"].includes(candidate.category),
      ),
    );
    return dayItems.find((candidate) => String(candidate.time ?? "") > String(item.time ?? ""));
  }

  async function importBackup(file: File) {
    try {
      const payload = JSON.parse(await file.text());
      const list = Array.isArray(payload) ? payload : payload.items;
      if (!Array.isArray(list) || list.length < 5) throw new Error();
      commit(list, `Imported ${file.name}`);
    } catch {
      alert("That file is not a valid Japan trip calendar backup.");
    }
  }

  function exportBackup() {
    const blob = new Blob([
      JSON.stringify({ app: "Japan Family Trip Calendar", version, exportedAt: new Date().toISOString(), items }, null, 2),
    ], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `japan-trip-calendar-v${version}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  async function resetDefaults() {
    const response = await fetch("/api/trip", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ baseVersion: versionRef.current, changedBy: name }),
    });
    const data = await response.json();
    if (!response.ok) {
      setSync("error");
      setSyncMessage(data.error || "The verified itinerary could not be restored.");
      if (response.status === 409) await loadTrip();
      return;
    }
    versionRef.current = data.version;
    setVersion(data.version);
    localStorage.removeItem("japanTripPending");
    await loadTrip();
  }

  const ticketItems = useMemo(
    () => sortItems(items.filter((item) => item.category === "ticket" || (item.ticketStatus === "to-buy" && item.category !== "attraction"))).sort((a, b) => a.date.localeCompare(b.date) || String(a.time).localeCompare(String(b.time))),
    [items],
  );
  const weatherByDate = useMemo(() => {
    const forecast = new Map<string, WeatherDay & { cityName: string }>();
    days.forEach((date) => {
      const city = weather?.cities.find((candidate) => candidate.id === weatherCityId(date));
      const day = city?.daily.find((candidate) => candidate.date === date);
      if (city && day) forecast.set(date, { ...day, cityName: city.name });
    });
    return forecast;
  }, [weather]);

  if (phase === "loading") {
    return <main className="access-screen"><div className="access-box"><div className="kicker">日本 · Family itinerary</div><h1>Opening the family calendar…</h1><p>Loading the latest shared copy.</p></div></main>;
  }

  if (phase === "locked") {
    return (
      <main className="access-screen">
        <form className="access-box" onSubmit={signIn}>
          <div className="enso" aria-hidden="true">日</div>
          <div className="kicker">Private family calendar</div>
          <h1>Japan, shared together</h1>
          <p>Enter the family access code to view or update the August 2026 itinerary.</p>
          <label htmlFor="accessCode">Family access code</label>
          <input id="accessCode" type="password" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} autoComplete="current-password" required autoFocus />
          {accessError && <p className="form-error" role="alert">{accessError}</p>}
          <button className="button primary" type="submit">Open calendar</button>
          <small>The code stays in a protected browser cookie and is never placed in the URL.</small>
        </form>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="hero">
        <div className="hero-copy">
          <div className="kicker">日本 · Shared family itinerary</div>
          <h1>Japan 2026</h1>
          <div className="hero-status">
            <div className={`sync ${sync}`}><span />{sync === "saved" ? "Shared copy saved" : sync === "saving" ? "Saving…" : sync === "offline" ? "Offline copy" : "Needs attention"}</div>
            <small>{updatedAt ? `Last saved by ${updatedBy} · ${new Date(updatedAt).toLocaleString()}` : `Shared version ${version}`}</small>
          </div>
        </div>
      </header>

      {syncMessage && <div className={`notice ${sync}`}>{syncMessage}</div>}
      {locationMessage && <div className="notice saved">{locationMessage}</div>}

      <nav className="tabs" aria-label="Calendar sections">
        {(["calendar", "transport", "tickets", "weather", "route", "history"] as const).map((tab) => (
          <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab === "tickets" ? "Passes & tickets" : tab[0].toUpperCase() + tab.slice(1)}</button>
        ))}
      </nav>

      <section className="toolbar">
        <div className="filters" aria-label="Show categories">
          {categories.map((category) => <button key={category} className={visible.has(category) ? "active" : ""} onClick={() => setVisible((current) => { const next = new Set(current); if (next.has(category)) next.delete(category); else next.add(category); return next; })}>{category}</button>)}
        </div>
        <div className="spacer" />
        <details className="settings-menu">
          <summary aria-label="Open calendar settings"><span aria-hidden="true">⚙</span><b className="settings-label">Settings</b></summary>
          <div className="settings-popover">
            <div><span className="kicker">Calendar controls</span><strong>Settings</strong></div>
            <label>Family member name<input value={name} onChange={(event) => { setName(event.target.value); localStorage.setItem("japanTripFamilyName", event.target.value); }} maxLength={60} /></label>
            <button className="button primary" onClick={() => setDraft(newItem())}>＋ Add item</button>
            <button className="button" onClick={exportBackup}>Export backup</button>
            <button className="button" onClick={() => importRef.current?.click()}>Import backup</button>
            <input ref={importRef} className="sr-only" type="file" accept="application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importBackup(file); event.target.value = ""; }} />
          </div>
        </details>
      </section>

      {activeTab === "calendar" && (
        <section className="calendar">
          {days.map((date) => {
            const dayItems = sortItems(items.filter((item) => item.date === date && visible.has(item.category)));
            const dayWeather = weatherByDate.get(date);
            const condition = weatherCondition(dayWeather?.weatherCode ?? null);
            return (
              <article className="day" key={date} onDragOver={(event) => event.preventDefault()} onDrop={() => dropOnDay(date)}>
                <header className="day-head"><div><small>{dateLabel(date).split(",")[0]}</small><h2>{dateLabel(date).replace(/^[^,]+,\s*/, "")}</h2><span>{dayHotel(date)}</span></div><div className="day-head-actions">{dayWeather && <button className="day-weather" onClick={() => setActiveTab("weather")} aria-label={`Open weather for ${dateLabel(date)}`}><span aria-hidden="true">{condition.icon}</span><strong>{weatherNumber(dayWeather.temperatureMax)}</strong><small>{dayWeather.cityName} · rain {weatherNumber(dayWeather.precipitationProbability, "%")}</small></button>}<button className="day-map-button" onClick={() => { setMapDate(date); setMapMode("day"); setActiveTab("route"); }}>Open map ↗</button></div></header>
                <div className="day-items">
                  {!dayItems.length && <div className="empty">No visible items</div>}
                  {dayItems.map((item) => {
                    const isFlipped = flipped === item.id;
                    const next = nextFrom(item);
                    const photo = itemImage(item);
                    const areaKey = areaByItem[item.id];
                    const areaGuide = areaGuides[areaKey];
                    const restaurantGuide = restaurantGuides[areaKey];
                    const transportGuide = transportGuides[transportGuideByItem[item.id]] || (item.category === "transport" ? transportGuides.metro : undefined);
                    const canFlip = ["attraction", "hotel", "transport", "meal"].includes(item.category);
                    return (
                      <div className={`item-card ${isFlipped ? "flipped" : ""} ${dragging === item.id ? "dragging" : ""}`} data-category={item.category} key={item.id} draggable onDragStart={() => setDragging(item.id)} onDragEnd={() => setDragging(null)} onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); event.currentTarget.dataset.dropEdge = event.clientY < rect.top + rect.height / 2 ? "before" : "after"; }} onDragLeave={(event) => { delete event.currentTarget.dataset.dropEdge; }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); const before = event.currentTarget.dataset.dropEdge !== "after"; delete event.currentTarget.dataset.dropEdge; dropOnItem(item, before); }} onClick={(event) => { if ((event.target as HTMLElement).closest("button,a")) return; if (canFlip) setFlipped(isFlipped ? null : item.id); else setDraft({ ...item }); }}>
                        {["attraction", "hotel"].includes(item.category) && photo && <figure className="card-photo">
                          {/* Local trip photos must bypass the unavailable hosted image optimizer. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo.imageUrl} alt={`${item.title} in Japan`} loading="lazy" decoding="async" />
                          {isFlipped && photo.imageSource && <figcaption><a href={photo.imageSource} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>{photo.imageCredit || "Photo source"} ↗</a></figcaption>}
                        </figure>}
                        {!isFlipped ? <>
                          <div className="card-top"><span>{item.category}</span><time>{item.time}</time></div>
                          <h3>{item.title}</h3><div className="card-actions"><button className="move-item" aria-label={`Move or reschedule ${item.title}`} onClick={() => setPendingMove({ itemId: item.id, date: item.date, time: item.time || "" })}>Move</button><button className="edit" aria-label={`Edit ${item.title}`} onClick={() => setDraft({ ...item })}>•••</button></div>
                          <div className="location">{item.location}</div>
                          {item.notes && <p>{item.notes}</p>}
                          <div className={`status ${item.ticketStatus || "not-needed"}`}><i />{item.ticketStatus === "booked" ? "Booked" : item.ticketStatus === "to-buy" ? "To buy / confirm" : "No advance ticket / conditional"}{item.quantity ? ` · ${item.quantity}` : ""}{item.cost ? ` · ${item.cost}` : ""}</div>
                          {canFlip && <div className="flip-hint">{item.category === "transport" ? "Tap for booking, seats & views ↻" : item.category === "meal" ? "Tap for nearby restaurant choices ↻" : "Tap for secrets, food & local tips ↻"}</div>}
                        </> : <>
                          <div className="back-label">{item.category === "transport" ? "Booking intelligence" : item.category === "hotel" ? "Around your hotel" : item.category === "meal" ? "Eat nearby" : "What you are seeing"}</div><h3>{item.title}</h3>
                          {item.category !== "transport" && <p>{descriptions[item.title] || (item.notes && !item.notes.startsWith("Click for") ? item.notes : `A planned stop in ${item.location || "Japan"}. Use the official link for the latest admission and visitor information.`)}</p>}
                          {areaGuide && <>
                            <div className="local-tip"><div className="back-label">Insider move</div><p>{areaGuide.tip}</p></div>
                            <div className="local-picks">
                              {areaGuide.picks.filter((pick) => pick.kind !== "Top restaurant").slice(0, 2).map((pick) => { const reservation = reservationAdvice(pick.kind, pick.detail); return <article className="local-pick" key={`${item.id}-${pick.kind}-${pick.name}`}><div><span>{pick.kind}{pick.when ? ` · ${pick.when}` : ""}</span><b>{pick.walk}</b></div><strong>{pick.name}</strong><p>{pick.detail}</p>{reservation && <em className={reservation.link ? "reserve" : "walk-in"}>{reservation.label}</em>}<div className="pick-links"><a href={mapsSearchUrl(pick.query)} target="_blank" rel="noreferrer">{pick.kind === "Hidden/local" ? "Open place" : "Restaurant / place"} ↗</a>{reservation?.link && <a href={reservationSearchUrl(pick.query)} target="_blank" rel="noreferrer">Check tables / reserve ↗</a>}</div></article>; })}
                              {areaGuide.picks.filter((pick) => pick.kind !== "Top restaurant").length > 2 && <details className="more-nearby"><summary>More nearby ({areaGuide.picks.filter((pick) => pick.kind !== "Top restaurant").length - 2})</summary>{areaGuide.picks.filter((pick) => pick.kind !== "Top restaurant").slice(2).map((pick) => { const reservation = reservationAdvice(pick.kind, pick.detail); return <article className="local-pick" key={`${item.id}-${pick.kind}-${pick.name}`}><div><span>{pick.kind}{pick.when ? ` · ${pick.when}` : ""}</span><b>{pick.walk}</b></div><strong>{pick.name}</strong><p>{pick.detail}</p>{reservation && <em className={reservation.link ? "reserve" : "walk-in"}>{reservation.label}</em>}<div className="pick-links"><a href={mapsSearchUrl(pick.query)} target="_blank" rel="noreferrer">{pick.kind === "Hidden/local" ? "Open place" : "Restaurant / place"} ↗</a>{reservation?.link && <a href={reservationSearchUrl(pick.query)} target="_blank" rel="noreferrer">Check tables / reserve ↗</a>}</div></article>; })}</details>}
                            </div>
                          </>}
                          {restaurantGuide && item.category !== "transport" && <RestaurantDirectory guide={restaurantGuide} />}
                          {transportGuide && <div className="transport-guide">
                            <article><div className="back-label">Booking & class</div><p>{transportGuide.booking}</p></article>
                            <article><div className="back-label">Best seats & views</div><p>{transportGuide.seats}</p></article>
                            <article><div className="back-label">Bags</div><p>{transportGuide.luggage}</p></article>
                            <article><div className="back-label">If plans slip</div><p>{transportGuide.fallback}</p></article>
                          </div>}
                          {item.category === "attraction" && <div className="next-stop"><div className="back-label">Transport from this attraction</div><strong>{next ? next.title : `Return to ${dayHotel(date)}`}</strong><span>{next ? `${next.time || "Next"} · ${next.location || ""}` : "End of the planned route"}</span><a href={directionsUrl(`${item.title} ${item.location}`, next ? `${next.title} ${next.location}` : dayHotel(date))} target="_blank" rel="noreferrer">Open directions ↗</a></div>}
                          {item.link && <a className="official" href={item.link} target="_blank" rel="noreferrer">Official information ↗</a>}
                          <button type="button" className="flip-back" onClick={() => setFlipped(null)}>Back to itinerary ↻</button>
                        </>}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {activeTab === "transport" && <TransportPanel items={items} onEdit={(item) => setDraft({ ...item })} />}
      {activeTab === "tickets" && <TicketsPanel items={ticketItems} onEdit={(item) => setDraft({ ...item })} />}
      {activeTab === "weather" && <WeatherPanel weather={weather} loading={weatherLoading} error={weatherError} onRefresh={loadWeather} />}
      {activeTab === "route" && <RoutePanel items={items} selectedDate={mapDate} onDateChange={setMapDate} mode={mapMode} onModeChange={setMapMode} />}
      {activeTab === "history" && <HistoryPanel history={history} />}

      <footer><span>Shared family version {version}</span><button onClick={async () => { await fetch("/api/logout", { method: "POST" }); setPhase("locked"); }}>Lock calendar</button></footer>

      {draft && <Editor item={draft} setItem={setDraft} onSave={saveDraft} onDelete={removeDraft} onClose={() => setDraft(null)} onReset={() => { if (confirm("Restore the verified complete itinerary for everyone?")) { setDraft(null); void resetDefaults(); } }} busy={locating} />}
      {pendingMove && (() => {
        const moved = items.find((item) => item.id === pendingMove.itemId);
        if (!moved) return null;
        return <MoveDialog item={moved} date={pendingMove.date} time={pendingMove.time} reordered={Boolean(pendingMove.beforeItemId) || moved.date === pendingMove.date} onDateChange={(date) => setPendingMove({ ...pendingMove, date, beforeItemId: date === pendingMove.date ? pendingMove.beforeItemId : undefined })} onTimeChange={(time) => setPendingMove({ ...pendingMove, time })} onConfirm={confirmMove} onCancel={() => setPendingMove(null)} />;
      })()}
    </main>
  );
}

function MoveDialog({ item, date, time, reordered, onDateChange, onTimeChange, onConfirm, onCancel }: { item: TripItem; date: string; time: string; reordered: boolean; onDateChange: (date: string) => void; onTimeChange: (time: string) => void; onConfirm: () => void; onCancel: () => void }) {
  const unchanged = item.date === date && (item.time || "") === time && !reordered;
  return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="move-title">
    <section className="move-dialog">
      <div className="kicker">Confirm calendar change</div>
      <h2 id="move-title">Move {item.title}?</h2>
      <p>This will update its day, time and position on the shared calendar. The route map will rebuild automatically.</p>
      <div className="move-summary"><span><small>From</small><strong>{dateLabel(item.date)} · {item.time || "Flexible"}</strong></span><b aria-hidden="true">→</b><div className="move-fields"><label><small>Move to</small><select value={date} onChange={(event) => onDateChange(event.target.value)}>{days.map((day) => <option key={day} value={day}>{dateLabel(day)}</option>)}</select></label><label><small>Start time</small><input type="time" value={time} onChange={(event) => onTimeChange(event.target.value)} /></label></div></div>
      {reordered && <p className="move-hint">The item will be placed at the position where you dropped it.</p>}
      {unchanged && <p className="move-hint">Choose a different day or time, or drag the card above or below another item.</p>}
      <footer><button type="button" onClick={onCancel}>Cancel</button><button type="button" className="primary" onClick={onConfirm} disabled={unchanged}>Confirm move</button></footer>
    </section>
  </div>;
}

function WeatherPanel({ weather, loading, error, onRefresh }: { weather: WeatherPayload | null; loading: boolean; error: string; onRefresh: () => Promise<void> }) {
  const updated = weather?.generatedAt
    ? new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Tokyo", timeZoneName: "short" }).format(new Date(weather.generatedAt))
    : "Not loaded";

  return <section className="weather-panel">
    <header className="weather-head">
      <div><div className="kicker">Live Japan conditions</div><h2>Weather & heat plan</h2><p>Current conditions refresh automatically every 30 minutes. The primary forecast reaches up to 16 days; later trip dates will appear automatically.</p></div>
      <div><small>Updated {updated}</small><button type="button" onClick={() => void onRefresh()} disabled={loading}>{loading ? "Refreshing…" : "Refresh weather"}</button></div>
    </header>
    {error && <div className={weather ? "weather-warning" : "weather-error"} role="alert">{error}{weather ? "" : " Try again in a moment."}</div>}
    {!weather && loading && <div className="weather-loading">Loading current weather for the trip cities…</div>}
    {weather && <>
      <div className="weather-section-title"><div className="back-label">Right now</div><h3>Current conditions across the route</h3></div>
      <div className="current-weather-grid">
        {weather.cities.map((city) => {
          const condition = weatherCondition(city.current.weatherCode);
          return <article key={city.id}>
            <div className="weather-city"><div><span aria-hidden="true">{condition.icon}</span><strong>{city.name}</strong></div><em>{japanTime(city.current.time)} JST</em></div>
            <b>{weatherNumber(city.current.temperature)}</b><p>{condition.label} · feels {weatherNumber(city.current.apparentTemperature)}</p>
            <dl><div><dt>Humidity</dt><dd>{weatherNumber(city.current.humidity, "%")}</dd></div><div><dt>Wind</dt><dd>{weatherNumber(city.current.windSpeed, " km/h")}</dd></div><div><dt>Rain now</dt><dd>{weatherNumber(city.current.precipitation, " mm")}</dd></div></dl>
          </article>;
        })}
      </div>

      <div className="weather-section-title"><div className="back-label">Aug 6–22 itinerary</div><h3>Rolling trip forecast</h3><p>Long-range model guidance is less certain. Treat forecasts beyond 7–10 days as planning signals and recheck each evening in Japan.</p></div>
      <div className="trip-weather-grid">
        {days.map((date) => {
          const city = weather.cities.find((candidate) => candidate.id === weatherCityId(date));
          const day = city?.daily.find((candidate) => candidate.date === date);
          if (!day) return <article className="trip-weather pending" key={date}><header><div><small>{dateLabel(date)}</small><strong>{city?.name || weatherCityId(date)}</strong></div><span aria-hidden="true">◌</span></header><h4>Forecast not open yet</h4><p>This date should enter the 16-day window around {forecastOpens(date)}. It will load automatically.</p></article>;
          const condition = weatherCondition(day.weatherCode);
          const plan = weatherPlan(day);
          return <article className="trip-weather" key={date}>
            <header><div><small>{dateLabel(date)}</small><strong>{city?.name}</strong></div><span aria-hidden="true">{condition.icon}</span></header>
            <div className="forecast-temperatures"><b>{weatherNumber(day.temperatureMax)}</b><span>low {weatherNumber(day.temperatureMin)}</span></div>
            <p>{condition.label} · feels up to {weatherNumber(day.apparentTemperatureMax)}</p>
            <dl><div><dt>Rain</dt><dd>{weatherNumber(day.precipitationProbability, "%")}</dd></div><div><dt>UV max</dt><dd>{weatherNumber(day.uvIndexMax, "")}</dd></div><div><dt>Sun</dt><dd>{japanTime(day.sunrise)}–{japanTime(day.sunset)}</dd></div></dl>
            <div className={`weather-plan ${plan.tone}`}><strong>{plan.label}</strong><span>{plan.detail}</span></div>
          </article>;
        })}
      </div>
      <footer className="weather-credit">Current source: <a href={weather.providerUrl || "https://open-meteo.com/"} target="_blank" rel="noreferrer">{weather.provider} ↗</a>. Forecasts are guidance, not safety guarantees; follow local heat, typhoon and transport alerts.</footer>
    </>}
  </section>;
}

function TransportPanel({ items, onEdit }: { items: TripItem[]; onEdit: (item: TripItem) => void }) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const plan = transportPlanIds.map((id) => byId.get(id)).filter((item): item is TripItem => Boolean(item));
  const bookingChannel = (id: string) => {
    if (id === "hk-luggage") return "Arrange at Shiomi Prince desk";
    if (["t2", "t3", "t8"].includes(id)) return "Book in SmartEX";
    if (["t5", "t7"].includes(id)) return "Reserve in JR West with pass";
    if (id === "t9") return "Book in JR East / station office";
    if (id === "t1") return "Buy after customs";
    return "No advance reservation";
  };
  return <section className="transport-panel" aria-labelledby="transport-title">
    <header className="transport-panel-head">
      <div><div className="kicker">Verified booking plan</div><h2 id="transport-title">Trains, passes & best seats</h2></div>
      <p>Long-distance times below match the published August 2026 timetable. Local services remain targets: check the live platform board for delays or service changes.</p>
    </header>

    <div className="transport-pass-grid">
      <article><span>Buy digitally</span><h3>Hakone Freepass</h3><strong>4 adults · ¥24,000</strong><p>Odawara-origin two-day pass. Buy before Aug 10; use for bus, Tozan train, cable car and ropeway.</p><a href="https://www.hakonenavi.jp/international/en/discount_passes/free_pass" target="_blank" rel="noreferrer">Official pass ↗</a></article>
      <article><span>Buy now</span><h3>Kansai–Hiroshima Area Pass</h3><strong>4 adults · ¥68,000</strong><p>Activate Aug 14–18. Covers Sanyo Shinkansen reservations, eligible regional JR trains and the JR Miyajima ferry.</p><a href="https://www.westjr.co.jp/travel-information/en/tickets-passes/jrwest-rail-pass/kansai_hiroshima/" target="_blank" rel="noreferrer">Buy / reserve with JR West ↗</a></article>
      <article><span>Set up on arrival</span><h3>Four IC cards</h3><strong>One adult card each</strong><p>Use for local JR, subways, private rail and buses. They do not replace reserved Shinkansen or N’EX tickets.</p><a href="https://www.jreast.co.jp/en/multi/welcomesuica/welcomesuica.html" target="_blank" rel="noreferrer">Welcome Suica ↗</a></article>
      <article className="skip"><span>Do not buy</span><h3>Unneeded passes</h3><strong>Save the money</strong><p>Skip the nationwide JR Pass, N’EX round-trip ticket, Tokyo Subway Pass, Osaka Amazing Pass and Kintetsu pass for this itinerary.</p></article>
    </div>

    <div className="transport-source-bar"><strong>Official booking sites</strong><a href="https://smart-ex.jp/en/index.php" target="_blank" rel="noreferrer">SmartEX ↗</a><a href="https://global.jr-central.co.jp/en/info/timetable/index.html" target="_blank" rel="noreferrer">JR Central timetable ↗</a><a href="https://www.jreast.co.jp/en/multi/nex/" target="_blank" rel="noreferrer">Narita Express ↗</a><a href="https://jr-miyajimaferry.co.jp/en/timetable/" target="_blank" rel="noreferrer">Miyajima ferry ↗</a></div>

    <div className="transport-timeline">
      {plan.map((item) => {
        const guide = transportGuides[transportGuideByItem[item.id]] || transportGuides.metro;
        const bookable = item.ticketStatus === "to-buy";
        return <article className="transport-plan-card" key={item.id}>
          <div className="transport-plan-time"><small>{dateLabel(item.date)}</small><strong>{item.time}</strong><span className={bookable ? "book" : "ride"}>{bookingChannel(item.id)}</span></div>
          <div className="transport-plan-main"><h3>{item.title}</h3><p>{item.notes}</p>{item.fareDetails && <strong className="seat-summary">{item.fareDetails}</strong>}
            <details><summary>Seats, luggage & backup</summary><dl><div><dt>Best seats</dt><dd>{guide.seats}</dd></div><div><dt>Luggage</dt><dd>{guide.luggage}</dd></div><div><dt>If delayed</dt><dd>{guide.fallback}</dd></div></dl></details>
          </div>
          <div className="transport-plan-actions">{item.link && <a href={item.link} target="_blank" rel="noreferrer">Official website ↗</a>}<button type="button" onClick={() => onEdit(item)}>{item.ticketStatus === "booked" ? "View confirmation" : "Add confirmation"}</button></div>
        </article>;
      })}
    </div>

    <aside className="transport-rule"><strong>Family seat rule</strong><p>All four travelers use adult rail fares. On ordinary Tokaido/Sanyo Shinkansen cars, request two consecutive D/E pairs—such as 12D/E and 13D/E. E is the Mount Fuji-side window on the Tokaido line. If any suitcase totals 161–250 cm across three dimensions, select “seat with oversized baggage area” while booking.</p><a href="https://smart-ex.jp/en/entraining/oversized-baggage/" target="_blank" rel="noreferrer">Official oversized-baggage rules ↗</a></aside>
  </section>;
}

function TicketsPanel({ items, onEdit }: { items: TripItem[]; onEdit: (item: TripItem) => void }) {
  const curated = items.filter((item) => preDepartureNow.has(item.id) || preDepartureConfirm.has(item.id) || item.id === "tk5");
  const booked = curated.filter((item) => item.ticketStatus === "booked");
  const bookNow = curated.filter((item) => item.ticketStatus !== "booked" && preDepartureNow.has(item.id));
  const confirmSoon = curated.filter((item) => item.ticketStatus !== "booked" && preDepartureConfirm.has(item.id));
  return <section>
    <section className="departure-panel" aria-labelledby="departure-title">
      <header><div className="kicker">Before leaving Canada</div><h2 id="departure-title">Pre-departure bookings</h2><p>Book the capacity-limited items first, then confirm taxis, luggage and meals. Mark an item “Booked” and it moves automatically to Completed.</p></header>
      <div className="departure-columns">
        <DepartureGroup title="Book now" tone="urgent" items={bookNow} onEdit={onEdit} empty="All priority bookings are complete." />
        <DepartureGroup title="Confirm before departure" tone="soon" items={confirmSoon} onEdit={onEdit} empty="All trip logistics are confirmed." />
        <DepartureGroup title="Completed" tone="done" items={booked} onEdit={onEdit} empty="Booked items will appear here." />
      </div>
    </section>
    <div className="pass-grid"><article className="pass-card"><span>Recommended</span><h2>Hakone Freepass</h2><strong>¥24,000 family</strong><p>Four Odawara-origin passes for the buses, Tozan train, cable car and ropeway.</p></article><article className="pass-card"><span>Recommended</span><h2>Kansai–Hiroshima Area Pass</h2><strong>¥68,000 family</strong><p>Four five-day adult passes, activated Aug 14, covering the eligible regional JR journeys.</p></article><article className="pass-card"><span>Use throughout</span><h2>Four IC cards</h2><strong>Pay as used</strong><p>For ordinary city trains, subways and buses. Reserved intercity trains remain separate.</p></article></div>
    <div className="ticket-list"><h2>Complete purchase and confirmation list</h2>{items.map((item) => <div className="ticket-row" key={item.id}><small>{dateLabel(item.date)}<br />{item.time}</small><div><strong>{item.title}</strong><span>{[item.quantity, item.cost || item.location, item.ticketStatus === "booked" ? "Booked" : "To buy"].filter(Boolean).join(" · ")}</span>{item.fareDetails && <span>{item.fareDetails}</span>}</div><button type="button" onClick={() => onEdit(item)}>Edit</button></div>)}</div>
  </section>;
}

function DepartureGroup({ title, tone, items, onEdit, empty }: { title: string; tone: "urgent" | "soon" | "done"; items: TripItem[]; onEdit: (item: TripItem) => void; empty: string }) {
  return <section className={`departure-group ${tone}`}><h3>{title}<span>{items.length}</span></h3>{!items.length && <p className="departure-empty">{empty}</p>}<div>{items.map((item) => <article key={item.id}><button type="button" onClick={() => onEdit(item)} aria-label={`Edit ${item.title}`}><small>{dateLabel(item.date)} · {item.time}</small><strong>{item.title}</strong><span>{item.ticketStatus === "booked" ? `Booked${item.confirmation ? ` · ${item.confirmation}` : ""}` : item.cost || "Open to update or book"}</span></button>{item.link && <a href={item.link} target="_blank" rel="noreferrer" aria-label={`Open booking page for ${item.title}`}>Book ↗</a>}</article>)}</div></section>;
}

function RoutePanel({ items, selectedDate, onDateChange, mode, onModeChange }: { items: TripItem[]; selectedDate: string; onDateChange: (date: string) => void; mode: "day" | "master"; onModeChange: (mode: "day" | "master") => void }) {
  const points = useMemo(() => mode === "master" ? masterMapPoints(items) : dayMapPoints(selectedDate, items), [items, mode, selectedDate]);
  const relevantItems = mode === "master"
    ? items.filter((item) => ["hotel", "attraction"].includes(item.category))
    : items.filter((item) => item.date === selectedDate && ["hotel", "transport", "attraction", "meal"].includes(item.category));
  const withoutCoordinates = relevantItems.filter((item) => !hasCoordinates(item)).length;

  return <section className="map-panel">
    <header className="map-panel-head">
      <div><div className="kicker">OpenStreetMap route planner</div><h2>{mode === "master" ? "Complete Japan route" : dateLabel(selectedDate)}</h2><p>{mode === "master" ? "Hotels and attraction stops update automatically when the family calendar changes." : `Starts from ${dayStartHotel(selectedDate)[1]} and follows the mapped agenda in time order.`}</p></div>
      <div className="map-controls"><button className={mode === "master" ? "active" : ""} onClick={() => onModeChange("master")}>Master map</button><button className={mode === "day" ? "active" : ""} onClick={() => onModeChange("day")}>Day map</button>{mode === "day" && <select aria-label="Map date" value={selectedDate} onChange={(event) => onDateChange(event.target.value)}>{days.map((date) => <option key={date} value={date}>{dateLabel(date)}</option>)}</select>}</div>
    </header>
    <div className="map-layout">
      <div className="map-canvas-wrap"><OpenTripMap points={points} master={mode === "master"} /><div className="map-note">Pinch, scroll or use ＋/− to zoom; “Fit route” resets the view. Planning line only—use the leg links for live walking or public-transit directions. {withoutCoordinates ? `${withoutCoordinates} agenda ${withoutCoordinates === 1 ? "item has" : "items have"} no coordinates yet.` : "Every relevant stop is mapped."}</div></div>
      <div className="map-itinerary">
        <h3>{mode === "master" ? `${points.length} mapped trip stops` : `${points.length} route points`}</h3>
        <div className="map-stop-list">{points.map((point, index) => {
          const previous = points[index - 1];
          const distance = previous ? haversine(previous, point) : 0;
          const osm = `https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lng}#map=17/${point.lat}/${point.lng}`;
          const transit = previous ? directionsUrl(`${previous.lat},${previous.lng}`, `${point.lat},${point.lng}`) : "";
          return <article className="map-stop" key={`${point.id}-${index}`}><span className={`map-stop-number ${point.category}`}>{point.label}</span><div><strong>{point.title}</strong><small>{point.subtitle}{previous ? ` · ${distanceLabel(distance)} straight-line` : ""}</small><nav><a href={osm} target="_blank" rel="noreferrer">OpenStreetMap ↗</a>{transit && <a href={transit} target="_blank" rel="noreferrer">Transit directions ↗</a>}</nav></div></article>;
        })}</div>
      </div>
    </div>
    {mode === "master" && <div className="route-chain">{hotelSchedule.map(([date, hotel], index) => <span key={date}>{index > 0 && <b>→</b>}<i>{hotel}<small>{dateLabel(date)}</small></i></span>)}</div>}
  </section>;
}

function HistoryPanel({ history }: { history: HistoryItem[] }) {
  return <section className="history-panel"><div><div className="kicker">Shared memory</div><h2>Recent family changes</h2><p>The current itinerary is saved in the cloud. This log helps everyone see what changed and who changed it.</p></div><div className="history-list">{!history.length && <p>No shared edits yet.</p>}{history.map((entry) => <article key={entry.id}><span>v{entry.version}</span><div><strong>{entry.action}</strong><small>{entry.changedBy} · {new Date(entry.changedAt).toLocaleString()}</small></div></article>)}</div></section>;
}

function Editor({ item, setItem, onSave, onDelete, onClose, onReset, busy = false }: { item: TripItem; setItem: (item: TripItem) => void; onSave: (event: FormEvent) => void; onDelete: () => void; onClose: () => void; onReset: () => void; busy?: boolean }) {
  const update = (key: keyof TripItem, value: string) => setItem({ ...item, [key]: value });
  return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="editor-title"><form className="editor" onSubmit={onSave}><header><h2 id="editor-title">Edit itinerary item</h2><button type="button" onClick={onClose} aria-label="Close" disabled={busy}>×</button></header><div className="form-grid"><label>Date<input type="date" min="2026-08-06" max="2026-08-22" value={item.date} onChange={(event) => update("date", event.target.value)} required /></label><label>Time<input value={item.time || ""} onChange={(event) => update("time", event.target.value)} placeholder="09:00–10:30" /></label><label>Category<select value={item.category} onChange={(event) => update("category", event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Ticket status<select value={item.ticketStatus || "not-needed"} onChange={(event) => update("ticketStatus", event.target.value)}><option value="to-buy">To buy</option><option value="booked">Booked</option><option value="not-needed">Not needed / conditional</option></select></label><label className="wide">Title<input value={item.title} onChange={(event) => update("title", event.target.value)} required /></label><label className="wide">Location<input value={item.location || ""} onChange={(event) => update("location", event.target.value)} /></label><label>Confirmation number<input value={item.confirmation || ""} onChange={(event) => update("confirmation", event.target.value)} /></label><label>Cost<input value={item.cost || ""} onChange={(event) => update("cost", event.target.value)} /></label><label>Quantity / travelers<input value={item.quantity || ""} onChange={(event) => update("quantity", event.target.value)} /></label><label>Fare details<input value={item.fareDetails || ""} onChange={(event) => update("fareDetails", event.target.value)} /></label><label className="wide">Official link<input type="url" value={item.link || ""} onChange={(event) => update("link", event.target.value)} /></label><label className="wide">Notes<textarea value={item.notes || ""} onChange={(event) => update("notes", event.target.value)} /></label></div><footer><button type="button" className="danger" onClick={onDelete} disabled={busy}>Delete</button><button type="button" className="quiet" onClick={onReset} disabled={busy}>Restore defaults</button><span /><button type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="primary" type="submit" disabled={busy}>{busy ? "Finding map location…" : "Save for family"}</button></footer></form></div>;
}
