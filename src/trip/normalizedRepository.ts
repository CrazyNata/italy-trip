import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase/client";
import type {
  CreatedInvitation,
  DbRow,
  TripInvitation,
  TripMember,
  TripRole,
  TripSummary,
} from "../lib/supabase/database";
import {
  TRIP_STATE_VERSION,
  type TripData,
  type TripPayload,
} from "../types/trip";

const TABLES = [
  "trip_days",
  "day_items",
  "lodgings",
  "places",
  "expenses",
  "notes",
  "useful_links",
  "trip_photos",
] as const;
type QueryResult = { data: unknown; error: { message: string } | null };
const query = (value: unknown) => value as PromiseLike<QueryResult>;

function fail(operation: string, error: { message: string } | null) {
  if (error) throw new Error(`${operation}: ${error.message}`);
}
function rows(value: unknown) {
  return (Array.isArray(value) ? value : []) as DbRow[];
}
function ordered(value: unknown) {
  return rows(value).sort(
    (a, b) =>
      Number(a.position ?? 0) - Number(b.position ?? 0) ||
      a.id.localeCompare(b.id),
  );
}
function externalId(row: DbRow) {
  return typeof row.legacy_id === "string" && row.legacy_id
    ? row.legacy_id
    : row.id;
}
function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}
function asNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value) || 0;
}
function asRecord(value: unknown): DbRow {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Сервер вернул некорректные данные");
  return value as DbRow;
}
function firstRecord(value: unknown) {
  const row = Array.isArray(value) ? value[0] : value;
  return asRecord(row);
}

export async function listTrips(): Promise<TripSummary[]> {
  const result = await query(
    supabase
      .from("trips")
      .select(
        "id,owner_id,name,start_date,end_date,revision,trip_members!inner(role)",
      )
      .order("created_at"),
  );
  fail("Не удалось загрузить поездки", result.error);
  return rows(result.data).map((row) => ({
    id: row.id,
    ownerId: asText(row.owner_id),
    name: asText(row.name),
    startDate: asText(row.start_date) || null,
    endDate: asText(row.end_date) || null,
    role: (row.trip_members as { role?: TripRole }[])?.[0]?.role ?? "viewer",
    revision: asNumber(row.revision),
  }));
}

