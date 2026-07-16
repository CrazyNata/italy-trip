# Pet-Friendly Restaurants Design

## Goal

Identify every restaurant card that accepts dogs and make those places easy to recognize and prioritize in the Restaurants tab.

## Data

- Add an optional `petFriendly` boolean to `Restaurant` records.
- Research all 101 current restaurant records, including bars and cafes.
- Mark a place `petFriendly: true` when any one of these sources explicitly confirms dogs or pets are accepted: the official venue source, Google Maps, or a visitor review.
- Leave the field absent when there is no confirmation; absence does not mean dogs are prohibited.
- Keep a research table with the restaurant ID, result, source URL, and concise evidence note.
- Update only the `petFriendly` property in `public.trip_state.main` and preserve all other trip data.

## Presentation

- Show `🐶` on every confirmed card beside the existing priority and price metadata.
- Give the icon `title` and accessible label `Можно с собакой`.
- Add a `pet friendly` sort option. It places confirmed cards before unconfirmed cards and preserves their existing relative order inside each group.
- Add a matching owner-only editor toggle so a confirmation can be corrected manually.

## Validation

- Verify every stored `petFriendly` value is boolean.
- Verify the research table covers all 101 current restaurant IDs exactly once.
- Verify every `true` value has one allowed source and evidence note.
- Verify the data update does not change the restaurant count or unrelated payload sections.
- Run the production build with Node 22.
