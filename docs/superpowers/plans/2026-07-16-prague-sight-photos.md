# Prague Sight Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate the 23 Prague sight cards with representative Wikipedia images where available.

**Architecture:** Research the Russian Wikipedia summary endpoint for every Prague sight and record the selected image URL. A single timestamp-guarded JSONB update adds only successful `photo` values to the corresponding live records; the existing Sights cards already render that field.

**Tech Stack:** Wikipedia REST API, Supabase Postgres JSONB, existing React Sights cards, Node 22 Vite build.

## Global Constraints

- Process only sights with `city: "Прага, Чехия"` and no existing `photo` URL.
- Prefer `originalimage.source`; use `thumbnail.source` only when needed.
- Update only `photo`; do not write `photoPath`, modify routes, or modify non-Prague records.
- Leave a record unchanged when no suitable Wikipedia image is returned.
- Verify Prague remains day 1: 12 points and day 2: 11 points, then build with Node 22.

---

### Task 1: Research And Store Prague Images

**Files:**
- Create: `docs/superpowers/research/2026-07-16-prague-sight-photos.md`
- Modify: `public.trip_state` row where `id = 'main'`

**Interfaces:**
- Consumes: 23 Prague `Sight` records with no `photo` property.
- Produces: selected Wikipedia image URLs in `Sight.photo` for successful lookups only.

- [x] **Step 1: Read the live Prague baseline**

```sql
select updated_at, item->>'id' id, item->>'name' name, item->>'photo' photo
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'sights') item
where trip_state.id = 'main' and item->>'city' = 'Прага, Чехия'
order by (item->>'walkDay')::integer, (item->>'walkOrder')::integer;
```

Expected: 23 rows with empty photos and one timestamp.

- [x] **Step 2: Resolve an image for each name**

For each row, fetch:

```text
https://ru.wikipedia.org/api/rest_v1/page/summary/<encoded sight name>
```

Record `id`, name, endpoint URL, and selected `originalimage.source` or `thumbnail.source` in `docs/superpowers/research/2026-07-16-prague-sight-photos.md`. Record `no image` when the request is not successful or returns neither field.

- [x] **Step 3: Re-read the live timestamp**

```sql
select updated_at from public.trip_state where id = 'main';
```

Expected: use the returned timestamp as the optimistic update guard.

- [x] **Step 4: Add only successful photos atomically**

Build a `values` CTE of `(id, photo_url)` for successful lookups. Rebuild `payload.data.sights` with:

```sql
case when photos.id is null then item
else item || jsonb_build_object('photo', photos.photo_url) end
```

Guard the update with `id = 'main'` and the timestamp from Step 3. Expected: one returned row; sight count remains 122.

- [x] **Step 5: Verify coverage and route preservation**

```sql
select
  count(*) prague_sights,
  count(*) filter (where item->>'photo' like 'https://%.wikimedia.org/%') with_wikimedia_photo,
  count(*) filter (where item->>'photo' like 'https://%.wikimedia.org/%' and item ? 'photoPath') unexpected_photo_path
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'sights') item
where trip_state.id = 'main' and item->>'city' = 'Прага, Чехия';
```

Expected: `prague_sights = 23`, `unexpected_photo_path = 0`. Re-run the Prague route-shape query from the prior plan and confirm day 1 remains 12 points with orders 0 through 11 and day 2 remains 11 points with orders 0 through 10.

- [x] **Step 6: Build and commit evidence**

```bash
npx --yes --package node@22 --call 'node --version && npm run build'
git add docs/superpowers/research/2026-07-16-prague-sight-photos.md
git commit -m "Add Prague sight photos"
```

Expected: Node 22 Vite build exits successfully and the research evidence is committed.
