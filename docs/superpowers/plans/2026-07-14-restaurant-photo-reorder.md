# Restaurant Photo Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the restaurant editor move a photo left or right before saving.

**Architecture:** The modal calls a new callback with the reordered `photos` array; `Restaurants` applies it to the editor draft. Existing persistence saves the resulting array order.

**Tech Stack:** React, TypeScript, existing restaurant editor.

## Global Constraints

- Do not change storage or restaurant data types.
- Disable the left button for the first photo and right button for the last.

---

### Task 1: Add photo move controls

**Files:**
- Modify: `src/features/restaurants/RestaurantEditorModal.tsx`
- Modify: `src/features/restaurants/Restaurants.tsx`

- [ ] Add `onMovePhoto(index, amount)` to modal props and two accessible arrow buttons per photo.
- [ ] In `Restaurants`, reorder a copied `draft.photos` array and pass it to `onChange`.
- [ ] Build under Node 22 and commit the two files.
