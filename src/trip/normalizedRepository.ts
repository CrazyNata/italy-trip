import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase/client";
import type { CreatedInvitation, DbRow, TripInvitation, TripMember, TripRole, TripSummary } from "../lib/supabase/database";
import { TRIP_STATE_VERSION, type TripData, type TripPayload } from "../types/trip";

const TABLES = ["trip_days", "day_items", "lodgings", "places", "expenses", "notes", "useful_links", "trip_photos"] as const;
type QueryResult = { data: unknown; error: { message: string } | null };
const query = (value: unknown) => value as PromiseLike<QueryResult>;

function fail(operation: string, error: { message: string } | null) {
  if (error) throw new Error(`${operation}: ${error.message}`);
}
function rows(value: unknown) { return (Array.isArray(value) ? value : []) as DbRow[]; }
function ordered(value: unknown) { return rows(value).sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0) || a.id.localeCompare(b.id)); }
function externalId(row: DbRow) { return typeof row.legacy_id === "string" && row.legacy_id ? row.legacy_id : row.id; }
function asText(value: unknown) { return typeof value === "string" ? value : ""; }
function asNumber(value: unknown) { return typeof value === "number" ? value : Number(value) || 0; }

export async function listTrips(): Promise<TripSummary[]> {
  const result = await query(supabase.from("trips").select("id,owner_id,name,start_date,end_date,trip_members!inner(role)").order("created_at"));
  fail("Не удалось загрузить поездки", result.error);
  return rows(result.data).map((row) => ({
    id: row.id, ownerId: asText(row.owner_id), name: asText(row.name), startDate: asText(row.start_date) || null,
    endDate: asText(row.end_date) || null, role: ((row.trip_members as { role?: TripRole }[])?.[0]?.role ?? "viewer"),
  }));
}

export async function loadTrip(tripId: string): Promise<TripPayload> {
  const results = await Promise.all([
    query(supabase.from("trips").select("*").eq("id", tripId).single()),
    ...TABLES.slice(0, -1).map((table) => query(supabase.from(table).select("*").eq("trip_id", tripId).order("position"))),
  ]);
  results.forEach((result, index) => fail(`Не удалось загрузить ${index ? TABLES[index - 1] : "поездку"}`, result.error));
  const trip = results[0].data as DbRow;
  const days = ordered(results[1].data); const items = ordered(results[2].data); const note = ordered(results[6].data)[0];
  const data: TripData = {
    trip: { start: asText(trip.start_date), end: asText(trip.end_date), people: asNumber(trip.people), dogs: asNumber(trip.dogs) },
    days: days.map((day) => ({ id: externalId(day), iso: asText(day.day_date), dayNum: asNumber(day.day_number), month: asText(day.month_label), weekday: asText(day.weekday_label), city: asText(day.city), draft: asText(day.draft), draftTime: asText(day.draft_time) || undefined, dayMapUrl: asText(day.map_url) || undefined, items: items.filter((item) => item.day_id === day.id).map((item) => ({ id: externalId(item), title: asText(item.title), done: Boolean(item.done), time: asText(item.item_time) || undefined, mapUrl: asText(item.map_url) || undefined })) })),
    lodging: ordered(results[3].data).map((row) => ({ id: externalId(row), slot: asText(row.slot), city: asText(row.city), name: asText(row.name), dates: asText(row.dates_label), price: asText(row.price_label), status: asText(row.status), freeCancel: asText(row.free_cancel) || undefined, link: asText(row.url), notes: asText(row.notes), photos: Array.isArray(row.photos) ? row.photos as string[] : [], objPos: asText(row.object_position) || undefined, objPosList: Array.isArray(row.object_positions) ? row.object_positions as string[] : [] })),
    sights: ordered(results[4].data).map((row) => ({ id: externalId(row), name: asText(row.name), city: asText(row.city), group: asText(row.category_group), subcategory: asText(row.subcategory), done: Boolean(row.done), description: asText(row.description) || undefined, walkDay: row.walk_day == null ? undefined : asNumber(row.walk_day), walkOrder: row.walk_order == null ? undefined : asNumber(row.walk_order), lnglat: row.longitude == null || row.latitude == null ? undefined : [asNumber(row.longitude), asNumber(row.latitude)], photo: asText(row.photo_url) || undefined, photoPath: asText(row.photo_path) || undefined })),
    expenses: ordered(results[5].data).map((row) => ({ id: externalId(row), label: asText(row.label), category: asText(row.category), amount: asNumber(row.amount) })),
    notes: asText(note?.body), romeSightsV: asNumber((note?.metadata as Record<string, unknown> | undefined)?.romeSightsV), budgetV: asNumber((note?.metadata as Record<string, unknown> | undefined)?.budgetV),
    links: ordered(results[7].data).map((row) => ({ id: externalId(row), title: asText(row.title), url: asText(row.url) })),
  };
  return { v: TRIP_STATE_VERSION, data };
}

