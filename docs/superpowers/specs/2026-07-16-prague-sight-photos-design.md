# Prague Sight Photos Design

## Goal

Add one representative Wikipedia image to every Prague sight card where an image is available.

## Data Flow

- Process only the 23 records with `city: "Прага, Чехия"` and no existing `photo` URL.
- Query the Wikipedia REST summary endpoint for each sight name.
- Prefer `originalimage.source`; use `thumbnail.source` only when the original image is unavailable.
- Update only the `photo` property for successful results; never modify `photoPath`, routes, other fields, or non-Prague records.
- Leave a card without a photo if Wikipedia returns no image or the request fails.

## Validation

- Verify every newly stored `photo` URL belongs to a Wikipedia image source.
- Verify the Prague photo count increases only for successful lookups.
- Verify Prague route counts and orders remain day 1: 12, day 2: 11.
- Run the Node 22 production build.
