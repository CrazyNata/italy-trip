# Budget Money Font Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render all budget monetary values in the existing Space Mono font for clearer digit alignment.

**Architecture:** Change only inline `fontFamily` declarations for amount values in `Budget.tsx`. Preserve the existing Playfair Display typography for headings and all conversion behavior.

**Tech Stack:** React, TypeScript, inline CSS, Vite

## Global Constraints

- Use `"'Space Mono',ui-monospace,monospace"` only for monetary values.
- Keep headings, labels, expense names, colors, sizes, and currency behavior unchanged.
- The user manually reviews EUR, RUB, and CZK after production build.

---

### Task 1: Apply Space Mono to Budget Amounts

**Files:**
- Modify: `src/features/budget/Budget.tsx:65-74`

**Interfaces:**
- Consumes: existing `formatAmount` output
- Produces: monospaced display for total, family, daily, and individual expense amounts

- [ ] **Step 1: Identify the four money value styles**

Read the budget render and locate the inline amount style declarations for the hero total, family total, daily total, and expense-row amount.

- [ ] **Step 2: Replace their font families**

Use this exact declaration in each of the four money value styles:

```tsx
fontFamily: "'Space Mono',ui-monospace,monospace"
```

Do not change the `h2` title font or any non-amount typography.

- [ ] **Step 3: Run the production build**

Run:

```bash
PATH="/home/natasha/.local/node22/bin:$PATH" npm run build
```

Expected: TypeScript and Vite complete successfully.

- [ ] **Step 4: Ask the user to test manually**

Ask the user to review the Budget tab in EUR, RUB, and CZK, focusing on readable currency symbols and aligned digits in all four amount locations.
