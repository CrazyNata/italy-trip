# Restaurant Map Filter Popover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the always-visible category buttons in the restaurant map with a compact filter button and popover.

**Architecture:** Keep existing `mapCategories` filtering state in `Restaurants.tsx`. Add only `mapFiltersOpen` UI state; render the category buttons in an absolutely positioned popover anchored to the new button.

**Tech Stack:** React 19, TypeScript 7, Vite 8.

## Global Constraints

- The popover only controls the restaurant map.
- The button displays the selected-category count when nonzero.
- Existing category selection and map filtering behavior remain unchanged.

---

### Task 1: Replace visible map category buttons with a popover

**Files:**
- Modify: `src/features/restaurants/Restaurants.tsx:70-340`

**Interfaces:**
- Consumes existing `mapCategories`, `toggleMapCategory`, and `restaurantCategories`.
- Produces `mapFiltersOpen: boolean`, scoped to the map controls.

- [ ] **Step 1: Add the popover visibility state**

  ```ts
  const [mapFiltersOpen, setMapFiltersOpen] = useState(false);
  ```

- [ ] **Step 2: Replace the inline category button group**

  ```tsx
  <div style={{ position: "relative" }}>
    <button type="button" onClick={() => setMapFiltersOpen((open) => !open)}>
      <i className="fa-solid fa-sliders" /> Фильтры{mapCategories.length ? ` · ${mapCategories.length}` : ""}
    </button>
    {mapFiltersOpen && <div>
      <div>Категории</div>
      {restaurantCategories.map((category) => /* existing category toggle button */)}
    </div>}
  </div>
  ```

  Position the popup below the trigger, above map content, with the existing card colors, border, shadow, and a two-column category grid.

- [ ] **Step 3: Verify build and behavior**

  Run:

  ```bash
  npx --yes node@22 ./node_modules/typescript/bin/tsc -b && npx --yes node@22 ./node_modules/vite/bin/vite.js build
  ```

  Expected: exit code `0`. In the browser, open and close the filter popover, select multiple categories, confirm its count updates and the map changes while the catalog does not.

- [ ] **Step 4: Commit**

  ```bash
  git add src/features/restaurants/Restaurants.tsx
  git commit -m "Use popover for restaurant map filters"
  ```
