# Remove Geocode Controls Design

## Goal

Remove the manual `Найти точки` controls from the walking-route and restaurant-map panels.

## Scope

- Remove the `Найти точки` button from `src/features/sights/Sights.tsx`.
- Remove the `Найти точки` button from `src/features/restaurants/Restaurants.tsx`.
- Rename the geolocation control from `Моё место` to `Моё местоположение` in both panels.
- Keep existing saved destination coordinates, geolocation behavior, map markers, route URLs, and geocoding functions unchanged.

## Verification

- Neither map-control row contains visible `Найти точки` text.
- `Моё местоположение` remains visible in both map-control rows.
- A Node 22 production build completes successfully.
