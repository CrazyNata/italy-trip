export const TRIP_STATE_VERSION = 42;

export interface TripDetails {
  start: string;
  end: string;
  people: number;
  dogs: number;
}

export interface ItineraryItem {
  id: string;
  title: string;
  done: boolean;
  time?: string;
  mapUrl?: string;
}

export interface TripDay {
  id: string;
  iso: string;
  dayNum: number;
  month: string;
  weekday: string;
  city: string;
  items: ItineraryItem[];
  draft: string;
  draftTime?: string;
  dayMapUrl?: string;
}

export interface Lodging {
  id: string;
  slot: string;
  city: string;
  name: string;
  dates: string;
  price: string;
  status: string;
  freeCancel?: string;
  link: string;
  notes: string;
  photos?: string[];
  objPos?: string;
  objPosList?: string[];
}

export interface Sight {
  id: string;
  name: string;
  city: string;
  group: string;
  subcategory: string;
  done: boolean;
  description?: string;
  walkDay?: number;
  walkOrder?: number;
  lnglat?: [number, number];
  photo?: string;
  photoPath?: string;
}

export interface Expense {
  id: string;
  label: string;
  category: string;
  amount: number;
}

export interface Restaurant {
  id: string;
  name: string;
  city: string;
  status: string;
  note?: string;
  link?: string;
  /** Уровень цены: "€", "€€", "€€€", "€€€€". */
  price?: string;
  /** Личная оценка 1–5 (0 или undefined — не оценён). */
  rating?: number;
  /** Рейтинг Google (например, 4.3). Заполняется вручную. */
  googleRating?: number;
  /** Число отзывов в Google. */
  googleReviews?: number;
  /** Показывать в фильтре приоритетных ресторанов. */
  priority?: boolean;
  /** Район/квартал для отдельного фильтра (например, «Пиньето» — рядом с домом). */
  area?: string;
  /** Публичные URL загруженных фото. */
  photos?: string[];
  /** Координаты [долгота, широта] для расчёта расстояния. */
  lnglat?: [number, number];
}

export interface TripData {
  trip: TripDetails;
  days: TripDay[];
  lodging: Lodging[];
  sights: Sight[];
  romeSightsV: number;
  expenses: Expense[];
  budgetV: number;
  restaurants?: Restaurant[];
}

export interface TripPayload {
  v: typeof TRIP_STATE_VERSION;
  data: TripData;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasString(value: JsonRecord, key: string) {
  return typeof value[key] === "string";
}

function hasFiniteNumber(value: JsonRecord, key: string) {
  return typeof value[key] === "number" && Number.isFinite(value[key]);
}

function hasOptionalString(value: JsonRecord, key: string) {
  return value[key] === undefined || typeof value[key] === "string";
}

function hasOptionalFiniteNumber(value: JsonRecord, key: string) {
  return value[key] === undefined || hasFiniteNumber(value, key);
}

function hasOptionalStringArray(value: JsonRecord, key: string) {
  return (
    value[key] === undefined ||
    (Array.isArray(value[key]) &&
      value[key].every((item) => typeof item === "string"))
  );
}

function isItem(value: unknown): value is ItineraryItem {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "title") &&
    typeof value.done === "boolean" &&
    hasOptionalString(value, "time") &&
    hasOptionalString(value, "mapUrl")
  );
}

function isDay(value: unknown): value is TripDay {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "iso") &&
    hasFiniteNumber(value, "dayNum") &&
    hasString(value, "month") &&
    hasString(value, "weekday") &&
    hasString(value, "city") &&
    hasString(value, "draft") &&
    hasOptionalString(value, "draftTime") &&
    hasOptionalString(value, "dayMapUrl") &&
    Array.isArray(value.items) &&
    value.items.every(isItem)
  );
}

