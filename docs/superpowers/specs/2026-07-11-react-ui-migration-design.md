# React UI Migration Design

## Goal

Replace the placeholder React shell with the complete user-facing application from `legacy/index.html`. The legacy UI, Russian copy, interactions, integrations, and seed/current-data behavior are authoritative. The finished Vite application must remain visually and behaviorally equivalent on desktop and mobile without retaining the legacy runtime.

## Architecture

`AppShell` owns the header, tab navigation, synchronization status, read-only notifications, and top-level overlays. Each product area is implemented in a focused feature module: overview, itinerary, lodging and cancellation deadlines, sights, budget, photos, and notes. Shared UI and browser helpers cover modals, lightboxes, toasts, clipboard access, formatting, image processing, and map lifecycle without introducing a UI kit.

The existing `AuthProvider`, `AppearanceProvider`, and `TripDataProvider` remain the application service boundary. Persisted edits use only `TripDataContext.updateData`. Filters, active slides, open dialogs, gallery positions, import progress, weather responses, and map instances are ephemeral component state.

## Data Compatibility

The payload remains version `42`. TypeScript interfaces and runtime validators gain optional legacy fields needed by the UI, including itinerary map links. Existing Supabase rows and local `italy_trip` caches remain valid; absence of newly modeled optional fields never rejects current data. React does not silently rewrite or reseed valid remote data.

Owner mutations update the typed payload. Viewer mutation attempts leave data unchanged and show a Russian read-only toast.

## Features

- Overview reproduces the countdown, hero carousel and lightbox, weather cards from Open-Meteo, trip summary, and Mapbox route.
- Itinerary reproduces day cards, completion controls, item editing, day and item map links, clipboard feedback, and add/remove behavior.
- Lodging reproduces card galleries and lightbox, status controls, notes and link editing, add/remove behavior, and cancellation deadline sorting.
- Sights reproduces city/category filters, cards, descriptions, Wikipedia lookup, photo handling, editing, geocoding through Nominatim/Mapbox, walking-day assignment and ordering, drag/drop grouping, and route map/export links.
- Budget reproduces category totals, grand totals, expense editing, and add/remove behavior.
- Notes reproduces editable freeform notes and useful links with add/remove behavior.
- Photos reproduces file import, EXIF date/GPS extraction, IndexedDB storage, progress and failure feedback, chronological gallery, and lightbox navigation.
- All dialogs, lightboxes, theme variants, dark mode, and mobile layouts follow the legacy interaction and visual model.

## Integrations And Lifecycle

Mapbox GL is dynamically imported only after `AuthContext` supplies the token. Each map creates and destroys its instance with the owning component, updates on relevant data or appearance changes, and reports unavailable-token or network states without blocking other tabs.

Open-Meteo, Wikipedia, Nominatim, Mapbox geocoding, clipboard, FileReader, EXIF parsing, and IndexedDB calls retain legacy request behavior and user-facing fallbacks. Async work ignores stale responses after dependency changes or unmount.

## Styling

Tailwind expresses layout and component styling. Focused global CSS handles variables, Mapbox overrides, animation, image interaction, scrollbars, and responsive exceptions that are clearer in CSS. Existing appearance variables remain authoritative. No redesign, UI kit, placeholder panel, or fake disabled control is introduced.

## Error Handling

Network and browser API failures preserve usable local UI and show concise Russian feedback. Failed persisted saves continue through existing sync-state recovery. Image and photo import failures identify skipped files without discarding successful imports. Missing integration tokens produce an explanatory map state rather than a crash.

## Verification

Automated tests and test dependencies are intentionally excluded. Verification consists of a Node 22 production build, manual source-level walkthrough of every tab and state handler, responsive and dark-theme inspection where the environment permits, `git diff --check`, and review for credentials, placeholders, omitted controls, and unintended database changes. All intended changes are committed without push.