export async function loadTrip(
  tripId: string,
  attempt = 0,
): Promise<{ payload: TripPayload; revision: number }> {
  const results = await Promise.all([
    query(supabase.from("trips").select("*").eq("id", tripId).single()),
    ...TABLES.slice(0, -1).map((table) =>
      query(
        supabase
          .from(table)
          .select("*")
          .eq("trip_id", tripId)
          .order("position"),
      ),
    ),
  ]);
  results.forEach((result, index) =>
    fail(
      `Не удалось загрузить ${index ? TABLES[index - 1] : "поездку"}`,
      result.error,
    ),
  );
  const trip = results[0].data as DbRow;
  const confirmed = await query(
    supabase.from("trips").select("revision").eq("id", tripId).single(),
  );
  fail("Не удалось проверить версию поездки", confirmed.error);
  if (asNumber(asRecord(confirmed.data).revision) !== asNumber(trip.revision)) {
    if (attempt >= 2) throw new Error("Поездка изменилась во время загрузки");
    return loadTrip(tripId, attempt + 1);
  }
  const days = ordered(results[1].data);
  const items = ordered(results[2].data);
  const note = ordered(results[6].data)[0];
  const data: TripData = {
    trip: {
      start: asText(trip.start_date),
      end: asText(trip.end_date),
      people: asNumber(trip.people),
      dogs: asNumber(trip.dogs),
    },
    days: days.map((day) => ({
      id: externalId(day),
      iso: asText(day.day_date),
      dayNum: asNumber(day.day_number),
      month: asText(day.month_label),
      weekday: asText(day.weekday_label),
      city: asText(day.city),
      draft: asText(day.draft),
      draftTime: asText(day.draft_time) || undefined,
      dayMapUrl: asText(day.map_url) || undefined,
      items: items
        .filter((item) => item.day_id === day.id)
        .map((item) => ({
          id: externalId(item),
          title: asText(item.title),
          done: Boolean(item.done),
          time: asText(item.item_time) || undefined,
          mapUrl: asText(item.map_url) || undefined,
        })),
    })),
    lodging: ordered(results[3].data).map((row) => ({
      id: externalId(row),
      slot: asText(row.slot),
      city: asText(row.city),
      name: asText(row.name),
      dates: asText(row.dates_label),
      price: asText(row.price_label),
      status: asText(row.status),
      freeCancel: asText(row.free_cancel) || undefined,
      link: asText(row.url),
      notes: asText(row.notes),
      photos: Array.isArray(row.photos) ? (row.photos as string[]) : [],
      objPos: asText(row.object_position) || undefined,
      objPosList: Array.isArray(row.object_positions)
        ? (row.object_positions as string[])
        : [],
    })),
    sights: ordered(results[4].data).map((row) => ({
      id: externalId(row),
      name: asText(row.name),
      city: asText(row.city),
      group: asText(row.category_group),
      subcategory: asText(row.subcategory),
      done: Boolean(row.done),
      description: asText(row.description) || undefined,
      walkDay: row.walk_day == null ? undefined : asNumber(row.walk_day),
      walkOrder: row.walk_order == null ? undefined : asNumber(row.walk_order),
      lnglat:
        row.longitude == null || row.latitude == null
          ? undefined
          : [asNumber(row.longitude), asNumber(row.latitude)],
      photo: asText(row.photo_url) || undefined,
      photoPath: asText(row.photo_path) || undefined,
    })),
    expenses: ordered(results[5].data).map((row) => ({
      id: externalId(row),
      label: asText(row.label),
      category: asText(row.category),
      amount: asNumber(row.amount),
    })),
    notes: asText(note?.body),
    romeSightsV: asNumber(
      (note?.metadata as Record<string, unknown> | undefined)?.romeSightsV,
    ),
    budgetV: asNumber(
      (note?.metadata as Record<string, unknown> | undefined)?.budgetV,
    ),
    links: ordered(results[7].data).map((row) => ({
      id: externalId(row),
      title: asText(row.title),
      url: asText(row.url),
    })),
  };
  return {
    payload: { v: TRIP_STATE_VERSION, data },
    revision: asNumber(trip.revision),
  };
}

export async function saveTrip(
  tripId: string,
  data: TripData,
  revision: number,
) {
  const result = await supabase.rpc("save_trip_aggregate", {
    target_trip: tripId,
    payload: data,
    payload_version: TRIP_STATE_VERSION,
    expected_revision: revision,
  });
  if (result.error?.code === "40001")
    throw new TripRevisionConflictError(result.error.message);
  fail("Не удалось сохранить поездку", result.error);
  return asNumber(result.data);
}

export class TripRevisionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TripRevisionConflictError";
  }
}

