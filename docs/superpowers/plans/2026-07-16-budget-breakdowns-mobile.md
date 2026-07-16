# Mobile Budget Breakdowns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render expanded budget breakdowns as full-width blocks below their source summary cards on phones.

**Architecture:** Add class names to the existing summary grid, buttons, in-card breakdowns, and mobile detail blocks. Each mobile block follows its source button in the grid. CSS moves layout responsibility to the existing 600px breakpoint: desktop retains in-card details, while mobile hides them and displays the equivalent block directly below its button.

**Tech Stack:** React, TypeScript, CSS media query, Vite, Node 22.

## Global Constraints

- Desktop details remain within their cards above 600px.
- At 600px or below, summary cards use a single column and each detail spans full width below its source card.
- Both family and day states remain independently expandable.
- Do not change calculation or currency formatting logic.

---

### Task 1: Add Responsive Detail Blocks

**Files:**
- Modify: `src/features/budget/Budget.tsx:73-92`
- Modify: `src/styles/global.css:182`

**Interfaces:**
- Consumes: `expandedBreakdowns.family`, `expandedBreakdowns.day`, and `breakdown(divisor, color)` from `Budget`.
- Produces: desktop in-card details and mobile full-width detail blocks using the same derived content.

- [ ] **Step 1: Add semantic class names in the budget component**

Set the summary grid `className="budget-summary-grid"`. Add `className="budget-summary-card"` to both interactive summary buttons. Wrap each existing in-card breakdown with a `div className="budget-summary-card-detail"`.

Immediately after the family button, add:

```tsx
{expandedBreakdowns.family && <div className="budget-summary-mobile-detail">{breakdown(familySize, "var(--ac,#2a7089)")}</div>}
```

Immediately after the day button, add:

```tsx
{expandedBreakdowns.day && <div className="budget-summary-mobile-detail">{breakdown(days, "var(--ac2,#d99a4e)")}</div>}
```

- [ ] **Step 2: Add desktop defaults and mobile rules**

Add to `src/styles/global.css` before the existing `@media (max-width: 600px)` block:

```css
.budget-summary-mobile-detail { display:none; }
```

Add inside that media query:

```css
.budget-summary-grid { grid-template-columns:1fr !important; }
.budget-summary-card-detail { display:none; }
.budget-summary-mobile-detail { display:block; margin:-2px 0 2px; padding:14px 16px; border:1px solid var(--line); border-radius:var(--r-3); background:var(--card); }
```

- [ ] **Step 3: Inspect responsive hooks**

Use the file-search tool to confirm every `budget-summary-*` class is present in the component and stylesheet. Confirm that `.budget-summary-card-detail` is only hidden inside the 600px media query.

- [ ] **Step 4: Run the production build**

```bash
npx --yes --package node@22 --call 'node --version && npm run build'
```

Expected: Node reports v22 and Vite completes successfully.

- [ ] **Step 5: Commit and push**

```bash
git add src/features/budget/Budget.tsx src/styles/global.css
git commit -m "Improve mobile budget breakdowns"
git push
```
