# Restaurant Modal Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make restaurant cards display-only by default and put all restaurant editing, photo management, and deletion in a saveable modal editor.

**Architecture:** Keep filtering, card rendering, persistence, and the selected restaurant draft in `Restaurants.tsx`. Extract the accessible portal dialog and its form controls into `RestaurantEditorModal.tsx`; it receives a draft and mutation callbacks, while the parent performs all Supabase storage and `updateData` operations. Add focused CSS classes to the existing global dialog styles for a responsive, scrollable editor.

**Tech Stack:** React 19, TypeScript, React DOM portals, Vite, Supabase Storage, global CSS.

## Global Constraints

- Node.js 22+ and `npm run build` (`tsc -b && vite build`) must succeed.
- Do not add a test framework: the repository currently has no automated test tooling.
- Do not change `Restaurant`, `TripData`, Supabase schema, or storage bucket configuration.
- The read-only role must not expose a control that can start a mutation.
- Text remains Russian and the existing `ConfirmDialog`, toast event, `useDialogKeyboard`, and `useScrollLock` patterns are reused.
- Cancelling an editor must not call `updateData`; files uploaded only for a cancelled draft must be removed from `place-photos`.

---

### Task 1: Add the reusable restaurant editor dialog

**Files:**
- Create: `src/features/restaurants/RestaurantEditorModal.tsx`
- Modify: `src/styles/global.css:83-120`

**Interfaces:**
- Consumes: `Restaurant` from `src/types/trip.ts`, `statuses` and `priceLevels` passed as arrays, and `useDialogKeyboard` / `useScrollLock` from `src/features/shared.tsx`.
- Produces: `RestaurantEditorModal(props)` with `draft: Restaurant`, `isNew: boolean`, `onChange(patch: Partial<Restaurant>): void`, `onUpload(files: FileList | null): void`, `onRemovePhoto(index: number): void`, `onSave(): void`, `onCancel(): void`, and `onDelete(): void`.

- [ ] **Step 1: Create the dialog component with a portal and keyboard behavior**

```tsx
const closeButton = useRef<HTMLButtonElement>(null);
useScrollLock();
useDialogKeyboard({ open: true, onClose: onCancel, initialFocus: closeButton });

return createPortal(
  <div className="restaurant-editor-backdrop" role="dialog" aria-modal="true" aria-labelledby="restaurant-editor-title" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
    <section className="restaurant-editor-card">
      <header className="restaurant-editor-header">
        <h2 id="restaurant-editor-title">{isNew ? "Новый ресторан" : "Редактировать ресторан"}</h2>
        <button ref={closeButton} type="button" onClick={onCancel} aria-label="Закрыть">×</button>
      </header>
      {/* form fields and actions */}
    </section>
  </div>,
  document.body,
);
```

- [ ] **Step 2: Put all existing restaurant mutation controls in the dialog**

Render controlled name and note inputs, price buttons, status buttons, the multi-file input, photo thumbnails with per-photo delete buttons, a danger `Удалить ресторан` button for existing restaurants, and `Отмена` / `Сохранить` actions. Wire every value to `draft` through `onChange`; buttons must call the supplied callbacks rather than directly writing trip data.

```tsx
<input value={draft.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Название ресторана" />
<button type="button" onClick={() => onChange({ price: draft.price === level ? "" : level })}>{level}</button>
<button type="button" onClick={onSave}>Сохранить</button>
```

- [ ] **Step 3: Add responsive dialog styles**

Add `.restaurant-editor-backdrop`, `.restaurant-editor-card`, `.restaurant-editor-header`, `.restaurant-editor-body`, and `.restaurant-editor-actions` styles beside the existing confirmation dialog rules. The card uses `max-width: 560px`, `max-height: min(760px, calc(100dvh - 32px))`, and an internal overflow area. In the existing mobile media query, reduce backdrop padding to `12px` and make the action buttons fill the available row width.

- [ ] **Step 4: Run the production build**

Run: `PATH="/home/natasha/.local/node22/bin:$PATH" npm run build`

Expected: TypeScript and Vite complete successfully; the new component is not yet mounted, so visual behavior is unchanged.

- [ ] **Step 5: Commit the dialog foundation**

```bash
git add src/features/restaurants/RestaurantEditorModal.tsx src/styles/global.css
git commit -m "Add restaurant editor modal"
```

### Task 2: Move restaurant mutation data flow to a cancellable draft

**Files:**
- Modify: `src/features/restaurants/Restaurants.tsx:1-205`

**Interfaces:**
- Consumes: `RestaurantEditorModal` from Task 1 and `storagePath(url: string): string` already defined in this file.
- Produces: `editor` state with `{ draft: Restaurant; originalPhotos: string[]; isNew: boolean }`, plus `openEditor`, `closeEditor`, `saveEditor`, `uploadEditorPhotos`, `removeEditorPhoto`, and `deleteEditorRestaurant` handlers.

- [ ] **Step 1: Replace immediate restaurant field writes with editor state**

Add the editor state and opening helpers after the existing filter state. `openEditor(item)` must clone the restaurant and copy its photos; `add()` must create a draft but must not call `updateData`.

```tsx
type EditorState = { draft: Restaurant; originalPhotos: string[]; isNew: boolean };
const [editor, setEditor] = useState<EditorState | null>(null);
const openEditor = (item: Restaurant) =>
  setEditor({ draft: { ...item, photos: [...(item.photos ?? [])] }, originalPhotos: [...(item.photos ?? [])], isNew: false });
const add = () => guard(() => {
  const draft = { id: uid("r"), name: "Новый ресторан", city: "", status: "хочу", note: "", link: "" };
  setEditor({ draft, originalPhotos: [], isNew: true });
});
```

