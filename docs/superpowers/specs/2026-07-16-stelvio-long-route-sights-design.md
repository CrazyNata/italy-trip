# Stelvio Long Route Sights Design

## Goal

Make Valdidentro day 2 follow the long Stelvio loop shown in the shared route by adding its missing stops and correcting Trafoi.

## Data

- Keep existing day-2 sights through `Санта-Мария-Валь-Мюстаир`.
- Do not add `Paclera 20`: it is the address of the existing Santa Maria point.
- Add three day-2 sights in this order before Trafoi:
  - `Мальс (Маллес-Веноста)`: `[10.5465492, 46.6879187]`.
  - `Кольцо Монтекиаро`: `[10.573193, 46.636571]`.
  - `Гомагои`: `[10.5409740, 46.5762418]`.
- Correct existing `stelvio_trafoi` coordinates to `[10.5102872, 46.5522462]`.
- Renumber only day-2 `walkOrder` values so the sequence is Santa Maria, Mals, Montechiaro, Gomagoi, Trafoi, return.

## Verification

- Day 2 has 11 sights, ordered from `walkOrder` 0 through 10.
- The three new points and corrected Trafoi have valid coordinates.
- Day-2 map route travels north to Mals and returns via Montechiaro and Gomagoi before Trafoi.
