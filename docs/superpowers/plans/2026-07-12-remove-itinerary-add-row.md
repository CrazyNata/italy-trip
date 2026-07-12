# Remove Itinerary Add Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the add-item row from every itinerary day and delete its now-unused React logic.

**Architecture:** Make one focused change in `Itinerary.tsx`. Preserve rendering and controls for existing itinerary items while removing only draft state, item creation, and the corresponding form row.

**Tech Stack:** React, TypeScript, Vite

## Global Constraints

- Existing itinerary data must remain unchanged.
- Completion toggles, map links, deletion, and day rendering remain available.
- Remove unused imports and variables introduced by deleting the add flow.
- Use Node.js 22 from `/home/natasha/.local/node22/bin` for verification.

---

### Task 1: Remove Itinerary Item Creation UI

**Files:**
- Modify: `src/features/itinerary/Itinerary.tsx:1-69`

**Interfaces:**
- Consumes: existing `data.days` and item update/removal handlers
- Produces: itinerary day cards containing existing items but no add-item controls

- [ ] **Step 1: Confirm the add flow baseline**

Run:

```bash
rg -n 'drafts|setDrafts|const add|uid\(|day-draft|draft-title|draft-time|draft-add' src/features/itinerary/Itinerary.tsx
```

Expected: matches identify the draft state, add function, per-day draft variable, and form controls.

- [ ] **Step 2: Remove unused imports and creation logic**

Change the imports to:

```tsx
import { useState } from "react";
import { useTripData } from "../../trip/TripDataContext";
import { useConfirm } from "../../components/ConfirmDialog";
import type { ItineraryItem, TripDay } from "../../types/trip";
import { copyText, useTransientState } from "../shared";
```

Keep `useState` because copied-link feedback still uses it. Delete the `drafts` state declaration and the complete `add(dayId)` function.

- [ ] **Step 3: Remove the per-day draft and form row**

Change the day callback prefix from:

```tsx
{data.days.map((day) => { const done = day.items.filter((item) => item.done).length; const draft = drafts[day.id] || { title: "", time: "" }; const dayMapUrl = day.dayMapUrl?.trim(); return <div key={day.id} className="day-card">
```

to:

```tsx
{data.days.map((day) => { const done = day.items.filter((item) => item.done).length; const dayMapUrl = day.dayMapUrl?.trim(); return <div key={day.id} className="day-card">
```

Delete the complete `<div className="day-draft">...</div>` after the existing item list. Keep the surrounding `<div className="day-items">` so current items render unchanged.

- [ ] **Step 4: Verify the add flow is absent**

Run:

```bash
rg -n 'drafts|setDrafts|const add|uid\(|day-draft|draft-title|draft-time|draft-add|добавить пункт плана' src/features/itinerary/Itinerary.tsx
```

Expected: no matches and exit code 1.

- [ ] **Step 5: Run the production build**

Run:

```bash
PATH="/home/natasha/.local/node22/bin:$PATH" npm run build
```

Expected: TypeScript and Vite complete successfully.

- [ ] **Step 6: Review the focused diff**

Run:

```bash
git diff --check && git diff -- src/features/itinerary/Itinerary.tsx
```

Expected: only the add-item state, function, import, draft variable, and form row are removed.
