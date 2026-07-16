# Expanded Prague Sights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Prague’s two existing walking days to 12 and 11 sights without altering the trip calendar.

**Architecture:** This is a data-only update. Append eight ordered Prague `Sight` records and atomically update the `walkOrder` values of the existing Prague records in `trip_state.main.payload.data.sights`; the existing Sights map renders the routes automatically.

**Tech Stack:** Supabase Postgres JSONB, existing React Sights map, Node 22 Vite build.

## Global Constraints

- Do not change trip calendar days or non-Prague sights.
- Add exactly eight Prague sights with valid coordinates, categories, Russian descriptions, and `done: false`.
- Day 1 has 12 contiguous walk orders 0 through 11; day 2 has 11 contiguous orders 0 through 10.
- Preserve all unrelated payload data and run the production build under Node 22.

---

### Task 1: Update Prague Walking Routes

**Files:**
- Modify: `public.trip_state` row where `id = 'main'`
- Modify: `docs/superpowers/research/2026-07-16-prague-sights.md`

**Interfaces:**
- Consumes: 15 existing Prague `Sight` records and the live `updated_at` timestamp.
- Produces: 23 Prague `Sight` records arranged into two contiguous walking routes.

- [x] **Step 1: Capture the live timestamp and Prague baseline**

```sql
select updated_at, item->>'id' id, item->>'walkDay' walk_day, item->>'walkOrder' walk_order
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'sights') item
where trip_state.id = 'main' and item->>'city' = 'Прага, Чехия'
order by (item->>'walkDay')::integer, (item->>'walkOrder')::integer;
```

Expected: 15 rows and one timestamp.

- [x] **Step 2: Append the eight researched sights**

Append these records with the same field shape used by existing Prague sights:

```json
[
  {"id":"s_prague_powder_tower","name":"Пороховая башня","city":"Прага, Чехия","group":"обязательные","subcategory":"достопримечательности","done":false,"description":"Готическая городская башня и парадный вход в Старый город.","walkDay":1,"walkOrder":1,"lnglat":[14.42710,50.08760]},
  {"id":"s_prague_municipal_house","name":"Общественный дом","city":"Прага, Чехия","group":"необязательные","subcategory":"достопримечательности","done":false,"description":"Выдающееся здание в стиле модерн с концертным залом Сметаны.","walkDay":1,"walkOrder":2,"lnglat":[14.42900,50.08780]},
  {"id":"s_prague_kampa","name":"Остров Кампа","city":"Прага, Чехия","group":"необязательные","subcategory":"природа","done":false,"description":"Спокойный остров-парк у Карлова моста с видом на реку и мельницу.","walkDay":1,"walkOrder":6,"lnglat":[14.40580,50.08480]},
  {"id":"s_prague_petrin","name":"Петршинские сады","city":"Прага, Чехия","group":"необязательные","subcategory":"природа","done":false,"description":"Холм с садами и широкими видами на историческую Прагу.","walkDay":1,"walkOrder":11,"lnglat":[14.39500,50.08380]},
  {"id":"s_prague_old_jewish_cemetery","name":"Старое еврейское кладбище","city":"Прага, Чехия","group":"обязательные","subcategory":"достопримечательности","done":false,"description":"Историческое кладбище Йозефова с плотными рядами старинных надгробий.","walkDay":2,"walkOrder":2,"lnglat":[14.42110,50.09050]},
  {"id":"s_prague_spanish_synagogue","name":"Испанская синагога","city":"Прага, Чехия","group":"обязательные","subcategory":"достопримечательности","done":false,"description":"Синагога с эффектным мавританским интерьером в Еврейском квартале.","walkDay":2,"walkOrder":3,"lnglat":[14.42490,50.09020]},
  {"id":"s_prague_franciscan_garden","name":"Францисканский сад","city":"Прага, Чехия","group":"необязательные","subcategory":"природа","done":false,"description":"Тихий сад в центре города рядом с Вацлавской площадью.","walkDay":2,"walkOrder":5,"lnglat":[14.42660,50.08050]},
  {"id":"s_prague_naplavka","name":"Набережная Наплавка","city":"Прага, Чехия","group":"необязательные","subcategory":"развлечения","done":false,"description":"Живая набережная Влтавы с барами, рынками и видом на Пражский град.","walkDay":2,"walkOrder":8,"lnglat":[14.41600,50.07270]}
]
```

- [x] **Step 3: Reassign existing walk orders in the same update**

Set these existing IDs to the following orders: day 1: `s_prague_old_town=0`, `s_prague_klementinum=3`, `s_prague_charles_bridge=4`, `s_prague_lesser_town=5`, `s_prague_st_nicholas=7`, `s_prague_castle=8`, `s_prague_st_vitus=9`, `s_prague_golden_lane=10`; day 2: `s_prague_jewish_quarter=0`, `s_prague_old_new_synagogue=1`, `s_prague_wenceslas=4`, `s_prague_national_museum=6`, `s_prague_dancing_house=7`, `s_prague_vysehrad=9`, `s_prague_st_peter_paul=10`.

- [x] **Step 4: Apply one timestamp-guarded update**

Append the Step 2 array and modify only the listed `walkOrder` fields in one `jsonb_set` update guarded by the timestamp from Step 1. Expected: one returned row and the total sight count increases from 114 to 122.

- [x] **Step 5: Verify both route shapes**

```sql
select item->>'walkDay' walk_day, count(*) sights,
       array_agg((item->>'walkOrder')::integer order by (item->>'walkOrder')::integer) walk_orders,
       count(*) filter (where jsonb_array_length(item->'lnglat') = 2) located
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'sights') item
where trip_state.id = 'main' and item->>'city' = 'Прага, Чехия'
group by item->>'walkDay'
order by walk_day;
```

Expected: day 1 has 12 points with `{0,1,2,3,4,5,6,7,8,9,10,11}`; day 2 has 11 points with `{0,1,2,3,4,5,6,7,8,9,10}`; `located` equals each count.

- [x] **Step 6: Build and commit**

```bash
npx --yes --package node@22 --call 'node --version && npm run build'
git add docs/superpowers/research/2026-07-16-prague-sights.md
git commit -m "Expand Prague sightseeing routes"
```

Expected: Node 22 Vite build exits successfully and the evidence update is committed.