export async function createTrip(name: string) {
  const result = await query(
    supabase
      .from("trips")
      .insert({
        owner_id: (await supabase.auth.getUser()).data.user?.id,
        name: name.trim(),
      })
      .select("id")
      .single(),
  );
  fail("Не удалось создать поездку", result.error);
  return (result.data as { id: string }).id;
}
export async function renameTrip(id: string, name: string) {
  const result = await query(
    supabase.from("trips").update({ name: name.trim() }).eq("id", id),
  );
  fail("Не удалось переименовать поездку", result.error);
}
async function listStoragePaths(prefix: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await supabase.storage
      .from("trip-photos")
      .list(prefix, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
    if (page.error)
      throw new Error(
        `Не удалось проверить фото поездки: ${page.error.message}`,
      );
    for (const entry of page.data) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id) paths.push(path);
      else paths.push(...(await listStoragePaths(path)));
    }
    if (page.data.length < 100) break;
  }
  return paths;
}
export async function deleteTrip(id: string) {
  const prepared = await supabase.rpc("prepare_trip_delete", {
    target_trip: id,
  });
  fail("Не удалось подготовить удаление поездки", prepared.error);
  const paths = await listStoragePaths(id);
  for (let index = 0; index < paths.length; index += 100) {
    const removed = await supabase.storage
      .from("trip-photos")
      .remove(paths.slice(index, index + 100));
    if (removed.error)
      throw new Error(
        `Не удалось удалить фото поездки: ${removed.error.message}`,
      );
  }
  const finalized = await supabase.rpc("finalize_trip_delete", {
    target_trip: id,
  });
  fail("Не удалось удалить поездку", finalized.error);
}
export async function listMembers(tripId: string): Promise<TripMember[]> {
  const result = await supabase.rpc("list_trip_members", {
    target_trip: tripId,
  });
  fail("Не удалось загрузить участников", result.error);
  return rows(result.data).map((r) => ({
    tripId,
    userId: asText(r.user_id),
    email: asText(r.email),
    role: r.role as TripRole,
    createdAt: asText(r.created_at),
  }));
}
export async function listInvitations(
  tripId: string,
): Promise<TripInvitation[]> {
  const result = await query(
    supabase
      .from("trip_invitations")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false }),
  );
  fail("Не удалось загрузить приглашения", result.error);
  const now = Date.now();
  return rows(result.data).map((r) => {
    const expiresAt = asText(r.expires_at);
    const stored = asText(r.status);
    const status: TripInvitation["status"] =
      stored === "pending" && Date.parse(expiresAt) <= now
        ? "expired"
        : stored === "accepted" || stored === "revoked"
          ? stored
          : "pending";
    return {
      id: r.id,
      tripId,
      email: asText(r.email),
      status,
      expiresAt,
      createdAt: asText(r.created_at),
    };
  });
}
export async function createInvitation(
  tripId: string,
  email: string,
): Promise<CreatedInvitation> {
  const result = await supabase.rpc("create_trip_invitation", {
    target_trip: tripId,
    target_email: email,
  });
  fail("Не удалось создать приглашение", result.error);
  const created = firstRecord(result.data);
  return {
    id: asText(created.invitation_id),
    tripId,
    email: email.trim().toLowerCase(),
    status: "pending",
    expiresAt: asText(created.expires_at),
    createdAt: new Date().toISOString(),
    token: asText(created.token),
  };
}
export async function revokeInvitation(id: string) {
  const result = await supabase.rpc("revoke_trip_invitation", {
    target_invitation: id,
  });
  fail("Не удалось отозвать приглашение", result.error);
}
export async function acceptInvitation(token: string) {
  const result = await supabase.rpc("accept_trip_invitation", {
    raw_token: token,
  });
  fail("Не удалось принять приглашение", result.error);
  return result.data as string;
}

