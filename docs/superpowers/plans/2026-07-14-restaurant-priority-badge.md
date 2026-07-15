# Restaurant Priority Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a fire badge on priority restaurant cards.

**Architecture:** Render a small badge when `item.priority` is true; no data changes.

### Task 1: Render badge

**Files:**
- Modify: `src/features/restaurants/Restaurants.tsx`

- [ ] Render `🔥` beside the Google rating and price for priority cards; build, commit, and push.
