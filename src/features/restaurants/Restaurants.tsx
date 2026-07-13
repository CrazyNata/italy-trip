import { useMemo, useState, type CSSProperties } from "react";
import { useTripData } from "../../trip/TripDataContext";
import { supabase } from "../../lib/supabase/client";
import { useConfirm } from "../../components/ConfirmDialog";
import { Lightbox } from "../../components/Lightbox";
import type { Restaurant } from "../../types/trip";
import { uid } from "../shared";
import { RestaurantEditorModal } from "./RestaurantEditorModal";

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
  const [areaFilter, setAreaFilter] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "rating" | "distance">("default");
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);

  const list = useMemo(() => data?.restaurants ?? [], [data]);
  const cities = useMemo(
    () => [...new Set(list.map((item) => item.city).filter(Boolean))],
    [list],
  );
  const areas = useMemo(
    () => [...new Set(list.map((item) => item.area).filter((area): area is string => !!area))],
    [list],
  );

  const visible = useMemo(() => {
    const filtered = list
      .filter((item) => !cityFilter || item.city === cityFilter)
      .filter((item) => !areaFilter || item.area === areaFilter)
      .filter((item) => !priceFilter || item.price === priceFilter)
      .filter((item) => !minRating || (item.googleRating ?? 0) >= minRating)
      .map((item) => ({
        item,
        distance: userLoc && item.lnglat ? distanceKm(userLoc, item.lnglat) : null,
      }));
    if (sortBy === "rating")
      filtered.sort((a, b) => (b.item.googleRating ?? 0) - (a.item.googleRating ?? 0));
    if (sortBy === "distance")
      filtered.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    return filtered;
  }, [list, cityFilter, areaFilter, priceFilter, minRating, sortBy, userLoc]);

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

  const chip = (active: boolean): CSSProperties => ({
    border: `1px solid ${active ? "var(--ac,#b95c3f)" : "var(--line,#e7dcc7)"}`,
    background: active ? "var(--ac,#b95c3f)" : "var(--card,#fff)",
    color: active ? "#fff" : "var(--ink,#3b3228)",
    fontSize: 12.5, fontWeight: 600, padding: "6px 12px", borderRadius: "var(--r-2)", cursor: "pointer", whiteSpace: "nowrap",
    boxShadow: active ? "0 2px 8px color-mix(in srgb, var(--ac,#b95c3f) 45%, transparent)" : "none",
    transition: "background .15s, box-shadow .15s, color .15s",
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
        {areas.length > 0 && (
          <>
            <span style={groupLabel}>Район</span>
            {areas.map((area) => (
              <button key={area} style={chip(areaFilter === area)} onClick={() => setAreaFilter(areaFilter === area ? "" : area)}>
                <i className="fa-solid fa-house" style={{ fontSize: 11, marginRight: 6 }} />{area}
              </button>
            ))}
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
          style={selectStyle(sortBy !== "default")}
        >
          <option value="default" style={{ color: "var(--ink,#3b3228)" }}>по порядку</option>
          <option value="rating" style={{ color: "var(--ink,#3b3228)" }}>по оценке</option>
          <option value="distance" style={{ color: "var(--ink,#3b3228)" }}>по расстоянию</option>
        </select>
      </div>
      )}

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
                    {item.price ? <span className="restaurant-card-price" title="Уровень цен">{item.price}</span> : <span />}
                  </div>

                  <h3 className="restaurant-card-title">{item.name}</h3>

                  {item.note && <p className="restaurant-card-note">{item.note}</p>}
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
