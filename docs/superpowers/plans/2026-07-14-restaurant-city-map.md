# Restaurant City Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a city-specific Mapbox restaurant map and marker list after restaurant filters.

**Architecture:** Add a focused map component inside the restaurants feature. It consumes filtered restaurants with coordinates, renders numbered markers, focuses a marker from the adjacent list, and creates a Google Maps multi-stop URL. The existing cards remain below in a separate collapsible section.

**Tech Stack:** React, TypeScript, Mapbox GL, existing Mapbox token and map theme.

### Task 1: Create city restaurant map

**Files:**
- Create: `src/features/restaurants/RestaurantCityMap.tsx`

- [ ] Render numbered Mapbox markers for typed `Restaurant[]` inputs with `lnglat`, fit bounds, accept focused ID, and show token/map errors consistently with `Sights`.

### Task 2: Integrate restaurant map panel

**Files:**
- Modify: `src/features/restaurants/Restaurants.tsx`

- [ ] Add city selection, independent map/card collapse state, short marker list, focus state, and Google Maps copy URL after filters.
- [ ] Keep existing geolocation sorting and all restaurant cards below the map panel.
- [ ] Build with Node 22, commit, and push.
