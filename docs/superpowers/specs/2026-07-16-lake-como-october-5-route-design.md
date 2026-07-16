# Lake Como October 5 Route Design

## Goal

Expose the existing Lake Como sightseeing loop as the itinerary route for 5 October.

## Data

- Modify only itinerary day `d11` (`2026-10-05`, Milan).
- Set `dayMapUrl` to a Google Maps driving Directions URL using the existing Lake Como sight order: Milan home, Como, Cernobbio, Balbianello, Villa Carlotta, Menaggio, Gravedona, Varenna, Bellano, Bellagio, Lecco, Milan home.
- Preserve all itinerary items and every sight record.

## Verification

- `d11.dayMapUrl` contains driving mode, Milan home as origin/destination, and the ten intermediate Lake Como stops.
- No other day changes.
