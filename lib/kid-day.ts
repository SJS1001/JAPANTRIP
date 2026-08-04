export type KidDayInputItem = Readonly<{
  id: string;
  date: string;
  time?: string;
  category: string;
  title: string;
  location?: string;
  order?: number;
  [key: string]: unknown;
}>;

export type KidDayItem = {
  id: string;
  date: string;
  time?: string;
  category: string;
  title: string;
  location?: string;
  suggestion: string;
};

export type KidDaySection = {
  id: "now" | "next" | "later" | "morning" | "afternoon" | "evening";
  label: "Now" | "Next" | "Later" | "Morning" | "Afternoon" | "Evening";
  items: KidDayItem[];
};

export type KidDayViewModel = {
  date: string;
  grouping: "current" | "day-parts";
  sections: KidDaySection[];
  emptyMessage: string | null;
  currentLocation: {
    itemId: string;
    name: string;
    status: "planned";
  } | null;
  hotel: {
    itemId: string;
    name: string;
    location?: string;
    address?: string;
    nearestStation?: string;
    meetupNote?: string;
    directionsQuery: string;
  } | null;
};

export type HotelSafetyInfo = Readonly<{
  address?: string;
  nearestStation?: string;
  meetupNote?: string;
}>;

export type KidDayOptions = Readonly<{
  selectedDate?: string;
  now?: Date | string | number;
  hotelSafety?: Readonly<Record<string, HotelSafetyInfo>>;
}>;

