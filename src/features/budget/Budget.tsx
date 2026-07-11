import { useState } from "react";
import { useTripData } from "../../trip/TripDataContext";
import { button, field, uid } from "../shared";

const categories = ["транспорт", "проживание", "еда", "развлечения", "собаки", "разное"];
const colors: Record<string, string> = { транспорт: "#b95c3f", проживание: "#cf9440", еда: "#7c8450", развлечения: "#c88a6a", собаки: "#9a7b4f", разное: "#8a7d6b" };
const money = (value: number) => value.toLocaleString("ru-RU");
export function Budget() {
  const { data, updateData, isReadOnly } = useTripData();
  const [draft, setDraft] = useState({ label: "", category: "разное", amount: "" });
  if (!data) return null;
  const guard = (action: () => void) => isReadOnly ? window.dispatchEvent(new CustomEvent("trip:readonly")) : action();
  const total = data.expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const nights = Math.max(1, Math.round((new Date(data.trip.end).getTime() - new Date(data.trip.start).getTime()) / 86400000));
  const subtotals = categories.map((category) => ({ category, amount: data.expenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + expense.amount, 0) })).filter((entry) => entry.amount);
  const edit = (id: string, change: Record<string, string | number>) => guard(() => updateData((current) => ({ ...current, expenses: current.expenses.map((expense) => expense.id === id ? { ...expense, ...change } : expense) })));
  const add = () => { if (!draft.label.trim()) return; guard(() => { updateData((current) => ({ ...current, expenses: [...current.expenses, { id: uid("e"), label: draft.label.trim(), category: draft.category, amount: Number(draft.amount) || 0 }] })); setDraft({ label: "", category: draft.category, amount: "" }); }); };
  return <>
    <section className="budget-hero"><div><p>▣ Бюджет поездки</p><h2>Италия, осень 2026</h2></div><div><p>Общая сумма</p><strong>€{money(total)}</strong></div></section>
    <div className="budget-stats"><article><span>♚</span><div><small>На человека</small><b>€{money(Math.round(total / Math.max(1, data.trip.people)))}</b></div></article><article><span>♙</span><div><small>На семью</small><b>€{money(Math.round(total / 2))}</b></div></article><article><span>□</span><div><small>В день</small><b>€{money(Math.round(total / nights))}</b></div></article></div>
    <div className="category-totals">{subtotals.map((entry) => <div key={entry.category}><span style={{ background: colors[entry.category] }} /><small>{entry.category}</small><b>€{money(entry.amount)}</b><i style={{ background: colors[entry.category], width: `${total ? entry.amount / total * 100 : 0}%` }} /></div>)}</div>
    <section className="expense-card"><header><div><h2>Расходы</h2><p>Общий бюджет поездки</p></div><span>▤</span></header>{data.expenses.map((expense) => <div className="expense-row" key={expense.id}><span className="expense-dot" style={{ background: colors[expense.category] || colors.разное }} /><input className="expense-label" value={expense.label} onChange={(event) => edit(expense.id, { label: event.target.value })} /><select value={expense.category} onChange={(event) => edit(expense.id, { category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select><label>€<input type="number" value={expense.amount} onChange={(event) => edit(expense.id, { amount: Number(event.target.value) })} /></label><button className="remove-button" onClick={() => guard(() => updateData((current) => ({ ...current, expenses: current.expenses.filter((item) => item.id !== expense.id) })))}>×</button></div>)}
      <div className="expense-draft"><p>Добавить расход</p><div><input className={field} placeholder="например, билеты в музей" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} /><select className={field} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select><input className={field} type="number" placeholder="€" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} onKeyDown={(event) => event.key === "Enter" && add()} /><button className={button} onClick={add}>+ Добавить</button></div></div>
    </section>
  </>;
}
