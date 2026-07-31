# Order Detail Page Revamp — Implementation Plan

**Target design:** [Figma node 81:726](https://www.figma.com/design/RqeGM5NJD3CTeasfarP9iM/Kelak-Kembali-Tools?node-id=81-726&m=dev)  
**Route:** `#/order/:orderId`  
**Stack:** Vanilla JavaScript SPA, semantic HTML, CSS, Supabase/PostgREST  
**Primary implementation files:** `index.html`, `styles.css`, `app.js`  
**Supporting files to inspect but not expected to change:** `db.js`, `docs.js`, `calendar.js`, `fittings.js`, `util.js`

## 1. Confirmed product decisions

These decisions are authoritative for this implementation:

1. The Figma design fully replaces the current order-detail layout.
2. Remove the old standalone **Details** card from the order-detail page.
3. Remove the fixed bottom quotation/invoice action bar from the order-detail page. Quotation and invoice actions move into the Figma-designed Items section.
4. The top History control is a future navigation affordance. Implement its visual, focus, hover, active, and pressed states, but do not navigate or open anything.
5. Schedule cards are future navigation affordances. Implement their visual, focus, hover, active, and pressed states, but do not navigate or mutate data.
6. The Edit control continues to navigate to `#/order/:orderId/edit`.
7. The Back control navigates directly to the owning customer route, `#/customer/:customerId`; do not use `history.back()`.
8. The page remains a mobile-first, fixed-design canvas: fluid below 390px and centered at a maximum width of 390px on larger screens. A separate tablet/desktop composition is out of scope.

## 2. Desired outcome

Replace the generic card-based order page with the Figma ledger composition while retaining the existing application’s business behavior and data sources. The completed view must:

- match the Figma hierarchy, spacing, typography, colors, borders, rails, and 390px geometry;
- use the same tactile face-and-rail press language as the homepage and customer detail page;
- provide stable loading, ready, empty, partial, and fatal-error states without content layout shift;
- protect against stale asynchronous route renders;
- preserve quotation, invoice, moodboard, payment, edit, and fitting-log workflows;
- be keyboard accessible and respect `prefers-reduced-motion`;
- render safely at 320px through 390px widths and remain centered above 390px;
- introduce no React, Tailwind, build step, or new dependency.

## 3. Current implementation inventory

### 3.1 Existing route and render flow

`app.js` already parses `#/order/:id` as `{ view: "order", id }`. The current order renderer:

1. loads the order with `KK.db.getOrder(id)`;
2. loads its customer with `KK.db.getCustomer(order.customer_id)`;
3. renders item totals and document availability;
4. loads order events in `refreshSchedule()`;
5. loads order history and document history in `refreshHistory()`;
6. loads fitting sessions and photos;
7. enables the global fixed action bar.

The revamp should extract this anonymous route branch into a named `showOrderDetail(orderId)` function. This makes state transitions, retries, race cancellation, and testing understandable to the next engineer.

### 3.2 Existing behavior to reuse

- `orderLabel(order)` for the page title fallback.
- `KK.docs.computeTotal(items)`, `KK.docs.termsFor(order)`, and `KK.docs.termAmounts(total, terms)` for item/payment calculations.
- `isNamed(item)` and the current production-cost calculation for estimated profit.
- `download("quotation")` and `download("invoice")`, including their current validation, PDF generation, Drive copy, and document logging.
- `logDeposit(index)` and the existing deposit chooser.
- `refreshHistory()` data interpretation for determining paid deposits.
- `KK.calendar.isProductionStage(stage)` and stored `order_events` for the visible schedule.
- `KK.fittings` data and existing `#/order/:id/fitting/new` flow for the pink action.
- `showToast()`, stale-token refresh behavior, `reducedMotion()`, and the homepage/customer pressed-state release logic.
- Existing design tokens and customer-page classes as behavioral references, not as selectors to overload.

### 3.3 Existing markup that will be replaced

Replace the contents of `#viewOrder` in `index.html`. Remove these order-detail-only UI elements from that view:

- the old Items card markup;
- the old Payments card markup;
- the Details card;
- the old Schedule card and its Calendar sync button/note;
- the standalone Create Moodboard button;
- the standalone Fitting History card;
- the standalone Log New Fitting button;
- the inline History `<details>` element.

Remove the global `#actionbar` markup only if it is confirmed unused by any other route. `#calcActionbar` is separate and must remain. If the global shell remains for another internal use, keep it hidden on the order page and move the document button IDs into the new inline controls.

## 4. Figma anatomy and implementation geometry

Use order-specific class names prefixed with `order-` to avoid leaking layout rules into the homepage, customer detail, customer editor, documents, or fitting journal.

### 4.1 Page canvas

- Body outside the canvas: `#292929`.
- Order canvas: `width: min(390px, 100%)`, `max-width: 390px`, `min-height: 100svh`, centered.
- Main order surface: `#0d0d0d`.
- Hide the shared `.appbar` and `.pagehead` while `body.is-orderpage` is active.
- Set the regular `.page` padding to `0` and `.view` gap to `0` for this route only.
- Account for `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` without changing the Figma spacing on devices without safe-area insets.

### 4.2 Top navigation

Create `.order-nav` with:

- 12px top and 16px horizontal inset;
- left Back button containing the 24px arrow and the customer’s first name in parentheses, e.g. `(Anya)`;
- right-aligned 56px History and Edit icon buttons separated by 8–12px according to the final visual comparison;
- 48px face + 7px rail, 1px `#e3e3e3` border, 4px radius;
- the same constant-height press technique used by `.cust-nav-btn`: redistribute rail height into the face so surrounding content never moves.

Navigation behavior:

- Back is an anchor whose `href` is set to the explicit customer route.
- Edit is an anchor whose `href` is set to the order editor route.
- History is a `button type="button"`, remains focusable, has `aria-label="Order history — coming soon"` and `aria-disabled="true"`, and performs no action.
- Never assign History a placeholder `href` such as `#`; that would mutate history or scroll position.
- Press feedback must work for pointer, Enter, and Space, then clear on pointer up/cancel/leave, keyup, blur, route change, and scroll.

Use local assets under `/assets`; do not leave expiring Figma MCP URLs in production markup. Reuse `assets/cust-back-icon.svg` for Back if it visually matches. Export/add local history and edit icons only when existing assets do not match the Figma vector.

### 4.3 Title band

- Dark background with a 24px vertical grid spacer above and below.
- 1px top and bottom rules in `#4c4c4c`.
- Title uses `orderLabel(order)`, 32px/40px, weight 700, letter spacing `-0.96px`.
- Horizontal inset: 24px; vertical inset: 12px.
- Allow wrapping at natural word boundaries and `overflow-wrap: anywhere` for pathological unbroken titles.
- Do not clamp the title; a long title may increase this deliberate content region.

### 4.4 Items section

The ready state follows the Figma structure:

1. black ledger rule and 24px vertical grid spacer;
2. 24px page inset;
3. white Items card with `#4c4c4c` side/bottom borders;
4. item table;
5. divider;
6. Total and Est. profit rows;
7. orange Create moodboard action;
8. split green Get quotation / blue Get invoice actions.

Table behavior:

- Header labels are `Name`, `Qty`, `Price`.
- Prefer CSS Grid over fixed-position spans. At 390px, target columns equivalent to `160px 32px 1fr` with 12px gaps. Below 390px use `minmax(0, 1fr) 36px minmax(88px, auto)` so amounts remain legible.
- Item names wrap to at most two lines in the default view; apply ellipsis after the second line. Expose the full name through `title` and an accessible name where truncation occurs.
- Quantity is centered. Guard against extreme quantities by constraining the column and using tabular numerals.
- Prices and totals are right-aligned, use `font-variant-numeric: tabular-nums`, and remain on one line when possible.
- Render only named items, matching existing document eligibility rules.
- Total comes from `KK.docs.computeTotal()`.
- Estimated profit preserves current semantics: revenue minus entered production costs; when no items are costed show `—`; when only some are costed, show the partial value and an accessible/internal caveat such as “Based on 2 of 3 costed items.” Do not silently imply a complete estimate.
- “Est. profit” is internal data and uses the subdued `#4c4c4c` style shown in Figma.

Action behavior:

- Create moodboard keeps the existing route `#/order/:id/moodboard`.
- Get quotation keeps the existing `#downloadQuote` ID and `download("quotation")` behavior.
- Get invoice keeps the existing `#downloadInvoice` ID and `download("invoice")` behavior.
- Buttons use semantic `<button>` elements, not clickable `<div>` elements.
- Preserve existing enablement: document actions require at least one named, positively priced item and a non-empty document name/customer fallback.
- Disabled actions remain visually present to preserve geometry. Use `disabled`, subdued saturation/opacity that still passes contrast, and a short explanatory note available to assistive technology. Do not remove a button and collapse the split row.
- During document generation, keep the button’s width and height fixed, set `aria-busy="true"`, disable both document actions to prevent concurrent generation, replace only a fixed-width label/spinner region, and restore state in `finally`.

### 4.5 Payments section

- White card with title `Payments`, matching Figma’s 20px/24px bold card heading.
- One row per term returned by `KK.docs.termsFor(order)`, not a hard-coded three-row assumption.
- Term label on the left and calculated amount on the right.
- A logged term shows a 16px green check icon and `Paid {short date}` as secondary copy.
- An outstanding term has no fake status text unless needed for clarity; its lack of check and paid date is the default Figma state. Add accessible text such as “Outstanding” to the row’s label.
- Separate variable-length terms with 1px rules. Do not render a trailing divider.
- Retain the charcoal Log a payment face and dark rail.

Payment chooser behavior:

- Keep the existing functional ability to select which outstanding term to log.
- Default/collapsed state must match Figma exactly.
- On Log a payment, expand a disclosure region inside the Payments section, immediately above the action button. Use `aria-expanded` and `aria-controls`.
- The region contains only outstanding terms and uses the existing calculated labels/amounts.
- Its expansion is user-triggered and may move later content; this is intentional, not cumulative layout shift from loading. Animate with a grid-row/opacity disclosure pattern, not `height: auto`.
- When the last payment is logged, collapse the chooser and leave the Log button in a stable completed/disabled state or remove only after a measured crossfade. Prefer a stable “All payments logged” state to avoid a sudden section-height change.
- While logging, disable chooser choices and the action button, retain their geometry, show a compact busy state, and prevent double submission.
- On failure, restore controls and show both the existing toast and an inline retry-safe message in the Payments card. Never optimistically mark the payment as paid before persistence succeeds.

### 4.6 Schedules section

- Light gray `#e3e3e3` outer card with `Schedules` title.
- Show production stages only (`Body measurements`, `Fitting 1`, `Fitting 2`, `Fitting 3`, `Final fitting`) because those are the stages represented by this Figma section. Design-phase events remain part of the underlying schedule but are not displayed here.
- Each schedule record is a white face with a gray 8px rail and ledger spacing/rules matching Figma.
- All schedule records are inert in this phase: use focusable `button type="button"` controls with `aria-disabled="true"`; do not navigate, create a session, or change the URL.
- The entire face-and-rail record owns the pressed state. Keep total height constant during press.

Schedule presentation:

- Left: stage name, 16px/24px.
- Right: short date plus relative date, e.g. `29 Aug (in 3 days)`, 14px/24px, right-aligned.
- Relative dates must handle `today`, `tomorrow`, `in N days`, `yesterday`, and `N days ago` using date-only arithmetic to avoid timezone/DST drift.
- A completed fitting session for that stage adds the green check.
- When fitting photos exist for a stage, show up to three 32px square thumbnails and `{N} photos & notes logged`. Derive the count from fitting photos associated with sessions of that stage; do not count only the visible thumbnails.
- Use lazy-loaded thumbnails with fixed `width`, `height`, and `aspect-ratio` so image decoding cannot shift the row.
- Give thumbnails empty alt text when the adjacent count already describes them; the schedule button’s accessible name should include the stage, date, completion state, and photo count.

Schedule edge states:

- No production anchor: render one fixed-style empty record explaining that fittings appear after the relevant payment is logged.
- Missing wedding date: explain that an exact wedding date is needed.
- Approximate wedding date: render available dates but include a compact warning in the card without exposing the removed Calendar sync UI.
- Schedule fetch failed while core order data succeeded: keep Items and Payments usable; show a section-level error record with a Retry button that retries only schedule/session/photo reads.
- No stored rows but a computed schedule exists: use the existing schedule computation only if that reflects current product behavior; label derived dates clearly. Do not silently persist rows from a read-only render.
- Very long stage names or dates must wrap without overlapping.

### 4.7 Pink fitting action and footer

- Place the pink `Log a fitting note` action directly beneath the Schedules card, with 8px dark-pink rail.
- This action remains functional and routes to `#/order/:id/fitting/new` using the current workflow.
- Disable it only while the order ID is unavailable or the route is leaving.
- Finish with the dark footer: `Made with love for Ichaku`, 14px/24px, centered, `#4c4c4c`, with 24px vertical padding plus bottom safe-area inset.

## 5. Stable state architecture

Add a route-local state shell analogous to the homepage’s proven pattern:

```text
#orderStage (positioned, stable-height state container)
├── #orderLoading  — fixed-geometry skeleton
├── #orderError    — fatal error panel
└── #orderReady    — complete Figma composition
```

Add an `orderDetail` state object under the application state:

```js
orderDetail: {
  phase: "idle",       // idle | loading | ready | error
  loadToken: 0,
  orderId: null,
  sectionErrors: {},
  paymentBusy: false,
  documentBusy: null
}
```

### 5.1 Load sequence

Use a two-tier load so the page is resilient but internally consistent:

1. Start a new monotonically increasing `loadToken` and render the skeleton immediately.
2. Required core batch:
   - fetch order;
   - fetch owning customer after the order identifies `customer_id`.
3. Required page-data batch after core records:
   - order history;
   - document log;
   - order events;
   - fitting sessions;
   - fitting photos.
4. Build one normalized view model, populate the hidden ready layer, measure it, and crossfade from skeleton to ready.

Order and customer failures are fatal because navigation/title/business actions cannot be trusted without them. Schedule/fitting failures may degrade only Schedules. History failure should degrade Payments only if paid-state information cannot be determined from the order dates; never display a payment as outstanding when its state is unknown.

### 5.2 Race and stale-response protection

- Every awaited phase checks `isCurrentOrderLoad(token, orderId)` before writing DOM or global order state.
- Increment/invalidate the token when leaving the route or retrying.
- A response for order A must never populate order B after fast navigation.
- Preserve the existing stale-JWT refresh-and-retry behavior, but retry the whole current load once with the same visible skeleton/error contract.
- Do not add AbortController unless Supabase calls can consume it consistently; token invalidation is sufficient for DOM safety.

### 5.3 Loading state

The skeleton must mimic final geometry rather than showing a generic spinner:

- nav button blocks at their exact final dimensions;
- two-line-capable title band placeholder;
- Items card/table rows and three action blocks;
- Payments card with three representative rows;
- Schedules card with three representative records;
- fitting action and footer.

Requirements:

- `#orderStage[aria-busy="true"]` while loading.
- Skeleton is `aria-hidden="true"`; include one visually hidden live status such as “Loading order details.”
- Ready content is built with `visibility: hidden` while measured.
- Set the stage height to `max(loadingHeight, readyHeight)` during the 160–180ms crossfade, then release it to natural height.
- Only opacity changes during the handoff. Do not animate layout properties during initial reveal.
- Skeleton blocks reserve exact borders, rails, thumbnail boxes, and button heights.
- Shimmer uses background-position/opacity only and is disabled under reduced motion.

### 5.4 Fatal error state

For missing/deleted order, permission errors, offline/network errors, or unrecoverable fetch failures:

- keep the order canvas and top-level geometry intact;
- show a bordered cream error panel inside the ledger;
- use specific copy:
  - not found: `This order no longer exists.`
  - network/TypeError: `Could not load this order. Check your connection and try again.`
  - session failure: `Your session expired. Unlock the app and try again.`
  - fallback: escaped server message plus a generic lead;
- provide **Try again** and **Back to customer** when the customer ID is known; otherwise provide **Back to customers**;
- focus the error heading or Retry button after render without scrolling the page;
- retry in place with a fresh token and skeleton;
- never leave stale details visible beneath a toast.

### 5.5 Empty and partial data rules

- No named items: render an Items empty row, show Total `Rp0`, Est. profit `—`, keep Moodboard enabled, and keep both document controls visible but disabled.
- Named item with zero price: render it; total remains accurate; documents retain existing positive-total eligibility.
- Missing document name: title may still use `orderLabel`; document controls are disabled with an accessible reason.
- No payment terms: fall back through `KK.docs.termsFor()`; never render an empty Payments card if standard terms are available.
- More or fewer than three custom terms: render all terms without breaking borders.
- No logged payments: all terms show outstanding semantics.
- All payments logged: present a stable completion state.
- No schedule: show the appropriate explanatory record, not an empty gray box.
- No fitting photos: do not render broken thumbnail slots.
- Missing/invalid image URLs: hide only the failed image and keep the fixed thumbnail container/count stable.

## 6. Normalized order-detail view model

Before touching the DOM, transform database records into one view model. Suggested shape:

```js
{
  order,
  customer,
  title,
  customerFirstName,
  backHref,
  editHref,
  items: [{ name, qtyLabel, priceLabel, fullName }],
  total,
  totalLabel,
  profit: { value, label, isPartial, costedCount, itemCount },
  documents: { canDownload, disabledReason },
  payments: [{ index, label, amount, amountLabel, paidAt, paidDateLabel }],
  schedule: [{ stage, dateLabel, relativeLabel, completed, photoCount, thumbnails }],
  scheduleMessage,
  scheduleWarning
}
```

Benefits:

- calculations occur once;
- ready render is synchronous and deterministic;
- escaping/formatting decisions are centralized;
- loading/error retries do not mix old and new fragments;
- future history/schedule routes can reuse the normalized data without rewriting the detail view.

All strings interpolated into `innerHTML` must pass through `KK.util.escapeHtml()`. Prefer DOM properties (`textContent`, `href`, `disabled`, `aria-*`) for dynamic navigation labels and control state.

## 7. DOM plan for `index.html`

Use this hierarchy as the implementation target; exact class naming may be refined but IDs are contractual:

```html
<section class="view order" id="viewOrder" hidden>
  <div class="order-stage" id="orderStage" aria-live="polite">
    <div class="order-state order-state--loading" id="orderLoading" aria-hidden="true">…</div>
    <div class="order-state order-state--error" id="orderError" role="alert" hidden></div>

    <div class="order-state order-state--ready" id="orderReady" hidden>
      <nav class="order-nav" aria-label="Order navigation">
        <a class="order-nav-btn" id="orderBackBtn">…</a>
        <div class="order-nav__actions">
          <button class="order-nav-btn order-nav-btn--icon" id="orderHistoryBtn"
                  type="button" aria-disabled="true">…</button>
          <a class="order-nav-btn order-nav-btn--icon" id="orderEditBtn">…</a>
        </div>
      </nav>

      <main class="order-ledger">
        <div class="order-grid-spacer">…</div>
        <header class="order-title-band"><h1 id="orderTitle"></h1></header>
        <div class="order-grid-spacer">…</div>

        <section class="order-section order-section--items" aria-labelledby="orderItemsTitle">…</section>
        <div class="order-grid-spacer">…</div>
        <section class="order-section order-section--payments" aria-labelledby="orderPaymentsTitle">…</section>
        <div class="order-grid-spacer">…</div>
        <section class="order-section order-section--schedules" aria-labelledby="orderSchedulesTitle">…</section>
        <div class="order-grid-spacer">…</div>
      </main>

      <footer class="order-footer">Made with love for Ichaku</footer>
    </div>
  </div>
</section>
```

Retain existing functional IDs where handlers already depend on them:

- `#oItemsDisplay`
- `#paymentSummary`
- `#paymentChooserOptions`
- `#logPaymentBtn`
- `#scheduleList`
- `#createMoodboardBtn`
- `#logNewFittingBtn`
- `#downloadQuote`
- `#downloadInvoice`
- `#totalDisplay` if download logic still reads it
- `#downloadNote` as visually hidden/accessibility copy if needed

Remove obsolete element lookups from the `p` DOM cache after markup removal (`oDocNameDisplay`, payment-date display fields, wedding display, inline `historyLog`, `scheduleCount`, Calendar sync elements, old fitting-history elements) unless another route still requires them.

## 8. CSS plan for `styles.css`

### 8.1 Token mapping

Reuse the established customer/home tokens:

| Figma token | Existing CSS token/fallback |
|---|---|
| Primary Black | `var(--home-black, #0d0d0d)` |
| Primary White | `var(--home-white, #fefaf1)` |
| White Dark | `var(--home-white-dark, #e3e3e3)` |
| Stroke Dark | `var(--home-grid, #4c4c4c)` |
| Black Light | `var(--home-black-light, #292929)` |
| Orange | `var(--home-orange, #ff6a00)` / rail `#dd5d01` |
| Green | `var(--home-green, #23b620)` / rail `#19aa16` |
| Blue | `var(--home-blue, #1e72ef)` / rail `#1866da` |
| Pink | `var(--home-pink, #fc4fac)` / rail `#e72a90` |

Do not introduce duplicate root tokens unless the existing token is genuinely missing.

### 8.2 Constant-height tactile controls

For every face-and-rail control, define total height once and redistribute it on press:

```css
.order-action { display: grid; grid-template-rows: 52px 8px; }
.order-action:active,
.order-action.is-pressed { grid-template-rows: 57px 3px; }
```

The exact face sizes vary by control, but the sum must remain unchanged. This prevents the page below from jumping during touch feedback.

### 8.3 Focus, pointer, and disabled presentation

- Add a 2px high-contrast `:focus-visible` outline with 2px offset; ensure it is not clipped by `overflow: hidden` by applying it to an outer wrapper or using inset outline/box-shadow.
- Keep pointer targets at least 44×44px.
- Use `touch-action: manipulation` and `-webkit-tap-highlight-color: transparent` on tactile controls.
- Use `user-select: none` only on controls, never on data text users may want to copy.
- Future/inert controls with `aria-disabled="true"` retain focus and press styling, but use the normal Figma visual treatment; inactivity is conveyed in the accessible name rather than by fading the design.
- Real disabled document/payment actions use a distinct disabled treatment and `cursor: not-allowed`/default.

### 8.4 Motion

Use the established `--ease-out-expo` curve and short durations:

- press in: 80–120ms;
- press release: 120ms;
- loading-to-ready crossfade: 160–180ms;
- payment disclosure: 180ms;
- page content entrance: 220ms maximum;
- exit before route commit: no blocking animation; keep navigation immediate.

Initial appearance:

- The shell/nav should not fly in from offscreen.
- After data is ready, crossfade the stable state layers.
- Optionally apply a very small `translateY(4px) -> 0` and opacity entrance to the three major sections, staggered by 35–45ms, only after the stable crossfade and only if it matches homepage/customer motion on device.
- Do not stagger individual table rows; variable data volume would make the page feel slow.

Exit behavior:

- On Back/Edit/Moodboard/Fitting navigation, immediately clear pressed state and let the router switch views. Do not delay hash changes for an exit animation.
- A 100–120ms opacity fade may run only if it does not block route commit or reveal the next route late.
- In-flight async work is invalidated by the route token; visual completion callbacks must check the active route.

Reduced motion:

- Turn off shimmer, transforms, stagger, rail animation, and smooth scrolling under `prefers-reduced-motion: reduce`.
- State changes still occur immediately and visibly.

## 9. JavaScript plan for `app.js`

### 9.1 Body/chrome state

Extend `setChrome()` with an `orderpage` flag:

- toggle `body.is-orderpage`;
- ensure it is removed on every non-order route;
- hide the legacy appbar/pagehead only through route-scoped CSS;
- set `actions: false` so the old fixed action bar never appears;
- keep save bar disabled.

### 9.2 New named helpers

Add focused helpers rather than expanding the existing anonymous route branch:

- `beginOrderLoad(orderId)`
- `isCurrentOrderLoad(token, orderId)`
- `renderOrderError(error, token, context)`
- `buildOrderDetailViewModel(records)`
- `renderOrderReady(viewModel)`
- `revealOrder(token)`
- `renderOrderItems(viewModel)`
- `renderOrderPayments(viewModel)`
- `renderOrderSchedule(viewModel)`
- `relativeDateLabel(date, today)`
- `firstNameForNav(name)`
- `clearOrderPresses()` or broaden the existing safe press clearer
- `retryOrderSchedule()` for section-only failures

### 9.3 Event delegation

Bind listeners once during app initialization:

- `pointerdown` on `#viewOrder` for `.order-nav-btn`, `.order-action`, `.order-schedule-record`, and payment choices;
- global release listeners already used by homepage/customer may clear `.is-pressed` universally;
- keydown adds pressed state on Space/Enter;
- keyup/blur clears it;
- click handler prevents action for `#orderHistoryBtn` and `.order-schedule-record`;
- do not call `preventDefault()` on Back/Edit/document/moodboard/fitting controls;
- prevent default for Space on inert buttons so the page does not scroll while still showing feedback.

Do not attach row listeners during every render. Delegation avoids duplicate handlers after retry.

### 9.4 Existing async actions

Update document/payment busy handling so it targets the new inline controls without changing the underlying domain logic.

- `download(kind)` should set a route-local busy state, preserve label width, disable both doc buttons, and always restore in `finally` if the same order route remains active.
- `logDeposit(index)` should update the payment section after success without refetching unrelated order data when possible. If it calls `refreshHistory()`, refactor that function to return normalized data instead of directly requiring removed history DOM.
- After payment logging changes schedule anchors, refresh only Payments and Schedules, then update the title/status-derived state if needed.
- Do not re-run the whole page skeleton for a local mutation.
- Existing toast confirmations remain, supplemented by inline error copy when the affected action needs a retry.

### 9.5 Refactor `refreshHistory()`

The current function both fetches data and writes Payments plus the soon-to-be-removed History section. Split it into:

1. `loadOrderActivity(orderId)` → fetch and return `{ orderHistory, documentLog }`;
2. `deriveLoggedDeposits(orderHistory)` → return deposit-index/date map;
3. `renderOrderPayments(...)` → update only the Payments UI.

Do not render history activity on this page. Continue recording document/payment events in the database for the future History page.

### 9.6 Schedule and fitting data

Replace the old `KK.calendar.renderSchedule()` call for this route with the Figma-specific schedule renderer. Do not change `calendar.js`; other screens may rely on its existing markup.

Build a stage index:

```js
sessionsByStage: Map<stage, fittingSession[]>
photosBySession: Map<sessionId, fittingPhoto[]>
eventByStage: Map<stage, orderEvent>
```

This keeps completed/check/photo derivation linear rather than repeatedly filtering arrays during render.

## 10. Accessibility requirements

- Exactly one visible page `<h1>`: the order title.
- Section headings are `<h2>` and referenced by `aria-labelledby`.
- Navigation is a `<nav aria-label="Order navigation">`.
- Decorative icons use `alt=""` or `aria-hidden="true"`; control purpose comes from visible text or `aria-label`.
- History and schedule controls remain keyboard focusable with `aria-disabled="true"` and “coming soon” included in their accessible description.
- Disabled document buttons expose their reason through `aria-describedby`.
- Payment disclosure uses `aria-expanded`, `aria-controls`, and a labeled region.
- Loading sets `aria-busy`; fatal errors use `role="alert"`; action failures use an appropriately scoped `role="status"` or `role="alert"` without duplicating toast speech.
- All foreground/background pairs meet WCAG AA. White text on orange/pink must be checked; if the exact Figma pair misses AA for small text, increase weight or use the nearest token-safe treatment without changing brand intent.
- Currency and dates remain readable at 200% zoom and with enlarged system text.
- At 320px, no horizontal page scrolling is permitted.
- Focus returns logically after payment chooser collapse or retry.

## 11. Navigation contract

| Control | Element | Result now | Future-ready behavior |
|---|---|---|---|
| Back `(Name)` | anchor | `#/customer/:customerId` | none needed |
| History | button, `aria-disabled=true` | pressed state only | dedicated history route later |
| Edit | anchor | `#/order/:orderId/edit` | existing route |
| Create moodboard | button | `#/order/:orderId/moodboard` | existing route |
| Get quotation | button | generate/download quotation | existing behavior |
| Get invoice | button | generate/download invoice | existing behavior |
| Log a payment | button | expand/collapse chooser | existing mutation |
| Schedule record | button, `aria-disabled=true` | pressed state only | dedicated schedule destination later |
| Log a fitting note | button | `#/order/:orderId/fitting/new` | existing route |

No control should use `history.back()`. Explicit parent routes prevent replaying stale pages and match the existing customer-navigation decision.

## 12. File-by-file implementation sequence

### Phase 1 — Markup and assets

1. Export or recreate the Figma icons as local SVG assets after checking existing `/assets` matches.
2. Replace `#viewOrder` markup with loading/error/ready state layers and the new semantic structure.
3. Move existing functional IDs onto the new inline actions.
4. Remove obsolete order-detail markup and remove the old global action bar if unused.
5. Verify IDs are unique with `rg` and in the browser DOM.

### Phase 2 — Route state and data normalization

1. Add `orderDetail` application state and DOM-cache references.
2. Add `is-orderpage` chrome handling.
3. Extract `showOrderDetail(orderId)` from the route branch.
4. Add load tokens and required/optional fetch grouping.
5. Build the normalized view model.
6. Split history fetching/derivation from history rendering.
7. Add fatal and section-level retries.

### Phase 3 — Ready rendering and retained workflows

1. Render title/navigation.
2. Render Items, total, profit, and document availability.
3. Render Payments and the disclosure chooser.
4. Render production schedule/fitting summary.
5. Reconnect Moodboard, document, payment, Edit, Back, and fitting-log behavior.
6. Keep History and schedule record clicks inert.
7. Confirm database writes/logging are unchanged.

### Phase 4 — Styling and motion

1. Add the order-page canvas and ledger primitives.
2. Match Figma measurements at 390×target page height.
3. Add constant-height rails and pressed/focus states.
4. Add skeleton/error/partial-state styling.
5. Add crossfade, disclosure, and optional section entrance motion.
6. Add reduced-motion overrides.
7. Verify 320, 360, 375, 390, and wide centered layouts.

### Phase 5 — Cleanup

1. Remove obsolete DOM-cache references and render writes.
2. Remove order-only CSS made unreachable by the replacement, but preserve shared `.card`, `.table`, `.actionbar`, schedule, document, editor, and fitting styles used elsewhere.
3. Update comments that still describe the old fixed PDF bar or inline History.
4. Ensure no expiring Figma URLs, Tailwind classes, React artifacts, or new dependencies remain.

## 13. Verification plan

### 13.1 Static checks

- Run a JavaScript syntax check on changed JS (`node --check app.js`).
- Search for duplicate IDs and references to removed IDs.
- Search for remote `figma.com/api/mcp/asset` URLs.
- Confirm no Tailwind/React syntax entered the repository.
- Confirm `db.js` and schema require no change.

### 13.2 Visual checks

Capture screenshots at:

- 390×844 or taller for direct Figma comparison;
- 320×700 for narrow-width overflow;
- 375×812 for common mobile geometry;
- 768px viewport to confirm the centered 390px canvas and outer background;
- reduced-motion mode;
- 200% browser zoom.

Compare:

- nav spacing and rails;
- title baseline/wrapping;
- 24px grid ticks and 1px pixel alignment;
- Items table columns and long-value truncation;
- action colors, split widths, and border continuity;
- Payments dividers/check alignment;
- schedule record spacing, rails, thumbnails, and relative dates;
- footer height and safe-area behavior.

### 13.3 Functional matrix

Test at minimum:

1. Back navigates to the owning customer even after a deep link/reload.
2. Edit navigates to the correct order editor.
3. History shows pointer and keyboard press states but never changes URL, scroll, or state.
4. Every schedule record shows press feedback but never changes URL, scroll, or state.
5. Moodboard action opens the current moodboard route.
6. Quotation and invoice generate once, show busy state, log results, and recover after errors.
7. Document actions are visibly stable and disabled for invalid input.
8. Payment chooser opens/closes accessibly, logs the chosen term once, refreshes Payments/Schedules, and handles failure.
9. Fitting action starts/continues the existing fitting flow.
10. Fast navigation between two orders never renders stale data.
11. Reloading a deep-linked order works.
12. Browser Back/Forward maintains correct body classes and scroll reset.
13. Touch scroll never leaves a control stuck in `.is-pressed`.
14. Keyboard Enter/Space press feedback clears correctly.
15. Reduced motion removes shimmer/transforms without hiding state changes.

### 13.4 Data/edge-case fixtures

Verify with records containing:

- zero items;
- one item;
- many items;
- a long unbroken order title;
- a two-line item name and an extremely long item name;
- quantity `999` and large Rupiah values;
- zero, partial, and complete production costs;
- standard three-part and custom one-/two-/four-part payment terms;
- no payments, one paid term, and all paid terms;
- missing document name;
- no wedding date, approximate wedding date, and exact wedding date;
- no schedule, partial schedule, and all production stages;
- no photos, one photo, more than three photos, and a broken thumbnail;
- network failure in core data;
- failure only in schedule/fitting data;
- expired authentication followed by successful refresh;
- deleted/nonexistent order ID.

## 14. Definition of done

The revamp is complete only when:

- the default 390px ready state is visually faithful to Figma node 81:726;
- the old Details card, inline History, Calendar sync UI, fitting-history block, and fixed document bar are absent from the order detail;
- all retained actions still work with their original data behavior;
- History and schedule controls provide satisfying, constant-height pressed feedback and no navigation;
- loading, fatal error, partial error, empty, busy, disabled, and success states are implemented—not merely documented;
- initial loading and image decoding cause no visible layout jump;
- async route races cannot paint stale order data;
- pointer, keyboard, narrow viewport, zoom, and reduced-motion checks pass;
- no database migration, new framework, or new dependency is introduced;
- obsolete code and comments from the previous order-detail UI are removed safely.

## 15. Explicit non-goals

- Building the future History page or route.
- Building future schedule-detail routes.
- Making schedule records navigate or mutate data.
- Adding a desktop/tablet-specific composition.
- Redesigning the order editor.
- Changing quotation/invoice document templates.
- Changing payment, schedule, fitting, Supabase, Calendar, or Drive schemas/APIs.
- Reworking other pages beyond small shared-helper changes required for safe press cleanup or route state.
