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
        >
          {tabs.map((tab, index) => (
            <button
              className={`shrink-0 border-b-2 px-3 py-3 text-base font-semibold transition-colors sm:px-[18px] sm:text-[17px] ${
                index === 0
                  ? 'border-[var(--ac)] text-[var(--ac)]'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
              key={tab}
              type="button"
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[1120px] px-4 pb-20 pt-7 sm:px-6">
        <section className="rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_12px_40px_rgba(23,58,61,0.06)] sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--ac)]">
            Новая основа приложения
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold">
            План поездки переезжает на React
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-[var(--muted)]">
            Каркас готов для поэтапного переноса данных и функций. На этом
            этапе разделы намеренно остаются без старого интерфейса.
          </p>
        </section>
      </main>
    </div>
  )
}
