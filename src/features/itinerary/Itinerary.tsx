import { useState } from "react";
import { useTripData } from "../../trip/TripDataContext";
import type { ItineraryItem, TripDay } from "../../types/trip";
import { button, copyText, field, PanelTitle, subtleButton, uid, useTransientState } from "../shared";

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
  const routeTotal = data.days.reduce((sum, day) => sum + day.items.length, 0);
  const routeDone = data.days.reduce((sum, day) => sum + day.items.filter((item) => item.done).length, 0);
  return <>
    <PanelTitle eyebrow="18 дней в дороге" action={<div className="text-right"><b className="font-mono text-2xl text-[var(--ol)]">{routeDone}/{routeTotal}</b><p className="text-xs text-[var(--muted)]">пунктов выполнено</p></div>}>Маршрут по дням</PanelTitle>
    <div className="route-board">{data.days.map((day) => { const done = day.items.filter((item) => item.done).length; const draft = drafts[day.id] || { title: "", time: "" }; return <article className="day-card" key={day.id}>
      <header className="day-card-head"><div className="day-date"><b>{day.dayNum}</b><span>{day.month}</span></div><div className="min-w-0 flex-1"><input className="w-full bg-transparent font-semibold outline-none" value={day.city} onChange={(event) => updateDay(day.id, (entry) => ({ ...entry, city: event.target.value }))} /><p className="text-xs text-[var(--muted)]">{[...new Set(day.city.split("→").map(flag))].join(" ")} · {day.weekday}</p></div><b className="text-xs text-[var(--ol)]">{day.items.length ? `${done}/${day.items.length}` : ""}</b><div className="day-map-controls">{day.dayMapUrl && <a className={button} href={day.dayMapUrl} target="_blank" rel="noreferrer">маршрут ↗</a>}{day.dayMapUrl && <button title="Скопировать ссылку" onClick={() => void copyText(day.dayMapUrl!).then(() => showCopied(day.id, null))}>{copied === day.id ? "✓" : "⧉"}</button>}<button className={day.dayMapUrl ? "icon-button" : subtleButton} onClick={() => setMap(day.id)}>{day.dayMapUrl ? "✎" : "+ карта"}</button></div></header>
      <div className="day-items">{day.items.map((item) => <div className="itinerary-row" key={item.id}><button aria-label={item.done ? "Вернуть в план" : "Выполнено"} className={`check ${item.done ? "checked" : ""}`} onClick={() => updateItem(day.id, item.id, { done: !item.done })}>{item.done ? "✓" : ""}</button><input className={`item-title ${item.done ? "line-through opacity-55" : ""}`} value={item.title} onChange={(event) => updateItem(day.id, item.id, { title: event.target.value })} /><input className="item-time" placeholder="время" value={item.time || ""} onChange={(event) => updateItem(day.id, item.id, { time: event.target.value })} /><div className="item-map">{item.mapUrl && <a className="map-url" href={item.mapUrl} target="_blank" rel="noreferrer" title={item.mapUrl}>{item.mapUrl}</a>}{item.mapUrl && <button onClick={() => void copyText(item.mapUrl!).then(() => showCopied(item.id, null))} title="Скопировать">{copied === item.id ? "✓" : "⧉"}</button>}<button onClick={() => setMap(day.id, item.id)} title={item.mapUrl ? "Изменить ссылку" : "Добавить ссылку"}>{item.mapUrl ? "✎" : "+ карта"}</button></div><button className="remove-button" onClick={() => updateDay(day.id, (entry) => ({ ...entry, items: entry.items.filter((value) => value.id !== item.id) }))} aria-label="Удалить">×</button></div>)}</div>
      <div className="day-draft"><input className={field} placeholder="добавить пункт плана…" value={draft.title} onChange={(event) => setDrafts((current) => ({ ...current, [day.id]: { ...draft, title: event.target.value } }))} onKeyDown={(event) => event.key === "Enter" && add(day.id)} /><input className={`${field} draft-time`} placeholder="время" value={draft.time} onChange={(event) => setDrafts((current) => ({ ...current, [day.id]: { ...draft, time: event.target.value } }))} onKeyDown={(event) => event.key === "Enter" && add(day.id)} /><button className={button} onClick={() => add(day.id)}>Добавить</button></div>
    </article>; })}</div>
  </>;
}
