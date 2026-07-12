# Read-Only Cancellation Date Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove date editing from cancellation cards while retaining the displayed deadline, status, sorting, and navigation.

**Architecture:** Make a presentation-only change in the existing cancellation branch of `Lodging`. Delete the date input and update explanatory copy without changing stored data or deadline calculations.

**Tech Stack:** React, TypeScript, Vite, inline CSS

## Global Constraints

- The change applies only to the «Отмена» view.
- Stored cancellation dates and lodging editing elsewhere remain unchanged.
- Card navigation and date sorting remain unchanged.
- Use Node.js 22 from `/home/natasha/.local/node22/bin` for verification.

---

### Task 1: Remove Cancellation Date Editing

**Files:**
- Modify: `src/features/lodging/Lodging.tsx:194-226`

**Interfaces:**
- Consumes: existing `deadline(lodge)` output used for label, status, and sorting
- Produces: read-only cancellation cards with no date input

- [ ] **Step 1: Confirm the editable baseline**

Run:

```bash
rg -n 'Дату можно менять|type="date"|edit\(lodge.id, "freeCancel"' src/features/lodging/Lodging.tsx
```

Expected: all three editable-date markers are present in the cancellation view.

- [ ] **Step 2: Update the explanatory copy**

Replace the paragraph text with:

```tsx
Сроки бесплатной отмены по каждому жилью.
```

- [ ] **Step 3: Remove the date input**

Delete this complete element from each cancellation card:

```tsx
<input
  type="date"
  value={lodge.freeCancel || ""}
  onClick={(event) => event.stopPropagation()}
  onChange={(event) =>
    edit(lodge.id, "freeCancel", event.target.value)
  }
  style={{ border: "1px solid var(--line,#e7dcc7)", borderRadius: 9, padding: "9px 11px", fontSize: 13, background: "var(--soft,#fdfaf3)", color: "var(--ink,#3b3228)" }}
/>
```

Keep the existing `item.label`, `item.status`, sort button, and card `navigate` handler unchanged.

- [ ] **Step 4: Verify editable markers are absent**

Run:

```bash
rg -n 'Дату можно менять|type="date"|edit\(lodge.id, "freeCancel"' src/features/lodging/Lodging.tsx
```

Expected: no matches and exit code 1.

- [ ] **Step 5: Run the production build**

Run:

```bash
PATH="/home/natasha/.local/node22/bin:$PATH" npm run build
```

Expected: TypeScript and Vite complete successfully.

- [ ] **Step 6: Review the focused diff**

Run:

```bash
git diff --check && git diff -- src/features/lodging/Lodging.tsx
```

Expected: only the explanatory copy and date input are removed; displayed deadline, status, sorting, and navigation remain intact.
