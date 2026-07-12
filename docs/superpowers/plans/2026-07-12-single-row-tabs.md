# Single-Row Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fit all eight navigation tabs on one desktop row while retaining mobile horizontal scrolling.

**Architecture:** Change only the existing `.tabbar` rules in `global.css`. Prevent wrapping globally and compact desktop tab typography and spacing; preserve the existing mobile overflow behavior.

**Tech Stack:** CSS, React, Vite

## Global Constraints

- Keep all labels, icons, links, active styles, and keyboard behavior unchanged.
- Desktop tabs use `15px` text and `12px` horizontal padding.
- Mobile tabs remain a non-wrapping horizontally scrollable row.
- Use Node.js 22 from `/home/natasha/.local/node22/bin` for verification.

---

### Task 1: Compact Desktop Tab Navigation

**Files:**
- Modify: `src/styles/global.css:54-57`

**Interfaces:**
- Consumes: existing `.tabbar` and `.tabbar a` markup from `AppShell.tsx`
- Produces: a single-row desktop tab bar with unchanged mobile scrolling

- [ ] **Step 1: Confirm the wrapping baseline**

Read the `.tabbar` rules and confirm the desktop declaration contains:

```css
flex-wrap:wrap;
```

and tab links contain:

```css
padding:13px 18px;
font-size:17px;
```

- [ ] **Step 2: Apply the compact desktop styles**

Change the desktop rules to:

```css
.tabbar { display:flex; flex-wrap:nowrap; gap:4px; margin-top:26px; border-bottom:1px solid var(--line); }
.tabbar button, .tabbar a { display:inline-flex; align-items:center; margin-bottom:-1px; padding:13px 12px; border:0; border-bottom:2px solid transparent; background:none; color:var(--muted); font-size:15px; font-weight:600; text-decoration:none; white-space:nowrap; cursor:pointer; }
```

Leave the active-state, icon, and mobile media-query rules unchanged.

- [ ] **Step 3: Run the production build**

Run:

```bash
PATH="/home/natasha/.local/node22/bin:$PATH" npm run build
```

Expected: TypeScript and Vite complete successfully.

- [ ] **Step 4: Inspect desktop and mobile behavior**

At desktop width, verify all tabs from «Обзор» through «Фото» stay on one row. At mobile width, verify the row remains horizontally scrollable and no label wraps.

- [ ] **Step 5: Review the focused diff**

Run:

```bash
git diff --check && git diff -- src/styles/global.css
```

Expected: only `.tabbar` wrapping, desktop horizontal padding, font size, and `white-space` change.
