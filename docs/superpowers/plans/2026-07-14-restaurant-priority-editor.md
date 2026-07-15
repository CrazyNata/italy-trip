# Restaurant Priority Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toggle restaurant priority in the editor without changing the restaurant status.

**Architecture:** Add optional `priority?: boolean` to `Restaurant`. Existing `🔥 приоритет` statuses migrate to `priority: true` and status `хочу`; the filter reads the boolean.

**Tech Stack:** React, TypeScript, Supabase JSONB.

### Task 1: Add independent priority field

**Files:**
- Modify: `src/types/trip.ts`
- Modify: `src/features/restaurants/RestaurantEditorModal.tsx`
- Modify: `src/features/restaurants/Restaurants.tsx`
- Modify: `public.trip_state` row `id = 'main'`

- [ ] Add `priority?: boolean` and validate it.
- [ ] Add a `🔥 приоритет` toggle to the editor, update the filter to use `priority`, and migrate existing priority statuses in the shared payload.
- [ ] Build with Node 22, commit, and push.
