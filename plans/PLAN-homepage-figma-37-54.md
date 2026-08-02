# Homepage Figma `37:54` — Implementation Handoff

## 1. Objective

Rebuild the `#/customers` homepage to match Figma file `RqeGM5NJD3CTeasfarP9iM`, node `37:54`, while preserving the current Supabase data model, customer/order status logic, sorting, customer-detail routes, and non-homepage UI.

This is a replacement of the current homepage presentation, not an incremental restyle. The Figma node is authoritative. Remove homepage-only elements that are absent from the new design: the floating Home/Menu navigation, animated shader, emoji, typing animation, rounded/overlapping cards, decorative wavy divider, card entrance staggering, and keyboard-anchored search composer.

The finished homepage must:

- Be a centered 390px mobile canvas on wider screens.
- Match the Figma geometry, colors, typography, icons, grid, and pressed states.
- Have explicit loading, ready/appearing, and error states.
- Never expose a partially assembled data-dependent layout.
- Avoid visible layout shifts during loading, successful reveal, errors, conditional submissions, shortcut animation, and card presses.
- Show the submissions bar only when the new-form-submission query successfully returns at least one row.

## 2. Source of truth already collected

Do not start by reverse-engineering the design again. The relevant Figma measurements and variables are recorded below.

### Frame measurements

- Homepage frame: `390 × 1322`.
- Hero: `390 × 344`.
- Shortcut row: `390 × 98`.
- Submissions section when present: `390 × 63` (`56px` face + `7px` rail).
- Search: `390 × 55` (`48px` field row + `7px` rail).
- Figma example customer ledger: `390 × 690`.
- Footer: `390 × 72`.

### Figma variables

```css
--home-white: #fefaf1;       /* Primary White */
--home-orange: #ff6a00;      /* Secondary Orange */
--home-orange-dark: #dd5d01; /* sampled shortcut rail */
--home-green: #23b620;       /* Secondary Green - Dark */
--home-green-dark: #19aa16;  /* Green-dark */
--home-blue: #1e72ef;        /* Blue */
--home-blue-dark: #1866da;   /* Blue-dark */
--home-pink: #fc4fac;        /* Pink */
--home-pink-dark: #e72a90;   /* Pink-dark */
--home-black-light: #292929; /* Black-light */
--home-black: #0d0d0d;       /* Primary Black */
--home-white-dark: #e3e3e3;  /* White-dark */
--home-grid: #4c4c4c;        /* Stroke-dark */
```

### Figma assets

The design context exposed these assets. MCP asset URLs expire, so download them during implementation and commit durable local copies under `assets/`:

- Calendar shortcut icon, node `45:714`.
- Quotation/paper shortcut icon, node `46:109`.
- Invoice shortcut icon, node `46:118`.
- Fitting shortcut icon, node `46:127`.
- Alert icon, node `37:76`.
- Chevron icon, node `37:79`.
- Search icon, node `43:178`.
- Two-pixel summary separator, node `46:141` (prefer CSS circle if visually identical).

Compare the Figma exports to the current `assets/home-*.svg` files. Reuse an existing file only if its geometry and color are visually identical at the specified dimensions. Otherwise replace it or add a clearly named new asset. Always set explicit rendered width and height to prevent image-driven layout changes.

## 3. Repository facts and files to change

The application is a no-build Vanilla JS SPA.

Primary files:

- `index.html`: homepage markup, search overlay markup, and script includes.
- `styles.css`: all homepage layout and visual states.
- `app.js`: homepage state, data loading, rendering, search, animation, and press behavior.
- `hero-shader.js`: remove its script include and all homepage callers; delete the file only after confirming no other reference remains.
- `assets/`: store exact Figma SVG exports.

Do not change:

- Supabase schema or migrations.
- `db.js` interfaces unless a missing existing read operation is discovered; the expected queries already exist.
- Hash-route shapes.
- Customer/order status semantics.
- Non-homepage app bar, menus, forms, documents, calendar, moodboard, or fitting flows.

