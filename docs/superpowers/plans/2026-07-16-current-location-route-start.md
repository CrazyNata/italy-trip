# Current Location Route Start Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Start sight and restaurant routes from the traveller's current browser location.

**Architecture:** Keep a one-time geolocation coordinate in each feature's React state. Pass it into the respective Mapbox map component, which renders a dedicated marker and includes it in bounds; prepend it only when producing route coordinates and Google Maps URLs.

**Tech Stack:** React 19, TypeScript, Mapbox GL JS 3, browser Geolocation API, Node 22, Vite.

## Global Constraints

- Use `navigator.geolocation.getCurrentPosition` with `{ enableHighAccuracy: true, timeout: 10000 }`.
- Keep location only in React state; do not persist it to trip data, local storage, or Supabase.
- Do not use `watchPosition`.
- Use a non-draggable blue marker with popup text `Вы здесь`.
- Preserve destination ordering and marker numbering.
- On geolocation failure, retain the existing routes and show a toast.
- Add no dependency or server-side service.

---

### Task 1: Add Current Location to the Walking Route

**Files:**
- Modify: `src/features/sights/Sights.tsx:151-323, 347-428, 653-668`

**Interfaces:**
- Produces: `userLocation: [number, number] | null` passed to `WalkingMap`.
- Consumes: browser `GeolocationPosition.coords.longitude` and `.latitude`.
- Extends: `WalkingMap` with `userLocation: [number, number] | null`.

- [ ] **Step 1: Add temporary walking-location state and lookup**

Add these states beside the existing route states:

```tsx
const [walkLocation, setWalkLocation] = useState<[number, number] | null>(null);
const [locatingWalk, setLocatingWalk] = useState(false);
```

Add `findWalkLocation`, using the existing `toast` helper:

```tsx
function findWalkLocation() {
  if (!navigator.geolocation) return toast("Геолокация недоступна в этом браузере");
  setLocatingWalk(true);
  navigator.geolocation.getCurrentPosition(
    (position) => {
      setWalkLocation([position.coords.longitude, position.coords.latitude]);
      setLocatingWalk(false);
      toast("Местоположение определено — маршрут начинается от вас");
    },
    () => {
      setLocatingWalk(false);
      toast("Не удалось определить местоположение");
    },
    { enableHighAccuracy: true, timeout: 10000 },
  );
}
```

- [ ] **Step 2: Add the walking-location control**

Place a button in the `.walk-controls` block after the day selector. It calls `findWalkLocation`, is disabled while `locatingWalk`, and switches icons and title according to state:

```tsx
<button
  type="button"
  onClick={findWalkLocation}
  disabled={locatingWalk}
  title={walkLocation ? "Местоположение найдено" : "Определить моё местоположение"}
  style={{ flex: "1 1 auto", justifyContent: "center", display: "inline-flex", alignItems: "center", border: "1px solid var(--line,#e7dcc7)", background: "var(--soft,#fdfaf3)", color: "var(--ink,#3b3228)", borderRadius: "var(--r-2)", padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: locatingWalk ? "wait" : "pointer" }}
>
  <i className={locatingWalk ? "fa-solid fa-spinner fa-spin" : walkLocation ? "fa-solid fa-location-dot" : "fa-solid fa-location-crosshairs"} style={{ marginRight: 5 }} />
  {walkLocation ? "Вы здесь" : "Моё место"}
</button>
```

- [ ] **Step 3: Prepend the location to the walking URL and map**

Build `routeCoordinates` before `mapUrl`:

```tsx
const routeCoordinates = walkLocation ? [walkLocation, ...located.map((sight) => sight.lnglat!)] : located.map((sight) => sight.lnglat!);
```

Build the Google Maps URL from `routeCoordinates`, preserving the existing two-or-more-point requirement and `travelmode=walking`. Pass `userLocation={walkLocation}` into `WalkingMap`.

- [ ] **Step 4: Render the marker and route from current position**

Extend `WalkingMap` props with `userLocation`. In the existing map setup:

```tsx
if (userLocation) {
  const locationMarker = new mapbox.Marker({ color: "#2a7089" })
    .setLngLat(userLocation)
    .setPopup(new mapbox.Popup({ offset: 18, closeButton: false }).setText("Вы здесь"))
    .addTo(map!);
  markers.push(locationMarker);
}
```

