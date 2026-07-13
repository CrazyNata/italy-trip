import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import { useAuth } from "../../auth";
import { supabase } from "../../lib/supabase/client";
import { useTripData } from "../../trip/TripDataContext";
import type { Sight } from "../../types/trip";
import { useConfirm } from "../../components/ConfirmDialog";
import { WARM_STYLE, warmConfig } from "../maps/mapTheme";
import { uid, useDialogKeyboard, useScrollLock, useTransientState } from "../shared";

const subs = [
  "достопримечательности",
  "музеи",
  "природа",
  "еда",
  "шопинг",
  "развлечения",
  "пляж",
  "разное",
];
const colors: Record<string, string> = {
  достопримечательности: "#b95c3f",
  музеи: "#cf9440",
  природа: "#7c8450",
  еда: "#c88a6a",
  шопинг: "#9a7b4f",
  развлечения: "#c06a86",
  пляж: "#5f8aa0",
  разное: "#8a7d6b",
};
const days: Record<number, string> = {
  1: "День 1: античный Рим",
  2: "День 2: центр Рима",
  3: "День 3: Ватикан и Боргезе",
};
const toast = (message?: string) =>
  window.dispatchEvent(
    new CustomEvent(message ? "trip:toast" : "trip:readonly", {
      detail: message,
    }),
  );
const subOf = (sight: Sight) => sight.subcategory || "разное";

// Place description dialog. Rendered through a portal into document.body — like
// the shared Lightbox and confirm dialogs — so the tab's animated (transformed)
// container can't trap the fixed backdrop and open it off-centre.
function SightInfo({ sight, text, photo, onClose }: { sight: Sight; text: string; photo?: string; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useScrollLock();
  useDialogKeyboard({ open: true, onClose, initialFocus: closeButton });
  const image = sight.photo || photo;
  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(14,10,7,.68)", display: "grid", placeItems: "center", padding: 20 }}
      role="dialog"
      aria-modal="true"
      onClick={(event) => event.currentTarget === event.target && onClose()}
    >
      <div style={{ width: "min(100%, 540px)", maxHeight: "min(760px, calc(100vh - 40px))", overflow: "auto", background: "var(--card,#fff)", borderRadius: "var(--r-5)", boxShadow: "0 18px 60px rgba(0,0,0,.35)", position: "relative" }}>
        {image && (
          <img style={{ width: "100%", height: 230, objectFit: "cover", display: "block" }} src={image} alt={sight.name} />
        )}
        <button
          ref={closeButton}
          style={{ position: "absolute", top: 12, right: 12, width: 34, height: 34, border: "none", borderRadius: "50%", background: "rgba(20,18,14,.62)", color: "#fff", cursor: "pointer", fontSize: 16 }}
          title="Закрыть"
          onClick={onClose}
        >
          <i className="fa-solid fa-xmark" />
        </button>
        <div style={{ padding: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: "var(--ac,#2a7089)", fontWeight: 700 }}>
            {subOf(sight)} · {sight.city}
          </div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, lineHeight: 1.05, fontWeight: 600, margin: "8px 0 12px" }}>
            {sight.name}
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--muted,#5f7c7e)", margin: 0 }}>{text}</p>
          <a
            style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 18, border: "1px solid var(--line,#e7dcc7)", borderRadius: "var(--r-2)", padding: "9px 12px", color: "var(--ink,#3b3228)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${sight.name}, ${sight.city}`)}`}
            target="_blank"
            rel="noreferrer"
          >
            <i className="fa-solid fa-location-dot" style={{ color: "var(--ac,#2a7089)" }} />Открыть на карте
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}

let nextNominatimRequest = 0;

