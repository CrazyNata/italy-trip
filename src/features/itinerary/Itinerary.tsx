import { useState } from "react";
import { useTripData } from "../../trip/TripDataContext";
import type { ItineraryItem, TripDay } from "../../types/trip";
import { copyText, uid, useTransientState } from "../shared";

const flag = (name: string) => /праг/i.test(name) ? "🇨🇿" : /зальцбург|австри/i.test(name) ? "🇦🇹" : /мюнхен|германи|фельдкирх/i.test(name) ? "🇩🇪" : "🇮🇹";
export function Itinerary() {
  const { data, updateData, isReadOnly } = useTripData();
  const [drafts, setDrafts] = useState<Record<string, { title: string; time: string }>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const showCopied = useTransientState(setCopied);
  if (!data) return null;
  const guard = (action: () => void) => isReadOnly ? window.dispatchEvent(new CustomEvent("trip:readonly")) : action();
  const updateDay = (id: string, change: (day: TripDay) => TripDay) => guard(() => updateData((current) => ({ ...current, days: current.days.map((day) => day.id === id ? change(day) : day) })));
  const updateItem = (dayId: string, itemId: string, change: Partial<ItineraryItem>) => updateDay(dayId, (day) => ({ ...day, items: day.items.map((item) => item.id === itemId ? { ...item, ...change } : item) }));
  const setMap = (dayId: string, itemId?: string) => {
    const day = data.days.find((entry) => entry.id === dayId); const item = day?.items.find((entry) => entry.id === itemId);
    const url = window.prompt(itemId ? "Ссылка на Google Maps (оставьте пустым, чтобы убрать):" : "Ссылка на Google Maps для маршрута этого дня (оставьте пустым, чтобы убрать):", itemId ? item?.mapUrl || "" : day?.dayMapUrl || "");
    if (url === null) return;
    itemId ? updateItem(dayId, itemId, { mapUrl: url.trim() }) : updateDay(dayId, (entry) => ({ ...entry, dayMapUrl: url.trim() }));
  };
  const add = (dayId: string) => {
    const draft = drafts[dayId]; if (!draft?.title.trim()) return;
    updateDay(dayId, (day) => ({ ...day, items: [...day.items, { id: uid("i"), title: draft.title.trim(), time: draft.time.trim(), done: false }] }));
    setDrafts((current) => ({ ...current, [dayId]: { title: "", time: "" } }));
  };
  return <div style={{ animation: "fadeUp .4s ease both", position: "relative", borderRadius: 20, padding: 20, background: "radial-gradient(120% 90% at 0% 0%, rgba(42,112,137,.16), transparent 55%), radial-gradient(120% 90% at 100% 100%, rgba(217,154,78,.16), transparent 55%), var(--track,#efe4cf)", border: "1px solid var(--line,#e7dcc7)", overflow: "hidden" }}>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: .5, backgroundImage: "radial-gradient(var(--line,#d8c9ac) 1.1px, transparent 1.1px)", backgroundSize: "22px 22px" }} />
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 16 }}>
      {data.days.map((day) => { const done = day.items.filter((item) => item.done).length; const draft = drafts[day.id] || { title: "", time: "" }; const dayMapUrl = day.dayMapUrl?.trim(); return <div key={day.id} style={{ background: "var(--paper,#fbf2df)", border: "1px solid var(--line,#e7dcc7)", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(59,50,40,.05)" }}>
        <div className="day-head" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", background: "var(--paper,#fbf2df)", borderBottom: "1px solid var(--track,#efe4cf)" }}>
          <div style={{ textAlign: "center", minWidth: 52 }}><div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{day.dayNum}</div><div style={{ fontSize: 11, color: "var(--muted,#8a7d6b)", textTransform: "uppercase" }}>{day.month}</div></div>
          <div style={{ flex: 1 }}><div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 16 }}><span style={{ fontSize: 17, lineHeight: 1 }}>{[...new Set(day.city.split("→").map(flag))].join(" ")}</span><span>{day.city}</span></div><div style={{ fontSize: 12, color: "var(--muted,#8a7d6b)" }}>{day.weekday}</div></div>
          <div style={{ fontSize: 12, color: "var(--ol,#7c8450)", fontWeight: 600 }}>{day.items.length ? `${done}/${day.items.length}` : ""}</div>
          {dayMapUrl ? <><a href={dayMapUrl} target="_blank" rel="noopener" title="Открыть маршрут дня на Google Maps" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--ac,#b95c3f)", color: "#fff", borderRadius: 9, padding: "7px 12px", fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}><i className="fa-solid fa-route" />маршрут</a><button onClick={() => void copyText(dayMapUrl).then(() => showCopied(day.id, null))} title="Скопировать ссылку на маршрут" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted,#8a7d6b)", fontSize: 14, padding: 6 }}><i className={copied === day.id ? "fa-solid fa-check" : "fa-solid fa-copy"} /></button><button onClick={() => setMap(day.id)} title="Изменить ссылку" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted,#c4b5a0)", fontSize: 13, padding: 6 }}><i className="fa-solid fa-pencil" /></button></> : <button onClick={() => setMap(day.id)} title="Добавить ссылку на маршрут дня" style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--line,#e7dcc7)", background: "var(--card,#fff)", color: "var(--muted,#8a7d6b)", borderRadius: 9, padding: "7px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}><i className="fa-solid fa-route" />+ карта</button>}
        </div>
        <div style={{ padding: "8px 12px 14px" }}>
          {day.items.map((item) => <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 8px", borderRadius: 10 }}><button onClick={() => updateItem(day.id, item.id, { done: !item.done })} style={{ width: 22, height: 22, flex: "none", border: `1.5px solid ${item.done ? "var(--ol,#7c8450)" : "var(--line,#e7dcc7)"}`, borderRadius: 7, background: item.done ? "var(--ol,#7c8450)" : "transparent", color: "#fff", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0 }}>{item.done ? "✓" : ""}</button><span style={{ flex: 1, fontSize: 15, ...(item.done ? { color: "#a2937c", textDecoration: "line-through" } : {}) }}>{item.title}</span><span style={{ fontSize: 17, fontWeight: 700, color: "var(--ink,#3b3228)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", minWidth: 110, textAlign: "right" }}>{item.time || ""}</span>{item.mapUrl?.trim() && <a href={item.mapUrl.trim()} target="_blank" title="Открыть на карте" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--ac,#b95c3f)", fontSize: 13, fontWeight: 600, padding: "4px 6px", textDecoration: "none", whiteSpace: "nowrap" }}><i className="fa-solid fa-location-dot" />карта</a>}<button onClick={() => updateDay(day.id, (entry) => ({ ...entry, items: entry.items.filter((value) => value.id !== item.id) }))} style={{ border: "none", background: "none", color: "#c4b5a0", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "4px 8px" }}>×</button></div>)}
          <div style={{ display: "flex", gap: 8, padding: "8px 8px 2px", flexWrap: "wrap" }}><input value={draft.title} onChange={(event) => setDrafts((current) => ({ ...current, [day.id]: { ...draft, title: event.target.value } }))} onKeyDown={(event) => event.key === "Enter" && add(day.id)} placeholder="добавить пункт плана…" style={{ flex: 1, minWidth: 200, border: "1px solid var(--line,#e7dcc7)", borderRadius: 9, padding: "9px 12px", fontSize: 14, background: "var(--soft,#fdfaf3)" }} /><input value={draft.time} onChange={(event) => setDrafts((current) => ({ ...current, [day.id]: { ...draft, time: event.target.value } }))} onKeyDown={(event) => event.key === "Enter" && add(day.id)} placeholder="время" style={{ width: 110, border: "1px solid var(--line,#e7dcc7)", borderRadius: 9, padding: "9px 12px", fontSize: 14, background: "var(--soft,#fdfaf3)", textAlign: "right" }} /><button onClick={() => add(day.id)} style={{ border: "none", background: "var(--ac,#b95c3f)", color: "#fff", borderRadius: 9, padding: "0 16px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Добавить</button></div>
        </div>
      </div>; })}
    </div>
  </div>;
}
