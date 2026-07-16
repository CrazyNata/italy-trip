# Budget Breakdown Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users expand the `На семью` and `В день` budget cards to inspect the contribution of each expense.

**Architecture:** Keep the interaction and calculation state within `Budget`. Derive each breakdown directly from `data.expenses`, `data.trip.people`, the fixed 16-day divisor, and the existing `formatAmount` function so changes to expenses and currency selection are reflected without persistence changes.

**Tech Stack:** React, TypeScript, inline component styles, Vite, Node 22.

## Global Constraints

- `На семью` divides each expense and headline total by `data.trip.people`.
- `В день` divides each expense and headline total by `16`.
- Both cards are keyboard-accessible buttons with `aria-expanded`.
- Keep the records card unchanged and do not modify trip data.

---

### Task 1: Add Expandable Budget Breakdowns

**Files:**
- Modify: `src/features/budget/Budget.tsx:20-84`

**Interfaces:**
- Consumes: `data.expenses`, `data.trip.people`, `formatAmount(eur: number): string`.
- Produces: two independently toggled summary-card breakdowns with per-expense amounts.

- [ ] **Step 1: Add local expanded-card state and fixed divisor**

Add immediately after the existing `currency` state:

```tsx
const [expandedBreakdowns, setExpandedBreakdowns] = useState<Record<"family" | "day", boolean>>({ family: false, day: false });
const dailyExpenseDays = 16;
```

Replace the current date-derived `days` expression with:

```tsx
const days = dailyExpenseDays;
```

- [ ] **Step 2: Add a reusable inline breakdown renderer**

Before `return`, declare:

```tsx
const breakdown = (divisor: number, color: string) => (
  <div style={{ display: "grid", gap: 6, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line,#e7dcc7)" }}>
    {data.expenses.map((expense) => (
      <div key={expense.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--muted,#8a7d6b)" }}>{expense.label}</span>
        <strong style={{ flex: "none", color, fontVariantNumeric: "tabular-nums" }}>{formatAmount(expense.amount / divisor)}</strong>
      </div>
    ))}
  </div>
);
```

- [ ] **Step 3: Replace the two static summary cards with buttons**

Replace each of the first two grid child `<div>` elements with a `<button type="button">` using the same visual styles plus `textAlign: "left"`. For the family card, use:

```tsx
onClick={() => setExpandedBreakdowns((current) => ({ ...current, family: !current.family }))}
aria-expanded={expandedBreakdowns.family}
```

For the day card, use the equivalent `day` state key. Add a chevron `<i className="fa-solid fa-chevron-down" />` beside each card label, with `transform: expandedBreakdowns.family ? "rotate(180deg)" : undefined` or the `day` equivalent. Render `{expandedBreakdowns.family && breakdown(data.trip.people, "var(--ac,#2a7089)")}` in the family card and `{expandedBreakdowns.day && breakdown(days, "var(--ac2,#d99a4e)")}` in the day card.

- [ ] **Step 4: Inspect interaction and calculation source**

Use the file-search tool to confirm `dailyExpenseDays = 16`, both `aria-expanded` properties, both breakdown calls, and `expense.amount / divisor` are present in `src/features/budget/Budget.tsx`.

- [ ] **Step 5: Run the production build**

```bash
npx --yes --package node@22 --call 'node --version && npm run build'
```

Expected: Node reports v22 and Vite completes successfully.

- [ ] **Step 6: Commit and push**

```bash
git add src/features/budget/Budget.tsx
git commit -m "Add budget card breakdowns"
git push
```