// Pull a header image for a place from the Russian Wikipedia REST summary.
// Prefers the full-size original over the small thumbnail so card and dialog
// imagery stays crisp. Returns undefined when the article has no picture.
async function fetchWikiImage(name: string, signal: AbortSignal): Promise<string | undefined> {
  try {
    const response = await fetch(
      `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
      { signal },
    );
    if (!response.ok) return undefined;
    const json = (await response.json()) as {
      originalimage?: { source?: string };
      thumbnail?: { source?: string };
    };
    return json.originalimage?.source || json.thumbnail?.source;
  } catch {
    return undefined;
  }
}

type RouteState = {
  signature: string;
  distance: number;
  duration: number;
} | null;

function WalkingMap({
  sights,
  readOnly,
  focus,
  onMove,
  onRoute,
}: {
  sights: Sight[];
  readOnly: boolean;
  focus?: { id: string; nonce: number } | null;
  onMove: (id: string, lnglat: [number, number]) => void;
  onRoute: (route: RouteState, error: string) => void;
}) {
  const { mapboxToken } = useAuth();
  const element = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | undefined>(undefined);
  const markersRef = useRef<Record<string, MapboxMarker>>({});
  const [mapError, setMapError] = useState("");
  useEffect(() => {
    if (!element.current || !mapboxToken) return;
    let live = true;
    let map: import("mapbox-gl").Map | undefined;
    const markers: import("mapbox-gl").Marker[] = [];
    const controller = new AbortController();
    setMapError("");
    markersRef.current = {};
    void import("mapbox-gl").then(({ default: mapbox }) => {
      if (!live || !element.current) return;
      try {
        mapbox.accessToken = mapboxToken;
        map = new mapbox.Map({
        container: element.current,
        style: WARM_STYLE,
        config: warmConfig(),
        center: sights[0]?.lnglat || [12.5, 41.9],
        zoom: 12,
        cooperativeGestures: true,
        attributionControl: false,
        });
      } catch { setMapError("Не удалось запустить карту в этом браузере."); return; }
      mapRef.current = map;
      map.on("error", () => live && setMapError("Не удалось загрузить карту. Проверьте токен и подключение."));
      map.addControl(
        new mapbox.NavigationControl({ showCompass: false }),
        "top-left",
      );
      map.addControl(new mapbox.AttributionControl({ compact: true }));
      sights.forEach((sight, index) => {
        const markerElement = document.createElement("div");
        markerElement.className =
          "grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-[var(--ac)] text-xs font-bold text-white shadow-md";
        markerElement.textContent = String(index + 1);
        const marker = new mapbox.Marker({
          element: markerElement,
          draggable: !readOnly,
        })
          .setLngLat(sight.lnglat!)
          .setPopup(
            new mapbox.Popup({ offset: 18, closeButton: false }).setText(
              sight.name,
            ),
          )
          .addTo(map!);
        marker.on("dragend", () => {
          const point = marker.getLngLat();
          onMove(sight.id, [point.lng, point.lat]);
        });
        markers.push(marker);
        markersRef.current[sight.id] = marker;
      });
      map.on("load", async () => {
        if (sights.length) {
          const bounds = new mapbox.LngLatBounds();
          sights.forEach((sight) => bounds.extend(sight.lnglat!));
          sights.length === 1
            ? map!.flyTo({
                center: sights[0].lnglat!,
                zoom: 14,
                essential: false,
              })
            : map!.fitBounds(bounds, { padding: 55, maxZoom: 15, duration: 0 });
        }
        if (sights.length < 2) {
          onRoute(null, "");
          return;
        }
        const signature = sights
          .map((sight) => `${sight.id}:${sight.lnglat!.join(",")}`)
          .join("|");
        try {
          const coordinates = sights
            .map((sight) => sight.lnglat!.join(","))
            .join(";");
          const response = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}?geometries=geojson&overview=full&access_token=${encodeURIComponent(mapboxToken)}`,
            { signal: controller.signal },
          );
          if (!response.ok) throw new Error("route");
          const json = (await response.json()) as {
            routes?: Array<{
              geometry: { type: "LineString"; coordinates: number[][] };
              distance: number;
              duration: number;
            }>;
          };
          const route = json.routes?.[0];
          if (!route || !live) throw new Error("route");
          map!.addSource("walking-route", {
            type: "geojson",
            data: { type: "Feature", properties: {}, geometry: route.geometry },
          });
          map!.addLayer({
            id: "walking-route",
            type: "line",
            source: "walking-route",
            slot: "middle",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#b95c3f",
              "line-width": 5,
              "line-opacity": 0.85,
            },
          });
          onRoute(
            { signature, distance: route.distance, duration: route.duration },
            "",
          );
        } catch (error) {
          if (live && (error as Error).name !== "AbortError") onRoute(null, "Не удалось построить пеший маршрут");
        }
      });
    }).catch(() => { map?.remove(); if (live) setMapError("Не удалось загрузить модуль карты."); });
    return () => {
      live = false;
      controller.abort();
      markers.forEach((marker) => marker.remove());
      map?.remove();
      mapRef.current = undefined;
      markersRef.current = {};
    };
  }, [
    mapboxToken,
    readOnly,
    sights.map((sight) => `${sight.id}:${sight.lnglat?.join(",")}`).join("|"),
  ]);

  // Fly to a sight's marker and open its label when its list item is clicked.
  useEffect(() => {
    if (!focus) return;
    const map = mapRef.current;
    const marker = markersRef.current[focus.id];
    if (!map || !marker) return;
    const go = () => {
      map.flyTo({ center: marker.getLngLat(), zoom: 15, duration: 1000, essential: true });
      Object.values(markersRef.current).forEach((other) => {
        const popup = other.getPopup();
        if (popup && popup.isOpen()) other.togglePopup();
      });
      const popup = marker.getPopup();
      if (popup && !popup.isOpen()) marker.togglePopup();
    };
    if (map.loaded()) go(); else map.once("load", go);
  }, [focus?.id, focus?.nonce]);
  return (
    <div ref={element} style={{ height: 380, minHeight: 280, borderRadius: "var(--r-3)", overflow: "hidden", background: "var(--track,#efe4cf)", position: "relative" }}>
      {(mapError || !mapboxToken) && (
        <div className="grid h-full place-items-center text-sm text-[var(--muted)]">
          {mapError || "Токен карты недоступен"}
        </div>
      )}
    </div>
  );
}

