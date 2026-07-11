import { useEffect, useRef, useState } from "react";

import { useTripData } from "../../trip/TripDataContext";
import { button, useDialogKeyboard } from "../shared";
import { all, closePhotoStore, del, exif, put, scale, type Photo } from "./store";

const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const wait = (delay: number) => new Promise((resolve) => window.setTimeout(resolve, delay));
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

async function reverseGeocode(photo: Photo) {
  if (photo.lat == null || photo.lng == null) return null;
  const request = geocodeQueue.then(async () => {
    await wait(Math.max(0, 1100 - (Date.now() - lastGeocodeRequest)));
    lastGeocodeRequest = Date.now();
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${photo.lat}&lon=${photo.lng}&zoom=12&accept-language=ru`);
      if (!response.ok) return null;
      const json: unknown = await response.json();
      if (!json || typeof json !== "object") return null;
      const record = json as Record<string, unknown>;
      const address = record.address && typeof record.address === "object" ? record.address as Record<string, unknown> : {};
      const place = address.city ?? address.town ?? address.village ?? address.municipality ?? address.county ?? record.name;
      return typeof place === "string" && place.trim() ? place : null;
    } catch {
      return null;
    }
  });
  geocodeQueue = request;
  return request;
}

export function Photos() {
  const { data, isReadOnly } = useTripData();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState("");
  const [report, setReport] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    void all().then(async (stored) => {
      if (!active) return;
      setPhotos(stored);
      const pending = stored.filter((photo) => photo.lat != null && photo.lng != null && !photo.place);
      for (const photo of pending) {
        if (!active) break;
        const place = await reverseGeocode(photo);
        if (place) {
          const resolved = { ...photo, place };
          try {
            await put(resolved);
            if (active) setPhotos((current) => current.map((item) => item.id === photo.id ? resolved : item));
          } catch {
            // The photo remains available even if enriching the persisted record fails.
          }
        }
      }
    }).catch(() => active && setReport("Не удалось загрузить сохранённые фото."));
    return () => {
      active = false;
      closePhotoStore();
    };
  }, []);

  const sorted = [...photos].sort((a, b) => (a.iso ?? "9999").localeCompare(b.iso ?? "9999"));
  const openIndex = openId ? sorted.findIndex((photo) => photo.id === openId) : -1;
  const openPhoto = openIndex >= 0 ? sorted[openIndex] : null;

  useEffect(() => {
    if (openId && !openPhoto) setOpenId(null);
  }, [openId, openPhoto]);

  const shift = (offset: number) => {
    if (openIndex < 0 || !sorted.length) return;
    setOpenId(sorted[(openIndex + offset + sorted.length) % sorted.length].id);
  };
  useDialogKeyboard({
    open: Boolean(openPhoto),
    onClose: () => setOpenId(null),
    onPrevious: () => shift(-1),
    onNext: () => shift(1),
    initialFocus: closeButton,
  });

  const guard = (action: () => void) => isReadOnly
    ? window.dispatchEvent(new CustomEvent("trip:readonly"))
    : action();

  async function importFiles(fileList: FileList | null) {
    const files = [...(fileList ?? [])].filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    let succeeded = 0;
    let failed = 0;
    setReport("");
    setBusy(`Обработка 0 из ${files.length}…`);
    try {
      for (let index = 0; index < files.length; index += 1) {
        try {
          const file = files[index];
          const metadata = exif(await file.arrayBuffer());
          const thumb = await scale(file);
          if (!thumb) throw new Error("Image decoding failed");
          let photo: Photo = {
            id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
            thumb,
            iso: metadata.iso ?? null,
            lat: metadata.lat ?? null,
            lng: metadata.lng ?? null,
            place: null,
          };
          if (photo.lat != null && photo.lng != null) {
            const place = await reverseGeocode(photo);
            if (place) photo = { ...photo, place };
          }
          await put(photo);
          setPhotos((current) => [...current, photo]);
          succeeded += 1;
        } catch {
          failed += 1;
        } finally {
          setBusy(`Обработка ${index + 1} из ${files.length}…`);
        }
      }
    } finally {
      setBusy("");
      setReport(failed
        ? `Загружено: ${succeeded}. Не удалось обработать: ${failed}.`
        : `Загружено фото: ${succeeded}.`);
    }
  }

  async function remove(id: string) {
    try {
      await del(id);
      setPhotos((current) => current.filter((photo) => photo.id !== id));
      setReport("Фото удалено.");
    } catch {
      setReport("Не удалось удалить фото.");
    }
  }

  const daysByIso = new Map(data?.days.map((day) => [day.iso, day]) ?? []);
  const groups = new Map<string, { title: string; icon: string; minIso: string; photos: Photo[] }>();
  for (const photo of photos) {
    const day = photo.iso ? daysByIso.get(photo.iso) : undefined;
    const descriptor = photo.place
      ? { key: `place:${photo.place}`, title: photo.place, icon: "●" }
      : day
        ? { key: `day:${destination(day.city)}`, title: destination(day.city), icon: "▣" }
        : photo.iso
          ? { key: `date:${photo.iso}`, title: formatDate(photo.iso), icon: "▣" }
          : { key: "none", title: "Без геоданных", icon: "□" };
    if (!groups.has(descriptor.key)) groups.set(descriptor.key, { title: descriptor.title, icon: descriptor.icon, minIso: photo.iso ?? "9999", photos: [] });
    const group = groups.get(descriptor.key)!;
    group.photos.push(photo);
    if (photo.iso && photo.iso < group.minIso) group.minIso = photo.iso;
  }
  const orderedGroups = [...groups.values()].sort((a, b) => a.minIso.localeCompare(b.minIso));

  return <>
    <div className="photo-intro">
      <p>Загрузите снимки — я прочитаю в каждом GPS и дату съёмки и сам разложу их по местам. Где координат нет, разложу по дню маршрута. Фото уменьшаются и хранятся в этом браузере.</p>
      <label className={`${button} inline-flex items-center gap-2 whitespace-nowrap`}>↑ Загрузить фото<input hidden type="file" accept="image/*" multiple onChange={(event) => { const input = event.currentTarget; guard(() => void importFiles(input.files)); input.value = ""; }} /></label>
    </div>
    {busy && <div className="photo-status" role="status">◌ {busy}</div>}
    {report && <p className="photo-report" role="status">{report}</p>}
    {!busy && !photos.length && <div className="photo-empty"><span>▧</span><strong>Пока нет фото</strong><p>Нажмите «Загрузить фото» — снимки сами разложатся по местам и датам.</p></div>}
    <div className="photo-groups">
      {orderedGroups.map((group) => <section className="photo-group" key={`${group.title}:${group.minIso}`}>
        <div className="photo-group-content">
          <header><span aria-hidden="true">{group.icon}</span><h2>{group.title}</h2><small>{group.photos.length} фото</small></header>
          <div className="photo-grid">
            {group.photos.map((photo) => <figure key={photo.id}>
              <button className="photo-open" onClick={() => setOpenId(photo.id)} aria-label={`Открыть фото${photo.iso ? ` от ${formatDate(photo.iso)}` : ""}`}><img src={photo.thumb} alt="фото" loading="lazy" /></button>
              <button className="photo-delete" onClick={() => guard(() => void remove(photo.id))} title="Удалить фото" aria-label="Удалить фото">×</button>
              {photo.iso && <figcaption>{formatDate(photo.iso)}</figcaption>}
            </figure>)}
          </div>
        </div>
      </section>)}
    </div>
    {openPhoto && <div className="lightbox" role="dialog" aria-modal="true" aria-label="Просмотр фото" onMouseDown={(event) => event.target === event.currentTarget && setOpenId(null)}>
      <img src={openPhoto.thumb} alt="фото" />
      <button ref={closeButton} className="lightbox-close" onClick={() => setOpenId(null)} aria-label="Закрыть">×</button>
      {sorted.length > 1 && <><button className="lightbox-prev" onClick={() => shift(-1)} aria-label="Предыдущее фото">‹</button><button className="lightbox-next" onClick={() => shift(1)} aria-label="Следующее фото">›</button></>}
    </div>}
  </>;
}