- [ ] **Step 2: Make photo upload update only the draft**

Refactor `uploadPhotos` into an editor-only handler. Keep the current file name and Supabase upload behavior, then append public URLs through `setEditor`; do not call `updateData`.

```tsx
setEditor((current) => current ? {
  ...current,
  draft: { ...current.draft, photos: [...(current.draft.photos ?? []), ...urls] },
} : current);
```

- [ ] **Step 3: Defer destructive storage work until save and clean cancelled uploads**

`removeEditorPhoto(index)` removes only the URL from the draft after the existing confirmation. `saveEditor()` computes original URLs removed from the draft, removes their storage paths, then appends or replaces the restaurant with one `updateData` call. `closeEditor()` removes URLs present in the draft but absent from `originalPhotos`, then clears editor state. `deleteEditorRestaurant()` confirms deletion, removes the union of original and draft photo paths, removes the saved restaurant with `updateData`, and closes the editor.

```tsx
const uploadedUrls = editor.draft.photos?.filter((url) => !editor.originalPhotos.includes(url)) ?? [];
const removedUrls = editor.originalPhotos.filter((url) => !editor.draft.photos?.includes(url));
```

If a storage deletion fails, show the current toast and leave the editor open without changing trip state. On an upload failure, retain the current draft and show the current toast.

- [ ] **Step 4: Mount the dialog only for an owner with an open draft**

After the card grid and before the lightbox, render `RestaurantEditorModal` when `editor` is non-null. Pass immutable `statuses` and `priceLevels`, patch draft fields with `setEditor`, and route its actions to the handlers above. Keep the handler-level `isReadOnly` guards in case the role changes while the dialog is open.

- [ ] **Step 5: Run the production build**

Run: `PATH="/home/natasha/.local/node22/bin:$PATH" npm run build`

Expected: TypeScript and Vite complete successfully with the modal mounted and draft handlers typed.

- [ ] **Step 6: Commit draft persistence and storage handling**

```bash
git add src/features/restaurants/Restaurants.tsx
git commit -m "Draft restaurant edits in modal"
```

### Task 3: Convert cards to display-only views and verify behavior

**Files:**
- Modify: `src/features/restaurants/Restaurants.tsx:311-473`
- Modify: `src/styles/global.css:83-120`

**Interfaces:**
- Consumes: `openEditor(item: Restaurant): void` from Task 2, `isReadOnly`, `photoIndex`, `Lightbox`, and existing presentation helpers.
- Produces: a display-only restaurant card with one owner-only edit button.

- [ ] **Step 1: Remove all mutation controls from card markup**

Replace editable name and note inputs with heading and paragraph elements. Replace price and status button groups with text badges. Remove in-card photo upload and photo deletion controls. Preserve photo navigation, lightbox opening, the image city caption, Google rating link, and distance output.

```tsx
<h3 className="restaurant-card-title">{item.name}</h3>
{item.note && <p className="restaurant-card-note">{item.note}</p>}
{item.price && <span title="Уровень цен">{item.price}</span>}
<span className="restaurant-card-status">{item.status}</span>
```

- [ ] **Step 2: Add the single owner-only edit entry point**

At the bottom of the card render a button only when `!isReadOnly`. Use a pencil icon, `aria-label="Редактировать ресторан ${item.name}"`, and `title="Редактировать ресторан"`; its click calls `openEditor(item)`.

```tsx
{!isReadOnly && (
  <button type="button" className="restaurant-card-edit" onClick={() => openEditor(item)} aria-label={`Редактировать ресторан ${item.name}`} title="Редактировать ресторан">
    <i className="fa-solid fa-pen" aria-hidden />
  </button>
)}
```

- [ ] **Step 3: Add presentation styles for the card view**

Add `.restaurant-card-title`, `.restaurant-card-note`, `.restaurant-card-status`, and `.restaurant-card-edit` to `src/styles/global.css`. Use the existing `--ink`, `--muted`, `--soft`, `--line`, and `--ac` tokens; preserve the current Playfair heading appearance and make the pencil a compact, visible keyboard-focusable button.

- [ ] **Step 4: Run the production build**

Run: `PATH="/home/natasha/.local/node22/bin:$PATH" npm run build`

Expected: TypeScript and Vite complete successfully.

- [ ] **Step 5: Perform manual acceptance checks in the browser**

1. As an owner, confirm cards have no inputs, inline price/status buttons, photo upload, or delete controls, but each has one pencil icon.
2. Open an existing restaurant, edit name/note/status/price, press `Отмена`, then reopen it and confirm saved data did not change.
3. Save the same changes and confirm they appear on the card after closing the dialog.
4. Add a restaurant, cancel it, and confirm it is absent; add another and save it, and confirm it appears.
5. Upload a photo and save; reopen, remove the photo, confirm the deletion prompt, save, and confirm it is absent from the card.
6. Open the editor and verify close button, Escape, and backdrop all cancel; on a mobile-width viewport, verify the form scrolls and actions remain reachable.
7. As a read-only user, verify neither the pencil icon nor editor mutation controls are accessible; verify photo carousel and lightbox still work.

- [ ] **Step 6: Commit the display-only card and verification result**

```bash
git add src/features/restaurants/Restaurants.tsx src/styles/global.css
git commit -m "Show restaurant cards in read mode"
```
