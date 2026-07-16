import { useEffect, useMemo, useRef, useState } from "react";

import { Lightbox } from "../../components/Lightbox";
import { useConfirm } from "../../components/ConfirmDialog";
import { supabase } from "../../lib/supabase/client";
import { useTripData } from "../../trip/TripDataContext";
import type { TripPhoto } from "../../types/trip";
import { PanelTitle, uid } from "../shared";
import { exif, scaleToBlob } from "./exif";

type Kind = "lodging" | "sight" | "restaurant" | "upload";

interface Shot {
  url: string;
  place: string;
  kind: Kind;
  /** Заполнено только у загруженных снимков — их можно удалять. */
  photoId?: string;
  path?: string;
}

interface CityAlbum {
  city: string;
  shots: Shot[];
  places: number;
}

const MISC = "Разное";

const KIND_ICON: Record<Kind, string> = {
  lodging: "fa-solid fa-bed",
  sight: "fa-solid fa-monument",
  restaurant: "fa-solid fa-utensils",
  upload: "fa-solid fa-camera",
};

const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function formatDate(iso?: string) {
  if (!iso) return "Моё фото";
  const [, month, day] = iso.split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? ""}`.trim();
}

const readonly = () => window.dispatchEvent(new CustomEvent("trip:readonly"));

// Города в данных записаны по-разному: у дней это «Рим → Флоренция», у мест и
// ресторанов — просто «Рим (центр)». Приводим к чистому названию, чтобы фото
// одного города собирались в одну группу.
function cityName(raw: string) {
  return (raw.split("→").pop() ?? raw).replace(/\(.*?\)/g, "").trim();
}

const plural = (n: number, one: string, few: string, many: string) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
};

// Обратное геокодирование через Nominatim: по координатам снимка узнаём город.
// Запросы ставим в очередь с паузой — у сервиса лимит примерно 1 запрос в секунду.
const wait = (delay: number) => new Promise((resolve) => window.setTimeout(resolve, delay));
let geocodeQueue = Promise.resolve<unknown>(undefined);
let lastGeocode = 0;

function reverseGeocode(lat: number, lng: number, signal: AbortSignal): Promise<string | undefined> {
  const request = geocodeQueue.then(async () => {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    await wait(Math.max(0, 1100 - (Date.now() - lastGeocode)));
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    lastGeocode = Date.now();
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12&accept-language=ru`,
        { signal },
      );
      if (!response.ok) return undefined;
      const json: unknown = await response.json();
      if (!json || typeof json !== "object") return undefined;
      const address = (json as { address?: Record<string, unknown> }).address ?? {};
      const place =
        address.city ??
        address.town ??
        address.village ??
        address.municipality ??
        address.county;
      return typeof place === "string" && place.trim() ? place.trim() : undefined;
    } catch (error) {
      if ((error as Error).name === "AbortError") throw error;
      return undefined;
    }
  });
  geocodeQueue = request.catch(() => undefined);
  return request as Promise<string | undefined>;
}

