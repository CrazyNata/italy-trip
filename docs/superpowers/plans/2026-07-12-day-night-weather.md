# Day and Night Weather Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show daytime high and nighttime low temperatures for each city in both weather modes.

**Architecture:** Replace current-observation weather with daily weather in the «Сейчас» mode, and extend visit-date weather data to carry the daily low. Reuse Open-Meteo daily weather codes and render one compact day/night line in the existing city card.

**Tech Stack:** React, TypeScript, Open-Meteo API, Vite

## Global Constraints

- Both weather modes show `Днём` maximum and `Ночью` minimum.
- The «Сейчас» mode uses today's forecast; «В поездке» keeps current visit-date or historical behavior.
- City-card height, images, and layout remain unchanged.
- The user manually tests both modes after production build.

---

### Task 1: Load and Store Daily High/Low Temperatures

**Files:**
- Modify: `src/features/overview/Overview.tsx:35-115,147-164`

**Interfaces:**
- Consumes: Open-Meteo `daily.weather_code`, `daily.temperature_2m_max`, and `daily.temperature_2m_min`
- Produces: weather records with `high`, `low`, and `code` in both modes

- [ ] **Step 1: Expand weather types and daily payload**

Replace the current weather types with:

```tsx
type Weather = { high: number; low: number; code: number } | { error: true };
type ThenWeather = { high: number; low: number; code: number; iso: string; approx: boolean } | { error: true };
type DailyWeather = { daily?: { time?: string[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; weather_code?: number[] } };
```

- [ ] **Step 2: Carry lows through visit-date summary**

In `summarize`, read `temperature_2m_min`, store `{ high, low, code }` for selected days, average high and low separately, and return both values.

- [ ] **Step 3: Change current mode to today's daily forecast**

Replace the `current=temperature_2m,weather_code` request with:

```tsx
daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1
```

Read index `0` from the daily arrays and set `{ high, low, code }`. Preserve abort and error handling.

- [ ] **Step 4: Include minimum temperature in visit-date requests**

Append `temperature_2m_min` to the `daily` query parameter in `loadThenAll`.

### Task 2: Render Compact Day/Night Values

**Files:**
- Modify: `src/features/overview/Overview.tsx:224-242`

**Interfaces:**
- Consumes: `current.high` and `current.low`
- Produces: city card text `Днём +24° · Ночью +14°`

- [ ] **Step 1: Replace the large single temperature**

Replace the temperature span with a compact text span that renders:

```tsx
!current ? "…" : "error" in current ? "—" : `Днём ${Math.round(current.high)}° · Ночью ${Math.round(current.low)}°`
```

Use a readable `14px` bold style with white text shadow; retain the existing weather icon.

- [ ] **Step 2: Update current-mode subtitle**

Keep the weather condition but change the ending from `сейчас` to `сегодня`.

- [ ] **Step 3: Run the production build**

Run:

```bash
PATH="/home/natasha/.local/node22/bin:$PATH" npm run build
```

Expected: TypeScript and Vite complete successfully.

### Task 3: Manual Browser Verification

**Files:**
- No files modified

- [ ] **Step 1: Ask the user to test manually**

Ask the user to refresh the local app and verify that both «Сейчас» and «В поездке» show `Днём` and `Ночью` values in every loaded city card, while city images, conditions, and mode switch remain functional.
