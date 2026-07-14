# Valdidentro Nature Sights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a light, car-friendly Val Viola and Cancano nature route for the full Valdidentro day.

**Architecture:** Add 6-8 normalized `Sight` objects to `trip_state.main.payload.data.sights` and label their route day in the existing Sights UI. The route records use `walkDay: 1` and `walkOrder` for map ordering despite being a driving itinerary.

**Tech Stack:** Supabase Postgres JSONB, React TypeScript, Mapbox.

## Global Constraints

- Use city `Вальдидентро, Италия`, `walkDay: 1`, and consecutive `walkOrder` values.
- Include only easy viewpoints and short walks.
- Include a weather and seasonal-access warning in the route.
- Preserve all existing sights.

---

### Task 1: Research and append route points

**Files:**
- Modify: `public.trip_state` row `id = 'main'`

**Interfaces:**
- Consumes: `Sight` from `src/types/trip.ts:47-60`.
- Produces: 6-8 new sights with `id`, `name`, `city`, `group`, `subcategory`, `done`, `description`, `walkDay`, `walkOrder`, and `lnglat`.

- [ ] **Step 1: Validate the candidate places**

Confirm each selected place is in the Valdidentro/Val Viola/Cancano area and that its coordinates use `[longitude, latitude]`. Use places such as the Fraele towers, Lago delle Scale, Lago di Cancano, Val Viola, and Arnoga.

- [ ] **Step 2: Append the records atomically**

Use a guarded SQL `UPDATE` of `payload.data.sights` that appends the new JSON records only when none of their names already exist. Set `updated_at = now()` in the same update.

- [ ] **Step 3: Verify the route data**

Run a SQL query returning all sights where `city = 'Вальдидентро, Италия'`, ordered by `walkOrder`. Confirm the count is 6-8, coordinates are present, and the seasonal warning is included.

### Task 2: Label the route day

**Files:**
- Modify: `src/features/sights/Sights.tsx:38-50`

**Interfaces:**
- Consumes: `cityDayLabels: Record<string, Record<number, string>>`.
- Produces: the label `День 1: Валь-Виола и озёра Канкано` for `Вальдидентро, Италия`.

- [ ] **Step 1: Add the city day label**

Add this entry to `cityDayLabels`:

```ts
"Вальдидентро, Италия": { 1: "День 1: Валь-Виола и озёра Канкано" },
```

- [ ] **Step 2: Build with Node 22**

Run:

```bash
npx --yes node@22 ./node_modules/typescript/bin/tsc -b && npx --yes node@22 ./node_modules/vite/bin/vite.js build
```

Expected: TypeScript exits successfully and Vite writes `dist/`.

- [ ] **Step 3: Commit and push**

```bash
git add src/features/sights/Sights.tsx docs/superpowers/plans/2026-07-14-valdidentro-nature-sights.md
git commit -m "Add Valdidentro nature route"
git push origin main
```
