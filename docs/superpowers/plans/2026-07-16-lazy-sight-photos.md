# Lazy Sight Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Defer loading offscreen sight-card photos to improve initial page responsiveness.

**Architecture:** Use native image loading hints on the existing sight-card `<img>`. No sight data, layout, or image source changes are needed.

**Tech Stack:** React, TypeScript, browser-native lazy image loading, Node 22 Vite build.

## Global Constraints

- Add `loading="lazy"` and `decoding="async"` only to regular sight-card images.
- Preserve source URL, alt text, crop mode, click behavior, and layout.
- Add no dependency or server-side image layer.

---

### Task 1: Defer Offscreen Sight Photos

**Files:**
- Modify: `src/features/sights/Sights.tsx:735-739`

**Interfaces:**
- Consumes: `Sight.photo` and `Sight.name`.
- Produces: browser-native deferred loading for card images.

- [ ] **Step 1: Add image loading hints**

Update the regular card image element to include:

```tsx
loading="lazy"
decoding="async"
```

Keep its existing `src`, `alt`, and inline style unchanged.

- [ ] **Step 2: Inspect the image attributes**

Use the file-search tool to confirm both `loading="lazy"` and `decoding="async"` occur in the regular sight-card image.

- [ ] **Step 3: Run the production build**

```bash
npx --yes --package node@22 --call 'node --version && npm run build'
```

Expected: Node reports v22 and Vite completes successfully.

- [ ] **Step 4: Commit and push**

```bash
git add src/features/sights/Sights.tsx
git commit -m "Lazy load sight photos"
git push
```
