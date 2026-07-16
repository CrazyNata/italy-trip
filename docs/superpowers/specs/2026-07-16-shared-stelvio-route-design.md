# Shared Stelvio Route Design

## Goal

Use the user-provided Google Maps route as the complete 7 October Valdidentro driving route.

## Data

- Replace only `dayMapUrl` on itinerary day `d12`.
- Set it exactly to `https://maps.app.goo.gl/vyvqZHin4MxoVpNi9`.
- Do not decode or rebuild the shared route; Google Maps owns its route geometry and stops.
- Preserve every other day, sight, itinerary item, and trip value.

## Verification

- `d12.dayMapUrl` exactly equals the provided URL.
- No other `days` entry changes.
