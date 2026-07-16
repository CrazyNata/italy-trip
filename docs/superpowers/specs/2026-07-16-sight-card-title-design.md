# Sight Card Title Design

## Goal

Keep the title of every regular sight card on one line without changing the card layout or action controls.

## Design

- Change the regular sight-card title from 17px to 16px.
- Apply single-line overflow behavior: no wrapping, hidden overflow, and an ellipsis for a title that still exceeds the available width.
- Keep the existing card width, checkbox, city row, photo area, and action buttons unchanged.

## Verification

- `Клементиум` renders on one line in a standard card width.
- Long names remain inside the card and end with an ellipsis rather than increasing card height.
- Run the Node 22 production build.
