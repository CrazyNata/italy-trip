# Remove Geocode Controls Design

## Goal

Remove the manual `Найти точки` controls from the walking-route and restaurant-map panels.

## Scope

- Remove the `Найти точки` button from `src/features/sights/Sights.tsx`.
- Remove the `Найти точки` button from `src/features/restaurants/Restaurants.tsx`.
- Keep existing saved destination coordinates, `Моё место` geolocation controls, map markers, route URLs, and geocoding functions unchanged.

## Verification

- Neither map-control row contains visible `Найти точки` text.
- `Моё место` remains visible in both map-control rows.
- A Node 22 production build completes successfully.
