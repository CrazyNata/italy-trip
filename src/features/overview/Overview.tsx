import { useEffect, useRef, useState } from "react";
import { useTripData } from "../../trip/TripDataContext";
import { copyText, useTransientState } from "../shared";
import { Lightbox } from "../../components/Lightbox";
import { RouteMap } from "../maps/RouteMap";

const slides = [
  ["salzburg", "Зальцбург", "🇦🇹 Первая остановка · 25 сентября", "Зальцбург на рассвете", "Крепость Хоэнзальцбург над бирюзовой Зальцах — с этого города начинается наше путешествие"],
  ["verona", "Верона", "🇮🇹 Вторая остановка · 26 сентября", "Верона — город Ромео и Джульетты", "Розовый мрамор Арена ди Верона и уютные улочки по пути на юг Италии"],
  ["rome", "Рим", "🇮🇹 Третья остановка · 27 сентября", "Рим — Вечный город", "Здесь мы встречаем родственников — теперь нас четверо и две собаки: три дня Колизея, пиний (римских сосен) и вечерних прогулок"],
  ["pisa", "Пиза", "🇮🇹 По пути · 30 сентября", "Пиза — короткая остановка", "Заезжаем к Пьяцца-деи-Мираколи и падающей башне по дороге из Рима в Фильине"],
  ["figline", "Фильине-Вальдарно", "🇮🇹 Тоскана · 30 сентября", "Фильине-Вальдарно", "Тихий тосканский городок с аркадами на Пьяцца Марсилио Фичино — ночёвка среди холмов Валь-д’Арно"],
  ["sanmarino", "Сан-Марино", "🇸🇲 По пути · 1 октября", "Сан-Марино", "Древнейшая республика на вершине Монте-Титано — башни и виды на холмы по дороге к Кьодже"],
  ["chioggia", "Кьоджа", "🇮🇹 Пятая остановка · 1 октября", "Кьоджа — маленькая Венеция", "Рыбацкий городок с каналами, лодками и мостами в лагуне рядом с Венецией"],
  ["milan", "Милан", "🇮🇹 Шестая остановка · 3 октября", "Милан — столица моды", "Величественный Дуомо и Галерея Виктора Эммануила II перед дорогой в Альпы"],
  ["como", "Озеро Комо", "🇮🇹 Из Милана · радиальная поездка", "Озеро Комо", "Бирюзовая вода, виллы и разноцветные городки у подножия Альп — вылазка на день из Милана"],
  ["valdidentro", "Вальдидентро", "🇮🇹 Альпы · 6 октября", "Вальдидентро", "Альпийская долина с зелёными лугами и снежными вершинами — тишина и горный воздух перед Мюнхеном"],
  ["stelvio", "Перевал Стельвио", "🇮🇹 Из Вальдидентро · радиальная поездка", "Перевал Стельвио", "Легендарный серпантин с 48 поворотами — один из самых высоких автоперевалов Альп"],
  ["munich", "Мюнхен", "🇩🇪 Последняя остановка · 8 октября", "Мюнхен — перед домом", "Мариенплац и башни Фрауэнкирхе — последняя ночёвка перед возвращением в Прагу"],
  ["prague", "Прага", "🇨🇿 Дом · 12 октября", "Прага — домой", "Карлов мост и Пражский Град — возвращение домой, круг замкнулся"],
] as const;

