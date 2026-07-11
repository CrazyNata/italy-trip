import { useState, type ChangeEvent } from 'react'

import { useAppearance, type ThemeName } from '../appearance/AppearanceContext'
import { useAuth } from './AuthContext'

const swatches: Array<{ name: ThemeName; color: string }> = [{ name: 'Терракота', color: '#2a7089' }, { name: 'Охра', color: '#d99a4e' }, { name: 'Олива', color: '#5f8a6a' }]
const MAX_AVATAR_BYTES = 10 * 1024 * 1024
const MAX_AVATAR_DIMENSION = 12000
const MAX_AVATAR_PIXELS = 40_000_000

async function avatarDataUrl(file: File) {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error('Выберите PNG, JPEG или WebP')
  if (file.size > MAX_AVATAR_BYTES) throw new Error('Фото должно быть меньше 10 МБ')
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => { const element = new Image(); element.onload = () => resolve(element); element.onerror = reject; element.src = url })
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth > MAX_AVATAR_DIMENSION || image.naturalHeight > MAX_AVATAR_DIMENSION || image.naturalWidth * image.naturalHeight > MAX_AVATAR_PIXELS) throw new Error('Размер изображения слишком большой')
    const scale = Math.min(320, Math.max(image.naturalWidth, image.naturalHeight)) / Math.max(image.naturalWidth, image.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale)
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.82)
  } finally { URL.revokeObjectURL(url) }
}

export function ProfileDialog({ onClose }: { onClose: () => void }) {
  const { user, updateAvatar } = useAuth()
  const { theme, dark, setTheme, toggleDark } = useAppearance()
  const [status, setStatus] = useState('')
  const avatar = typeof user?.user_metadata.avatar_url === 'string' ? user.user_metadata.avatar_url : null

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    try { setStatus('Сохраняю фото…'); await updateAvatar(await avatarDataUrl(file)); setStatus('Фото сохранено') }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Не удалось сохранить фото') }
  }

  return <div className="fixed inset-0 z-[100001] grid place-items-center bg-[rgba(25,31,31,.45)] p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div aria-modal="true" className="w-full max-w-[390px] rounded-[18px] border border-[#e7dcc7] bg-white p-[22px] text-[#3b3228] shadow-[0_18px_55px_rgba(0,0,0,.25)]" role="dialog">
      <div className="flex items-center justify-between gap-3"><h2 className="m-0 font-display text-[25px] font-semibold">Профиль и настройки</h2><button aria-label="Закрыть" className="size-8 rounded-full border-0 bg-[#f5f0e6] text-xl text-[#6f6252]" onClick={onClose}>×</button></div>
      <div className="mt-5 flex items-center gap-3.5 rounded-[13px] bg-[#fbf7ee] p-3.5">
        {avatar ? <img alt="" className="size-[60px] rounded-full object-cover" src={avatar} /> : <div className="grid size-[60px] place-items-center rounded-full bg-[#dbeae8] text-xl font-bold">{user?.email?.[0]?.toUpperCase() ?? '?'}</div>}
        <div className="min-w-0 flex-1"><div className="font-bold">Фото профиля</div><div className="mt-1 text-xs text-[#8a7d6b]">PNG, JPEG или WebP</div></div>
        <label className="cursor-pointer rounded-lg border border-[#d8c9ac] bg-white px-2.5 py-2 text-xs font-bold">Изменить<input accept="image/png,image/jpeg,image/webp" className="hidden" onChange={upload} type="file" /></label>
      </div>
      <div aria-live="polite" className="ml-[74px] mt-2 min-h-[17px] text-xs text-[#8a7d6b]">{status}</div>
      <div className="mt-4 border-t border-[#efe4cf] pt-4"><div className="mb-2.5 text-[11px] uppercase tracking-[.09em] text-[#a2937c]">Оформление</div><div className="flex items-center gap-2.5">
        {swatches.map(({ name, color }) => <button aria-label={name} className={`size-7 rounded-full border-[3px] border-white shadow-[0_0_0_1px_#d5c9b6] ${theme === name ? 'ring-2 ring-[#3b3228]' : ''}`} key={name} onClick={() => setTheme(name)} style={{ background: color }} title={name} />)}
        <button className="ml-1 rounded-lg border border-[#d8c9ac] bg-white px-2.5 py-2 text-xs font-semibold" onClick={toggleDark}>{dark ? '☀ Светлая' : '☾ Тёмная'}</button>
      </div></div>
    </div>
  </div>
}
