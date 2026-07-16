# Lazy Sight Photos Design

## Goal

Prevent the sights screen from requesting all external photos at initial render.

## Implementation

- Add `loading="lazy"` and `decoding="async"` to the photo image in regular sight cards.
- Keep image source, size, crop mode, alt text, click behavior, and all data unchanged.
- Rely on native browser lazy loading; no proxy, cache layer, or new dependency.

## Verification

- The card photo image has both attributes in source.
- Sight-card images retain their existing visual appearance when loaded.
- Node 22 production build completes successfully.
