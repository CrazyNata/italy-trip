# Fix Walking Routes and Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore Rome as the default walking-route city, use city-appropriate route headings, and add photos to the two new Castel Gandolfo sights.

**Architecture:** Adjust only the Sights component's city/day derivation. Apply a guarded JSONB data update for the two new sights, preserving all other trip data. Use manual browser verification requested by the user after production build.

**Tech Stack:** React, TypeScript, Supabase PostgreSQL JSONB, Vite

## Global Constraints

- No automated test framework is added; the user performs manual browser testing.
- Rome remains the default city because it has the most day-assigned sights.
- Rome's three day labels remain unchanged.
- Non-Rome cities use `Маршрут по городу` rather than Rome-specific labels.
- Use Node.js 22 from `/home/natasha/.local/node22/bin` for build verification.

---

### Task 1: Fix Walking Route City and Label Selection

**Files:**
- Modify: `src/features/sights/Sights.tsx:32-36,315-345,573`

**Interfaces:**
- Consumes: `Sight.city`, optional `Sight.walkDay`, and existing `days` labels
- Produces: default city selection based on assigned walking-route items and city-appropriate route headings

- [ ] **Step 1: Confirm the faulty fallback logic**

Read the current declarations and confirm the active city falls back to `cities[0]`, while the route heading always reads `days[walkDay]`.

- [ ] **Step 2: Derive the default city from assigned route items**

Before `activeCity`, derive a count per city for sights with `walkDay` and choose the city with the largest count. Preserve `walkCity` when it is a known city; otherwise use that derived city, falling back to `cities[0]` only when no sights have `walkDay`.

Use this exact logic:

```tsx
const routeCity = data.sights
  .filter((sight) => sight.walkDay && sight.city)
  .reduce<Record<string, number>>((counts, sight) => {
    counts[sight.city] = (counts[sight.city] || 0) + 1;
    return counts;
  }, {});
const defaultWalkCity = Object.entries(routeCity).sort(([, a], [, b]) => b - a)[0]?.[0] || cities[0] || "";
const activeCity = cities.includes(walkCity) ? walkCity : defaultWalkCity;
const walkTitle = activeCity === "Рим, Италия" ? days[walkDay] : "Маршрут по городу";
```

Use `walkTitle` in the route-card heading instead of `days[walkDay]`.

- [ ] **Step 3: Build the frontend**

Run:

```bash
PATH="/home/natasha/.local/node22/bin:$PATH" npm run build
```

Expected: TypeScript and Vite complete successfully.

### Task 2: Add Castel Gandolfo Route Day and Photos

**Files:**
- Data target: `public.trip_state`, row `id='main'`

**Interfaces:**
- Consumes: sight IDs `castel_gandolfo_town` and `lake_albano`
- Produces: both sights have first-day route positions and Wikimedia photos

- [ ] **Step 1: Confirm the data baseline**

Read the two sight records and confirm `walkDay`, `walkOrder`, and `photo` are absent.

- [ ] **Step 2: Perform an atomic guarded update**

Update only the matching sight objects inside `payload.data.sights`:

```sql
update public.trip_state
set payload = jsonb_set(
  payload,
  '{data,sights}',
  (
    select jsonb_agg(
      case item->>'id'
        when 'castel_gandolfo_town' then item || jsonb_build_object(
          'walkDay', 1,
          'walkOrder', 0,
          'photo', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Sudika_Castel_Gandolfo.jpg/330px-Sudika_Castel_Gandolfo.jpg'
        )
        when 'lake_albano' then item || jsonb_build_object(
          'walkDay', 1,
          'walkOrder', 1,
          'photo', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Panoramica_Lago_Albano.jpg/330px-Panoramica_Lago_Albano.jpg'
        )
        else item
      end
    )
    from jsonb_array_elements(payload->'data'->'sights') item
  ),
  true
), updated_at = now()
where id = 'main';
```

- [ ] **Step 3: Verify updated data**

Read the two sight records and confirm their photos are non-empty, `walkDay=1`, and order is `0`, then `1`.

### Task 3: Manual Browser Verification

**Files:**
- No files modified

- [ ] **Step 1: Ask the user to test in the browser**

Ask the user to refresh the running local app and verify:

- The walking route initially opens on `Рим, Италия`.
- Days 1, 2, and 3 display their Rome-specific labels and different route lists.
- Selecting `Кастель-Гандольфо, Италия` shows `Маршрут по городу` with exactly two locations in town-then-lake order.
- Both new locations render their photographs.
