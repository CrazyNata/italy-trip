import { useEffect, useRef, useState } from "react";
import { useTripData } from "../../trip/TripDataContext";
import { copyText, subtleButton, useDialogKeyboard, useTransientState } from "../shared";
import { RouteMap } from "../maps/RouteMap";

const slides = [
  ["salzburg", "Зальцбург", "🇦🇹 Первая остановка · 25 сентября", "Зальцбург на рассвете", "Крепость Хоэнзальцбург над бирюзовой Зальцах — с этого города начинается наше путешествие"],
  ["verona", "Верона", "🇮🇹 Вторая остановка · 26 сентября", "Верона — город Ромео и Джульетты", "Розовый мрамор Арена ди Верона и уютные улочки по пути на юг Италии"],
  ["rome", "Рим", "🇮🇹 Третья остановка · 27 сентября", "Рим — Вечный город", "Здесь мы встречаем родственников — теперь нас четверо и две собаки: три дня Колизея, пиний и вечерних прогулок"],
  ["pisa", "Пиза", "🇮🇹 По пути · 30 сентября", "Пиза — короткая остановка", "Заезжаем к Пьяцца-деи-Мираколи и падающей башне по дороге из Рима в Фильине"],
  ["figline", "Фильине-Вальдарно", "🇮🇹 Тоскана · 30 сентября", "Фильине-Вальдарно", "Тихий тосканский городок с аркадами — ночёвка среди холмов Валь-д’Арно"],
  ["sanmarino", "Сан-Марино", "🇸🇲 По пути · 1 октября", "Сан-Марино", "Древнейшая республика на вершине Монте-Титано — башни и виды на холмы"],
  ["chioggia", "Кьоджа", "🇮🇹 Пятая остановка · 1 октября", "Кьоджа — маленькая Венеция", "Рыбацкий городок с каналами, лодками и мостами в лагуне рядом с Венецией"],
  ["milan", "Милан", "🇮🇹 Шестая остановка · 3 октября", "Милан — столица моды", "Величественный Дуомо и Галерея Виктора Эммануила II перед дорогой в Альпы"],
  ["como", "Озеро Комо", "🇮🇹 Из Милана · радиальная поездка", "Озеро Комо", "Бирюзовая вода, виллы и разноцветные городки у подножия Альп"],
  ["valdidentro", "Вальдидентро", "🇮🇹 Альпы · 6 октября", "Вальдидентро", "Альпийская долина с зелёными лугами и снежными вершинами"],
  ["stelvio", "Перевал Стельвио", "🇮🇹 Из Вальдидентро · радиальная поездка", "Перевал Стельвио", "Легендарный серпантин с 48 поворотами — один из самых высоких автоперевалов Альп"],
  ["munich", "Мюнхен", "🇩🇪 Последняя остановка · 8 октября", "Мюнхен — перед домом", "Мариенплац и башни Фрауэнкирхе — последняя ночёвка перед возвращением"],
  ["prague", "Прага", "🇨🇿 Дом · 12 октября", "Прага — домой", "Карлов мост и Пражский Град — возвращение домой, круг замкнулся"],
] as const;

