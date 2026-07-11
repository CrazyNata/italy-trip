import { useRef, useState, type KeyboardEvent } from 'react'

import { useAuth } from '../auth'
import { useTripData } from '../trip/TripDataContext'

const tabs = [
  'Обзор',
  'Маршрут',
  'Жильё',
  'Отмена',
  'Места',
  'Бюджет',
  'Фото',
  'Заметки',
] as const

export function AppShell() {
  const { isOwner, error: authError } = useAuth()
  const { data, loading, error, usingCache, refresh } = useTripData()
  const [selectedTab, setSelectedTab] = useState(0)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  function selectTab(index: number) {
    setSelectedTab(index)
    tabRefs.current[index]?.focus()
  }

  function handleTabKeyDown(event: KeyboardEvent, index: number) {
    let nextIndex: number | undefined

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabs.length - 1

    if (nextIndex !== undefined) {
      event.preventDefault()
      selectTab(nextIndex)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <header className="mx-auto max-w-[1120px] px-4 pt-7 sm:px-6 sm:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ac)]">
              <span className="h-px w-6 bg-current" aria-hidden="true" />
              Италия · осень 2026
            </p>
            <h1 className="mt-2 font-display text-[clamp(2.75rem,6.4vw,4.625rem)] font-semibold leading-none tracking-[-0.015em]">
              Отпуск с семьёй
              <br />в Италии <span aria-hidden="true">🍋</span>
            </h1>
            <p className="mt-4 max-w-[460px] text-[15px] leading-relaxed text-[var(--muted)]">
              25 сентября — 12 октября · маршрут, жильё, места и бюджет
              семейного путешествия.
            </p>
          </div>

          <div className="rounded-[14px] border border-[var(--line)] bg-[var(--card)] px-5 py-3.5 text-center">
            <p className="font-mono text-4xl font-bold leading-none text-[var(--ol)]">17</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              ночей
            </p>
          </div>
        </div>

        <nav
          className="-mx-4 mt-7 flex overflow-x-auto border-b border-[var(--line)] px-4 sm:mx-0 sm:px-0"
          aria-label="Разделы поездки"
          role="tablist"
        >
          {tabs.map((tab, index) => (
            <button
              className={`shrink-0 border-b-2 px-3 py-3 text-base font-semibold transition-colors sm:px-[18px] sm:text-[17px] ${
                index === selectedTab
                  ? 'border-[var(--ac)] text-[var(--ac)]'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
              aria-controls={`panel-${index}`}
              aria-selected={index === selectedTab}
              id={`tab-${index}`}
              key={tab}
              onClick={() => setSelectedTab(index)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              ref={(element) => {
                tabRefs.current[index] = element
              }}
              role="tab"
              tabIndex={index === selectedTab ? 0 : -1}
              type="button"
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[1120px] px-4 pb-20 pt-7 sm:px-6">
        {(loading || authError || error || !isOwner || usingCache) && <div className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${authError || error ? 'border-[#d8a08d] bg-[#fff2ed] text-[#7f3524]' : 'border-[var(--line)] bg-[var(--soft)] text-[var(--muted)]'}`} role="status">
          <span>{loading ? 'Загружаем актуальный план…' : authError ?? error ?? (usingCache ? 'Показана локальная копия плана.' : 'Режим просмотра: редактировать план может только владелец.')}</span>
          {error && <button className="rounded-lg border border-current px-2.5 py-1 font-semibold" onClick={() => void refresh()}>Повторить</button>}
        </div>}
        {tabs.map((tab, index) => (
          <section
            aria-labelledby={`tab-${index}`}
            className="rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_12px_40px_rgba(23,58,61,0.06)] sm:p-8"
            hidden={index !== selectedTab}
            id={`panel-${index}`}
            key={tab}
            role="tabpanel"
            tabIndex={0}
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--ac)]">
              Новая основа приложения
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">{tab}</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-[var(--muted)]">
              {data ? `Данные поездки загружены: ${data.days.length} дней, ${data.lodging.length} вариантов жилья и ${data.sights.length} мест. Перенос интерфейса раздела продолжится следующим этапом.` : 'Данные поездки пока недоступны.'}
            </p>
          </section>
        ))}
      </main>
    </div>
  )
}
