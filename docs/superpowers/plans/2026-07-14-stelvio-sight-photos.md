# Stelvio Sight Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Wikimedia Commons photographs to the eight Stelvio route stops.

**Architecture:** Update only the `photo` fields for the eight `stelvio_*` sights in `trip_state.main.payload.data.sights`.

**Tech Stack:** Supabase Postgres JSONB, Wikimedia Commons.

## Global Constraints

- One public image URL per Stelvio route sight.
- Preserve all other fields and records.

---

### Task 1: Add and verify photos

**Files:**
- Modify: `public.trip_state` row `id = 'main'`

**Interfaces:**
- Consumes: `Sight.photo?: string`.
- Produces: all eight day-2 Valdidentro sights with non-empty `photo` URLs.

- [ ] **Step 1: Select Wikimedia Commons images**

Use images relevant to Arnoga, Bormio, Bagni Vecchi, Stelvio, Umbrail, Santa Maria Val Müstair, and Trafoi.

- [ ] **Step 2: Update only `stelvio_*` photos**

Use one SQL update that maps each existing `stelvio_*` ID to a Wikimedia Commons URL and updates `updated_at`.

- [ ] **Step 3: Verify all photos**

Query Valdidentro sights where `walkDay = 2`; confirm eight rows and a non-empty `photo` field for every row.