Before editing, run:

```sh
git status --short
rg -n "homepageNav|homeHero|heroCanvas|heroEmoji|heroGreeting|heroDeadline|homeActions|enquiriesCard|customerSearch|homepageSearch|renderCustomerList|homepageStatus|runHomepageEntrance|heroShader" index.html app.js styles.css hero-shader.js
```

Preserve unrelated working-tree changes.

## 4. Final homepage DOM

Replace the homepage section with one stage containing three state layers. Keep IDs that are useful to existing JS, but remove obsolete IDs rather than leaving dead elements.

Recommended structure:

```html
<section class="view home" id="viewCustomers">
  <div class="home-stage" id="homeStage" aria-busy="true">
    <div class="home-state home-state--loading" id="homeLoading" role="status" aria-live="polite">
      <!-- fixed structural skeleton; see section 7 -->
    </div>

    <div class="home-state home-state--error" id="homeError" hidden>
      <!-- same outer geometry as loading; ledger contains message + Retry -->
    </div>

    <div class="home-state home-state--ready" id="homeReady" hidden>
      <section class="home-hero" id="homeHero" aria-label="Today">
        <div class="home-hero__content">
          <h1 class="home-hero__greeting" id="heroGreeting"></h1>
          <p class="home-hero__deadline" id="heroDeadline"></p>
        </div>
      </section>

      <section class="home-actions" id="homeActions" aria-label="Shortcuts">
        <button type="button" class="home-action home-action--schedule" aria-disabled="true">...</button>
        <button type="button" class="home-action home-action--quotation" aria-disabled="true">...</button>
        <button type="button" class="home-action home-action--invoice" aria-disabled="true">...</button>
        <button type="button" class="home-action home-action--fitting" aria-disabled="true">...</button>
      </section>

      <button type="button" class="home-alert" id="enquiriesCard" aria-disabled="true" hidden>
        ...
      </button>

      <section class="home-search-section" aria-label="Customer search">
        <label class="home-search" for="customerSearch">
          <img class="home-search__icon" ...>
          <input id="customerSearch" type="search" ...>
        </label>
        <div class="home-search__rail" aria-hidden="true"></div>
      </section>

      <section class="home-customers" id="homeCustomers" aria-label="Customers">
        <div class="home-summary" id="homeSummary">...</div>
        <div class="home-grid-spacer" aria-hidden="true"></div>
        <div class="home-customer-list" id="customerList"></div>
      </section>

      <footer class="home-footer" id="homeFooter">Made with love for Ichaku</footer>
    </div>
  </div>
</section>
```

Specific removals from `index.html`:

- Remove `.homepage-nav` and its Home/Menu controls. Do not affect the normal `.appbar` used on other routes.
- Remove `#heroCanvas`, `#heroEmoji`, screen-reader/visual duplicate greeting spans, and the nav spacer.
- Remove `aria-disabled="true"` from the actions container; place it on each individual button.
- Remove the full `#homepageSearchOverlay` composer/dialog block near the end of the document.
- Remove `<script src="hero-shader.js"></script>`.
- Change the footer copy from a red heart to plain `Made with love for Ichaku`.

## 5. Homepage state model in `app.js`

Replace the current collection of entrance flags (`homepageEntered`, `homepageEntrancePlayed`, typing flag, shader instance, and related timers) with one small explicit state object. Use names that fit the existing minified-but-readable style.

Recommended logical shape:

```js
homepage: {
  phase: 'idle',       // idle | loading | ready | error
  visit: 0,            // increments when routing into #/customers
  loadToken: 0,        // ignores late responses after route changes/retries
  popPlayedForVisit: 0
}
```

If modifying the shared `w` state object is less invasive, add equivalent fields there rather than introducing a second store.

### Required state helpers

Implement these focused helpers instead of keeping state transitions inside `showCustomers()`:

- `beginHomepageLoad()`
  - Increment and capture `loadToken`.
  - Set phase to loading.
  - Show only the loading layer.
  - Set `homeStage.ariaBusy = "true"`.
  - Clear old ready-state press classes and pending animation timers.
  - Return the captured token.
