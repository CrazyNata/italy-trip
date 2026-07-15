# Restaurant Reservation Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store and display a restaurant reservation date and time.

**Architecture:** Add optional `reservationDate` and `reservationTime` strings to `Restaurant`; expose them in the editor for `бронь` and render them on the card.

### Task 1: Add reservation fields

**Files:**
- Modify: `src/types/trip.ts`
- Modify: `src/features/restaurants/RestaurantEditorModal.tsx`
- Modify: `src/features/restaurants/Restaurants.tsx`

- [ ] Add and validate optional date/time fields, add date and time inputs for bookings, and render a formatted booking line on the card.
- [ ] Build with Node 22, commit, and push.
