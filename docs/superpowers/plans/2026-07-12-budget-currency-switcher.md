# Budget Currency Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users view and enter budget expenses in EUR, RUB, or CZK while preserving EUR as the stored currency.

**Architecture:** Add a local display-currency state and fetch EUR-based RUB/CZK rates once when `Budget` mounts. Convert stored EUR values only at the display and input boundaries; persist the selected display currency in `localStorage` and preserve the existing `Expense.amount: number` data shape.

**Tech Stack:** React, TypeScript, ExchangeRate-API, localStorage, Vite

## Global Constraints

- Expense amounts remain stored in EUR.
- Currency buttons do not reveal exchange rates to the user.
- Both RUB and CZK are disabled until a valid online rate is available.
- If rate loading fails, EUR remains selected and usable.
- The user manually tests behavior after production build.
- Use Node.js 22 from `/home/natasha/.local/node22/bin` for verification.

---

### Task 1: Add Currency State and Rate Loading

**Files:**
- Modify: `src/features/budget/Budget.tsx:1-24`

**Interfaces:**
- Consumes: `https://open.er-api.com/v6/latest/EUR` response field `rates.RUB` and `rates.CZK`
- Produces: `currency`, `rates`, `formatAmount`, and `toEur` for the render and add flow

- [ ] **Step 1: Define display-currency constants**

Immediately after `money`, add:

```tsx
const CURRENCY_KEY = "italy_budget_currency";
const currencies = ["EUR", "RUB", "CZK"] as const;
type Currency = (typeof currencies)[number];
const symbols: Record<Currency, string> = { EUR: "€", RUB: "₽", CZK: "Kč" };
```

- [ ] **Step 2: Add state and rate-loading effect**

Extend the React import with `useEffect`. Initialize currency from `localStorage` only when the stored value is `EUR`, `RUB`, or `CZK`; otherwise use `EUR`. Initialize rates as `{ EUR: 1, RUB: 0, CZK: 0 }`.

Fetch the API once in `useEffect`. Accept rates only if both are finite positive numbers. On success, set both rates; on failure, set currency to `EUR` and retain zero non-EUR rates. Abort the request on unmount.

- [ ] **Step 3: Add conversion helpers**

Before calculating `total`, define:

```tsx
const rate = rates[currency];
const canUseCurrency = currency === "EUR" || rate > 0;
const formatAmount = (eur: number) => `${symbols[currency]}${money(Math.round(eur * rate))}`;
const toEur = (amount: string) => (Number(amount) || 0) / rate;
const selectCurrency = (next: Currency) => {
  if (next !== "EUR" && rates[next] <= 0) return;
  setCurrency(next);
  try { localStorage.setItem(CURRENCY_KEY, next); } catch { /* Preference stays in memory. */ }
};
```

### Task 2: Render and Enter Converted Amounts

**Files:**
- Modify: `src/features/budget/Budget.tsx:17,25-42`

**Interfaces:**
- Consumes: `formatAmount`, `toEur`, `currencies`, `currency`, `rates`
- Produces: converted totals, expense rows, input placeholder, and currency switcher

- [ ] **Step 1: Convert new expense input to EUR before storage**

In `add`, replace `amount: Number(draft.amount) || 0` with:

```tsx
amount: toEur(draft.amount)
```

- [ ] **Step 2: Add the currency buttons to the hero**

Place an inline pill control below the total in the hero. Render `currencies.map`, use `selectCurrency(value)` on click, and disable RUB/CZK when `rates[value] <= 0`. The selected button uses white background with accent text; unselected buttons use a translucent background and white text. Do not show any rate number.

- [ ] **Step 3: Replace all hard-coded euro output**

Replace every `€{money(...)}` in total, family total, daily total, and expense rows with `formatAmount(...)`.

- [ ] **Step 4: Update the amount input marker**

Change the amount input placeholder from `€` to `symbols[currency]`. Keep its numeric input behavior unchanged.

- [ ] **Step 5: Run production build**

Run:

```bash
PATH="/home/natasha/.local/node22/bin:$PATH" npm run build
```

Expected: TypeScript and Vite complete successfully.

### Task 3: Manual Browser Verification

**Files:**
- No files modified

- [ ] **Step 1: Ask the user to test manually**

Ask the user to check the local app:

- EUR, RUB, and CZK buttons become selectable after loading.
- Total, family, day, and each expense change values and symbols together.
- Entering a new RUB or CZK expense, then switching to EUR, shows its converted EUR value.
- Reloading preserves the selected currency.
