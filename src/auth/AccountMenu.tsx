import { useEffect, useRef, useState } from 'react'

import { useAuth } from './AuthContext'
import { ProfileDialog } from './ProfileDialog'

export function AccountMenu() {
  const { user, isOwner, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const avatarUrl = typeof user?.user_metadata.avatar_url === 'string' ? user.user_metadata.avatar_url : null

  useEffect(() => {
    function close(event: MouseEvent) { if (!container.current?.contains(event.target as Node)) setOpen(false) }
    function escape(event: KeyboardEvent) { if (event.key === 'Escape') { setOpen(false); setProfileOpen(false) } }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape) }
  }, [])

  if (!user) return null
  return <><div className="fixed right-3.5 top-3 z-[9998]" ref={container}>
    <button aria-expanded={open} aria-label="Аккаунт" className="grid size-[46px] place-items-center overflow-hidden rounded-full border-2 border-white bg-[var(--ac)] p-0 text-[15px] font-bold text-white shadow-[0_3px_12px_rgba(59,50,40,.28)]" onClick={() => setOpen(!open)} title={user.email}>{avatarUrl ? <img alt="" className="size-full object-cover" src={avatarUrl} /> : user.email?.[0]?.toUpperCase() ?? '?'}</button>
    {open && <div className="absolute right-0 top-12 w-[min(82vw,250px)] rounded-[14px] border border-[#e7dcc7] bg-white px-[15px] py-[13px] text-[#3b3228] shadow-[0_14px_38px_rgba(59,50,40,.22)]">
      <div className="text-[11px] uppercase tracking-[.06em] text-[#a2937c]">Вы вошли как</div><div className="break-all text-[13px] font-semibold leading-snug">{user.email}</div>
      <div className={`mt-1 text-[12.5px] font-semibold ${isOwner ? 'text-[#2f7d4f]' : 'text-[#8a7d6b]'}`}>{isOwner ? '✎ редактор' : '◉ только просмотр'}</div>
      <div className="my-3 -mx-[15px] h-px bg-[#efe4cf]" />
      <button className="mb-2 flex w-full items-center gap-2 border-0 bg-transparent p-0 text-left font-semibold" onClick={() => { setOpen(false); setProfileOpen(true) }}>⚙ Профиль и настройки</button>
      <button className="flex w-full items-center gap-2 border-0 bg-transparent p-0 text-left font-semibold text-[#b95c3f]" onClick={() => { setOpen(false); void signOut() }}>↪ Выйти</button>
    </div>}
  </div>{profileOpen && <ProfileDialog onClose={() => setProfileOpen(false)} />}</>
}
