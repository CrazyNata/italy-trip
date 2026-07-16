# Stelvio Long Route Sights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Valdidentro day-2 sights so its map follows the long Stelvio loop.

**Architecture:** Update the live `sights` JSON array in one timestamp-guarded operation. Insert three new `Sight` objects after Santa Maria, correct Trafoi coordinates, and renumber only day-2 `walkOrder` values.

**Tech Stack:** Supabase Postgres JSONB, existing `Sight` model, Mapbox route map.

## Global Constraints

- Keep all existing day-2 sights through Santa Maria unchanged.
- Add Mals, Montechiaro, and Gomagoi before Trafoi.
- Set Trafoi to `[10.5102872, 46.5522462]`.
- Do not create a separate Paclera sight because it duplicates Santa Maria.

---

### Task 1: Update The Day-2 Sights

**Files:**
- Modify: `public.trip_state` row `id = 'main'`

**Interfaces:**
- Consumes: sights whose `city` is `Вальдидентро, Италия` and `walkDay` is `2`.
- Produces: an 11-point day-2 route with orders 0 through 10.

- [ ] **Step 1: Read the timestamp and current day-2 sights**

```sql
select updated_at, item
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'sights') item
where id = 'main' and item->>'city' = 'Вальдидентро, Италия' and item->>'walkDay' = '2'
order by (item->>'walkOrder')::integer;
```

- [ ] **Step 2: Append the three new sights**

Append these exact objects to `payload.data.sights`:

```json
[
  {"id":"stelvio_mals","name":"Мальс (Маллес-Веноста)","city":"Вальдидентро, Италия","group":"необязательные","subcategory":"разное","done":false,"walkDay":2,"walkOrder":6,"lnglat":[10.5465492,46.6879187]},
  {"id":"stelvio_montechiaro","name":"Кольцо Монтекиаро","city":"Вальдидентро, Италия","group":"необязательные","subcategory":"разное","done":false,"walkDay":2,"walkOrder":7,"lnglat":[10.573193,46.636571]},
  {"id":"stelvio_gomagoi","name":"Гомагои","city":"Вальдидентро, Италия","group":"необязательные","subcategory":"разное","done":false,"walkDay":2,"walkOrder":8,"lnglat":[10.540974,46.5762418]}
]
```

- [ ] **Step 3: Correct and renumber existing day-2 items**

In the same update, set `stelvio_trafoi.lnglat` to `[10.5102872, 46.5522462]` and `walkOrder` to `9`. Set `stelvio_return.walkOrder` to `10`. Preserve all other day-2 sight properties.

- [ ] **Step 4: Verify the stored route**

```sql
select item->>'name' as name, item->>'walkOrder' as walk_order, item->'lnglat' as lnglat
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'sights') item
where id = 'main' and item->>'city' = 'Вальдидентро, Италия' and item->>'walkDay' = '2'
order by (item->>'walkOrder')::integer;
```

Expected: 11 records ordered 0–10, with the three new stops before corrected Trafoi.
