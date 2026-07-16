# Mobile Budget Breakdowns Design

## Goal

Keep expanded budget breakdowns easy to scan on phone screens without stretching adjacent summary cards.

## Responsive Behavior

- At widths above `600px`, retain the current behavior: an expanded breakdown appears inside its summary card.
- At widths up to `600px`, render the selected breakdown as a full-width block immediately below the three summary cards.
- The selected summary card remains expanded and rotates its chevron; the other card's state remains independent.
- The full-width mobile block uses the same expense labels, calculated values, selected currency, and accent color as the desktop breakdown.

## Layout

- Add semantic class names to the summary grid, interactive summary cards, and mobile breakdown block.
- On mobile, force the summary grid to one column and hide the in-card details.
- Show one full-width mobile detail block when either summary card is expanded. If both are expanded, show both blocks in card order: family, then day.

## Verification

- At `600px` or below, summary cards do not share a row and detail blocks span the grid width.
- At wider widths, details remain inside their cards.
- Each breakdown maintains the existing formula and selected-currency formatting.
- Production build completes on Node 22.
