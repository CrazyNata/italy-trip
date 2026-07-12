# Restaurant Photo Slots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reserve a consistent photo area at the top of every restaurant card and make the empty state upload interactive.

**Architecture:** Replace the conditional photo wrapper in `Restaurants` with a fixed-height wrapper that branches internally between the current photo viewer and a file-input label placeholder. Reuse the existing `uploadPhotos(item, files)` handler.

**Tech Stack:** React, TypeScript, inline CSS, Vite

## Global Constraints

- Every restaurant card has a `220px` top photo area.
- Existing photo viewer, lightbox, carousel, distance chip, and delete action remain unchanged.
- Empty state uses `var(--track)` plus camera icon and `Добавить фото`.
- The user manually tests the interface after build verification.

---

### Task 1: Add Persistent Restaurant Photo Slots

**Files:**
- Modify: `src/features/restaurants/Restaurants.tsx:351-394`

**Interfaces:**
- Consumes: `photos`, `item`, `uploadPhotos(item, files)`, and existing photo viewer callbacks
- Produces: every card renders a photo slot; photo-less cards expose a multiple-file input

- [ ] **Step 1: Confirm the conditional photo wrapper**

Read the restaurant-card render block and confirm the entire `height: 220` photo wrapper is guarded by `photos.length > 0`.

- [ ] **Step 2: Keep a fixed photo wrapper for every card**

Render the existing wrapper unconditionally:

```tsx
<div style={{ position: "relative", height: 220, overflow: "hidden", background: "var(--track,#efe4cf)" }}>
```

Inside it, keep all existing viewer content in the `photos.length > 0` branch.

- [ ] **Step 3: Add the empty upload placeholder**

In the `photos.length === 0` branch, add this label:

```tsx
<label title="Добавить фото" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", alignContent: "center", gap: 8, color: "var(--muted,#8a7d6b)", cursor: "pointer" }}>
  <i className="fa-solid fa-camera" style={{ fontSize: 28, color: "var(--ac,#b95c3f)" }} />
  <span style={{ fontSize: 13, fontWeight: 700 }}>Добавить фото</span>
  <input hidden type="file" accept="image/*" multiple onChange={(event) => { void uploadPhotos(item, event.target.files); event.target.value = ""; }} />
</label>
```

- [ ] **Step 4: Run the production build**

Run:

```bash
PATH="/home/natasha/.local/node22/bin:$PATH" npm run build
```

Expected: TypeScript and Vite complete successfully.

- [ ] **Step 5: Request manual browser testing**

Ask the user to verify in the local app:

- Every restaurant card has an equally tall photo header.
- A card without photos shows the camera and `Добавить фото`.
- Clicking the empty header opens a file picker.
- A card with photos retains its viewer, carousel, and delete control.
