# React Vite Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the root legacy runtime with a production-ready React, TypeScript, Vite, and Tailwind foundation while retaining rollback material and all tracked media.

**Architecture:** Vite owns the root HTML entry and builds a typed React shell under `src/`. Existing runtime source moves to `legacy/`, tracked images remain untouched in `images/`, and deployment publishes only `dist/` at the `/italy-trip/` GitHub Pages base path.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Tailwind CSS 4, Supabase JS 2, Mapbox GL JS 3, Node 22.

## Global Constraints

- Do not alter Supabase production.
- Do not add automated tests, test dependencies, linting, analytics, telemetry, Sentry, UI kits, or unrelated dependencies.
- Verification is `npm run build` only.
- Preserve all tracked images and preserve the old runtime under `legacy/`; delete `tests/walk-sight-cards.test.mjs` as explicitly directed.
- Keep public Supabase configuration environment-safe and commit no secrets.
- Do not migrate application features beyond a responsive tab-ready shell.

---

### Task 1: Create the Vite foundation and preserve rollback material

**Files:**
- Create: `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `src/main.tsx`, `src/app/App.tsx`, `src/components/AppShell.tsx`, `src/auth/index.ts`, `src/features/index.ts`, `src/lib/supabase/client.ts`, `src/lib/mapbox/config.ts`, `src/styles/global.css`, `src/types/env.d.ts`
- Move: `auth.js`, `sync.js`, `support.js`, `image-slot.js`, and the old `index.html` into `legacy/`
- Preserve: `images/`
- Delete: `tests/walk-sight-cards.test.mjs`
- Modify: `.gitignore`, `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Produces: `supabase` browser client configured from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` with public fallbacks.
- Produces: `mapboxToken` from optional `VITE_MAPBOX_TOKEN`; no map initializes without a token.
- Produces: responsive `AppShell` with existing typography, dimensions, color variables, and tab placeholders.

- [ ] **Step 1: Preserve the old runtime and static media**

Move the legacy runtime files to `legacy/`, leave tracked images intact, and remove the obsolete automated test.

- [ ] **Step 2: Add the package and TypeScript/Vite configuration**

Pin current stable versions compatible with Node 22, set `engines.node` to `>=22`, configure Vite's base as `/italy-trip/`, and expose only `dev`, `build`, and `preview` scripts.

- [ ] **Step 3: Add focused React source boundaries**

Create the requested source directories, a typed Supabase client, optional Mapbox token configuration, global design tokens and fonts, and a responsive shell that can host the existing tabs later.

- [ ] **Step 4: Update GitHub Pages deployment and documentation**

Use Node 22, `npm ci`, `npm run build`, and upload `dist/`. Remove the obsolete `__BUILD__` replacement and document local setup, environment variables, deployment, and legacy rollback.

- [ ] **Step 5: Install and verify**

Run `npm install` and then `npm run build` under Node 22. Expected result: TypeScript and Vite complete successfully and produce `dist/index.html` plus hashed assets.

- [ ] **Step 6: Review and commit**

Inspect status and diff, confirm no `__BUILD__` remains in active deployment logic, then commit all intended changes with a concise migration message.
