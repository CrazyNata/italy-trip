import { useState } from "react";
import { useTripData } from "../../trip/TripDataContext";
import { useConfirm } from "../../components/ConfirmDialog";
import type { ItineraryItem, TripDay } from "../../types/trip";
import { copyText, useTransientState } from "../shared";

const flag = (name: string) => /праг/i.test(name) ? "🇨🇿" : /зальцбург|австри/i.test(name) ? "🇦🇹" : /мюнхен|германи|фельдкирх/i.test(name) ? "🇩🇪" : "🇮🇹";
export function Itinerary() {
  const { data, updateData, isReadOnly } = useTripData();
  const confirm = useConfirm();
  const [copied, setCopied] = useState<string | null>(null);
  const showCopied = useTransientState(setCopied);
  if (!data) return null;
  const guard = (action: () => void) => isReadOnly ? window.dispatchEvent(new CustomEvent("trip:readonly")) : action();
  const updateDay = (id: string, change: (day: TripDay) => TripDay) => guard(() => updateData((current) => ({ ...current, days: current.days.map((day) => day.id === id ? change(day) : day) })));
  const removeItem = async (dayId: string, item: ItineraryItem) => {
    if (isReadOnly) return void window.dispatchEvent(new CustomEvent("trip:readonly"));
    if (!(await confirm({ title: "Удалить пункт плана?", message: <>«{item.title}» будет удалён из плана дня.</> }))) return;
    updateData((current) => ({ ...current, days: current.days.map((day) => day.id === dayId ? { ...day, items: day.items.filter((value) => value.id !== item.id) } : day) }));
  };
  const updateItem = (dayId: string, itemId: string, change: Partial<ItineraryItem>) => updateDay(dayId, (day) => ({ ...day, items: day.items.map((item) => item.id === itemId ? { ...item, ...change } : item) }));
  const setMap = (dayId: string, itemId?: string) => {
    const day = data.days.find((entry) => entry.id === dayId); const item = day?.items.find((entry) => entry.id === itemId);
    const url = window.prompt(itemId ? "Ссылка на Google Maps (оставьте пустым, чтобы убрать):" : "Ссылка на Google Maps для маршрута этого дня (оставьте пустым, чтобы убрать):", itemId ? item?.mapUrl || "" : day?.dayMapUrl || "");
    if (url === null) return;
    itemId ? updateItem(dayId, itemId, { mapUrl: url.trim() }) : updateDay(dayId, (entry) => ({ ...entry, dayMapUrl: url.trim() }));
  };
  return <div className="route-board" style={{ animation: "fadeUp .4s ease both" }}>
    {data.days.map((day) => { const done = day.items.filter((item) => item.done).length; const dayMapUrl = day.dayMapUrl?.trim(); return <div key={day.id} className="day-card">
      <div className="day-card-head">
        <div className="day-date"><b>{day.dayNum}</b><span>{day.month}</span></div>
        <div className="day-title">
          <div><span className="day-flags">{[...new Set(day.city.split("→").map(flag))].join(" ")}</span><span>{day.city}</span></div>
          <div className="day-weekday">{day.weekday}</div>
        </div>
        <div className="day-count">{day.items.length ? `${done}/${day.items.length}` : ""}</div>
        <div className="day-map-controls">
          {dayMapUrl ? <>
            <a className="day-route-link" href={dayMapUrl} target="_blank" rel="noopener" title="Открыть маршрут дня на Google Maps"><i className="fa-solid fa-route" />маршрут</a>
            <button className="icon-button" onClick={() => void copyText(dayMapUrl).then(() => showCopied(day.id, null))} title="Скопировать ссылку на маршрут"><i className={copied === day.id ? "fa-solid fa-check" : "fa-solid fa-copy"} /></button>
            <button className="icon-button" onClick={() => setMap(day.id)} title="Изменить ссылку"><i className="fa-solid fa-pencil" /></button>
          </> : <button className="day-route-add" onClick={() => setMap(day.id)} title="Добавить ссылку на маршрут дня"><i className="fa-solid fa-route" />+ карта</button>}
        </div>
      </div>
      <div className="day-items">
        {day.items.map((item) => <div key={item.id} className="itinerary-row">
          <button className={`check${item.done ? " checked" : ""}`} onClick={() => updateItem(day.id, item.id, { done: !item.done })}>{item.done ? "✓" : ""}</button>
          <div className="item-main">
            <span className={`item-title${item.done ? " done" : ""}`}>{item.title}</span>
            <div className="item-meta">
              {item.time ? <span className="item-time">{item.time}</span> : null}
              {item.mapUrl?.trim() && <span className="item-map"><a href={item.mapUrl.trim()} target="_blank" rel="noopener" title="Открыть на карте"><i className="fa-solid fa-location-dot" />карта</a></span>}
            </div>
          </div>
          <button className="remove-button" onClick={() => void removeItem(day.id, item)}>×</button>
        </div>)}
      </div>
    </div>; })}
  </div>;
}