Extend bounds with `userLocation`. Change the Mapbox directions coordinate source to:

```tsx
const routeSights = userLocation ? [{ lnglat: userLocation }, ...sights] : sights;
const coordinates = routeSights.map((point) => point.lnglat!.join(",")).join(";");
```

Add `userLocation?.join(",")` to the map effect dependency array.

- [ ] **Step 5: Verify walking behavior manually**

Run `npm run dev`, open the `Достопримечательности` tab, then:

1. Open a walking route with at least two geocoded sights.
2. Click `Моё место` and allow the browser location request.
3. Confirm the blue `Вы здесь` marker appears, is included in the viewport, and the walking line starts there.
4. Click `Копировать маршрут`, paste its URL into a text field, and confirm `origin` is the current location.
5. Reload, deny the location request, and confirm a toast appears while the sight-only route remains usable.

- [ ] **Step 6: Commit the walking route work**

```bash
git add src/features/sights/Sights.tsx
git commit -m "Start walking routes from current location"
```

### Task 2: Add Current Location to the Restaurant Map

**Files:**
- Modify: `src/features/restaurants/Restaurants.tsx:72-98, 156-172, 293-300`
- Modify: `src/features/restaurants/RestaurantCityMap.tsx:7-31`

**Interfaces:**
- Consumes: existing `userLoc: [number, number] | null` from `Restaurants`.
- Extends: `RestaurantCityMap` with `userLocation: [number, number] | null`.
- Produces: a Google Maps route URL beginning at `userLoc` when available.

- [ ] **Step 1: Reuse the existing restaurant location lookup in map controls**

The current `findLocation` function already uses the required one-time high-accuracy lookup and stores `userLoc` only in state. Add a `Моё место` control to the restaurant-map controls after the city selector, calling `findLocation` and using `locating`/`userLoc` for its disabled state, label, and icon. Use the same button markup and copy as Task 1, replacing `locatingWalk` and `walkLocation` with `locating` and `userLoc`.

- [ ] **Step 2: Build Google Maps URLs from the current position**

Add:

```tsx
const mapRoutePoints = userLoc ? [userLoc, ...mappedRestaurants.map((item) => item.lnglat!)] : mappedRestaurants.map((item) => item.lnglat!);
```

Build `mapUrl` from `mapRoutePoints`: when there are two or more points use the first as `origin`, last as `destination`, and middle points as encoded `waypoints`; retain the existing one-destination search URL when `userLoc` is absent. When `userLoc` is present and only one restaurant is visible, create a directions URL from the user coordinate to that restaurant.

- [ ] **Step 3: Pass the coordinate into the restaurant map**

Update the render call:

```tsx
<RestaurantCityMap
  restaurants={mappedRestaurants.length ? mappedRestaurants : cityMappedRestaurants}
  focus={mapFocus}
  googleMapsUrl={mapUrl}
  userLocation={userLoc}
/>
```

- [ ] **Step 4: Render and bound the restaurant location marker**

Extend `RestaurantCityMap` props with `userLocation: [number, number] | null`. During map construction, before the numbered restaurant markers:

```tsx
if (userLocation) {
  bounds.extend(userLocation);
  new mapbox.Marker({ color: "#2a7089" })
    .setLngLat(userLocation)
    .setPopup(new mapbox.Popup({ offset: 18 }).setText("Вы здесь"))
    .addTo(map!);
}
```

Keep a reference to the marker with the other markers so cleanup removes it. Add `userLocation?.join(",")` to the map-creation effect dependencies.

- [ ] **Step 5: Verify restaurant behavior manually**

Run `npm run dev`, open the `Рестораны` tab, then:

1. Open `Карта ресторанов` for a city with mapped restaurants.
2. Click `Моё место` and allow location access.
3. Confirm the blue `Вы здесь` marker appears and remains unnumbered.
4. Click `Копировать маршрут`, paste the URL into a text field, and confirm the `origin` is the current location and restaurant order is preserved.
5. Deny the location request after a reload; confirm restaurants and their original route remain usable.

- [ ] **Step 6: Run production verification and commit**

```bash
npx --yes --package node@22 --call 'node --version && npm run build'
git add src/features/restaurants/Restaurants.tsx src/features/restaurants/RestaurantCityMap.tsx
git commit -m "Start restaurant routes from current location"
git push
```

Expected: Node reports v22 and Vite completes successfully.
