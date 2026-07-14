# Stelvio Driving Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a round-trip Stelvio and Umbrail driving itinerary from Arnoga as Valdidentro route day 2.

**Architecture:** Append ordered `Sight` records to `trip_state.main.payload.data.sights`, then label the new route day in the existing Sights UI. The route display remains consistent with existing walking-route cards, while a day-specific Google Maps URL uses `travelmode=driving`.

**Tech Stack:** Supabase Postgres JSONB, React TypeScript, Google Maps URLs.

## Global Constraints

- City is `Вальдидентро, Италия`; all new records use `walkDay: 2` and increasing `walkOrder`.
- Include Arnoga, Bormio, Stelvio, Umbrail, Santa Maria, Trafoi, and the return route.
- Include an explicit October closure and weather warning.
- Preserve existing places and routes.

---

### Task 1: Add driving stops

**Files:**
- Modify: `public.trip_state` row `id = 'main'`

**Interfaces:**
- Consumes: `Sight` in `src/types/trip.ts:47-60`.
- Produces: 8-10 ordered driving stops with `[longitude, latitude]` coordinates and concise Russian descriptions.

- [ ] **Step 1: Validate stop order and access**

Use the route sequence Arnoga, Bormio, Bagni Vecchi, Passo dello Stelvio, Umbrail Pass, Santa Maria Val Müstair, Trafoi, and Bormio return. Make the Arnoga warning explicit about checking Stelvio and Umbrail road status in October.

- [ ] **Step 2: Append the records atomically**

Use one guarded SQL update of `payload.data.sights`; append only if none of the new IDs or names already exists.

- [ ] **Step 3: Add the Google Maps driving link**

Set `dayMapUrl` for day `d12` to a Google Maps directions URL with the stops as waypoints and `travelmode=driving`.

- [ ] **Step 4: Verify route data**

Query all Valdidentro sights with `walkDay = 2`, ordered by `walkOrder`, and confirm the day URL contains `travelmode=driving`.

### Task 2: Label route day

**Files:**
- Modify: `src/features/sights/Sights.tsx:38-52`

**Interfaces:**
- Consumes: `cityDayLabels`.
- Produces: `День 2: Стельвио на машине`.

- [ ] **Step 1: Add the label**

```ts
"Вальдидентро, Италия": {
  1: "День 1: Валь-Виола и озёра Канкано",
  2: "День 2: Стельвио на машине",
},
```

- [ ] **Step 2: Build with Node 22 and commit**

```bash
npx --yes node@22 ./node_modules/typescript/bin/tsc -b && npx --yes node@22 ./node_modules/vite/bin/vite.js build
git add src/features/sights/Sights.tsx docs/superpowers/plans/2026-07-14-stelvio-driving-route.md
git commit -m "Add Stelvio driving route"
git push origin main
```
