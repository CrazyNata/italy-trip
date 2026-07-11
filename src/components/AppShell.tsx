import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { useTripData } from "../trip/TripDataContext";
import { Overview } from "../features/overview/Overview";
import { Itinerary } from "../features/itinerary/Itinerary";
import { Lodging } from "../features/lodging/Lodging";
import { Sights } from "../features/sights/Sights";
import { Budget } from "../features/budget/Budget";
import { Photos } from "../features/photos/Photos";
import { Notes } from "../features/notes/Notes";

const tabs = [
  ["Обзор", "fa-solid fa-compass"],
  ["Маршрут", "fa-solid fa-route"],
  ["Жильё", "fa-solid fa-bed"],
  ["Отмена", "fa-solid fa-calendar-xmark"],
  ["Места", "fa-solid fa-location-dot"],
  ["Бюджет", "fa-solid fa-wallet"],
  ["Фото", "fa-solid fa-images"],
  ["Заметки", "fa-solid fa-note-sticky"],
] as const;

export function AppShell() {
  const { data, loading, error, usingCache, syncState, refresh, retrySave } =
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
      <header className="app-header">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ac)]">
              <span className="h-px w-6 bg-current" aria-hidden="true" />
              Италия · осень 2026
            </p>
            <h1 className="app-title">
              Отпуск с семьёй
              <br />в Италии <span aria-hidden="true">🍋</span>
            </h1>
            <p className="trip-intro">
              25 сентября — 12 октября · выезжаем из Праги вдвоём с 2 собаками.
              В Риме встречаем родственников — и нас становится 4 человека и 2
              собаки. Планируем маршрут, жильё, места и бюджет.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="count-card">
              <strong className="text-[var(--ac)]">
                {Math.max(
                  0,
                  Math.ceil(
                    (new Date("2026-09-25T00:00:00").getTime() - Date.now()) /
                      86400000,
                  ),
                )}
              </strong>
              <span>
                дней до выезда
              </span>
            </div>
            <div className="count-card">
              <strong className="text-[var(--ol)]">
                17
              </strong>
              <span>
                ночей
              </span>
            </div>
          </div>
        </div>

        <nav
          className="tabbar"
          aria-label="Разделы поездки"
          role="tablist"
        >
          {tabs.map(([label, icon], index) => (
            <button
              aria-controls={`panel-${index}`}
              aria-selected={index === selectedTab}
              id={`tab-${index}`}
              key={label}
              onClick={() => setSelectedTab(index)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              role="tab"
              tabIndex={index === selectedTab ? 0 : -1}
              type="button"
            >
              <i className={icon} aria-hidden="true" />{label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {(loading || error || usingCache || syncState !== "clean") && (
          <div
            className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${error || syncState === "failed" ? "border-[#d8a08d] bg-[#fff2ed] text-[#7f3524]" : "border-[var(--line)] bg-[var(--soft)] text-[var(--muted)]"}`}
            role="status"
          >
            <span>
              {loading
                ? "Загружаем актуальный план…"
                : (error ??
                  (syncState === "dirty"
                    ? "Есть несохранённые изменения…"
                    : syncState === "saving"
                      ? "Сохраняем изменения…"
                         : usingCache
                         ? "Показана локальная копия плана."
                          : ""))}
            </span>
            {syncState === "failed" ? (
              <button
                className="rounded-lg border border-current px-2.5 py-1 font-semibold"
                onClick={() => void retrySave()}
              >
                Повторить сохранение
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
