import { lazy, Suspense, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { useTripData } from "../trip/TripDataContext";
// Overview is the landing tab, so keep it eager; lazy-load the rest so the first
// paint on mobile only downloads and parses the shell + overview, not every tab.
import { Overview } from "../features/overview/Overview";
const Itinerary = lazy(() => import("../features/itinerary/Itinerary").then((m) => ({ default: m.Itinerary })));
const Lodging = lazy(() => import("../features/lodging/Lodging").then((m) => ({ default: m.Lodging })));
const Sights = lazy(() => import("../features/sights/Sights").then((m) => ({ default: m.Sights })));
const Budget = lazy(() => import("../features/budget/Budget").then((m) => ({ default: m.Budget })));
const Photos = lazy(() => import("../features/photos/Photos").then((m) => ({ default: m.Photos })));
const Restaurants = lazy(() => import("../features/restaurants/Restaurants").then((m) => ({ default: m.Restaurants })));

const tabs = [
  { path: "overview", label: "Обзор", icon: "fa-solid fa-compass" },
  { path: "route", label: "Маршрут", icon: "fa-solid fa-route" },
  { path: "lodging", label: "Жильё", icon: "fa-solid fa-bed" },
  { path: "cancellation", label: "Отмена", icon: "fa-solid fa-calendar-xmark" },
  { path: "places", label: "Достопримечательности", icon: "fa-solid fa-location-dot" },
  { path: "restaurants", label: "Рестораны", icon: "fa-solid fa-utensils" },
  { path: "budget", label: "Бюджет", icon: "fa-solid fa-wallet" },
  { path: "photos", label: "Фото", icon: "fa-solid fa-images" },
] as const;

export function AppShell() {
  const { data, loading, error, usingCache, syncState, refresh, retrySave } =
    useTripData();
  const location = useLocation();
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);
  const tabRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const toastTimer = useRef<number | null>(null);
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => location.pathname === `/${tab.path}`),
  );
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

  // Keep the active tab in view when the tab bar scrolls horizontally on mobile.
  useEffect(() => {
    tabRefs.current[activeIndex]?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [activeIndex]);

  function handleTabKeyDown(event: KeyboardEvent, index: number) {
    let nextIndex: number | undefined;

    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft")
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;

    if (nextIndex !== undefined) {
      event.preventDefault();
      navigate(`/${tabs[nextIndex].path}`);
      tabRefs.current[nextIndex]?.focus();
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
          {tabs.map((tab, index) => (
            <NavLink
              aria-selected={index === activeIndex}
              key={tab.path}
              to={`/${tab.path}`}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              role="tab"
              tabIndex={index === activeIndex ? 0 : -1}
            >
              <i className={tab.icon} aria-hidden="true" />{tab.label}
            </NavLink>
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
        <section className="animate-[fadeUp_.4s_ease_both]" role="tabpanel" tabIndex={0}>
          {data && (
            <Suspense fallback={<div className="grid place-items-center py-16" role="status" aria-label="Загружаем раздел"><div className="size-7 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--ac)]" /></div>}>
              <Routes>
                <Route index element={<Navigate to="/overview" replace />} />
                <Route path="overview" element={<Overview />} />
                <Route path="route" element={<Itinerary />} />
                <Route path="lodging" element={<Lodging />} />
                <Route path="cancellation" element={<Lodging cancellation />} />
                <Route path="places" element={<Sights />} />
                <Route path="restaurants" element={<Restaurants />} />
                <Route path="budget" element={<Budget />} />
                <Route path="photos" element={<Photos />} />
                <Route path="*" element={<Navigate to="/overview" replace />} />
              </Routes>
            </Suspense>
          )}
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
