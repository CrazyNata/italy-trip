# Shared Stelvio Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 7 October route with the user-provided Google Maps shared route.

**Architecture:** Update only `d12.dayMapUrl` in the live `days` JSON array using a timestamp guard. Store the Maps short URL exactly as supplied because it owns the route configuration externally.

**Tech Stack:** Supabase Postgres JSONB, Google Maps shared URL.

## Global Constraints

- Modify only day `d12`.
- Set the route URL exactly to `https://maps.app.goo.gl/vyvqZHin4MxoVpNi9`.
- Preserve every other itinerary value.

---

### Task 1: Replace The Shared Route

**Files:**
- Modify: `public.trip_state` row `id = 'main'`

**Interfaces:**
- Consumes: `d12.dayMapUrl` and the current row timestamp.
- Produces: the supplied shared Maps URL as the exact `d12.dayMapUrl` value.

- [ ] **Step 1: Read the current timestamp**

```sql
select updated_at
from public.trip_state
where id = 'main';
```

- [ ] **Step 2: Update only d12 with a timestamp guard**

Use `jsonb_set` over `payload.data.days`, replacing `dayMapUrl` only when `item->>'id' = 'd12'`, with the JSON string:

```text
https://maps.app.goo.gl/vyvqZHin4MxoVpNi9
```

- [ ] **Step 3: Verify the exact stored value**

```sql
select item->>'dayMapUrl' as route_url
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'days') item
where id = 'main' and item->>'id' = 'd12';
```

Expected: exactly `https://maps.app.goo.gl/vyvqZHin4MxoVpNi9`.