- `renderHomepageReady(data)`
  - Build greeting, deadline, shortcuts, optional alert, summary, and all cards.
  - Render ready content while it is hidden from both sight and accessibility.
  - Do not reveal it.
- `measureHomepageReady()`
  - Await `document.fonts.ready` when available.
  - Wait one animation frame after DOM insertion.
  - Measure `homeReady.scrollHeight` or its bounding box.
  - Set an explicit pixel height on `homeStage` before beginning the crossfade.
- `revealHomepage(token)`
  - Abort if the token is stale or the route is no longer `customers`.
  - Reveal the ready layer in its initial appear state.
  - Fade loading out and ready in.
  - Start the shortcut pop sequence.
  - After the transition, hide loading, put ready back in normal flow, set the stage height to `auto`, and clear `aria-busy`.
- `renderHomepageError(error, token)`
  - Abort stale results.
  - Keep the same stage geometry.
  - Replace loading with the stable error layer.
  - Set `aria-busy="false"`.
  - Focus Retry with `preventScroll: true` after it becomes visible.
- `retryHomepage()`
  - Calls the same loading pipeline; it must not duplicate fetch/render logic.

### Route behavior

- Increment `homepage.visit` each time routing transitions from a non-customer-list route into `#/customers`.
- Do not increment it for live search, viewport resize, or a background repaint.
- If a Retry succeeds, it is still the first successful reveal for that visit, so the shortcut pop sequence must play.
- If the user navigates away while loading, invalidate the token. Do not mutate or focus hidden homepage elements when the promises finish.

## 6. Data loading and failure semantics

Change `showCustomers()` so these four reads are one required batch:

```js
Promise.all([
  db.listCustomers(),
  db.listAllOrders(),
  db.listAllOrderEvents(),
  db.listIntake('new')
])
```

Do not keep the existing `optional(...)` fallbacks for order events or intake submissions:

- If intake fails, the app does not know whether there are zero submissions. Showing no bar would violate the requirement, so show the stable error state.
- If events fail, the deadline and customer ordering cannot be trusted. Show the stable error state.
- Do not reveal successful partial results.
- Keep the existing stale-token/session-refresh behavior at the outer router level.

After the batch resolves:

1. Populate `w.customers`.
2. Build `w.overview.ordersByCustomer` and `eventsByCustomer` with the existing reducer.
3. Store the successful `new` intake rows for alert rendering.
4. Render the complete hidden ready layer.
5. Measure it.
6. Reveal it.

## 7. Loading state with zero layout jumps

The loading state is a deterministic structural skeleton, not three stacked rounded cards.

### Skeleton geometry

- Overall minimum height: `1322px`.
- Hero: `344px`, `#fefaf1`.
  - Place a fixed `220px × 24px` greeting block at `x=24, y=240`.
  - Place two deadline blocks beginning at `x=24, y=282`, constrained inside the same 342px text width and 40px line box.
- Shortcuts: four `97.5px × 98px` neutral cells.
  - Keep the same internal 86px/12px geometry as ready buttons.
- Do not render a fake submissions bar. The loading layer is independent and covers the hidden ready layout, so the eventual real bar can be included or omitted without moving visible content.
- Search skeleton: `48px` cream row plus `7px` grey rail.
- Ledger skeleton:
  - Black background.
  - Exact summary row and grid rules described in section 12.
  - Five cream placeholder records using Figma example heights: `104`, `80`, `80`, `104`, and `72` pixel faces, each followed by a 12px rail.
  - Use explicit placeholder text-line widths rather than auto-sized content.
- Footer: `72px`, black.

### Skeleton animation

- Animate opacity/background only. Never animate width, height, padding, border, position, or transform.
- Suggested shimmer duration: `1.2s ease-in-out infinite` between `rgba(76,76,76,.18)` and `rgba(76,76,76,.32)`.
- Under `prefers-reduced-motion: reduce`, render the midpoint color with no animation.
- Mark decorative skeleton contents `aria-hidden="true"`; expose one polite `Loading homepage` status string.

