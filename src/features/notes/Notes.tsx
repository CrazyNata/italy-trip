import { useTripData } from "../../trip/TripDataContext";
import { button, field, PanelTitle, uid } from "../shared";

export function Notes() {
  const { data, updateData, isReadOnly } = useTripData();
  if (!data) return null;
  const guard = (action: () => void) =>
    isReadOnly
      ? window.dispatchEvent(new CustomEvent("trip:readonly"))
      : action();
  const edit = (id: string, change: Record<string, string>) =>
    guard(() =>
      updateData((current) => ({
        ...current,
        links: current.links.map((link) =>
          link.id === id ? { ...link, ...change } : link,
        ),
      })),
    );
  return (
    <>
      <PanelTitle eyebrow="Всё важное под рукой">Заметки и ссылки</PanelTitle>
      <div className="notes-grid grid gap-6 md:grid-cols-2">
        <textarea
          className={`${field} min-h-80`}
          value={data.notes}
          onChange={(event) =>
            guard(() =>
              updateData((current) => ({
                ...current,
                notes: event.target.value,
              })),
            )
          }
        />
        <div className="space-y-3">
          {data.links.map((link) => (
            <div
              className="rounded-xl border border-[var(--line)] p-3"
              key={link.id}
            >
              <input
                className={field}
                value={link.title}
                onChange={(event) =>
                  edit(link.id, { title: event.target.value })
                }
              />
              <input
                className={`${field} mt-2`}
                value={link.url}
                onChange={(event) => edit(link.id, { url: event.target.value })}
              />
              <div className="mt-2 flex justify-between">
                <a
                  className="text-sm font-bold text-[var(--ac)]"
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть ↗
                </a>
                <button
                  onClick={() =>
                    guard(() =>
                      updateData((current) => ({
                        ...current,
                        links: current.links.filter(
                          (item) => item.id !== link.id,
                        ),
                      })),
                    )
                  }
                >
                  удалить
                </button>
              </div>
            </div>
          ))}
          <button
            className={button}
            onClick={() =>
              guard(() =>
                updateData((current) => ({
                  ...current,
                  links: [
                    ...current.links,
                    { id: uid("link"), title: "Новая ссылка", url: "https://" },
                  ],
                })),
              )
            }
          >
            + Добавить ссылку
          </button>
        </div>
      </div>
    </>
  );
}
