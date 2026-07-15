# Restaurant Card Consistency Design

## Goal

Make every restaurant card use the same internal layout without changing, replacing, cropping, or reordering restaurant photos. Preserve the current visual language and responsive card grid.

## Card Layout

- Keep the existing fixed-height photo area and photo carousel behavior unchanged.
- Give the content area a consistent vertical grid: metadata row, two-line title area, two-line note area, reservation/distance area, status, and edit action.
- Reserve space for optional metadata rather than adding visible placeholders. A missing Google rating, note, reservation, or distance leaves its assigned row empty, so cards remain aligned without extra visual noise.
- Retain the current Google rating presentation when a rating exists. Its absence must not shift the title, status, or action controls.
- Keep the existing status, price, priority, city, distance, booking, and edit behaviors.

## Categories

- Keep the existing category choices in the restaurant editor: pizzeria, seafood, gelateria, bar, restaurant, and cafe.
- Categories remain editable and saved on the restaurant record.
- Do not display categories on the restaurant cards.

## Scope And Verification

- Change the restaurant card markup and its CSS only; no data migration or photo changes.
- Verify the production build with `npm run build`.
- Manually verify cards with and without photos, Google ratings, notes, reservations, and distances at desktop and mobile widths.