function isLodging(value: unknown): value is Lodging {
  return (
    isRecord(value) &&
    [
      "id",
      "slot",
      "city",
      "name",
      "dates",
      "price",
      "status",
      "link",
      "notes",
    ].every((key) => hasString(value, key)) &&
    hasOptionalString(value, "freeCancel") &&
    hasOptionalString(value, "objPos") &&
    hasOptionalStringArray(value, "photos") &&
    hasOptionalStringArray(value, "objPosList")
  );
}

function isSight(value: unknown): value is Sight {
  const coordinates = value && isRecord(value) ? value.lnglat : undefined;
  return (
    isRecord(value) &&
    ["id", "name", "city", "group", "subcategory"].every((key) =>
      hasString(value, key),
    ) &&
    typeof value.done === "boolean" &&
    hasOptionalString(value, "description") &&
    hasOptionalString(value, "photo") &&
    hasOptionalString(value, "photoPath") &&
    hasOptionalFiniteNumber(value, "walkDay") &&
    hasOptionalFiniteNumber(value, "walkOrder") &&
    (coordinates === undefined ||
      (Array.isArray(coordinates) &&
        coordinates.length === 2 &&
        typeof coordinates[0] === "number" &&
        Number.isFinite(coordinates[0]) &&
        coordinates[0] >= -180 &&
        coordinates[0] <= 180 &&
        typeof coordinates[1] === "number" &&
        Number.isFinite(coordinates[1]) &&
        coordinates[1] >= -90 &&
        coordinates[1] <= 90))
  );
}

function isExpense(value: unknown): value is Expense {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "label") &&
    hasString(value, "category") &&
    hasFiniteNumber(value, "amount")
  );
}

function isRestaurant(value: unknown): value is Restaurant {
  const coordinates = value && isRecord(value) ? value.lnglat : undefined;
  return (
    isRecord(value) &&
    ["id", "name", "city", "status"].every((key) => hasString(value, key)) &&
    hasOptionalString(value, "note") &&
    hasOptionalString(value, "link") &&
    hasOptionalString(value, "price") &&
    hasOptionalFiniteNumber(value, "rating") &&
    hasOptionalFiniteNumber(value, "googleRating") &&
    hasOptionalFiniteNumber(value, "googleReviews") &&
    (value.priority === undefined || typeof value.priority === "boolean") &&
    hasOptionalString(value, "area") &&
    hasOptionalStringArray(value, "photos") &&
    (coordinates === undefined ||
      (Array.isArray(coordinates) &&
        coordinates.length === 2 &&
        typeof coordinates[0] === "number" &&
        Number.isFinite(coordinates[0]) &&
        coordinates[0] >= -180 &&
        coordinates[0] <= 180 &&
        typeof coordinates[1] === "number" &&
        Number.isFinite(coordinates[1]) &&
        coordinates[1] >= -90 &&
        coordinates[1] <= 90))
  );
}

export function parseTripPayload(value: unknown): TripPayload | null {
  if (
    !isRecord(value) ||
    value.v !== TRIP_STATE_VERSION ||
    !isRecord(value.data)
  )
    return null;
  const data = value.data;
  if (
    !isRecord(data.trip) ||
    !hasString(data.trip, "start") ||
    !hasString(data.trip, "end") ||
    !hasFiniteNumber(data.trip, "people") ||
    !hasFiniteNumber(data.trip, "dogs") ||
    !Array.isArray(data.days) ||
    !data.days.every(isDay) ||
    !Array.isArray(data.lodging) ||
    !data.lodging.every(isLodging) ||
    !Array.isArray(data.sights) ||
    !data.sights.every(isSight) ||
    !Array.isArray(data.expenses) ||
    !data.expenses.every(isExpense) ||
    (data.restaurants !== undefined &&
      !(Array.isArray(data.restaurants) && data.restaurants.every(isRestaurant))) ||
    !hasFiniteNumber(data, "romeSightsV") ||
    !hasFiniteNumber(data, "budgetV")
  )
    return null;
  return value as unknown as TripPayload;
}

export function readCachedTrip(): TripPayload | null {
  try {
    const raw = localStorage.getItem("italy_trip");
    return raw ? parseTripPayload(JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}
