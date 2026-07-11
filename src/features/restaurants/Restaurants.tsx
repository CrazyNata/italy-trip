import { useState } from "react";
import { useTripData } from "../../trip/TripDataContext";
import { useConfirm } from "../../components/ConfirmDialog";
import type { Restaurant } from "../../types/trip";
import { uid, useTransientState } from "../shared";

const statuses = ["хочу", "бронь", "были"];
const flag = (city: string) =>
  /зальцбург|австри/i.test(city)
    ? "🇦🇹"
    : /мюнхен|германи/i.test(city)
      ? "🇩🇪"
      : /праг/i.test(city)
        ? "🇨🇿"
        : "🇮🇹";
const readonly = () => window.dispatchEvent(new CustomEvent("trip:readonly"));

export function Restaurants() {
  const { data, updateData, isReadOnly } = useTripData();
  const confirm = useConfirm();
  const [copied, setCopied] = useState<string | null>(null);
  const showCopied = useTransientState(setCopied);
  if (!data) return null;

  const list = data.restaurants ?? [];
  const guard = (action: () => void) => (isReadOnly ? readonly() : action());
  const edit = (id: string, key: keyof Restaurant, value: string) =>
    guard(() =>
      updateData((current) => ({
        ...current,
        restaurants: (current.restaurants ?? []).map((item) =>
          item.id === id ? { ...item, [key]: value } : item,
        ),
      })),
    );
  const add = () =>
    guard(() =>
      updateData((current) => ({
        ...current,
        restaurants: [
          ...(current.restaurants ?? []),
          { id: uid("r"), name: "Новый ресторан", city: "Город", status: "хочу", note: "", link: "" },
        ],
      })),
    );
  const copy = async (item: Restaurant) => {
    if (!item.link) return window.alert("Для этого ресторана ссылка ещё не добавлена.");
    try {
      await navigator.clipboard.writeText(item.link);
    } catch {
      /* Opening the link remains available. */
    }
    showCopied(item.id, null);
  };
  const remove = async (item: Restaurant) => {
    if (isReadOnly) return readonly();
    if (
      !(await confirm({
        title: "Удалить ресторан?",
        message: (
          <>
            «{item.name}» ({item.city}) будет удалён безвозвратно. Это действие нельзя отменить.
          </>
        ),
      }))
    )
      return;
    updateData((current) => ({
      ...current,
      restaurants: (current.restaurants ?? []).filter((entry) => entry.id !== item.id),
    }));
  };

  return (
    <div
      className="lodging-grid"
      style={{ animation: "fadeUp .4s ease both", position: "relative", borderRadius: 20, padding: 20, background: "radial-gradient(120% 90% at 0% 0%, rgba(42,112,137,.16), transparent 55%), radial-gradient(120% 90% at 100% 100%, rgba(217,154,78,.16), transparent 55%), var(--track,#efe4cf)", border: "1px solid var(--line,#e7dcc7)", overflow: "hidden" }}
    >
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: .5, backgroundImage: "radial-gradient(var(--line,#d8c9ac) 1.1px, transparent 1.1px)", backgroundSize: "22px 22px" }} />
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 18 }}>
        {list.length === 0 && (
          <p style={{ gridColumn: "1/-1", margin: 0, fontSize: 13, color: "var(--muted,#8a7d6b)" }}>
            Пока пусто. Добавьте ресторан, куда хотите сходить.
          </p>
        )}
        {list.map((item) => (
          <article
            key={item.id}
            style={{ background: "var(--paper,#fbf2df)", border: "1px solid var(--line,#e7dcc7)", borderRadius: 16, padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 1px 3px rgba(59,50,40,.05)" }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ac,#b95c3f)", fontWeight: 600 }}>
                <span style={{ fontSize: 15, lineHeight: 1 }}>{flag(item.city)}</span>
                <input
                  value={item.city}
                  onChange={(event) => edit(item.id, "city", event.target.value)}
                  style={{ border: "none", background: "none", color: "var(--ac,#b95c3f)", fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", fontSize: 12, width: "100%", padding: 0 }}
                />
              </div>
              <input
                value={item.name}
                onChange={(event) => edit(item.id, "name", event.target.value)}
                style={{ fontFamily: "'Playfair Display',serif", fontSize: 23, fontWeight: 600, border: "none", background: "none", width: "100%", padding: "2px 0", color: "var(--ink,#3b3228)" }}
              />
            </div>
            <input
              placeholder="кухня / что заказать…"
              value={item.note || ""}
              onChange={(event) => edit(item.id, "note", event.target.value)}
              style={{ border: "1px solid var(--line,#e7dcc7)", borderRadius: 9, padding: "8px 11px", fontSize: 13, background: "var(--soft,#fdfaf3)" }}
            />
            <input
              placeholder="ссылка (карта / сайт)…"
              value={item.link || ""}
              onChange={(event) => edit(item.id, "link", event.target.value)}
              style={{ border: "1px solid var(--line,#e7dcc7)", borderRadius: 9, padding: "8px 11px", fontSize: 13, background: "var(--soft,#fdfaf3)" }}
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => edit(item.id, "status", status)}
                  style={{ border: `1px solid ${item.status === status ? "var(--ac,#b95c3f)" : "var(--line,#e7dcc7)"}`, background: item.status === status ? "var(--ac,#b95c3f)" : "var(--card,#fff)", color: item.status === status ? "#fff" : "var(--muted,#8a7d6b)", fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 999, cursor: "pointer" }}
                >
                  {status}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                {item.link ? (
                  <a href={item.link} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Открыть →
                  </a>
                ) : (
                  <span style={{ fontSize: 13, color: "var(--muted,#8a7d6b)" }}>ссылки нет</span>
                )}
                <button
                  title="Скопировать ссылку"
                  onClick={() => void copy(item)}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted,#8a7d6b)", fontSize: 13, padding: "2px 4px", flex: "none" }}
                >
                  <i className={copied === item.id ? "fa-solid fa-check" : "fa-solid fa-copy"} />
                </button>
              </div>
              <button
                onClick={() => void remove(item)}
                style={{ border: "none", background: "none", color: "#c4b5a0", cursor: "pointer", fontSize: 13, flex: "none" }}
              >
                удалить
              </button>
            </div>
          </article>
        ))}
        <button
          onClick={add}
          style={{ border: "2px dashed #d8c9ac", background: "none", borderRadius: 16, minHeight: 180, color: "#a2937c", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "grid", placeItems: "center" }}
        >
          + добавить ресторан
        </button>
      </div>
    </div>
  );
}
