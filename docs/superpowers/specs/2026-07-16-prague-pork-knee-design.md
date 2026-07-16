# Prague Pork Knee And Beer Bars Design

## Goal

Add twelve Prague food-and-drink cards and let users filter venues that serve veprevo koleno.

## Data

- Add exactly six Prague restaurant or beer-hall cards with verified veprevo koleno in their current menus.
- Add exactly six additional traditional Czech beer-bar or beer-hall cards, including a Kozlovna venue.
- All twelve records have `city: "Прага, Чехия"`, `status: "хочу"`, a Google Maps URL, coordinates, Google rating, full positive review count, price, type, category, and Russian note.
- Do not add photos, personal ratings, priorities, reservation fields, or pet-friendly fields.
- Add `hasPorkKnee?: boolean` to `Restaurant`; set it to `true` only for the six verified veprevo-koleno venues.

## Interface

- Add a `Вепрево колено` toggle in the Restaurants filter controls.
- When enabled, it retains only records with `hasPorkKnee: true` while composing with existing filters.
- The toggle uses the same visual treatment as the existing restaurant filter buttons.

## Verification

- The live restaurant array gains 12 unique Prague records.
- Exactly six live records have `hasPorkKnee: true`.
- The filter narrows the list to tagged venues and combines correctly with city, type, category, status, rating, and search filters.
- All new Maps URLs use an exact name-and-address query, never `query=place_id:`.
- Node 22 production build completes successfully.