export function Photos() {
  const { data, isReadOnly, updateData } = useTripData();
  const confirm = useConfirm();
  const input = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [view, setView] = useState<{ shots: Shot[]; index: number } | null>(null);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    abort.current = new AbortController();
    return () => abort.current?.abort();
  }, []);

  const albums = useMemo<CityAlbum[]>(() => {
    if (!data) return [];

    // Порядок городов задаёт сам маршрут — так альбом читается как хронология
    // поездки, а не как случайный список.
    const order = new Map<string, number>();
    const daysByIso = new Map(data.days.map((day) => [day.iso, day]));
    data.days.forEach((day) => {
      const name = cityName(day.city);
      if (name && !order.has(name)) order.set(name, order.size);
    });

    const buckets = new Map<string, Shot[]>();
    const seen = new Set<string>();
    const add = (url: string | undefined, city: string, shot: Omit<Shot, "url">) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      buckets.set(city || MISC, [...(buckets.get(city || MISC) ?? []), { url, ...shot }]);
    };

    data.lodging.forEach((l) =>
      (l.photos ?? []).forEach((url) => add(url, cityName(l.city), { place: l.name, kind: "lodging" })),
    );
    data.sights.forEach((s) => add(s.photo, cityName(s.city), { place: s.name, kind: "sight" }));
    (data.restaurants ?? []).forEach((r) =>
      (r.photos ?? []).forEach((url) => add(url, cityName(r.city), { place: r.name, kind: "restaurant" })),
    );

    // Загруженные снимки раскладываются автоматически: сначала по городу из
    // координат, иначе — по городу из плана на дату съёмки, иначе — в «Разное».
    (data.photos ?? []).forEach((photo) => {
      const dayCity = photo.iso ? daysByIso.get(photo.iso) : undefined;
      const city = photo.place || (dayCity ? cityName(dayCity.city) : "");
      add(photo.url, city, {
        place: formatDate(photo.iso),
        kind: "upload",
        photoId: photo.id,
        path: photo.path,
      });
    });

    const rank = (city: string) => (city === MISC ? 2e9 : order.has(city) ? order.get(city)! : 1e9);
    return [...buckets.entries()]
      .map(([city, shots]) => ({
        city,
        shots,
        places: new Set(shots.filter((s) => s.kind !== "upload").map((s) => s.place)).size,
      }))
      .sort((a, b) => rank(a.city) - rank(b.city) || a.city.localeCompare(b.city, "ru"));
  }, [data]);

  const total = albums.reduce((sum, album) => sum + album.shots.length, 0);

  async function importFiles(fileList: FileList | null) {
    if (isReadOnly) return readonly();
    const files = [...(fileList ?? [])].filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    const signal = abort.current?.signal ?? new AbortController().signal;
    let done = 0;
    let failed = 0;
    for (let index = 0; index < files.length; index += 1) {
      setBusy(`Загружаю ${index + 1} из ${files.length}…`);
      try {
        const file = files[index];
        const meta = exif(await file.arrayBuffer());
        const scaled = await scaleToBlob(file);
        const body = scaled ?? file;
        const id = uid("ph");
        const path = `trip/${id}.jpg`;
        const { error } = await supabase.storage
          .from("place-photos")
          .upload(path, body, { upsert: true, contentType: scaled ? "image/jpeg" : file.type || "image/jpeg" });
        if (error) throw error;
        const url = supabase.storage.from("place-photos").getPublicUrl(path).data.publicUrl;
        let place: string | undefined;
        if (meta.lat != null && meta.lng != null) {
          // Не удалось определить город по координатам — не страшно, фото уйдёт
          // в город по дате съёмки или в «Разное».
          place = await reverseGeocode(meta.lat, meta.lng, signal).catch(() => undefined);
        }
        const photo: TripPhoto = { id, url, path, iso: meta.iso, lat: meta.lat, lng: meta.lng, place };
        updateData((current) => ({ ...current, photos: [...(current.photos ?? []), photo] }));
        done += 1;
      } catch {
        failed += 1;
      }
    }
    setBusy(failed ? `Готово: ${done}. Не удалось: ${failed}.` : "");
    if (!failed) window.setTimeout(() => setBusy(""), 100);
    else window.setTimeout(() => setBusy(""), 3200);
  }

  async function removePhoto(shot: Shot) {
    if (isReadOnly) return readonly();
    if (!shot.photoId || !shot.path) return;
    if (!(await confirm({ title: "Удалить фото?", message: "Снимок будет удалён из альбома безвозвратно.", tone: "danger" })))
      return;
    const { error } = await supabase.storage.from("place-photos").remove([shot.path]);
    if (error) {
      setBusy("Не удалось удалить фото из хранилища.");
      window.setTimeout(() => setBusy(""), 3200);
      return;
    }
    updateData((current) => ({
      ...current,
      photos: (current.photos ?? []).filter((photo) => photo.id !== shot.photoId),
    }));
  }

  let cityNumber = 0;

  return (
    <div style={{ animation: "fadeUp .4s ease both" }}>
      <PanelTitle
        eyebrow="Воспоминания"
        action={
          !isReadOnly && (
            <>
              <input
                ref={input}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(event) => {
                  void importFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                className="photo-add"
                onClick={() => input.current?.click()}
                disabled={Boolean(busy) && busy.startsWith("Загружаю")}
              >
                <i className="fa-solid fa-arrow-up-from-bracket" />
                Загрузить фото
              </button>
            </>
          )
        }
      >
        Альбом поездки
      </PanelTitle>

      {total > 0 && (
        <p className="photo-lead">
          <span>
            <i className="fa-solid fa-images" />
            <b>{total}</b> {plural(total, "снимок", "снимка", "снимков")}
          </span>
          <span>
            <i className="fa-solid fa-location-dot" />
            {albums.length} {plural(albums.length, "город", "города", "городов")}
          </span>
          <span style={{ color: "var(--muted)" }}>
            Загружайте снимки как есть — они сами разложатся по городам маршрута.
          </span>
        </p>
      )}

      {busy && <div className="photo-busy">{busy.startsWith("Загружаю") && <span className="photo-spinner" />}{busy}</div>}

      {total === 0 ? (
        <div className="photo-empty">
          <span className="fa-solid fa-images" />
          <strong>Здесь будет ваш альбом</strong>
          <p>
            Загрузите фото из поездки — по геометкам и датам снимков они сами
            разложатся по городам. Фото из жилья, мест и ресторанов тоже попадут
            сюда автоматически.
          </p>
          {!isReadOnly && (
            <button type="button" className="photo-add" style={{ marginTop: 18 }} onClick={() => input.current?.click()}>
              <i className="fa-solid fa-arrow-up-from-bracket" />
              Загрузить фото
            </button>
          )}
        </div>
      ) : (
        <div className="photo-groups">
          {albums.map((album) => {
            const misc = album.city === MISC;
            const number = misc ? null : (cityNumber += 1);
            return (
              <section key={album.city} className="photo-group">
                <div className="photo-group-content">
                  <header>
                    {albums.length > 1 &&
                      (misc ? (
                        <span className="photo-group-num is-misc">
                          <i className="fa-solid fa-images" aria-hidden="true" />
                        </span>
                      ) : (
                        <span className="photo-group-num">{String(number).padStart(2, "0")}</span>
                      ))}
                    <h2>{album.city}</h2>
                    <small>
                      {album.shots.length} {plural(album.shots.length, "фото", "фото", "фото")}
                      {album.places > 0 && ` · ${album.places} ${plural(album.places, "место", "места", "мест")}`}
                    </small>
                  </header>
                  <div className="photo-grid">
                    {album.shots.map((shot, shotIndex) => (
                      <figure
                        key={shot.url}
                        className={shotIndex === 0 && album.shots.length > 2 ? "is-hero" : undefined}
                      >
                        <button
                          type="button"
                          className="photo-open"
                          onClick={() => setView({ shots: album.shots, index: shotIndex })}
                          aria-label={`Открыть фото: ${shot.place}`}
                        >
                          <img src={shot.url} alt={shot.place} loading="lazy" />
                        </button>
                        {shot.photoId && !isReadOnly && (
                          <button
                            type="button"
                            className="photo-delete"
                            onClick={() => void removePhoto(shot)}
                            aria-label="Удалить фото"
                          >
                            <i className="fa-solid fa-trash-can" />
                          </button>
                        )}
                        <figcaption>
                          <i className={KIND_ICON[shot.kind]} aria-hidden="true" />
                          <span>{shot.place}</span>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {view && (
        <Lightbox
          images={view.shots.map((shot) => shot.url)}
          index={view.index}
          alt={view.shots[view.index]?.place}
          onClose={() => setView(null)}
          onIndex={(next) => setView((current) => (current ? { ...current, index: next } : current))}
        />
      )}
    </div>
  );
}
