import { lazy, Suspense, useEffect, useRef, useState, type TouchEvent } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { useTripData } from "../trip/TripDataContext";
import { Overview } from "../features/overview/Overview";

const Itinerary = lazy(() => import("../features/itinerary/Itinerary").then((m) => ({ default: m.Itinerary })));
const Lodging = lazy(() => import("../features/lodging/Lodging").then((m) => ({ default: m.Lodging })));
const Sights = lazy(() => import("../features/sights/Sights").then((m) => ({ default: m.Sights })));
const Budget = lazy(() => import("../features/budget/Budget").then((m) => ({ default: m.Budget })));
const Photos = lazy(() => import("../features/photos/Photos").then((m) => ({ default: m.Photos })));
const Restaurants = lazy(() => import("../features/restaurants/Restaurants").then((m) => ({ default: m.Restaurants })));

const tabs = [
  { path: "overview", label: "Обзор", icon: "fa-solid fa-compass", eyebrow: "Италия · осень 2026" },
  { path: "route", label: "Маршрут", icon: "fa-solid fa-route", eyebrow: "18 дней · 9 городов" },
  { path: "lodging", label: "Жильё", icon: "fa-solid fa-bed", eyebrow: "6 адресов · 5 городов" },
  { path: "cancellation", label: "Отмена", icon: "fa-solid fa-calendar-xmark", eyebrow: "Сроки бесплатной отмены" },
  { path: "places", label: "Места", icon: "fa-solid fa-location-dot", eyebrow: "Пеший маршрут" },
  { path: "restaurants", label: "Рестораны", icon: "fa-solid fa-utensils", eyebrow: "Где поесть" },
  { path: "budget", label: "Бюджет", icon: "fa-solid fa-wallet", eyebrow: "Расходы поездки" },
  { path: "photos", label: "Фото", icon: "fa-solid fa-images", eyebrow: "Альбом поездки" },
] as const;

export function AppShell() {
  const { data, loading, error, usingCache, syncState, refresh, retrySave } = useTripData();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const swipeRef = useRef<{ x: number; y: number; canOpen: boolean } | null>(null);
  const active = tabs.find((tab) => location.pathname === `/${tab.path}`) ?? tabs[0];
  const isOverview = active.path === "overview";

  useEffect(() => setDrawerOpen(false), [location.pathname]);
  useEffect(() => {
    if (!drawerOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setDrawerOpen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", close); };
  }, [drawerOpen]);

  useEffect(() => {
    const show = (event: Event) => {
      setToast(event instanceof CustomEvent && typeof event.detail === "string" ? event.detail : "Режим просмотра: изменения доступны только владельцу");
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => { setToast(null); toastTimer.current = null; }, 2200);
    };
    window.addEventListener("trip:readonly", show);
    window.addEventListener("trip:toast", show);
    return () => {
      window.removeEventListener("trip:readonly", show);
      window.removeEventListener("trip:toast", show);
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  function onTouchStart(event: TouchEvent<HTMLElement>) {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    swipeRef.current = { x: touch.clientX, y: touch.clientY, canOpen: touch.clientX < 28 };
  }

  function onTouchEnd(event: TouchEvent<HTMLElement>) {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 65 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (!drawerOpen && start.canOpen && dx > 0) setDrawerOpen(true);
    if (drawerOpen && dx < 0) setDrawerOpen(false);
  }

  return (
    <div className="app-shell min-h-screen bg-[var(--bg)] text-[var(--ink)]" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <button className={`drawer-backdrop ${drawerOpen ? "is-open" : ""}`} aria-label="Закрыть меню" onClick={() => setDrawerOpen(false)} />
      <aside className={`app-drawer ${drawerOpen ? "is-open" : ""}`} aria-hidden={!drawerOpen}>
        <div className="drawer-trip">
          <span><i className="fa-solid fa-plane-departure" /></span>
          <div><strong>Италия 2026</strong><small>25 сен — 12 окт · 17 ночей</small></div>
        </div>
        <nav aria-label="Разделы поездки">
          {tabs.map((tab) => <NavLink key={tab.path} to={`/${tab.path}`}><i className={tab.icon} /><span>{tab.label}</span></NavLink>)}
        </nav>
        <button className="drawer-settings" onClick={() => { setDrawerOpen(false); window.dispatchEvent(new Event("trip:account-menu")); }}><i className="fa-solid fa-gear" /><span>Настройки</span></button>
      </aside>

      <header className={isOverview ? "overview-header" : "section-header"}>
        {isOverview && <><img src={`${import.meta.env.BASE_URL}images/hero-rome.webp`} alt="Рим" /><div className="overview-shade" /></>}
        <div className="header-controls">
          <button aria-label="Открыть меню" onClick={() => setDrawerOpen(true)}><i className="fa-solid fa-bars" /></button>
        </div>
        {isOverview ? <div className="overview-heading"><p>Италия · осень 2026</p><h1>Отпуск<br />в Италии</h1></div> : <div className="section-heading-main"><p>{active.eyebrow}</p><h1>{active.label}</h1></div>}
      </header>

      <main className={`app-main ${isOverview ? "overview-main" : ""}`}>
        {(loading || error || usingCache || syncState !== "clean") && <div className={`sync-status ${error || syncState === "failed" ? "is-error" : ""}`} role="status">
          <span>{loading ? "Загружаем актуальный план…" : error ?? (syncState === "dirty" ? "Есть несохранённые изменения…" : syncState === "saving" ? "Сохраняем изменения…" : usingCache ? "Показана локальная копия плана." : "")}</span>
          {syncState === "failed" ? <button onClick={() => void retrySave()}>Повторить сохранение</button> : error && <button onClick={() => void refresh()}>Повторить загрузку</button>}
        </div>}
        <section className="animate-[fadeUp_.4s_ease_both]" role="tabpanel" tabIndex={0}>
          {data && <Suspense fallback={<div className="grid place-items-center py-16" role="status"><div className="size-7 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--ac)]" /></div>}>
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
          </Suspense>}
        </section>
      </main>
      {toast && <div className="trip-toast" role="status">{toast}</div>}
    </div>
  );
}