### Stage swap mechanics

Use layered positioning during state transitions:

- Loading is initially the in-flow layer.
- Ready is rendered `position:absolute; inset:0; width:100%; visibility:hidden` for measurement.
- Before reveal, set `homeStage.style.height` to the measured ready height.
- Switch ready to visible absolute positioning, set loading absolute, and crossfade opacity over roughly `160ms`.
- After the fade, hide loading, switch ready back to relative/in-flow positioning, and remove the explicit stage height in the same animation frame.
- Because the explicit height already equals the ready content, switching back to auto must not alter the stage box.
- Give `homeStage` `min-height:1322px` as an additional safety net.

This approach is required because reserving a permanent 63px alert gap would violate the Figma layout when there are no submissions.

## 8. Stable error state

- Reuse the exact loading shell outside the ledger.
- Keep a black ledger with the same minimum height used by the skeleton.
- Center a cream or grid-aligned error panel inside that ledger; do not insert a short paragraph that collapses the page.
- Copy:
  - Primary: `Could not load the homepage.`
  - Secondary for `TypeError`: `Check your connection and try again.`
  - Generic secondary: use the safe existing error message if present, otherwise `Try again in a moment.`
  - Button: `Try again`.
- The Retry button must use the homepage’s hard-edged visual language and visible focus state.
- Retrying returns to the same skeleton without changing the stage dimensions.
- Do not show a toast in addition to the full-page error; the error state is sufficient and avoids duplicate announcements.

## 9. Ready-state hero

CSS geometry:

```css
.home-hero {
  height: 344px;
  padding: 240px 24px 24px;
  display: flex;
  align-items: flex-end;
  background: var(--home-white);
}

.home-hero__content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
```

Greeting:

- 24px, weight 700, line-height 32px, letter-spacing `-0.72px`.
- Preserve current time windows: morning, afternoon, evening.
- Text remains hard-coded to Ichaku.

Deadline:

- 14px regular, line-height 20px, letter-spacing `-0.42px`.
- Allow a maximum of two natural lines. Do not ellipsize the Figma sentence.
- Wrap the customer/event portion in `<strong>` at weight 600.
- Escape the dynamic customer and event strings before inserting HTML.

Exact copy rules:

```text
0 days: Nearest deadline is {Name} - {Event} today. Prep up!
1 day:  Nearest deadline is {Name} - {Event} tomorrow. Prep up!
N days: Nearest deadline is {Name} - {Event} in N days. Prep up!
none:   No upcoming deadline. All clear!
```

Continue using `firstName()` and `nextDeadline()`. Continue excluding inactive/cancelled/completed customers via `isActive()`.

## 10. Shortcut buttons and appear animation

### Static geometry

- Row: `display:grid; grid-template-columns:repeat(4,1fr); height:98px`.
- Each cell is `97.5px` at the 390px reference width.
- Face normal height: `86px`.
- Rail normal height: `12px`.
- Face pressed height: `96px`.
- Rail pressed height: `2px`.
- Outer cell remains exactly `98px` in every state.
- Icon: `24 × 24`.
- Gap between icon and text: `4px`.
- Text: 14px, weight 700, line-height 20px, letter-spacing `-0.42px`, `#fefaf1`.
- Do not add borders or gaps between cells.

Face fills:

```css
/* Each combines the solid color with the subtle Figma vertical overlay. */
schedule: linear-gradient(180deg, rgba(0,0,0,.04), transparent), #ff6a00;
quotation: linear-gradient(180deg, rgba(0,0,0,.04), transparent), #23b620;
invoice normal: linear-gradient(180deg, rgba(0,0,0,.04), transparent), #1e72ef;
invoice/any pressed: linear-gradient(180deg, transparent, rgba(0,0,0,.10)), base color;
fitting: linear-gradient(180deg, rgba(0,0,0,.06), transparent), #fc4fac;
```

