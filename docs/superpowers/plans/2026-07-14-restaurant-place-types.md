# Restaurant Place Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Categorize cards as restaurant, cafe, or bar.

**Architecture:** Add optional `placeType` to `Restaurant`, migrate existing records to `ресторан`, and add editor/list filtering controls.

### Task 1: Add place types

**Files:**
- Modify: `src/types/trip.ts`
- Modify: `src/features/restaurants/RestaurantEditorModal.tsx`
- Modify: `src/features/restaurants/Restaurants.tsx`
- Modify: `public.trip_state` row `id = 'main'`

- [ ] Add and validate `placeType`, migrate existing entries, add editor selection and list filter, build, commit, and push.
