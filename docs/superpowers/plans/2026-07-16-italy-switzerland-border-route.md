# Italy-Switzerland Border Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Italy-Switzerland border as a named stop in the 7 October driving route.

**Architecture:** Update only day `d12` in the live `days` JSON array. Keep the current six coordinate waypoints in order and append the encoded named border waypoint immediately after the existing Passo dello Stelvio coordinate.

**Tech Stack:** Supabase Postgres JSONB, Google Maps Directions URL.

## Global Constraints

- Modify only `d12.dayMapUrl`.
- Preserve the origin, destination, six existing coordinate waypoints, and `travelmode=driving`.
- Use `Italy-Switzerland%20border` as the named waypoint after `46.5284,10.4533`.

---

### Task 1: Update The Border Detour

**Files:**
- Modify: `public.trip_state` row `id = 'main'`

**Interfaces:**
- Consumes: day `d12.dayMapUrl`.
- Produces: an updated Google Maps Directions URL containing the named border stop.

- [ ] **Step 1: Read the current timestamp and route URL**

```sql
select updated_at, item->>'dayMapUrl' as route_url
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'days') item
where id = 'main' and item->>'id' = 'd12';
```

- [ ] **Step 2: Replace only the day route URL using the timestamp guard**

Set `d12.dayMapUrl` to:

```text
https://www.google.com/maps/dir/?api=1&origin=46.4810,10.2144&destination=46.4810,10.2144&waypoints=46.4684,10.3707%7C46.5002,10.3682%7C46.5284,10.4533%7CItaly-Switzerland%20border%7C46.5454,10.4337%7C46.6031,10.4244%7C46.5435,10.5067&travelmode=driving
```

- [ ] **Step 3: Verify the saved route**

```sql
select item->>'dayMapUrl' as route_url
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'days') item
where id = 'main' and item->>'id' = 'd12';
```

Expected: URL contains the named waypoint, all six coordinates, and `travelmode=driving`.
