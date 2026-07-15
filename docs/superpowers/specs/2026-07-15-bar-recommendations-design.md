# Bar Recommendations Design

## Goal

Add five new walk-in bars to every city that already has restaurants, giving the trip plan reliable options for wine, beer, or cocktails without changing existing restaurant records.

## Scope

- Cover Rome, Milan, Chioggia, Munich, Verona, Figline Valdarno, and Castel Gandolfo.
- Add exactly five new places per city, for 35 new records total.
- Exclude places already present in the restaurant list, including existing bars.
- Require a current Google rating of at least 4.3.
- Use no photos, so no third-party images are copied into the trip plan.

## Data Model And Presentation

- Save each choice as a `Restaurant` record in `trip_state.main.payload.data.restaurants`.
- Set `placeType` to `"бар"` and include `"бар"` in `categories` so existing editor and map filters work without UI changes.
- Include the name, city, Google Maps URL, Google rating, review count, coordinates, and a concise Russian note describing the appropriate drink focus.
- Use `status: "хочу"`; do not set priority, booking information, or personal rating.
- The records render through the existing restaurant cards. Their no-photo state is intentionally retained.

## Research And Validation

- Research current business details from Google Maps and cross-check that each place is open and located in the intended city.
- De-duplicate by normalized name and city against the stored restaurant list before writing.
- Read the latest `trip_state.main` payload immediately before the update, append only the 35 validated records, and preserve all unrelated trip data.
- Verify the saved payload contains five added bars per target city, every added record has `placeType: "бар"`, a `"бар"` category, rating 4.3 or above, a Maps link, and coordinates.
