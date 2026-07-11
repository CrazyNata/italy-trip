import { useTripData } from "../../trip/TripDataContext";
import { button, field, PanelTitle, uid } from "../shared";

export function Budget() {
  const { data, updateData, isReadOnly } = useTripData();
  if (!data) return null;
  const guard = (action: () => void) =>
    isReadOnly
      ? window.dispatchEvent(new CustomEvent("trip:readonly"))
      : action();
  const total = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const edit = (id: string, change: Record<string, string | number>) =>
    guard(() =>
      updateData((current) => ({
        ...current,
        expenses: current.expenses.map((expense) =>
          expense.id === id ? { ...expense, ...change } : expense,
        ),
      })),
    );
  return (
    <>
      <PanelTitle
        eyebrow="Расходы поездки"
        action={
          <div className="font-mono text-3xl text-[var(--ol)]">
            €{total.toLocaleString("ru-RU")}
          </div>
        }
      >
        Бюджет
      </PanelTitle>
      <div className="space-y-2">
        {data.expenses.map((expense) => (
          <div
            className="grid gap-2 rounded-xl border border-[var(--line)] p-3 sm:grid-cols-[1fr_180px_130px_32px]"
            key={expense.id}
          >
            <input
              className={field}
              value={expense.label}
              onChange={(event) =>
                edit(expense.id, { label: event.target.value })
              }
            />
            <input
              className={field}
              value={expense.category}
              onChange={(event) =>
                edit(expense.id, { category: event.target.value })
              }
            />
            <input
              type="number"
              className={field}
              value={expense.amount}
              onChange={(event) =>
                edit(expense.id, { amount: +event.target.value })
              }
            />
            <button
              onClick={() =>
                guard(() =>
                  updateData((current) => ({
                    ...current,
                    expenses: current.expenses.filter(
                      (item) => item.id !== expense.id,
                    ),
                  })),
                )
              }
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        className={`${button} mt-4`}
        onClick={() =>
          guard(() =>
            updateData((current) => ({
              ...current,
              expenses: [
                ...current.expenses,
                {
                  id: uid("e"),
                  label: "Новый расход",
                  category: "другое",
                  amount: 0,
                },
              ],
            })),
          )
        }
      >
        + Добавить расход
      </button>
    </>
  );
}
