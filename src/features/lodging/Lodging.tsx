import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTripData } from "../../trip/TripDataContext";
import { supabase } from "../../lib/supabase/client";
import type { Lodging as LodgingRecord } from "../../types/trip";
import { Lightbox } from "../../components/Lightbox";
import { useConfirm } from "../../components/ConfirmDialog";
import { uid, useTransientState } from "../shared";

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

type Tone = "none" | "past" | "today" | "soon" | "free";

function deadline(lodge: LodgingRecord) {
  if (!lodge.freeCancel)
    return {
      order: Infinity,
      label: "не указана",
      status: "дата не указана",
      background: "#efe4cf",
      color: "#8a7d6b",
      icon: "fa-regular fa-calendar",
      days: null as number | null,
      tone: "none" as Tone,
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
      background: "#f0ddd4",
      color: "#b95c3f",
      icon: "fa-solid fa-lock",
      days,
      tone: "past" as Tone,
    };
  if (days === 0)
    return {
      order: days,
      label,
      status: "сегодня последний день",
      background: "#f6ead0",
      color: "#c8892f",
      icon: "fa-solid fa-triangle-exclamation",
      days,
      tone: "today" as Tone,
    };
  if (days <= 7)
    return {
      order: days,
      label,
      status: `осталось ${days} дн. — скоро платно`,
      background: "#f6ead0",
      color: "#c8892f",
      icon: "fa-solid fa-clock",
      days,
      tone: "soon" as Tone,
    };
  return {
    order: days,
    label,
    status: `бесплатно ещё ${days} дн.`,
    background: "#e6ead2",
    color: "#6f7a45",
    icon: "fa-solid fa-circle-check",
    days,
    tone: "free" as Tone,
  };
}

