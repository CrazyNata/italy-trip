# React UI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder React panels with the complete legacy-equivalent trip application.

**Architecture:** Keep authentication, appearance, and synchronized trip data in the existing providers. Build focused feature components around typed payload updates, with shared browser-integration, map, modal, toast, and formatting utilities.

**Tech Stack:** React 19, TypeScript 7, Tailwind CSS 4, Vite 8, Mapbox GL 3, IndexedDB, browser File/EXIF APIs.

## Global Constraints

- `legacy/index.html` is authoritative for UI, Russian copy, interactions, integrations, and seed/current-data behavior.
- Preserve payload version `42`; newly modeled fields are optional and existing Supabase/cache payloads remain valid.
- Do not add automated tests, test dependencies, analytics, telemetry, Sentry, a UI kit, or production database changes.
- Use Tailwind plus focused CSS and preserve desktop, mobile, theme, and dark-mode behavior.
- Run with Node 22, build, manually inspect all tabs and handlers, run `git diff --check`, commit, and do not push.

---

### Task 1: Shared Model And UI Infrastructure

**Files:**
- Modify: `src/types/trip.ts`
- Create: `src/components/ui.tsx`
- Create: `src/lib/trip.ts`
- Create: `src/lib/browser.ts`
- Create: `src/lib/mapbox.ts`

**Interfaces:**
- Produces optional `ItineraryItem.mapUrl`, tolerant version-42 validation, date/currency/city helpers, owner guards, clipboard/image helpers, modal/lightbox/toast primitives, and lazy Mapbox loading.

- [ ] Expand interfaces and validators only with optional legacy fields; confirm `parseTripPayload` accepts payloads lacking every new field.
- [ ] Add reusable modal, lightbox, toast, empty/error state, and icon primitives with legacy Russian labels and keyboard dismissal.
- [ ] Add formatting, ID, clipboard, image resize, EXIF, IndexedDB, and lazy Mapbox helpers used by feature modules.
- [ ] Run `npm run build`; expected result is a zero-exit TypeScript/Vite build.

### Task 2: Overview And Global Shell

**Files:**
- Create: `src/features/overview/Overview.tsx`
- Create: `src/features/overview/RouteMap.tsx`
- Create: `src/features/overview/Weather.tsx`
- Create: `src/data/hero.ts`
- Modify: `src/components/AppShell.tsx`

**Interfaces:**
- Consumes: `TripData`, `useAuth().mapboxToken`, shared modal/lightbox and map loader.
- Produces: complete header/navigation and overview panel.

- [ ] Transcribe the exact header copy, dynamic departure countdown, nights count, tab labels/icons, hero slides, controls, and lightbox.
- [ ] Fetch and render legacy Open-Meteo city forecasts with loading and unavailable states.
- [ ] Render the route summary and Mapbox route markers/line after token resolution; destroy map instances on cleanup.
- [ ] Replace placeholder panel routing with mounted focused feature panels while preserving tab scrolling and keyboard navigation.
- [ ] Run `npm run build`; expected result is a zero-exit build.

### Task 3: Itinerary

**Files:**
- Create: `src/features/itinerary/Itinerary.tsx`
- Create: `src/features/itinerary/DayCard.tsx`

**Interfaces:**
- Consumes: `TripDay[]`, `updateData`, owner guard, clipboard helper.
- Produces: day cards and all itinerary mutations.

- [ ] Reproduce day headers, country flags, checklist completion, time/title editing, drafts, add/remove actions, and progress counts.
- [ ] Reproduce day and item Google Maps open/edit/copy behavior and transient copied feedback.
- [ ] Route every mutation through the owner guard and immutable `updateData` callback.
- [ ] Run `npm run build`; expected result is a zero-exit build.

### Task 4: Lodging And Cancellation

**Files:**
- Create: `src/features/lodging/Lodging.tsx`
- Create: `src/features/lodging/LodgingCard.tsx`
- Create: `src/features/lodging/Cancellation.tsx`

**Interfaces:**
- Consumes: `Lodging[]`, `updateData`, lightbox and clipboard primitives.
- Produces: lodging galleries/forms and sorted cancellation deadlines.

