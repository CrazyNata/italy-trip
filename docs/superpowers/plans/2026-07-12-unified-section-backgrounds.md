# Unified Section Backgrounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visually inconsistent white large panels in Restaurants and Sights with the warm container treatment already used in Lodging.

**Architecture:** Keep the existing component structure and inline-style convention. Change only container background declarations; preserve controls, modals, maps, data flow, and responsive layout.

**Tech Stack:** React, TypeScript, Vite, inline CSS using existing design tokens

## Global Constraints

- Use the existing Lodging container background: two subtle radial gradients over `var(--track,#efe4cf)`.
- Keep inputs, buttons, selects, maps, photos, and dialogs unchanged.
- Do not alter component behavior or data.
- The repository has no automated test suite; verification is `npm run build` plus browser inspection.

---

### Task 1: Unify Large Panel Backgrounds

**Files:**
- Modify: `src/features/restaurants/Restaurants.tsx:273`
- Modify: `src/features/sights/Sights.tsx:539,553`

**Interfaces:**
- Consumes: existing CSS custom properties `--track` and `--line`
- Produces: no new interface; visual-only inline-style changes

- [ ] **Step 1: Confirm the baseline white backgrounds**

Run:

```bash
rg -n 'background: "var\(--card,#fff\)"' src/features/restaurants/Restaurants.tsx src/features/sights/Sights.tsx
```

Expected: matches include the Sights add panel and walking-route section; the Restaurants filter panel may already contain the warm gradient if its pending edit is present.

- [ ] **Step 2: Apply the Lodging container treatment**

In the Restaurants filter panel and the two Sights containers, use this exact background while preserving all other style properties:

```tsx
background: "radial-gradient(120% 90% at 0% 0%, rgba(42,112,137,.16), transparent 55%), radial-gradient(120% 90% at 100% 100%, rgba(217,154,78,.16), transparent 55%), var(--track,#efe4cf)"
```

Do not change the filter controls, route controls, map, modal, or individual sight cards.

- [ ] **Step 3: Run the production build**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite finish successfully and create `dist/`.

- [ ] **Step 4: Inspect both sections in the running app**

Open `http://localhost:5173/italy-trip/` and verify:

- Restaurants filter panel uses the warm gradient background.
- Sights add panel and walking-route section use the same warm gradient background.
- Inputs, buttons, map, photos, and modal retain their prior styling.
- Layout remains usable at desktop and mobile widths.

- [ ] **Step 5: Review the focused diff**

Run:

```bash
git diff -- src/features/restaurants/Restaurants.tsx src/features/sights/Sights.tsx
```

Expected: only the three intended large-container style declarations differ.
