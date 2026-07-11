import { useEffect, useRef, useState } from "react";

import { useTripData } from "../../trip/TripDataContext";
import {
  all,
  closePhotoStore,
  del,
  exif,
  openPhotoStore,
  put,
  scale,
  type Photo,
} from "./store";

const MONTHS = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];
const wait = (delay: number) =>
  new Promise((resolve) => window.setTimeout(resolve, delay));
let geocodeQueue = Promise.resolve<unknown>(undefined);
let lastGeocodeRequest = 0;

function formatDate(iso: string | null) {
  if (!iso) return "";
  const parts = iso.split("-");
  return `${parts[2]} ${MONTHS[Number(parts[1]) - 1] ?? ""}`;
}

function destination(city: string) {
  return (city.split("→").pop() ?? city).replace(/\(.*?\)/g, "").trim();
}

async function reverseGeocode(photo: Photo, signal: AbortSignal) {
  if (photo.lat == null || photo.lng == null) return null;
  const request = geocodeQueue.then(async () => {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    await wait(Math.max(0, 1100 - (Date.now() - lastGeocodeRequest)));
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    lastGeocodeRequest = Date.now();
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${photo.lat}&lon=${photo.lng}&zoom=12&accept-language=ru`,
        { signal },
      );
      if (!response.ok) return null;
      const json: unknown = await response.json();
      if (!json || typeof json !== "object") return null;
      const record = json as Record<string, unknown>;
      const address =
        record.address && typeof record.address === "object"
          ? (record.address as Record<string, unknown>)
          : {};
      const place =
        address.city ??
        address.town ??
        address.village ??
        address.municipality ??
        address.county ??
        record.name;
      return typeof place === "string" && place.trim() ? place : null;
    } catch (error) {
      if ((error as Error).name === "AbortError") throw error;
      return null;
    }
  });
  geocodeQueue = request.catch(() => undefined);
  return request;
}

export function Photos() {
  const { data, isReadOnly } = useTripData();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState("");
  const [, setReport] = useState("");
  const lifecycle = useRef<{
    active: boolean;
    session: number;
    controller: AbortController;
  } | null>(null);

  useEffect(() => {
    const state = {
      active: true,
      session: openPhotoStore(),
      controller: new AbortController(),
    };
    lifecycle.current = state;
    void all(state.session)
      .then(async (stored) => {
        if (!state.active) return;
        setPhotos(stored);
        const pending = stored.filter((photo) =>
          photo.lat != null && photo.lng != null && !photo.place,
        );
        for (const photo of pending) {
          if (!state.active) break;
          const place = await reverseGeocode(photo, state.controller.signal);
          if (place) {
            const resolved = { ...photo, place };
            try {
              if (!state.active) break;
              await put(state.session, resolved);
              if (state.active)
                setPhotos((current) =>
                  current.map((item) =>
                    item.id === photo.id ? resolved : item,
                  ),
                );
            } catch {
              // The photo remains available even if enriching the stored record fails.
            }
          }
        }
      })
      .catch(
        (error) =>
          state.active &&
          (error as Error).name !== "AbortError" &&
          setReport("Не удалось загрузить сохранённые фото."),
      );
    return () => {
      state.active = false;
      state.controller.abort();
      closePhotoStore(state.session);
      if (lifecycle.current === state) lifecycle.current = null;
    };
  }, []);

  const guard = (action: () => void) =>
    isReadOnly
      ? window.dispatchEvent(new CustomEvent("trip:readonly"))
      : action();

  async function importFiles(fileList: FileList | null) {
    const files = [...(fileList ?? [])].filter((file) =>
      file.type.startsWith("image/"),
    );
    if (!files.length) return;
    const state = lifecycle.current;
    if (!state?.active) return;
    let succeeded = 0;
    let failed = 0;
    setReport("");
    setBusy(`Обработка 0 из ${files.length}…`);
    try {
      for (let index = 0; index < files.length; index += 1) {
        if (!state.active) return;
        try {
          const file = files[index];
          const metadata = exif(await file.arrayBuffer());
          const thumb = await scale(file);
          if (!thumb) throw new Error("Image decoding failed");
          let photo: Photo = {
            id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
            thumb,
            iso:
              metadata.iso ??
              new Date(file.lastModified).toISOString().slice(0, 10),
            lat: metadata.lat ?? null,
            lng: metadata.lng ?? null,
            place: null,
          };
          if (photo.lat != null && photo.lng != null) {
            const place = await reverseGeocode(photo, state.controller.signal);
            if (place) photo = { ...photo, place };
          }
          if (!state.active) return;
          await put(state.session, photo);
          if (!state.active) return;
          setPhotos((current) => [...current, photo]);
          succeeded += 1;
        } catch (error) {
          if (!state.active || (error as Error).name === "AbortError") return;
          failed += 1;
        } finally {
          if (state.active)
            setBusy(`Обработка ${index + 1} из ${files.length}…`);
        }
      }
    } finally {
      if (!state.active) return;
      setBusy("");
      setReport(
        failed
          ? `Загружено: ${succeeded}. Не удалось обработать: ${failed}.`
          : `Загружено фото: ${succeeded}.`,
      );
    }
  }

  async function remove(id: string) {
    const state = lifecycle.current;
    if (!state?.active) return;
    try {
      await del(state.session, id);
      if (!state.active) return;
      setPhotos((current) => current.filter((photo) => photo.id !== id));
      setReport("Фото удалено.");
    } catch {
      if (state.active) setReport("Не удалось удалить фото.");
    }
  }

  const daysByIso = new Map(data?.days.map((day) => [day.iso, day]) ?? []);
  const groups = new Map<
    string,
    { title: string; icon: string; minIso: string; photos: Photo[] }
  >();
  for (const photo of photos) {
    const day = photo.iso ? daysByIso.get(photo.iso) : undefined;
    const descriptor = photo.place
      ? { key: `place:${photo.place}`, title: photo.place, icon: "fa-solid fa-location-dot" }
      : day
        ? {
            key: `day:${destination(day.city)}`,
            title: destination(day.city),
             icon: "fa-solid fa-calendar-day",
          }
        : photo.iso
          ? {
              key: `date:${photo.iso}`,
              title: formatDate(photo.iso),
               icon: "fa-solid fa-calendar-day",
            }
           : { key: "none", title: "Без геоданных", icon: "fa-solid fa-images" };
    if (!groups.has(descriptor.key))
      groups.set(descriptor.key, {
        title: descriptor.title,
        icon: descriptor.icon,
        minIso: photo.iso ?? "9999",
        photos: [],
      });
    const group = groups.get(descriptor.key)!;
    group.photos.push(photo);
    if (photo.iso && photo.iso < group.minIso) group.minIso = photo.iso;
  }
  const orderedGroups = [...groups.values()].sort((a, b) =>
    a.minIso.localeCompare(b.minIso),
  );

  return <div style={{ animation: "fadeUp .4s ease both" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 18 }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted,#8a7d6b)", maxWidth: 600 }}>
          Загрузите снимки — я прочитаю в каждом GPS и дату съёмки и сам разложу
          их по местам. Где координат нет, разложу по дню маршрута. Фото
          уменьшаются и хранятся в этом браузере.
        </p>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--ac,#b95c3f)", color: "#fff", borderRadius: 10, padding: "11px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          <i className="fa-solid fa-arrow-up-from-bracket" />Загрузить фото
          <input
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }} onChange={(event) => {
              const input = event.currentTarget;
              guard(() => void importFiles(input.files));
              input.value = "";
            }}
          />
        </label>
      </div>
      {busy && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--paper,#fbf2df)", border: "1px solid var(--line,#e7dcc7)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 14, color: "var(--muted,#8a7d6b)" }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ color: "var(--ac,#b95c3f)" }} />{busy}
        </div>
      )}
      {!photos.length && (
        <div style={{ border: "2px dashed #d8c9ac", borderRadius: 18, padding: "56px 24px", textAlign: "center", color: "#a2937c" }}>
          <i className="fa-solid fa-images" style={{ fontSize: 34, color: "var(--ac,#b95c3f)", opacity: .7 }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 14, color: "var(--ink,#3b3228)" }}>Пока нет фото</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>
             Нажмите «Загрузить фото» — снимки сами разложатся по местам и датам.
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {orderedGroups.map((group) => (
          <div key={`${group.title}:${group.minIso}`} style={{ position: "relative", borderRadius: 20, padding: 20, background: "radial-gradient(120% 90% at 0% 0%, rgba(42,112,137,.16), transparent 55%), radial-gradient(120% 90% at 100% 100%, rgba(217,154,78,.16), transparent 55%), var(--track,#efe4cf)", border: "1px solid var(--line,#e7dcc7)", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: .5, backgroundImage: "radial-gradient(var(--line,#d8c9ac) 1.1px, transparent 1.1px)", backgroundSize: "22px 22px" }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}><i className={group.icon} style={{ color: "var(--ac,#b95c3f)", fontSize: 15, alignSelf: "center" }} /><span style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 600, color: "var(--ink,#3b3228)" }}>{group.title}</span><span style={{ fontSize: 12, color: "var(--muted,#8a7d6b)" }}>{group.photos.length} фото</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
                {group.photos.map((photo) => (
                  <div key={photo.id} style={{ position: "relative", aspectRatio: "1/1", borderRadius: 13, overflow: "hidden", border: "1px solid var(--line,#e7dcc7)", background: "var(--paper,#fbf2df)" }}><img src={photo.thumb} alt="фото" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /><button onClick={() => guard(() => void remove(photo.id))} title="Удалить фото" style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, border: "none", borderRadius: 8, background: "rgba(24,18,12,.55)", color: "#fff", cursor: "pointer", fontSize: 12, display: "grid", placeItems: "center" }}><i className="fa-solid fa-xmark" /></button>{photo.iso && <span style={{ position: "absolute", left: 6, bottom: 6, background: "rgba(24,18,12,.6)", color: "#fff", fontSize: 11, padding: "3px 7px", borderRadius: 7 }}>{formatDate(photo.iso)}</span>}</div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>;
}