Rails: `#dd5d01`, `#19aa16`, `#1866da`, `#e72a90` respectively.

### Interaction

- Use real `button type="button"` elements so pointer and keyboard press states work.
- Add `aria-disabled="true"` because they intentionally perform no action.
- Do not use the native `disabled` attribute; it prevents focus and press feedback.
- Cancel `click` without routing or showing a toast.
- Use `:active` for native transient interaction and a JS `.is-pressed` fallback for consistent pointer/keyboard handling.
- Clear `.is-pressed` on `pointerup`, `pointercancel`, blur, keyup, and route exit.

### Left-to-right appear sequence

Before the ready layer becomes visible, add `.is-appear-pressed` to all four buttons. Their starting geometry must be 96px face/2px rail.

When ready begins fading in, remove the class in order:

| Button | Delay | Transition |
|---|---:|---:|
| Schedule | 0ms | 180ms ease-out |
| Quotation | 80ms | 180ms ease-out |
| Invoice | 160ms | 180ms ease-out |
| Fitting | 240ms | 180ms ease-out |

Animate only `grid-template-rows` or explicit face/rail heights inside the fixed 98px cell. Do not translate or scale the cell, since that can expose gaps or disturb neighboring geometry.

Play once after every successful navigation into `#/customers`. Do not replay after search filtering, resize, or data-free rerenders. Under reduced motion, remove the pressed class from all buttons before revealing ready.

## 11. Conditional submissions bar

- Render only when the successfully fetched `new` intake array has `length > 0`.
- At zero, set `hidden=true` before measuring ready. The entire 63px block must be absent.
- Copy:
  - `1 new order submission`
  - `{N} new order submissions`
- Face: 56px tall, 16px padding, `#292929` with the Figma `rgba(255,255,255,.1)` top-to-bottom overlay.
- Bottom rail: 7px, `#0d0d0d`.
- Alert icon and chevron: 24px.
- Text: 16px, weight 600, line-height 24px, letter-spacing `-0.48px`, `#fefaf1`.
- Keep the entire row a no-op button with `aria-disabled="true"` and pressed visual feedback only.
- Remove the existing alert slide-in and chevron pulse animations.

## 12. Inline search

- Delete the modal composer functions and state: `openHomepageSearch`, `closeHomepageSearch`, `submitHomepageSearch`, drag state/timers, temporary history state, focus trap calls specific to this composer, and its event listeners.
- Keep only one `#customerSearch` input.
- Search row: 48px, `#fefaf1`, 16px horizontal padding, 12px vertical padding, 10px gap.
- Search icon: 20px.
- Input: borderless, transparent, width 100%, 16px regular, line-height 20px, letter-spacing `-0.48px`, black text.
- Placeholder: `Search customer name`.
- Rail: 7px, `#e3e3e3`.
- Filter on `input`, not only submit. Reuse the existing name/phone/Instagram matching expression.
- Do not animate card positions during filtering.
- Summary counts continue to represent all customers, not only filtered results.
- Restyle the existing no-match/add-customer UI to remain legible inside the black ledger; preserve its route and query parameter.

## 13. Exact customer ledger/grid

This is a structural grid, not a decorative `repeating-linear-gradient`. Implement explicit rules and tick spacers so lines stay pixel-aligned at all card heights.

### Base and summary

- `.home-customers`: `background:#0d0d0d; color:#4c4c4c`.
- Summary row: 36px total height, 1px top and bottom borders `#4c4c4c`, padding `8px 24px`.
- Summary text: 14px regular, 20px line-height, `-0.42px` tracking.
- Copy: `{total} total customer(s) · {production} in production`.
- Separator: 2px circle with an 8px gap on both sides.
- Use singular grammar for one customer and one production customer.

### Spacer/tick primitive

Every `.home-grid-spacer` is exactly 24px tall and position-relative. Create ticks with pseudo-elements:

