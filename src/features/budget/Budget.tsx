import { useEffect, useState } from "react";
import { useTripData } from "../../trip/TripDataContext";
import { useConfirm } from "../../components/ConfirmDialog";
import { uid } from "../shared";

const colors: Record<string, string> = { транспорт: "#b95c3f", проживание: "#cf9440", еда: "#7c8450", развлечения: "#c88a6a", собаки: "#9a7b4f", разное: "#8a7d6b" };
const fallbackColors = ["#5f8a6a", "#4d8fac", "#a86f8c", "#c88a6a", "#9a7b4f", "#8a7d6b"];
const catColor = (category: string) => {
  const key = category.trim().toLowerCase();
  if (colors[key]) return colors[key];
  const hash = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return fallbackColors[hash % fallbackColors.length];
};
const money = (value: number) => value.toLocaleString("ru-RU");
const CURRENCY_KEY = "italy_budget_currency";
const currencies = ["EUR", "RUB", "CZK"] as const;
type Currency = (typeof currencies)[number];
const symbols: Record<Currency, string> = { EUR: "€", RUB: "₽", CZK: "Kč" };

export function Budget() {
  const { data, updateData, isReadOnly } = useTripData();
  const confirm = useConfirm();
  const [draft, setDraft] = useState({ label: "", category: "", amount: "" });
  const [currency, setCurrency] = useState<Currency>(() => {
    try {
      const saved = localStorage.getItem(CURRENCY_KEY);
      return currencies.includes(saved as Currency) ? saved as Currency : "EUR";
    } catch { return "EUR"; }
  });
  const [rates, setRates] = useState<Record<Currency, number>>({ EUR: 1, RUB: 0, CZK: 0 });
  useEffect(() => {
    const controller = new AbortController();
    void fetch("https://open.er-api.com/v6/latest/EUR", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const json = await response.json() as { rates?: { RUB?: number; CZK?: number } };
        if (typeof json.rates?.RUB !== "number" || json.rates.RUB <= 0 || typeof json.rates?.CZK !== "number" || json.rates.CZK <= 0) throw new Error();
        setRates({ EUR: 1, RUB: json.rates.RUB, CZK: json.rates.CZK });
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setCurrency("EUR");
      });
    return () => controller.abort();
  }, []);
  if (!data) return null;
  const guard = (action: () => void) => isReadOnly ? window.dispatchEvent(new CustomEvent("trip:readonly")) : action();
  const displayCurrency = currency !== "EUR" && rates[currency] <= 0 ? "EUR" : currency;
  const rate = rates[displayCurrency];
  const formatAmount = (eur: number) => `${symbols[displayCurrency]}\u00a0${money(Math.round(eur * rate))}`;
  const toEur = (amount: string) => (Number(amount) || 0) / rate;
  const selectCurrency = (next: Currency) => {
    if (next !== "EUR" && rates[next] <= 0) return;
    setCurrency(next);
    try { localStorage.setItem(CURRENCY_KEY, next); } catch { /* Preference stays in memory. */ }
  };
  const total = data.expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const days = Math.max(1, Math.round((new Date(data.trip.end).getTime() - new Date(data.trip.start).getTime()) / 86400000));
  const byCategory = new Map<string, number>();
  for (const expense of data.expenses) {
    const key = expense.category.trim() || "разное";
    byCategory.set(key, (byCategory.get(key) || 0) + (Number(expense.amount) || 0));
  }
  const categories = [...byCategory.entries()].filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
  const add = () => { if (!draft.label.trim()) return; guard(() => { updateData((current) => ({ ...current, expenses: [...current.expenses, { id: uid("e"), label: draft.label.trim(), category: draft.category.trim(), amount: toEur(draft.amount) }] })); setDraft({ label: "", category: "", amount: "" }); }); };
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
        <div style={{ textAlign: "right" }}><div style={{ display: "flex", justifyContent: "flex-end", gap: 4, marginBottom: 10 }}>{currencies.map((value) => <button key={value} onClick={() => selectCurrency(value)} disabled={value !== "EUR" && rates[value] <= 0} style={{ border: "none", borderRadius: 999, padding: "5px 10px", cursor: value !== "EUR" && rates[value] <= 0 ? "wait" : "pointer", fontSize: 11, fontWeight: 700, background: displayCurrency === value ? "#fff" : "rgba(255,255,255,.16)", color: displayCurrency === value ? "var(--ac,#2a7089)" : "#fff", opacity: value !== "EUR" && rates[value] <= 0 ? .55 : 1 }}>{value}</button>)}</div><div style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", opacity: .76 }}>Общая сумма</div><div style={{ fontFamily: "'Mulish',system-ui,sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 42, fontWeight: 700, lineHeight: 1, marginTop: 4 }}>{formatAmount(total)}</div></div>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 18 }}>
      <div style={{ background: "var(--card,#fff)", border: "1px solid var(--line,#e7dcc7)", borderRadius: 15, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}><span style={{ width: 34, height: 34, borderRadius: 11, background: "var(--soft,#f1f7f6)", color: "var(--ac,#2a7089)", display: "grid", placeItems: "center" }}><i className="fa-solid fa-people-group" /></span><div><div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted,#8a7d6b)", fontWeight: 700 }}>На семью</div><div style={{ fontFamily: "'Mulish',system-ui,sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 27, fontWeight: 700, lineHeight: 1.15, marginTop: 3 }}>{formatAmount(total / 2)}</div></div></div>
      <div style={{ background: "var(--card,#fff)", border: "1px solid var(--line,#e7dcc7)", borderRadius: 15, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}><span style={{ width: 34, height: 34, borderRadius: 11, background: "#f7eee1", color: "var(--ac2,#d99a4e)", display: "grid", placeItems: "center" }}><i className="fa-regular fa-calendar" /></span><div><div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted,#8a7d6b)", fontWeight: 700 }}>В день</div><div style={{ fontFamily: "'Mulish',system-ui,sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 27, fontWeight: 700, lineHeight: 1.15, marginTop: 3 }}>{formatAmount(total / days)}</div></div></div>
      <div style={{ background: "var(--card,#fff)", border: "1px solid var(--line,#e7dcc7)", borderRadius: 15, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}><span style={{ width: 34, height: 34, borderRadius: 11, background: "color-mix(in srgb,var(--ol,#2f8a6a) 14%,transparent)", color: "var(--ol,#2f8a6a)", display: "grid", placeItems: "center" }}><i className="fa-solid fa-list-ul" /></span><div><div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted,#8a7d6b)", fontWeight: 700 }}>Записей</div><div style={{ fontFamily: "'Mulish',system-ui,sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 27, fontWeight: 700, lineHeight: 1.15, marginTop: 3 }}>{data.expenses.length}</div></div></div>
    </div>
    {categories.length > 0 && <div style={{ background: "var(--card,#fff)", border: "1px solid var(--line,#e7dcc7)", borderRadius: 18, overflow: "hidden", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--line,#e7dcc7)" }}><div><h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 23, fontWeight: 600, margin: 0 }}>По категориям</h2><div style={{ fontSize: 12, color: "var(--muted,#8a7d6b)", marginTop: 2 }}>Куда уходит бюджет</div></div><span style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--soft,#f1f7f6)", color: "var(--ac,#2a7089)", display: "grid", placeItems: "center" }}><i className="fa-solid fa-chart-pie" /></span></div>
      <div style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", gap: 3, height: 14, borderRadius: 7, overflow: "hidden", marginBottom: 16 }}>{categories.map(([category, value]) => <div key={category} title={`${category} · ${formatAmount(value)}`} style={{ width: `${(value / total) * 100}%`, minWidth: 3, background: catColor(category) }} />)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(168px,1fr))", gap: 10 }}>{categories.map(([category, value]) => {
          const percent = Math.round((value / total) * 100);
          return <div key={category} style={{ position: "relative", overflow: "hidden", border: "1px solid var(--line,#e7dcc7)", borderRadius: 12, padding: "11px 13px 14px", background: "var(--soft,#f1f7f6)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 9, height: 9, borderRadius: "50%", flex: "none", background: catColor(category) }} /><span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 13, textTransform: "capitalize", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{category}</span><span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted,#8a7d6b)" }}>{percent}%</span></div>
            <div style={{ fontFamily: "'Mulish',system-ui,sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 18, fontWeight: 700, marginTop: 7 }}>{formatAmount(value)}</div>
            <i style={{ position: "absolute", left: 0, bottom: 0, height: 3, width: `${percent}%`, background: catColor(category) }} />
          </div>;
        })}</div>
      </div>
    </div>}
    <div style={{ background: "var(--card,#fff)", border: "1px solid var(--line,#e7dcc7)", borderRadius: 18, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--line,#e7dcc7)" }}><div><h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 23, fontWeight: 600, margin: 0 }}>Расходы</h2><div style={{ fontSize: 12, color: "var(--muted,#8a7d6b)", marginTop: 2 }}>Общий бюджет поездки</div></div><span style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--soft,#f1f7f6)", color: "var(--ac,#2a7089)", display: "grid", placeItems: "center" }}><i className="fa-solid fa-receipt" /></span></div>
      {data.expenses.length === 0 && <div style={{ padding: "34px 20px", textAlign: "center", color: "var(--muted,#8a7d6b)" }}><i className="fa-regular fa-money-bill-1" style={{ fontSize: 26, opacity: .6 }} /><div style={{ marginTop: 10, fontSize: 14 }}>Пока нет расходов — добавьте первый ниже.</div></div>}
      {data.expenses.map((expense) => { const color = catColor(expense.category || "разное"); return <div key={expense.id} className="exp-row" style={{ display: "flex", alignItems: "center", gap: 13, padding: "15px 20px", borderBottom: "1px solid var(--line,#f0e5d1)", transition: "background .15s" }}><span style={{ width: 11, height: 11, borderRadius: "50%", background: color, flex: "none", boxShadow: `0 0 0 4px color-mix(in srgb,${color} 14%,transparent)` }} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 15 }}>{expense.label}</div>{expense.category.trim() && <span style={{ display: "inline-block", marginTop: 5, padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "capitalize", color, background: `color-mix(in srgb,${color} 13%,transparent)` }}>{expense.category}</span>}</div><div style={{ fontFamily: "'Mulish',system-ui,sans-serif", fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 20 }}>{formatAmount(expense.amount)}</div><button onClick={() => void remove(expense.id)} title="Удалить расход" style={{ border: "none", background: "none", color: "#c4b5a0", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4 }}>×</button></div>; })}
      <div style={{ padding: "16px 20px 18px", background: "var(--soft,#f1f7f6)" }}><div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted,#8a7d6b)", fontWeight: 700, marginBottom: 9 }}>Добавить расход</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder="например, билеты в музей" style={{ flex: 1, minWidth: 180, border: "1px solid var(--line,#e7dcc7)", borderRadius: 9, padding: "10px 12px", fontSize: 14, background: "var(--card,#fff)" }} /><input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="категория" style={{ width: 145, border: "1px solid var(--line,#e7dcc7)", borderRadius: 9, padding: "10px 12px", fontSize: 14, background: "var(--card,#fff)" }} /><input value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} onKeyDown={(event) => event.key === "Enter" && add()} placeholder={symbols[displayCurrency]} type="number" style={{ width: 95, border: "1px solid var(--line,#e7dcc7)", borderRadius: 9, padding: "10px 12px", fontSize: 14, background: "var(--card,#fff)" }} /><button onClick={add} style={{ border: "none", background: "var(--ac,#2a7089)", color: "#fff", borderRadius: 9, padding: "0 16px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}><i className="fa-solid fa-plus" style={{ marginRight: 6, fontSize: 11 }} />Добавить</button></div></div>
    </div>
  </div>;
}
