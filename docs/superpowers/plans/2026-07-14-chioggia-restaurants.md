# Chioggia Restaurants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ten highly rated Chioggia and Sottomarina restaurants.

**Architecture:** Append verified `Restaurant` records to `trip_state.main.payload.data.restaurants`; no UI changes.

**Tech Stack:** Supabase JSONB, Google Maps.

### Task 1: Research and add ten venues

**Files:**
- Modify: `public.trip_state` row `id = 'main'`

- [ ] Verify active venues, exact addresses, ratings >= 4.3, and coordinates.
- [ ] Append ten non-duplicate records atomically with address-based Google Maps URLs.
- [ ] Query and verify all new records have ratings, links, and coordinates.
