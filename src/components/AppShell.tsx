import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { useTripData } from "../trip/TripDataContext";
import { TripManager } from "../trip/TripManager";
import { Overview } from "../features/overview/Overview";
import { Itinerary } from "../features/itinerary/Itinerary";
import { Lodging } from "../features/lodging/Lodging";
import { Sights } from "../features/sights/Sights";
import { Budget } from "../features/budget/Budget";
import { Photos } from "../features/photos/Photos";
import { Notes } from "../features/notes/Notes";

const tabs = [
  "Обзор",
  "Маршрут",
  "Жильё",
  "Отмена",
  "Места",
  "Бюджет",
  "Фото",
  "Заметки",
] as const;

export function AppShell() {
  const { data, loading, error, usingCache, syncState, refresh, retrySave, keepLocalChanges, useServerVersion, restoredChanges, isReadOnly } =
    useTripData();
  const [selectedTab, setSelectedTab] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const toastTimer = useRef<number | null>(null);
  useEffect(() => {
    const show = (event: Event) => {
      setToast(
        event instanceof CustomEvent && typeof event.detail === "string"
          ? event.detail
          : "Режим просмотра: изменения доступны только владельцу",
      );
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => {
        setToast(null);
        toastTimer.current = null;
      }, 2200);
    };
    window.addEventListener("trip:readonly", show);
    window.addEventListener("trip:toast", show);
    return () => {
      window.removeEventListener("trip:readonly", show);
      window.removeEventListener("trip:toast", show);
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    const openLodging = (event: Event) => {
      const id = event instanceof CustomEvent ? String(event.detail || "") : "";
      setSelectedTab(2);
      window.setTimeout(() => {
        const card = document.getElementById(`lodge-card-${id}`);
        card?.scrollIntoView({ behavior: "smooth", block: "center" });
        card?.classList.add("lodge-highlight");
        window.setTimeout(() => card?.classList.remove("lodge-highlight"), 1600);
      }, 50);
    };
    window.addEventListener("trip:open-lodging", openLodging);
    return () => window.removeEventListener("trip:open-lodging", openLodging);
  }, []);

  function selectTab(index: number) {
    setSelectedTab(index);
    tabRefs.current[index]?.focus();
  }

  function handleTabKeyDown(event: KeyboardEvent, index: number) {
    let nextIndex: number | undefined;

    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft")
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;

    if (nextIndex !== undefined) {
      event.preventDefault();
      selectTab(nextIndex);
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
            <p className="mt-4 max-w-[540px] text-[15px] leading-relaxed text-[var(--muted)]">
              25 сентября — 12 октября · выезжаем из Праги вдвоём с 2 собаками.
              В Риме встречаем родственников — и нас становится 4 человека и 2
              собаки. Планируем маршрут, жильё, места и бюджет.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="rounded-[14px] border border-[var(--line)] bg-[var(--card)] px-5 py-3.5 text-center">
              <p className="font-mono text-4xl font-bold leading-none text-[var(--ac)]">
                {Math.max(
                  0,
                  Math.ceil(
                    (new Date("2026-09-25T00:00:00").getTime() - Date.now()) /
                      86400000,
                  ),
                )}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                дней до выезда
              </p>
            </div>
            <div className="rounded-[14px] border border-[var(--line)] bg-[var(--card)] px-5 py-3.5 text-center">
              <p className="font-mono text-4xl font-bold leading-none text-[var(--ol)]">
                17
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                ночей
              </p>
            </div>
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
                  ? "border-[var(--ac)] text-[var(--ac)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
              aria-controls={`panel-${index}`}
              aria-selected={index === selectedTab}
              id={`tab-${index}`}
              key={tab}
              onClick={() => setSelectedTab(index)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              ref={(element) => {
                tabRefs.current[index] = element;
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
        <TripManager />
        {(loading ||
          error ||
          isReadOnly ||
          usingCache ||
          syncState !== "clean") && (
          <div
            className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${error || syncState === "failed" ? "border-[#d8a08d] bg-[#fff2ed] text-[#7f3524]" : "border-[var(--line)] bg-[var(--soft)] text-[var(--muted)]"}`}
            role="status"
          >
            <span>
              {loading
                ? "Загружаем актуальный план…"
                : (error ??
                  (syncState === "conflict"
                    ? "План изменился на сервере. Выберите, какую версию сохранить."
                    : restoredChanges
                      ? "Восстановлены несохранённые изменения из этого браузера."
                      : syncState === "dirty"
                    ? "Есть несохранённые изменения…"
                    : syncState === "saving"
                      ? "Сохраняем изменения…"
                      : usingCache
                        ? "Показана локальная копия плана."
                         : "Режим просмотра: редактировать план может только владелец."))}
            </span>
            {syncState === "conflict" ? (
              <span className="flex flex-wrap gap-2">
                <button className="rounded-lg border border-current px-2.5 py-1 font-semibold" onClick={() => void keepLocalChanges()}>Сохранить мои изменения</button>
                <button className="rounded-lg border border-current px-2.5 py-1 font-semibold" onClick={useServerVersion}>Использовать серверную версию</button>
              </span>
            ) : syncState === "failed" || restoredChanges ? (
              <button
                className="rounded-lg border border-current px-2.5 py-1 font-semibold"
                onClick={() => void retrySave()}
              >
                {restoredChanges ? "Сохранить восстановленные изменения" : "Повторить сохранение"}
              </button>
            ) : (
              error && (
                <button
                  className="rounded-lg border border-current px-2.5 py-1 font-semibold"
                  onClick={() => void refresh()}
                >
                  Повторить загрузку
                </button>
              )
            )}
          </div>
        )}
        <section aria-labelledby={`tab-${selectedTab}`} className="animate-[fadeUp_.4s_ease_both]" id={`panel-${selectedTab}`} role="tabpanel" tabIndex={0}>
          {data && [<Overview />, <Itinerary />, <Lodging />, <Lodging cancellation />, <Sights />, <Budget />, <Photos />, <Notes />][selectedTab]}
        </section>
      </main>
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[20000] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full bg-[var(--ink)] px-5 py-3 text-center text-sm font-bold text-[var(--card)] shadow-xl" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
