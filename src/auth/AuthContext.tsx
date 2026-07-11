import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'

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
  updateAvatar: (avatarUrl: string) => Promise<void>
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

  useEffect(() => {
    let active = true
    let generation = 0

    async function applyUser(nextUser: User | null) {
      const current = ++generation
      setLoading(true)
      setError(null)
      if (!nextUser) {
        if (!active) return
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
      setUser(nextUser)
      setIsOwner(!adminResult.error && Boolean(adminResult.data?.length))
      setMapboxToken(!configResult.error && typeof configResult.data?.value === 'string' ? configResult.data.value : null)
      if (adminResult.error) setError('Не удалось проверить права владельца. Включён режим просмотра.')
      setLoading(false)
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyUser(session?.user ?? null)
    })

    if (!remembered()) {
      void supabase.auth.signOut({ scope: 'local' }).then(() => applyUser(null))
    } else {
      void supabase.auth.getSession().then(({ data, error: sessionError }) => {
        if (sessionError && active) setError(humanAuthError(sessionError))
        void applyUser(data.session?.user ?? null)
      })
    }

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

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

  async function updateAvatar(avatarUrl: string) {
    const { data, error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } })
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