```css
.home-grid-spacer::before,
.home-grid-spacer::after {
  content: '';
  position: absolute;
  top: 0;
  width: 1px;
  height: 24px;
  background: #4c4c4c;
}
.home-grid-spacer::before { left: 24px; }
.home-grid-spacer::after  { right: 24px; }
```

At 390px this puts the ticks at x=24 and x=365/366 depending on border coordinate convention. Validate against the screenshot and choose the declaration that places the visible pixel on the Figma x=366 boundary. Do not approximate with a background-size grid.

### Record structure

Render each customer as:

```html
<div class="home-customer-record">
  <div class="home-grid-rule"></div>
  <div class="home-customer-record__inset">
    <a class="home-customer-card ..." href="#/customer/{id}">
      <span class="home-customer-card__face">
        <span class="home-customer-card__top">...</span>
        <span class="home-customer-card__meta">...</span>
      </span>
      <span class="home-customer-card__rail" aria-hidden="true"></span>
    </a>
  </div>
  <div class="home-grid-rule"></div>
  <div class="home-grid-spacer"></div>
</div>
```

Geometry:

- Rule: full 390px width, 1px height, `#4c4c4c`.
- Inset: `padding-inline:24px`; card width becomes exactly 342px.
- Face and rail both have 1px left/right borders `#4c4c4c`.
- Face: `#fefaf1`, 12px padding, 12px vertical content gap.
- Rail: `#e3e3e3`, 12px normal height.
- Card name: 20px, weight 700, 24px line-height, `-0.6px` tracking, maximum two lines.
- Status: 12px, weight 700, 16px line-height, `-0.36px` tracking, 2px internal padding, no wrap.
- Metadata: 13px, weight 500, 20px line-height, `-0.39px` tracking.
- Order count column has a 120px reference width; total takes the remainder and aligns right.

Expected face heights with the above content:

- One-line name + metadata: 80px.
- Two-line name + metadata: 104px.
- Cancelled two-line name without metadata: 72px.

Do not force all cards to one height. These variants are intentional and match Figma.

### Card content and status colors

Continue using `homepageStatus(customer, orders)` and current status priority/sort logic.

- In production: `#e72a90`.
- Quote sent: `#1866da`.
- Invoice sent: `#1866da`.
- In consultation: `#4c4c4c`.
- Finished: `#4c4c4c`.
- Cancelled: `#4c4c4c`.

Remove status badge backgrounds. Render colored text only.

For Cancelled:

- Hide the entire metadata row, matching node `44:664` being hidden.
- Keep the name and status.
- Keep the 12px depth rail.

For all other statuses:

- Render `{N} order` / `{N} orders` on the left.
- Render `formatRupiah(total)` on the right.

### Final record/footer boundary

After the final customer, retain its closing full-width rule and 24px tick spacer before the footer. Do not add the old black end bar or white padding.

## 14. Customer card pressed state

Use the same face/rail compression model as the shortcut buttons so pressing never changes the record’s total height or grid alignment.

Normal:

- Face uses its calculated content height.
- Rail is 12px.

Pressed:

- Increase face padding to 16px top and 16px bottom (making the customer card content area 8px taller).
- Reduce the rail from 12px to 4px (matching Figma node 44:557).
- Add a subtle bottom-darkening overlay equivalent to `linear-gradient(180deg, transparent, rgba(0,0,0,.06))` over the cream face.
- Total face-plus-rail height remains unchanged.
- Do not translate, scale, or change surrounding margins/rules.

Behavior:

- Pointer down or keyboard Space/Enter adds `.is-pressed`.
- Pointer up/cancel, keyup, blur, route change, or scrolling cancellation removes it.
- A completed native click follows the existing customer hash link.
- Prevent ghost/stuck states after touch scrolling.
- Under reduced motion, apply geometry immediately; otherwise use approximately `120ms ease-out`.

## 15. Footer and page shell

