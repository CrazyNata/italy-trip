import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth";
import { supabase } from "../../lib/supabase/client";
import { useTripData } from "../../trip/TripDataContext";
import type { Sight } from "../../types/trip";
import { button, field, PanelTitle, subtleButton, uid } from "../shared";

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
  1: "День 1 · Античный Рим",
  2: "День 2 · Центр Рима",
  3: "День 3 · Ватикан и Боргезе",
};
const toast = (message?: string) =>
  window.dispatchEvent(
    new CustomEvent(message ? "trip:toast" : "trip:readonly", {
      detail: message,
    }),
  );
const subOf = (sight: Sight) => sight.subcategory || "разное";

type RouteState = {
  signature: string;
  distance: number;
  duration: number;
} | null;

function WalkingMap({
  sights,
  readOnly,
  onMove,
  onRoute,
}: {
  sights: Sight[];
  readOnly: boolean;
  onMove: (id: string, lnglat: [number, number]) => void;
  onRoute: (route: RouteState, error: string) => void;
}) {
  const { mapboxToken } = useAuth();
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!element.current || !mapboxToken) return;
    let live = true;
    let map: import("mapbox-gl").Map | undefined;
    const markers: import("mapbox-gl").Marker[] = [];
    void import("mapbox-gl").then(({ default: mapbox }) => {
      if (!live || !element.current) return;
      mapbox.accessToken = mapboxToken;
      map = new mapbox.Map({
        container: element.current,
        style: "mapbox://styles/mapbox/outdoors-v12",
        center: sights[0]?.lnglat || [12.5, 41.9],
        zoom: 12,
        cooperativeGestures: true,
        attributionControl: false,
      });
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
          );
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
        } catch {
          if (live) onRoute(null, "Не удалось построить пеший маршрут");
        }
      });
    });
    return () => {
      live = false;
      markers.forEach((marker) => marker.remove());
      map?.remove();
    };
  }, [
    mapboxToken,
    readOnly,
    sights.map((sight) => `${sight.id}:${sight.lnglat?.join(",")}`).join("|"),
  ]);
  return (
    <div
      className="h-[380px] min-h-72 overflow-hidden rounded-xl bg-[var(--track)]"
      ref={element}
    >
      {!mapboxToken && (
        <div className="grid h-full place-items-center text-sm text-[var(--muted)]">
          Карта ещё загружается
        </div>
      )}
    </div>
  );
}

