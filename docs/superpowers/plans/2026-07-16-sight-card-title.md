# Sight Card Title Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep regular sight-card titles on one line while preserving the existing card layout.

**Architecture:** Apply the title-only visual rule where regular sight cards are rendered in `Sights.tsx`. The enclosing title container already has `minWidth: 0`, so the title can use CSS overflow properties without altering data, card dimensions, or action controls.

**Tech Stack:** React, TypeScript, inline CSS styles, Vite, Node 22.

## Global Constraints

- Change the title font from `17px` to `16px`.
- A title must not wrap; an overlong title must be clipped with an ellipsis.
- Do not change the grid width, checkbox, city row, image area, or action buttons.
- The repository has no automated test script; verify with the Node 22 production build.

---

### Task 1: Make Sight Card Titles Single-Line

**Files:**
- Modify: `src/features/sights/Sights.tsx:760`

**Interfaces:**
- Consumes: `Sight.name`, a string displayed in a normal sight card.
- Produces: a `16px` single-line title that truncates visually rather than changing card height.

- [ ] **Step 1: Confirm the existing title style is the unmodified baseline**

Run:

```bash
rg -n 'fontSize: 17, lineHeight: 1.22' src/features/sights/Sights.tsx
```

Expected: one match in the regular sight-card title.

- [ ] **Step 2: Apply the minimal title-only style change**

Replace the title element's inline style at `src/features/sights/Sights.tsx:760` with:

```tsx
style={{
  overflow: "hidden",
  color: sight.done ? "var(--muted,#8a7d6b)" : undefined,
  fontFamily: "'Playfair Display',serif",
  fontSize: 16,
  lineHeight: 1.22,
  textDecoration: sight.done ? "line-through" : "none",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}}
```

- [ ] **Step 3: Inspect the rendered rule in source**

Run:

```bash
rg -n 'fontSize: 16|textOverflow: "ellipsis"|whiteSpace: "nowrap"' src/features/sights/Sights.tsx
```

Expected: the three properties appear in the regular sight-card title style.

- [ ] **Step 4: Run the production build**

Run:

```bash
npx --yes --package node@22 --call 'node --version && npm run build'
```

Expected: Node reports v22 and Vite completes successfully.

- [ ] **Step 5: Commit and push**

```bash
git add src/features/sights/Sights.tsx
git commit -m "Keep sight card titles on one line"
git push
```

Expected: one commit is added to `main` and pushed to `origin/main`.
