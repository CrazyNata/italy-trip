# Expanded Prague Sights Design

## Goal

Expand each existing Prague walking day by four nearby attractions while retaining two manageable route maps.

## Day 1 Additions

- Powder Tower
- Municipal House
- Kampa Island
- Petřín Gardens

## Day 2 Additions

- Old Jewish Cemetery
- Spanish Synagogue
- Franciscan Garden
- Náplavka riverfront

## Data And Route Rules

- Add eight `Sight` records with `city: "Прага, Чехия"`; do not change calendar days or existing sights.
- Place the two central day-1 landmarks before Klementinum, insert Kampa after Charles Bridge, and end at Petřín Gardens after Golden Lane.
- Insert the Jewish Cemetery and Spanish Synagogue after the Old New Synagogue; insert Franciscan Garden after Wenceslas Square; insert Náplavka after Dancing House.
- Reassign contiguous `walkOrder` values for every Prague sight in each affected day.
- Every added place has a category, concise Russian description, and `[longitude, latitude]` coordinates.

## Validation

- Prague day 1 contains 12 sights with walk orders 0 through 11; day 2 contains 11 sights with orders 0 through 10.
- All Prague records have valid two-number coordinates.
- The existing route selector and Mapbox walking route render both days without UI changes.
- Existing trip data remains untouched and the Node 22 production build passes.
