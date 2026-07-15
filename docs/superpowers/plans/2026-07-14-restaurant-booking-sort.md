# Restaurant Booking Sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show only booked restaurants sorted by reservation date and time.

**Architecture:** Replace the default sort option with `booking`; filter for `status === "бронь"` only in that mode and sort its date/time keys.

### Task 1: Add booking sort

**Files:**
- Modify: `src/features/restaurants/Restaurants.tsx`

- [ ] Replace `default` with `booking`, filter booked restaurants in booking mode, sort by `reservationDate` then `reservationTime`, update label to «по брони», build, commit, and push.
