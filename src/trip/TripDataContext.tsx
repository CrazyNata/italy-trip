import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

import { useAuth } from '../auth/AuthContext'
import { supabase } from '../lib/supabase/client'
import { parseTripPayload, readCachedTrip, type TripData, type TripPayload } from '../types/trip'

const ROW_ID = 'main'
const PUSH_DELAY = 1500
const POLL_DELAY = 15000

interface TripDataContextValue {
  payload: TripPayload | null
  data: TripData | null
  loading: boolean
  error: string | null
  usingCache: boolean
  isReadOnly: boolean
  updateData: (update: (current: TripData) => TripData) => void
  refresh: () => Promise<void>
}

const TripDataContext = createContext<TripDataContextValue | null>(null)

function cachePayload(payload: TripPayload) {
  try { localStorage.setItem('italy_trip', JSON.stringify(payload)) } catch { /* Cache is optional. */ }
}

export function TripDataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, isOwner } = useAuth()
  const cached = useRef(readCachedTrip())
  const [payload, setPayload] = useState<TripPayload | null>(cached.current)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingCache, setUsingCache] = useState(Boolean(cached.current))
  const lastSynced = useRef<string | null>(null)
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function pullRemote(silent = false) {
    if (!user) return
    if (!silent) setLoading(true)
    const { data: row, error: pullError } = await supabase.from('trip_state').select('payload').eq('id', ROW_ID).maybeSingle()
    if (pullError) {
      setError('Не удалось загрузить план из Supabase. Показана локальная копия, если она доступна.')
      setUsingCache(Boolean(payload))
      setLoading(false)
      return
    }
    if (!row) {
      if (isOwner && cached.current) {
        const serialized = JSON.stringify(cached.current)
        const { error: seedError } = await supabase.from('trip_state').upsert({ id: ROW_ID, payload: cached.current, updated_at: new Date().toISOString() })
        if (seedError) setError('План отсутствует на сервере, а локальную копию сохранить не удалось.')
        else { lastSynced.current = serialized; setError(null) }
      } else {
        setError('План пока не опубликован владельцем.')
      }
      setUsingCache(Boolean(cached.current))
      setLoading(false)
      return
    }
    const parsed = parseTripPayload(row.payload)
    if (!parsed) {
      setError('Supabase вернул неподдерживаемый формат плана. Показана локальная копия, если она доступна.')
      setUsingCache(Boolean(payload))
      setLoading(false)
      return
    }
    const serialized = JSON.stringify(parsed)
    lastSynced.current = serialized
    cached.current = parsed
    cachePayload(parsed)
    setPayload(parsed)
    setUsingCache(false)
    setError(null)
    setLoading(false)
  }

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      setUsingCache(Boolean(cached.current))
      return
    }
    void pullRemote()
    const channel = supabase.channel('trip-state-main').on('postgres_changes', { event: '*', schema: 'public', table: 'trip_state', filter: `id=eq.${ROW_ID}` }, () => { void pullRemote(true) }).subscribe()
    const poll = window.setInterval(() => { void pullRemote(true) }, POLL_DELAY)
    return () => {
      window.clearInterval(poll)
      void supabase.removeChannel(channel)
    }
    // Owner changes require a fresh pull so a missing row can be initialized safely.
  }, [authLoading, user?.id, isOwner])

  useEffect(() => () => { if (pushTimer.current) clearTimeout(pushTimer.current) }, [])

  function updateData(update: (current: TripData) => TripData) {
    if (!isOwner || !user || !payload) return
    const next = { ...payload, data: update(structuredClone(payload.data)) }
    const serialized = JSON.stringify(next)
    setPayload(next)
    cached.current = next
    cachePayload(next)
    setUsingCache(false)
    if (pushTimer.current) clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(async () => {
      if (serialized === lastSynced.current) return
      const { error: pushError } = await supabase.from('trip_state').upsert({ id: ROW_ID, payload: next, updated_at: new Date().toISOString() })
      if (pushError) setError('Не удалось сохранить изменения. Локальная копия сохранена; повторите позже.')
      else { lastSynced.current = serialized; setError(null) }
    }, PUSH_DELAY)
  }

  return <TripDataContext.Provider value={{ payload, data: payload?.data ?? null, loading: authLoading || loading, error, usingCache, isReadOnly: !isOwner, updateData, refresh: () => pullRemote() }}>{children}</TripDataContext.Provider>
}

export function useTripData() {
  const value = useContext(TripDataContext)
  if (!value) throw new Error('useTripData must be used inside TripDataProvider')
  return value
}
