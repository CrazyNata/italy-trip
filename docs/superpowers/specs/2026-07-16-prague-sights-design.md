# Prague Sights Design

## Goal

Add Prague to the existing Sights tab as two complete walkable sightseeing days, using the same city/day map, ordered route, and place cards as the existing cities.

## Scope

- Do not change the trip calendar or dates.
- Add only `Sight` records with `city: "Прага, Чехия"` to `trip_state.main.payload.data.sights`.
- Add city labels: `День 1: Старый город, мост и Град` and `День 2: кварталы и Вышеград`.
- Every sight has `walkDay`, contiguous `walkOrder` within its day, coordinates, a category, and a concise Russian description.
- Use the existing Sights map and cards without new UI components.

## Routes

### Day 1: Старый город, мост и Град

- Old Town Square and Astronomical Clock
- Klementinum
- Charles Bridge
- Lesser Town Square
- St. Nicholas Church
- Prague Castle
- St. Vitus Cathedral
- Golden Lane

### Day 2: кварталы и Вышеград

- Jewish Quarter
- Old New Synagogue
- Wenceslas Square
- National Museum
- Dancing House
- Vyšehrad
- Basilica of St. Peter and St. Paul

## Validation

- Verify Prague contains exactly 15 new sights: eight on day 1 and seven on day 2.
- Verify each day has contiguous `walkOrder` values starting at zero and valid `[longitude, latitude]` coordinates.
- Verify the existing Sights tab selects Prague and renders a walking route for both days.
- Preserve all existing trip data and run the production build under Node 22.
