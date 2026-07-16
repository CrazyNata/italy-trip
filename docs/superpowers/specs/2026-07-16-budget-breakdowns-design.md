# Budget Breakdown Cards Design

## Goal

Make the `На семью` and `В день` budget summary cards expandable so each reveals its contribution from every expense.

## Interaction

- Both summary cards are buttons and expose their expanded state with `aria-expanded`.
- Clicking a card toggles an inline breakdown directly below that card; a second click collapses it.
- The third `Записей` card remains unchanged.
- The breakdown uses the currently selected currency and closes no other card automatically.

## Calculations

- `На семью`: each expense amount divided by `data.trip.people` (currently `2`).
- `В день`: each expense amount divided by `16`, the agreed count of daily-expense days.
- The headline `В день` amount also uses this same fixed divisor of `16`, replacing the current trip-date calculation.
- The breakdown lists all current expense labels and their calculated amounts. Its values update when expenses or the selected currency change.

## Presentation

- Keep the existing card grid, icons, labels, and headline typography.
- Expanded details appear as compact rows with a muted label and tabular-figure amount in the card's accent color.
- Add a small chevron to interactive cards; it rotates while expanded.

## Verification

- Both cards toggle independently by click and keyboard.
- `На семью` entries sum to the card headline.
- `В день` entries sum to the card headline and use division by `16`.
- The production build completes on Node 22.
