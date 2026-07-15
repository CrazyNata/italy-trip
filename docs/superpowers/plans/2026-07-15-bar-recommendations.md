# Bar Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 35 researched, highly rated walk-in bars to the existing trip restaurant list.

**Architecture:** This is a production data update, not a UI feature. Research produces 35 complete `Restaurant` JSON objects; one guarded SQL update appends them to `public.trip_state.payload.data.restaurants`, preserving the rest of the trip payload.

**Tech Stack:** Supabase Postgres JSONB, Google Maps business listings, existing React restaurant UI.

## Global Constraints

- Cover Rome, Milan, Chioggia, Munich, Verona, Figline Valdarno, and Castel Gandolfo only.
- Add exactly five new places per city, excluding every stored place with the same normalized name and city.
- Every added place must have a current Google rating of 4.3 or higher, a Google Maps URL, review count, and coordinates.
- Set `status` to `"хочу"`, `placeType` to `"бар"`, and `categories` to `["бар"]`.
- Do not add photos, priority, booking information, or personal ratings.
- Do not edit existing restaurant records or unrelated trip data.

---

### Task 1: Capture a Current, De-duplicated Research Baseline

**Files:**
- Modify: `public.trip_state` row where `id = 'main'` only in Task 3.
- Create: `docs/superpowers/research/2026-07-15-bars.md`

**Interfaces:**
- Consumes: `public.trip_state.payload.data.restaurants` JSON array.
- Produces: A research table containing 35 candidate records with city, name, Google rating, review count, Maps URL, longitude/latitude, and Russian drink note.

- [ ] **Step 1: Read the current restaurant names before research**

Run this read-only query:

```sql
select
  item->>'city' as city,
  item->>'name' as name,
  item->>'placeType' as place_type,
  item->'categories' as categories
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'restaurants') as item
where id = 'main'
order by city, name;
```

Expected: Existing entries are available as a de-duplication list; do not select a candidate with the same lower-cased, trimmed name and city.

- [ ] **Step 2: Research five distinct candidates for each target city**

For every candidate, use its Google Maps business listing and record all fields in `docs/superpowers/research/2026-07-15-bars.md` using this exact table shape:

```markdown
| City | Name | Rating | Reviews | Google Maps URL | Longitude | Latitude | Note |
| --- | --- | ---: | ---: | --- | ---: | ---: | --- |
| Rome | Example bar | 4.5 | 1200 | https://www.google.com/maps/search/?api=1&query=Example%20bar%2C%20Rome | 12.500000 | 41.900000 | Коктейли и аперитив перед ужином. |
```

Accept a candidate only when the listing is open, in the intended city, is suitable for a walk-in drink, has rating `>= 4.3`, and is not in the baseline. Select a mix of wine, beer, and cocktail options where the city supports it.

- [ ] **Step 3: Validate the candidate table before writing data**

Run this query against the 35 researched candidates pasted as JSON; it must return zero rows:

```sql
with candidates(city, name, google_rating, google_maps_url, lng, lat) as (
  values
    ('CITY', 'NAME', 4.3::numeric, 'https://www.google.com/maps/search/?api=1&query=NAME', 0.0::numeric, 0.0::numeric)
)
select *
from candidates
where google_rating < 4.3
   or google_maps_url !~ '^https://www\\.google\\.com/maps/'
   or lng = 0
   or lat = 0;
```

Replace the single sample `values` row with all 35 researched rows before execution. Expected: `0 rows`.

- [ ] **Step 4: Commit the research evidence**

```bash
git add docs/superpowers/research/2026-07-15-bars.md
git commit -m "Document researched bar recommendations"
git push
```

### Task 2: Append the Validated Bar Records Atomically

**Files:**
- Modify: `public.trip_state` row where `id = 'main'`
- Modify: `docs/superpowers/research/2026-07-15-bars.md`

**Interfaces:**
- Consumes: The 35 validated table rows from Task 1.
- Produces: 35 new `Restaurant` JSON records in `payload.data.restaurants`.

- [ ] **Step 1: Re-read the live payload immediately before writing**

Run:

```sql
select updated_at, jsonb_array_length(payload->'data'->'restaurants') as restaurant_count
from public.trip_state
where id = 'main';
```

Expected: Record the timestamp and count in the research document. If the count differs from the baseline, repeat Task 1 Step 1 and remove any newly introduced duplicate candidates.

- [ ] **Step 2: Build the 35-record JSON array**

Translate every validated research-table row into this exact shape, using a unique `bar_<city>_<slug>` id and the researched values:

```json
{
  "id": "bar_rome_example_bar",
  "name": "Example bar",
  "city": "Рим",
  "status": "хочу",
  "note": "Коктейли и аперитив перед ужином.",
  "link": "https://www.google.com/maps/search/?api=1&query=Example%20bar%2C%20Rome",
  "googleRating": 4.5,
  "googleReviews": 1200,
  "placeType": "бар",
  "categories": ["бар"],
  "lnglat": [12.5, 41.9]
}
```

- [ ] **Step 3: Append the records without overwriting concurrent changes**

Use a single update. Replace `NEW_BARS_JSON` with the complete 35-record JSON array and replace `EXPECTED_UPDATED_AT` with the timestamp read in Step 1.

```sql
update public.trip_state
set payload = jsonb_set(
  payload,
  '{data,restaurants}',
  (payload->'data'->'restaurants') || 'NEW_BARS_JSON'::jsonb
),
updated_at = now()
where id = 'main'
  and updated_at = 'EXPECTED_UPDATED_AT'::timestamptz
returning updated_at, jsonb_array_length(payload->'data'->'restaurants') as restaurant_count;
```

Expected: exactly one returned row and the restaurant count increases by 35. If no row is returned, do not retry with the old array; return to Step 1 and rebuild against the latest payload.

- [ ] **Step 4: Verify all persisted requirements**

Run:

```sql
with bars as (
  select item
  from public.trip_state
  cross join lateral jsonb_array_elements(payload->'data'->'restaurants') as item
  where id = 'main'
    and item->>'id' like 'bar_%'
)
select
  item->>'city' as city,
  count(*) as bars,
  min((item->>'googleRating')::numeric) as minimum_google_rating,
  count(*) filter (where item->>'placeType' <> 'бар') as wrong_place_type,
  count(*) filter (where not (item->'categories' ? 'бар')) as missing_bar_category,
  count(*) filter (where item->>'link' !~ '^https://www\\.google\\.com/maps/') as invalid_maps_link,
  count(*) filter (where jsonb_array_length(item->'lnglat') <> 2) as invalid_coordinates
from bars
group by city
order by city;
```

Expected: seven rows, each with `bars = 5`, `minimum_google_rating >= 4.3`, and every error count equal to `0`.

- [ ] **Step 5: Manually verify presentation**

Open the Restaurants page, filter by `Тип места: Бар`, and inspect one new bar in every city. Confirm its existing no-photo card layout, Google rating link, city, note, and map pin render correctly. Confirm no categories are visible on the card.

- [ ] **Step 6: Commit the final research evidence**

```bash
git add docs/superpowers/research/2026-07-15-bars.md
git commit -m "Record added bar recommendations"
git push
```
