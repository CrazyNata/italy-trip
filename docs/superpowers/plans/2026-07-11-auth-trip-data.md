# Authentication and Trip Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add production-grade Supabase authentication, owner/viewer authorization, appearance controls, and typed trip-state access to the React application.

**Architecture:** Layer `AuthProvider`, `AppearanceProvider`, and `TripDataProvider` so authentication establishes identity and remote configuration, appearance owns local profile preferences, and trip data owns the authoritative Supabase payload plus its local cache. Present those services through typed hooks and legacy-matched React controls.

**Tech Stack:** React 19, TypeScript, Supabase JS 2, Tailwind CSS 4, Vite 8.

## Global Constraints

- Do not add automated tests, test dependencies, analytics, error tracking, or UI kits.
- Do not change the production database.
- Keep public Supabase configuration only and load Mapbox through `app_config`.
- Preserve owner/viewer semantics and `italy_trip` as a migration/cache fallback.
- Run only `npm run build`, inspect for secrets, commit, and do not push.

---

### Task 1: Typed Trip Payload

**Files:**
- Create: `src/types/trip.ts`

- [ ] Define the versioned payload and all current trip, day, itinerary item, lodging, sight, expense, and link fields.
- [ ] Add runtime parsing guards that reject malformed remote/cache payloads without using `any`.

### Task 2: Authentication and Authorization

**Files:**
- Create: `src/auth/AuthContext.tsx`
- Modify: `src/auth/index.ts`

- [ ] Restore remember-login behavior and gate rendering until the initial session is resolved.
- [ ] Implement login, registration, sign-out, profile metadata updates, owner lookup through `admins`, and Mapbox token lookup through `app_config`.
- [ ] Expose explicit loading, authenticated, error, owner, and read-only state through `useAuth`.

### Task 3: Appearance Preferences

**Files:**
- Create: `src/appearance/AppearanceContext.tsx`

- [ ] Persist the three legacy themes and dark mode locally.
- [ ] Apply complete CSS variables through a typed `useAppearance` hook.

### Task 4: Authoritative Trip State

**Files:**
- Create: `src/trip/TripDataContext.tsx`

- [ ] Read and validate the local `italy_trip` cache while waiting for authentication.
- [ ] Pull `trip_state/main` after authentication and make valid remote data authoritative.
- [ ] Seed a missing row only for owners with cached data, debounce owner-only updates, and expose explicit loading/error/read-only state.
- [ ] Subscribe to realtime updates and keep polling as a safe fallback without requiring schema changes.

### Task 5: Auth and Profile UI

**Files:**
- Create: `src/auth/AuthGate.tsx`
- Create: `src/auth/AccountMenu.tsx`
- Create: `src/auth/ProfileDialog.tsx`

- [ ] Reproduce the legacy login/register gate with busy and human-readable error states.
- [ ] Reproduce the fixed avatar, account menu, role label, sign-out, image processing, theme controls, and dark-mode control.

### Task 6: Provider Integration and Status UI

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/styles/global.css`
- Modify: `README.md`

- [ ] Compose providers in dependency order and remove reliance on legacy window globals.
- [ ] Surface trip loading, cache fallback, synchronization errors, and viewer read-only state in the shell.
- [ ] Document the migrated runtime and public configuration model.

### Task 7: Verification and Commit

- [ ] Run `npm run build` and resolve all TypeScript/Vite failures.
- [ ] Inspect changed files and generated output for non-public credentials and accidental unrelated changes.
- [ ] Review auth transitions, cleanup, owner-only writes, remote precedence, and realtime fallback.
- [ ] Commit the intended files with a concise message; do not push.
