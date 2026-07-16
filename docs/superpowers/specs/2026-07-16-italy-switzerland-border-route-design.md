# Italy-Switzerland Border Route Design

## Goal

Add the Italy-Switzerland border detour as a visible stop in the 7 October Valdidentro driving route.

## Data

- Modify only `dayMapUrl` for itinerary day `d12` (`2026-10-06`, `Вальдидентро`).
- Insert the encoded Google Maps waypoint `Italy-Switzerland border` immediately after the existing Passo dello Stelvio coordinate waypoint.
- Preserve the existing origin, destination, other waypoints, travel mode, trip days, and sights.

## Verification

- The saved URL retains all existing six coordinate waypoints plus the named border waypoint.
- The URL starts with `https://www.google.com/maps/dir/?api=1` and includes `travelmode=driving`.
- No other itinerary day changes.
