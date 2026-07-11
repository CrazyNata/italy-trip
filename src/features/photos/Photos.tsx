import { useEffect, useRef, useState } from "react";

import { useTripData } from "../../trip/TripDataContext";
import { button, useDialogKeyboard } from "../shared";
import { all, closePhotoStore, del, exif, openPhotoStore, put, scale, type Photo } from "./store";
import { deleteTripPhoto, loadTripPhotos, uploadTripPhoto } from "../../trip/normalizedRepository";

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

async function reverseGeocode(photo: Photo, signal: AbortSignal) {
  if (photo.lat == null || photo.lng == null) return null;
  const request = geocodeQueue.then(async () => {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    await wait(Math.max(0, 1100 - (Date.now() - lastGeocodeRequest)));
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    lastGeocodeRequest = Date.now();
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${photo.lat}&lon=${photo.lng}&zoom=12&accept-language=ru`, { signal });
      if (!response.ok) return null;
      const json: unknown = await response.json();
      if (!json || typeof json !== "object") return null;
      const record = json as Record<string, unknown>;
      const address = record.address && typeof record.address === "object" ? record.address as Record<string, unknown> : {};
      const place = address.city ?? address.town ?? address.village ?? address.municipality ?? address.county ?? record.name;
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
  const { data, isReadOnly, selectedTrip } = useTripData();
  const tripId = selectedTrip?.id ?? "legacy";
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState("");
  const [report, setReport] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [remoteRevision,setRemoteRevision]=useState(0);
  const closeButton = useRef<HTMLButtonElement>(null);
  const lifecycle = useRef<{ active: boolean; session: number; controller: AbortController } | null>(null);

  useEffect(()=>{const refresh=(event:Event)=>{if(event instanceof CustomEvent&&event.detail===selectedTrip?.id)setRemoteRevision((value)=>value+1);};window.addEventListener("trip:photos-changed",refresh);return()=>window.removeEventListener("trip:photos-changed",refresh);},[selectedTrip?.id]);
  useEffect(() => {
    const state = { active: true, session: openPhotoStore(), controller: new AbortController() };
    lifecycle.current = state;
    void all(state.session, tripId).then(async (stored) => {
      if (!state.active) return;
      let available=stored;
      if(selectedTrip){try{const remote=await loadTripPhotos(selectedTrip.id);available=remote.filter((photo)=>photo.thumb);for(const photo of available)await put(state.session,photo);}catch{setReport("Не удалось обновить фото из Supabase. Показана локальная копия.");}}
      if (!state.active) return;
      setPhotos(available);
      const pending = available.filter((photo) => photo.lat != null && photo.lng != null && !photo.place);
      for (const photo of pending) {
        if (!state.active) break;
        const place = await reverseGeocode(photo, state.controller.signal);
        if (place) {
          const resolved = { ...photo, place };
          try {
            if (!state.active) break;
            await put(state.session, resolved);
            if (state.active) setPhotos((current) => current.map((item) => item.id === photo.id ? resolved : item));
          } catch {
            // The photo remains available even if enriching the persisted record fails.
          }
        }
      }
    }).catch((error) => state.active && (error as Error).name !== "AbortError" && setReport("Не удалось загрузить сохранённые фото."));
    return () => {
      state.active = false;
      state.controller.abort();
      closePhotoStore(state.session);
      if (lifecycle.current === state) lifecycle.current = null;
    };
  }, [tripId,remoteRevision]);

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
            tripId,
            thumb,
            iso: metadata.iso ?? new Date(file.lastModified).toISOString().slice(0, 10),
            lat: metadata.lat ?? null,
            lng: metadata.lng ?? null,
            place: null,
          };
          if (photo.lat != null && photo.lng != null) {
            const place = await reverseGeocode(photo, state.controller.signal);
            if (place) photo = { ...photo, place };
          }
          if(selectedTrip){const remoteId=await uploadTripPhoto(selectedTrip.id,file,{iso:photo.iso,lat:photo.lat,lng:photo.lng,place:photo.place});photo={...photo,id:remoteId};}
          if (!state.active) return;
          await put(state.session, photo);
          if (!state.active) return;
          setPhotos((current) => [...current, photo]);
          succeeded += 1;
        } catch (error) {
          if (!state.active || (error as Error).name === "AbortError") return;
          failed += 1;
        } finally {
          if (state.active) setBusy(`Обработка ${index + 1} из ${files.length}…`);
        }
      }
    } finally {
      if (!state.active) return;
      setBusy("");
      setReport(failed
        ? `Загружено: ${succeeded}. Не удалось обработать: ${failed}.`
        : `Загружено фото: ${succeeded}.`);
    }
  }

  async function remove(id: string) {
    const state = lifecycle.current;
    if (!state?.active) return;
    try {
      if(selectedTrip)await deleteTripPhoto(selectedTrip.id,id);
      await del(state.session, id);
      if (!state.active) return;
      setPhotos((current) => current.filter((photo) => photo.id !== id));
      setReport("Фото удалено.");
    } catch {
      if (state.active) setReport("Не удалось удалить фото.");
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
