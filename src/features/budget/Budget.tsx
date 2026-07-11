import { useState } from "react";
import { useTripData } from "../../trip/TripDataContext";
import { useConfirm } from "../../components/ConfirmDialog";
import { uid } from "../shared";

const colors: Record<string, string> = { транспорт: "#b95c3f", проживание: "#cf9440", еда: "#7c8450", развлечения: "#c88a6a", собаки: "#9a7b4f", разное: "#8a7d6b" };
const money = (value: number) => value.toLocaleString("ru-RU");

export function Budget() {
  const { data, updateData, isReadOnly } = useTripData();
  const confirm = useConfirm();
  const [draft, setDraft] = useState({ label: "", category: "", amount: "" });
  if (!data) return null;
  const guard = (action: () => void) => isReadOnly ? window.dispatchEvent(new CustomEvent("trip:readonly")) : action();
  const total = data.expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const days = Math.max(1, Math.round((new Date(data.trip.end).getTime() - new Date(data.trip.start).getTime()) / 86400000));
  const add = () => { if (!draft.label.trim()) return; guard(() => { updateData((current) => ({ ...current, expenses: [...current.expenses, { id: uid("e"), label: draft.label.trim(), category: draft.category.trim(), amount: Number(draft.amount) || 0 }] })); setDraft({ label: "", category: "", amount: "" }); }); };
  const remove = async (id: string) => {
    if (isReadOnly) return void window.dispatchEvent(new CustomEvent("trip:readonly"));
    const expense = data.expenses.find((item) => item.id === id);
    if (!(await confirm({ title: "Удалить расход?", message: <>«{expense?.label || "расход"}» будет удалён из бюджета.</> }))) return;
    updateData((current) => ({ ...current, expenses: current.expenses.filter((item) => item.id !== id) }));
  };

  return <div style={{ animation: "fadeUp .4s ease both" }}>
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 20, padding: 24, background: "linear-gradient(125deg,var(--ac,#2a7089),#195866)", color: "#fff", marginBottom: 18 }}>
      <div style={{ position: "absolute", right: -38, top: -54, width: 180, height: 180, border: "1px solid rgba(255,255,255,.18)", borderRadius: "50%" }} />
      <div style={{ position: "absolute", right: 30, bottom: -70, width: 150, height: 150, border: "1px solid rgba(255,255,255,.12)", borderRadius: "50%" }} />
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div><div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", opacity: .72, fontWeight: 700 }}><i className="fa-solid fa-wallet" style={{ marginRight: 7 }} />Бюджет поездки</div><h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 600, margin: "8px 0 0" }}>Италия, осень 2026</h2></div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", opacity: .76 }}>Общая сумма</div><div style={{ fontFamily: "'Playfair Display',serif", fontSize: 42, fontWeight: 700, lineHeight: 1, marginTop: 4 }}>€{money(total)}</div></div>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 18 }}>
      <div style={{ background: "var(--card,#fff)", border: "1px solid var(--line,#e7dcc7)", borderRadius: 15, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}><span style={{ width: 34, height: 34, borderRadius: 11, background: "var(--soft,#f1f7f6)", color: "var(--ac,#2a7089)", display: "grid", placeItems: "center" }}><i className="fa-solid fa-people-group" /></span><div><div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted,#8a7d6b)", fontWeight: 700 }}>На семью</div><div style={{ fontFamily: "'Playfair Display',serif", fontSize: 27, fontWeight: 700, lineHeight: 1.15, marginTop: 3 }}>€{money(Math.round(total / 2))}</div></div></div>
      <div style={{ background: "var(--card,#fff)", border: "1px solid var(--line,#e7dcc7)", borderRadius: 15, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}><span style={{ width: 34, height: 34, borderRadius: 11, background: "#f7eee1", color: "var(--ac2,#d99a4e)", display: "grid", placeItems: "center" }}><i className="fa-regular fa-calendar" /></span><div><div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted,#8a7d6b)", fontWeight: 700 }}>В день</div><div style={{ fontFamily: "'Playfair Display',serif", fontSize: 27, fontWeight: 700, lineHeight: 1.15, marginTop: 3 }}>€{money(Math.round(total / days))}</div></div></div>
    </div>
    <div style={{ background: "var(--card,#fff)", border: "1px solid var(--line,#e7dcc7)", borderRadius: 18, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--line,#e7dcc7)" }}><div><h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 23, fontWeight: 600, margin: 0 }}>Расходы</h2><div style={{ fontSize: 12, color: "var(--muted,#8a7d6b)", marginTop: 2 }}>Общий бюджет поездки</div></div><span style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--soft,#f1f7f6)", color: "var(--ac,#2a7089)", display: "grid", placeItems: "center" }}><i className="fa-solid fa-receipt" /></span></div>
      {data.expenses.map((expense) => <div key={expense.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "15px 20px", borderBottom: "1px solid var(--line,#f0e5d1)" }}><span style={{ width: 11, height: 11, borderRadius: "50%", background: colors[expense.category] || colors.разное, flex: "none", boxShadow: `0 0 0 4px color-mix(in srgb,${colors[expense.category] || colors.разное} 14%,transparent)` }} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15 }}>{expense.label}</div><div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted,#8a7d6b)", marginTop: 3 }}>{expense.category}</div></div><div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 20 }}>€{money(expense.amount)}</div><button onClick={() => void remove(expense.id)} title="Удалить расход" style={{ border: "none", background: "none", color: "#c4b5a0", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4 }}>×</button></div>)}
      <div style={{ padding: "16px 20px 18px", background: "var(--soft,#f1f7f6)" }}><div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted,#8a7d6b)", fontWeight: 700, marginBottom: 9 }}>Добавить расход</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder="например, билеты в музей" style={{ flex: 1, minWidth: 180, border: "1px solid var(--line,#e7dcc7)", borderRadius: 9, padding: "10px 12px", fontSize: 14, background: "var(--card,#fff)" }} /><input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="категория" style={{ width: 145, border: "1px solid var(--line,#e7dcc7)", borderRadius: 9, padding: "10px 12px", fontSize: 14, background: "var(--card,#fff)" }} /><input value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} onKeyDown={(event) => event.key === "Enter" && add()} placeholder="€" type="number" style={{ width: 95, border: "1px solid var(--line,#e7dcc7)", borderRadius: 9, padding: "10px 12px", fontSize: 14, background: "var(--card,#fff)" }} /><button onClick={add} style={{ border: "none", background: "var(--ac,#2a7089)", color: "#fff", borderRadius: 9, padding: "0 16px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}><i className="fa-solid fa-plus" style={{ marginRight: 6, fontSize: 11 }} />Добавить</button></div></div>
    </div>
  </div>;
}
