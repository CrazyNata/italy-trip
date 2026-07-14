# Stelvio Route Restaurants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 12-14 varied restaurants along the Stelvio driving loop.

**Architecture:** Append normalized `Restaurant` records to `trip_state.main.payload.data.restaurants`; no UI changes are needed.

**Tech Stack:** Supabase Postgres JSONB, Google Maps URLs.

## Global Constraints

- Cover Bormio, Stelvio, Umbrail, Santa Maria, and Trafoi.
- Use prices `€` to `€€€`, maps, coordinates, route-area labels, and seasonal notes.
- Do not duplicate existing restaurant names.

---

### Task 1: Research and add restaurants

**Files:**
- Modify: `public.trip_state` row `id = 'main'`

**Interfaces:**
- Consumes: `Restaurant` from `src/types/trip.ts:69-90`.
- Produces: 12-14 records with name, city, area, note, link, price, and `lnglat`.

- [ ] **Step 1: Validate current opening information**

Research each candidate using its official source or Google Maps, with special attention to October closures at high altitude.

- [ ] **Step 2: Append records atomically**

Use a guarded SQL update that appends only non-duplicate restaurant names and updates `updated_at`.

- [ ] **Step 3: Verify all records**

Query the inserted route-area restaurants; confirm the expected count, non-empty coordinates, links, and prices.
