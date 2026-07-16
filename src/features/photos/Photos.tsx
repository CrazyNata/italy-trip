import { useMemo, useState } from "react";

import { Lightbox } from "../../components/Lightbox";
import { useTripData } from "../../trip/TripDataContext";
import { PanelTitle } from "../shared";

type Kind = "lodging" | "sight" | "restaurant";

interface Shot {
  url: string;
  place: string;
  kind: Kind;
}

interface CityAlbum {
  city: string;
  shots: Shot[];
  places: number;
}

// Каждый снимок в альбоме помечен разделом, из которого пришёл.
const KIND_ICON: Record<Kind, string> = {
  lodging: "fa-solid fa-bed",
  sight: "fa-solid fa-monument",
  restaurant: "fa-solid fa-utensils",
};

// Города в данных записаны по-разному: у дней это «Рим → Флоренция», у мест и
// ресторанов — просто «Рим (центр)». Приводим к чистому названию, чтобы фото
// одного города собирались в одну группу.
function cityName(raw: string) {
  return (raw.split("→").pop() ?? raw).replace(/\(.*?\)/g, "").trim();
}

const plural = (n: number, one: string, few: string, many: string) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
};

export function Photos() {
  const { data } = useTripData();
  const [view, setView] = useState<{ shots: Shot[]; index: number } | null>(null);

  const albums = useMemo<CityAlbum[]>(() => {
    if (!data) return [];

    // Порядок городов задаёт сам маршрут — так альбом читается как хронология
    // поездки, а не как случайный список.
    const order = new Map<string, number>();
    data.days.forEach((day) => {
      const name = cityName(day.city);
      if (name && !order.has(name)) order.set(name, order.size);
    });

    const buckets = new Map<string, Shot[]>();
    const seen = new Set<string>();
    const add = (url: string | undefined, place: string, kind: Kind, city: string) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      buckets.set(city, [...(buckets.get(city) ?? []), { url, place, kind }]);
    };

    data.lodging.forEach((l) =>
      (l.photos ?? []).forEach((url) => add(url, l.name, "lodging", cityName(l.city))),
    );
    data.sights.forEach((s) => add(s.photo, s.name, "sight", cityName(s.city)));
    (data.restaurants ?? []).forEach((r) =>
      (r.photos ?? []).forEach((url) => add(url, r.name, "restaurant", cityName(r.city))),
    );

    return [...buckets.entries()]
      .map(([city, list]) => ({
        city: city || "Без города",
        shots: list,
        places: new Set(list.map((shot) => shot.place)).size,
      }))
      .sort((a, b) => {
        const ai = order.get(a.city) ?? Infinity;
        const bi = order.get(b.city) ?? Infinity;
        return ai === bi ? a.city.localeCompare(b.city, "ru") : ai - bi;
      });
  }, [data]);

  const total = albums.reduce((sum, album) => sum + album.shots.length, 0);
  const numbered = albums.length > 1;

  return (
    <div style={{ animation: "fadeUp .4s ease both" }}>
      <PanelTitle eyebrow="Воспоминания">Альбом поездки</PanelTitle>

      {total > 0 && (
        <p className="photo-lead">
          <span>
            <i className="fa-solid fa-images" />
            <b>{total}</b> {plural(total, "снимок", "снимка", "снимков")}
          </span>
          <span>
            <i className="fa-solid fa-location-dot" />
            {albums.length} {plural(albums.length, "город", "города", "городов")}
          </span>
          <span style={{ color: "var(--muted)" }}>
            Сюда автоматически попадают фото из жилья, мест и ресторанов.
          </span>
        </p>
      )}

      {total === 0 ? (
        <div className="photo-empty">
          <span className="fa-solid fa-images" />
          <strong>Пока пусто</strong>
          <p>
            Добавьте фото к жилью, местам или ресторанам — они соберутся здесь в
            общий альбом поездки, по городам маршрута.
          </p>
        </div>
      ) : (
        <div className="photo-groups">
          {albums.map((album, index) => (
            <section key={album.city} className="photo-group">
              <div className="photo-group-content">
                <header>
                  {numbered && (
                    <span className="photo-group-num">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  )}
                  <h2>{album.city}</h2>
                  <small>
                    {album.shots.length}{" "}
                    {plural(album.shots.length, "фото", "фото", "фото")} ·{" "}
                    {album.places} {plural(album.places, "место", "места", "мест")}
                  </small>
                </header>
                <div className="photo-grid">
                  {album.shots.map((shot, shotIndex) => (
                    <figure
                      key={shot.url}
                      className={shotIndex === 0 && album.shots.length > 2 ? "is-hero" : undefined}
                    >
                      <button
                        type="button"
                        className="photo-open"
                        onClick={() => setView({ shots: album.shots, index: shotIndex })}
                        aria-label={`Открыть фото: ${shot.place}`}
                      >
                        <img src={shot.url} alt={shot.place} loading="lazy" />
                      </button>
                      <figcaption>
                        <i className={KIND_ICON[shot.kind]} aria-hidden="true" />
                        <span>{shot.place}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {view && (
        <Lightbox
          images={view.shots.map((shot) => shot.url)}
          index={view.index}
          alt={view.shots[view.index]?.place}
          onClose={() => setView(null)}
          onIndex={(next) => setView((current) => (current ? { ...current, index: next } : current))}
        />
      )}
    </div>
  );
}