const coords: Record<string, [number, number]> = {
  "Прага, Чехия": [50.08, 14.44], "Зальцбург, Австрия": [47.8, 13.04], "Верона, Италия": [45.44, 10.99], "Рим, Италия": [41.9, 12.5], "Фильине-Вальдарно, Тоскана": [43.62, 11.47], "Кьоджа, Италия": [45.22, 12.28], "Милан, Италия": [45.46, 9.19], "Вальдидентро, Альпы": [46.48, 10.28], "Мюнхен, Германия": [48.15, 11.6],
};
const cityPhotos: Record<string, string> = {
  "Прага, Чехия": "prague", "Зальцбург, Австрия": "salzburg", "Верона, Италия": "verona", "Рим, Италия": "rome", "Фильине-Вальдарно, Тоскана": "figline", "Кьоджа, Италия": "chioggia", "Милан, Италия": "milan", "Вальдидентро, Альпы": "valdidentro", "Мюнхен, Германия": "munich",
};
const weatherInfo: Record<number, [string, string]> = {
  0: ["Ясно", "fa-solid fa-sun"], 1: ["Малооблачно", "fa-solid fa-cloud-sun"], 2: ["Переменная облачность", "fa-solid fa-cloud-sun"], 3: ["Пасмурно", "fa-solid fa-cloud"],
  45: ["Туман", "fa-solid fa-smog"], 48: ["Изморозь", "fa-solid fa-smog"], 51: ["Морось", "fa-solid fa-cloud-rain"], 53: ["Морось", "fa-solid fa-cloud-rain"], 55: ["Морось", "fa-solid fa-cloud-rain"],
  61: ["Дождь", "fa-solid fa-cloud-showers-heavy"], 63: ["Дождь", "fa-solid fa-cloud-showers-heavy"], 65: ["Сильный дождь", "fa-solid fa-cloud-showers-heavy"], 66: ["Ледяной дождь", "fa-solid fa-cloud-showers-heavy"], 67: ["Ледяной дождь", "fa-solid fa-cloud-showers-heavy"],
  71: ["Снег", "fa-solid fa-snowflake"], 73: ["Снег", "fa-solid fa-snowflake"], 75: ["Сильный снег", "fa-solid fa-snowflake"], 77: ["Снежная крупа", "fa-solid fa-snowflake"], 80: ["Ливень", "fa-solid fa-cloud-showers-heavy"], 81: ["Ливень", "fa-solid fa-cloud-showers-heavy"], 82: ["Сильный ливень", "fa-solid fa-cloud-showers-heavy"], 85: ["Снегопад", "fa-solid fa-snowflake"], 86: ["Снегопад", "fa-solid fa-snowflake"], 95: ["Гроза", "fa-solid fa-cloud-bolt"], 96: ["Гроза с градом", "fa-solid fa-cloud-bolt"], 99: ["Гроза с градом", "fa-solid fa-cloud-bolt"],
};
type Weather = { high: number; low: number; code: number } | { error: true };
type ThenWeather = { high: number; low: number; code: number; iso: string; approx: boolean } | { error: true };
const imageUrl = (name: string) => `${import.meta.env.BASE_URL}images/${name}`;

const WEATHER_MODE_KEY = "italy_weather_mode";
const pad2 = (value: number) => String(value).padStart(2, "0");
const shiftIso = (iso: string, delta: number) => {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + delta);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};
const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

type DailyWeather = { daily?: { time?: string[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; weather_code?: number[] } };
type VisitPlan = { city: string; point: [number, number]; iso: string };
const HIST_YEAR_BACK = 1;
const histIsoOf = (iso: string) => `${new Date(`${iso}T12:00:00`).getFullYear() - HIST_YEAR_BACK}-${iso.slice(5)}`;

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error();
      return await response.json();
    } catch (error) {
      if ((error as Error).name === "AbortError" || attempt >= 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  }
}
const asArray = (json: unknown): DailyWeather[] => (Array.isArray(json) ? json as DailyWeather[] : [json as DailyWeather]);

