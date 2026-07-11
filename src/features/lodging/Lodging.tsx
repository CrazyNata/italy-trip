import { useRef, useState } from "react";
import { useTripData } from "../../trip/TripDataContext";
import { supabase } from "../../lib/supabase/client";
import type { Lodging as LodgingRecord } from "../../types/trip";
import { button, field, PanelTitle, subtleButton, uid, useDialogKeyboard, useTransientState } from "../shared";

const statuses = ["хочу", "бронь", "оплачено"];
const flag = (city: string) =>
  /зальцбург|австри/i.test(city)
    ? "🇦🇹"
    : /мюнхен|германи/i.test(city)
      ? "🇩🇪"
      : /праг/i.test(city)
        ? "🇨🇿"
        : "🇮🇹";
const readonly = () => window.dispatchEvent(new CustomEvent("trip:readonly"));
const toast = (message: string) => window.dispatchEvent(new CustomEvent("trip:toast", { detail: message }));
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

function deadline(lodge: LodgingRecord) {
  if (!lodge.freeCancel)
    return {
      order: Infinity,
      label: "— не указана",
      status: "дата не указана",
      tone: "bg-[var(--track)] text-[var(--muted)]",
    };
  const days = Math.round(
    (new Date(`${lodge.freeCancel}T00:00:00`).getTime() -
      new Date().setHours(0, 0, 0, 0)) /
      86400000,
  );
  const label = new Date(`${lodge.freeCancel}T00:00:00`).toLocaleDateString(
    "ru-RU",
    { day: "numeric", month: "long", year: "numeric" },
  );
  if (days < 0)
    return {
      order: days,
      label,
      status: "отмена уже платная",
      tone: "bg-[#f0ddd4] text-[#b95c3f]",
    };
  if (days === 0)
    return {
      order: days,
      label,
      status: "сегодня последний день",
      tone: "bg-[#f6ead0] text-[#c8892f]",
    };
  if (days <= 7)
    return {
      order: days,
      label,
      status: `осталось ${days} дн. — скоро платно`,
      tone: "bg-[#f6ead0] text-[#c8892f]",
    };
  return {
    order: days,
    label,
    status: `бесплатно ещё ${days} дн.`,
    tone: "bg-[#e6ead2] text-[#6f7a45]",
  };
}

