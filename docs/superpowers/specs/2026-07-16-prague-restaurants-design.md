# Prague Restaurants Design

## Goal

Add a broad, card-ready Prague dining list to the existing Restaurants tab without changing its UI.

## Scope

- Add exactly 30 `Restaurant` records with `city: "Прага, Чехия"`.
- Include 18 restaurants or cafes and 12 bars.
- Every record has `status: "хочу"`, a Google Maps URL, `[longitude, latitude]`, `googleRating`, `googleReviews`, `price`, `placeType`, at least one category, and a concise Russian note.
- Add no photos, `photoPath`, personal ratings, priority flags, or booking data.
- Exclude duplicate normalized names and cities from the live restaurant array.

## Presentation

- Existing cards render all records directly, including Google rating, price, note, status, city, and map pin.
- Existing type, rating, price, city, and distance controls work without code changes.
- Existing photo-free card treatment is intentionally used for all 30 new cards.

## Research And Validation

- Verify the venue is current and located in Prague.
- Use current Google business data for rating and full integer review count.
- Record every candidate, Maps link, coordinates, and values in a research document.
- Use one timestamp-guarded JSONB update that appends only the 30 new records.
- Verify 30 Prague records, 18 restaurant/cafe records, 12 bars, valid Maps links and coordinates, ratings from 1 through 5, positive review counts, and no photo or booking fields.
- Run the Node 22 production build.