- Footer: 72px, black, centered contents, 24px vertical padding.
- Text: `Made with love for Ichaku`, 14px regular, 24px line-height, `-0.42px`, `#4c4c4c`.
- Remove the red heart span.
- `body.is-homepage` should use a neutral/dark outer background that frames the 390px canvas; the canvas itself provides all visible section colors.
- Remove the current homepage page-bottom 40px padding.
- Preserve `width:min(390px,100%)` and centered margin behavior.
- On widths below 390px, keep the same proportional four-column grid and 24px side insets where space permits; do not introduce horizontal scrolling.

## 16. CSS cleanup

Delete obsolete homepage rules after the new implementation works:

- `.homepage-nav*`.
- `.home-hero__canvas`, fallback gradient variables, emoji, nav spacer, typing caret, reveal classes.
- Old padded/rounded `.home-actions__grid` and circular icon backgrounds.
- Alert slide/pulse keyframes.
- Modal search overlay/composer/drag rules and `body.has-homepage-search`.
- Old overlapping card margins, stack indices, rounded corners, colored card surfaces, badges, wavy divider, card-in keyframes, and end bar.
- Old homepage entrance animation and `.no-animate` rules.

Keep shared non-homepage utilities and focus styles.

Add a homepage-specific reduced-motion block covering:

- Skeleton shimmer.
- Ready crossfade.
- Shortcut pop transitions.
- Shortcut/card press transitions.

Reduced motion must preserve the same final geometry and state logic.

## 17. JavaScript cleanup checklist

After converting the homepage, remove or replace:

- `v`, `y`, and other shader/typing-only module variables.
- `syncHeroHeight`, `applyHeroClock`, `sleep`, `showHeroImmediately`, and `runHomepageEntrance` if they have no remaining callers.
- All `KK.heroShader` references.
- `homepageEntered` and `homepageEntrancePlayed`.
- Search composer flags, saved scroll position, timers, drag state, and history marker.
- Composer-specific `popstate`, backdrop, form, pointer-drag, Escape, and viewport listeners.
- Resize listener that exists only for greeting line measurement.
- `style="--card-index...;--stack-index..."` output from `renderCustomerList()`.
- `onEnquiriesCardActivate()` if it remains an empty function; use one shared no-op press handler or no click handler.

Run `rg` after cleanup to ensure no dead element IDs or symbols remain.

## 18. Rendering pseudocode

The implementer should preserve existing helpers but reorganize homepage rendering approximately as follows:

```js
async function showCustomers() {
  setChrome({ title: 'Customers', up: null, save: false, actions: false, homepage: true });
  w.customer = null;
  w.order = null;

  const token = beginHomepageLoad();

  try {
    const [customers, orders, events, submissions] = await Promise.all([
      db.listCustomers(),
      db.listAllOrders(),
      db.listAllOrderEvents(),
      db.listIntake('new')
    ]);

    if (!isCurrentHomepageLoad(token)) return;

    w.customers = customers;
    w.overview = buildHomepageOverview(orders, events);
    w.newSubmissions = submissions;

    renderHomepageHero();
    renderHomepageAlert(submissions);
    renderHomepageSummary();
    renderCustomerList();
    prepareShortcutAppearState();

    await document.fonts?.ready;
    await nextAnimationFrame();
    if (!isCurrentHomepageLoad(token)) return;

    measureHomepageReady();
    revealHomepage(token);
  } catch (error) {
    if (db.isStaleToken(error)) throw error;
    renderHomepageError(error, token);
  }
}
```

Split `renderHomepageHero`, `renderHomepageAlert`, and `renderHomepageSummary` into independent synchronous functions. `renderCustomerList` should only filter/sort and produce ledger records; it should not own global loading or error state.

## 19. Accessibility requirements

- Keep one visible `h1` for the greeting; the normal app page title is hidden on the homepage.
- Loading: `role=status`, polite live region, decorative skeleton hidden.
- Error: `role=alert`; Retry reachable and focused without scrolling.
- Shortcuts and alert: focusable buttons with `aria-disabled=true`; suppress action but preserve visible pressed/focus feedback.
- Customer cards remain anchors with descriptive accessible names containing customer name and status.
- Search retains an explicit label even if the visible placeholder supplies the visual copy.
- Preserve visible `:focus-visible` outlines. Ensure outlines are not clipped by the grid/card wrappers.
- Respect reduced motion.