export function Sights() {
  const { data, updateData, isReadOnly } = useTripData();
  const { mapboxToken } = useAuth();
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
  const [walkCity, setWalkCity] = useState("");
  const [walkDay, setWalkDay] = useState(1);
  const [geocoding, setGeocoding] = useState(false);
  const [route, setRoute] = useState<RouteState>(null);
  const [routeError, setRouteError] = useState("");
  const [copied, setCopied] = useState(false);
  if (!data) return null;
  const cities = [
    ...new Set(data.sights.map((sight) => sight.city).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "ru"));
  const activeCity = cities.includes(walkCity) ? walkCity : cities[0] || "";
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
    if (!mapboxToken) return false;
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(`${sight.name}, ${sight.city}`)}.json?limit=1&language=ru&access_token=${encodeURIComponent(mapboxToken)}`,
      );
      const json = (await response.json()) as {
        features?: Array<{ center: [number, number] }>;
      };
      const center = json.features?.[0]?.center;
      if (!center) return false;
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
    if (!mapboxToken) return void toast("Карта ещё загружается");
    setGeocoding(true);
    let found = 0;
    for (const sight of missing) if (await geocodeSight(sight)) found += 1;
    setGeocoding(false);
    toast(
      found
        ? `Найдены точки: ${found} из ${missing.length}`
        : "Точки не найдены. Проверьте названия мест.",
    );
  }
  async function openInfo(sight: Sight) {
    setOpen(sight.id);
    setWiki(null);
    if (sight.description) return;
    try {
      const response = await fetch(
        `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(sight.name)}`,
      );
      if (!response.ok) throw new Error();
      const json = (await response.json()) as {
        extract?: string;
        thumbnail?: { source?: string };
      };
      setWiki({
        id: sight.id,
        text: json.extract || "Описание пока не найдено.",
        photo: json.thumbnail?.source,
      });
    } catch {
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
    updateData((current) => ({
      ...current,
      sights: current.sights.map((item) =>
        item.id === sight.id ? { ...item, photo, photoPath: path } : item,
      ),
    }));
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
      const index = located.findIndex((sight) => sight.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= located.length) return;
      const ids = located.map((sight) => sight.id);
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
      <PanelTitle eyebrow="Идеи для прогулок">Места</PanelTitle>
      <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
        <input
          className={`${field} w-36`}
          placeholder="город"
          value={draft.city}
          onChange={(event) => setDraft({ ...draft, city: event.target.value })}
        />
        <input
          className={`${field} min-w-48 flex-1`}
          placeholder="что посмотреть / куда сходить"
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          onKeyDown={(event) => event.key === "Enter" && add()}
        />
        <select
          className={`${field} w-40`}
          value={draft.group}
          onChange={(event) =>
            setDraft({ ...draft, group: event.target.value })
          }
        >
          <option value="">важность…</option>
          <option>обязательные</option>
          <option>необязательные</option>
        </select>
        <select
          className={`${field} w-44`}
          value={draft.sub}
          onChange={(event) => setDraft({ ...draft, sub: event.target.value })}
        >
          <option value="">подкатегория…</option>
          {subs.map((sub) => (
            <option key={sub}>{sub}</option>
          ))}
        </select>
        <button className={button} onClick={add}>
          + Добавить
        </button>
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-[var(--muted)]">
          Фильтр
        </span>
        {(["city", "group", "sub"] as const).map((key) => (
          <select
            className={`${field} w-auto`}
            key={key}
            value={filter[key]}
            onChange={(event) =>
              setFilter({ ...filter, [key]: event.target.value })
            }
          >
            <option value="">
              {key === "city"
                ? "все города"
                : key === "group"
                  ? "вся важность"
                  : "все подкатегории"}
            </option>
            {(key === "city"
              ? cities
              : key === "group"
                ? ["обязательные", "необязательные"]
                : subs
            ).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        ))}
        {Object.values(filter).some(Boolean) && (
          <button
            className="text-sm font-semibold text-[var(--ac)]"
            onClick={() => setFilter({ city: "", group: "", sub: "" })}
          >
            × Сбросить
          </button>
        )}
      </div>

      <section className="mb-7 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl font-semibold">
              🚶 Пеший маршрут
            </h3>
            <p className="text-xs text-[var(--muted)]">
              Меняйте порядок стрелками или перетаскиванием маркеров.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className={`${field} w-auto`}
              value={activeCity}
              onChange={(event) => {
                setWalkCity(event.target.value);
                setRoute(null);
                setRouteError("");
              }}
            >
              {cities.map((city) => (
                <option key={city}>{city}</option>
              ))}
            </select>
            <select
              className={`${field} w-auto`}
              value={walkDay}
              onChange={(event) => {
                setWalkDay(+event.target.value);
                setRoute(null);
                setRouteError("");
              }}
            >
              {[1, 2, 3].map((day) => (
                <option value={day} key={day}>
                  {days[day]}
                </option>
              ))}
            </select>
            <button
              className={subtleButton}
              onClick={() => void geocodeMissing()}
            >
              {geocoding ? "Ищу…" : "Найти точки"}
            </button>
          </div>
        </div>
        <div className="mb-3 flex justify-end gap-2">
          <button
            className={subtleButton}
            onClick={async () => {
              if (!mapUrl)
                return void toast("Добавьте минимум две точки для маршрута");
              try {
                await navigator.clipboard.writeText(mapUrl);
              } catch {}
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}
          >
            {copied ? "✓ Скопировано" : "⧉ Копировать маршрут"}
          </button>
          {mapUrl && (
            <a
              className={subtleButton}
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
            >
              Открыть ↗
            </a>
          )}
        </div>
        {activeCity ? (
          <div className="grid gap-4 md:grid-cols-[minmax(240px,.8fr)_1.5fr]">
            <div className="max-h-[380px] space-y-2 overflow-auto">
              {located.map((sight, index) => (
                <div
                  className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--soft)] p-2"
                  key={sight.id}
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--ac)] text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {sight.name}
                  </span>
                  <button title="Раньше" onClick={() => move(sight.id, -1)}>
                    ↑
                  </button>
                  <button title="Позже" onClick={() => move(sight.id, 1)}>
                    ↓
                  </button>
                </div>
              ))}
              {!located.length && (
                <p className="text-sm text-[var(--muted)]">
                  У мест нет координат. Нажмите «Найти точки».
                </p>
              )}
              {walkAll.length > located.length && (
                <p className="text-xs text-[var(--muted)]">
                  Без точки: {walkAll.length - located.length}
                </p>
              )}
              <p className="text-xs text-[var(--muted)]">
                {routeError ||
                  (route
                    ? `Пешком: ${(route.distance / 1000).toFixed(1).replace(".", ",")} км · ${Math.round(route.duration / 60)} мин.`
                    : located.length > 1
                      ? "Строим пеший маршрут…"
                      : "Добавьте минимум две точки для маршрута.")}
              </p>
            </div>
            <WalkingMap
              sights={located}
              readOnly={isReadOnly}
              onMove={(id, lnglat) => mutate(id, { lnglat })}
              onRoute={(next, error) => {
                setRoute(next);
                setRouteError(error);
              }}
            />
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Добавьте места с указанным городом, чтобы построить маршрут.
          </p>
        )}
        {walkAll.length > 0 && (
          <div className="-mx-4 -mb-4 mt-5 border-t border-[var(--line)] bg-[var(--soft)] p-4">
            <h3 className="mb-3 font-display text-xl font-semibold">
              {days[walkDay]}{" "}
              <span className="text-xs text-[var(--muted)]">
                {walkAll.length} мест
              </span>
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {walkAll.map((sight, index) => (
                <button
                  className="relative min-h-32 overflow-hidden rounded-xl border border-[var(--line)] text-left"
                  key={sight.id}
                  onClick={() => void openInfo(sight)}
                >
                  {sight.photo && (
                    <img
                      className="absolute inset-0 h-full w-full object-cover opacity-80"
                      src={sight.photo}
                      alt=""
                    />
                  )}
                  <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[var(--ac)] text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-3 pt-8 font-display font-semibold text-white">
                    {sight.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {(["обязательные", "необязательные"] as const).map((group) => {
        const items = filtered.filter(
          (sight) => (sight.group || "необязательные") === group,
        );
        if (Object.values(filter).some(Boolean) && !items.length) return null;
        return (
          <section
            className="mb-7 rounded-xl"
            key={group}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData("text/plain");
              if (id) mutate(id, { group });
            }}
          >
            <h3 className="mb-4 border-b border-[var(--line)] pb-2 font-display text-2xl font-semibold">
              {group === "обязательные" ? "★ Обязательные" : "☆ Необязательные"}{" "}
              <span className="text-xs text-[var(--muted)]">
                {items.length}
              </span>
            </h3>
            {subs.map((sub) => {
              const subset = items.filter((sight) => subOf(sight) === sub);
              if (!subset.length) return null;
              return (
                <div className="mb-5" key={sub}>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                    <span style={{ color: colors[sub] }}>●</span> {sub}
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {subset.map((sight) => (
                      <article
                        draggable={!isReadOnly}
                        onDragStart={(event) =>
                          event.dataTransfer.setData("text/plain", sight.id)
                        }
                        className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)]"
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
                          <div className="relative h-32">
                            <img
                              className="h-full w-full object-cover"
                              src={sight.photo}
                              alt={sight.name}
                            />
                            <button
                              className="absolute right-2 top-2 rounded-full bg-black/60 px-2 text-white"
                              title="Убрать фото"
                              onClick={() =>
                                guard(() => {
                                  updateData((current) => ({
                                    ...current,
                                    sights: current.sights.map((item) =>
                                      item.id === sight.id
                                        ? { ...item, photo: "", photoPath: "" }
                                        : item,
                                    ),
                                  }));
                                  if (sight.photoPath)
                                    void supabase.storage
                                      .from("place-photos")
                                      .remove([sight.photoPath]);
                                })
                              }
                            >
                              ×
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-2 p-3">
                          <button
                            className={`grid h-6 w-6 place-items-center rounded border ${sight.done ? "border-[var(--ac)] bg-[var(--ac)] text-white" : "border-[var(--line)]"}`}
                            title="Отметить, что сходили"
                            onClick={() =>
                              mutate(sight.id, { done: !sight.done })
                            }
                          >
                            {sight.done ? "✓" : ""}
                          </button>
                          <div className="min-w-0 flex-1">
                            <input
                              className="w-full bg-transparent font-display text-lg font-semibold outline-none"
                              value={sight.name}
                              onChange={(event) =>
                                mutate(sight.id, { name: event.target.value })
                              }
                            />
                            <input
                              className="w-full bg-transparent text-xs text-[var(--muted)] outline-none"
                              value={sight.city}
                              onChange={(event) =>
                                mutate(sight.id, { city: event.target.value })
                              }
                            />
                          </div>
                          <button
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
                            {group === "обязательные" ? "★" : "☆"}
                          </button>
                          <label
                            className="cursor-pointer"
                            title="Добавить / заменить фото"
                          >
                            📷
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
                            title="Удалить место"
                            onClick={() =>
                              guard(() =>
                                updateData((current) => ({
                                  ...current,
                                  sights: current.sights.filter(
                                    (item) => item.id !== sight.id,
                                  ),
                                })),
                              )
                            }
                          >
                            ×
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                          <select
                            className={field}
                            value={sight.subcategory}
                            onChange={(event) =>
                              mutate(sight.id, {
                                subcategory: event.target.value,
                              })
                            }
                          >
                            {subs.map((sub) => (
                              <option key={sub}>{sub}</option>
                            ))}
                          </select>
                          <select
                            className={field}
                            value={sight.walkDay || ""}
                            onChange={(event) =>
                              mutate(sight.id, {
                                walkDay: event.target.value
                                  ? +event.target.value
                                  : undefined,
                              })
                            }
                          >
                            <option value="">все дни</option>
                            <option value="1">день 1</option>
                            <option value="2">день 2</option>
                            <option value="3">день 3</option>
                          </select>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
            {!items.length && (
              <p className="text-sm text-[var(--muted)]">
                пока ничего не добавлено
              </p>
            )}
          </section>
        );
      })}
      {Object.values(filter).some(Boolean) && !filtered.length && (
        <p className="py-8 text-center text-[var(--muted)]">
          Ничего не найдено — попробуйте изменить фильтр.
        </p>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-[10000] grid place-items-center bg-black/70 p-5"
          role="dialog"
          aria-modal="true"
          onClick={(event) =>
            event.currentTarget === event.target && setOpen(null)
          }
        >
          <div className="relative max-h-[calc(100vh-40px)] w-full max-w-xl overflow-auto rounded-2xl bg-[var(--card)]">
            {(selected.photo || wiki?.photo) && (
              <img
                className="h-56 w-full object-cover"
                src={selected.photo || wiki?.photo}
                alt={selected.name}
              />
            )}
            <button
              className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-2xl text-white"
              title="Закрыть"
              onClick={() => setOpen(null)}
            >
              ×
            </button>
            <div className="p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--ac)]">
                {subOf(selected)} · {selected.city}
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold">
                {selected.name}
              </h2>
              <textarea
                className={`${field} mt-4 min-h-32 resize-y leading-relaxed`}
                value={
                  selected.description || wiki?.text || "Загружаем описание…"
                }
                onChange={(event) =>
                  mutate(selected.id, { description: event.target.value })
                }
              />
              <a
                className={`${subtleButton} mt-4 inline-block`}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selected.name}, ${selected.city}`)}`}
                target="_blank"
                rel="noreferrer"
              >
                Открыть на карте ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
