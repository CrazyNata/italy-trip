import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

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
  city: string;
  iso?: string;
  /** Заполнено только у загруженных снимков — их можно удалять. */
  photoId?: string;
  path?: string;
}

interface DaySection {
  key: string;
  iso?: string;
  shots: Shot[];
}

interface CityAlbum {
  city: string;
  sections: DaySection[];
  count: number;
  places: number;
}

const MISC = "Разное";
const NO_DATE = "__none__";

const KIND_ICON: Record<Kind, string> = {
  lodging: "fa-solid fa-bed",
  sight: "fa-solid fa-monument",
  restaurant: "fa-solid fa-utensils",
  upload: "fa-solid fa-camera",
};

const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

// Короткая подпись на плитке загруженного снимка.
function shortDate(iso?: string) {
  if (!iso) return "Моё фото";
  const [, month, day] = iso.split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? ""}`.trim();
}

// Подзаголовок дня внутри города: «14 июля» + день недели.
function dayLabel(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { date: iso, weekday: "" };
  return {
    date: date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }),
    weekday: date.toLocaleDateString("ru-RU", { weekday: "long" }),
  };
}

// Чип фильтра: «14 июл.».
function chipLabel(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
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
  const [dateFilter, setDateFilter] = useState<string | null>(null);

  useEffect(() => {
    abort.current = new AbortController();
    return () => abort.current?.abort();
  }, []);

  const { albums, dates, hasUndated, anyPhotos } = useMemo(() => {
    if (!data) return { albums: [] as CityAlbum[], dates: [] as string[], hasUndated: false, anyPhotos: 0 };

    // Порядок городов задаёт сам маршрут — так альбом читается как хронология
    // поездки, а не как случайный список.
    const order = new Map<string, number>();
    const daysByIso = new Map(data.days.map((day) => [day.iso, day]));
    data.days.forEach((day) => {
      const name = cityName(day.city);
      if (name && !order.has(name)) order.set(name, order.size);
    });

    const shots: Shot[] = [];
    const seen = new Set<string>();
    const add = (url: string | undefined, city: string, shot: Omit<Shot, "url" | "city">) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      shots.push({ url, city: city || MISC, ...shot });
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
        place: shortDate(photo.iso),
        kind: "upload",
        iso: photo.iso,
        photoId: photo.id,
        path: photo.path,
      });
    });

    const dates = [...new Set(shots.map((s) => s.iso).filter((iso): iso is string => Boolean(iso)))].sort();
    const hasUndated = shots.some((s) => !s.iso);

    const visible = shots.filter((s) =>
      dateFilter === null ? true : dateFilter === NO_DATE ? !s.iso : s.iso === dateFilter,
    );

    const buckets = new Map<string, Shot[]>();
    visible.forEach((s) => buckets.set(s.city, [...(buckets.get(s.city) ?? []), s]));

    const rank = (city: string) => (city === MISC ? 2e9 : order.has(city) ? order.get(city)! : 1e9);
    const albums: CityAlbum[] = [...buckets.entries()]
      .map(([city, cityShots]) => {
        // Город бьём на дни только если в нём есть датированные снимки —
        // иначе показываем единой сеткой, без пустой шапки дня.
        const dated = cityShots.some((s) => s.iso);
        let sections: DaySection[];
        if (!dated) {
          sections = [{ key: "all", shots: cityShots }];
        } else {
          const byDay = new Map<string, Shot[]>();
          const undated: Shot[] = [];
          cityShots.forEach((s) => {
            if (s.iso) byDay.set(s.iso, [...(byDay.get(s.iso) ?? []), s]);
            else undated.push(s);
          });
          sections = [...byDay.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([iso, list]) => ({ key: iso, iso, shots: list }));
          if (undated.length) sections.push({ key: NO_DATE, shots: undated });
        }
        return {
          city,
          sections,
          count: cityShots.length,
          places: new Set(cityShots.filter((s) => s.kind !== "upload").map((s) => s.place)).size,
        };
      })
      .sort((a, b) => rank(a.city) - rank(b.city) || a.city.localeCompare(b.city, "ru"));

    return { albums, dates, hasUndated, anyPhotos: shots.length };
  }, [data, dateFilter]);

  const total = albums.reduce((sum, album) => sum + album.count, 0);

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
    window.setTimeout(() => setBusy(""), failed ? 3200 : 100);
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

  const uploadButton = (extra?: CSSProperties) => (
    <button type="button" className="photo-add" style={extra} onClick={() => input.current?.click()}>
      <i className="fa-solid fa-arrow-up-from-bracket" />
      Загрузить фото
    </button>
  );

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
                disabled={busy.startsWith("Загружаю")}
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

      {anyPhotos > 0 && (
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
            Загружайте снимки как есть — они сами разложатся по городам и дням.
          </span>
        </p>
      )}

      {dates.length > 0 && (
        <div className="photo-filter">
          <button className={dateFilter === null ? "is-active" : ""} onClick={() => setDateFilter(null)}>
            Все
          </button>
          {dates.map((iso) => (
            <button
              key={iso}
              className={dateFilter === iso ? "is-active" : ""}
              onClick={() => setDateFilter(iso)}
            >
              <i className="fa-solid fa-calendar-day" />
              {chipLabel(iso)}
            </button>
          ))}
          {hasUndated && (
            <button
              className={dateFilter === NO_DATE ? "is-active" : ""}
              onClick={() => setDateFilter(NO_DATE)}
            >
              Без даты
            </button>
          )}
        </div>
      )}

      {busy && (
        <div className="photo-busy">
          {busy.startsWith("Загружаю") && <span className="photo-spinner" />}
          {busy}
        </div>
      )}

      {anyPhotos === 0 ? (
        <div className="photo-empty">
          <span className="fa-solid fa-images" />
          <strong>Здесь будет ваш альбом</strong>
          <p>
            Загрузите фото из поездки — по геометкам и датам снимков они сами
            разложатся по городам и дням. Фото из жилья, мест и ресторанов тоже
            попадут сюда автоматически.
          </p>
          {!isReadOnly && uploadButton({ marginTop: 18 })}
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
                      {album.count} {plural(album.count, "фото", "фото", "фото")}
                      {album.places > 0 && ` · ${album.places} ${plural(album.places, "место", "места", "мест")}`}
                    </small>
                  </header>
                  {album.sections.map((section) => {
                    const label = section.iso ? dayLabel(section.iso) : null;
                    return (
                      <div key={section.key}>
                        {section.iso ? (
                          <div className="photo-day">
                            <i className="fa-solid fa-calendar-day" aria-hidden="true" />
                            <h3>{label!.date}</h3>
                            <span className="photo-day-wd">{label!.weekday}</span>
                            <small>
                              {section.shots.length} {plural(section.shots.length, "фото", "фото", "фото")}
                            </small>
                          </div>
                        ) : section.key === NO_DATE ? (
                          <div className="photo-day">
                            <i className="fa-solid fa-images" aria-hidden="true" />
                            <h3>Без даты</h3>
                            <small>
                              {section.shots.length} {plural(section.shots.length, "фото", "фото", "фото")}
                            </small>
                          </div>
                        ) : null}
                        <div className="photo-grid">
                          {section.shots.map((shot, shotIndex) => (
                            <figure
                              key={shot.url}
                              className={shotIndex === 0 && section.shots.length > 2 ? "is-hero" : undefined}
                            >
                              <button
                                type="button"
                                className="photo-open"
                                onClick={() => setView({ shots: section.shots, index: shotIndex })}
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
                    );
                  })}
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