async function syncRows(table: string, tripId: string, desired: Record<string, unknown>[]) {
  const currentResult = await query(supabase.from(table).select("id,legacy_id").eq("trip_id", tripId)); fail(`Не удалось прочитать ${table}`, currentResult.error);
  const current = rows(currentResult.data); const byExternal = new Map(current.map((row) => [externalId(row), row.id]));
  const payload = desired.map((row) => ({ ...row, legacy_id: typeof row.legacy_id === "string" ? row.legacy_id : null, id: byExternal.get(String(row.legacy_id)) ?? crypto.randomUUID(), trip_id: tripId }));
  if (payload.length) { const result = await query(supabase.from(table).upsert(payload)); fail(`Не удалось сохранить ${table}`, result.error); }
  const keep = new Set(payload.map((row) => row.id)); const removed = current.filter((row) => !keep.has(row.id)).map((row) => row.id);
  if (removed.length) { const result = await query(supabase.from(table).delete().in("id", removed)); fail(`Не удалось удалить строки ${table}`, result.error); }
  return new Map(payload.map((row) => [String(row.legacy_id), row.id]));
}

export async function saveTrip(tripId: string, data: TripData) {
  let result = await query(supabase.from("trips").update({ start_date: data.trip.start || null, end_date: data.trip.end || null, people: data.trip.people, dogs: data.trip.dogs }).eq("id", tripId)); fail("Не удалось сохранить поездку", result.error);
  const dayIds = await syncRows("trip_days", tripId, data.days.map((day, position) => ({ legacy_id: day.id, day_date: day.iso || null, day_number: day.dayNum, month_label: day.month, weekday_label: day.weekday, city: day.city, draft: day.draft, draft_time: day.draftTime ?? null, map_url: day.dayMapUrl ?? null, position })));
  await syncRows("day_items", tripId, data.days.flatMap((day) => day.items.map((item, position) => ({ legacy_id: item.id, day_id: dayIds.get(day.id), title: item.title, done: item.done, item_time: item.time ?? null, map_url: item.mapUrl ?? null, position }))));
  await Promise.all([
    syncRows("lodgings", tripId, data.lodging.map((row, position) => ({ legacy_id: row.id, slot: row.slot, city: row.city, name: row.name, dates_label: row.dates, price_label: row.price, status: row.status, free_cancel: row.freeCancel ?? null, url: row.link, notes: row.notes, photos: row.photos ?? [], object_position: row.objPos ?? null, object_positions: row.objPosList ?? [], position }))),
    syncRows("places", tripId, data.sights.map((row, position) => ({ legacy_id: row.id, name: row.name, city: row.city, category_group: row.group, subcategory: row.subcategory, done: row.done, description: row.description ?? null, walk_day: row.walkDay ?? null, walk_order: row.walkOrder ?? null, longitude: row.lnglat?.[0] ?? null, latitude: row.lnglat?.[1] ?? null, photo_url: row.photo ?? null, photo_path: row.photoPath ?? null, position }))),
    syncRows("expenses", tripId, data.expenses.map((row, position) => ({ legacy_id: row.id, label: row.label, category: row.category, amount: row.amount, position }))),
    syncRows("useful_links", tripId, data.links.map((row, position) => ({ legacy_id: row.id, title: row.title, url: row.url, position }))),
  ]);
  result = await query(supabase.from("notes").upsert({ trip_id: tripId, kind: "general", position: 0, body: data.notes, metadata: { romeSightsV: data.romeSightsV, budgetV: data.budgetV } }, { onConflict: "trip_id,kind,position" })); fail("Не удалось сохранить заметки", result.error);
}

