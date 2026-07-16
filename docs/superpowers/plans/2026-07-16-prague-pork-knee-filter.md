# Prague Pork Knee Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the veprevo-koleno toggle show tagged venues from Prague only.

**Architecture:** Extend the existing `porkKneeOnly` predicate in `Restaurants` with a fixed city comparison. The city selector remains separate, allowing its existing predicate to compose naturally.

**Tech Stack:** React, TypeScript, Vite, Node 22.

## Global Constraints

- Do not modify the city selector state when the pork-knee toggle changes.
- With the toggle enabled, a record must have `hasPorkKnee` and city `Прага, Чехия`.
- All other filters retain their current behavior.

---

### Task 1: Restrict The Pork Knee Predicate

**Files:**
- Modify: `src/features/restaurants/Restaurants.tsx:112`

**Interfaces:**
- Consumes: `Restaurant.hasPorkKnee` and `Restaurant.city`.
- Produces: a filtered list of Prague pork-knee venues.

- [ ] **Step 1: Replace the pork-knee predicate**

Replace:

```tsx
.filter((item) => !porkKneeOnly || item.hasPorkKnee)
```

with:

```tsx
.filter((item) => !porkKneeOnly || (item.hasPorkKnee && item.city === "Прага, Чехия"))
```

- [ ] **Step 2: Inspect the predicate**

Use the file-search tool to confirm the source contains both `item.hasPorkKnee` and `item.city === "Прага, Чехия"` in the pork-knee filter.

- [ ] **Step 3: Run the production build**

```bash
npx --yes --package node@22 --call 'node --version && npm run build'
```

Expected: Node reports v22 and Vite completes successfully.

- [ ] **Step 4: Commit and push**

```bash
git add src/features/restaurants/Restaurants.tsx
git commit -m "Limit pork knee filter to Prague"
git push
```
