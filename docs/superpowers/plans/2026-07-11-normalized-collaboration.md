# Normalized Collaboration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a normalized, multi-trip Supabase persistence model and collaborative React workflows without changing or deleting legacy `trip_state` data.

**Architecture:** PostgreSQL owns normalized entities, authorization, invitation acceptance, Storage policy, import, and Realtime publication. A typed repository assembles normalized rows into the existing `TripData` aggregate so feature components retain their current API, while `TripDataProvider` adds trip selection, role-aware writes, namespaced cache, and realtime refresh.

**Tech Stack:** PostgreSQL/Supabase SQL, Supabase Auth/Storage/Realtime, React 19, TypeScript 7, Vite 8, Node.js 22.

## Global Constraints

- Do not apply any migration to a remote database.
- Preserve `public.trip_state` and every legacy row unchanged for rollback.
- Do not add tests, test dependencies, telemetry, or UI kits.
- Keep all existing feature UI functional and keep viewers read-only.
- Use UUID primary keys, cascading trip foreign keys, timestamps, and stable ordering.
- Use fixed-search-path security-definer helpers to avoid recursive RLS.
- Commit changes locally without pushing.

---

### Task 1: Database Model And Security

**Files:**
- Create: `supabase/migrations/20260711120000_normalized_collaboration.sql`

**Interfaces:**
- Consumes: existing `public.trip_state`, `public.admins`, `auth.users`, `storage.objects`, and `supabase_realtime` publication.
- Produces: normalized tables; `public.is_trip_member(uuid)`, `public.is_trip_owner(uuid)`, invitation RPCs, `public.import_legacy_main_trip()`, private `trip-photos` bucket, RLS policies, and publication membership.

- [ ] **Step 1: Define schema and invariants**

Create enums or checked text roles/statuses, all required tables, unique `legacy_id` constraints scoped to a trip, composite ownership-safe foreign keys, ordering indexes, and a shared `updated_at` trigger. Ensure owner membership is inserted with each trip and cannot be removed through direct client DML.

- [ ] **Step 2: Define non-recursive authorization helpers and RLS**

Create SQL helpers with `language sql stable security definer set search_path = pg_catalog, public`, revoke public execution, grant authenticated execution, enable RLS on every table, and add member-select/owner-mutate policies. Ensure invitation rows are owner-readable only and acceptance occurs only through an RPC.

- [ ] **Step 3: Implement secure invitation RPCs**

Create owner-only invitation creation/revocation functions and authenticated token acceptance. Generate a random token with `gen_random_bytes`, store only a SHA-256 digest, normalize email using `lower(trim(...))`, lock the invitation row during acceptance, verify caller email and expiry, and atomically add viewer membership.

- [ ] **Step 4: Implement idempotent legacy import**

Create `legacy_trip_imports` with unique source marker `trip_state:main`. The import function must lock/check the marker, select the first matching auth/admin user ordered by normalized email and UUID, insert the trip and every child collection using valid source UUIDs where collision-free and generated UUIDs otherwise, retain source strings in `legacy_id`, and leave `trip_state` untouched.

- [ ] **Step 5: Add Storage and Realtime configuration**

Insert the private bucket idempotently. Policies must parse `(storage.foldername(name))[1]` as a UUID, allow member reads and owner writes, and reject malformed/non-trip paths. Add required tables to `supabase_realtime` only when absent.

- [ ] **Step 6: Review SQL statically**

Run: `rg -n "security definer|search_path|enable row level security|trip_state|supabase_realtime|storage.foldername" supabase/migrations/20260711120000_normalized_collaboration.sql`

Expected: every security-definer function has a fixed search path; all new tables have RLS; legacy references are select-only; Storage and publication clauses are present.

- [ ] **Step 7: Commit database model**

```bash
git add supabase/migrations/20260711120000_normalized_collaboration.sql
git commit -m "Add normalized collaborative trip schema"
```

### Task 2: Typed Normalized Repository

**Files:**
- Create: `src/lib/supabase/database.ts`
- Create: `src/trip/normalizedRepository.ts`
- Modify: `src/types/trip.ts`

**Interfaces:**
- Consumes: Supabase client, normalized tables/RPCs, `TripData`, and `TripPayload`.
- Produces: `TripSummary`, `TripMember`, `TripInvitation`, `TripAccess`; `listTrips()`, `loadTrip(id)`, `saveTrip(id, data)`, trip CRUD, invitation/member functions, `acceptInvitation(token)`, and `subscribeToTrip(id, callback)`.

- [ ] **Step 1: Add narrow database types**

Define row/insert/update and RPC result types for only the new tables/functions. Type the Supabase client or repository query results without adding generated project-wide output unavailable offline.

- [ ] **Step 2: Implement aggregate loading**

Fetch trip metadata and child tables in parallel after access is established, order by `position` plus stable UUID tie-breaker, and map rows to the exact existing `TripData` shape. Restore original feature IDs from `legacy_id ?? id`.

- [ ] **Step 3: Implement aggregate saving**

Map a cloned `TripData` to normalized rows, resolve source IDs to existing UUID/legacy-ID mappings, upsert current rows, and delete removed rows. Save parent collections before children and keep writes owner-only through database RLS. Throw a repository error containing the failed operation.

- [ ] **Step 4: Implement collaboration operations**

Add trip list/create/rename/delete, member and invitation list, create/revoke/accept invitation RPC wrappers, and Storage object cleanup before trip deletion. Return one-time invitation tokens only from create results.

- [ ] **Step 5: Implement realtime subscription**

Subscribe to trip-filterable aggregate tables with `trip_id=eq.<uuid>` and to accessible trip/member/invitation changes. Coalesce event bursts into one callback and return an idempotent async cleanup function.