const coords: Record<string, [number, number]> = {
  "Прага, Чехия": [50.08, 14.44], "Зальцбург, Австрия": [47.8, 13.04], "Верона, Италия": [45.44, 10.99], "Рим, Италия": [41.9, 12.5], "Фильине-Вальдарно, Тоскана": [43.62, 11.47], "Кьоджа, Италия": [45.22, 12.28], "Милан, Италия": [45.46, 9.19], "Вальдидентро, Альпы": [46.48, 10.28], "Мюнхен, Германия": [48.15, 11.6],
};
const cityPhotos: Record<string, string> = {
  "Прага, Чехия": "prague", "Зальцбург, Австрия": "salzburg", "Верона, Италия": "verona", "Рим, Италия": "rome", "Фильине-Вальдарно, Тоскана": "figline", "Кьоджа, Италия": "chioggia", "Милан, Италия": "milan", "Вальдидентро, Альпы": "valdidentro", "Мюнхен, Германия": "munich",
};
const weatherInfo = (code: number) => {
  if (code === 0) return ["Ясно", "☀"];
  if (code <= 2) return ["Малооблачно", "🌤"];
  if (code === 3) return ["Пасмурно", "☁"];
  if (code === 45 || code === 48) return ["Туман", "≋"];
  if (code >= 95) return ["Гроза", "ϟ"];
  if (code >= 71 && code <= 86) return ["Снег", "❄"];
  if (code >= 51) return ["Дождь", "☂"];
  return ["Нет данных", "☁"];
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

  const total = data.days.reduce((sum, day) => sum + day.items.length, 0) + data.sights.length;
  const done = data.days.reduce((sum, day) => sum + day.items.filter((item) => item.done).length, 0) + data.sights.filter((sight) => sight.done).length;
  const progress = total ? Math.round(done / total * 100) : 0;
  const cities = [...new Set(data.lodging.map((lodge) => lodge.city))];
  const tripDays = Math.round((new Date(`${data.trip.end}T00:00:00`).getTime() - new Date(`${data.trip.start}T00:00:00`).getTime()) / 86400000);
  const nights = Number.isFinite(tripDays) ? Math.max(0, tripDays) : 0;
  const routeUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent("U Vlachovky 8, Praha, Česko")}&destination=${encodeURIComponent("U Vlachovky 8, Praha, Česko")}&waypoints=${data.lodging.map((lodge) => encodeURIComponent(lodge.city)).join("%7C")}&travelmode=driving`;
  return <>
    <section className="hero relative min-h-[340px] overflow-hidden rounded-[18px] border border-[var(--line)]" aria-label="Города маршрута">
      {slides.map((slide, slideIndex) => <button key={slide[0]} className={`absolute inset-0 size-full cursor-zoom-in text-left transition-opacity duration-[600ms] ${slideIndex === index ? "z-[2] opacity-100" : "z-[1] opacity-0"}`} onClick={() => setLightbox(true)} tabIndex={slideIndex === index ? 0 : -1} aria-label={`Открыть фото: ${slide[1]}`}>
        <img className="size-full object-cover" src={`/images/hero-${slide[0]}.png`} alt={slide[1]} />
        <span className="absolute inset-x-0 bottom-0 block bg-gradient-to-t from-black/80 p-6 pt-24 text-white">
          <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">{slide[2]}</span>
          <strong className="mt-2 block font-display text-3xl">{slide[3]}</strong><span className="mt-1 block text-[13px] text-white/85">{slide[4]}</span>
        </span>
      </button>)}
      <button className="carousel-arrow left-3" onClick={() => shift(-1)} title="Назад" aria-label="Предыдущий слайд">‹</button><button className="carousel-arrow right-3" onClick={() => shift(1)} title="Вперёд" aria-label="Следующий слайд">›</button>
      <div className="absolute right-4 top-4 z-[5] flex gap-1.5">{slides.map((slide, i) => <button key={slide[0]} className={`size-2 rounded-full shadow ${i === index ? "bg-white" : "bg-white/50"}`} onClick={() => setIndex(i)} aria-label={`Слайд ${i + 1}`} />)}</div>
    </section>

    <h2 className="section-heading">Погода сейчас</h2><p className="section-note">Текущая погода во всех городах маршрута — обновляется при загрузке страницы.</p>
    <div className="weather-grid">{weatherCities.map((city) => { const current = weather[city]; const state = current && !("error" in current) ? weatherInfo(current.code) : null; return <article className="weather-card" key={city}>
      {cityPhotos[city] && <img src={`/images/hero-${cityPhotos[city]}.png`} alt="" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/45" />
      <div className="absolute inset-x-0 top-0 flex justify-between p-4 text-white"><strong className="font-mono text-3xl">{!current ? "…" : "error" in current ? "—" : `${Math.round(current.temp)}°`}</strong><span className="grid size-9 place-items-center rounded-xl bg-white/20 text-xl backdrop-blur">{state?.[1] || (current ? "!" : "…")}</span></div>
      <div className="absolute inset-x-0 bottom-0 p-4 text-white"><strong className="block truncate">{city}</strong><span className="text-xs text-white/80">{state?.[0] || (current ? "Погода недоступна" : "загрузка…")} · сейчас</span></div>
    </article>; })}</div>

    <section className="overview-summary">
      <div><p className="eyebrow">Маршрут путешествия</p><h2 className="font-display text-3xl font-semibold">Прага → Италия → Прага</h2><p className="mt-2 text-sm text-[var(--muted)]">{cities.join(" · ")}</p></div>
      <div className="progress-block"><div className="flex justify-between text-sm font-bold"><span>Готовность плана</span><span>{progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--track)]"><div className="h-full rounded-full bg-[var(--ol)] transition-[width]" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-xs text-[var(--muted)]">{done} из {total} пунктов выполнено</p></div>
      <div className="trip-stats"><span><b>{cities.length}</b> городов</span><span><b>{nights}</b> ночёвок</span><span><b>{data.sights.filter((s) => s.done).length}/{data.sights.length}</b> мест</span><span><b>{data.trip.people}+{data.trip.dogs}</b> людей + собак</span></div>
    </section>

    <h2 className="section-heading">Карта маршрута</h2><p className="section-note">Нажмите на город, чтобы открыть его на Google Maps.</p>
    <div className="route-stops">{data.lodging.map((lodge, i) => { const short = lodge.city.split(",")[0]; const day = data.days.find((item) => item.dayMapUrl?.trim() && item.city.includes(short)); const url = day?.dayMapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lodge.city)}`; return <a key={lodge.id} href={url} target="_blank" rel="noreferrer"><span>{i + 1}</span><span className="min-w-0 flex-1"><b className="block truncate">{lodge.city}</b><small>{lodge.dates}</small></span><i>↗</i></a>; })}</div>
    <div className="relative"><RouteMap cities={data.lodging.map((lodge) => lodge.city)} /><div className="map-actions"><button className={subtleButton} onClick={() => void copyText(routeUrl).then(() => showCopied(true, false))}>{copied ? "✓ Скопировано" : "⧉ Скопировать ссылку"}</button><a className={subtleButton} href={routeUrl} target="_blank" rel="noreferrer">Открыть в Google Maps ↗</a></div></div>

    {lightbox && <div className="lightbox" role="dialog" aria-modal="true" aria-label={slides[index][1]} onMouseDown={(event) => event.target === event.currentTarget && setLightbox(false)}><img src={`/images/hero-${slides[index][0]}.png`} alt={slides[index][1]} /><button ref={closeButton} className="lightbox-close" onClick={() => setLightbox(false)} aria-label="Закрыть">×</button><button className="lightbox-prev" onClick={() => shift(-1)} aria-label="Предыдущее фото">‹</button><button className="lightbox-next" onClick={() => shift(1)} aria-label="Следующее фото">›</button></div>}
  </>;
}
