# Normalized Collaborative Trip Model

## Goal

Replace the single `trip_state.main` payload as the primary persistence model with normalized Supabase tables supporting multiple trips, one owner, viewers, invitations, Storage, and Realtime. Preserve the existing feature UI and retain `trip_state` and all legacy data unchanged as a rollback and read fallback.

## Architecture

The database stores trip metadata and each feature collection in focused tables. A typed frontend repository loads those rows and assembles the existing `TripData` aggregate consumed by feature screens. Existing feature components therefore keep their behavior while persistence, authorization, trip selection, and collaboration move behind the provider boundary.

Normalized data is authoritative when an authenticated user has at least one accessible trip. The legacy `trip_state.main` payload is read only when no normalized trip exists. Normalized writes never update or delete the legacy row.

## Schema

The migration creates `trips`, `trip_members`, `trip_invitations`, `trip_days`, `day_items`, `lodgings`, `places`, `expenses`, `notes`, `useful_links`, and `trip_photos`. A focused `legacy_trip_imports` table records completed imports. All entity keys are UUIDs; imported string IDs that are not UUIDs are retained in unique `legacy_id` columns rather than replaced in the legacy payload.

Every trip-owned table has a cascading `trip_id` foreign key, creation and update timestamps, and explicit stable ordering where rows form a collection. Child rows use ownership-consistent composite foreign keys where needed. Trigger functions maintain `updated_at`.

## Authorization

RLS is enabled on every new public table. Authenticated trip members can read trip data. Only the trip owner can create, update, or delete trip content, trip metadata, membership, and invitations. A trip owner is also represented in `trip_members` with role `owner`; constraints and RPCs preserve exactly one effective owner.

Membership and ownership checks use narrowly scoped `security definer` functions with `search_path = pg_catalog, public` and explicit schema qualification. Execute privileges are restricted. This avoids recursive policy evaluation through `trip_members`.

Invitation tokens are stored as hashes. Owner-only RPCs create invitations and return the one-time raw token, and revoke pending invitations. An authenticated acceptance RPC hashes the supplied token, locks the invitation, verifies expiry/status and the caller's normalized auth email, adds viewer membership, and marks the invitation accepted atomically. Direct client mutation of invitation acceptance fields is not allowed.

## Legacy Import

An idempotent import function reads `public.trip_state` row `main` without changing it. It deterministically selects the first `auth.users` account whose normalized email matches `public.admins`, ordered by normalized email then user UUID. It creates one trip and normalized child rows in a transaction.

`legacy_trip_imports.source = 'trip_state:main'` is unique and points to the imported trip, preventing duplication across retries. Imported source IDs are converted to UUIDs only when valid and collision-free; otherwise generated UUIDs are used and the original values are stored as `legacy_id`. JSON values map losslessly to matching columns, with focused JSON metadata only for source fields whose shape cannot be represented directly. Failed imports do not leave a marker or partial committed import.

## Storage And Photos

The migration creates a private `trip-photos` bucket idempotently. Object paths must begin with `<trip_uuid>/`. Storage policies derive that first path segment, require trip membership for reads, and require ownership for inserts, updates, and deletes. `trip_photos` stores object path and EXIF/display metadata; the frontend keeps local previews in trip-namespaced IndexedDB while durable photos use Storage.

## Realtime

All trip aggregate tables and collaboration tables needed by the current-trip UI are added idempotently to `supabase_realtime`. The frontend owns one channel for the selected trip. Relevant changes trigger a coalesced authoritative aggregate refresh; subscription cleanup prevents stale-trip updates.

## Frontend Data Flow

Typed repository modules encapsulate list/create/rename/delete trips, aggregate loading and persistence, member listing, invitation operations, Storage, and subscriptions. Narrow handwritten database types are used if generated project types are unavailable.

`TripDataProvider` owns the accessible trip list, selected trip ID, aggregate, per-trip cache, role, loading/error/sync states, and mutations. Selection is restored from a user-scoped local key and validated against accessible trips. Aggregate cache keys include user and trip UUID. Existing `updateData` calls remain supported and are serialized into normalized upserts/deletes with debouncing; viewers cannot invoke writes.

Trip management UI is integrated into the existing shell/account surfaces and includes selection, creation, rename, typed-name delete confirmation, member list, invitation creation/copy/revoke, and token acceptance. An invitation token in the URL is accepted after authentication and then removed from browser history.

## Failure Handling

Repository errors preserve the last valid per-trip cache and expose retry controls. Failed writes remain dirty for explicit retry. Realtime is an update signal, not the source payload. Trip switches cancel or invalidate stale reads and flush or clearly retain pending writes. Destructive trip deletion requires exact confirmation and relies on database cascades plus Storage cleanup performed before the trip row is removed.

## Verification

Review migration SQL for idempotency, fixed search paths, grants, RLS coverage, path parsing, publication membership, and preservation of legacy objects. Run TypeScript compilation and the Node 22 production build. Inspect the complete diff and git status before making a focused commit. Do not apply the migration remotely and do not push.
