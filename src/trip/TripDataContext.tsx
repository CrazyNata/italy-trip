import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "../auth/AuthContext";
import type {
  CreatedInvitation,
  TripInvitation,
  TripMember,
  TripSummary,
} from "../lib/supabase/database";
import { supabase } from "../lib/supabase/client";
import {
  parseTripPayload,
  readCachedTrip,
  TRIP_STATE_VERSION,
  type TripData,
  type TripPayload,
} from "../types/trip";
import * as repository from "./normalizedRepository";

const PUSH_DELAY = 900;
export type TripSyncState = "clean" | "dirty" | "saving" | "failed" | "conflict";

interface TripDataContextValue {
  payload: TripPayload | null;
  data: TripData | null;
  loading: boolean;
  error: string | null;
  usingCache: boolean;
  isReadOnly: boolean;
  syncState: TripSyncState;
  trips: TripSummary[];
  selectedTrip: TripSummary | null;
  members: TripMember[];
  invitations: TripInvitation[];
  updateData: (update: (current: TripData) => TripData) => void;
  refresh: () => Promise<void>;
  retrySave: () => Promise<void>;
  keepLocalChanges: () => Promise<void>;
  useServerVersion: () => void;
  restoredChanges: boolean;
  selectTrip: (id: string) => void;
  createTrip: (name: string) => Promise<string>;
  renameTrip: (name: string) => Promise<void>;
  deleteTrip: (confirmation: string) => Promise<void>;
  createInvitation: (email: string) => Promise<CreatedInvitation>;
  revokeInvitation: (id: string) => Promise<void>;
  acceptInvitation: (token: string) => Promise<string>;
}
interface TripWrite {
  payload: TripPayload;
  revision: number;
  ownerId: string;
  timer: number | null;
  inFlight: Promise<void> | null;
  failed: boolean;
}
interface TripConflict {
  tripId: string;
  server: TripPayload;
  revision: number;
}
const TripDataContext = createContext<TripDataContextValue | null>(null);

