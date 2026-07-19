import { useState, type FormEvent } from 'react'

import { useAuth } from './AuthContext'

export function AuthGate() {
  const { signIn, signUp, rememberLogin, error: authError } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(rememberLogin)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const visibleMessage = message ?? (authError ? { text: authError, ok: false } : null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setMessage(null)
    try {
      if (mode === 'login') await signIn(email.trim(), password, remember)
      else if (!await signUp(email.trim(), password, remember)) {
        setMode('login')
        setMessage({ text: 'Аккаунт создан. Подтвердите email по ссылке из письма, затем войдите.', ok: true })
      }
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Что-то пошло не так', ok: false })
    } finally { setBusy(false) }
  }

  return <div className="auth-screen fixed inset-0 z-[99999] overflow-auto" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/hero-como.webp)` }}>
    <div className="auth-content">
      <div className="auth-mark"><i className="fa-solid fa-plane-departure" /></div>
      <div className="eyebrow mt-7 !text-[#e4c9a0]">Италия · осень 2026</div>
      <h1>Наше<br />путешествие</h1>
      <p>Маршрут, жильё, места и бюджет — всё в одном месте.</p>
      <form className="auth-form" onSubmit={submit}>
        <label><i className="fa-regular fa-envelope" /><input autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="e-mail" required type="email" value={email} /></label>
        <label><i className="fa-solid fa-lock" /><input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} onChange={(event) => setPassword(event.target.value)} placeholder="Пароль" required type="password" value={password} /></label>
        <div className="auth-options"><label><input checked={remember} onChange={(event) => setRemember(event.target.checked)} type="checkbox" />Запомнить меня</label></div>
        <button className="auth-submit" disabled={busy} type="submit">{busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}</button>
        <div aria-live="polite" className={`min-h-[18px] text-[12px] leading-snug ${visibleMessage?.ok ? 'text-[#cde2c4]' : 'text-[#ffd2c2]'}`}>{visibleMessage?.text}</div>
      </form>
      <button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage(null) }} type="button">{mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}</button>
    </div>
  </div>
}
