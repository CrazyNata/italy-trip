# Valdidentro Sight Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Wikimedia Commons photographs to all seven Valdidentro route sights.

**Architecture:** The existing `Sight.photo` field stores public image URLs inside `trip_state.main.payload.data.sights`; update only the seven new records.

**Tech Stack:** Supabase Postgres JSONB, Wikimedia Commons URLs.

## Global Constraints

- Set one public Wikimedia Commons image URL for each Valdidentro sight.
- Do not alter other sights, coordinates, or descriptions.

---

### Task 1: Add and verify public images

**Files:**
- Modify: `public.trip_state` row `id = 'main'`

**Interfaces:**
- Consumes: `Sight.photo?: string` from `src/types/trip.ts:47-60`.
- Produces: seven Valdidentro sights with non-empty `photo` URLs.

- [ ] **Step 1: Select a relevant Wikimedia Commons image for each sight**

Verify every selected URL returns an image and represents the location or its immediate landscape.

- [ ] **Step 2: Update only the seven route records**

Run a single SQL `UPDATE` that maps the sight IDs `valdidentro_arnoga`, `valdidentro_val_viola`, `valdidentro_torri_fraele`, `valdidentro_lago_scale`, `valdidentro_lago_cancano`, `valdidentro_diga_cancano`, and `valdidentro_lago_viola` to their selected URLs.

- [ ] **Step 3: Verify photos are populated**

Run a query of Valdidentro sights returning `name` and `photo`; confirm seven rows and no empty URLs.

- [ ] **Step 4: Commit the plan**

```bash
git add docs/superpowers/plans/2026-07-14-valdidentro-sight-photos.md
git commit -m "Plan Valdidentro sight photos"
git push origin main
```
