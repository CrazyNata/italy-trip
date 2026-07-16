# Remove Geocode Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify both map control rows by removing manual geocoding and clearly naming the current-location action.

**Architecture:** Delete only the two `Найти точки` button elements and replace the displayed location label. Existing geocoding functions and map/location state remain unchanged.

**Tech Stack:** React 19, TypeScript, Node 22, Vite.

## Global Constraints

- Remove only visible `Найти точки` controls.
- Label both current-location controls `Моё местоположение` before a successful lookup and `Вы здесь` afterward.
- Preserve geolocation behavior, route URLs, map markers, stored destination coordinates, and geocoding functions.
- Add no dependency.

---

### Task 1: Simplify Map Controls

**Files:**
- Modify: `src/features/sights/Sights.tsx:697-699`
- Modify: `src/features/restaurants/Restaurants.tsx:298-299`

**Interfaces:**
- Produces: the existing `findWalkLocation` and `findLocation` actions through a renamed visible label.
- Preserves: `geocodeMissing` and `geocodeMapRestaurants` functions without rendering controls for them.

- [ ] **Step 1: Remove walking-route geocoding control**

Delete the complete `<button>` whose click handler is `() => void geocodeMissing()` from the `.walk-controls` JSX. Change the unsatisfied location-control label from:

```tsx
{walkLocation ? "Вы здесь" : "Моё место"}
```

to:

```tsx
{walkLocation ? "Вы здесь" : "Моё местоположение"}
```

- [ ] **Step 2: Remove restaurant-map geocoding control**

Delete the complete `<button>` whose click handler is `() => void geocodeMapRestaurants()` from the restaurant-map control JSX. Change the unsatisfied location-control label from:

```tsx
{userLoc ? "Вы здесь" : "Моё место"}
```

to:

```tsx
{userLoc ? "Вы здесь" : "Моё местоположение"}
```

- [ ] **Step 3: Inspect control copy**

Use the file-search tool to verify `Найти точки` has no occurrences in `src/features/sights/Sights.tsx` or `src/features/restaurants/Restaurants.tsx`, and `Моё местоположение` occurs once in each file.

- [ ] **Step 4: Run the production build**

```bash
npx --yes --package node@22 --call 'node --version && npm run build'
```

Expected: Node reports v22 and Vite completes successfully.

- [ ] **Step 5: Commit and push**

```bash
git add src/features/sights/Sights.tsx src/features/restaurants/Restaurants.tsx
git commit -m "Simplify map location controls"
git push
```
