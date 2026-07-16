# Daily Expenses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one fuel expense and sixteen daily expenses to the live trip budget.

**Architecture:** Store all new amounts as EUR in `public.trip_state.payload.data.expenses`, matching the existing `Expense` model. Append the records in one timestamp-guarded JSONB update so unrelated state is retained; the existing budget currency selector converts their display to RUB and CZK.

**Tech Stack:** Supabase Postgres JSONB, React budget data model, Node 22 Vite build.

## Global Constraints

- Add `Бензин` in `транспорт` for `351.04 EUR`.
- Add sixteen `разное` expenses of `100 EUR`, from 28 September through 13 October 2026 inclusive.
- Use labels `Дневные траты · 28 сентября` through `Дневные траты · 13 октября`.
- Keep `trip.start` and `trip.end` unchanged.
- Do not modify existing expense records.

---

### Task 1: Append And Verify Budget Expenses

**Files:**
- Modify: `public.trip_state` row `id = 'main'`

**Interfaces:**
- Consumes: `payload.data.expenses`, a JSON array of `Expense` records with `id`, `label`, `category`, and EUR `amount`.
- Produces: 17 new records, bringing the existing 2-record budget to 19 records.

- [ ] **Step 1: Read the timestamp and existing expense baseline**

```sql
select updated_at, jsonb_array_length(payload->'data'->'expenses') as expense_count
from public.trip_state
where id = 'main';
```

Expected: two existing expenses; use the returned timestamp as the update guard.

- [ ] **Step 2: Append the exact 17-record array with the timestamp guard**

Use a `jsonb_set` update that appends these objects to `payload #> '{data,expenses}'`:

```json
[
  {"id":"e_fuel_2026","label":"Бензин","category":"транспорт","amount":351.04},
  {"id":"e_daily_2026_09_28","label":"Дневные траты · 28 сентября","category":"разное","amount":100},
  {"id":"e_daily_2026_09_29","label":"Дневные траты · 29 сентября","category":"разное","amount":100},
  {"id":"e_daily_2026_09_30","label":"Дневные траты · 30 сентября","category":"разное","amount":100},
  {"id":"e_daily_2026_10_01","label":"Дневные траты · 1 октября","category":"разное","amount":100},
  {"id":"e_daily_2026_10_02","label":"Дневные траты · 2 октября","category":"разное","amount":100},
  {"id":"e_daily_2026_10_03","label":"Дневные траты · 3 октября","category":"разное","amount":100},
  {"id":"e_daily_2026_10_04","label":"Дневные траты · 4 октября","category":"разное","amount":100},
  {"id":"e_daily_2026_10_05","label":"Дневные траты · 5 октября","category":"разное","amount":100},
  {"id":"e_daily_2026_10_06","label":"Дневные траты · 6 октября","category":"разное","amount":100},
  {"id":"e_daily_2026_10_07","label":"Дневные траты · 7 октября","category":"разное","amount":100},
  {"id":"e_daily_2026_10_08","label":"Дневные траты · 8 октября","category":"разное","amount":100},
  {"id":"e_daily_2026_10_09","label":"Дневные траты · 9 октября","category":"разное","amount":100},
  {"id":"e_daily_2026_10_10","label":"Дневные траты · 10 октября","category":"разное","amount":100},
  {"id":"e_daily_2026_10_11","label":"Дневные траты · 11 октября","category":"разное","amount":100},
  {"id":"e_daily_2026_10_12","label":"Дневные траты · 12 октября","category":"разное","amount":100},
  {"id":"e_daily_2026_10_13","label":"Дневные траты · 13 октября","category":"разное","amount":100}
]
```

Expected: one updated row and `expense_count = 19`.

- [ ] **Step 3: Verify stored expense requirements**

```sql
select
  jsonb_array_length(payload->'data'->'expenses') as expense_count,
  count(*) filter (where item->>'id' = 'e_fuel_2026' and (item->>'amount')::numeric = 351.04) as fuel,
  count(*) filter (where item->>'id' like 'e_daily_2026_%' and (item->>'amount')::numeric = 100) as daily,
  sum((item->>'amount')::numeric) filter (where item->>'id' = 'e_fuel_2026' or item->>'id' like 'e_daily_2026_%') as new_total,
  count(distinct item->>'id') as unique_ids
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'expenses') item
where id = 'main'
group by payload;
```

Expected: `19`, `1`, `16`, `1951.04`, and `19`.

- [ ] **Step 4: Run the production build**

```bash
npx --yes --package node@22 --call 'node --version && npm run build'
```

Expected: Node reports v22 and Vite completes successfully.

- [ ] **Step 5: Commit the research documentation only if it changes**

The budget itself is live Supabase data; no source file changes are expected. If an accompanying documentation file is changed, inspect it with `git diff --check`, commit it with a focused message, and push `main`.
