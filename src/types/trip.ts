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
  v: number
  data: TripData
}

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasString(value: JsonRecord, key: string) {
  return typeof value[key] === 'string'
}

function isItem(value: unknown): value is ItineraryItem {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'title') && typeof value.done === 'boolean'
}

function isDay(value: unknown): value is TripDay {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'iso') &&
    typeof value.dayNum === 'number' && hasString(value, 'month') && hasString(value, 'weekday') &&
    hasString(value, 'city') && hasString(value, 'draft') && Array.isArray(value.items) && value.items.every(isItem)
}

function isLodging(value: unknown): value is Lodging {
  return isRecord(value) && ['id', 'slot', 'city', 'name', 'dates', 'price', 'status', 'link', 'notes'].every((key) => hasString(value, key))
}

function isSight(value: unknown): value is Sight {
  return isRecord(value) && ['id', 'name', 'city', 'group', 'subcategory'].every((key) => hasString(value, key)) && typeof value.done === 'boolean'
}

function isExpense(value: unknown): value is Expense {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'label') && hasString(value, 'category') && typeof value.amount === 'number'
}

function isLink(value: unknown): value is TripLink {
  return isRecord(value) && hasString(value, 'id') && hasString(value, 'title') && hasString(value, 'url')
}

export function parseTripPayload(value: unknown): TripPayload | null {
  if (!isRecord(value) || typeof value.v !== 'number' || !isRecord(value.data)) return null
  const data = value.data
  if (!isRecord(data.trip) || !hasString(data.trip, 'start') || !hasString(data.trip, 'end') ||
    typeof data.trip.people !== 'number' || typeof data.trip.dogs !== 'number' ||
    !Array.isArray(data.days) || !data.days.every(isDay) ||
    !Array.isArray(data.lodging) || !data.lodging.every(isLodging) ||
    !Array.isArray(data.sights) || !data.sights.every(isSight) ||
    !Array.isArray(data.expenses) || !data.expenses.every(isExpense) ||
    !Array.isArray(data.links) || !data.links.every(isLink) ||
    typeof data.romeSightsV !== 'number' || typeof data.budgetV !== 'number' || typeof data.notes !== 'string') return null
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
