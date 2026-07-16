# Daily Expenses Design

## Goal

Add fuel and daily spending allowances to the trip budget while preserving EUR as the stored currency.

## Data

- Add one `транспорт` expense: `Бензин`, stored as `351.04 EUR`.
- The conversion uses the app's 16 July 2026 rate: `1 EUR = 24.214081 CZK = 88.957512 RUB`; `8,500 CZK = 351.04 EUR = 31,227 RUB` rounded to whole rubles.
- Add 16 `разное` expenses, one for each calendar date from 28 September through 13 October 2026 inclusive.
- Each daily expense has amount `100 EUR`, equivalent at the cited rate to `2,421 CZK` and `8,896 RUB` rounded to whole units.
- Keep the trip dates unchanged. The 13 October daily expense is intentional even though the current trip end remains 12 October.

## Presentation

- Use labels `Дневные траты · 28 сентября` through `Дневные траты · 13 октября`.
- The existing budget selector continues to render all entries in EUR, RUB, or CZK using its current rate source.

## Verification

- The budget contains 19 entries: the two existing entries plus 17 new entries.
- New expenses total `1,951.04 EUR`.
- Exactly one new fuel entry and exactly 16 daily entries exist, with no duplicate IDs.
