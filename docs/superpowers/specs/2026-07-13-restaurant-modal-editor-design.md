# Restaurant Modal Editor Design

## Goal

Restaurant cards must have a clean, read-only presentation by default. All
mutating controls, including restaurant and photo deletion, belong in an
explicit editing mode opened from a single edit icon.

## Card View

- A restaurant card displays its photo carousel, city, name, Google rating,
  price, note, status, and distance when available.
- The Google rating remains a link to the saved Google URL or a generated
  Google Maps search URL.
- Photo navigation and opening a photo in the existing lightbox remain
  available in this view.
- Owners see one pencil-icon button that opens the editor. Read-only users do
  not see editing controls.
- The card has no editable inputs, status buttons, price buttons, photo upload
  controls, or deletion actions.

## Modal Editor

- The pencil button opens a modal with an isolated draft of the selected
  restaurant. The modal contains the currently editable fields: name, note,
  status, and price, plus photo management and restaurant deletion.
- Photo upload and deletion are available only in this modal. Photo deletion
  uses the existing confirmation dialog and storage cleanup behavior.
- Restaurant deletion is available only in this modal and retains its existing
  confirmation dialog and storage cleanup behavior.
- `Save` writes the complete draft to the trip state and closes the modal.
- `Cancel`, the close icon, Escape, and clicking the backdrop discard the draft
  and close the modal. They do not write to trip state.
- Creating a restaurant opens the same modal with a new unsaved draft. Saving
  adds it to the list; cancelling leaves the list unchanged.
- The modal scrolls its content on narrow viewports while keeping its action
  controls accessible.

## State And Data Flow

- `Restaurants.tsx` owns the selected draft and whether the editor is open.
- Existing `Restaurant` and `TripData` types remain unchanged.
- Existing Supabase photo upload and deletion operations are reused. A photo
  upload updates the draft so cancelling the modal does not add its URL to the
  restaurant record. Uploaded files from a cancelled new draft are cleaned from
  storage to avoid orphaned files.
- Saving an existing item replaces that item by `id`; saving a new item appends
  it. The existing debounced `updateData` persistence flow remains the sole
  write path for trip state.

## Access And Errors

- Read-only users cannot open the editor or execute mutation operations. Any
  stale attempted mutation continues to trigger the current read-only notice.
- Upload and storage deletion failures continue to show the existing toast and
  leave the draft or saved data intact as appropriate.
- Confirmation dialogs still prevent irreversible photo and restaurant
  deletion.

## Verification

- Run `npm run build`.
- Manually verify owner and read-only card views.
- Verify cancel leaves an existing card unchanged, while save persists all
  edited fields.
- Verify adding then cancelling creates no restaurant; adding then saving does.
- Verify photo upload, photo deletion, restaurant deletion, lightbox, photo
  navigation, modal close interactions, and mobile scrolling.
