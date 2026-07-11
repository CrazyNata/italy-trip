export const TRIP_STATE_VERSION = 42

export interface TripDetails {
  start: string
  end: string
  people: number
  dogs: number
}

export interface ItineraryItem {
  id: string
  title: string
  done: boolean
  time?: string
}

export interface TripDay {
  id: string
  iso: string
  dayNum: number
  month: string
  weekday: string
  city: string
  items: ItineraryItem[]
  draft: string
  dayMapUrl?: string
}

export interface Lodging {
  id: string
  slot: string
  city: string
  name: string
  dates: string
  price: string
  status: string
  freeCancel?: string
  link: string
  notes: string
  photos?: string[]
  objPos?: string
  objPosList?: string[]
}

export interface Sight {
  id: string
  name: string
  city: string
  group: string
  subcategory: string
  done: boolean
  description?: string
  walkDay?: number
  walkOrder?: number
  lnglat?: [number, number]
  photo?: string
}

export interface Expense {
  id: string
  label: string
  category: string
  amount: number
}

export interface TripLink {
  id: string
  title: string
  url: string
}

export interface TripData {
  trip: TripDetails
  days: TripDay[]
  lodging: Lodging[]
  sights: Sight[]
  romeSightsV: number
  expenses: Expense[]
  budgetV: number
  links: TripLink[]
  notes: string
}

export interface TripPayload {
  v: typeof TRIP_STATE_VERSION
  data: TripData
}

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasString(value: JsonRecord, key: string) {
  return typeof value[key] === 'string'
}

function hasFiniteNumber(value: JsonRecord, key: string) {
  return typeof value[key] === 'number' && Number.isFinite(value[key])
}

function hasOptionalString(value: JsonRecord, key: string) {
  return value[key] === undefined || typeof value[key] === 'string'
}

function hasOptionalFiniteNumber(value: JsonRecord, key: string) {
  return value[key] === undefined || hasFiniteNumber(value, key)
}

function hasOptionalStringArray(value: JsonRecord, key: string) {
  return value[key] === undefined || (Array.isArray(value[key]) && value[key].every((item) => typeof item === 'string'))
}

function isItem(value: unknown): value is ItineraryItem {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'title') &&
    typeof value.done === 'boolean' && hasOptionalString(value, 'time')
}

function isDay(value: unknown): value is TripDay {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'iso') &&
    hasFiniteNumber(value, 'dayNum') && hasString(value, 'month') && hasString(value, 'weekday') &&
    hasString(value, 'city') && hasString(value, 'draft') && hasOptionalString(value, 'dayMapUrl') &&
    Array.isArray(value.items) && value.items.every(isItem)
}

function isLodging(value: unknown): value is Lodging {
  return isRecord(value) && ['id', 'slot', 'city', 'name', 'dates', 'price', 'status', 'link', 'notes'].every((key) => hasString(value, key)) &&
    hasOptionalString(value, 'freeCancel') && hasOptionalString(value, 'objPos') &&
    hasOptionalStringArray(value, 'photos') && hasOptionalStringArray(value, 'objPosList')
}

function isSight(value: unknown): value is Sight {
  const coordinates = value && isRecord(value) ? value.lnglat : undefined
  return isRecord(value) && ['id', 'name', 'city', 'group', 'subcategory'].every((key) => hasString(value, key)) &&
    typeof value.done === 'boolean' && hasOptionalString(value, 'description') && hasOptionalString(value, 'photo') &&
    hasOptionalFiniteNumber(value, 'walkDay') && hasOptionalFiniteNumber(value, 'walkOrder') &&
    (coordinates === undefined || (Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate))))
}

function isExpense(value: unknown): value is Expense {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'label') && hasString(value, 'category') && hasFiniteNumber(value, 'amount')
}

function isLink(value: unknown): value is TripLink {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'title') && hasString(value, 'url')
}

export function parseTripPayload(value: unknown): TripPayload | null {
  if (!isRecord(value) || value.v !== TRIP_STATE_VERSION || !isRecord(value.data)) return null
  const data = value.data
  if (!isRecord(data.trip) || !hasString(data.trip, 'start') || !hasString(data.trip, 'end') ||
    !hasFiniteNumber(data.trip, 'people') || !hasFiniteNumber(data.trip, 'dogs') ||
    !Array.isArray(data.days) || !data.days.every(isDay) ||
    !Array.isArray(data.lodging) || !data.lodging.every(isLodging) ||
    !Array.isArray(data.sights) || !data.sights.every(isSight) ||
    !Array.isArray(data.expenses) || !data.expenses.every(isExpense) ||
    !Array.isArray(data.links) || !data.links.every(isLink) ||
    !hasFiniteNumber(data, 'romeSightsV') || !hasFiniteNumber(data, 'budgetV') || typeof data.notes !== 'string') return null
  return value as unknown as TripPayload
}

export function readCachedTrip(): TripPayload | null {
  try {
    const raw = localStorage.getItem('italy_trip')
    return raw ? parseTripPayload(JSON.parse(raw) as unknown) : null
  } catch {
    return null
  }
}
