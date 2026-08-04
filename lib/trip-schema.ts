export const TRIP_START_DATE = "2026-08-06";
export const TRIP_END_DATE = "2026-08-22";

export const tripCategories = [
  "hotel",
  "transport",
  "attraction",
  "meal",
  "ticket",
  "note",
] as const;

export const tripTicketStatuses = ["to-buy", "booked", "not-needed"] as const;

export type TripCategory = (typeof tripCategories)[number];
export type TripTicketStatus = (typeof tripTicketStatuses)[number];

export type TripItem = {
  id: string;
  date: string;
  time?: string;
  category: TripCategory;
  title: string;
  location?: string;
  notes?: string;
  ticketStatus?: TripTicketStatus;
  confirmed?: boolean;
  confirmation?: string;
  cost?: string;
  link?: string;
  lat?: number | "";
  lng?: number | "";
  quantity?: string;
  fareDetails?: string;
  imageUrl?: string;
  imageSource?: string;
  imageCredit?: string;
  order?: number;
};

export type ViewerTripItem = Pick<
  TripItem,
  "id" | "date" | "time" | "category" | "title" | "location" | "ticketStatus" | "lat" | "lng" | "order"
>;

export type TripBackup = {
  format: "japan-family-trip-backup";
  schemaVersion: 1;
  tripVersion: number;
  exportedAt: string;
  items: TripItem[];
};

const allowedKeys = new Set<keyof TripItem>([
  "id",
  "date",
  "time",
  "category",
  "title",
  "location",
  "notes",
  "ticketStatus",
  "confirmed",
  "confirmation",
  "cost",
  "link",
  "lat",
  "lng",
  "quantity",
  "fareDetails",
  "imageUrl",
  "imageSource",
  "imageCredit",
  "order",
]);

const stringLimits: Partial<Record<keyof TripItem, number>> = {
  id: 100,
  date: 10,
  time: 80,
  title: 240,
  location: 300,
  notes: 8_000,
  confirmation: 500,
  cost: 200,
  link: 2_000,
  quantity: 200,
  fareDetails: 1_000,
  imageUrl: 2_000,
  imageSource: 2_000,
  imageCredit: 500,
};

export class TripValidationError extends Error {
  readonly code = "INVALID_TRIP";

  constructor(message: string) {
    super(message);
    this.name = "TripValidationError";
  }
}

function fail(message: string): never {
  throw new TripValidationError(message);
}

function validateString(
  item: Record<string, unknown>,
  key: keyof TripItem,
  required = false,
) {
  const value = item[key];
  if (value === undefined && !required) return;
  if (typeof value !== "string") fail(`${String(key)} must be text.`);
  if (required && !value.trim()) fail(`${String(key)} is required.`);
  const limit = stringLimits[key];
  if (limit && value.length > limit) fail(`${String(key)} is too long.`);
}

function validateLink(value: unknown, field: string) {
  if (value === undefined || value === "") return;
  if (typeof value !== "string") fail(`${field} must be a URL.`);
  if (field === "imageUrl" && value.startsWith("/")) return;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") fail(`${field} must use HTTP or HTTPS.`);
  } catch {
    fail(`${field} must be a valid URL.`);
  }
}

function validateItem(value: unknown, index: number): TripItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`Agenda item ${index + 1} must be an object.`);
  }
  const item = value as Record<string, unknown>;
  for (const key of Object.keys(item)) {
    if (!allowedKeys.has(key as keyof TripItem)) fail(`Agenda item ${index + 1} contains unsupported field ${key}.`);
  }

  validateString(item, "id", true);
  validateString(item, "date", true);
  validateString(item, "title", true);
  for (const key of [
    "time",
    "location",
    "notes",
    "confirmation",
    "cost",
    "link",
    "quantity",
    "fareDetails",
    "imageUrl",
    "imageSource",
    "imageCredit",
  ] as const) validateString(item, key);

  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(String(item.id))) fail(`Agenda item ${index + 1} has an invalid ID.`);
  const itemDate = String(item.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(itemDate) || itemDate < TRIP_START_DATE || itemDate > TRIP_END_DATE) {
    fail(`Agenda item ${index + 1} is outside the trip dates.`);
  }
  if (!tripCategories.includes(item.category as TripCategory)) fail(`Agenda item ${index + 1} has an invalid category.`);
  if (item.ticketStatus !== undefined && !tripTicketStatuses.includes(item.ticketStatus as TripTicketStatus)) {
    fail(`Agenda item ${index + 1} has an invalid ticket status.`);
  }
  if (item.confirmed !== undefined && typeof item.confirmed !== "boolean") fail(`Agenda item ${index + 1} has an invalid confirmed value.`);
  for (const key of ["lat", "lng"] as const) {
    const coordinate = item[key];
    if (coordinate !== undefined && coordinate !== "" && (typeof coordinate !== "number" || !Number.isFinite(coordinate))) {
      fail(`Agenda item ${index + 1} has an invalid ${key}.`);
    }
  }
  if (typeof item.lat === "number" && (item.lat < -90 || item.lat > 90)) fail(`Agenda item ${index + 1} has an invalid latitude.`);
  if (typeof item.lng === "number" && (item.lng < -180 || item.lng > 180)) fail(`Agenda item ${index + 1} has an invalid longitude.`);
  if (item.order !== undefined && (!Number.isInteger(item.order) || Number(item.order) < 0 || Number(item.order) > 10_000)) {
    fail(`Agenda item ${index + 1} has an invalid order.`);
  }
  validateLink(item.link, "link");
  validateLink(item.imageUrl, "imageUrl");
  validateLink(item.imageSource, "imageSource");
  return structuredClone(item) as TripItem;
}

export function validateTripItems(value: unknown): TripItem[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500) {
    fail("The agenda must contain between 1 and 500 items.");
  }
  const items = value.map(validateItem);
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) fail(`Agenda item ID ${item.id} is duplicated.`);
    ids.add(item.id);
  }
  if (JSON.stringify(items).length > 1_500_000) fail("The agenda is too large.");
  return items;
}

export function createTripBackup(
  items: unknown,
  input: { exportedAt?: string; tripVersion: number },
): TripBackup {
  if (!Number.isInteger(input.tripVersion) || input.tripVersion < 1) fail("The trip version is invalid.");
  const exportedAt = input.exportedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(exportedAt))) fail("The export time is invalid.");
  return {
    format: "japan-family-trip-backup",
    schemaVersion: 1,
    tripVersion: input.tripVersion,
    exportedAt,
    items: validateTripItems(items),
  };
}

export function parseTripBackup(serialized: string): TripItem[] {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    fail("The backup is not valid JSON.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("The backup envelope is missing.");
  const backup = value as Partial<TripBackup>;
  if (backup.format !== "japan-family-trip-backup" || backup.schemaVersion !== 1) {
    fail("The backup format or schema version is not supported.");
  }
  if (!Number.isInteger(backup.tripVersion) || Number(backup.tripVersion) < 1) fail("The backup trip version is invalid.");
  if (typeof backup.exportedAt !== "string" || !Number.isFinite(Date.parse(backup.exportedAt))) fail("The backup export time is invalid.");
  return validateTripItems(backup.items);
}

export function projectViewerTrip(items: unknown): ViewerTripItem[] {
  return validateTripItems(items).map((item) => ({
    id: item.id,
    date: item.date,
    time: item.time,
    category: item.category,
    title: item.title,
    location: item.location,
    ticketStatus: item.ticketStatus,
    lat: item.lat,
    lng: item.lng,
    order: item.order,
  }));
}
