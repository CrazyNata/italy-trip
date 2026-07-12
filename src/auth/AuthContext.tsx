import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { AuthChangeEvent, User } from '@supabase/supabase-js'

import { supabase } from '../lib/supabase/client'

const REMEMBER_KEY = 'italy_remember_login'

interface AuthContextValue {
  user: User | null
  loading: boolean
  isOwner: boolean
  isReadOnly: boolean
  mapboxToken: string | null
  error: string | null
  rememberLogin: boolean
  signIn: (email: string, password: string, remember: boolean) => Promise<void>
  signUp: (email: string, password: string, remember: boolean) => Promise<boolean>
  signOut: () => Promise<void>
  updateAvatar: (avatar: Blob) => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function remembered() {
  try { return localStorage.getItem(REMEMBER_KEY) !== '0' } catch { return true }
}

export function humanAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Что-то пошло не так'
  const normalized = message.toLowerCase()
  if (normalized.includes('invalid login')) return 'Неверный email или пароль'
  if (normalized.includes('already registered') || normalized.includes('already exists')) return 'Этот email уже зарегистрирован — войдите'
  if (normalized.includes('password')) return 'Пароль слишком короткий (минимум 6 символов)'
  if (normalized.includes('email') && normalized.includes('valid')) return 'Некорректный email'
  if (normalized.includes('rate limit')) return 'Слишком много попыток, попробуйте позже'
  return message
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [mapboxToken, setMapboxToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rememberLogin, setRememberLogin] = useState(remembered)
  const userId = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    let generation = 0

    async function applyIdentity(nextUser: User | null, preserveError = false) {
      const current = ++generation
      setLoading(true)
      if (!preserveError) setError(null)
      if (!nextUser) {
        if (!active) return
        userId.current = null
        setUser(null)
        setIsOwner(false)
        setMapboxToken(null)
        setLoading(false)
        return
      }

      const [adminResult, configResult] = await Promise.all([
        supabase.from('admins').select('email').limit(1),
        supabase.from('app_config').select('value').eq('key', 'mapbox_token').maybeSingle(),
      ])
      if (!active || current !== generation) return
      userId.current = nextUser.id
      setUser(nextUser)
      setIsOwner(!adminResult.error && Boolean(adminResult.data?.length))
      setMapboxToken(!configResult.error && typeof configResult.data?.value === 'string' ? configResult.data.value : null)
      if (adminResult.error) setError('Не удалось проверить права владельца. Включён режим просмотра.')
      setLoading(false)
    }

    function onAuthChange(event: AuthChangeEvent, nextUser: User | null) {
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || (event === 'SIGNED_IN' && nextUser?.id === userId.current)) {
        if (nextUser) setUser(nextUser)
        return
      }
      if (event === 'INITIAL_SESSION') return
      void applyIdentity(nextUser)
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      onAuthChange(event, session?.user ?? null)
    })

    if (!remembered()) {
      void supabase.auth.signOut({ scope: 'local' }).then(() => applyIdentity(null))
    } else {
      void supabase.auth.getSession().then(({ data, error: sessionError }) => {
        if (sessionError) {
          if (active) setError(humanAuthError(sessionError))
          void applyIdentity(null, true)
          return
        }
        void applyIdentity(data.session?.user ?? null)
      })
    }

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // One-time heal for accounts whose avatar was stored as a base64 data URL in
  // user_metadata: that bloats the JWT to tens of KB, and Storage's proxy then
  // rejects every upload with a 400. Move it into Storage and keep a short URL.
  useEffect(() => {
    const avatar = user?.user_metadata?.avatar_url
    if (!user || typeof avatar !== 'string' || !avatar.startsWith('data:')) return
    const id = user.id
    let cancelled = false
    void (async () => {
      try {
        const blob = await (await fetch(avatar)).blob()
        // Clearing the avatar updates the stored metadata, but the *current*
        // access token keeps the old (huge) claim until the session is
        // refreshed — so refresh to mint a small token before uploading.
        await supabase.auth.updateUser({ data: { avatar_url: null } })
        const refreshed = await supabase.auth.refreshSession()
        if (cancelled) return
        if (refreshed.data.user) setUser(refreshed.data.user)
        const path = `avatars/${id}_${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('place-photos')
          .upload(path, blob, { upsert: true, contentType: blob.type || 'image/jpeg' })
        if (cancelled || uploadError) return
        const publicUrl = supabase.storage.from('place-photos').getPublicUrl(path).data.publicUrl
        await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
        const synced = await supabase.auth.refreshSession()
        if (!cancelled && synced.data.user) setUser(synced.data.user)
      } catch { /* Leave the avatar cleared; the user can set a new one. */ }
    })()
    return () => { cancelled = true }
  }, [user?.id])

  function storeRemember(value: boolean) {
    setRememberLogin(value)
    try { localStorage.setItem(REMEMBER_KEY, value ? '1' : '0') } catch { /* Storage can be unavailable. */ }
  }

  async function signIn(email: string, password: string, remember: boolean) {
    setError(null)
    storeRemember(remember)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) throw new Error(humanAuthError(signInError))
  }

  async function signUp(email: string, password: string, remember: boolean) {
    setError(null)
    storeRemember(remember)
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) throw new Error(humanAuthError(signUpError))
    return Boolean(data.session)
  }

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      setError(humanAuthError(signOutError))
      throw signOutError
    }
  }

  // Uploads the avatar to Storage and keeps only its short public URL in the
  // user's metadata, so the auth JWT (which embeds user_metadata) stays small.
  async function putAvatar(blob: Blob) {
    const id = userId.current ?? 'user'
    const path = `avatars/${id}_${Date.now()}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('place-photos')
      .upload(path, blob, { upsert: true, contentType: blob.type || 'image/jpeg' })
    if (uploadError) throw uploadError
    return supabase.storage.from('place-photos').getPublicUrl(path).data.publicUrl
  }

  async function updateAvatar(avatar: Blob) {
    const publicUrl = await putAvatar(avatar)
    const { data, error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
    if (updateError) throw updateError
    setUser(data.user)
  }

  return <AuthContext.Provider value={{ user, loading, isOwner, isReadOnly: !isOwner, mapboxToken, error, rememberLogin, signIn, signUp, signOut, updateAvatar, clearError: () => setError(null) }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
