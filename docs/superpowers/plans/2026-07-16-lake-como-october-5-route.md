# Lake Como October 5 Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the existing Lake Como loop as the itinerary route for 5 October.

**Architecture:** Set `d11.dayMapUrl` to a Google Maps Directions URL generated from the existing ordered Lake Como sights. This preserves the sight route as the source of truth while making it directly available in the itinerary.

**Tech Stack:** Supabase Postgres JSONB, Google Maps Directions URL.

## Global Constraints

- Modify only day `d11` (`2026-10-05`).
- Preserve all sight records and itinerary items.
- Use driving travel mode and Milan home as origin and destination.

---

### Task 1: Add The Lake Como Day Route

**Files:**
- Modify: `public.trip_state` row `id = 'main'`

**Interfaces:**
- Consumes: the existing ordered Lake Como sight coordinates.
- Produces: `d11.dayMapUrl` with the corresponding Google driving loop.

- [ ] **Step 1: Read the current timestamp**

```sql
select updated_at
from public.trip_state
where id = 'main';
```

- [ ] **Step 2: Set d11 to the complete Lake Como route**

Use a timestamp-guarded JSONB update to set only `d11.dayMapUrl` to:

```text
https://www.google.com/maps/dir/?api=1&origin=45.4980789,9.2334344&destination=45.4980789,9.2334344&waypoints=45.8130357,9.0809691%7C45.8449282,9.0798188%7C45.9650877,9.2025018%7C45.9876816,9.2319265%7C46.0197842,9.2389513%7C46.1471878,9.3052568%7C46.0099785,9.2831593%7C46.0423875,9.3052442%7C45.9872549,9.2613001%7C45.9005485,9.4120248&travelmode=driving
```

- [ ] **Step 3: Verify the exact stored route**

```sql
select item->>'dayMapUrl' as route_url
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'days') item
where id = 'main' and item->>'id' = 'd11';
```

Expected: the URL includes the ten Lake Como waypoints and `travelmode=driving`.