const japanClock = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function japanDateAndMinutes(now: Date) {
  const parts = japanClock.formatToParts(now);
  const value = (type: "year" | "month" | "day" | "hour" | "minute") =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

export function japanTripDate(now: Date | string | number = Date.now()) {
  return japanDateAndMinutes(new Date(now)).date;
}

function startMinutes(time?: string) {
  const match = time?.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function inferredStartMinutes(item: KidDayInputItem) {
  const explicit = startMinutes(item.time);
  if (explicit !== null) return explicit;

  const hint = `${item.time ?? ""} ${item.title}`.toLocaleLowerCase("en");
  if (/breakfast|morning|dawn|sunrise|check[ -]?out/.test(hint)) return 9 * 60;
  if (/lunch|noon/.test(hint)) return 13 * 60;
  if (/dinner|evening|night|sunset/.test(hint)) return 18 * 60;
  if (item.category === "hotel" || /check[ -]?in/.test(hint)) return 15 * 60;
  return 13 * 60;
}

function safeItem(item: KidDayInputItem): KidDayItem {
  const suggestion = item.category === "transport"
    ? "Stay with the family, follow station signs, and have your ticket or IC card ready."
    : item.category === "attraction"
      ? "Bring water and comfortable shoes; check the live heat and weather update before leaving."
      : item.category === "meal"
        ? "Tell an adult about allergies or dietary needs before ordering."
        : item.category === "hotel"
          ? "Use this as the family meeting point if anyone gets separated."
          : item.category === "ticket"
            ? "Open the approved ticket or pass before reaching the entrance."
            : "Check this reminder with the family before moving on.";
  return {
    id: item.id,
    date: item.date,
    ...(item.time?.trim() ? { time: item.time.trim() } : {}),
    category: item.category,
    title: item.title,
    ...(item.location?.trim() ? { location: item.location.trim() } : {}),
    suggestion,
  };
}

function hotelForDate(
  items: readonly KidDayInputItem[],
  date: string,
  approvedSafety: Readonly<Record<string, HotelSafetyInfo>> = {},
): KidDayViewModel["hotel"] {
  const hotel = items
    .filter((item) => item.category === "hotel" && item.date <= date)
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.date.localeCompare(b.item.date) || a.index - b.index)
    .at(-1)?.item;

  if (!hotel) return null;
  const location = hotel.location?.trim() || undefined;
  const name = hotel.title.trim() || "Hotel";
  const safety = approvedSafety[hotel.id];
  const address = safety?.address?.trim() || undefined;
  const nearestStation = safety?.nearestStation?.trim() || undefined;
  const meetupNote = safety?.meetupNote?.trim() || undefined;
  return {
    itemId: hotel.id,
    name,
    ...(location ? { location } : {}),
    ...(address ? { address } : {}),
    ...(nearestStation ? { nearestStation } : {}),
    ...(meetupNote ? { meetupNote } : {}),
    directionsQuery: [name, address ?? location].filter(Boolean).join(", "),
  };
}

function currentSections(items: readonly KidDayInputItem[], minutes: number): KidDaySection[] {
  const timed = items
    .map((item, index) => ({ item, index, start: startMinutes(item.time) }))
    .sort((a, b) => {
      if (a.start === null && b.start === null) return (a.item.order ?? a.index) - (b.item.order ?? b.index);
      if (a.start === null) return 1;
      if (b.start === null) return -1;
      return a.start - b.start || (a.item.order ?? a.index) - (b.item.order ?? b.index);
    });
  const started = timed.filter((entry) => entry.start !== null && entry.start <= minutes);
  const future = timed.filter((entry) => entry.start !== null && entry.start > minutes);
  const untimed = timed.filter((entry) => entry.start === null);
  const now = started.at(-1);
  const next = future[0];

  return [
    { id: "now", label: "Now", items: now ? [safeItem(now.item)] : [] },
    { id: "next", label: "Next", items: next ? [safeItem(next.item)] : [] },
    { id: "later", label: "Later", items: [...future.slice(1), ...untimed].map((entry) => safeItem(entry.item)) },
  ];
}

function dayPartSections(items: readonly KidDayInputItem[]): KidDaySection[] {
  const ordered = items
    .map((item, index) => ({ item, index, start: inferredStartMinutes(item) }))
    .sort((a, b) => a.start - b.start || (a.item.order ?? a.index) - (b.item.order ?? b.index));

  return [
    {
      id: "morning",
      label: "Morning",
      items: ordered.filter((entry) => entry.start < 12 * 60).map((entry) => safeItem(entry.item)),
    },
    {
      id: "afternoon",
      label: "Afternoon",
      items: ordered
        .filter((entry) => entry.start >= 12 * 60 && entry.start < 17 * 60)
        .map((entry) => safeItem(entry.item)),
    },
    {
      id: "evening",
      label: "Evening",
      items: ordered.filter((entry) => entry.start >= 17 * 60).map((entry) => safeItem(entry.item)),
    },
  ];
}

function plannedLocation(
  items: readonly KidDayInputItem[],
  minutes: number,
): KidDayViewModel["currentLocation"] {
  const candidates = items
    .filter((item) => !["ticket", "note"].includes(item.category) && item.location?.trim())
    .map((item, index) => ({ item, index, start: startMinutes(item.time) }))
    .filter((entry): entry is typeof entry & { start: number } => entry.start !== null)
    .sort((a, b) => a.start - b.start || (a.item.order ?? a.index) - (b.item.order ?? b.index));
  const current = candidates.filter((entry) => entry.start <= minutes).at(-1) ?? candidates[0];

  return current
    ? { itemId: current.item.id, name: current.item.location!.trim(), status: "planned" }
    : null;
}

export function projectKidDay(
  items: readonly KidDayInputItem[],
  options: KidDayOptions = {},
): KidDayViewModel {
  const now = new Date(options.now ?? Date.now());
  const japanNow = japanDateAndMinutes(now);
  const date = options.selectedDate ?? japanNow.date;
  const dayItems = items.filter((item) => item.date === date);
  const grouping = date === japanNow.date ? "current" : "day-parts";
  const sections = grouping === "current"
    ? currentSections(dayItems, japanNow.minutes)
    : dayPartSections(dayItems);

  return {
    date,
    grouping,
    sections,
    emptyMessage: dayItems.length === 0 ? "Free time — nothing else planned yet." : null,
    currentLocation: grouping === "current" ? plannedLocation(dayItems, japanNow.minutes) : null,
    hotel: hotelForDate(items, date, options.hotelSafety),
  };
}