## 20. Verification and acceptance tests

### Pixel comparison

Serve the app locally and capture at exactly `390 × 1322`. Compare against the Figma screenshot with an overlay/difference view.

Verify these coordinates first:

- Hero ends at y=344.
- Shortcut row ends at y=442.
- With submissions, alert ends at y=505.
- Search ends at y=560.
- Ledger/footer boundaries match the data fixture used for comparison.
- Cards begin at x=24 and end at x=366.
- Full rules span x=0 through x=390.
- Spacer ticks align to the card edges.

### Layout-shift tests

Use a `PerformanceObserver` for `layout-shift` entries during development. Exercise:

- Delayed customer response.
- Delayed event response.
- Delayed submissions response.
- Delayed font readiness.
- Zero submissions.
- One/multiple submissions.
- Zero, five, and many customers.
- Successful Retry after error.

Acceptance: no unexpected visible shifts after the loading layer is mounted. The final layer may have a different total document height, but that height must be measured and applied while covered by loading.

### Appearance and presses

- Confirm all four shortcuts are visibly pressed when ready begins appearing.
- Confirm normal-state pops occur at 0/80/160/240ms from left to right.
- Confirm every outer cell remains 98px throughout.
- Confirm the sequence plays once per homepage route visit and after the first successful Retry, but not on search.
- Confirm shortcut/alert clicks do nothing.
- Confirm customer press compresses the rail without moving any rule, spacer, adjacent card, or footer.
- Confirm customer click still navigates.
- Confirm pointer cancellation and scrolling never leave a stuck pressed state.

### Data states

- Intake length zero: no alert node occupies layout space.
- Intake length one/many: correct copy and 63px section.
- Intake request failure: stable error state, never silently hidden alert.
- No upcoming deadline: exact fallback copy.
- Today/tomorrow/N days: exact deadline grammar and semibold dynamic segment.
- Search name/phone/Instagram: live results.
- No match: existing add-customer route remains correct.
- Cancelled: metadata hidden.
- All other statuses: correct order grammar and Rupiah total.
- Summary remains based on the full dataset while searching.

### Regression checks

- Unlock/authentication still works.
- Customer detail, new customer, order, calendar, fitting, moodboard, and document routes retain their existing app bars and menus.
- Browser Back works after inline search because the temporary search history entry no longer exists.
- No console errors, missing assets, stale event listeners, or `KK.heroShader` references remain.

## 21. Suggested implementation order

1. Download/compare the Figma assets and add durable local copies.
2. Replace homepage markup and remove the search overlay/shader script include.
3. Add Figma color variables and build static ready-state geometry first.
4. Implement the explicit ledger rules, ticks, records, and footer; validate with hard-coded sample content against Figma.
5. Adapt `renderCustomerList()` and status output to the new record DOM.
6. Implement the inline live search and summary rendering.
7. Implement the required four-query data pipeline and conditional alert.
8. Add the stage state machine, structural loading skeleton, hidden measurement, crossfade, and stable error.
9. Add shortcut appear animation and no-op press behavior.
10. Add customer-card pressed behavior without changing record height.
11. Remove obsolete shader/search/entrance/card code and assets only after all references are gone.
12. Run pixel comparison, layout-shift instrumentation, interaction tests, and route regression checks.

## 22. Definition of done

Implementation is complete only when:

- The 390px ready page visually matches node `37:54`, including the subtle ledger grid.
- Loading, success, and error swaps do not visibly jump.
- Shortcut buttons pop pressed-to-normal from left to right once per homepage visit.
- The submissions bar is present only after a successful non-empty new-submissions result.
- Customer cards have a rail-compression pressed state and still navigate correctly.
- Search is inline and live.
- No obsolete shader, search-composer, floating homepage-nav, stacked-card, or entrance-animation code remains.
- All non-homepage routes continue to work unchanged.
