import { useMemo, useState, type CSSProperties } from "react";
import { useTripData } from "../../trip/TripDataContext";
import { supabase } from "../../lib/supabase/client";
import { useConfirm } from "../../components/ConfirmDialog";
import { Lightbox } from "../../components/Lightbox";
import type { Restaurant } from "../../types/trip";
import { uid, useTransientState } from "../shared";

const statuses = ["хочу", "бронь", "были"];
const priceLevels = ["€", "€€", "€€€", "€€€€"];
// Флаг по названию города. Пустой/дефолтный город → нейтральная булавка,
// чтобы не выглядело, будто флаг «залип» на Италии. Всё нераспознанное
// считаем Италией — это основная страна поездки.
const flag = (city: string) => {
  const value = city.trim().toLowerCase();
  if (!value || value === "город" || value === "новый город") return "📍";
  if (/австри|зальцбург|вена|инсбрук|грац/.test(value)) return "🇦🇹";
  if (/германи|мюнхен|берлин|нюрнберг|гармиш/.test(value)) return "🇩🇪";
  if (/чехи|чеш|праг|брно/.test(value)) return "🇨🇿";
  return "🇮🇹";
};
const readonly = () => window.dispatchEvent(new CustomEvent("trip:readonly"));
const toast = (message: string) =>
  window.dispatchEvent(new CustomEvent("trip:toast", { detail: message }));

const storageBase = new URL(supabase.storage.from("place-photos").getPublicUrl("__probe__").data.publicUrl);
const storagePrefix = storageBase.pathname.slice(0, -"__probe__".length);
const storagePath = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.origin === storageBase.origin && parsed.pathname.startsWith(storagePrefix)
      ? decodeURIComponent(parsed.pathname.slice(storagePrefix.length))
      : "";
  } catch { return ""; }
};

// Достаёт координаты из ссылки на Google Maps в разных её форматах.
// Возвращает [долгота, широта] или null, если ссылка без координат
// (например, короткая maps.app.goo.gl — её не распарсить на клиенте).
function parseLatLng(url?: string): [number, number] | null {
  if (!url) return null;
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /\/(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const re of patterns) {
    const match = url.match(re);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return [lng, lat];
    }
  }
  return null;
}

