# Hide Food Sight Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove «еда» from the Sights subcategory filter while preserving it everywhere else.

**Architecture:** Apply a one-expression filter only where the subcategory filter options are rendered. Keep the shared `subs` array unchanged so adding and displaying food-category sights continue to work.

**Tech Stack:** React, TypeScript, Vite

## Global Constraints

- Hide `еда` only from the subcategory filter.
- Keep `еда` in the add-sight category selector.
- Preserve existing food-category sights and stored data.
- Use Node.js 22 from `/home/natasha/.local/node22/bin` for verification.

---

### Task 1: Filter the Subcategory Filter Options

**Files:**
- Modify: `src/features/sights/Sights.tsx:549`

**Interfaces:**
- Consumes: existing `subs: string[]`
- Produces: filter options excluding `еда`; all other uses of `subs` remain unchanged

- [ ] **Step 1: Confirm the shared options baseline**

Run:

```bash
rg -n 'subs\.map|: subs\)' src/features/sights/Sights.tsx
```

Expected: separate matches for the add form, filter, and category rendering.

- [ ] **Step 2: Exclude food only in the filter expression**

In the filter controls, replace the final branch:

```tsx
: subs
```

with:

```tsx
: subs.filter((sub) => sub !== "еда")
```

Do not alter the add form's `subs.map(...)` or the category-rendering `subs.map(...)`.

- [ ] **Step 3: Verify the scoped change**

Run:

```bash
rg -n 'subs\.filter|subs\.map' src/features/sights/Sights.tsx
```

Expected: exactly one `subs.filter((sub) => sub !== "еда")` in the filter controls, while the add form and category rendering still use `subs.map`.

- [ ] **Step 4: Run the production build**

Run:

```bash
PATH="/home/natasha/.local/node22/bin:$PATH" npm run build
```

Expected: TypeScript and Vite complete successfully.

- [ ] **Step 5: Review the focused diff**

Run:

```bash
git diff --check && git diff -- src/features/sights/Sights.tsx
```

Expected: the new change affects only the filter option source; previously approved background changes may also remain in the uncommitted diff.