export async function createTrip(name: string) { const result = await query(supabase.from("trips").insert({ owner_id: (await supabase.auth.getUser()).data.user?.id, name: name.trim() }).select("id").single()); fail("Не удалось создать поездку", result.error); return (result.data as { id: string }).id; }
export async function renameTrip(id: string, name: string) { const result = await query(supabase.from("trips").update({ name: name.trim() }).eq("id", id)); fail("Не удалось переименовать поездку", result.error); }
export async function deleteTrip(id: string) { const files = await supabase.storage.from("trip-photos").list(id,{limit:1000}); if(files.error)throw new Error(`Не удалось проверить фото поездки: ${files.error.message}`);if(files.data.length){const removed=await supabase.storage.from("trip-photos").remove(files.data.map((file) => `${id}/${file.name}`));if(removed.error)throw new Error(`Не удалось удалить фото поездки: ${removed.error.message}`);}const result = await query(supabase.from("trips").delete().eq("id", id)); fail("Не удалось удалить поездку", result.error); }
export async function listMembers(tripId: string): Promise<TripMember[]> { const result = await supabase.rpc("list_trip_members",{target_trip:tripId}); fail("Не удалось загрузить участников", result.error); return rows(result.data).map((r) => ({ tripId, userId: asText(r.user_id), email: asText(r.email), role: r.role as TripRole, createdAt: asText(r.created_at) })); }
export async function listInvitations(tripId: string): Promise<TripInvitation[]> { const result = await query(supabase.from("trip_invitations").select("*").eq("trip_id", tripId).order("created_at", { ascending: false })); fail("Не удалось загрузить приглашения", result.error); return rows(result.data).map((r) => ({ id:r.id,tripId,email:asText(r.email),status:r.status as TripInvitation["status"],expiresAt:asText(r.expires_at),createdAt:asText(r.created_at) })); }
export async function createInvitation(tripId: string, email: string): Promise<CreatedInvitation> { const result = await supabase.rpc("create_trip_invitation", { target_trip: tripId, target_email: email }); fail("Не удалось создать приглашение", result.error); const created = (result.data as { invitation_id:string;token:string }[])[0]; return { id:created.invitation_id,tripId,email:email.trim().toLowerCase(),status:"pending",expiresAt:"",createdAt:new Date().toISOString(),token:created.token }; }
export async function revokeInvitation(id: string) { const result = await supabase.rpc("revoke_trip_invitation", { target_invitation:id }); fail("Не удалось отозвать приглашение", result.error); }
export async function acceptInvitation(token: string) { const result = await supabase.rpc("accept_trip_invitation", { raw_token:token }); fail("Не удалось принять приглашение", result.error); return result.data as string; }

export interface StoredPhoto { id:string; thumb:string; iso:string|null;lat:number|null;lng:number|null;place:string|null;tripId:string; }
export async function loadTripPhotos(tripId:string):Promise<StoredPhoto[]>{
  const result=await query(supabase.from("trip_photos").select("*").eq("trip_id",tripId).order("position"));fail("Не удалось загрузить фото",result.error);
  return Promise.all(rows(result.data).map(async(row)=>{const signed=await supabase.storage.from("trip-photos").createSignedUrl(asText(row.object_path),3600);return{id:row.id,tripId,thumb:signed.data?.signedUrl??"",iso:asText(row.taken_on)||null,lat:row.latitude==null?null:asNumber(row.latitude),lng:row.longitude==null?null:asNumber(row.longitude),place:asText(row.place)||null};}));
}
export async function uploadTripPhoto(tripId:string,file:File,metadata:{iso:string|null;lat:number|null;lng:number|null;place:string|null}){
  const id=crypto.randomUUID();const extension=(file.name.split(".").pop()||"jpg").replace(/[^a-z0-9]/gi,"").toLowerCase();const path=`${tripId}/${id}.${extension}`;
  const uploaded=await supabase.storage.from("trip-photos").upload(path,file,{contentType:file.type,upsert:false});if(uploaded.error)throw new Error(`Не удалось загрузить фото: ${uploaded.error.message}`);
  const inserted=await query(supabase.from("trip_photos").insert({id,trip_id:tripId,object_path:path,taken_on:metadata.iso,latitude:metadata.lat,longitude:metadata.lng,place:metadata.place,position:Date.now()}).select("id").single());
  if(inserted.error){await supabase.storage.from("trip-photos").remove([path]);fail("Не удалось сохранить фото",inserted.error);}return id;
}
export async function deleteTripPhoto(tripId:string,id:string){const found=await query(supabase.from("trip_photos").select("object_path").eq("trip_id",tripId).eq("id",id).single());fail("Не удалось найти фото",found.error);const path=asText((found.data as DbRow).object_path);const removed=await supabase.storage.from("trip-photos").remove([path]);if(removed.error)throw new Error(`Не удалось удалить файл: ${removed.error.message}`);const result=await query(supabase.from("trip_photos").delete().eq("id",id));fail("Не удалось удалить фото",result.error);}

export function subscribeToTrip(tripId: string, changed: () => void) {
  let timer = 0; const notify = () => { window.clearTimeout(timer); timer=window.setTimeout(changed,150); };
  const channels: RealtimeChannel[] = ["trips","trip_members","trip_invitations",...TABLES].map((table) => supabase.channel(`trip:${tripId}:${table}`).on("postgres_changes", { event:"*",schema:"public",table,filter: table === "trips" ? `id=eq.${tripId}` : `trip_id=eq.${tripId}` }, notify).subscribe());
  return () => { window.clearTimeout(timer); channels.forEach((channel) => { void supabase.removeChannel(channel); }); };
}
