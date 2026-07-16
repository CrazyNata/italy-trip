# Prague Sights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two complete Prague walking days to the existing Sights tab.

**Architecture:** Add Prague's two labels to the existing `cityDayLabels` record, then append 15 ordered `Sight` objects to `trip_state.main.payload.data.sights` with one timestamp-guarded JSONB update. The current map, route, controls, and cards render them without structural UI changes.

**Tech Stack:** React 19, TypeScript, Mapbox walking directions, Supabase Postgres JSONB, Node 22 Vite build.

## Global Constraints

- Do not change the trip calendar or dates.
- Add only `Sight` records with `city: "Прага, Чехия"`.
- Create eight day-1 sights and seven day-2 sights with contiguous `walkOrder` from zero.
- Every record has a valid `[longitude, latitude]` coordinate, category, and concise Russian description.
- Preserve all existing trip data and run the production build under Node 22.

---

### Task 1: Add Prague Day Labels

**Files:**
- Modify: `src/features/sights/Sights.tsx:38-54`

**Interfaces:**
- Consumes: `Sight.city` and `Sight.walkDay`.
- Produces: human-readable labels for Prague days 1 and 2 in the existing day selector and route-card heading.

- [ ] **Step 1: Add labels to `cityDayLabels`**

Insert this property after the Rome entry:

```ts
"Прага, Чехия": {
  1: "День 1: Старый город, мост и Град",
  2: "День 2: кварталы и Вышеград",
},
```

- [ ] **Step 2: Verify the production build**

Run:

```bash
npx --yes --package node@22 --call 'node --version && npm run build'
```

Expected: Node 22 is printed and the Vite build exits successfully.

- [ ] **Step 3: Commit the label change**

```bash
git add src/features/sights/Sights.tsx
git commit -m "Add Prague sightseeing day labels"
```

### Task 2: Append Prague Sights

**Files:**
- Modify: `public.trip_state` row where `id = 'main'`
- Create: `docs/superpowers/research/2026-07-16-prague-sights.md`

**Interfaces:**
- Consumes: live `payload.data.sights` and `updated_at` from `trip_state.main`.
- Produces: 15 Prague `Sight` records with a complete two-day walking route.

- [ ] **Step 1: Record the 15 researched objects**

Create `docs/superpowers/research/2026-07-16-prague-sights.md` with these exact rows:

