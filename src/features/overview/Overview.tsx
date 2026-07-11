import { useEffect, useRef, useState } from "react";
import { useTripData } from "../../trip/TripDataContext";
import { copyText, useDialogKeyboard, useTransientState } from "../shared";
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
type Weather = { temp: number; code: number } | { error: true };

export function Overview() {
  const { data } = useTripData();
  const [index, setIndex] = useState(0);
  const [weather, setWeather] = useState<Record<string, Weather>>({});
  const [lightbox, setLightbox] = useState(false);
  const [copied, setCopied] = useState(false);
  const showCopied = useTransientState(setCopied);
  const closeButton = useRef<HTMLButtonElement>(null);
  const shift = (amount: number) => setIndex((current) => (current + amount + slides.length) % slides.length);
  useDialogKeyboard({ open: lightbox, onClose: () => setLightbox(false), onPrevious: () => shift(-1), onNext: () => shift(1), initialFocus: closeButton });
  const weatherCities = data ? ["Прага, Чехия", ...new Set(data.lodging.map((lodge) => lodge.city))] : [];

  useEffect(() => {
    const controller = new AbortController();
    setWeather({});
    weatherCities.forEach(async (city) => {
      const point = coords[city];
      if (!point) return setWeather((current) => ({ ...current, [city]: { error: true } }));
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${point[0]}&longitude=${point[1]}&current=temperature_2m,weather_code&timezone=auto`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const json = await response.json() as { current?: { temperature_2m?: number; weather_code?: number } };
        if (typeof json.current?.temperature_2m !== "number" || typeof json.current.weather_code !== "number") throw new Error();
        setWeather((current) => ({ ...current, [city]: { temp: json.current!.temperature_2m!, code: json.current!.weather_code! } }));
      } catch (error) {
        if ((error as Error).name !== "AbortError") setWeather((current) => ({ ...current, [city]: { error: true } }));
      }
    });
    return () => controller.abort();
  }, [weatherCities.join("|")]);
  if (!data) return null;

  const routeUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent("U Vlachovky 8, Praha, Česko")}&destination=${encodeURIComponent("U Vlachovky 8, Praha, Česko")}&waypoints=${data.lodging.map((lodge) => encodeURIComponent(lodge.city)).join("%7C")}&travelmode=driving`;
  const headingStyle = { fontFamily: "'Playfair Display',serif", fontWeight: 600, fontSize: 22, margin: "34px 0 4px" } as const;
  const noteStyle = { margin: "0 0 16px", fontSize: 13, color: "var(--muted,#8a7d6b)" } as const;
  return <div style={{ animation: "fadeUp .4s ease both" }}>
    <div onClick={() => setLightbox(true)} style={{ position: "relative", borderRadius: 18, overflow: "hidden", minHeight: 340, border: "1px solid var(--line,#e7dcc7)", cursor: "zoom-in" }}>
      {slides.map((slide, slideIndex) => <div key={slide[0]} style={{ position: "absolute", inset: 0, opacity: slideIndex === index ? 1 : 0, transition: "opacity .6s ease", zIndex: slideIndex === index ? 2 : 1 }}>
        <img src={`/images/hero-${slide[0]}.png`} alt={slide[1]} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", left: 0, bottom: 0, right: 0, padding: 24, background: "linear-gradient(to top,rgba(45,36,26,.72),transparent)", pointerEvents: "none" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,.16)", backdropFilter: "blur(4px)", color: "#fff", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 600, padding: "4px 11px", borderRadius: 999 }}>{slide[2]}</div>
          <div style={{ color: "#fff", fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 600, marginTop: 8 }}>{slide[3]}</div>
          <div style={{ color: "rgba(255,255,255,.85)", fontSize: 13, marginTop: 2 }}>{slide[4]}</div>
        </div>
      </div>)}
      <img src="/images/hero-salzburg.png" alt="" aria-hidden="true" style={{ width: "100%", minHeight: 340, objectFit: "cover", display: "block", visibility: "hidden" }} />
      <button onClick={(event) => { event.stopPropagation(); shift(-1); }} title="Назад" style={{ position: "absolute", top: "50%", left: 12, transform: "translateY(-50%)", width: 38, height: 38, border: "none", borderRadius: "50%", background: "rgba(24,18,12,.5)", color: "#fff", cursor: "pointer", fontSize: 15, display: "grid", placeItems: "center", zIndex: 5 }}><i className="fa-solid fa-chevron-left" /></button>
      <button onClick={(event) => { event.stopPropagation(); shift(1); }} title="Вперёд" style={{ position: "absolute", top: "50%", right: 12, transform: "translateY(-50%)", width: 38, height: 38, border: "none", borderRadius: "50%", background: "rgba(24,18,12,.5)", color: "#fff", cursor: "pointer", fontSize: 15, display: "grid", placeItems: "center", zIndex: 5 }}><i className="fa-solid fa-chevron-right" /></button>
      <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 6, zIndex: 5 }}>{slides.map((slide, i) => <span key={slide[0]} style={{ width: 8, height: 8, borderRadius: "50%", background: i === index ? "#fff" : "rgba(255,255,255,.5)", boxShadow: "0 0 3px rgba(0,0,0,.5)" }} />)}</div>
    </div>

    <h2 style={headingStyle}>Погода сейчас</h2>
    <p style={noteStyle}>Текущая погода во всех городах маршрута — обновляется при загрузке страницы.</p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 14 }}>{weatherCities.map((city) => {
      const current = weather[city];
      const state = current && !("error" in current) ? (weatherInfo[current.code] || ["—", "fa-solid fa-cloud"]) : null;
      return <div key={city} style={{ position: "relative", borderRadius: 16, overflow: "hidden", height: 150, border: "1px solid var(--line,#e7dcc7)", background: "var(--track,#f0e5d1)" }}>
        {cityPhotos[city] && <img src={`/images/hero-${cityPhotos[city]}.png`} alt={city} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(24,18,12,.82),rgba(24,18,12,.1) 52%,rgba(24,18,12,.42))", pointerEvents: "none" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, padding: "13px 15px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", pointerEvents: "none" }}>
          <span style={{ fontFamily: "'Space Mono',ui-monospace,monospace", fontSize: 34, fontWeight: 700, color: "#fff", lineHeight: 1, textShadow: "0 1px 8px rgba(0,0,0,.6)" }}>{!current ? "…" : "error" in current ? "—" : `${Math.round(current.temp)}°`}</span>
          <span style={{ width: 34, height: 34, flex: "none", borderRadius: 10, background: "rgba(255,255,255,.18)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center" }}><i className={state?.[1] || "fa-solid fa-cloud"} style={{ color: "#fff", fontSize: 16 }} /></span>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "13px 15px", pointerEvents: "none" }}>
          <div title={city} style={{ fontWeight: 700, fontSize: 15, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 1px 6px rgba(0,0,0,.6)" }}>{city}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.82)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2, textShadow: "0 1px 5px rgba(0,0,0,.55)" }}>{state?.[0] || (current ? "Погода недоступна" : "загрузка…")} · сейчас</div>
        </div>
      </div>;
    })}</div>

    <h2 style={headingStyle}>Карта маршрута</h2>
    <p style={noteStyle}>Нажмите на город, чтобы открыть его на Google Maps.</p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 10, marginBottom: 16 }}>{data.lodging.map((lodge, i) => {
      const short = lodge.city.split(",")[0];
      const day = data.days.find((item) => item.dayMapUrl?.trim() && item.city.includes(short));
      const url = day?.dayMapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lodge.city)}`;
      return <a key={lodge.id} href={url} target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 11, background: "var(--card,#fff)", border: "1px solid var(--line,#e7dcc7)", borderRadius: 12, padding: "11px 14px", textDecoration: "none", color: "var(--ink)", cursor: "pointer" }}>
        <span style={{ width: 24, height: 24, flex: "none", borderRadius: "50%", background: "var(--ac,#b95c3f)", color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
        <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lodge.city}</span><span style={{ display: "block", fontSize: 12, color: "var(--muted,#8a7d6b)" }}>{lodge.dates}</span></span>
        <i className="fa-solid fa-arrow-up-right-from-square" style={{ color: "var(--muted,#8a7d6b)", fontSize: 11 }} />
      </a>;
    })}</div>
    <div style={{ position: "relative" }}><RouteMap cities={data.lodging.map((lodge) => lodge.city)} /><div style={{ position: "absolute", right: 14, bottom: 14, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <button onClick={() => void copyText(routeUrl).then(() => showCopied(true, false))} title="Скопировать ссылку на карту" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--card,#fff)", border: "1px solid var(--line,#e7dcc7)", color: "var(--ink)", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 600, boxShadow: "0 2px 10px rgba(0,0,0,.14)", cursor: "pointer" }}><i className={copied ? "fa-solid fa-check" : "fa-solid fa-copy"} />{copied ? "Скопировано" : "Скопировать ссылку"}</button>
      <a href={routeUrl} target="_blank" rel="noopener" title="Открыть маршрут в Google Maps" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--card,#fff)", border: "1px solid var(--line,#e7dcc7)", color: "var(--ink)", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 600, boxShadow: "0 2px 10px rgba(0,0,0,.14)", textDecoration: "none" }}><i className="fa-solid fa-arrow-up-right-from-square" />Открыть в Google Maps</a>
    </div></div>

    {lightbox && <div className="lightbox" role="dialog" aria-modal="true" aria-label={slides[index][1]} onMouseDown={(event) => event.target === event.currentTarget && setLightbox(false)}><img src={`/images/hero-${slides[index][0]}.png`} alt={slides[index][1]} /><button ref={closeButton} className="lightbox-close" onClick={() => setLightbox(false)} aria-label="Закрыть">×</button><button className="lightbox-prev" onClick={() => shift(-1)} aria-label="Предыдущее фото">‹</button><button className="lightbox-next" onClick={() => shift(1)} aria-label="Следующее фото">›</button></div>}
  </div>;
}