export function Lodging({ cancellation = false }: { cancellation?: boolean }) {
  const { data, updateData, isReadOnly } = useTripData();
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [photo, setPhoto] = useState<Record<string, number>>({});
  const [lightbox, setLightbox] = useState<{
    id: string;
    index: number;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const showCopied = useTransientState(setCopied);
  const closeButton = useRef<HTMLButtonElement>(null);
  useDialogKeyboard({
    open: !!lightbox,
    onClose: () => setLightbox(null),
    onPrevious: () => setLightbox((current) => {
      if (!current) return null;
      const count = data?.lodging.find((lodge) => lodge.id === current.id)?.photos?.length || 1;
      return { ...current, index: (current.index - 1 + count) % count };
    }),
    onNext: () => setLightbox((current) => {
      if (!current) return null;
      const count = data?.lodging.find((lodge) => lodge.id === current.id)?.photos?.length || 1;
      return { ...current, index: (current.index + 1) % count };
    }),
    initialFocus: closeButton,
  });
  if (!data) return null;

  const guard = (action: () => void) => (isReadOnly ? readonly() : action());
  const edit = (id: string, key: keyof LodgingRecord, value: LodgingRecord[keyof LodgingRecord]) =>
    guard(() =>
      updateData((current) => ({
        ...current,
        lodging: current.lodging.map((lodge) =>
          lodge.id === id ? { ...lodge, [key]: value } : lodge,
        ),
      })),
    );
  const shift = (lodge: LodgingRecord, amount: number) =>
    setPhoto((current) => ({
      ...current,
      [lodge.id]:
        ((current[lodge.id] || 0) + amount + (lodge.photos?.length || 1)) %
        (lodge.photos?.length || 1),
    }));
  const shiftLightbox = (amount: number) =>
    setLightbox((current) => {
      if (!current) return null;
      const count =
        data.lodging.find((lodge) => lodge.id === current.id)?.photos?.length ||
        1;
      return { ...current, index: (current.index + amount + count) % count };
    });
  const copy = async (lodge: LodgingRecord) => {
    if (!lodge.link)
      return window.alert("Для этого жилья ссылка ещё не добавлена.");
    try {
      await navigator.clipboard.writeText(lodge.link);
    } catch {
      /* Opening the link remains available. */
    }
    showCopied(lodge.id, null);
  };
  const changeGallery = (lodge: LodgingRecord, from: number, to: number) => guard(() => {
    if (to < 0 || to >= (lodge.photos?.length || 0)) return;
    const photos = [...(lodge.photos || [])];
    const positions = photos.map((_, i) => lodge.objPosList?.[i] || lodge.objPos || "center");
    [photos[from], photos[to]] = [photos[to], photos[from]];
    [positions[from], positions[to]] = [positions[to], positions[from]];
    edit(lodge.id, "photos", photos); edit(lodge.id, "objPosList", positions);
    setPhoto((current) => ({ ...current, [lodge.id]: to }));
  });
  const removePhoto = async (lodge: LodgingRecord, index: number) => {
    if (isReadOnly) return readonly();
    const url = data?.lodging.find((item) => item.id === lodge.id)?.photos?.[index];
    const path = url ? storagePath(url) : "";
    if (path) {
      const { error } = await supabase.storage.from("place-photos").remove([path]);
      if (error) return toast("Не удалось удалить фото из хранилища");
    }
    let photoCount = 0;
    updateData((current) => ({ ...current, lodging: current.lodging.map((item) => {
      if (item.id !== lodge.id) return item;
      const currentIndex = (item.photos || []).indexOf(url || "");
      if (currentIndex < 0) return item;
      const photos = (item.photos || []).filter((_, i) => i !== currentIndex);
      const objPosList = (item.photos || []).map((_, i) => item.objPosList?.[i] || item.objPos || "center").filter((_, i) => i !== currentIndex);
      photoCount = photos.length;
      return { ...item, photos, objPosList };
    }) }));
    setPhoto((current) => ({ ...current, [lodge.id]: Math.min(current[lodge.id] || 0, Math.max(0, photoCount - 1)) }));
  };
  const uploadPhoto = async (lodge: LodgingRecord, file?: File) => {
    if (!file) return;
    if (isReadOnly) return readonly();
    toast("Загружаю фото…");
    const extension = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "") || "jpg";
    const path = `lodging/${lodge.id}_${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("place-photos").upload(path, file, { contentType: file.type || "image/jpeg" });
    if (error) return toast("Не удалось загрузить фото");
    const url = supabase.storage.from("place-photos").getPublicUrl(path).data.publicUrl;
    let appendedAt = -1;
    updateData((current) => ({ ...current, lodging: current.lodging.map((item) => {
      if (item.id !== lodge.id) return item;
      const photos = item.photos || [];
      appendedAt = photos.length;
      return { ...item, photos: [...photos, url], objPosList: [...photos.map((_, i) => item.objPosList?.[i] || item.objPos || "center"), "center"] };
    }) }));
    if (appendedAt < 0) {
      await supabase.storage.from("place-photos").remove([path]);
      return;
    }
    setPhoto((current) => ({ ...current, [lodge.id]: appendedAt }));
    toast("Фото добавлено");
  };
  const removeLodging = async (lodge: LodgingRecord) => {
    if (isReadOnly) return readonly();
    const current = data?.lodging.find((item) => item.id === lodge.id);
    if (!current) return;
    const paths = [...new Set((current.photos || []).map(storagePath).filter(Boolean))];
    if (paths.length) {
      const { error } = await supabase.storage.from("place-photos").remove(paths);
      if (error) return toast("Не удалось удалить фото жилья из хранилища");
    }
    const deletedPaths = new Set(paths);
    let changed = false;
    updateData((payload) => ({ ...payload, lodging: payload.lodging.filter((item) => {
      if (item.id !== lodge.id) return true;
      if ((item.photos || []).some((url) => { const path = storagePath(url); return path && !deletedPaths.has(path); })) {
        changed = true;
        return true;
      }
      return false;
    }) }));
    if (changed) toast("Галерея изменилась во время удаления. Повторите попытку.");
  };

  if (cancellation) {
    const list = data.lodging
      .map((lodge) => ({ lodge, deadline: deadline(lodge) }))
      .sort((a, b) => {
        if (!Number.isFinite(a.deadline.order))
          return Number.isFinite(b.deadline.order) ? 1 : 0;
        if (!Number.isFinite(b.deadline.order)) return -1;
        return (
          (a.deadline.order - b.deadline.order) * (sort === "asc" ? 1 : -1)
        );
      });
    return (
      <>
        <PanelTitle eyebrow="Не пропустить срок">Бесплатная отмена</PanelTitle>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm text-[var(--muted)]">
            Сроки бесплатной отмены по каждому жилью. Дату можно менять здесь.
          </p>
          <button
            className={subtleButton}
            onClick={() => setSort(sort === "asc" ? "desc" : "asc")}
          >
            Сначала {sort === "asc" ? "ближние" : "дальние"}
          </button>
        </div>
        <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--track)] p-4">
          {list.map(({ lodge, deadline: item }) => (
            <article
              className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4"
              key={lodge.id}
            >
              <div className="min-w-48 flex-1">
                <h3 className="font-display text-xl font-semibold">
                  {flag(lodge.city)} {lodge.name}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {lodge.city} · {lodge.dates}
                </p>
              </div>
              <div className="min-w-40 text-right">
                <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                  бесплатно до
                </p>
                <p className="font-display text-lg font-semibold">
                  {item.label}
                </p>
                <span
                  className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-bold ${item.tone}`}
                >
                  {item.status}
                </span>
              </div>
              <input
                aria-label={`Дата отмены ${lodge.name}`}
                className={`${field} w-auto`}
                type="date"
                value={lodge.freeCancel || ""}
                onChange={(event) =>
                  edit(lodge.id, "freeCancel", event.target.value)
                }
              />
              <button className={subtleButton} onClick={() => window.dispatchEvent(new CustomEvent("trip:open-lodging", { detail: lodge.id }))}>
                К жилью →
              </button>
            </article>
          ))}
        </div>
      </>
    );
  }

  const active =
    lightbox && data.lodging.find((lodge) => lodge.id === lightbox.id);
  return (
    <>
      <PanelTitle eyebrow="Где мы остановимся">Жильё</PanelTitle>
      <div className="lodging-grid grid gap-5 rounded-2xl border border-[var(--line)] bg-[var(--track)] p-4 md:grid-cols-2">
        {data.lodging.map((lodge) => {
          const index = (photo[lodge.id] || 0) % (lodge.photos?.length || 1);
          const photos = lodge.photos || [];
          return (
            <article
              id={`lodge-card-${lodge.id}`}
              className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)]"
              key={lodge.id}
            >
              {photos.length ? (
                <div className="relative h-56 overflow-hidden">
                  <img
                    className="h-full w-full cursor-zoom-in object-cover"
                    style={{
                      objectPosition:
                        lodge.objPosList?.[index] || lodge.objPos || "center",
                    }}
                    src={photos[index]}
                    alt={lodge.name}
                    onClick={() => setLightbox({ id: lodge.id, index })}
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-[var(--ac)] px-3 py-1 text-xs font-bold text-white">
                    {lodge.status}
                  </span>
                  {photos.length > 1 && (
                    <>
                      <button
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 px-3 py-2 text-white"
                        title="Назад"
                        onClick={() => shift(lodge, -1)}
                      >
                        ‹
                      </button>
                      <button
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 px-3 py-2 text-white"
                        title="Вперёд"
                        onClick={() => shift(lodge, 1)}
                      >
                        ›
                      </button>
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                        {photos.map((_, dot) => (
                          <span
                            className={`h-2 w-2 rounded-full ${dot === index ? "bg-white" : "bg-white/50"}`}
                            key={dot}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid h-56 place-items-center bg-[var(--track)] text-sm text-[var(--muted)]">
                  фото жилья
                </div>
              )}
              <div className="space-y-3 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--ac)]">
                  {flag(lodge.city)} {lodge.city}
                </p>
                <input
                  className={`${field} font-display text-xl font-bold`}
                  value={lodge.name}
                  onChange={(event) =>
                    edit(lodge.id, "name", event.target.value)
                  }
                />
                <div className="grid grid-cols-[1fr_7rem] gap-2">
                  <input
                    className={field}
                    value={lodge.dates}
                    onChange={(event) =>
                      edit(lodge.id, "dates", event.target.value)
                    }
                  />
                  <input
                    className={field}
                    value={lodge.price}
                    onChange={(event) =>
                      edit(lodge.id, "price", event.target.value)
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {statuses.map((status) => (
                    <button
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${lodge.status === status ? "border-[var(--ac)] bg-[var(--ac)] text-white" : "border-[var(--line)]"}`}
                      key={status}
                      onClick={() => edit(lodge.id, "status", status)}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--soft)] p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-xs uppercase tracking-wider text-[var(--muted)]">Галерея · {photos.length}</strong>
                    <label className={`${subtleButton} cursor-pointer`}>
                      + Фото<input hidden type="file" accept="image/*" onChange={(event) => void uploadPhoto(lodge, event.target.files?.[0])}/>
                    </label>
                  </div>
                  {photos.length > 0 && <div className="grid grid-cols-[64px_1fr] gap-3">
                    <img className="h-16 w-16 rounded-lg object-cover" style={{objectPosition:lodge.objPosList?.[index] || lodge.objPos || "center"}} src={photos[index]} alt=""/>
                    <div className="space-y-2">
                      <input className={field} aria-label="Положение фото" placeholder="center или center 40%" value={lodge.objPosList?.[index] || lodge.objPos || "center"} onChange={(event) => { const positions=photos.map((_,i)=>lodge.objPosList?.[i]||lodge.objPos||"center"); positions[index]=event.target.value; edit(lodge.id,"objPosList",positions); }}/>
                      <div className="flex gap-3 text-sm"><button disabled={index===0} onClick={()=>changeGallery(lodge,index,index-1)}>← раньше</button><button disabled={index===photos.length-1} onClick={()=>changeGallery(lodge,index,index+1)}>позже →</button><button className="ml-auto text-[var(--muted)]" onClick={()=>void removePhoto(lodge,index)}>убрать</button></div>
                    </div>
                  </div>}
                </div>
                <textarea
                  className={`${field} min-h-20 resize-y`}
                  placeholder="заметка / удобства…"
                  value={lodge.notes}
                  onChange={(event) =>
                    edit(lodge.id, "notes", event.target.value)
                  }
                />
                <input
                  className={field}
                  placeholder="Ссылка на Букинг"
                  value={lodge.link}
                  onChange={(event) =>
                    edit(lodge.id, "link", event.target.value)
                  }
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-3 text-sm font-semibold">
                    <a
                      className="text-[var(--ac)]"
                      href={lodge.link || undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ссылка на Букинг →
                    </a>
                    <button
                      title="Скопировать ссылку"
                      onClick={() => void copy(lodge)}
                    >
                      {copied === lodge.id ? "✓" : "⧉"}
                    </button>
                  </div>
                  <button
                    className="text-sm text-[var(--muted)]"
                    onClick={() => void removeLodging(lodge)}
                  >
                    удалить
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        <button
          className="min-h-52 rounded-2xl border-2 border-dashed border-[var(--line)] text-sm font-semibold text-[var(--muted)] hover:border-[var(--ac)]"
          onClick={() =>
            guard(() =>
              updateData((current) => {
                const id = uid("l");
                return {
                  ...current,
                  lodging: [
                    ...current.lodging,
                    {
                      id,
                      slot: `lodge_${id}`,
                      city: "Новый город",
                      name: "Название жилья",
                      dates: "даты",
                      price: "€",
                      status: "хочу",
                      link: "",
                      notes: "",
                    },
                  ],
                };
              }),
            )
          }
        >
          + добавить вариант жилья
        </button>
      </div>
      {active?.photos && lightbox && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-8"
          role="dialog"
          aria-modal="true"
          onClick={(event) =>
            event.currentTarget === event.target && setLightbox(null)
          }
        >
          <img
            className="max-h-full max-w-full object-contain"
            src={active.photos[lightbox.index]}
            alt={active.name}
          />
          <button
            ref={closeButton}
            className="absolute right-6 top-5 text-4xl text-white"
            title="Закрыть"
            onClick={() => setLightbox(null)}
          >
            ×
          </button>
          {active.photos.length > 1 && (
            <>
              <button
                className="absolute left-5 top-1/2 text-5xl text-white"
                title="Назад"
                onClick={() => shiftLightbox(-1)}
              >
                ‹
              </button>
              <button
                className="absolute right-5 top-1/2 text-5xl text-white"
                title="Вперёд"
                onClick={() => shiftLightbox(1)}
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
