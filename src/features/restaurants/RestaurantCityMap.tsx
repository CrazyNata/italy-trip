import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import { useAuth } from "../../auth";
import { WARM_STYLE, warmConfig } from "../maps/mapTheme";
import type { Restaurant } from "../../types/trip";

export function RestaurantCityMap({ restaurants, focus }: { restaurants: Restaurant[]; focus: string | null }) {
  const { mapboxToken } = useAuth();
  const element = useRef<HTMLDivElement>(null), mapRef = useRef<MapboxMap | undefined>(undefined), markers = useRef<Record<string, MapboxMarker>>({});
  const [error, setError] = useState("");
  useEffect(() => {
    if (!element.current || !mapboxToken) return;
    let live = true, map: MapboxMap | undefined;
    void import("mapbox-gl").then(({ default: mapbox }) => {
      mapbox.accessToken = mapboxToken;
      map = new mapbox.Map({ container: element.current!, style: WARM_STYLE, config: warmConfig(), center: restaurants[0].lnglat!, zoom: 13, attributionControl: false });
      mapRef.current = map;
      const bounds = new mapbox.LngLatBounds();
      restaurants.forEach((restaurant, index) => {
        bounds.extend(restaurant.lnglat!);
        const node = document.createElement("div"); node.textContent = String(index + 1); node.className = "grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-[var(--ac)] text-xs font-bold text-white shadow-md";
        markers.current[restaurant.id] = new mapbox.Marker({ element: node }).setLngLat(restaurant.lnglat!).setPopup(new mapbox.Popup({ offset: 18 }).setText(restaurant.name)).addTo(map!);
      });
      map.on("load", () => map!.fitBounds(bounds, { padding: 45, maxZoom: 15, duration: 0 }));
      map.on("error", () => live && setError("Не удалось загрузить карту"));
    }).catch(() => setError("Не удалось загрузить карту"));
    return () => { live = false; Object.values(markers.current).forEach((marker) => marker.remove()); markers.current = {}; map?.remove(); };
  }, [mapboxToken, restaurants.map((item) => `${item.id}:${item.lnglat}`).join("|")]);
  useEffect(() => { const marker = focus ? markers.current[focus] : undefined; if (marker && mapRef.current) { mapRef.current.flyTo({ center: marker.getLngLat(), zoom: 15 }); marker.togglePopup(); } }, [focus]);
  return <div ref={element} style={{ height: 330, borderRadius: "var(--r-3)", overflow: "hidden", background: "var(--track)" }}>{(error || !mapboxToken) && <div className="grid h-full place-items-center text-sm text-[var(--muted)]">{error || "Токен карты недоступен"}</div>}</div>;
}
