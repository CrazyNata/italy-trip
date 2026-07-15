# Bar Google Ratings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the current Google rating and Google review count to all 35 previously added bar cards.

**Architecture:** This is a production data enrichment, not a UI change. Research the two Google values for each existing `bar_` record, record the evidence, then update only `googleRating` and `googleReviews` in one guarded JSONB operation.

**Tech Stack:** Supabase Postgres JSONB, Google business data, existing React restaurant cards.

## Global Constraints

- Update exactly the 35 records whose IDs start with `bar_`.
- Use the rating and review count shown by Google for the matching business.
- Store `googleRating` as a number from 1 through 5 and `googleReviews` as a positive integer.
- Preserve every other field in the 35 records and all unrelated trip data.
- Do not change application code or card presentation.

---

### Task 1: Research And Persist Google Values

**Files:**
- Modify: `docs/superpowers/research/2026-07-15-bars.md`
- Modify: `public.trip_state` row where `id = 'main'`

**Interfaces:**
- Consumes: the 35 existing `Restaurant` objects whose IDs start with `bar_`.
- Produces: numeric `googleRating` and integer `googleReviews` fields on every consumed object.

- [ ] **Step 1: Read all target IDs, names, cities, and links**

```sql
select item->>'id' id, item->>'name' name, item->>'city' city, item->>'link' link
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'restaurants') item
where trip_state.id = 'main' and item->>'id' like 'bar_%'
order by city, name;
```

Expected: 35 rows.

- [ ] **Step 2: Record current Google values**

For each exact business, verify the Google listing reached from its stored Maps search URL. Add `Google rating` and `Google reviews` columns to the candidate table in `docs/superpowers/research/2026-07-15-bars.md` and record the displayed numeric values. Reject a result if its name and city do not match the stored record.

- [ ] **Step 3: Re-read the live row timestamp**

```sql
select updated_at from public.trip_state where id = 'main';
```

Expected: one timestamp used as the optimistic concurrency guard.

- [ ] **Step 4: Update only the two Google fields atomically**

Build a 35-row `values` CTE containing each exact `bar_` ID and its researched numeric values. Rebuild the restaurants array with `jsonb_set(jsonb_set(item, '{googleRating}', to_jsonb(rating)), '{googleReviews}', to_jsonb(reviews))` for matching IDs, preserve unmatched objects unchanged, and guard the update with the timestamp from Step 3.

Expected: one updated row and restaurant count remains 101.

- [ ] **Step 5: Verify complete persisted coverage**

```sql
select
  count(*) bars,
  count(*) filter (where jsonb_typeof(item->'googleRating') = 'number'
    and (item->>'googleRating')::numeric between 1 and 5) valid_ratings,
  count(*) filter (where jsonb_typeof(item->'googleReviews') = 'number'
    and (item->>'googleReviews')::integer > 0) valid_review_counts
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'restaurants') item
where trip_state.id = 'main' and item->>'id' like 'bar_%';
```

Expected: `bars = 35`, `valid_ratings = 35`, and `valid_review_counts = 35`.

- [ ] **Step 6: Verify the production build and commit evidence**

Run `npx --yes --package node@22 --call 'node --version && npm run build'`. Expected: Node 22 and a successful Vite build. Then commit and push only the updated research document.