export interface StoredPhoto {
  id: string;
  thumb: string;
  iso: string | null;
  lat: number | null;
  lng: number | null;
  place: string | null;
  tripId: string;
}
export async function loadTripPhotos(tripId: string): Promise<StoredPhoto[]> {
  const result = await query(
    supabase
      .from("trip_photos")
      .select("*")
      .eq("trip_id", tripId)
      .eq("pending_delete", false)
      .order("position"),
  );
  fail("Не удалось загрузить фото", result.error);
  return Promise.all(
    rows(result.data).map(async (row) => {
      const signed = await supabase.storage
        .from("trip-photos")
        .createSignedUrl(asText(row.object_path), 3600);
      return {
        id: row.id,
        tripId,
        thumb: signed.data?.signedUrl ?? "",
        iso: asText(row.taken_on) || null,
        lat: row.latitude == null ? null : asNumber(row.latitude),
        lng: row.longitude == null ? null : asNumber(row.longitude),
        place: asText(row.place) || null,
        placeSynced: true,
      };
    }),
  );
}
export async function uploadTripPhoto(
  tripId: string,
  file: File,
  metadata: {
    iso: string | null;
    lat: number | null;
    lng: number | null;
    place: string | null;
  },
) {
  const id = crypto.randomUUID();
  const extension = (file.name.split(".").pop() || "jpg")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
  const path = `${tripId}/${id}.${extension}`;
  const uploaded = await supabase.storage
    .from("trip-photos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploaded.error)
    throw new Error(`Не удалось загрузить фото: ${uploaded.error.message}`);
  const inserted = await query(
    supabase
      .from("trip_photos")
      .insert({
        id,
        trip_id: tripId,
        object_path: path,
        taken_on: metadata.iso,
        latitude: metadata.lat,
        longitude: metadata.lng,
        place: metadata.place,
        position: Math.min(Date.now(), Number.MAX_SAFE_INTEGER),
      })
      .select("id")
      .single(),
  );
  if (inserted.error) {
    await supabase.storage.from("trip-photos").remove([path]);
    fail("Не удалось сохранить фото", inserted.error);
  }
  return id;
}
export async function updateTripPhotoPlace(
  tripId: string,
  id: string,
  place: string,
) {
  const result = await supabase.rpc("update_trip_photo_place", {
    target_trip: tripId,
    target_photo: id,
    target_place: place,
  });
  fail("Не удалось сохранить место фото", result.error);
}
export async function cleanupPendingPhotoDeletes(tripId: string) {
  const result = await query(
    supabase
      .from("trip_photos")
      .select("id,object_path")
      .eq("trip_id", tripId)
      .eq("pending_delete", true),
  );
  fail("Не удалось проверить незавершённые удаления фото", result.error);
  for (const row of rows(result.data)) {
    const removed = await supabase.storage
      .from("trip-photos")
      .remove([asText(row.object_path)]);
    if (removed.error) continue;
    const finalized = await supabase.rpc("finalize_trip_photo_delete", {
      target_trip: tripId,
      target_photo: row.id,
    });
    fail("Не удалось завершить удаление фото", finalized.error);
  }
}
export async function deleteTripPhoto(tripId: string, id: string) {
  const prepared = await supabase.rpc("prepare_trip_photo_delete", {
    target_trip: tripId,
    target_photo: id,
  });
  fail("Не удалось подготовить удаление фото", prepared.error);
  const path = asText(prepared.data);
  const removed = await supabase.storage.from("trip-photos").remove([path]);
  if (removed.error)
    throw new Error(`Не удалось удалить файл: ${removed.error.message}`);
  const finalized = await supabase.rpc("finalize_trip_photo_delete", {
    target_trip: tripId,
    target_photo: id,
  });
  fail("Не удалось завершить удаление фото", finalized.error);
}

export function subscribeToTrip(
  tripId: string,
  changed: () => void,
  photosChanged: () => void,
) {
  let timer = 0;
  const notify = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(changed, 150);
  };
  const aggregateTables = [
    "trips",
    "trip_members",
    "trip_invitations",
    "trip_days",
    "day_items",
    "lodgings",
    "places",
    "expenses",
    "notes",
    "useful_links",
  ];
  const channels: RealtimeChannel[] = aggregateTables.map((table) =>
    supabase
      .channel(`trip:${tripId}:${table}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter:
            table === "trips" ? `id=eq.${tripId}` : `trip_id=eq.${tripId}`,
        },
        notify,
      )
      .subscribe(),
  );
  channels.push(
    supabase
      .channel(`trip:${tripId}:trip_photos`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_photos",
          filter: `trip_id=eq.${tripId}`,
        },
        photosChanged,
      )
      .subscribe(),
  );
  return () => {
    window.clearTimeout(timer);
    channels.forEach((channel) => {
      void supabase.removeChannel(channel);
    });
  };
}