export function Sights() {
  const { data, updateData, isReadOnly } = useTripData();
  const { mapboxToken } = useAuth();
  const confirm = useConfirm();
  const [filter, setFilter] = useState({ city: "", group: "", sub: "" });
  const [draft, setDraft] = useState({
    city: "",
    name: "",
    group: "",
    sub: "",
  });
  const [open, setOpen] = useState<string | null>(null);
  const [wiki, setWiki] = useState<{
    id: string;
    text: string;
    photo?: string;
  } | null>(null);
  const wikiRequest = useRef<{ id: string; controller: AbortController } | null>(null);
  const geocodeController = useRef(new AbortController());
  const mounted = useRef(true);
  const [walkCity, setWalkCity] = useState("");
  const [walkDay, setWalkDay] = useState(1);
  const [walkFocus, setWalkFocus] = useState<{ id: string; nonce: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [fetchingPhotos, setFetchingPhotos] = useState(false);
  const [route, setRoute] = useState<RouteState>(null);
  const [routeError, setRouteError] = useState("");
  const [copied, setCopied] = useState(false);
  const showCopied = useTransientState(setCopied);
  const closeInfo = () => { wikiRequest.current?.controller.abort(); wikiRequest.current = null; setOpen(null); };
  useEffect(() => {
    mounted.current = true;
    geocodeController.current = new AbortController();
    return () => {
      mounted.current = false;
      wikiRequest.current?.controller.abort();
      geocodeController.current.abort();
    };
  }, []);
  if (!data) return null;
  const cities = [
    ...new Set(data.sights.map((sight) => sight.city).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "ru"));
  const routeCities = data.sights
    .filter((sight) => sight.walkDay && sight.city)
    .reduce<Record<string, number>>((counts, sight) => {
      counts[sight.city] = (counts[sight.city] || 0) + 1;
      return counts;
    }, {});
  const defaultWalkCity = Object.entries(routeCities).sort(([, a], [, b]) => b - a)[0]?.[0] || cities[0] || "";
  const activeCity = cities.includes(walkCity) ? walkCity : defaultWalkCity;
  const walkTitle = activeCity === "Рим, Италия" ? days[walkDay] : "Маршрут по городу";
  const guard = (action: () => void) => (isReadOnly ? toast() : action());
  const mutate = (id: string, change: Partial<Sight>) =>
    guard(() =>
      updateData((current) => ({
        ...current,
        sights: current.sights.map((sight) =>
          sight.id === id ? { ...sight, ...change } : sight,
        ),
      })),
    );
  const filtered = data.sights.filter(
    (sight) =>
      (!filter.city || sight.city === filter.city) &&
      (!filter.group || (sight.group || "необязательные") === filter.group) &&
      (!filter.sub || subOf(sight) === filter.sub),
  );
  const walkAll = data.sights
    .map((sight, index) => ({ ...sight, _index: index }))
    .filter(
      (sight) =>
        sight.city === activeCity &&
        (!sight.walkDay || sight.walkDay === walkDay),
    )
    .sort((a, b) => (a.walkOrder ?? a._index) - (b.walkOrder ?? b._index));
  const located = walkAll
    .filter((sight) => sight.lnglat?.length === 2)
    .slice(0, 25);
  const mapUrl =
    located.length < 2
      ? ""
      : `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${located[0].lnglat![1]},${located[0].lnglat![0]}`)}&destination=${encodeURIComponent(`${located.at(-1)!.lnglat![1]},${located.at(-1)!.lnglat![0]}`)}${
          located.length > 2
            ? `&waypoints=${encodeURIComponent(
                located
                  .slice(1, -1)
                  .map((sight) => `${sight.lnglat![1]},${sight.lnglat![0]}`)
                  .join("|"),
              )}`
            : ""
        }&travelmode=walking`;

  async function geocodeSight(sight: Sight) {
    try {
      let center: [number, number] | undefined;
      const wait = Math.max(0, nextNominatimRequest - Date.now());
      if (wait) await new Promise((resolve) => window.setTimeout(resolve, wait));
      if (!mounted.current) return false;
      nextNominatimRequest = Date.now() + 1100;
      try {
        const nominatim = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=ru&q=${encodeURIComponent(`${sight.name}, ${sight.city}`)}`, { signal: geocodeController.current.signal });
        if (nominatim.ok) {
          const item = ((await nominatim.json()) as Array<{lat:string;lon:string}>)[0];
          if (item && Number.isFinite(+item.lon) && Number.isFinite(+item.lat)) center = [+item.lon, +item.lat];
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") throw error;
      }
      if (!center && mapboxToken) {
        const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(`${sight.name}, ${sight.city}`)}.json?limit=1&language=ru&access_token=${encodeURIComponent(mapboxToken)}`, { signal: geocodeController.current.signal });
        if (response.ok) center = ((await response.json()) as {features?:Array<{center:[number,number]}>}).features?.[0]?.center;
      }
      if (!center || !mounted.current) return false;
      updateData((current) => ({
        ...current,
        sights: current.sights.map((item) =>
          item.id === sight.id ? { ...item, lnglat: center } : item,
        ),
      }));
      return true;
    } catch {
      return false;
    }
  }
  async function geocodeMissing() {
    if (isReadOnly) return void toast();
    const missing = walkAll.filter((sight) => !sight.lnglat);
    if (!missing.length)
      return void toast("У всех мест этого города уже есть точки");
    setGeocoding(true);
    let found = 0;
    for (const sight of missing) {
      if (await geocodeSight(sight)) found += 1;
    }
    if (!mounted.current) return;
    setGeocoding(false);
    toast(
      found
        ? `Найдены точки: ${found} из ${missing.length}`
        : "Точки не найдены. Проверьте названия мест.",
    );
  }
  async function fetchPhotosMissing() {
    if (isReadOnly) return void toast();
    const missing = walkAll.filter((sight) => !sight.photo);
    if (!missing.length)
      return void toast("У всех мест этого города уже есть фото");
    setFetchingPhotos(true);
    let found = 0;
    for (const sight of missing) {
      const photo = await fetchWikiImage(sight.name, geocodeController.current.signal);
      if (!mounted.current) return;
      if (photo) {
        found += 1;
        updateData((current) => ({
          ...current,
          sights: current.sights.map((item) =>
            item.id === sight.id && !item.photo ? { ...item, photo } : item,
          ),
        }));
      }
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      if (!mounted.current) return;
    }
    setFetchingPhotos(false);
    toast(
      found
        ? `Найдены фото: ${found} из ${missing.length}`
        : "Фото не найдены. Проверьте названия мест.",
    );
  }
  async function openInfo(sight: Sight) {
    wikiRequest.current?.controller.abort();
    const controller = new AbortController();
    wikiRequest.current = { id: sight.id, controller };
    setOpen(sight.id);
    setWiki(null);
    try {
      const response = await fetch(
        `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(sight.name)}`,
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error();
      const json = (await response.json()) as {
        extract?: string;
        originalimage?: { source?: string };
        thumbnail?: { source?: string };
      };
      if (wikiRequest.current?.id !== sight.id) return;
      const photo = json.originalimage?.source || json.thumbnail?.source;
      setWiki({
        id: sight.id,
        text: json.extract || "Описание пока не найдено.",
        photo,
      });
      // Remember the Wikipedia photo on the place itself so cards and the route
      // gallery aren't blank. Only fills an empty slot — never overwrites a photo
      // the user uploaded, and skipped for read-only viewers.
      if (photo && !sight.photo && !isReadOnly) {
        updateData((current) => ({
          ...current,
          sights: current.sights.map((item) =>
            item.id === sight.id && !item.photo ? { ...item, photo } : item,
          ),
        }));
      }
    } catch (error) {
      if ((error as Error).name === "AbortError" || wikiRequest.current?.id !== sight.id) return;
      setWiki({
        id: sight.id,
        text: "Добавьте заметку или ссылку в карточку места, чтобы сохранить детали посещения.",
      });
    }
  }
  async function upload(sight: Sight, file?: File) {
    if (!file) return;
    if (isReadOnly) return void toast();
    toast("Загружаю фото…");
    const extension =
      (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "") || "jpg";
    const path = `${sight.id}_${Date.now()}.${extension}`;
    const result = await supabase.storage
      .from("place-photos")
      .upload(path, file, {
        upsert: true,
        contentType: file.type || "image/jpeg",
      });
    if (result.error) return void toast("Не удалось загрузить фото");
    const photo = supabase.storage.from("place-photos").getPublicUrl(path)
      .data.publicUrl;
    let oldPath = "";
    let retained = false;
    updateData((current) => ({ ...current, sights: current.sights.map((item) => {
      if (item.id !== sight.id) return item;
      retained = true;
      oldPath = item.photoPath || "";
      return { ...item, photo, photoPath: path };
    }) }));
    if (!retained) {
      await supabase.storage.from("place-photos").remove([path]);
      return;
    }
    if (oldPath && oldPath !== path) {
      const { error } = await supabase.storage.from("place-photos").remove([oldPath]);
      if (error) toast("Новое фото сохранено, старое не удалось удалить");
    }
    toast("Фото сохранено");
  }
  async function removeSightPhoto(sight: Sight) {
    if (isReadOnly) return void toast();
    if (!(await confirm({ title: "Удалить фото?", message: <>Фото места «{sight.name}» будет удалено безвозвратно.</> }))) return;
    const path = data?.sights.find((item) => item.id === sight.id)?.photoPath || "";
    if (path) {
      const { error } = await supabase.storage.from("place-photos").remove([path]);
      if (error) return void toast("Не удалось удалить фото из хранилища");
    }
    updateData((current) => ({ ...current, sights: current.sights.map((item) => item.id === sight.id && (item.photoPath || "") === path ? { ...item, photo: "", photoPath: "" } : item) }));
    toast("Фото удалено");
  }
  async function removeSight(sight: Sight) {
    if (isReadOnly) return void toast();
    if (!(await confirm({ title: "Удалить место?", message: <>«{sight.name}» будет удалено безвозвратно вместе с фото. Это действие нельзя отменить.</> }))) return;
    const path = data?.sights.find((item) => item.id === sight.id)?.photoPath || "";
    if (path) {
      const { error } = await supabase.storage.from("place-photos").remove([path]);
      if (error) return void toast("Не удалось удалить фото места из хранилища");
    }
    updateData((current) => ({ ...current, sights: current.sights.filter((item) => item.id !== sight.id || (item.photoPath || "") !== path) }));
  }
  function add() {
    if (!draft.name.trim()) return;
    guard(() => {
      const id = uid("s");
      const city = draft.city.trim() || "Без города";
      const sight: Sight = {
        id,
        name: draft.name.trim(),
        city,
        group:
          draft.group === "обязательные" ? "обязательные" : "необязательные",
        subcategory: draft.sub || "разное",
        done: false,
        walkOrder: data!.sights.filter((item) => item.city === city).length,
      };
      updateData((current) => ({
        ...current,
        sights: [...current.sights, sight],
      }));
      setDraft({ city: "", name: "", group: draft.group, sub: "" });
      void geocodeSight(sight);
    });
  }
  function move(id: string, direction: number) {
    guard(() => {
      const index = walkAll.findIndex((sight) => sight.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= walkAll.length) return;
      const ids = walkAll.map((sight) => sight.id);
      [ids[index], ids[target]] = [ids[target], ids[index]];
      updateData((current) => ({
        ...current,
        sights: current.sights.map((sight) =>
          ids.includes(sight.id)
            ? { ...sight, walkOrder: ids.indexOf(sight.id) }
            : sight,
        ),
      }));
    });
  }
  const selected = open ? data.sights.find((sight) => sight.id === open) : null;
  return (
    <>
      <div style={{ animation: "fadeUp .4s ease both" }}>
      <div className="sights-controls" style={{ background: "radial-gradient(120% 90% at 0% 0%, rgba(42,112,137,.16), transparent 55%), radial-gradient(120% 90% at 100% 100%, rgba(217,154,78,.16), transparent 55%), var(--track,#efe4cf)", border: "1px solid var(--line,#e7dcc7)", borderRadius: "var(--r-4)", padding: "14px 16px", display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
        <input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="город" style={{ width: 130, border: "1px solid var(--line,#e7dcc7)", borderRadius: "var(--r-2)", padding: "9px 12px", fontSize: 14, background: "var(--soft,#fdfaf3)" }} />
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="что посмотреть / куда сходить" style={{ flex: 1, minWidth: 160, border: "1px solid var(--line,#e7dcc7)", borderRadius: "var(--r-2)", padding: "9px 12px", fontSize: 14, background: "var(--soft,#fdfaf3)" }} />
        <select value={draft.group} onChange={(e) => setDraft({ ...draft, group: e.target.value })} style={{ width: 150, border: "1px solid var(--line,#e7dcc7)", borderRadius: "var(--r-2)", padding: "9px 12px", fontSize: 14, background: "var(--soft,#fdfaf3)", color: "var(--ink,#3b3228)", cursor: "pointer" }}><option value="">важность…</option><option>обязательные</option><option>необязательные</option></select>
        <select value={draft.sub} onChange={(e) => setDraft({ ...draft, sub: e.target.value })} style={{ width: 160, border: "1px solid var(--line,#e7dcc7)", borderRadius: "var(--r-2)", padding: "9px 12px", fontSize: 14, background: "var(--soft,#fdfaf3)", color: "var(--ink,#3b3228)", cursor: "pointer" }}><option value="">подкатегория…</option>{subs.filter((sub) => sub !== "еда").map((sub) => <option key={sub}>{sub}</option>)}</select>
        <button onClick={add} style={{ border: "none", background: "var(--ac,#b95c3f)", color: "#fff", borderRadius: "var(--r-2)", padding: "0 18px", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}><i className="fa-solid fa-plus" style={{ fontSize: 12 }} />Добавить</button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: "var(--muted,#8a7d6b)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 7 }}><i className="fa-solid fa-filter" style={{ fontSize: 12 }} />Фильтр</span>
        {(["city", "group", "sub"] as const).map((key) => <select key={key} value={filter[key]} onChange={(e) => setFilter({ ...filter, [key]: e.target.value })} style={{ border: "1px solid var(--line,#e7dcc7)", borderRadius: "var(--r-2)", padding: "8px 11px", fontSize: 13, background: "var(--card,#fff)", color: "var(--ink,#3b3228)", cursor: "pointer" }}><option value="">{key === "city" ? "все города" : key === "group" ? "вся важность" : "все подкатегории"}</option>{(key === "city" ? cities : key === "group" ? ["обязательные", "необязательные"] : subs.filter((sub) => sub !== "еда")).map((value) => <option key={value}>{value}</option>)}</select>)}
        {Object.values(filter).some(Boolean) && <button onClick={() => setFilter({ city: "", group: "", sub: "" })} style={{ border: "none", background: "none", color: "var(--ac,#b95c3f)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "8px 6px" }}><i className="fa-solid fa-xmark" style={{ marginRight: 5, fontSize: 12 }} />Сбросить</button>}
      </div>

      <section style={{ background: "radial-gradient(120% 90% at 0% 0%, rgba(42,112,137,.16), transparent 55%), radial-gradient(120% 90% at 100% 100%, rgba(217,154,78,.16), transparent 55%), var(--track,#efe4cf)", border: "1px solid var(--line,#e7dcc7)", borderRadius: "var(--r-4)", padding: 16, margin: "0 0 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 13 }}>
          <div><div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 600 }}><i className="fa-solid fa-person-walking" style={{ color: "var(--ac,#b95c3f)", fontSize: 18, marginRight: 7 }} />Пеший маршрут</div><div style={{ fontSize: 12.5, color: "var(--muted,#8a7d6b)", marginTop: 3 }}>Нажмите на пункт списка, чтобы показать его на карте. Порядок меняйте стрелками или перетаскиванием маркеров.</div></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={activeCity} onChange={(e) => { setWalkCity(e.target.value); setWalkFocus(null); setRoute(null); setRouteError(""); }} style={{ minWidth: 165, border: "1px solid var(--line,#e7dcc7)", borderRadius: "var(--r-2)", padding: "8px 10px", fontSize: 13, background: "var(--soft,#fdfaf3)", color: "var(--ink,#3b3228)" }}><option value="">город…</option>{cities.map((city) => <option key={city}>{city}</option>)}</select>
            <select value={walkDay} onChange={(e) => { setWalkDay(+e.target.value); setWalkFocus(null); setRoute(null); setRouteError(""); }} style={{ border: "1px solid var(--line,#e7dcc7)", borderRadius: "var(--r-2)", padding: "8px 10px", fontSize: 13, background: "var(--soft,#fdfaf3)", color: "var(--ink,#3b3228)" }}>{[1, 2, 3].map((day) => <option value={day} key={day}>{days[day]}</option>)}</select>
            <button onClick={() => void geocodeMissing()} style={{ border: "1px solid var(--line,#e7dcc7)", background: "var(--soft,#fdfaf3)", color: "var(--ink,#3b3228)", borderRadius: "var(--r-2)", padding: "8px 11px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><i className="fa-solid fa-location-crosshairs" style={{ marginRight: 5 }} />{geocoding ? "Ищу…" : "Найти точки"}</button>
            <button onClick={() => void fetchPhotosMissing()} style={{ border: "1px solid var(--line,#e7dcc7)", background: "var(--soft,#fdfaf3)", color: "var(--ink,#3b3228)", borderRadius: "var(--r-2)", padding: "8px 11px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><i className="fa-solid fa-image" style={{ marginRight: 5 }} />{fetchingPhotos ? "Ищу…" : "Найти фото"}</button>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", margin: "-4px 0 12px" }}><button onClick={async () => { if (!mapUrl) return void toast("Добавьте минимум две точки для маршрута"); try { await navigator.clipboard.writeText(mapUrl); } catch {} showCopied(true, false); }} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "1px solid var(--line,#e7dcc7)", background: "var(--card,#fff)", color: "var(--ink,#3b3228)", borderRadius: "var(--r-2)", padding: "8px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}><i className={copied ? "fa-solid fa-check" : "fa-regular fa-copy"} />{copied ? "Скопировано" : "Копировать маршрут"}</button></div>
        {activeCity ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 380, overflow: "auto" }}>
            {walkAll.map((sight, index) => { const active = walkFocus?.id === sight.id; return <div key={sight.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: `1px solid ${active ? "var(--ac,#b95c3f)" : "var(--line,#e7dcc7)"}`, borderRadius: "var(--r-2)", background: active ? "var(--card,#fff)" : "var(--soft,#fdfaf3)", transition: "border-color .2s, background .2s" }}><div onClick={() => sight.lnglat ? setWalkFocus({ id: sight.id, nonce: Date.now() }) : toast("У места нет точки — нажмите «Найти точки»")} title={sight.lnglat ? "Показать на карте" : "У места нет точки на карте"} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, cursor: "pointer" }}><span style={{ width: 21, height: 21, flex: "none", borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--ac,#b95c3f)", color: "#fff", fontSize: 11, fontWeight: 700 }}>{index + 1}</span><span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, fontWeight: 600, color: sight.lnglat ? undefined : "var(--muted,#8a7d6b)" }}>{sight.name}</span></div><button onClick={() => move(sight.id, -1)} title="Раньше" style={{ border: "none", background: "none", color: "var(--muted,#8a7d6b)", cursor: "pointer", padding: 4 }}><i className="fa-solid fa-chevron-up" /></button><button onClick={() => move(sight.id, 1)} title="Позже" style={{ border: "none", background: "none", color: "var(--muted,#8a7d6b)", cursor: "pointer", padding: 4 }}><i className="fa-solid fa-chevron-down" /></button></div>; })}
            {!located.length && <div style={{ fontSize: 13, color: "var(--muted,#8a7d6b)", padding: "8px 2px" }}>У мест нет координат. Нажмите «Найти точки».</div>}
            {walkAll.some((sight) => !sight.lnglat) && <div style={{ fontSize: 12, color: "var(--muted,#8a7d6b)" }}>Без точки: {walkAll.filter((sight) => !sight.lnglat).length}</div>}
            <div style={{ fontSize: 12, color: "var(--muted,#8a7d6b)", padding: "3px 2px" }}>{routeError || (route ? `Пешком: ${(route.distance / 1000).toFixed(1).replace(".", ",")} км · ${Math.round(route.duration / 60)} мин.` : located.length > 1 ? "Строим пеший маршрут…" : "Добавьте минимум две точки для маршрута.")}</div>
          </div>
          <WalkingMap sights={located} readOnly={isReadOnly} focus={walkFocus} onMove={(id, lnglat) => mutate(id, { lnglat })} onRoute={(next, error) => { setRoute(next); setRouteError(error); }} />
        </div> : <div style={{ fontSize: 13, color: "var(--muted,#8a7d6b)", padding: "6px 0" }}>Добавьте места с указанным городом, чтобы построить маршрут.</div>}
        {walkAll.length > 0 && <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "17px 0 -12px", fontSize: 12, color: "var(--muted,#5f7c7e)" }}><i className="fa-solid fa-circle-info" style={{ color: "var(--ac,#2a7089)" }} />Нажмите на карточку достопримечательности, чтобы прочитать её историю.</div>}
        {walkAll.length > 0 && <div style={{ margin: "20px -16px -16px", padding: "18px 16px 16px", background: "var(--soft,#f1f7f6)", borderTop: "1px solid var(--line,#e7dcc7)" }}><div style={{ display: "flex", alignItems: "baseline", gap: 9, margin: "0 0 13px" }}><h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{walkTitle}</h2><span style={{ fontSize: 12, color: "var(--muted,#8a7d6b)" }}>{walkAll.length} мест</span></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>{walkAll.map((sight, index) => <div key={sight.id} onClick={() => void openInfo(sight)} title="Открыть описание места" style={{ position: "relative", minHeight: 145, borderRadius: "var(--r-2)", overflow: "hidden", background: "var(--card,#fff)", border: "1px solid var(--line,#e7dcc7)", cursor: "pointer" }}>{sight.photo && <img src={sight.photo} alt={sight.name} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .78 }} />}<div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg,rgba(20,35,36,.78),transparent 72%)" }} /><span style={{ position: "absolute", top: 9, left: 9, width: 23, height: 23, borderRadius: "50%", background: "var(--ac,#2a7089)", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>{index + 1}</span><div style={{ position: "absolute", left: 11, right: 11, bottom: 10, color: "#fff", textShadow: "0 1px 5px rgba(0,0,0,.42)" }}><div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 600, lineHeight: 1.05 }}>{sight.name}</div><div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", opacity: .82, marginTop: 4 }}>{subOf(sight)}</div></div></div>)}</div></div>}
      </section>

      {!!data.sights.length && <div style={{ fontSize: 12.5, color: "var(--muted,#a2937c)", margin: "-4px 0 18px", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}><i className="fa-solid fa-up-down-left-right" style={{ fontSize: 11 }} /><span>Перетащите место между разделами или нажмите <i className="fa-solid fa-star" style={{ fontSize: 10, color: "var(--ac,#b95c3f)" }} />, чтобы поменять важность. Значок <i className="fa-solid fa-camera" style={{ fontSize: 11 }} /> — добавить фото.</span></div>}

      {(["обязательные", "необязательные"] as const).map((group) => {
        const items = filtered.filter(
          (sight) => (sight.group || "необязательные") === group,
        );
        if (Object.values(filter).some(Boolean) && !items.length) return null;
        return (
          <section
            style={{ marginBottom: 32, borderRadius: "var(--r-3)" }}
            key={group}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData("text/plain");
              if (id) mutate(id, { group });
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 18px", paddingBottom: 11, borderBottom: "1.5px solid var(--line,#e7dcc7)" }}><i className={group === "обязательные" ? "fa-solid fa-star" : "fa-regular fa-star"} style={{ color: group === "обязательные" ? "var(--ac,#b95c3f)" : "var(--muted,#8a7d6b)", fontSize: 16 }} /><h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 600, fontSize: 25, margin: 0, letterSpacing: ".005em" }}>{group === "обязательные" ? "Обязательные" : "Необязательные"}</h2>{items.length > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted,#8a7d6b)", background: "var(--track,#efe4cf)", borderRadius: "var(--r-pill)", padding: "3px 11px" }}>{items.length} мест</span>}</div>
            {subs.map((sub) => {
              const subset = items.filter((sight) => subOf(sight) === sub);
              if (!subset.length) return null;
              return (
                <div style={{ marginBottom: 22 }} key={sub}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, margin: "0 0 13px" }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: colors[sub], flex: "none" }} /><span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--muted,#8a7d6b)", whiteSpace: "nowrap" }}>{sub}</span><span style={{ flex: 1, height: 1, background: "var(--line,#efe4cf)" }} /><span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted,#b6a892)" }}>{subset.length}</span></div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(238px,1fr))", gap: 11 }}>
                    {subset.map((sight) => (
                      <article
                        draggable={!isReadOnly}
                        onDragStart={(event) =>
                          event.dataTransfer.setData("text/plain", sight.id)
                        }
                        style={{ background: "var(--card,#fff)", border: "1px solid var(--line,#e7dcc7)", borderRadius: "var(--r-3)", overflow: "hidden", cursor: "pointer", transition: "box-shadow .16s ease,transform .16s ease" }}
                        key={sight.id}
                        onClick={(event) => {
                          if (
                            !(event.target as HTMLElement).closest(
                              "button,label,input,select,textarea,a",
                            )
                          )
                            void openInfo(sight);
                        }}
                      >
                        {sight.photo && (
                          <div style={{ position: "relative", height: 132, background: "var(--track,#efe4cf)" }}>
                            <img
                              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                              src={sight.photo}
                              alt={sight.name}
                            />
                            <button
                              style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, border: "none", borderRadius: "50%", background: "rgba(24,18,12,.5)", color: "#fff", cursor: "pointer", fontSize: 13, display: "grid", placeItems: "center" }}
                              title="Убрать фото"
                              onClick={() => void removeSightPhoto(sight)}
                            >
                              ×
                            </button>
                          </div>
                        )}
                        <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 11 }}>
                          <button
                            style={{ width: 22, height: 22, borderRadius: "var(--r-1)", border: `1.5px solid ${sight.done ? "var(--ac,#b95c3f)" : "var(--line,#e7dcc7)"}`, background: sight.done ? "var(--ac,#b95c3f)" : "transparent", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center", flex: "none", fontSize: 12 }}
                            title="Отметить, что сходили"
                            onClick={() =>
                              mutate(sight.id, { done: !sight.done })
                            }
                          >
                            {sight.done ? "✓" : ""}
                          </button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, lineHeight: 1.22, textDecoration: sight.done ? "line-through" : "none", color: sight.done ? "var(--muted,#8a7d6b)" : undefined }}>{sight.name}</div>
                            <div style={{ fontSize: 12, color: "var(--muted,#8a7d6b)", marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}><i className="fa-solid fa-location-dot" style={{ fontSize: 10, opacity: .7 }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sight.city}</span></div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 2, flex: "none" }}><button
                            style={{ border: "none", background: "none", cursor: "pointer", color: group === "обязательные" ? "var(--ac,#b95c3f)" : "#c4b5a0", fontSize: 14, padding: "5px 6px" }}
                            title="Поменять важность"
                            onClick={() =>
                              mutate(sight.id, {
                                group:
                                  group === "обязательные"
                                    ? "необязательные"
                                    : "обязательные",
                              })
                            }
                          >
                            <i className={group === "обязательные" ? "fa-solid fa-star" : "fa-regular fa-star"} />
                          </button>
                          <label
                            style={{ cursor: "pointer", color: "#c4b5a0", fontSize: 14, padding: "5px 6px", display: "grid", placeItems: "center" }}
                            title="Добавить / заменить фото"
                          >
                            <i className="fa-solid fa-camera" />
                            <input
                              hidden
                              type="file"
                              accept="image/*"
                              onChange={(event) =>
                                void upload(sight, event.target.files?.[0])
                              }
                            />
                          </label>
                          <button
                            style={{ border: "none", background: "none", color: "#c4b5a0", cursor: "pointer", fontSize: 17, lineHeight: 1, padding: "3px 5px" }}
                            title="Удалить место"
                            onClick={() => void removeSight(sight)}
                          >
                            ×
                          </button></div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
            {!items.length && (
              <p style={{ fontSize: 13, color: "var(--muted,#a2937c)", padding: "0 0 8px" }}>
                пока ничего не добавлено
              </p>
            )}
          </section>
        );
      })}
      {Object.values(filter).some(Boolean) && !filtered.length && (
        <p style={{ textAlign: "center", color: "var(--muted,#8a7d6b)", fontSize: 14, padding: "26px 0" }}>
          Ничего не найдено — попробуйте изменить фильтр.
        </p>
      )}</div>

      {selected && (
        <SightInfo
          sight={selected}
          text={selected.description || (wiki?.id === selected.id ? wiki.text : "Загружаем описание…")}
          photo={wiki?.id === selected.id ? wiki.photo : undefined}
          onClose={closeInfo}
        />
      )}
    </>
  );
}
