# Rome Reel Places Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three Rome food venues and two Castel Gandolfo sights to the live trip without creating duplicates.

**Architecture:** Perform one atomic JSONB update on `public.trip_state.payload` for `id='main'`. Build new restaurant and sight arrays from the current values, append each candidate only when no case-insensitive name match exists, and preserve every other payload field.

**Tech Stack:** Supabase PostgreSQL, JSONB

## Global Constraints

- Do not modify payload version or unrelated trip data.
- Do not duplicate an existing name, case-insensitively.
- Do not add Villa Borghese because it already exists.
- Use `[longitude, latitude]` coordinate order expected by the application.

---

### Task 1: Add Reel Recommendations to Live Trip Data

**Files:**
- No repository application files modified
- Data target: `public.trip_state`, row `id='main'`

**Interfaces:**
- Consumes: `payload.data.restaurants` and `payload.data.sights` JSON arrays
- Produces: the same payload with up to three restaurants and two sights appended

- [ ] **Step 1: Confirm names are absent and Villa Borghese is present**

Run a read-only SQL query that unnests both arrays and counts case-insensitive matches for `La Licata`, `Fatamorgana Monti`, `Trattoria Da Enzo al 29`, `Кастель-Гандольфо`, `Озеро Альбано`, and `Парк Вилла Боргезе`.

Expected: the five new names have count `0`; Villa Borghese has count `1`.

- [ ] **Step 2: Execute one atomic guarded update**

Execute this data update with the Supabase SQL tool:

```sql
with current_state as (
  select
    payload,
    coalesce(payload->'data'->'restaurants', '[]'::jsonb) as restaurants,
    coalesce(payload->'data'->'sights', '[]'::jsonb) as sights
  from public.trip_state
  where id = 'main'
), candidates as (
  select
    payload,
    restaurants,
    sights,
    jsonb_build_array(
      jsonb_build_object('id','r_rome_la_licata','name','La Licata','city','Рим, Италия','status','хочу','note','Кофе и выпечка рядом с Колизеем','link','https://www.google.com/maps/search/?api=1&query=La+Licata%2C+Via+dei+Serpenti+165%2C+Roma','price','€','lnglat',jsonb_build_array(12.4908830,41.8946396)),
      jsonb_build_object('id','r_rome_fatamorgana_monti','name','Fatamorgana Monti','city','Рим, Италия','status','хочу','note','Джелато в районе Монти','link','https://www.google.com/maps/search/?api=1&query=Fatamorgana+Monti%2C+Piazza+degli+Zingari+5%2C+Roma','price','€','lnglat',jsonb_build_array(12.4932453,41.8956187)),
      jsonb_build_object('id','r_rome_da_enzo_29','name','Trattoria Da Enzo al 29','city','Рим, Италия','status','хочу','note','Римская кухня в Трастевере; возможна очередь','link','https://www.google.com/maps/search/?api=1&query=Da+Enzo+al+29%2C+Via+dei+Vascellari+29%2C+Roma','price','€€','lnglat',jsonb_build_array(12.4778070,41.8880864))
    ) as restaurant_candidates,
    jsonb_build_array(
      jsonb_build_object('id','castel_gandolfo_town','name','Кастель-Гандольфо','city','Кастель-Гандольфо, Италия','group','необязательные','subcategory','достопримечательности','done',false,'description','Однодневная поездка из Рима: исторический центр и Апостольский дворец','lnglat',jsonb_build_array(12.6488774,41.7425222)),
      jsonb_build_object('id','lake_albano','name','Озеро Альбано','city','Кастель-Гандольфо, Италия','group','необязательные','subcategory','природа','done',false,'description','Вулканическое озеро рядом с Кастель-Гандольфо','lnglat',jsonb_build_array(12.6702040,41.7479605))
    ) as sight_candidates
  from current_state
), merged as (
  select
    payload,
    restaurants || coalesce((select jsonb_agg(candidate) from jsonb_array_elements(restaurant_candidates) candidate where not exists (select 1 from jsonb_array_elements(restaurants) existing where lower(existing->>'name') = lower(candidate->>'name'))), '[]'::jsonb) as restaurants,
    sights || coalesce((select jsonb_agg(candidate) from jsonb_array_elements(sight_candidates) candidate where not exists (select 1 from jsonb_array_elements(sights) existing where lower(existing->>'name') = lower(candidate->>'name'))), '[]'::jsonb) as sights
  from candidates
)
update public.trip_state t
set payload = jsonb_set(jsonb_set(merged.payload, '{data,restaurants}', merged.restaurants, true), '{data,sights}', merged.sights, true),
    updated_at = now()
from merged
where t.id = 'main';
```

- [ ] **Step 3: Verify exact records and duplicate counts**

Run a read-only query returning the five new objects and group by lower-case name.

Expected: each requested name has exactly one object, coordinates use longitude first, all restaurants have links, and Villa Borghese remains exactly one record.

- [ ] **Step 4: Confirm application compatibility**

Read the row payload through the same fields used by the application and verify the three restaurant objects satisfy `Restaurant` fields and the two sight objects satisfy `Sight` fields.
