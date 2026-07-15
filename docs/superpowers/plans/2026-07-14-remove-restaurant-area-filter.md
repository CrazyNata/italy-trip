# Remove Restaurant Area Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the restaurant area filter UI and logic.

**Architecture:** Delete the local area filter state, derived areas list, filtering condition, and select control; retain `Restaurant.area` data.

### Task 1: Remove area filter

**Files:**
- Modify: `src/features/restaurants/Restaurants.tsx`

- [ ] Remove area-filter state, memo, condition, and control; build, commit, and push.
