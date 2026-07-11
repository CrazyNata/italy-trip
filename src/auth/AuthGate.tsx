import { useState, type FormEvent } from 'react'

import { useAuth } from './AuthContext'

export function AuthGate() {
  const { signIn, signUp, rememberLogin } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(rememberLogin)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

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

  return <div className="fixed inset-0 z-[99999] grid place-items-center overflow-auto bg-[radial-gradient(120%_90%_at_0%_0%,#2a708922,transparent_55%),radial-gradient(120%_90%_at_100%_100%,#d99a4e22,transparent_55%),#eaf1f1] p-5">
    <div className="w-full max-w-[380px] rounded-[18px] border border-[#e7dcc7] bg-white px-6 py-[26px] text-[#3b3228] shadow-[0_12px_40px_rgba(59,50,40,.16)]">
      <h1 className="m-0 font-display text-2xl font-semibold">Поездка по Италии</h1>
      <p className="mb-5 mt-1 text-sm text-[#8a7d6b]">{mode === 'login' ? 'Войдите, чтобы открыть план поездки' : 'Создайте аккаунт, чтобы смотреть план'}</p>
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <input className="rounded-[11px] border border-[#e7dcc7] bg-[#fbf7ee] px-[13px] py-3 outline-none focus:border-[#b95c3f]" autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="Email" required type="email" value={email} />
        <input className="rounded-[11px] border border-[#e7dcc7] bg-[#fbf7ee] px-[13px] py-3 outline-none focus:border-[#b95c3f]" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} onChange={(event) => setPassword(event.target.value)} placeholder="Пароль" required type="password" value={password} />
        <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] text-[#6f6252]"><input checked={remember} className="size-[15px] accent-[#b95c3f]" onChange={(event) => setRemember(event.target.checked)} type="checkbox" />Запомнить меня</label>
        <button className="mt-1 rounded-[11px] bg-[#b95c3f] p-3 font-semibold text-white disabled:cursor-default disabled:opacity-60" disabled={busy} type="submit">{busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}</button>
        <div aria-live="polite" className={`min-h-[18px] text-[13px] leading-snug ${message?.ok ? 'text-[#2f7d4f]' : 'text-[#b95c3f]'}`}>{message?.text}</div>
      </form>
      <button className="w-full bg-transparent p-1.5 text-sm text-[#8a7d6b]" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage(null) }} type="button">{mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}</button>
    </div>
  </div>
}