- [ ] **Step 6: Type-check repository**

Run: `npx tsc -b --pretty false`

Expected: exit code 0 with no TypeScript diagnostics.

- [ ] **Step 7: Commit repository**

```bash
git add src/lib/supabase/database.ts src/trip/normalizedRepository.ts src/types/trip.ts
git commit -m "Add normalized trip repository"
```

### Task 3: Multi-Trip Provider And Cache

**Files:**
- Modify: `src/trip/TripDataContext.tsx`
- Modify: `src/features/photos/store.ts`

**Interfaces:**
- Consumes: repository interfaces from Task 2 and existing `useAuth()` identity.
- Produces: existing `payload`, `data`, `updateData`, sync API plus trips, selected trip, role, trip CRUD, members, invitations, acceptance, and refresh operations.

- [ ] **Step 1: Replace primary legacy pull with normalized discovery**

After authentication, call `listTrips()`. If rows exist, validate the user-scoped selected-trip localStorage key and load that normalized aggregate. Only if no rows exist, execute the existing read-only `trip_state.main` fallback.

- [ ] **Step 2: Namespace cache and pending state**

Use `italy_trip:<user-id>:<trip-id>` for normalized aggregates and preserve `italy_trip` solely for legacy fallback. Invalidate stale requests by generation, isolate pending writes per selected trip, and prevent a delayed save from writing to a newly selected trip.

- [ ] **Step 3: Connect writes and role state**

Keep the existing debounced `updateData` behavior but call `saveTrip(selectedTripId, aggregate)`. Determine read-only status from selected membership rather than global admins. Expose explicit retry after failed normalized writes.

- [ ] **Step 4: Connect realtime and trip operations**

Subscribe only after a selected trip loads, refresh without a page reload, and clean up on identity/trip changes. Implement provider methods that refresh list/access state after create, rename, delete, invite, revoke, or acceptance.

- [ ] **Step 5: Namespace photo IndexedDB**

Upgrade the photo database schema so records include `tripId` and use a compound key or per-trip index. Require `tripId` in `all`, `put`, and `del`, migrate existing local photos only for legacy fallback, and update photo callers.

- [ ] **Step 6: Type-check provider**

Run: `npx tsc -b --pretty false`

Expected: exit code 0 with no TypeScript diagnostics.

- [ ] **Step 7: Commit provider migration**

```bash
git add src/trip/TripDataContext.tsx src/features/photos/store.ts src/features/photos/Photos.tsx
git commit -m "Switch trip state to normalized persistence"
```

### Task 4: Trip And Collaboration UI

**Files:**
- Create: `src/trip/TripManager.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/auth/AccountMenu.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: expanded `useTripData()` API and authenticated URL state.
- Produces: trip selector/create/rename/delete UI, member/invitation management, and invitation acceptance flow.

- [ ] **Step 1: Build trip selector and create flow**

Add an accessible selector showing every trip and current role. Owners and authenticated users can open a create dialog with validated non-empty name and optional dates; successful creation selects the new trip.

- [ ] **Step 2: Build owner trip settings**

Add owner-only rename and delete controls. Deletion requires entering the exact trip name, disables while pending, reports repository errors, and selects another accessible trip after success.

- [ ] **Step 3: Build membership and invitations**

Display owner/viewer member email and role. Allow owners to create viewer invitations by email, display/copy the generated acceptance URL once, list pending/expired/accepted invitations, and revoke pending invitations.

- [ ] **Step 4: Add acceptance flow**

Read `invite` from the URL after authentication, call `acceptInvitation`, select the accepted trip, show success/failure feedback, and remove the token with `history.replaceState` regardless of outcome so refresh cannot replay it accidentally.

- [ ] **Step 5: Preserve feature and viewer behavior**

Keep all existing tabs mounted through `AppShell`, retain current responsive styling, show selected-trip loading/error/empty states, and ensure every editing control still derives from `isReadOnly`.

- [ ] **Step 6: Type-check and build**

Run: `npx tsc -b --pretty false && npm run build`

Expected: both commands exit 0 and Vite writes a production `dist/` bundle.

- [ ] **Step 7: Commit collaboration UI**

```bash
git add src/trip/TripManager.tsx src/components/AppShell.tsx src/auth/AccountMenu.tsx src/app/App.tsx src/styles/global.css
git commit -m "Add multi-trip collaboration interface"
```

### Task 5: Documentation And Final Verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: completed migration and frontend behavior.
- Produces: operator documentation and verified local commits.

- [ ] **Step 1: Document deployment order and rollback**

Describe reviewing/applying the migration before deploying the frontend, invoking `import_legacy_main_trip()` after migration, invitation links, private photo paths, normalized cache keys, and rollback through untouched `trip_state.main`.

- [ ] **Step 2: Verify no remote action or legacy mutation was introduced**

Run: `git diff HEAD~4 -- supabase README.md src package.json package-lock.json`

Expected: only reviewed local migration/frontend/docs changes; no scripts invoke remote migration tools; no update/delete statement targets `public.trip_state`.

- [ ] **Step 3: Run final Node 22 verification**

Run: `node --version && npx tsc -b --pretty false && npm run build`

Expected: Node reports v22 or newer; TypeScript and Vite exit 0.

- [ ] **Step 4: Inspect worktree and diff summary**

Run: `git status --short --branch && git diff --check && git diff --stat HEAD~4`

Expected: no whitespace errors and only intended files are changed or committed.

- [ ] **Step 5: Commit documentation**

```bash
git add README.md docs/superpowers/plans/2026-07-11-normalized-collaboration.md
git commit -m "Document normalized trip operations"
```
