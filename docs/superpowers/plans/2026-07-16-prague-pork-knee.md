# Prague Pork Knee And Beer Bars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add six Prague venues serving veprevo koleno, six traditional beer bars, and a filter for the tagged venues.

**Architecture:** Research 12 current, distinct Prague listings into a source table, then append their `Restaurant` JSON in one timestamp-guarded update. Model pork-knee availability with an optional `hasPorkKnee` boolean; the Restaurants filter derives its list directly from that flag.

**Tech Stack:** Google Maps business data, Supabase Postgres JSONB, React, TypeScript, Node 22 Vite build.

## Global Constraints

- Add 12 `Прага, Чехия` records: six verified pork-knee venues and six traditional beer bars, including Kozlovna.
- All new records use `status: "хочу"`, valid Maps URL, coordinates, Google rating and full review count, price, type, category, and Russian note.
- Set `hasPorkKnee: true` only for the six verified pork-knee venues.
- Add no photos, personal ratings, priority, reservation, or pet-friendly fields.
- Do not use `query=place_id:` in Maps URLs.

---

### Task 1: Research Prague Pork Knee And Beer Bars

**Files:**
- Create: `docs/superpowers/research/2026-07-16-prague-pork-knee.md`

**Interfaces:**
- Consumes: live Prague restaurant names to exclude duplicates.
- Produces: 12 complete, verified candidate rows for the database update.

- [ ] **Step 1: Capture the duplicate baseline**

```sql
select item->>'name' as name
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'restaurants') item
where id = 'main' and item->>'city' = 'Прага, Чехия'
order by name;
```

- [ ] **Step 2: Build a 12-row evidence table**

Use this schema in the new research file:

```markdown
| ID | Name | Pork knee | Type | Google Maps URL | Longitude | Latitude | Google rating | Google reviews | Price | Category | Note |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
```

Record six rows with `Pork knee` equal to `yes` only after confirming veprevo koleno in the venue's current menu. Record six distinct traditional beer venues with `Pork knee` equal to `no`; include at least one Kozlovna. Every Maps URL must use an encoded name-and-address query.

- [ ] **Step 3: Validate the evidence table**

Confirm: 12 unique IDs, six `yes` rows, six `no` rows, all ratings 1–5, positive integer review counts, nonzero Prague coordinates, and no current Prague name duplicates.

### Task 2: Add The Pork Knee Data Model And Filter

**Files:**
- Modify: `src/types/trip.ts:87-100`
- Modify: `src/features/restaurants/Restaurants.tsx:60-130, 350-430`

**Interfaces:**
- Consumes: `Restaurant.hasPorkKnee?: boolean`.
- Produces: a `Вепрево колено` filter that composes with all existing filters.

- [ ] **Step 1: Extend the restaurant type and parser**

Add to `Restaurant` directly after `petFriendly`:

```ts
/** Подтверждено, что в меню есть вепрево колено. */
hasPorkKnee?: boolean;
```

Add to `isRestaurant` after the `petFriendly` check:

```ts
(value.hasPorkKnee === undefined || typeof value.hasPorkKnee === "boolean") &&
```

- [ ] **Step 2: Add pork-knee filter state and filtering predicate**

Add a boolean `porkKneeOnly` state beside the other Restaurants filters. Add `(!porkKneeOnly || item.hasPorkKnee)` to the existing list-filter predicate so it combines with all current filters.

- [ ] **Step 3: Add the filter control**

Place a button labelled `Вепрево колено` in the existing filter controls. It toggles `porkKneeOnly`, applies the existing active filter styling when enabled, and includes `aria-pressed={porkKneeOnly}`.

- [ ] **Step 4: Confirm source hooks**

Use the file-search tool to confirm the type property, parser validation, boolean state, predicate, and accessible filter button all exist.

### Task 3: Persist And Verify The 12 Prague Cards

**Files:**
- Modify: `public.trip_state` row `id = 'main'`
- Modify: `docs/superpowers/research/2026-07-16-prague-pork-knee.md`

**Interfaces:**
- Consumes: validated research rows.
- Produces: twelve new live `Restaurant` records and six true `hasPorkKnee` values.

- [ ] **Step 1: Read the timestamp and restaurant count**

```sql
select updated_at, jsonb_array_length(payload->'data'->'restaurants') as restaurant_count
from public.trip_state
where id = 'main';
```

- [ ] **Step 2: Append twelve records atomically**

Translate each researched row to the existing `Restaurant` JSON shape and append the 12-element array with `jsonb_set` only when `updated_at` equals the timestamp from Step 1. Include `hasPorkKnee: true` only in the six verified rows.

- [ ] **Step 3: Verify saved requirements**

```sql
select
  count(*) as prague_new_cards,
  count(*) filter (where item->>'hasPorkKnee' = 'true') as pork_knee,
  count(*) filter (where item->>'link' like 'https://www.google.com/maps/search/?api=1&query=%') as maps_links,
  count(*) filter (where item->>'link' like '%query=place_id:%') as invalid_maps_links
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'restaurants') item
where id = 'main' and (item->>'id' like 'prague_pork_knee_%' or item->>'id' like 'prague_traditional_beer_%');
```

Expected: 12 new cards, 6 pork-knee flags, 12 Maps links, 0 invalid Maps links.

- [ ] **Step 4: Run the production build**

```bash
npx --yes --package node@22 --call 'node --version && npm run build'
```

- [ ] **Step 5: Commit and push**

```bash
git add src/types/trip.ts src/features/restaurants/Restaurants.tsx docs/superpowers/research/2026-07-16-prague-pork-knee.md
git commit -m "Add Prague pork knee venues"
git push
```