// Averages the daily highs/lows and takes the most common weather code across
// all returned days within `halfWindow` days of `centerIso`.
function summarize(daily: DailyWeather["daily"], centerIso: string, halfWindow: number, iso: string, approx: boolean): ThenWeather {
  const times = daily?.time ?? [];
  const highs = daily?.temperature_2m_max ?? [];
  const lows = daily?.temperature_2m_min ?? [];
  const codes = daily?.weather_code ?? [];
  const center = new Date(`${centerIso}T12:00:00`).getTime();
  const picked: Array<{ high: number; low: number; code: number }> = [];
  times.forEach((time, i) => {
    if (Math.abs(new Date(`${time}T12:00:00`).getTime() - center) > halfWindow * 86400000 + 1000) return;
    if (typeof highs[i] === "number" && typeof lows[i] === "number" && typeof codes[i] === "number") picked.push({ high: highs[i]!, low: lows[i]!, code: codes[i]! });
  });
  if (!picked.length) return { error: true };
  const high = picked.reduce((sum, item) => sum + item.high, 0) / picked.length;
  const low = picked.reduce((sum, item) => sum + item.low, 0) / picked.length;
  const frequency = new Map<number, number>();
  let mode = picked[0].code;
  for (const { code } of picked) {
    frequency.set(code, (frequency.get(code) ?? 0) + 1);
    if ((frequency.get(code) ?? 0) > (frequency.get(mode) ?? 0)) mode = code;
  }
  return { high, low, code: mode, iso, approx };
}

