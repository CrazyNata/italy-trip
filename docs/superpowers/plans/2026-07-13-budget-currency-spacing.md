# Budget Currency Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate every displayed currency symbol from its budget amount with a non-breaking space.

**Architecture:** Update the existing `formatAmount` formatter in `Budget.tsx`, which is already shared by all four budget amount locations. No state, conversion, or input code changes are needed.

**Tech Stack:** React, TypeScript, Vite

## Global Constraints

- `formatAmount` returns `currency symbol + non-breaking space + formatted number`.
- The change applies to the total, family, daily, and expense-row amounts.
- The input placeholder, currency selector, and EUR conversion remain unchanged.
- The user manually reviews EUR, RUB, and CZK after production build.

---

### Task 1: Format Currency and Amount Separately

**Files:**
- Modify: `src/features/budget/Budget.tsx:42`

**Interfaces:**
- Consumes: `symbols: Record<Currency, string>`, `displayCurrency`, `money`, and `rate`
- Produces: `formatAmount(eur: number): string` in the form `Kč 22 436`

- [ ] **Step 1: Update the amount formatter**

Replace the current formatter with:

```tsx
const formatAmount = (eur: number) => `${symbols[displayCurrency]}\u00a0${money(Math.round(eur * rate))}`;
```

- [ ] **Step 2: Confirm all budget amounts still use the formatter**

Run:

```bash
rg "formatAmount\(" src/features/budget/Budget.tsx
```

Expected: the formatter definition plus calls for total, family total, daily total, and every expense-row amount.

- [ ] **Step 3: Run the production build**

Run:

```bash
PATH="/home/natasha/.local/node22/bin:$PATH" npm run build
```

Expected: TypeScript and Vite complete successfully.

- [ ] **Step 4: Ask the user to test manually**

Ask the user to switch among EUR, RUB, and CZK in the Budget tab and verify a visible gap with no line break between the currency and amount.
