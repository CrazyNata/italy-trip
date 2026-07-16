# Prague Restaurants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 30 fully populated, photo-free Prague restaurant and bar cards to the existing Restaurants tab.

**Architecture:** Research 18 restaurants/cafes and 12 bars into a complete evidence table, then append their exact `Restaurant` JSON objects to `trip_state.main.payload.data.restaurants` in one timestamp-guarded update. Existing cards, filters, and map use those fields without UI changes.

**Tech Stack:** Google Maps business data, Supabase Postgres JSONB, existing React restaurant cards, Node 22 Vite build.

## Global Constraints

- Add exactly 30 records with `city: "Прага, Чехия"`: 18 `placeType` values of `"ресторан"` or `"кафе"`, and 12 `"бар"` values.
- Every record has `status: "хочу"`, Maps link, coordinates, Google rating, full positive Google review count, price, type, category, and Russian note.
- Add no `photos`, `photoPath`, personal `rating`, `priority`, booking fields, or pet-friendly fields.
- Exclude duplicate normalized city/name pairs against the live array.
- Preserve all unrelated trip data and run Node 22 production build.

---

### Task 1: Research Prague Candidates

**Files:**
- Create: `docs/superpowers/research/2026-07-16-prague-restaurants.md`

**Interfaces:**
- Consumes: the live restaurant array for duplicate checking.
- Produces: 30 complete candidate rows for the persistence task.

- [ ] **Step 1: Capture the live duplicate baseline**

```sql
select item->>'city' city, item->>'name' name
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'restaurants') item
where trip_state.id = 'main'
order by city, name;
```

Expected: no current Prague records.

- [ ] **Step 2: Build the evidence table**

Create `docs/superpowers/research/2026-07-16-prague-restaurants.md` with exactly 30 rows in this shape:

```markdown
| ID | Name | Type | Google Maps URL | Longitude | Latitude | Google rating | Google reviews | Price | Category | Note |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| prague_example | Example | ресторан | https://www.google.com/maps/search/?api=1&query=... | 14.42 | 50.08 | 4.5 | 100 | €€ | ресторан | Короткая русская заметка. |
```

Research current Google business data and accept a candidate only if its name, location, rating, and review count match the Prague listing. Use unique IDs prefixed `prague_` and a mix of Czech food, modern dining, cafes, beer, wine, and cocktail bars.

- [ ] **Step 3: Verify the table structure**

Before writing data, confirm: 30 unique IDs; 18 restaurant/cafe rows; 12 bars; all ratings are 1–5; every review count is a positive integer; all Maps URLs begin `https://www.google.com/maps/`; and coordinates are nonzero Prague points.

### Task 2: Persist And Verify Prague Cards

**Files:**
- Modify: `public.trip_state` row where `id = 'main'`
- Modify: `docs/superpowers/research/2026-07-16-prague-restaurants.md`

**Interfaces:**
- Consumes: the validated 30-row research table.
- Produces: 30 `Restaurant` records in the live payload.

- [ ] **Step 1: Read the current timestamp and count**

```sql
select updated_at, jsonb_array_length(payload->'data'->'restaurants') restaurant_count
from public.trip_state
where id = 'main';
```

Expected: use this timestamp as the only update guard.

- [ ] **Step 2: Build the 30-record JSON array**

Translate every research row into this shape:

```json
{
  "id": "prague_example",
  "name": "Example",
  "city": "Прага, Чехия",
  "status": "хочу",
  "note": "Короткая русская заметка.",
  "link": "https://www.google.com/maps/search/?api=1&query=...",
  "price": "€€",
  "googleRating": 4.5,
  "googleReviews": 100,
  "placeType": "ресторан",
  "categories": ["ресторан"],
  "lnglat": [14.42, 50.08]
}
```

- [ ] **Step 3: Append records atomically**

Append the JSON array with `jsonb_set` only when the row timestamp equals Step 1. Expected: one returned row and restaurant count increases from 100 to 130.

- [ ] **Step 4: Verify saved card requirements**

```sql
select
  count(*) prague_cards,
  count(*) filter (where item->>'placeType' in ('ресторан','кафе')) restaurant_or_cafe,
  count(*) filter (where item->>'placeType' = 'бар') bars,
  count(*) filter (where item->>'link' ~ '^https://www\.google\.com/maps/') maps_links,
  count(*) filter (where (item->>'googleRating')::numeric between 1 and 5) ratings,
  count(*) filter (where (item->>'googleReviews')::integer > 0) reviews,
  count(*) filter (where item ? 'photos' or item ? 'priority' or item ? 'reservationDate' or item ? 'reservationTime') forbidden_fields
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'restaurants') item
where trip_state.id = 'main' and item->>'city' = 'Прага, Чехия';
```

Expected: `30, 18, 12, 30, 30, 30, 0`.

- [ ] **Step 5: Build and commit**

```bash
npx --yes --package node@22 --call 'node --version && npm run build'
git add docs/superpowers/research/2026-07-16-prague-restaurants.md
git commit -m "Add Prague restaurant cards"
```

Expected: Node 22 Vite build exits successfully and research evidence is committed.