// Расстояние по прямой между двумя точками [долгота, широта], км.
function distanceKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const formatDistance = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(km < 10 ? 1 : 0)} км`;

function Stars({ value, onSet }: { value: number; onSet: (rating: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 2 }} title="Моя оценка">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onSet(value === star ? 0 : star)}
          style={{ border: "none", background: "none", cursor: "pointer", padding: 1, fontSize: 15, lineHeight: 1, color: star <= value ? "#e0a740" : "#d3c4a8" }}
          title={`${star} из 5`}
        >
          <i className={star <= value ? "fa-solid fa-star" : "fa-regular fa-star"} />
        </button>
      ))}
    </div>
  );
}

export function Restaurants() {
  const { data, updateData, isReadOnly } = useTripData();
  const confirm = useConfirm();
  const [copied, setCopied] = useState<string | null>(null);
  const showCopied = useTransientState(setCopied);
  const [photoIndex, setPhotoIndex] = useState<Record<string, number>>({});
  const [lightbox, setLightbox] = useState<{ id: string; index: number } | null>(null);
  const [cityFilter, setCityFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<"default" | "rating" | "distance">("default");
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);

  const list = useMemo(() => data?.restaurants ?? [], [data]);
  const cities = useMemo(
    () => [...new Set(list.map((item) => item.city).filter(Boolean))],
    [list],
  );

  const visible = useMemo(() => {
    const filtered = list
      .filter((item) => !cityFilter || item.city === cityFilter)
      .filter((item) => !priceFilter || item.price === priceFilter)
      .filter((item) => !minRating || (item.rating ?? 0) >= minRating)
      .map((item) => ({
        item,
        distance: userLoc && item.lnglat ? distanceKm(userLoc, item.lnglat) : null,
      }));
    if (sortBy === "rating")
      filtered.sort((a, b) => (b.item.rating ?? 0) - (a.item.rating ?? 0));
    if (sortBy === "distance")
      filtered.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    return filtered;
  }, [list, cityFilter, priceFilter, minRating, sortBy, userLoc]);

  if (!data) return null;

  const guard = (action: () => void) => (isReadOnly ? readonly() : action());
  const edit = (id: string, patch: Partial<Restaurant>) =>
    guard(() =>
      updateData((current) => ({
        ...current,
        restaurants: (current.restaurants ?? []).map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
      })),
    );
  const editLink = (id: string, link: string) => {
    const coords = parseLatLng(link);
    edit(id, coords ? { link, lnglat: coords } : { link });
  };

  const findLocation = () => {
    if (!navigator.geolocation) return toast("Геолокация недоступна в этом браузере");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc([pos.coords.longitude, pos.coords.latitude]);
        setSortBy("distance");
        setLocating(false);
        toast("Местоположение определено — рестораны отсортированы по близости");
      },
      () => {
        setLocating(false);
        toast("Не удалось определить местоположение");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const shift = (item: Restaurant, amount: number) =>
    setPhotoIndex((current) => ({
      ...current,
      [item.id]:
        ((current[item.id] || 0) + amount + (item.photos?.length || 1)) %
        (item.photos?.length || 1),
    }));

  const uploadPhotos = async (item: Restaurant, files?: FileList | null) => {
    if (!files || !files.length) return;
    if (isReadOnly) return readonly();
    toast("Загружаю фото…");
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const extension = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "") || "jpg";
      const path = `${item.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${extension}`;
      const result = await supabase.storage
        .from("place-photos")
        .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
      if (result.error) { toast("Не удалось загрузить фото"); continue; }
      urls.push(supabase.storage.from("place-photos").getPublicUrl(path).data.publicUrl);
    }
    if (!urls.length) return;
    updateData((current) => ({
      ...current,
      restaurants: (current.restaurants ?? []).map((entry) =>
        entry.id === item.id ? { ...entry, photos: [...(entry.photos || []), ...urls] } : entry,
      ),
    }));
    toast(urls.length > 1 ? "Фото сохранены" : "Фото сохранено");
  };

  const removePhoto = async (item: Restaurant, index: number) => {
    if (isReadOnly) return readonly();
    const url = item.photos?.[index];
    if (!url) return;
    if (!(await confirm({ title: "Удалить фото?", message: <>Это фото ресторана «{item.name}» будет удалено безвозвратно.</> }))) return;
    const path = storagePath(url);
    if (path) {
      const { error } = await supabase.storage.from("place-photos").remove([path]);
      if (error) return toast("Не удалось удалить фото из хранилища");
    }
    setPhotoIndex((current) => ({ ...current, [item.id]: 0 }));
    updateData((current) => ({
      ...current,
      restaurants: (current.restaurants ?? []).map((entry) =>
        entry.id === item.id ? { ...entry, photos: (entry.photos || []).filter((_, i) => i !== index) } : entry,
      ),
    }));
  };

  const add = () =>
    guard(() =>
      updateData((current) => ({
        ...current,
        restaurants: [
          ...(current.restaurants ?? []),
          { id: uid("r"), name: "Новый ресторан", city: "", status: "хочу", note: "", link: "" },
        ],
      })),
    );
  const copy = async (item: Restaurant) => {
    if (!item.link) return window.alert("Для этого ресторана ссылка ещё не добавлена.");
    try {
      await navigator.clipboard.writeText(item.link);
    } catch {
      /* Opening the link remains available. */
    }
    showCopied(item.id, null);
  };
  const remove = async (item: Restaurant) => {
    if (isReadOnly) return readonly();
    if (
      !(await confirm({
        title: "Удалить ресторан?",
        message: (
          <>
            «{item.name}» ({item.city}) будет удалён безвозвратно вместе со всеми загруженными фото. Это
            действие нельзя отменить.
          </>
        ),
      }))
    )
      return;
    const paths = [...new Set((item.photos || []).map(storagePath).filter(Boolean))];
    if (paths.length) {
      const { error } = await supabase.storage.from("place-photos").remove(paths);
      if (error) return toast("Не удалось удалить фото ресторана из хранилища");
    }
    updateData((current) => ({
      ...current,
      restaurants: (current.restaurants ?? []).filter((entry) => entry.id !== item.id),
    }));
  };

  const chip = (active: boolean): CSSProperties => ({
    border: `1px solid ${active ? "var(--ac,#b95c3f)" : "var(--line,#e7dcc7)"}`,
    background: active ? "var(--ac,#b95c3f)" : "var(--card,#fff)",
    color: active ? "#fff" : "var(--ink,#3b3228)",
    fontSize: 12.5, fontWeight: 600, padding: "6px 12px", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap",
    boxShadow: active ? "0 2px 8px color-mix(in srgb, var(--ac,#b95c3f) 45%, transparent)" : "none",
    transition: "background .15s, box-shadow .15s, color .15s",
  });
  const groupLabel: CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ac,#b95c3f)", whiteSpace: "nowrap" };

  const active = lightbox && list.find((item) => item.id === lightbox.id);

  return (
    <>
      {/* Панель фильтров — только когда есть что фильтровать, всё в одну строку */}
      {list.length > 0 && (
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 6, rowGap: 10, marginBottom: 16, padding: "12px 12px", borderRadius: 14, background: "var(--card,#fff)", border: "1px solid var(--line,#e7dcc7)", boxShadow: "0 1px 3px rgba(59,50,40,.06)" }}>
        {cities.length > 1 && (
          <>
            <span style={groupLabel}>Город</span>
            <select
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              style={{ border: `1px solid ${cityFilter ? "var(--ac,#b95c3f)" : "var(--line,#e7dcc7)"}`, borderRadius: 999, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, background: cityFilter ? "var(--ac,#b95c3f)" : "var(--card,#fff)", color: cityFilter ? "#fff" : "var(--ink,#3b3228)", cursor: "pointer", boxShadow: cityFilter ? "0 2px 8px color-mix(in srgb, var(--ac,#b95c3f) 45%, transparent)" : "none" }}
            >
              <option value="" style={{ color: "var(--ink,#3b3228)" }}>Все города</option>
              {cities.map((city) => (
                <option key={city} value={city} style={{ color: "var(--ink,#3b3228)" }}>{flag(city)} {city}</option>
              ))}
            </select>
          </>
        )}
        <span style={groupLabel}>Цена</span>
        {priceLevels.map((level) => (
          <button key={level} style={chip(priceFilter === level)} onClick={() => setPriceFilter(priceFilter === level ? "" : level)}>
            {level}
          </button>
        ))}
        <span style={groupLabel}>Оценка от</span>
        {[3, 4, 5].map((value) => (
          <button key={value} style={chip(minRating === value)} onClick={() => setMinRating(minRating === value ? 0 : value)}>
            {value}★
          </button>
        ))}
        <button
          onClick={findLocation}
          disabled={locating}
          title={userLoc ? "Местоположение найдено — сортирую по близости" : "Найти моё местоположение и показать расстояние до ресторанов"}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, border: `1px solid ${userLoc ? "var(--ac,#b95c3f)" : "var(--line,#e7dcc7)"}`, background: userLoc ? "var(--ac,#b95c3f)" : "var(--card,#fff)", color: userLoc ? "#fff" : "var(--ink,#3b3228)", borderRadius: 999, padding: "7px 13px", fontSize: 12.5, fontWeight: 600, cursor: locating ? "wait" : "pointer", whiteSpace: "nowrap", boxShadow: userLoc ? "0 2px 8px color-mix(in srgb, var(--ac,#b95c3f) 45%, transparent)" : "none" }}
        >
          <i className={locating ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-location-crosshairs"} />
          {userLoc ? "Найдено" : "Местоположение"}
        </button>
        <span style={groupLabel}>Сорт.</span>
        <select
          value={sortBy}
          onChange={(event) => {
            const value = event.target.value as typeof sortBy;
            setSortBy(value);
            if (value === "distance" && !userLoc) findLocation();
          }}
          style={{ border: `1px solid ${sortBy !== "default" ? "var(--ac,#b95c3f)" : "var(--line,#e7dcc7)"}`, borderRadius: 999, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, background: sortBy !== "default" ? "var(--ac,#b95c3f)" : "var(--card,#fff)", color: sortBy !== "default" ? "#fff" : "var(--ink,#3b3228)", cursor: "pointer", boxShadow: sortBy !== "default" ? "0 2px 8px color-mix(in srgb, var(--ac,#b95c3f) 45%, transparent)" : "none" }}
        >
          <option value="default" style={{ color: "var(--ink,#3b3228)" }}>по порядку</option>
          <option value="rating" style={{ color: "var(--ink,#3b3228)" }}>по оценке</option>
          <option value="distance" style={{ color: "var(--ink,#3b3228)" }}>по расстоянию</option>
        </select>
      </div>
      )}

      <div
        className="lodging-grid"
        style={{ animation: "fadeUp .4s ease both", position: "relative", borderRadius: 20, padding: 20, background: "radial-gradient(120% 90% at 0% 0%, rgba(42,112,137,.16), transparent 55%), radial-gradient(120% 90% at 100% 100%, rgba(217,154,78,.16), transparent 55%), var(--track,#efe4cf)", border: "1px solid var(--line,#e7dcc7)", overflow: "hidden" }}
      >
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: .5, backgroundImage: "radial-gradient(var(--line,#d8c9ac) 1.1px, transparent 1.1px)", backgroundSize: "22px 22px" }} />
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 18 }}>
          {list.length === 0 && (
            <p style={{ gridColumn: "1/-1", margin: 0, fontSize: 13, color: "var(--muted,#8a7d6b)" }}>
              Пока пусто. Добавьте ресторан, куда хотите сходить.
            </p>
          )}
          {list.length > 0 && visible.length === 0 && (
            <p style={{ gridColumn: "1/-1", margin: 0, fontSize: 13, color: "var(--muted,#8a7d6b)" }}>
              Ничего не найдено по выбранным фильтрам.
            </p>
          )}
          {visible.map(({ item, distance }) => {
            const photos = item.photos || [];
            const index = (photoIndex[item.id] || 0) % (photos.length || 1);
            return (
              <article
                key={item.id}
                style={{ background: "var(--paper,#fbf2df)", border: "1px solid var(--line,#e7dcc7)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 1px 3px rgba(59,50,40,.05)" }}
              >
                {photos.length > 0 && (
                  <div style={{ position: "relative", height: 220, overflow: "hidden", background: "var(--track,#efe4cf)" }}>
                    <img
                      aria-hidden
                      src={photos[index]}
                      alt=""
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(18px)", transform: "scale(1.15)", opacity: .55 }}
                    />
                    <img
                      loading="lazy"
                      src={photos[index]}
                      alt={item.name}
                      onClick={() => setLightbox({ id: item.id, index })}
                      style={{ position: "relative", width: "100%", height: "100%", objectFit: "contain", display: "block", cursor: "zoom-in" }}
                    />
                    {distance !== null && (
                      <span style={{ position: "absolute", top: 10, left: 10, background: "rgba(24,18,12,.62)", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999 }}>
                        <i className="fa-solid fa-location-arrow" style={{ fontSize: 10, marginRight: 5 }} />{formatDistance(distance)}
                      </span>
                    )}
                    <button
                      title="Удалить это фото"
                      onClick={() => void removePhoto(item, index)}
                      style={{ position: "absolute", top: 10, right: 10, width: 30, height: 30, border: "none", borderRadius: "50%", background: "rgba(24,18,12,.5)", color: "#fff", cursor: "pointer", fontSize: 13, display: "grid", placeItems: "center" }}
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                    {photos.length > 1 && (
                      <>
                        <button title="Назад" onClick={() => shift(item, -1)} style={{ position: "absolute", top: "50%", left: 10, transform: "translateY(-50%)", width: 32, height: 32, border: "none", borderRadius: "50%", background: "rgba(24,18,12,.5)", color: "#fff", cursor: "pointer", fontSize: 13, display: "grid", placeItems: "center" }}>
                          <i className="fa-solid fa-chevron-left" />
                        </button>
                        <button title="Вперёд" onClick={() => shift(item, 1)} style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", width: 32, height: 32, border: "none", borderRadius: "50%", background: "rgba(24,18,12,.5)", color: "#fff", cursor: "pointer", fontSize: 13, display: "grid", placeItems: "center" }}>
                          <i className="fa-solid fa-chevron-right" />
                        </button>
                        <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
                          {photos.map((_, dot) => (
                            <span key={dot} style={{ width: 7, height: 7, borderRadius: "50%", background: dot === index ? "#fff" : "rgba(255,255,255,.5)", boxShadow: "0 0 2px rgba(0,0,0,.4)" }} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 15, lineHeight: 1 }}>{flag(item.city)}</span>
                      <input
                        value={item.city}
                        onChange={(event) => edit(item.id, { city: event.target.value })}
                        placeholder="Впишите город"
                        title="Город, где находится ресторан"
                        style={{ flex: 1, minWidth: 0, border: "1px solid var(--line,#e7dcc7)", background: "var(--soft,#fdfaf3)", borderRadius: 8, color: "var(--ac,#b95c3f)", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", fontSize: 11.5, padding: "5px 9px" }}
                      />
                    </div>
                    <input
                      value={item.name}
                      onChange={(event) => edit(item.id, { name: event.target.value })}
                      style={{ fontFamily: "'Playfair Display',serif", fontSize: 23, fontWeight: 600, border: "none", background: "none", width: "100%", padding: "2px 0", color: "var(--ink,#3b3228)" }}
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 4 }} title="Уровень цен">
                      {priceLevels.map((level) => (
                        <button
                          key={level}
                          onClick={() => edit(item.id, { price: item.price === level ? "" : level })}
                          style={{ border: `1px solid ${item.price === level ? "var(--ac,#b95c3f)" : "var(--line,#e7dcc7)"}`, background: item.price === level ? "var(--ac,#b95c3f)" : "var(--card,#fff)", color: item.price === level ? "#fff" : "#c4b5a0", fontSize: 12, fontWeight: 700, padding: "4px 8px", borderRadius: 8, cursor: "pointer", minWidth: 30 }}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                    <Stars value={item.rating ?? 0} onSet={(rating) => edit(item.id, { rating })} />
                  </div>

                  <input
                    placeholder="кухня / что заказать…"
                    value={item.note || ""}
                    onChange={(event) => edit(item.id, { note: event.target.value })}
                    style={{ border: "1px solid var(--line,#e7dcc7)", borderRadius: 9, padding: "8px 11px", fontSize: 13, background: "var(--soft,#fdfaf3)" }}
                  />
                  <input
                    placeholder="ссылка (карта Google / сайт)…"
                    value={item.link || ""}
                    onChange={(event) => editLink(item.id, event.target.value)}
                    style={{ border: "1px solid var(--line,#e7dcc7)", borderRadius: 9, padding: "8px 11px", fontSize: 13, background: "var(--soft,#fdfaf3)" }}
                  />
                  {distance === null && userLoc && (
                    <span style={{ fontSize: 11, color: "var(--muted,#8a7d6b)" }}>
                      Расстояние появится, если в ссылке есть координаты Google Maps.
                    </span>
                  )}
                  {distance !== null && photos.length === 0 && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ac,#b95c3f)" }}>
                      <i className="fa-solid fa-location-arrow" style={{ fontSize: 10, marginRight: 5 }} />до ресторана {formatDistance(distance)}
                    </span>
                  )}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {statuses.map((status) => (
                      <button
                        key={status}
                        onClick={() => edit(item.id, { status })}
                        style={{ border: `1px solid ${item.status === status ? "var(--ac,#b95c3f)" : "var(--line,#e7dcc7)"}`, background: item.status === status ? "var(--ac,#b95c3f)" : "var(--card,#fff)", color: item.status === status ? "#fff" : "var(--muted,#8a7d6b)", fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 999, cursor: "pointer" }}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: "auto" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      {item.link ? (
                        <a href={item.link} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          Открыть →
                        </a>
                      ) : (
                        <span style={{ fontSize: 13, color: "var(--muted,#8a7d6b)" }}>ссылки нет</span>
                      )}
                      <button
                        title="Скопировать ссылку"
                        onClick={() => void copy(item)}
                        style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted,#8a7d6b)", fontSize: 13, padding: "2px 4px", flex: "none" }}
                      >
                        <i className={copied === item.id ? "fa-solid fa-check" : "fa-solid fa-copy"} />
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 2, flex: "none" }}>
                      <label title="Добавить фото" style={{ cursor: "pointer", color: "var(--muted,#8a7d6b)", fontSize: 14, padding: "4px 6px", display: "grid", placeItems: "center" }}>
                        <i className="fa-solid fa-camera" />
                        <input
                          hidden
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(event) => { void uploadPhotos(item, event.target.files); event.target.value = ""; }}
                        />
                      </label>
                      <button
                        onClick={() => void remove(item)}
                        style={{ border: "none", background: "none", color: "#c4b5a0", cursor: "pointer", fontSize: 13 }}
                      >
                        удалить
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
          <button
            onClick={add}
            style={{ border: "2px dashed #d8c9ac", background: "none", borderRadius: 16, minHeight: 180, color: "#a2937c", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "grid", placeItems: "center" }}
          >
            + добавить ресторан
          </button>
        </div>
      </div>

      {active?.photos && lightbox && (
        <Lightbox
          images={active.photos}
          index={lightbox.index}
          alt={active.name}
          onClose={() => setLightbox(null)}
          onIndex={(next) => setLightbox((current) => (current ? { ...current, index: next } : null))}
        />
      )}
    </>
  );
}
