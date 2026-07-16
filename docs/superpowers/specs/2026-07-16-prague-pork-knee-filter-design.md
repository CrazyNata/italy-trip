# Prague Pork Knee Filter Design

## Goal

Restrict the `Вепрево колено` filter to Prague venues without changing the selected city control.

## Behavior

- With the toggle disabled, restaurant filtering remains unchanged.
- With the toggle enabled, a record must have `hasPorkKnee: true` and `city: "Прага, Чехия"`.
- The city select value is not updated by the toggle; if it is set to another city, the combined filters correctly show no results.
- No trip data or card fields change.

## Verification

- The pork-knee filter returns only Prague tagged cards.
- Existing city filtering still composes with the pork-knee predicate.
- Production build completes on Node 22.