- [ ] Reproduce galleries, object positions, previous/next controls, full lightbox, statuses, links, notes, and add/edit/remove controls.
- [ ] Reproduce cancellation dates, urgency labels, remaining-day calculations, ascending/descending sorting, and lodging links.
- [ ] Preserve exact seeded values by editing only user-selected records and optional fields.
- [ ] Run `npm run build`; expected result is a zero-exit build.

### Task 5: Sights And Walking Routes

**Files:**
- Create: `src/features/sights/Sights.tsx`
- Create: `src/features/sights/SightCard.tsx`
- Create: `src/features/sights/SightDialog.tsx`
- Create: `src/features/sights/WalkingRoute.tsx`
- Create: `src/lib/geocoding.ts`

**Interfaces:**
- Consumes: `Sight[]`, `romeSightsV`, Mapbox token, `updateData`.
- Produces: filtering, editing, descriptions, geocoding, ordering, drag/drop, and walking maps.

- [ ] Reproduce city/group/subcategory filters, completion states, photo cards, edit/add/remove controls, and card-open behavior.
- [ ] Preserve stored descriptions and implement legacy Wikipedia lookup/fallback in the description dialog.
- [ ] Implement Nominatim lookup with Mapbox fallback, coordinate editing, walk-day assignment, ordering, and drag/drop group movement.
- [ ] Render ordered walking routes and markers in Mapbox and reproduce Google Maps route/copy links.
- [ ] Run `npm run build`; expected result is a zero-exit build.

### Task 6: Budget And Notes

**Files:**
- Create: `src/features/budget/Budget.tsx`
- Create: `src/features/notes/Notes.tsx`

**Interfaces:**
- Consumes: expenses, `budgetV`, notes, links, and `updateData`.
- Produces: complete budget calculations/forms and notes/link editing.

- [ ] Reproduce category totals, grand total, expense rows, amount parsing, category selection, and add/remove/edit actions.
- [ ] Reproduce freeform notes textarea and useful-link add/edit/open/remove controls.
- [ ] Preserve viewer interaction with links while owner-only controls show the read-only toast.
- [ ] Run `npm run build`; expected result is a zero-exit build.

### Task 7: Trip Photos

**Files:**
- Create: `src/features/photos/Photos.tsx`
- Create: `src/lib/photoStore.ts`
- Create: `src/lib/exif.ts`

**Interfaces:**
- Produces IndexedDB-backed local photo records with EXIF timestamps/GPS, import status, gallery, and lightbox.

- [ ] Port JPEG EXIF date and GPS parsing with file modification-time fallback.
- [ ] Store resized photo blobs and metadata in IndexedDB without adding photo data to the synchronized payload.
- [ ] Reproduce multi-file import progress/errors, chronological gallery, empty state, deletion, and lightbox navigation.
- [ ] Guard import/deletion for viewers and keep existing locally stored photos readable.
- [ ] Run `npm run build`; expected result is a zero-exit build.

### Task 8: Styling, Integration, And Verification

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/features/index.ts`
- Modify: `README.md`

**Interfaces:**
- Produces the complete integrated product and deployment documentation.

- [ ] Translate legacy spacing, typography, borders, colors, cards, buttons, forms, animations, maps, modals, and responsive rules to Tailwind plus focused CSS.
- [ ] Inspect every tab for live controls and trace each mutation to `updateData` plus owner guard; inspect modal/lightbox escape and backdrop behavior.
- [ ] Inspect Mapbox token gating/cleanup, Open-Meteo, Wikipedia, geocoding, clipboard, EXIF, IndexedDB, and stale async response handling.
- [ ] Run `node --version`; expected major version is `22`.
- [ ] Run `npm run build`; expected result is a zero-exit build and generated `dist/` assets.
- [ ] Run `git diff --check`; expected result is no output.
- [ ] Review `git status`, `git diff`, and changed files for credentials, placeholders, unrelated edits, or database changes.
- [ ] Commit all intended implementation files with a concise migration message; do not push.
