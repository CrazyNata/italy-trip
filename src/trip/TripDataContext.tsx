import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { useAuth } from "../auth/AuthContext";
import { supabase } from "../lib/supabase/client";
import { parseTripPayload, readCachedTrip, type TripData, type TripPayload } from "../types/trip";

const ROW_ID = "main";
const PUSH_DELAY = 1500;
const POLL_DELAY = 15000;

export type TripSyncState = "clean" | "dirty" | "saving" | "failed";

interface TripDataContextValue {
  payload: TripPayload | null;
  data: TripData | null;
  loading: boolean;
  error: string | null;
  usingCache: boolean;
  isReadOnly: boolean;
  syncState: TripSyncState;
  updateData: (update: (current: TripData) => TripData) => void;
  refresh: () => Promise<void>;
  retrySave: () => Promise<void>;
}

const TripDataContext = createContext<TripDataContextValue | null>(null);

function cachePayload(payload: TripPayload) {
  try {
    localStorage.setItem("italy_trip", JSON.stringify(payload));
  } catch {
    // The browser cache is optional; Supabase remains authoritative.
  }
}

export function TripDataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, isOwner } = useAuth();
  const cached = useRef(readCachedTrip());
  const payloadRef = useRef<TripPayload | null>(cached.current);
  const pendingPayload = useRef<TripPayload | null>(null);
  const syncStateRef = useRef<TripSyncState>("clean");
  const readSequence = useRef(0);
  const readQueue = useRef<Promise<void>>(Promise.resolve());
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlight = useRef(false);
  const mounted = useRef(true);
  const [payload, setPayload] = useState<TripPayload | null>(cached.current);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(Boolean(cached.current));
  const [syncState, setSyncStateValue] = useState<TripSyncState>("clean");

  function setSyncState(next: TripSyncState) {
    syncStateRef.current = next;
    if (mounted.current) setSyncStateValue(next);
  }

  function scheduleSave() {
    if (!isOwner || !user || !pendingPayload.current || saveInFlight.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => void savePending(), PUSH_DELAY);
  }

  async function savePending() {
    if (!isOwner || !user || !pendingPayload.current || saveInFlight.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = null;
    const saving = pendingPayload.current;
    const serialized = JSON.stringify(saving);
    saveInFlight.current = true;
    setSyncState("saving");
    readSequence.current += 1;
    const { error: pushError } = await supabase.from("trip_state").upsert({
      id: ROW_ID,
      payload: saving,
      updated_at: new Date().toISOString(),
    });
    saveInFlight.current = false;
    if (!mounted.current) return;
    setLoading(false);
    if (pushError) {
      setSyncState("failed");
      setError("Не удалось сохранить изменения. Локальная копия сохранена и готова к повторной отправке.");
      return;
    }
    if (pendingPayload.current && JSON.stringify(pendingPayload.current) !== serialized) {
      setSyncState("dirty");
      scheduleSave();
      return;
    }
    pendingPayload.current = null;
    setSyncState("clean");
    setUsingCache(false);
    setError(null);
  }

  function pullRemote(silent = false): Promise<void> {
    const request = ++readSequence.current;
    readQueue.current = readQueue.current.then(async () => {
      if (!user || syncStateRef.current !== "clean") return;
      if (!silent) setLoading(true);
      const { data: row, error: pullError } = await supabase
        .from("trip_state")
        .select("payload")
        .eq("id", ROW_ID)
        .maybeSingle();
      if (!mounted.current || request !== readSequence.current || syncStateRef.current !== "clean") return;
      if (pullError) {
        setError("Не удалось загрузить план из Supabase. Показана локальная копия, если она доступна.");
        setUsingCache(Boolean(payloadRef.current));
        setLoading(false);
        return;
      }
      if (!row) {
        if (isOwner && cached.current) {
          pendingPayload.current = cached.current;
          setSyncState("dirty");
          setLoading(false);
          await savePending();
        } else {
          setError("План пока не опубликован владельцем.");
          setUsingCache(Boolean(cached.current));
          setLoading(false);
        }
        return;
      }
      const parsed = parseTripPayload(row.payload);
      if (!parsed) {
        setError("Supabase вернул неподдерживаемый формат плана. Показана локальная копия, если она доступна.");
        setUsingCache(Boolean(payloadRef.current));
        setLoading(false);
        return;
      }
      cached.current = parsed;
      payloadRef.current = parsed;
      cachePayload(parsed);
      setPayload(parsed);
      setUsingCache(false);
      setError(null);
      setLoading(false);
    }).catch(() => {
      if (mounted.current && request === readSequence.current && syncStateRef.current === "clean") {
        setError("Не удалось загрузить план из Supabase. Показана локальная копия, если она доступна.");
        setLoading(false);
      }
    });
    return readQueue.current;
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setUsingCache(Boolean(cached.current));
      return;
    }
    void pullRemote();
    const channel = supabase
      .channel("trip-state-main")
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_state", filter: `id=eq.${ROW_ID}` }, () => void pullRemote(true))
      .subscribe();
    const poll = window.setInterval(() => void pullRemote(true), POLL_DELAY);
    return () => {
      readSequence.current += 1;
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [authLoading, user?.id, isOwner]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, []);

  function updateData(update: (current: TripData) => TripData) {
    const current = payloadRef.current;
    if (!isOwner || !user || !current) return;
    const next = { ...current, data: update(structuredClone(current.data)) };
    payloadRef.current = next;
    pendingPayload.current = next;
    cached.current = next;
    cachePayload(next);
    setPayload(next);
    setUsingCache(false);
    if (!saveInFlight.current) {
      setSyncState("dirty");
      scheduleSave();
    }
  }

  return (
    <TripDataContext.Provider value={{
      payload,
      data: payload?.data ?? null,
      loading: authLoading || loading,
      error,
      usingCache,
      isReadOnly: !isOwner,
      syncState,
      updateData,
      refresh: () => pullRemote(),
      retrySave: savePending,
    }}>
      {children}
    </TripDataContext.Provider>
  );
}

export function useTripData() {
  const value = useContext(TripDataContext);
  if (!value) throw new Error("useTripData must be used inside TripDataProvider");
  return value;
}
