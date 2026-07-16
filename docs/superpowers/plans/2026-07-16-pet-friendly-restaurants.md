# Pet-Friendly Restaurants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mark verified dog-friendly places, display the dog indicator, and prioritize them through the Restaurants sort menu.

**Architecture:** Add a `petFriendly` field to the existing `Restaurant` data model and use it directly in the existing list, sort, card, and editor flows. Research produces a 101-row evidence table; one timestamp-guarded Supabase update adds only `petFriendly: true` to confirmed records.

**Tech Stack:** React 19, TypeScript, Supabase Postgres JSONB, existing Restaurants feature, Node 22 Vite build.

## Global Constraints

- Research all 101 current restaurant records, including bars and cafes.
- Set `petFriendly: true` only when an official venue source, Google Maps, or a visitor review explicitly confirms dogs or pets are accepted.
- Do not set a field for places without confirmation; this does not mean dogs are prohibited.
- Show `🐶` with title and accessible label `Можно с собакой` on confirmed cards.
- Add `pet friendly` sort: confirmed places first and preserve the existing relative order within each group.
- The owner editor has a manual `petFriendly` toggle.
- Preserve every unrelated trip field and run the production build under Node 22.

---

### Task 1: Add Pet-Friendly UI Support

**Files:**
- Modify: `src/types/trip.ts:72-99`
- Modify: `src/features/restaurants/RestaurantEditorModal.tsx:71-104`
- Modify: `src/features/restaurants/Restaurants.tsx:80-125,342-356,459-462`

**Interfaces:**
- Consumes: `Restaurant.petFriendly?: boolean`.
- Produces: a card dog indicator, owner editor control, and `sortBy: "petFriendly"` behavior.

- [ ] **Step 1: Extend the Restaurant model**

Add this property after `priority` in `src/types/trip.ts`:

```ts
/** Подтверждено, что в заведение можно с собакой. */
petFriendly?: boolean;
```

- [ ] **Step 2: Add the owner editor toggle**

Add a button to the existing `Статус` fieldset in `src/features/restaurants/RestaurantEditorModal.tsx`:

```tsx
<button
  type="button"
  className={draft.petFriendly ? "is-active" : ""}
  onClick={() => onChange({ petFriendly: !draft.petFriendly })}
>
  🐶 Можно с собакой
</button>
```

- [ ] **Step 3: Add sort behavior and option**

Extend the existing `sortBy` union with `"petFriendly"`. Before the existing booking/rating/price/distance sort branches, add:

```ts
if (sortBy === "petFriendly") {
  return Number(Boolean(b.item.petFriendly)) - Number(Boolean(a.item.petFriendly));
}
```

Add the option to the existing sort `<select>`:

```tsx
<option value="petFriendly" style={{ color: "var(--ink,#3b3228)" }}>pet friendly</option>
```

- [ ] **Step 4: Add the accessible card indicator**

Add this before the priority indicator inside the card metadata span in `src/features/restaurants/Restaurants.tsx`:

```tsx
{item.petFriendly && <span title="Можно с собакой" aria-label="Можно с собакой">🐶</span>}
```

- [ ] **Step 5: Verify the production build**

Run:

```bash
npx --yes --package node@22 --call 'node --version && npm run build'
```

Expected: Node 22 is printed and the Vite build exits successfully.

- [ ] **Step 6: Commit the UI change**

```bash
git add src/types/trip.ts src/features/restaurants/RestaurantEditorModal.tsx src/features/restaurants/Restaurants.tsx
git commit -m "Add pet-friendly restaurant controls"
```

### Task 2: Research And Persist Confirmed Places

**Files:**
- Create: `docs/superpowers/research/2026-07-16-pet-friendly-restaurants.md`
- Modify: `public.trip_state` row where `id = 'main'`

**Interfaces:**
- Consumes: the live 101-record `payload.data.restaurants` array and the `petFriendly` field from Task 1.
- Produces: an evidence table for every restaurant ID and `petFriendly: true` only on confirmed records.

- [ ] **Step 1: Capture the live research baseline**

```sql
select updated_at, item->>'id' id, item->>'city' city, item->>'name' name, item->>'link' link
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'restaurants') item
where trip_state.id = 'main'
order by city, name;
```

Expected: 101 rows and one `updated_at` timestamp.

- [ ] **Step 2: Create the complete evidence table**

Create `docs/superpowers/research/2026-07-16-pet-friendly-restaurants.md` with this exact table shape and one row per baseline ID:

```markdown
| ID | City | Name | Pet-friendly | Source type | Source URL | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| example_id | Рим, Италия | Example | yes | Google Maps | https://www.google.com/maps/... | Google lists dogs allowed. |
```

Use `yes` only for explicit confirmation from `Official`, `Google Maps`, or `Visitor review`; record `no confirmation` and leave the database field absent otherwise.

- [ ] **Step 3: Re-read the timestamp immediately before write**

```sql
select updated_at, jsonb_array_length(payload->'data'->'restaurants') restaurant_count
from public.trip_state
where id = 'main';
```

Expected: record count remains 101. If the timestamp changed, repeat Step 1 and remove IDs no longer present.

- [ ] **Step 4: Apply the guarded JSONB update**

Build a `confirmed(id)` CTE with every research row marked `yes`. Update the array with:

```sql
jsonb_agg(
  case when confirmed.id is null then item
  else item || '{"petFriendly": true}'::jsonb end
  order by ord
)
```

Use `where id = 'main' and updated_at = 'EXPECTED_UPDATED_AT'::timestamptz`, and return the updated timestamp and restaurant count. Expected: one returned row and a count of 101.

- [ ] **Step 5: Verify source coverage and stored types**

```sql
select
  count(*) restaurants,
  count(*) filter (where item ? 'petFriendly') flagged,
  count(*) filter (where item ? 'petFriendly' and jsonb_typeof(item->'petFriendly') <> 'boolean') invalid_flags
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'restaurants') item
where trip_state.id = 'main';
```

Expected: `restaurants = 101`, `invalid_flags = 0`. Cross-check each flagged ID against a `yes` row in the research table and each `yes` row against a flagged ID.

- [ ] **Step 6: Verify the production build and commit evidence**

Run:

```bash
npx --yes --package node@22 --call 'node --version && npm run build'
git add docs/superpowers/research/2026-07-16-pet-friendly-restaurants.md
git commit -m "Document pet-friendly restaurants"
```

Expected: Node 22 build exits successfully and the research evidence is committed.