```json
[
  {"id":"s_prague_old_town","name":"Староместская площадь и часы Орлой","city":"Прага, Чехия","group":"обязательные","subcategory":"достопримечательности","done":false,"description":"Сердце Старого города: готическая ратуша и знаменитые астрономические часы.","walkDay":1,"walkOrder":0,"lnglat":[14.42076,50.08700]},
  {"id":"s_prague_klementinum","name":"Клементинум","city":"Прага, Чехия","group":"обязательные","subcategory":"достопримечательности","done":false,"description":"Исторический иезуитский комплекс с барочной библиотекой и башней с видом на центр.","walkDay":1,"walkOrder":1,"lnglat":[14.41650,50.08600]},
  {"id":"s_prague_charles_bridge","name":"Карлов мост","city":"Прага, Чехия","group":"обязательные","subcategory":"достопримечательности","done":false,"description":"Каменный мост XIV века со статуями и панорамой Влтавы.","walkDay":1,"walkOrder":2,"lnglat":[14.41140,50.08650]},
  {"id":"s_prague_lesser_town","name":"Малостранская площадь","city":"Прага, Чехия","group":"обязательные","subcategory":"достопримечательности","done":false,"description":"Барочная площадь в Малой Стране у подножия Пражского града.","walkDay":1,"walkOrder":3,"lnglat":[14.40370,50.08800]},
  {"id":"s_prague_st_nicholas","name":"Церковь Святого Николая","city":"Прага, Чехия","group":"обязательные","subcategory":"достопримечательности","done":false,"description":"Главный барочный храм Малой Страны с богатым интерьером.","walkDay":1,"walkOrder":4,"lnglat":[14.40330,50.08820]},
  {"id":"s_prague_castle","name":"Пражский град","city":"Прага, Чехия","group":"обязательные","subcategory":"достопримечательности","done":false,"description":"Обширный замковый комплекс с дворцами, садами и видами на город.","walkDay":1,"walkOrder":5,"lnglat":[14.40050,50.09110]},
  {"id":"s_prague_st_vitus","name":"Собор Святого Вита","city":"Прага, Чехия","group":"обязательные","subcategory":"достопримечательности","done":false,"description":"Готический собор и архитектурная доминанта Пражского града.","walkDay":1,"walkOrder":6,"lnglat":[14.40050,50.09090]},
  {"id":"s_prague_golden_lane","name":"Злата улочка","city":"Прага, Чехия","group":"обязательные","subcategory":"достопримечательности","done":false,"description":"Короткая улица с яркими историческими домиками внутри Града.","walkDay":1,"walkOrder":7,"lnglat":[14.40300,50.09270]},
  {"id":"s_prague_jewish_quarter","name":"Еврейский квартал Йозефов","city":"Прага, Чехия","group":"обязательные","subcategory":"достопримечательности","done":false,"description":"Исторический квартал с синагогами, музеем и старым кладбищем.","walkDay":2,"walkOrder":0,"lnglat":[14.42330,50.09030]},
  {"id":"s_prague_old_new_synagogue","name":"Староновая синагога","city":"Прага, Чехия","group":"обязательные","subcategory":"достопримечательности","done":false,"description":"Одна из старейших действующих синагог Европы.","walkDay":2,"walkOrder":1,"lnglat":[14.42260,50.09000]},
  {"id":"s_prague_wenceslas","name":"Вацлавская площадь","city":"Прага, Чехия","group":"обязательные","subcategory":"достопримечательности","done":false,"description":"Главный городской бульвар с памятником Святому Вацлаву.","walkDay":2,"walkOrder":2,"lnglat":[14.43000,50.08100]},
  {"id":"s_prague_national_museum","name":"Национальный музей","city":"Прага, Чехия","group":"обязательные","subcategory":"музеи","done":false,"description":"Главный музей Чехии в монументальном здании у верхней части Вацлавской площади.","walkDay":2,"walkOrder":3,"lnglat":[14.43080,50.07960]},
  {"id":"s_prague_dancing_house","name":"Танцующий дом","city":"Прага, Чехия","group":"необязательные","subcategory":"достопримечательности","done":false,"description":"Знаменитое современное здание на набережной Влтавы.","walkDay":2,"walkOrder":4,"lnglat":[14.41410,50.07550]},
  {"id":"s_prague_vysehrad","name":"Вышеград","city":"Прага, Чехия","group":"обязательные","subcategory":"достопримечательности","done":false,"description":"Тихая историческая крепость с парком и панорамой реки.","walkDay":2,"walkOrder":5,"lnglat":[14.41750,50.06460]},
  {"id":"s_prague_st_peter_paul","name":"Базилика Святых Петра и Павла","city":"Прага, Чехия","group":"обязательные","subcategory":"достопримечательности","done":false,"description":"Неоготическая базилика и символ Вышеграда.","walkDay":2,"walkOrder":6,"lnglat":[14.41830,50.06360]}
]
```

- [ ] **Step 2: Re-read the live row immediately before write**

```sql
select updated_at, jsonb_array_length(payload->'data'->'sights') as sight_count
from public.trip_state
where id = 'main';
```

Expected: record timestamp and sight count. Do not use a stale timestamp.

- [ ] **Step 3: Append records atomically**

Append the exact JSON array from Step 1 to `payload.data.sights` with `jsonb_set`, guard with the Step 2 timestamp, and return the new count. Expected: one updated row and count increases by 15.

- [ ] **Step 4: Verify persisted route shape**

```sql
select
  item->>'walkDay' as walk_day,
  count(*) as sights,
  array_agg((item->>'walkOrder')::integer order by (item->>'walkOrder')::integer) as walk_orders,
  count(*) filter (where jsonb_array_length(item->'lnglat') = 2) as located
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'sights') item
where trip_state.id = 'main' and item->>'city' = 'Прага, Чехия'
group by item->>'walkDay'
order by walk_day;
```

Expected: day 1 is 8 sights with orders `{0,1,2,3,4,5,6,7}`; day 2 is 7 sights with orders `{0,1,2,3,4,5,6}`; `located` equals each day’s count.

- [ ] **Step 5: Build and commit**

```bash
npx --yes --package node@22 --call 'node --version && npm run build'
git add docs/superpowers/research/2026-07-16-prague-sights.md
git commit -m "Add Prague sightseeing routes"
```

Expected: Node 22 Vite build exits successfully and evidence is committed.
