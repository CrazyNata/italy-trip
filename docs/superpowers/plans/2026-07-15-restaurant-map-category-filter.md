# Restaurant Map Category Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store multiple restaurant category tags and filter only the restaurant-map content by those tags.

**Architecture:** Add a closed `RestaurantCategory` union and optional `categories` array to the persisted restaurant shape, validating every value during trip-data parsing. Keep category editing in `RestaurantEditorModal`; keep map-only selection state in `Restaurants`, filtering the existing city-and-coordinate collection before it is passed to markers, route generation, list, and cards.

**Tech Stack:** React 19, TypeScript 7, Vite 8, existing inline styles and trip-state validation.

## Global Constraints

- Categories are exactly: `пиццерия`, `морепродукты`, `желатерия`, `бар`, `ресторан`, `кафе`.
- A restaurant may have zero or more categories; missing data means no categories.
- Category selection acts only inside the map block and must not change the catalog filters or catalog cards.
- A selected map category matches a restaurant when at least one tag matches.
- No test runner exists; validate with `npx --yes node@22 ./node_modules/typescript/bin/tsc -b && npx --yes node@22 ./node_modules/vite/bin/vite.js build`.

---

### Task 1: Persist and edit restaurant categories

**Files:**
- Modify: `src/types/trip.ts:69-95,229-255`
- Modify: `src/features/restaurants/RestaurantEditorModal.tsx:1-100`

**Interfaces:**
- Produces `RestaurantCategory` union and `restaurantCategories` readonly list from `src/types/trip.ts`.
- Produces `Restaurant.categories?: RestaurantCategory[]`, accepted only when every persisted tag belongs to `restaurantCategories`.
- Consumes `draft.categories` in `RestaurantEditorModal` and emits `onChange({ categories: RestaurantCategory[] })`.

- [ ] **Step 1: Extend the persisted restaurant model and parser**

  Add the category definition next to the existing restaurant type and validate its array in `isRestaurant`:

  ```ts
  export const restaurantCategories = ["пиццерия", "морепродукты", "желатерия", "бар", "ресторан", "кафе"] as const;
  export type RestaurantCategory = (typeof restaurantCategories)[number];

  export interface Restaurant {
    // existing fields
    placeType?: "ресторан" | "кафе" | "бар";
    categories?: RestaurantCategory[];
  }

  // inside isRestaurant
  (value.categories === undefined ||
    (hasOptionalStringArray(value, "categories") &&
      value.categories.every((category) => restaurantCategories.includes(category as RestaurantCategory)))) &&
  ```

- [ ] **Step 2: Add a multi-select category field to the editor**

  Import `restaurantCategories`, then place this fieldset immediately after «Тип места». Each click adds or removes precisely one category without affecting `placeType`:

  ```tsx
  <fieldset className="restaurant-editor-options">
    <legend>Категории</legend>
    <div>
      {restaurantCategories.map((category) => {
        const selected = draft.categories?.includes(category) ?? false;
        return <button
          key={category}
          type="button"
          className={selected ? "is-active" : ""}
          onClick={() => onChange({
            categories: selected
              ? (draft.categories ?? []).filter((item) => item !== category)
              : [...(draft.categories ?? []), category],
          })}
        >{category}</button>;
      })}
    </div>
  </fieldset>
  ```

- [ ] **Step 3: Verify type safety and editor interaction**

  Run:

  ```bash
  npx --yes node@22 ./node_modules/typescript/bin/tsc -b
  ```

  Expected: exit code `0`. In the browser, select two category buttons in a restaurant editor, save, reopen it, and confirm both buttons remain active.

- [ ] **Step 4: Commit the data and editor work**

  ```bash
  git add src/types/trip.ts src/features/restaurants/RestaurantEditorModal.tsx
  git commit -m "Add restaurant category tags"
  ```

### Task 2: Filter the restaurant map by selected categories

**Files:**
- Modify: `src/features/restaurants/Restaurants.tsx:1-330`

**Interfaces:**
- Consumes `restaurantCategories` and `Restaurant.categories` from `src/types/trip.ts`.
- Produces `mapCategories: RestaurantCategory[]` state scoped to the map section.
- Produces `cityMappedRestaurants` for visibility of the map section and `mappedRestaurants` filtered by category.

- [ ] **Step 1: Add map-scoped category state and derived filtering**

  Import `RestaurantCategory` and `restaurantCategories`. Add `mapCategories` alongside `mapCity`, then filter the existing map collection:

  ```ts
  const [mapCategories, setMapCategories] = useState<RestaurantCategory[]>([]);

  const cityMappedRestaurants = list.filter((item) => item.city === activeMapCity && item.lnglat);
  const mappedRestaurants = cityMappedRestaurants.filter((item) =>
    (!mapCategories.length || item.categories?.some((category) => mapCategories.includes(category))),
  );

  const toggleMapCategory = (category: RestaurantCategory) => {
    setMapFocus(null);
    setMapCategories((current) => current.includes(category)
      ? current.filter((item) => item !== category)
      : [...current, category]);
  };
  ```

- [ ] **Step 2: Add the compact map filter control**

  In the map control row after the city `<select>`, add category toggle buttons using the existing active/inactive visual language. Do not connect this state to `placeTypeFilter` or `visible`:

  ```tsx
  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
    {restaurantCategories.map((category) => {
      const selected = mapCategories.includes(category);
      return <button
        key={category}
        type="button"
        onClick={() => toggleMapCategory(category)}
        style={{
          border: `1px solid ${selected ? "var(--ac,#b95c3f)" : "var(--line,#e7dcc7)"}`,
          background: selected ? "var(--ac,#b95c3f)" : "var(--soft,#fdfaf3)",
          color: selected ? "#fff" : "var(--ink,#3b3228)",
          borderRadius: "var(--r-1)", padding: "5px 8px", fontSize: 11.5,
          fontWeight: 600, cursor: "pointer",
        }}
      >{category}</button>;
    })}
  </div>
  ```

- [ ] **Step 3: Handle an empty filtered map collection**

  Change the outer map-section condition from `mappedRestaurants.length > 0` to `cityMappedRestaurants.length > 0`. Render a muted message instead of the grid when `mappedRestaurants.length === 0` after category selection:

  ```tsx
  {mappedRestaurants.length > 0
    ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
        {/* existing filtered list and RestaurantCityMap */}
      </div>
    : <div style={{ fontSize: 13, color: "var(--muted,#8a7d6b)", padding: "6px 0" }}>
        В этой категории нет ресторанов с координатами.
      </div>}
  ```

  Use the same derived `mappedRestaurants` for the Google Maps URL, count, route list, `RestaurantCityMap`, and lower city cards. This prevents points outside the selected categories from appearing in any map-specific UI.

- [ ] **Step 4: Verify production build and map behavior**

  Run:

  ```bash
  npx --yes node@22 ./node_modules/typescript/bin/tsc -b && npx --yes node@22 ./node_modules/vite/bin/vite.js build
  ```

  Expected: exit code `0`. In the browser, select one map category and confirm only matching markers, list rows, cards, and copied route remain; select a second category and confirm the result is the union; clear all selections and confirm all city restaurants return. Confirm catalog cards do not change.

- [ ] **Step 5: Commit the map filtering work**

  ```bash
  git add src/features/restaurants/Restaurants.tsx
  git commit -m "Filter restaurant map by categories"
  ```
