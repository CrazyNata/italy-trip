# Milan Budget Restaurants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ten practical, non-duplicate budget restaurant recommendations for Milan to the shared trip.

**Architecture:** The restaurant list is stored inside the JSON payload of the single `public.trip_state` row with `id = 'main'`. No application code changes are required: research the places, validate names and coordinates, then append normalized `Restaurant` records to `payload.data.restaurants` without altering existing entries.

**Tech Stack:** Supabase Postgres JSONB, Google Maps URLs, existing React `Restaurant` data model.

## Global Constraints

- Add exactly ten restaurants in Milan, Italy.
- Use only `€` or `€€` price levels and status `хочу`.
- Cover Ortica, Porta Venezia, Brera/centre and Navigli where suitable.
- Do not duplicate any existing restaurant name in `payload.data.restaurants`.
- Include name, city, area, Google Maps link, coordinates, price, and a concise Russian note.
- Do not add photos.

---

### Task 1: Research and validate ten places

**Files:**
- Read: `src/types/trip.ts:69-90`
- Read: `docs/superpowers/specs/2026-07-14-milan-budget-restaurants-design.md`

**Interfaces:**
- Consumes: `Restaurant` fields `id`, `name`, `city`, `status`, `note`, `link`, `price`, `area`, and `lnglat`.
- Produces: ten distinct `Restaurant` JSON objects suitable for the shared trip payload.

- [ ] **Step 1: Read the restaurant data contract**

Confirm that coordinates are `[longitude, latitude]`, prices are one of `€`, `€€`, `€€€`, `€€€€`, and all other required fields are strings.

- [ ] **Step 2: Search current sources for each candidate**

Use the restaurant's official site or Google Maps listing to confirm it is open in Milan, its address, cuisine, and approximate price level. Prefer the following geographic distribution: two near Ortica, two in Porta Venezia, three in Brera/centre, and three around Navigli.

- [ ] **Step 3: Validate candidates against existing trip data**

Run:

```sql
select restaurant->>'name' as name
from public.trip_state,
  jsonb_array_elements(payload->'data'->'restaurants') as restaurant
where id = 'main'
  and restaurant->>'city' = 'Милан, Италия'
order by name;
```

Expected: no candidate shares an existing name, including `Trattoria Famiglia Conconi`, `Osteria del Generale`, `Osteria del Treno`, `Trattoria Milanese`, `Al Matarel`, or `Trattoria Masuelli San Marco`.

### Task 2: Append the validated records to the trip payload

**Files:**
- Modify: `public.trip_state` row `id = 'main'`

**Interfaces:**
- Consumes: the ten validated `Restaurant` objects from Task 1.
- Produces: `payload.data.restaurants` with ten additional records and every prior record unchanged.

- [ ] **Step 1: Build the ten normalized records**

Use a stable ID prefixed with `r_milan_`, city `Милан, Италия`, status `хочу`, a Google Maps search URL, and `[longitude, latitude]` coordinates for each entry. Keep notes limited to cuisine, location, and any practical booking or queue advice.

- [ ] **Step 2: Append all records in one guarded transaction**

Run a single SQL transaction that locks the `main` row, verifies the current payload contains no matching names, then uses `jsonb_set` to append the ten objects to `payload.data.restaurants`. Update `updated_at` to `now()` only after the no-duplicates check passes.

- [ ] **Step 3: Confirm the result**

Run:

```sql
select count(*) as milan_restaurants
from public.trip_state,
  jsonb_array_elements(payload->'data'->'restaurants') as restaurant
where id = 'main'
  and restaurant->>'city' = 'Милан, Италия';
```

Expected: the count increases by ten from the baseline captured in Task 1.

- [ ] **Step 4: Verify fields and duplicates**

Run:

```sql
select restaurant->>'name' as name,
       restaurant->>'area' as area,
       restaurant->>'price' as price,
       restaurant->'lnglat' as lnglat
from public.trip_state,
  jsonb_array_elements(payload->'data'->'restaurants') as restaurant
where id = 'main'
  and restaurant->>'city' = 'Милан, Италия'
order by name;
```

Expected: each new record has a non-empty area, price `€` or `€€`, and two numeric coordinates; every Milan restaurant name appears once.

- [ ] **Step 5: Commit the plan and record the published selection**

```bash
git add docs/superpowers/plans/2026-07-14-milan-budget-restaurants.md
git commit -m "Plan Milan budget restaurant additions"
```
