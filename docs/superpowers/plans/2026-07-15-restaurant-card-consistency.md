# Restaurant Card Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align all restaurant-card content while preserving the existing restaurant photos and editor-only categories.

**Architecture:** Keep `Restaurants.tsx` responsible for conditional data and interaction behavior. Add named structural wrappers for card-content rows, then define their shared dimensions in `global.css`; rows remain in the DOM when their optional data is absent, preserving alignment without rendering placeholder copy.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, global CSS.

## Global Constraints

- Do not change, replace, crop, reorder, upload, or delete restaurant photos.
- Keep the existing category choices and category editor behavior unchanged; categories must not appear on restaurant cards.
- Preserve the current Google rating presentation and all existing restaurant interactions.
- Do not add test dependencies for this presentation-only change; the repository has no automated test runner.
- Verify with Node.js 22+ using `npm run build` and manually at desktop and mobile widths.

---

### Task 1: Add Stable Restaurant-Card Content Rows

**Files:**
- Modify: `src/features/restaurants/Restaurants.tsx:432-487`
- Modify: `src/styles/global.css:104`

**Interfaces:**
- Consumes: Existing `Restaurant` optional fields: `googleRating`, `googleReviews`, `priority`, `price`, `note`, `reservationDate`, `reservationTime`, `status`, and calculated `distance`.
- Produces: CSS hooks `restaurant-card-content`, `restaurant-card-meta`, `restaurant-card-title-row`, `restaurant-card-note-row`, `restaurant-card-detail-row`, `restaurant-card-footer`.

- [ ] **Step 1: Establish the failing visual baseline**

Run `npm run dev`, open the restaurants section, and compare a card with a Google rating and reservation against one without either. Confirm that the title, status, and edit button start at different vertical positions before the change.

- [ ] **Step 2: Replace the current free-flow content wrapper with fixed structural rows**

In `src/features/restaurants/Restaurants.tsx`, replace the content wrapper beginning with the inline `padding: "16px 18px 18px"` style with this structure. Place the existing condition bodies in their assigned rows exactly as shown.

```tsx
<div className="restaurant-card-content">
  <div className="restaurant-card-meta">
    {item.googleRating != null ? (
      <a
        href={item.link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.name}, ${item.city}`)}`}
        target="_blank"
        rel="noreferrer"
        title="Рейтинг Google"
        style={{ display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none", border: "1px solid var(--line,#e7dcc7)", background: "var(--card,#fff)", borderRadius: "var(--r-2)", padding: "3px 11px 3px 10px" }}
      >
        <span style={{ fontFamily: "Arial, sans-serif", fontWeight: 800, fontSize: 12.5, letterSpacing: "-.02em" }}><span style={{ color: "#4285F4" }}>G</span><span style={{ color: "#DB4437" }}>o</span><span style={{ color: "#F4B400" }}>o</span><span style={{ color: "#4285F4" }}>g</span><span style={{ color: "#0F9D58" }}>l</span><span style={{ color: "#DB4437" }}>e</span></span>
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink,#3b3228)" }}>{item.googleRating.toFixed(1).replace(".", ",")}</span>
        <i className="fa-solid fa-star" style={{ fontSize: 11, color: "#e0a740" }} />
        {item.googleReviews != null && <span style={{ fontSize: 11.5, color: "var(--muted,#8a7d6b)" }}>{item.googleReviews >= 1000 ? `${(item.googleReviews / 1000).toFixed(item.googleReviews >= 10000 ? 0 : 1).replace(".", ",")} тыс.` : item.googleReviews}</span>}
      </a>
    ) : <span />}
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {item.priority && <span title="Приоритетный ресторан" aria-label="Приоритетный ресторан">🔥</span>}
      {item.price && <span className="restaurant-card-price" title="Уровень цен">{item.price}</span>}
    </span>
  </div>
  <div className="restaurant-card-title-row"><h3 className="restaurant-card-title">{item.name}</h3></div>
  <div className="restaurant-card-note-row">{item.note && <p className="restaurant-card-note">{item.note}</p>}</div>
  <div className="restaurant-card-detail-row">
    {item.status === "бронь" && (item.reservationDate || item.reservationTime) && (
      <span className="restaurant-card-reservation">📅 {item.reservationDate && new Date(`${item.reservationDate}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}{item.reservationDate && item.reservationTime && " · "}{item.reservationTime}</span>
    )}
    {distance !== null && photos.length === 0 && (
      <span className="restaurant-card-distance"><i className="fa-solid fa-location-arrow" style={{ fontSize: 10, marginRight: 5 }} />до ресторана {formatDistance(distance)}</span>
    )}
  </div>
  <span className="restaurant-card-status">{item.status}</span>
  <div className="restaurant-card-footer">
    {!isReadOnly && <button type="button" className="restaurant-card-edit" onClick={() => openEditor(item)} aria-label={`Редактировать ресторан ${item.name}`} title="Редактировать ресторан"><i className="fa-solid fa-pen" aria-hidden /></button>}
  </div>
</div>
```

- [ ] **Step 3: Define the row dimensions and overflow behavior**

Replace the one-line restaurant-card rules in `src/styles/global.css` with the following CSS. It preserves the current title, note, price, status, and edit visual values.

```css
.restaurant-card-content { display:grid; grid-template-rows:32px 56px 38px 20px auto 32px; gap:10px; flex:1; padding:16px 18px 18px; }
.restaurant-card-meta { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
.restaurant-card-title-row,.restaurant-card-note-row,.restaurant-card-detail-row { min-width:0; overflow:hidden; }
.restaurant-card-title { margin:0; color:var(--ink); font:600 23px/1.2 'Playfair Display',serif; }
.restaurant-card-note { display:-webkit-box; margin:0; overflow:hidden; color:var(--muted); font-size:13px; line-height:1.45; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.restaurant-card-detail-row { display:flex; align-items:center; gap:8px; color:var(--ac); font-size:12px; font-weight:700; }
.restaurant-card-reservation,.restaurant-card-distance { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.restaurant-card-price { border:1px solid var(--line); border-radius:var(--r-1); background:var(--soft); padding:4px 8px; color:var(--ink); font-size:12px; font-weight:700; }
.restaurant-card-status { align-self:start; justify-self:start; border:1px solid var(--line); border-radius:var(--r-2); background:var(--soft); padding:5px 10px; color:var(--muted); font-size:12px; font-weight:700; text-transform:uppercase; }
.restaurant-card-footer { display:flex; align-items:center; justify-content:flex-end; gap:8px; }
.restaurant-card-edit { display:grid; width:32px; height:32px; place-items:center; border:1px solid var(--line); border-radius:50%; background:var(--soft); color:var(--muted); }.restaurant-card-edit:hover { border-color:var(--ac); color:var(--ac); }
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`

Expected: TypeScript compilation completes and Vite emits the production bundle without errors.

- [ ] **Step 5: Perform the visual acceptance check**

Run `npm run dev` and inspect the restaurants section at a desktop width and at 375px width. Confirm all of the following:

- Cards with different optional data have aligned title, status, and footer positions.
- Google ratings preserve their current label, score, star, review count, and link.
- Cards without ratings, notes, reservations, or distance display no new placeholder text.
- A card with no photos keeps the existing no-photo panel; cards with photos preserve their image fit, carousel, and lightbox behavior.
- Editor categories remain visible only in the editor and remain absent from cards.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/features/restaurants/Restaurants.tsx src/styles/global.css
git commit -m "Align restaurant card layouts"
git push
```
