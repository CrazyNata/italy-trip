# Outlined Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn every navigation tab into a brighter outlined button with clear hover, active, and keyboard-focus states.

**Architecture:** Extend the existing `.tabbar` CSS only. Keep `AppShell.tsx` markup and routing untouched, using current `aria-selected` state and theme tokens.

**Tech Stack:** CSS, React, Vite

## Global Constraints

- Keep the single-row desktop layout and mobile horizontal scrolling.
- Use `6px` desktop gaps, `14px` horizontal button padding, and evenly distribute remaining desktop space.
- Reset desktop distribution to `justify-content:flex-start` in the mobile media query.
- Preserve tab labels, icons, links, and keyboard navigation.
- Use existing theme tokens so the design follows appearance themes.
- Use Node.js 22 from `/home/natasha/.local/node22/bin` for verification.

---

### Task 1: Add Outlined Tab States

**Files:**
- Modify: `src/styles/global.css:54-57`

**Interfaces:**
- Consumes: `.tabbar a` and `aria-selected="true"` from `AppShell.tsx`
- Produces: outlined default, hover, active, and focus-visible styles

- [ ] **Step 1: Confirm the current tab rules**

Read `.tabbar`, `.tabbar a`, the selected-state rule, and the mobile media query. Confirm the links are already non-wrapping and compact.

- [ ] **Step 2: Add the default outlined appearance**

Extend `.tabbar` with:

```css
gap:6px;
justify-content:space-between;
```

Use `padding:13px 14px` in the tab-link declaration and extend it with:

```css
border:1px solid var(--line);
border-bottom:2px solid var(--line);
border-radius:9px 9px 0 0;
background:color-mix(in srgb,var(--card) 72%,transparent);
transition:background .15s,border-color .15s,color .15s,box-shadow .15s;
```

Keep the existing font size and `white-space:nowrap`.

- [ ] **Step 3: Add hover, active, and focus states**

Use these declarations:

```css
.tabbar button:hover, .tabbar a:hover { border-color:var(--ac); background:var(--soft); color:var(--ac); }
.tabbar button[aria-selected="true"], .tabbar a[aria-selected="true"] { border-color:var(--ac); border-bottom-color:var(--ac); background:var(--track); color:var(--ac); box-shadow:0 2px 8px color-mix(in srgb,var(--ac) 14%,transparent); }
.tabbar button:focus-visible, .tabbar a:focus-visible { outline:2px solid var(--ac); outline-offset:2px; }
```

In the existing mobile `.tabbar` media-query declaration, add:

```css
justify-content:flex-start;
```

Keep mobile horizontal overflow and non-wrapping behavior unchanged.

- [ ] **Step 4: Run the production build**

Run:

```bash
PATH="/home/natasha/.local/node22/bin:$PATH" npm run build
```

Expected: TypeScript and Vite complete successfully.

- [ ] **Step 5: Inspect responsive interaction states**

At desktop and mobile widths, verify every tab has a visible border and light background, the active tab is clearly stronger, hover does not shift layout, keyboard focus is visible, desktop remains one row, and mobile remains horizontally scrollable.

- [ ] **Step 6: Review the focused diff**

Run:

```bash
git diff --check && git diff -- src/styles/global.css
```

Expected: only the navigation tab CSS changes; no component behavior changes.
