# Restaurant Priority Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Filter restaurants by the `🔥 приоритет` status.

**Architecture:** Extend `Restaurants` local filter state and filter panel; no data model changes.

**Tech Stack:** React, TypeScript.

### Task 1: Add priority filter

**Files:**
- Modify: `src/features/restaurants/Restaurants.tsx`

- [ ] Add `priorityOnly` state, filter visible restaurants by `item.status === "🔥 приоритет"`, and add a toggle button to the existing panel.
- [ ] Build with Node 22, commit, and push.