export function Lodging({ cancellation = false }: { cancellation?: boolean }) {
  const { data, updateData, isReadOnly } = useTripData();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [photo, setPhoto] = useState<Record<string, number>>({});
  const [lightbox, setLightbox] = useState<{
    id: string;
    index: number;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const showCopied = useTransientState(setCopied);

  // When arriving from the «Отмена» tab (?focus=<id>) scroll to that lodging
  // card and flash it red, then drop the param so a refresh doesn't re-flash.
  useEffect(() => {
    if (cancellation || !focusId) return;
    const card = document.getElementById(`lodge-card-${focusId}`);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("lodge-highlight");
    const timer = window.setTimeout(() => card.classList.remove("lodge-highlight"), 1600);
    setSearchParams(
      (params) => {
        params.delete("focus");
        return params;
      },
      { replace: true },
    );
    return () => window.clearTimeout(timer);
  }, [cancellation, focusId, setSearchParams]);

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
  const removeLodging = async (lodge: LodgingRecord) => {
    if (isReadOnly) return readonly();
    if (
      !(await confirm({
        title: "Удалить жильё?",
        message: (
          <>
            «{lodge.name}» ({lodge.city}) будет удалено безвозвратно вместе со всеми
            загруженными фото. Это действие нельзя отменить.
          </>
        ),
      }))
    )
      return;
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
    const badges: Record<Tone, string> = { free: "бесплатная отмена", soon: "скоро платно", today: "последний день", past: "уже платно", none: "дата не указана" };
    const counts = { free: 0, soon: 0, past: 0 };
    for (const { deadline: item } of list) {
      if (item.tone === "free") counts.free++;
      else if (item.tone === "soon" || item.tone === "today") counts.soon++;
      else if (item.tone === "past") counts.past++;
    }
    const summary: Array<{ label: string; value: number; color: string }> = [
      { label: "бесплатно ещё", value: counts.free, color: "#6f7a45" },
      { label: "скоро платно", value: counts.soon, color: "#c8892f" },
      { label: "уже платно", value: counts.past, color: "#b95c3f" },
    ];
    return (
      <div style={{ animation: "fadeUp .4s ease both" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, margin: "0 0 16px" }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted,#8a7d6b)", maxWidth: 560 }}>Сроки бесплатной отмены по каждому жилью — по возрастанию срочности.</p>
          <button onClick={() => setSort(sort === "asc" ? "desc" : "asc")} style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid var(--line,#e7dcc7)", background: "var(--card,#fff)", color: "var(--ink)", borderRadius: "var(--r-2)", padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            <i className={sort === "desc" ? "fa-solid fa-arrow-down-wide-short" : "fa-solid fa-arrow-up-wide-short"}></i>Сначала {sort === "asc" ? "ближние" : "дальние"}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 18 }}>
          {summary.map((stat) => (
            <div key={stat.label} style={{ background: "var(--card,#fff)", border: "1px solid var(--line,#e7dcc7)", borderRadius: "var(--r-3)", padding: "14px 18px" }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 600, fontSize: 26, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 6 }}>
                <span style={{ width: 8, height: 8, flex: "none", borderRadius: "50%", background: stat.color }} />
                <span style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted,#8a7d6b)", fontWeight: 700 }}>{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map(({ lodge, deadline: item }) => {
            const isNumber = item.days !== null && item.days > 0;
            const big = item.days === null ? "—" : item.tone === "past" ? "платно" : item.days === 0 ? "сегодня" : String(item.days);
            return (
            <div
              key={lodge.id}
              className="cancel-row"
              title="Открыть во вкладке «Жильё»"
              onClick={() => navigate(`/lodging?focus=${lodge.id}`)}
              style={{ background: "var(--card,#fff)", border: "1px solid var(--line,#e7dcc7)", borderRadius: "var(--r-3)", padding: "15px 18px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 15, cursor: "pointer", transition: "border-color .2s, background .2s" }}
            >
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 600, fontSize: 19, display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 15, lineHeight: 1 }}>{flag(lodge.city)}</span>{lodge.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted,#8a7d6b)", marginTop: 3 }}>{lodge.city} · {lodge.dates}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 8 }}>
                  <span style={{ width: 7, height: 7, flex: "none", borderRadius: "50%", background: item.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted,#8a7d6b)" }}>{badges[item.tone]}</span>
                </div>
              </div>
              <div style={{ textAlign: "right", minWidth: 96 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 4 }}>
                  <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 600, fontSize: isNumber ? 30 : 19, lineHeight: 1, color: "var(--ink,#3b3228)" }}>{big}</span>
                  {isNumber && <span style={{ fontSize: 13, color: "var(--muted,#8a7d6b)" }}>дн.</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted,#8a7d6b)", marginTop: 5 }}>до {item.label}</div>
              </div>
              <i className="fa-solid fa-chevron-right cancel-chevron" style={{ fontSize: 13, color: "var(--muted,#8a7d6b)", flex: "none", opacity: .45 }}></i>
            </div>
            );
          })}
        </div>
      </div>
    );
  }

  const active =
    lightbox && data.lodging.find((lodge) => lodge.id === lightbox.id);
  return (
    <>
      <div className="lodging-grid" style={{ animation: "fadeUp .4s ease both", position: "relative", borderRadius: "var(--r-5)", padding: 20, background: "radial-gradient(120% 90% at 0% 0%, rgba(42,112,137,.16), transparent 55%), radial-gradient(120% 90% at 100% 100%, rgba(217,154,78,.16), transparent 55%), var(--track,#efe4cf)", border: "1px solid var(--line,#e7dcc7)", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: .5, backgroundImage: "radial-gradient(var(--line,#d8c9ac) 1.1px, transparent 1.1px)", backgroundSize: "22px 22px" }}></div>
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 18 }}>
        {data.lodging.map((lodge) => {
          const index = (photo[lodge.id] || 0) % (lodge.photos?.length || 1);
          const photos = lodge.photos || [];
          const statusColors: Record<string, [string, string]> = { хочу: ["#efe4cf", "#8a7d6b"], бронь: ["#e6ead2", "#6f7a45"], оплачено: ["#f0ddd4", "#b95c3f"] };
          const [, statusColor] = statusColors[lodge.status] || statusColors.хочу;
          return (
            <article
              id={`lodge-card-${lodge.id}`}
              key={lodge.id}
              style={{ background: "var(--paper,#fbf2df)", border: "1px solid var(--line,#e7dcc7)", borderRadius: "var(--r-4)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 1px 3px rgba(59,50,40,.05)", scrollMarginTop: 20, transition: "box-shadow .3s,border-color .3s" }}
            >
              {photos.length ? (
                <div style={{ position: "relative", height: 230, overflow: "hidden" }}>
                  <img
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: lodge.objPosList?.[index] || lodge.objPos || "center", display: "block", cursor: "zoom-in" }}
                    src={photos[index]}
                    alt="фото жилья"
                    onClick={() => setLightbox({ id: lodge.id, index })}
                  />
                  <span style={{ position: "absolute", top: 12, left: 12, background: statusColor, color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: "var(--r-2)", letterSpacing: ".04em" }}>{lodge.status}</span>
                  {photos.length > 1 && (
                    <>
                      <button
                        title="Назад"
                        onClick={() => shift(lodge, -1)}
                        style={{ position: "absolute", top: "50%", left: 10, transform: "translateY(-50%)", width: 34, height: 34, border: "none", borderRadius: "50%", background: "rgba(24,18,12,.5)", color: "#fff", cursor: "pointer", fontSize: 14, display: "grid", placeItems: "center" }}
                      >
                        <i className="fa-solid fa-chevron-left"></i>
                      </button>
                      <button
                        title="Вперёд"
                        onClick={() => shift(lodge, 1)}
                        style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", width: 34, height: 34, border: "none", borderRadius: "50%", background: "rgba(24,18,12,.5)", color: "#fff", cursor: "pointer", fontSize: 14, display: "grid", placeItems: "center" }}
                      >
                        <i className="fa-solid fa-chevron-right"></i>
                      </button>
                      <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
                        {photos.map((_, dot) => (
                          <span
                            key={dot}
                            style={{ width: 7, height: 7, borderRadius: "50%", background: dot === index ? "#fff" : "rgba(255,255,255,.5)", boxShadow: "0 0 2px rgba(0,0,0,.4)" }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="slot-wrap" style={{ position: "relative", height: 230 }}>
                  <div style={{ width: "100%", height: 230, display: "grid", placeItems: "center", background: "var(--track,#efe4cf)", color: "var(--muted,#8a7d6b)", fontSize: 13 }}>фото жилья</div>
                  <span style={{ position: "absolute", top: 12, left: 12, background: statusColor, color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: "var(--r-2)", letterSpacing: ".04em" }}>{lodge.status}</span>
                </div>
              )}
              <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ac,#b95c3f)", fontWeight: 600 }}><span style={{ fontSize: 15, lineHeight: 1 }}>{flag(lodge.city)}</span>{lodge.city}</div>
                <input
                  value={lodge.name}
                  onChange={(event) =>
                    edit(lodge.id, "name", event.target.value)
                  }
                  style={{ fontFamily: "'Playfair Display',serif", fontSize: 23, fontWeight: 600, border: "none", background: "none", width: "100%", padding: "2px 0", color: "var(--ink,#3b3228)" }}
                />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted,#8a7d6b)" }}><span>{lodge.dates}</span><span style={{ fontWeight: 600, color: "var(--ink,#3b3228)" }}>{lodge.price}</span></div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {statuses.map((status) => (
                    <button
                      key={status}
                      onClick={() => edit(lodge.id, "status", status)}
                      style={{ border: `1px solid ${lodge.status === status ? "var(--ac,#b95c3f)" : "var(--line,#e7dcc7)"}`, background: lodge.status === status ? "var(--ac,#b95c3f)" : "var(--card,#fff)", color: lodge.status === status ? "#fff" : "var(--muted,#8a7d6b)", fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: "var(--r-2)", cursor: "pointer" }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                <input
                  placeholder="заметка / удобства…"
                  value={lodge.notes}
                  onChange={(event) =>
                    edit(lodge.id, "notes", event.target.value)
                  }
                  style={{ border: "1px solid var(--line,#e7dcc7)", borderRadius: "var(--r-2)", padding: "8px 11px", fontSize: 13, background: "var(--soft,#fdfaf3)", marginTop: 2 }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: "auto" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <a
                      href={lodge.link || undefined}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      Ссылка на Букинг →
                    </a>
                    <button
                      title="Скопировать ссылку"
                      onClick={() => void copy(lodge)}
                      style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted,#8a7d6b)", fontSize: 13, padding: "2px 4px", flex: "none" }}
                    >
                      <i className={copied === lodge.id ? "fa-solid fa-check" : "fa-solid fa-copy"}></i>
                    </button>
                  </div>
                  <button
                    onClick={() => void removeLodging(lodge)}
                    style={{ border: "none", background: "none", color: "#c4b5a0", cursor: "pointer", fontSize: 13, flex: "none" }}
                  >
                    удалить
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        <button
          style={{ border: "2px dashed #d8c9ac", background: "none", borderRadius: "var(--r-4)", minHeight: 220, color: "#a2937c", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "grid", placeItems: "center" }}
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
      </div>
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
