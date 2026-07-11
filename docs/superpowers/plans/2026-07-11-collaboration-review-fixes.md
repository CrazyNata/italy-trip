# Collaboration Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve every critical and important normalized-collaboration review finding without changing the legacy rollback source.

**Architecture:** PostgreSQL owns aggregate validation, authorization, optimistic revision checks, and atomic replacement. The React client keeps independent per-trip write state and generation guards, while photo blobs remain durable in a compound-key IndexedDB cache and Storage cleanup is performed by constrained server RPCs.

**Tech Stack:** PostgreSQL/Supabase RLS and RPC, React 19, TypeScript 7, IndexedDB, Vite 8, Node 22.

## Global Constraints

- Update `supabase/migrations/20260711120000_normalized_collaboration.sql`; do not add a corrective migration.
- Preserve additive migration behavior and `trip_state` rollback.
- Add no tests, test dependencies, or telemetry.
- Verify with Node 22 build, standalone TypeScript, whitespace diff-check, and static SQL privilege/search-path/RLS review.

---

### Task 1: Transactional Server API

**Files:**
- Modify: `supabase/migrations/20260711120000_normalized_collaboration.sql`

**Interfaces:**
- Produces: `save_trip_aggregate(uuid,jsonb,int,bigint)`, `delete_trip_with_photos(uuid)`, `delete_trip_photo(uuid,uuid)`, and photo metadata RPCs.

- [ ] Add bounded bigint photo ordering and trip revisions.
- [ ] Add strict JSON/version validation, owner checks, row locking, revision conflict detection, and atomic aggregate replacement.
- [ ] Make legacy UUID selection collision-safe per destination and deterministic for duplicate source IDs.
- [ ] Return invitation expiry and derive expired status.
- [ ] Add recursive paginated Storage cleanup and recoverable photo deletion.
- [ ] Revoke public execution and grant only the minimum authenticated RPC privileges.

### Task 2: Typed Repository Boundaries

**Files:**
- Modify: `src/trip/normalizedRepository.ts`
- Modify: `src/lib/supabase/database.ts`

**Interfaces:**
- Consumes: Task 1 RPCs.
- Produces: revision-bearing aggregate loads/saves, typed invitation/photo parsing, and separate aggregate/photo realtime callbacks.

- [ ] Replace broad promise/data assertions with narrow record and RPC-result parsers.
- [ ] Route aggregate persistence and destructive operations through secure RPCs.
- [ ] Paginate any remaining client Storage traversal and bound photo positions.
- [ ] Persist reverse-geocoded metadata remotely.

### Task 3: Per-Trip Write Coordination

**Files:**
- Modify: `src/trip/TripDataContext.tsx`

**Interfaces:**
- Consumes: revision-aware repository save/load.
- Produces: per-trip pending writes with captured owner access, orderly switching/deletion, retries, and generation-safe realtime refresh.

- [ ] Store pending, timer, in-flight promise, revision, and failure independently by trip ID.
- [ ] Await or retry the relevant trip before switching and cancel/await safely before deletion.
- [ ] Ignore stale async completions and never apply realtime while local work is pending.

### Task 4: Durable Photo Cache

**Files:**
- Modify: `src/features/photos/store.ts`
- Modify: `src/features/photos/Photos.tsx`

**Interfaces:**
- Produces: IndexedDB v3 `['tripId','id']` keys migrated safely from v2 and local-data preservation during signed-URL refresh.

- [ ] Rebuild the v2 store during upgrade and normalize legacy trip IDs.
- [ ] Merge remote metadata into local entries without replacing data URLs.
- [ ] Scope deletes by trip and persist geocoded place updates remotely.

### Task 5: Verification And Commit

**Files:**
- Review: all modified files.

- [ ] Run `npx tsc -b` under Node 22.
- [ ] Run `npm run build` under Node 22.
- [ ] Run `git diff --check` and inspect the full diff.
- [ ] Audit every security-definer function for fixed `search_path`, explicit auth/owner checks, revoked public execution, and compatible RLS.
- [ ] Commit all intended changes without pushing.