// Loads the visit-date weather for every city in as few requests as possible —
// one archive call for far dates, one forecast call for near ones — because
// Open-Meteo drops requests from a large simultaneous burst.
async function loadThenAll(plans: VisitPlan[], signal: AbortSignal): Promise<Record<string, ThenWeather>> {
  const result: Record<string, ThenWeather> = {};
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const near: VisitPlan[] = [];
  const far: VisitPlan[] = [];
  for (const plan of plans) {
    const daysAhead = Math.round((new Date(`${plan.iso}T12:00:00`).getTime() - todayStart) / 86400000);
    (daysAhead >= 0 && daysAhead <= 15 ? near : far).push(plan);
  }
  const runBatch = async (group: VisitPlan[], base: string, spanIsos: string[], center: (plan: VisitPlan) => string, halfWindow: number, approx: boolean) => {
    const sorted = [...spanIsos].sort();
    const url = `${base}?latitude=${group.map((plan) => plan.point[0]).join(",")}&longitude=${group.map((plan) => plan.point[1]).join(",")}&start_date=${shiftIso(sorted[0], -halfWindow)}&end_date=${shiftIso(sorted[sorted.length - 1], halfWindow)}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
    try {
      const parts = asArray(await fetchJson(url, signal));
      group.forEach((plan, i) => { result[plan.city] = summarize(parts[i]?.daily, center(plan), halfWindow, plan.iso, approx); });
    } catch (error) {
      if ((error as Error).name === "AbortError") throw error;
      group.forEach((plan) => { result[plan.city] = { error: true }; });
    }
  };
  if (near.length) await runBatch(near, "https://api.open-meteo.com/v1/forecast", near.map((plan) => plan.iso), (plan) => plan.iso, 0, false);
  if (far.length) await runBatch(far, "https://archive-api.open-meteo.com/v1/archive", far.map((plan) => histIsoOf(plan.iso)), (plan) => histIsoOf(plan.iso), 3, true);
  return result;
}

export function Overview() {
  const { data } = useTripData();
  const [index, setIndex] = useState(0);
  const [weather, setWeather] = useState<Record<string, Weather>>({});
  const [thenWeather, setThenWeather] = useState<Record<string, ThenWeather>>({});
  const [mode, setMode] = useState<"now" | "then">(() => {
    try { return localStorage.getItem(WEATHER_MODE_KEY) === "then" ? "then" : "now"; } catch { return "now"; }
  });
  const changeMode = (next: "now" | "then") => {
    setMode(next);
    try { localStorage.setItem(WEATHER_MODE_KEY, next); } catch { /* Preference stays in memory. */ }
  };
  const [lightbox, setLightbox] = useState(false);
  const [copied, setCopied] = useState(false);
  const [focus, setFocus] = useState<{ city: string; nonce: number } | null>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const showCopied = useTransientState(setCopied);
  const focusOn = (city: string) => {
    setFocus({ city, nonce: Date.now() });
    mapWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  const shift = (amount: number) => setIndex((current) => (current + amount + slides.length) % slides.length);
  const weatherCities = data ? ["Прага, Чехия", ...new Set(data.lodging.map((lodge) => lodge.city))] : [];
  const plannedIso = (city: string) => {
    const short = city.split(",")[0].split("→")[0].trim();
    return data?.days.find((day) => day.city.includes(short))?.iso ?? null;
  };

  useEffect(() => {
    const controller = new AbortController();
    setWeather({});
    weatherCities.forEach(async (city) => {
      const point = coords[city];
      if (!point) return setWeather((current) => ({ ...current, [city]: { error: true } }));
      try {
        const json = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${point[0]}&longitude=${point[1]}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`, controller.signal) as DailyWeather;
        const daily = json.daily;
        const high = daily?.temperature_2m_max?.[0];
        const low = daily?.temperature_2m_min?.[0];
        const code = daily?.weather_code?.[0];
        if (typeof high !== "number" || typeof low !== "number" || typeof code !== "number") throw new Error();
        setWeather((current) => ({ ...current, [city]: { high, low, code } }));
      } catch (error) {
        if ((error as Error).name !== "AbortError") setWeather((current) => ({ ...current, [city]: { error: true } }));
      }
    });
    return () => controller.abort();
  }, [weatherCities.join("|")]);

  useEffect(() => {
    if (mode !== "then") return;
    const controller = new AbortController();
    const plans: VisitPlan[] = [];
    weatherCities.forEach((city) => {
      if (thenWeather[city] && !("error" in thenWeather[city])) return;
      const point = coords[city];
      const iso = plannedIso(city);
      if (!point || !iso) return setThenWeather((current) => ({ ...current, [city]: { error: true } }));
      plans.push({ city, point, iso });
    });
    if (plans.length) {
      void loadThenAll(plans, controller.signal)
        .then((batch) => setThenWeather((current) => ({ ...current, ...batch })))
        .catch((error) => {
          if ((error as Error).name !== "AbortError") setThenWeather((current) => {
            const next = { ...current };
            for (const plan of plans) next[plan.city] = { error: true };
            return next;
          });
        });
    }
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, weatherCities.join("|")]);
  if (!data) return null;

  const routeUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent("U Vlachovky 8, Praha, Česko")}&destination=${encodeURIComponent("U Vlachovky 8, Praha, Česko")}&waypoints=${data.lodging.map((lodge) => encodeURIComponent(lodge.city)).join("%7C")}&travelmode=driving`;
  const headingStyle = { fontFamily: "'Playfair Display',serif", fontWeight: 600, fontSize: 22, margin: "34px 0 4px" } as const;
  const noteStyle = { margin: "0 0 16px", fontSize: 13, color: "var(--muted,#8a7d6b)" } as const;
  return <div style={{ animation: "fadeUp .4s ease both" }}>
    <div onClick={() => setLightbox(true)} style={{ position: "relative", borderRadius: "var(--r-5)", overflow: "hidden", minHeight: 340, border: "1px solid var(--line,#e7dcc7)", cursor: "zoom-in" }}>
      {slides.map((slide, slideIndex) => <div key={slide[0]} style={{ position: "absolute", inset: 0, opacity: slideIndex === index ? 1 : 0, transition: "opacity .6s ease", zIndex: slideIndex === index ? 2 : 1 }}>
        <img src={imageUrl(`hero-${slide[0]}.png`)} alt={slide[1]} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", left: 0, bottom: 0, right: 0, padding: 24, background: "linear-gradient(to top,rgba(45,36,26,.72),transparent)", pointerEvents: "none" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,.16)", backdropFilter: "blur(4px)", color: "#fff", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 600, padding: "4px 11px", borderRadius: "var(--r-pill)" }}>{slide[2]}</div>
          <div style={{ color: "#fff", fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 600, marginTop: 8 }}>{slide[3]}</div>
          <div style={{ color: "rgba(255,255,255,.85)", fontSize: 13, marginTop: 2 }}>{slide[4]}</div>
        </div>
      </div>)}
      <img src={imageUrl("hero-salzburg.png")} alt="" aria-hidden="true" style={{ width: "100%", minHeight: 340, objectFit: "cover", display: "block", visibility: "hidden" }} />
      <button onClick={(event) => { event.stopPropagation(); shift(-1); }} title="Назад" style={{ position: "absolute", top: "50%", left: 12, transform: "translateY(-50%)", width: 38, height: 38, border: "none", borderRadius: "50%", background: "rgba(24,18,12,.5)", color: "#fff", cursor: "pointer", fontSize: 15, display: "grid", placeItems: "center", zIndex: 5 }}><i className="fa-solid fa-chevron-left" /></button>
      <button onClick={(event) => { event.stopPropagation(); shift(1); }} title="Вперёд" style={{ position: "absolute", top: "50%", right: 12, transform: "translateY(-50%)", width: 38, height: 38, border: "none", borderRadius: "50%", background: "rgba(24,18,12,.5)", color: "#fff", cursor: "pointer", fontSize: 15, display: "grid", placeItems: "center", zIndex: 5 }}><i className="fa-solid fa-chevron-right" /></button>
      <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 6, zIndex: 5 }}>{slides.map((slide, i) => <span key={slide[0]} style={{ width: 8, height: 8, borderRadius: "50%", background: i === index ? "#fff" : "rgba(255,255,255,.5)", boxShadow: "0 0 3px rgba(0,0,0,.5)" }} />)}</div>
    </div>

    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", margin: "34px 0 4px" }}>
      <h2 style={{ ...headingStyle, margin: 0 }}>Погода</h2>
      <div style={{ display: "inline-flex", background: "var(--track,#efe4cf)", border: "1px solid var(--line,#e7dcc7)", borderRadius: "var(--r-pill)", padding: 3 }}>
        {(["now", "then"] as const).map((value) => (
          <button key={value} onClick={() => changeMode(value)} style={{ border: "none", borderRadius: "var(--r-pill)", padding: "6px 15px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: mode === value ? "var(--ac,#b95c3f)" : "transparent", color: mode === value ? "#fff" : "var(--muted,#8a7d6b)" }}>
            {value === "now" ? "Сейчас" : "В поездке"}
          </button>
        ))}
      </div>
    </div>
    <p style={noteStyle}>{mode === "now" ? "Текущая погода во всех городах маршрута — обновляется при загрузке страницы." : "Погода на даты визита. Для дальних дат показываем типичную по прошлым годам — точный прогноз появится ближе к поездке."}</p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 14 }}>{weatherCities.map((city) => {
      const current = mode === "then" ? thenWeather[city] : weather[city];
      const state = current && !("error" in current) ? (weatherInfo[current.code] || ["—", "fa-solid fa-cloud"]) : null;
      let subtitle: string;
      if (mode === "then") {
        const then = thenWeather[city];
        subtitle = then && !("error" in then) ? `${state?.[0]} · ${formatDay(then.iso)}${then.approx ? " · обычно" : ""}` : then ? "нет данных на дату" : "загрузка…";
      } else {
        subtitle = `${state?.[0] || (current ? "Погода недоступна" : "загрузка…")} · сегодня`;
      }
      return <div key={city} style={{ position: "relative", borderRadius: "var(--r-4)", overflow: "hidden", height: 150, border: "1px solid var(--line,#e7dcc7)", background: "var(--track,#f0e5d1)" }}>
        {cityPhotos[city] && <img src={imageUrl(`hero-${cityPhotos[city]}.png`)} alt={city} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(24,18,12,.82),rgba(24,18,12,.1) 52%,rgba(24,18,12,.42))", pointerEvents: "none" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, padding: "13px 15px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", pointerEvents: "none" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.35, textShadow: "0 1px 8px rgba(0,0,0,.6)" }}>{!current ? "…" : "error" in current ? "—" : `Днём ${Math.round(current.high)}° · Ночью ${Math.round(current.low)}°`}</span>
          <span style={{ width: 34, height: 34, flex: "none", borderRadius: "var(--r-2)", background: "rgba(255,255,255,.18)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center" }}><i className={state?.[1] || "fa-solid fa-cloud"} style={{ color: "#fff", fontSize: 16 }} /></span>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "13px 15px", pointerEvents: "none" }}>
          <div title={city} style={{ fontWeight: 700, fontSize: 15, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 1px 6px rgba(0,0,0,.6)" }}>{city}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.82)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2, textShadow: "0 1px 5px rgba(0,0,0,.55)" }}>{subtitle}</div>
        </div>
      </div>;
    })}</div>

    <h2 style={headingStyle}>Карта маршрута</h2>
    <p style={noteStyle}>Нажмите на город, чтобы навести на него карту. Иконкой <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 10 }} /> — открыть в Google Maps.</p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 10, marginBottom: 16 }}>{data.lodging.map((lodge, i) => {
      const short = lodge.city.split(",")[0];
      const day = data.days.find((item) => item.dayMapUrl?.trim() && item.city.includes(short));
      const url = day?.dayMapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lodge.city)}`;
      const isActive = focus?.city === lodge.city;
      return <div key={lodge.id} role="button" tabIndex={0} onClick={() => focusOn(lodge.city)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); focusOn(lodge.city); } }} title="Навести карту на город" style={{ display: "flex", alignItems: "center", gap: 11, background: isActive ? "var(--soft,#fdfaf3)" : "var(--card,#fff)", border: `1px solid ${isActive ? "var(--ac,#b95c3f)" : "var(--line,#e7dcc7)"}`, borderRadius: "var(--r-3)", padding: "11px 14px", color: "var(--ink)", cursor: "pointer", transition: "border-color .2s, background .2s" }}>
        <span style={{ width: 24, height: 24, flex: "none", borderRadius: "50%", background: "var(--ac,#b95c3f)", color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
        <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lodge.city}</span><span style={{ display: "block", fontSize: 12, color: "var(--muted,#8a7d6b)" }}>{lodge.dates}</span></span>
        <a href={url} target="_blank" rel="noopener" onClick={(event) => event.stopPropagation()} title="Открыть в Google Maps" style={{ flex: "none", color: "var(--muted,#8a7d6b)", padding: "4px 6px", borderRadius: "var(--r-1)", display: "grid", placeItems: "center" }}><i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 12 }} /></a>
      </div>;
    })}</div>
    <div ref={mapWrapRef} style={{ position: "relative", scrollMarginTop: 16 }}><RouteMap cities={data.lodging.map((lodge) => lodge.city)} focus={focus} /><div style={{ position: "absolute", right: 14, bottom: 14, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <button onClick={() => void copyText(routeUrl).then(() => showCopied(true, false))} title="Скопировать ссылку на карту" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--card,#fff)", border: "1px solid var(--line,#e7dcc7)", color: "var(--ink)", borderRadius: "var(--r-2)", padding: "9px 14px", fontSize: 13, fontWeight: 600, boxShadow: "0 2px 10px rgba(0,0,0,.14)", cursor: "pointer" }}><i className={copied ? "fa-solid fa-check" : "fa-solid fa-copy"} />{copied ? "Скопировано" : "Скопировать ссылку"}</button>
      <a href={routeUrl} target="_blank" rel="noopener" title="Открыть маршрут в Google Maps" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--card,#fff)", border: "1px solid var(--line,#e7dcc7)", color: "var(--ink)", borderRadius: "var(--r-2)", padding: "9px 14px", fontSize: 13, fontWeight: 600, boxShadow: "0 2px 10px rgba(0,0,0,.14)", textDecoration: "none" }}><i className="fa-solid fa-arrow-up-right-from-square" />Открыть в Google Maps</a>
    </div></div>

    {lightbox && <Lightbox images={slides.map((slide) => imageUrl(`hero-${slide[0]}.png`))} index={index} alt={slides[index][1]} onClose={() => setLightbox(false)} onIndex={setIndex} />}
  </div>;
}