function cacheKey(userId: string, tripId: string) {
  return `italy_trip:${userId}:${tripId}`;
}
function writeKey(userId: string, tripId: string) {
  return `italy_trip:pending:${userId}:${tripId}`;
}
function persistWrite(userId: string, tripId: string, work: TripWrite) {
  localStorage.setItem(
    writeKey(userId, tripId),
    JSON.stringify({ payload: work.payload, revision: work.revision, ownerId: work.ownerId }),
  );
}
function removePersistedWrite(userId: string, tripId: string) {
  localStorage.removeItem(writeKey(userId, tripId));
}
function readCache(userId: string, tripId: string) {
  try {
    const raw = localStorage.getItem(cacheKey(userId, tripId));
    return raw ? parseTripPayload(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
function writeCache(userId: string, tripId: string, payload: TripPayload) {
  try {
    localStorage.setItem(cacheKey(userId, tripId), JSON.stringify(payload));
  } catch {
    /* optional */
  }
}

export function TripDataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payload, setPayload] = useState<TripPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const [syncState, setSyncState] = useState<TripSyncState>("clean");
  const [conflict, setConflict] = useState<TripConflict | null>(null);
  const [restoredChanges, setRestoredChanges] = useState(false);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [invitations, setInvitations] = useState<TripInvitation[]>([]);
  const generation = useRef(0);
  const payloadRef = useRef<TripPayload | null>(null);
  const revisions = useRef(new Map<string, number>());
  const writes = useRef(new Map<string, TripWrite>());
  const selectedTrip = trips.find((trip) => trip.id === selectedId) ?? null;
  const isReadOnly = selectedTrip ? selectedTrip.role !== "owner" : true;

  function apply(next: TripPayload, cached = false) {
    payloadRef.current = next;
    setPayload(next);
    setUsingCache(cached);
  }
  async function loadAccess(tripId: string, owner: boolean) {
    const [nextMembers, nextInvitations] = await Promise.all([
      repository.listMembers(tripId),
      owner ? repository.listInvitations(tripId) : Promise.resolve([]),
    ]);
    setMembers(nextMembers);
    setInvitations(nextInvitations);
  }
  async function loadTrip(tripId: string, silent = false) {
    if (!user) return;
    const request = ++generation.current;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const loaded = await repository.loadTrip(tripId);
      if (request !== generation.current) return;
      const local = writes.current.get(tripId);
      if (local) apply(local.payload);
      else {
        revisions.current.set(tripId, loaded.revision);
        apply(loaded.payload);
        writeCache(user.id, tripId, loaded.payload);
      }
      await loadAccess(
        tripId,
        trips.find((t) => t.id === tripId)?.role === "owner",
      );
      if (request !== generation.current) return;
      setLoading(false);
    } catch (cause) {
      if (request !== generation.current) return;
      const cached = readCache(user.id, tripId);
      if (cached) apply(cached, true);
      setError(
        cause instanceof Error ? cause.message : "Не удалось загрузить поездку",
      );
      setLoading(false);
    }
  }
  async function discover(preferred?: string) {
    if (!user) return;
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const available = await repository.listTrips();
      if (request !== generation.current) return;
      setTrips(available);
      let restored = false;
      for (const trip of available) {
        if (trip.ownerId !== user.id) continue;
        try {
          const raw = localStorage.getItem(writeKey(user.id, trip.id));
          if (!raw) continue;
          const saved = JSON.parse(raw) as Partial<TripWrite>;
          const savedPayload = parseTripPayload(saved.payload);
          if (!savedPayload || typeof saved.revision !== "number" || saved.ownerId !== user.id)
            continue;
          writes.current.set(trip.id, {
            payload: savedPayload,
            revision: saved.revision,
            ownerId: user.id,
            timer: null,
            inFlight: null,
            failed: false,
          });
          restored = true;
        } catch {
          // Invalid pending data is ignored but retained for manual recovery.
        }
      }
      setRestoredChanges(restored);
      if (available.length) {
        const stored = localStorage.getItem(`italy_trip:selected:${user.id}`);
        const id = available.some((t) => t.id === (preferred ?? stored))
          ? (preferred ?? stored)!
          : available[0].id;
        setSelectedId(id);
        await loadTrip(id);
        return;
      }
      const legacy = readCachedTrip();
      const remote = await supabase
        .from("trip_state")
        .select("payload")
        .eq("id", "main")
        .maybeSingle();
      const parsed =
        !remote.error && remote.data
          ? parseTripPayload(remote.data.payload)
          : null;
      apply(
        parsed ?? legacy ?? { v: TRIP_STATE_VERSION, data: null as never },
        !parsed,
      );
      if (!parsed && !legacy) setPayload(null);
      setSelectedId(null);
      setMembers([]);
      setInvitations([]);
      setError(remote.error ? "Не удалось загрузить legacy-план." : null);
      setLoading(false);
    } catch (cause) {
      if (request === generation.current) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Не удалось загрузить поездки",
        );
        setLoading(false);
      }
    }
  }
  async function saveTripWrites(tripId: string, resolvingConflict = false) {
    if (!user) return;
    if (!resolvingConflict && conflict?.tripId === tripId)
      throw new Error("Сначала выберите версию после конфликта");
    const userId = user.id;
    const work = writes.current.get(tripId);
    if (!work) return;
    if (work.inFlight) return work.inFlight;
    if (work.timer !== null) {
      window.clearTimeout(work.timer);
      work.timer = null;
    }
    let recoveredConflict = false;
    const run = (async () => {
      while (writes.current.get(tripId) === work) {
        const snapshot = work.payload;
        setSyncState("saving");
        try {
          work.revision = await repository.saveTrip(
            tripId,
            snapshot.data,
            work.revision,
          );
          revisions.current.set(tripId, work.revision);
          work.failed = false;
          setError(null);
          if (work.payload === snapshot) {
            writes.current.delete(tripId);
            removePersistedWrite(userId, tripId);
            setRestoredChanges(false);
            break;
          }
          persistWrite(userId, tripId, work);
        } catch (cause) {
          work.failed = true;
          if (cause instanceof repository.TripRevisionConflictError) {
            try {
              const latest = await repository.loadTrip(tripId);
              setConflict({ tripId, server: latest.payload, revision: latest.revision });
              recoveredConflict = true;
              setSyncState("conflict");
              setError(null);
            } catch (loadCause) {
              setError(loadCause instanceof Error ? loadCause.message : "Не удалось загрузить серверную версию");
            }
            throw cause;
          }
          setError(
            cause instanceof Error
              ? cause.message
              : "Не удалось сохранить изменения",
          );
          throw cause;
        }
      }
    })();
    work.inFlight = run;
    try {
      await run;
    } finally {
      work.inFlight = null;
      const remaining = writes.current.get(tripId);
      if (!recoveredConflict)
        setSyncState(remaining ? (remaining.failed ? "failed" : "dirty") : "clean");
    }
  }
  function schedule(tripId: string, work: TripWrite) {
    if (work.timer !== null) window.clearTimeout(work.timer);
    work.timer = window.setTimeout(() => {
      work.timer = null;
      void saveTripWrites(tripId).catch(() => undefined);
    }, PUSH_DELAY);
  }
  function updateData(update: (current: TripData) => TripData) {
    if (!user || !selectedTrip || isReadOnly || !payloadRef.current) return;
    if (conflict?.tripId === selectedTrip.id) {
      window.dispatchEvent(
        new CustomEvent("trip:toast", {
          detail: "Сначала выберите версию после конфликта",
        }),
      );
      return;
    }
    const next = {
      ...payloadRef.current,
      data: update(structuredClone(payloadRef.current.data)),
    };
    const work = writes.current.get(selectedTrip.id) ?? {
      payload: next,
      revision: revisions.current.get(selectedTrip.id) ?? selectedTrip.revision,
      ownerId: selectedTrip.ownerId,
      timer: null,
      inFlight: null,
      failed: false,
    };
    if (work.ownerId !== user.id) return;
    work.payload = next;
    work.failed = false;
    writes.current.set(selectedTrip.id, work);
    try {
      persistWrite(user.id, selectedTrip.id, work);
    } catch {
      work.failed = true;
      setError("Не удалось сохранить резервную копию изменений в браузере");
      setSyncState("failed");
      apply(next);
      writeCache(user.id, selectedTrip.id, next);
      return;
    }
    apply(next);
    writeCache(user.id, selectedTrip.id, next);
    setSyncState("dirty");
    schedule(selectedTrip.id, work);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setTrips([]);
      setPayload(null);
      return;
    }
    writes.current.clear();
    revisions.current.clear();
    setConflict(null);
    setRestoredChanges(false);
    void discover();
    return () => {
      generation.current += 1;
    };
  }, [authLoading, user?.id]);
  useEffect(() => {
    if (!user || !selectedTrip) return;
    localStorage.setItem(`italy_trip:selected:${user.id}`, selectedTrip.id);
    return repository.subscribeToTrip(
      selectedTrip.id,
      () => {
        if (!writes.current.has(selectedTrip.id))
          void loadTrip(selectedTrip.id, true);
      },
      () =>
        window.dispatchEvent(
          new CustomEvent("trip:photos-changed", { detail: selectedTrip.id }),
        ),
    );
  }, [user?.id, selectedTrip?.id]);
  useEffect(
    () => () => {
      generation.current += 1;
      for (const work of writes.current.values())
        if (work.timer !== null) window.clearTimeout(work.timer);
    },
    [],
  );

  function selectTrip(id: string) {
    if (id === selectedId || !trips.some((t) => t.id === id) || !user) return;
    void (async () => {
      if (selectedId) {
        try {
          await saveTripWrites(selectedId);
        } catch {
          return;
        }
      }
      generation.current += 1;
      const cached = readCache(user.id, id);
      setSelectedId(id);
      apply(
        cached ?? { v: TRIP_STATE_VERSION, data: null as never },
        Boolean(cached),
      );
      if (!cached) setPayload(null);
      setSyncState(
        writes.current.get(id)?.failed
          ? "failed"
          : writes.current.has(id)
            ? "dirty"
            : "clean",
      );
      await loadTrip(id);
    })();
  }
  async function keepLocalChanges() {
    if (!user || !conflict) return;
    const work = writes.current.get(conflict.tripId);
    if (!work) return;
    work.revision = conflict.revision;
    work.failed = false;
    persistWrite(user.id, conflict.tripId, work);
    setConflict(null);
    setSyncState("dirty");
    await saveTripWrites(conflict.tripId, true);
  }
  function useServerVersion() {
    if (!user || !conflict || !window.confirm("Отменить локальные несохранённые изменения и использовать серверную версию?")) return;
    const work = writes.current.get(conflict.tripId);
    if (work && work.timer !== null) window.clearTimeout(work.timer);
    writes.current.delete(conflict.tripId);
    removePersistedWrite(user.id, conflict.tripId);
    revisions.current.set(conflict.tripId, conflict.revision);
    apply(conflict.server);
    writeCache(user.id, conflict.tripId, conflict.server);
    setConflict(null);
    setRestoredChanges(false);
    setSyncState("clean");
    setError(null);
  }
  async function createTrip(name: string) {
    const id = await repository.createTrip(name);
    await discover(id);
    return id;
  }
  async function renameTrip(name: string) {
    if (!selectedTrip) throw new Error("Поездка не выбрана");
    await repository.renameTrip(selectedTrip.id, name);
    await discover(selectedTrip.id);
  }
  async function deleteTrip(confirmation: string) {
    if (!selectedTrip || !user) throw new Error("Поездка не выбрана");
    if (confirmation !== selectedTrip.name)
      throw new Error("Название поездки не совпадает");
    const id = selectedTrip.id;
    await saveTripWrites(id);
    const work = writes.current.get(id);
    if (work) {
      if (work.timer !== null) window.clearTimeout(work.timer);
      if (work.inFlight) await work.inFlight;
    }
    generation.current += 1;
    await repository.deleteTrip(id);
    writes.current.delete(id);
    removePersistedWrite(user.id, id);
    revisions.current.delete(id);
    await discover();
  }
  async function createInvitation(email: string) {
    if (!selectedTrip) throw new Error("Поездка не выбрана");
    const created = await repository.createInvitation(selectedTrip.id, email);
    setInvitations(await repository.listInvitations(selectedTrip.id));
    return created;
  }
  async function revokeInvitation(id: string) {
    await repository.revokeInvitation(id);
    if (selectedTrip)
      setInvitations(await repository.listInvitations(selectedTrip.id));
  }
  async function acceptInvitation(token: string) {
    const id = await repository.acceptInvitation(token);
    await discover(id);
    return id;
  }

  return (
    <TripDataContext.Provider
      value={{
        payload,
        data: payload?.data ?? null,
        loading: authLoading || loading,
        error,
        usingCache,
        isReadOnly,
        syncState,
        trips,
        selectedTrip,
        members,
        invitations,
        updateData,
        refresh: () => (selectedTrip ? loadTrip(selectedTrip.id) : discover()),
        retrySave: () =>
          selectedTrip && !conflict ? saveTripWrites(selectedTrip.id) : Promise.resolve(),
        keepLocalChanges,
        useServerVersion,
        restoredChanges,
        selectTrip,
        createTrip,
        renameTrip,
        deleteTrip,
        createInvitation,
        revokeInvitation,
        acceptInvitation,
      }}
    >
      {children}
    </TripDataContext.Provider>
  );
}
export function useTripData() {
  const value = useContext(TripDataContext);
  if (!value)
    throw new Error("useTripData must be used inside TripDataProvider");
  return value;
}
