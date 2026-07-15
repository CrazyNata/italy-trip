import { useMemo, useState, type CSSProperties } from "react";
import { useTripData } from "../../trip/TripDataContext";
import { supabase } from "../../lib/supabase/client";
import { useConfirm } from "../../components/ConfirmDialog";
import { Lightbox } from "../../components/Lightbox";
import { restaurantCategories, type Restaurant, type RestaurantCategory } from "../../types/trip";
import { uid } from "../shared";
import { RestaurantEditorModal } from "./RestaurantEditorModal";
import { RestaurantCityMap } from "./RestaurantCityMap";

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

type EditorState = {
  draft: Restaurant;
  originalPhotos: string[];
  uploadedPhotos: string[];
  isNew: boolean;
};

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

export function Restaurants() {
  const { data, updateData, isReadOnly } = useTripData();
  const confirm = useConfirm();
  const [photoIndex, setPhotoIndex] = useState<Record<string, number>>({});
  const [lightbox, setLightbox] = useState<{ id: string; index: number } | null>(null);
  const [cityFilter, setCityFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [placeTypeFilter, setPlaceTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState<"booking" | "rating" | "price" | "distance">("rating");
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [mapCity, setMapCity] = useState("");
  const [mapFocus, setMapFocus] = useState<string | null>(null);
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const [mapCardsCollapsed, setMapCardsCollapsed] = useState(false);
  const [mapCopied, setMapCopied] = useState(false);
  const [mapCategories, setMapCategories] = useState<RestaurantCategory[]>([]);
  const [mapFiltersOpen, setMapFiltersOpen] = useState(false);

  const list = useMemo(() => data?.restaurants ?? [], [data]);
  const cities = useMemo(
    () => [...new Set(list.map((item) => item.city).filter(Boolean))],
    [list],
  );
  const activeMapCity = cities.includes(mapCity) ? mapCity : cities[0] ?? "";
  const cityMappedRestaurants = list.filter((item) => item.city === activeMapCity && item.lnglat);
  const mappedRestaurants = cityMappedRestaurants.filter((item) =>
    !mapCategories.length || item.categories?.some((category) => mapCategories.includes(category)),
  );
  const mapUrl = mappedRestaurants.length === 1
    ? `https://www.google.com/maps/search/?api=1&query=${mappedRestaurants[0].lnglat!.slice().reverse().join(",")}`
    : mappedRestaurants.length > 1
      ? `https://www.google.com/maps/dir/?api=1&origin=${mappedRestaurants[0].lnglat!.slice().reverse().join(",")}&destination=${mappedRestaurants[mappedRestaurants.length - 1].lnglat!.slice().reverse().join(",")}${mappedRestaurants.length > 2 ? `&waypoints=${mappedRestaurants.slice(1, -1).map((item) => item.lnglat!.slice().reverse().join(",")).join("%7C")}` : ""}`
      : "";
  const toggleMapCategory = (category: RestaurantCategory) => {
    setMapFocus(null);
    setMapCategories((current) => current.includes(category)
      ? current.filter((item) => item !== category)
      : [...current, category]);
  };

  const visible = useMemo(() => {
    const filtered = list
      .filter((item) => !cityFilter || item.city === cityFilter)
      .filter((item) => !priceFilter || item.price === priceFilter)
        .filter((item) => !minRating || (item.googleRating ?? 0) >= minRating)
        .filter((item) => !priorityOnly || item.priority)
        .filter((item) => !placeTypeFilter || (item.placeType ?? "ресторан") === placeTypeFilter)
        .filter((item) => sortBy !== "booking" || item.status === "бронь")
      .map((item) => ({
        item,
        distance: userLoc && item.lnglat ? distanceKm(userLoc, item.lnglat) : null,
      }));
    if (sortBy === "rating")
      filtered.sort((a, b) => (b.item.googleRating ?? 0) - (a.item.googleRating ?? 0));
    if (sortBy === "price")
      filtered.sort((a, b) => {
        const priceA = priceLevels.indexOf(a.item.price ?? "");
        const priceB = priceLevels.indexOf(b.item.price ?? "");
        return (priceA < 0 ? Infinity : priceA) - (priceB < 0 ? Infinity : priceB);
      });
    if (sortBy === "distance")
      filtered.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    if (sortBy === "booking")
      filtered.sort((a, b) => `${a.item.reservationDate ?? "9999-99-99"}T${a.item.reservationTime ?? "99:99"}`.localeCompare(`${b.item.reservationDate ?? "9999-99-99"}T${b.item.reservationTime ?? "99:99"}`));
    return filtered;
  }, [list, cityFilter, priceFilter, minRating, priorityOnly, placeTypeFilter, sortBy, userLoc]);

  if (!data) return null;

  const guard = (action: () => void) => (isReadOnly ? readonly() : action());
  const deleteStorageUrls = async (urls: string[], failureMessage: string) => {
    const paths = [...new Set(urls.map(storagePath).filter(Boolean))];
    if (!paths.length) return true;
    const { error } = await supabase.storage.from("place-photos").remove(paths);
    if (!error) return true;
    toast(failureMessage);
    return false;
  };
  const openEditor = (item: Restaurant) =>
    guard(() =>
      setEditor({
        draft: { ...item, photos: [...(item.photos ?? [])] },
        originalPhotos: [...(item.photos ?? [])],
        uploadedPhotos: [],
        isNew: false,
      }),
    );
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

  const uploadEditorPhotos = async (files?: FileList | null) => {
    if (!files || !files.length) return;
    if (isReadOnly) return readonly();
    if (!editor) return;
    toast("Загружаю фото…");
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const extension = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "") || "jpg";
      const path = `${editor.draft.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${extension}`;
      const result = await supabase.storage
        .from("place-photos")
        .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
      if (result.error) { toast("Не удалось загрузить фото"); continue; }
      urls.push(supabase.storage.from("place-photos").getPublicUrl(path).data.publicUrl);
    }
    if (!urls.length) return;
    setEditor((current) => current ? {
      ...current,
      draft: { ...current.draft, photos: [...(current.draft.photos ?? []), ...urls] },
      uploadedPhotos: [...current.uploadedPhotos, ...urls],
    } : current);
    toast(urls.length > 1 ? "Фото сохранены" : "Фото сохранено");
  };

  const removeEditorPhoto = async (index: number) => {
    if (isReadOnly) return readonly();
    const url = editor?.draft.photos?.[index];
    if (!url) return;
    if (!(await confirm({ title: "Удалить фото?", message: <>Это фото ресторана «{editor?.draft.name}» будет удалено безвозвратно.</> }))) return;
    if (editor?.uploadedPhotos.includes(url)) {
      if (!(await deleteStorageUrls([url], "Не удалось удалить фото из хранилища"))) return;
    }
    setEditor((current) => current ? {
      ...current,
      draft: { ...current.draft, photos: (current.draft.photos ?? []).filter((_, photoIndex) => photoIndex !== index) },
      uploadedPhotos: current.uploadedPhotos.filter((photo) => photo !== url),
    } : current);
  };

  const closeEditor = async () => {
    if (!editor) return;
    if (!(await deleteStorageUrls(editor.uploadedPhotos, "Не удалось удалить фото из хранилища"))) return;
    setEditor(null);
  };
  const saveEditor = async () => {
    if (isReadOnly) return readonly();
    if (!editor) return;
    const removedPhotos = editor.originalPhotos.filter((url) => !editor.draft.photos?.includes(url));
    if (!(await deleteStorageUrls(removedPhotos, "Не удалось удалить фото из хранилища"))) return;
    updateData((current) => ({
      ...current,
      restaurants: editor.isNew
        ? [...(current.restaurants ?? []), editor.draft]
        : (current.restaurants ?? []).map((item) => item.id === editor.draft.id ? editor.draft : item),
    }));
    setEditor(null);
  };
  const deleteEditorRestaurant = async () => {
    if (isReadOnly) return readonly();
    if (!editor || editor.isNew) return;
    if (!(await confirm({
      title: "Удалить ресторан?",
      message: <>{`«${editor.draft.name}» (${editor.draft.city}) будет удалён безвозвратно вместе со всеми загруженными фото. Это действие нельзя отменить.`}</>,
    }))) return;
    const photos = [...new Set([...editor.originalPhotos, ...editor.uploadedPhotos])];
    if (!(await deleteStorageUrls(photos, "Не удалось удалить фото ресторана из хранилища"))) return;
    updateData((current) => ({
      ...current,
      restaurants: (current.restaurants ?? []).filter((item) => item.id !== editor.draft.id),
    }));
    setEditor(null);
  };
  const add = () =>
    guard(() => {
      const draft: Restaurant = { id: uid("r"), name: "Новый ресторан", city: "", status: "хочу", note: "", link: "" };
      setEditor({ draft, originalPhotos: [], uploadedPhotos: [], isNew: true });
    });

  const groupLabel: CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ac,#b95c3f)", whiteSpace: "nowrap" };
  const selectStyle = (active: boolean): CSSProperties => ({
    flex: "1 1 auto", minWidth: 90,
    border: `1px solid ${active ? "var(--ac,#b95c3f)" : "var(--line,#e7dcc7)"}`,
    borderRadius: "var(--r-2)", padding: "7px 12px", fontSize: 12.5, fontWeight: 600,
    background: active ? "var(--ac,#b95c3f)" : "var(--card,#fff)",
    color: active ? "#fff" : "var(--ink,#3b3228)", cursor: "pointer",
    boxShadow: active ? "0 2px 8px color-mix(in srgb, var(--ac,#b95c3f) 45%, transparent)" : "none",
  });

  const active = lightbox && list.find((item) => item.id === lightbox.id);

  return (
    <>
      {/* Панель фильтров — только когда есть что фильтровать, всё в одну строку */}
      {list.length > 0 && (
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 6, rowGap: 10, marginBottom: 16, padding: "12px 14px", borderRadius: "var(--r-3)", background: "radial-gradient(120% 90% at 0% 0%, rgba(42,112,137,.16), transparent 55%), radial-gradient(120% 90% at 100% 100%, rgba(217,154,78,.16), transparent 55%), var(--track,#efe4cf)", border: "1px solid var(--line,#e7dcc7)" }}>
        {cities.length > 1 && (
          <>
            <span style={groupLabel}>Город</span>
            <select
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              style={{ ...selectStyle(!!cityFilter), maxWidth: 150 }}
            >
              <option value="" style={{ color: "var(--ink,#3b3228)" }}>Все города</option>
              {cities.map((city) => (
                <option key={city} value={city} style={{ color: "var(--ink,#3b3228)" }}>{flag(city)} {city}</option>
              ))}
            </select>
          </>
        )}
        <select title="Цена" value={priceFilter} onChange={(event) => setPriceFilter(event.target.value)} style={selectStyle(!!priceFilter)}>
          <option value="" style={{ color: "var(--ink,#3b3228)" }}>Цена</option>
          {priceLevels.map((level) => (
            <option key={level} value={level} style={{ color: "var(--ink,#3b3228)" }}>{level}</option>
          ))}
        </select>
        <select title="Оценка" value={minRating} onChange={(event) => setMinRating(Number(event.target.value))} style={selectStyle(minRating > 0)}>
          <option value={0} style={{ color: "var(--ink,#3b3228)" }}>Оценка</option>
          {[3, 4, 5].map((value) => (
            <option key={value} value={value} style={{ color: "var(--ink,#3b3228)" }}>от {value}★</option>
          ))}
        </select>
        <button type="button" onClick={() => setPriorityOnly((current) => !current)} style={selectStyle(priorityOnly)}>
          🔥 приоритет
        </button>
        <select value={placeTypeFilter} onChange={(event) => setPlaceTypeFilter(event.target.value)} style={selectStyle(!!placeTypeFilter)}><option value="">Тип места</option><option value="ресторан">Ресторан</option><option value="кафе">Кафе</option><option value="бар">Бар</option></select>
        <button
          onClick={findLocation}
          disabled={locating}
          title={userLoc ? "Местоположение найдено — сортирую по близости" : "Найти моё местоположение и показать расстояние до ресторанов"}
          aria-label={userLoc ? "Местоположение найдено" : "Определить местоположение"}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", border: `1px solid ${userLoc ? "var(--ac,#b95c3f)" : "var(--line,#e7dcc7)"}`, background: userLoc ? "var(--ac,#b95c3f)" : "var(--card,#fff)", color: userLoc ? "#fff" : "var(--ink,#3b3228)", borderRadius: "var(--r-2)", padding: "7px 11px", fontSize: 13, cursor: locating ? "wait" : "pointer", boxShadow: userLoc ? "0 2px 8px color-mix(in srgb, var(--ac,#b95c3f) 45%, transparent)" : "none" }}
        >
          <i className={locating ? "fa-solid fa-spinner fa-spin" : userLoc ? "fa-solid fa-location-dot" : "fa-solid fa-location-crosshairs"} />
        </button>
        <span style={groupLabel}>Сорт.</span>
        <select
          value={sortBy}
          onChange={(event) => {
            const value = event.target.value as typeof sortBy;
            setSortBy(value);
            if (value === "distance" && !userLoc) findLocation();
          }}
          style={selectStyle(sortBy !== "booking")}
        >
          <option value="booking" style={{ color: "var(--ink,#3b3228)" }}>по брони</option>
          <option value="rating" style={{ color: "var(--ink,#3b3228)" }}>по оценке</option>
          <option value="price" style={{ color: "var(--ink,#3b3228)" }}>по стоимости</option>
          <option value="distance" style={{ color: "var(--ink,#3b3228)" }}>по расстоянию</option>
        </select>
      </div>
      )}
      {cityMappedRestaurants.length > 0 && <section style={{ position: "relative", zIndex: mapFiltersOpen ? 3 : undefined, animation: "fadeUp .4s ease both", background: "radial-gradient(120% 90% at 0% 0%, rgba(42,112,137,.16), transparent 55%), radial-gradient(120% 90% at 100% 100%, rgba(217,154,78,.16), transparent 55%), var(--track,#efe4cf)", border: "1px solid var(--line,#e7dcc7)", borderRadius: "var(--r-4)", padding: 16, margin: "0 0 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: mapCollapsed ? 0 : 13 }}>
          <div onClick={() => setMapCollapsed((value) => !value)} title={mapCollapsed ? "Развернуть карту ресторанов" : "Свернуть карту ресторанов"} style={{ cursor: "pointer", userSelect: "none" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 600 }}><i className="fa-solid fa-utensils" style={{ color: "var(--ac,#b95c3f)", fontSize: 18, marginRight: 7 }} />Карта ресторанов</div><span style={{ flex: 1 }} /><i className="fa-solid fa-chevron-down" style={{ fontSize: 14, color: "var(--muted,#8a7d6b)", transform: mapCollapsed ? "rotate(-90deg)" : "none", transition: "transform .2s" }} /></div>{!mapCollapsed && <div style={{ fontSize: 12.5, color: "var(--muted,#8a7d6b)", marginTop: 3 }}>Нажмите на ресторан в списке, чтобы показать его на карте.</div>}</div>
          {!mapCollapsed && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={activeMapCity} onChange={(event) => { setMapCity(event.target.value); setMapFocus(null); }} style={{ flex: "1 1 260px", minWidth: 220, border: "1px solid var(--line,#e7dcc7)", borderRadius: "var(--r-2)", padding: "8px 12px", fontSize: 13, background: "var(--soft,#fdfaf3)", color: "var(--ink,#3b3228)" }}><option value="">город...</option>{cities.map((city) => <option key={city}>{city}</option>)}</select>
            <div style={{ display: "contents" }}><button type="button" onClick={() => setMapFiltersOpen((open) => !open)} style={{ flex: "1 1 auto", justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--line,#e7dcc7)", background: mapFiltersOpen || mapCategories.length ? "var(--soft,#fdfaf3)" : "var(--soft,#fdfaf3)", color: "var(--ink,#3b3228)", borderRadius: "var(--r-2)", padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><i className="fa-solid fa-sliders" style={{ fontSize: 12 }} />Фильтры{mapCategories.length ? ` · ${mapCategories.length}` : ""}</button>{mapFiltersOpen && <div style={{ flexBasis: "100%", display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", padding: "4px 0 0" }}><span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted,#8a7d6b)", marginRight: 3 }}>Категории</span>{restaurantCategories.map((category) => { const selected = mapCategories.includes(category); return <button key={category} type="button" onClick={() => toggleMapCategory(category)} style={{ border: `1px solid ${selected ? "var(--ac,#b95c3f)" : "var(--line,#e7dcc7)"}`, background: selected ? "var(--ac,#b95c3f)" : "var(--soft,#fdfaf3)", color: selected ? "#fff" : "var(--ink,#3b3228)", borderRadius: "var(--r-1)", padding: "5px 8px", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>{category}</button>; })}</div>}</div>
            <button type="button" onClick={async () => { if (!mapUrl) return toast("Добавьте минимум два ресторана с координатами"); try { await navigator.clipboard.writeText(mapUrl); } catch {} setMapCopied(true); window.setTimeout(() => setMapCopied(false), 1800); }} style={{ flex: "1 1 auto", justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--line,#e7dcc7)", background: "var(--soft,#fdfaf3)", color: "var(--ink,#3b3228)", borderRadius: "var(--r-2)", padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><i className={mapCopied ? "fa-solid fa-check" : "fa-regular fa-copy"} style={{ fontSize: 11 }} />{mapCopied ? "Скопировано" : "Копировать маршрут"}</button>
          </div>}
        </div>
        {!mapCollapsed && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}><div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 380, overflow: "auto" }}>{mappedRestaurants.length > 0 ? <>{mappedRestaurants.map((item, index) => { const active = mapFocus === item.id; return <div key={item.id} onClick={() => setMapFocus(item.id)} title="Показать на карте" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: `1px solid ${active ? "var(--ac,#b95c3f)" : "var(--line,#e7dcc7)"}`, borderRadius: "var(--r-2)", background: active ? "var(--card,#fff)" : "var(--soft,#fdfaf3)", transition: "border-color .2s, background .2s", cursor: "pointer" }}><span style={{ width: 21, height: 21, flex: "none", borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--ac,#b95c3f)", color: "#fff", fontSize: 11, fontWeight: 700 }}>{index + 1}</span><span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, fontWeight: 600 }}>{item.name}</span></div>; })}<div style={{ fontSize: 12, color: "var(--muted,#8a7d6b)", padding: "3px 2px" }}>{mappedRestaurants.length} мест на карте</div></> : <div style={{ fontSize: 13, color: "var(--muted,#8a7d6b)", padding: "6px 0" }}>В этой категории нет ресторанов с координатами.</div>}</div><RestaurantCityMap restaurants={mappedRestaurants.length ? mappedRestaurants : cityMappedRestaurants} focus={mapFocus} googleMapsUrl={mapUrl} /></div>}
        {!mapCollapsed && mappedRestaurants.length > 0 && <div style={{ margin: "20px -16px -16px", padding: "18px 16px 16px", background: "var(--soft,#f1f7f6)", borderTop: "1px solid var(--line,#e7dcc7)" }}><div onClick={() => setMapCardsCollapsed((value) => !value)} style={{ display: "flex", alignItems: "baseline", gap: 9, margin: mapCardsCollapsed ? 0 : "0 0 13px", cursor: "pointer", userSelect: "none" }}><h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{activeMapCity}</h2><span style={{ fontSize: 12, color: "var(--muted,#8a7d6b)", flex: 1 }}>{mappedRestaurants.length} мест</span><i className="fa-solid fa-chevron-down" style={{ fontSize: 14, color: "var(--muted,#8a7d6b)", transform: mapCardsCollapsed ? "rotate(-90deg)" : "none", transition: "transform .2s" }} /></div>{!mapCardsCollapsed && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>{mappedRestaurants.map((item, index) => <a key={item.id} href={item.link || undefined} target={item.link ? "_blank" : undefined} rel="noreferrer" onClick={(event) => { if (!item.link) { event.preventDefault(); setMapFocus(item.id); } }} style={{ position: "relative", minHeight: 145, borderRadius: "var(--r-2)", overflow: "hidden", background: "var(--card,#fff)", border: "1px solid var(--line,#e7dcc7)", cursor: "pointer", color: "inherit", textDecoration: "none" }}>{item.photos?.[0] && <img src={item.photos[0]} alt={item.name} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .78 }} />}<div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg,rgba(20,35,36,.78),transparent 72%)" }} /><span style={{ position: "absolute", top: 9, left: 9, width: 23, height: 23, borderRadius: "50%", background: "var(--ac,#2a7089)", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>{index + 1}</span><div style={{ position: "absolute", left: 11, right: 11, bottom: 10, color: "#fff", textShadow: "0 1px 5px rgba(0,0,0,.42)" }}><div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 600, lineHeight: 1.05 }}>{item.name}</div><div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", opacity: .82, marginTop: 4 }}>{item.placeType ?? "ресторан"}</div></div></a>)}</div>}</div>}
      </section>}

      <div
        className="lodging-grid"
        style={{ animation: "fadeUp .4s ease both", position: "relative", borderRadius: "var(--r-5)", padding: 20, background: "radial-gradient(120% 90% at 0% 0%, rgba(42,112,137,.16), transparent 55%), radial-gradient(120% 90% at 100% 100%, rgba(217,154,78,.16), transparent 55%), var(--track,#efe4cf)", border: "1px solid var(--line,#e7dcc7)", overflow: "hidden" }}
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
                style={{ background: "var(--paper,#fbf2df)", border: "1px solid var(--line,#e7dcc7)", borderRadius: "var(--r-4)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 1px 3px rgba(59,50,40,.05)" }}
              >
                <div style={{ position: "relative", height: 220, overflow: "hidden", background: "var(--track,#efe4cf)" }}>
                  {photos.length > 0 ? (
                    <>
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
                      <span style={{ position: "absolute", top: 10, left: 10, background: "rgba(24,18,12,.62)", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: "var(--r-2)" }}>
                        <i className="fa-solid fa-location-arrow" style={{ fontSize: 10, marginRight: 5 }} />{formatDistance(distance)}
                      </span>
                    )}
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
                    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "30px 14px 11px", background: "linear-gradient(to top, rgba(18,14,10,.74), transparent)", pointerEvents: "none", display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 14, lineHeight: 1 }}>{flag(item.city)}</span>
                      <span style={{ color: "#fff", fontWeight: 700, fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", textShadow: "0 1px 4px rgba(0,0,0,.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.city || "Без города"}</span>
                    </div>
                    </>
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", alignContent: "center", gap: 8, color: "var(--muted,#8a7d6b)" }}>
                      <i className="fa-solid fa-camera" style={{ fontSize: 28, color: "var(--ac,#b95c3f)" }} />
                      <span style={{ fontSize: 13, fontWeight: 700 }}>Нет фото</span>
                    </div>
                  )}
                </div>
                <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    {item.googleRating != null ? (
                      <a
                        href={item.link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.name}, ${item.city}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Рейтинг Google"
                        style={{ display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none", border: "1px solid var(--line,#e7dcc7)", background: "var(--card,#fff)", borderRadius: "var(--r-2)", padding: "3px 11px 3px 10px" }}
                      >
                        <span style={{ fontFamily: "Arial, sans-serif", fontWeight: 800, fontSize: 12.5, letterSpacing: "-.02em" }}>
                          <span style={{ color: "#4285F4" }}>G</span>
                          <span style={{ color: "#DB4437" }}>o</span>
                          <span style={{ color: "#F4B400" }}>o</span>
                          <span style={{ color: "#4285F4" }}>g</span>
                          <span style={{ color: "#0F9D58" }}>l</span>
                          <span style={{ color: "#DB4437" }}>e</span>
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink,#3b3228)" }}>{item.googleRating.toFixed(1).replace(".", ",")}</span>
                        <i className="fa-solid fa-star" style={{ fontSize: 11, color: "#e0a740" }} />
                        {item.googleReviews != null && (
                          <span style={{ fontSize: 11.5, color: "var(--muted,#8a7d6b)" }}>
                            {item.googleReviews >= 1000 ? `${(item.googleReviews / 1000).toFixed(item.googleReviews >= 10000 ? 0 : 1).replace(".", ",")} тыс.` : item.googleReviews}
                          </span>
                        )}
                      </a>
                    ) : <span />}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {item.priority && <span title="Приоритетный ресторан" aria-label="Приоритетный ресторан">🔥</span>}
                      {item.price && <span className="restaurant-card-price" title="Уровень цен">{item.price}</span>}
                    </span>
                  </div>

                  <h3 className="restaurant-card-title">{item.name}</h3>

                  {item.note && <p className="restaurant-card-note">{item.note}</p>}
                  {item.status === "бронь" && (item.reservationDate || item.reservationTime) && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ac,#b95c3f)" }}>📅 {item.reservationDate && new Date(`${item.reservationDate}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}{item.reservationDate && item.reservationTime && " · "}{item.reservationTime}</span>}
                  {distance !== null && photos.length === 0 && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ac,#b95c3f)" }}>
                      <i className="fa-solid fa-location-arrow" style={{ fontSize: 10, marginRight: 5 }} />до ресторана {formatDistance(distance)}
                    </span>
                  )}
                  <span className="restaurant-card-status">{item.status}</span>
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: "auto" }}>
                    {!isReadOnly && (
                      <button
                        type="button"
                        className="restaurant-card-edit"
                        onClick={() => openEditor(item)}
                        aria-label={`Редактировать ресторан ${item.name}`}
                        title="Редактировать ресторан"
                      >
                        <i className="fa-solid fa-pen" aria-hidden />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
          {!isReadOnly && (
            <button
              onClick={add}
              style={{ border: "2px dashed #d8c9ac", background: "none", borderRadius: "var(--r-4)", minHeight: 180, color: "#a2937c", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "grid", placeItems: "center" }}
            >
              + добавить ресторан
            </button>
          )}
        </div>
      </div>

      {editor && !isReadOnly && (
        <RestaurantEditorModal
          draft={editor.draft}
          isNew={editor.isNew}
          statuses={statuses}
          priceLevels={priceLevels}
          onChange={(patch) => setEditor((current) => current ? { ...current, draft: { ...current.draft, ...patch } } : current)}
          onUpload={(files) => void uploadEditorPhotos(files)}
          onRemovePhoto={(index) => void removeEditorPhoto(index)}
          onMovePhoto={(index, amount) => setEditor((current) => {
            if (!current) return current;
            const photos = [...(current.draft.photos ?? [])];
            const target = index + amount;
            if (target < 0 || target >= photos.length) return current;
            [photos[index], photos[target]] = [photos[target], photos[index]];
            return { ...current, draft: { ...current.draft, photos } };
          })}
          onSave={() => void saveEditor()}
          onCancel={() => void closeEditor()}
          onDelete={() => void deleteEditorRestaurant()}
        />
      )}

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
