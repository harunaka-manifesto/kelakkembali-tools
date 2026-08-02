# Homepage Revamp Plan

**Figma**: `RqeGM5NJD3CTeasfarP9iM` node `29:21`  
**Branch**: `feat/homepage-revamp`

---

## Scope

Visual overhaul of the `#/customers` homepage to match the Figma design. The structure already exists — hero, menu grid, alert bar, search, stacked customer cards, footer — so this is a targeted update to styling, interactivity, and data formatting across three files: `styles.css`, `index.html`, and `app.js`.

---

## 1. Moving Shader Gradient (Hero Background)

**What changes**: Replace the static `home-hero-art.png` background with a lightweight animated gradient that shifts colors organically.

**Approach — CSS multi-layer animated gradients** (~0 KB added payload):  
Three to four radial/conic gradients layered with `mix-blend-mode`, each animated on a different `@keyframes` cycle (drift, scale, rotate). The composite produces a smooth, organic movement similar to a fragment shader but purely CSS, hardware-composited, and zero-JS.

```
home-hero::before — layer 1 (large radial, slow drift 12s)
home-hero::after  — layer 2 (conic, medium rotation 8s)
home-hero (bg)    — layer 3 (base linear tone, static)
```

If the visual quality doesn't hold up during implementation, the upgrade path is a tiny `<canvas>` simplex-noise gradient (~2 KB JS, rendering at 128×128 upscaled) — but CSS first.

**3 time-based palettes** (tied to the same hour logic as the greeting):

| Time        | Hours | Base tones                       | Mood            |
|-------------|-------|----------------------------------|-----------------|
| Morning     | 5–11  | warm amber, gold, soft tan       | Figma reference |
| Afternoon   | 12–17 | bright peach, warm coral, sand   | energetic warm  |
| Evening     | 18–4  | deep indigo, muted plum, slate   | calm nighttime  |

**Implementation**:
- Add a `data-time` attribute (`morning` / `afternoon` / `evening`) on `.home-hero` from JS.
- Define three CSS rulesets: `.home-hero[data-time="morning"]`, etc., each setting the gradient colors as CSS custom properties consumed by the `::before` / `::after` layers.
- The `home-hero__art` div and `home-hero-art.png` are removed (no longer needed).

**Files**: `styles.css` (hero section ~L80–141), `app.js` (greeting/time logic), `index.html` (remove art div).

---

## 2. Adaptive Greeting

**What changes**: The hardcoded "Good morning, Ichaku" becomes time-aware.

**Logic** (new function in `app.js`, called from `showCustomers()`):

```
hour = new Date().getHours()
5–11  → "Good morning, Ichaku"
12–17 → "Good afternoon, Ichaku"
18–4  → "Good evening, Ichaku"
```

Returns both the greeting string and the time-of-day key (`morning` / `afternoon` / `evening`) so the hero gradient can consume the same value.

**User name**: Always hardcoded as "Ichaku" — no dynamic lookup.

**Files**: `app.js` (~L763 `showCustomers`, ~L1055 area), `index.html` L108 (remove hardcoded text, set via JS).

---

## 3. Event Reminder Format

**What changes**: The hero deadline line currently reads `"Body measurements · 15 Aug 2026"`. It will read `"In 3 days: Adey - Fitting 2"`.

**Current code**: `app.js:1055` `renderHeroDeadline()` — already finds the nearest upcoming event across active customers.

**New format**:
- Compute days difference: `Math.ceil((eventDate - today) / 86400000)`
- `0 days` → `"Today: Name - Event"`
- `1 day` → `"Tomorrow: Name - Event"`
- `N days` → `"In N days: Name - Event"`
- Customer name: use `firstName(customer.name)` (already exists at `app.js:1047`) — or full name if short enough. The Figma uses short names like "Adey". Stick with `firstName()`.
- Event name: use `deadline.what` (the stage name, e.g. "Fitting 2").

**Assembled**: `"In 3 days: Adey - Fitting 2"`

**Files**: `app.js` `renderHeroDeadline()` (~L1055–1064).

---

## 4. Menu Buttons (Static)

**What changes**: Visual alignment to Figma — the structure is already correct.

**CSS updates** (`styles.css` ~L143–183):
- Add `border-radius: 8px` to `.home-actions__grid`.
- Add `box-shadow: 0 2px 0 rgba(0,0,0,.25)` to `.home-actions__grid`.
- First cell gets `border-radius: 8px 0 0 8px`, last cell gets `border-radius: 0 8px 8px 0`.
- Cells remain `pointer-events: none` / `aria-disabled="true"` — redirection planned later.
- `overflow: hidden` on the grid to clip children to the rounded corners (simpler than per-cell radii).

**No JS changes**. No navigation wired up.

---

## 5. Black Notification Bar

**What changes**: Already functional (shows/hides based on Tally intake count). Refinements:

- **Visibility rule**: already correct — `renderHomepageAlert()` at `app.js:802` hides when `rows.length === 0`.
- **Tappable**: wrap the section in an `<a>` or add `cursor: pointer` + `role="button"` + a click handler. Since the destination page isn't designed yet, the click handler is a no-op stub (`// TODO: navigate to submissions page`). The chevron already implies tappability.
- **Styling**: matches Figma already — black background, white text, alert icon, chevron. No changes needed.

**Files**: `index.html` L121–125 (add tap semantics), `app.js` (add no-op click handler), `styles.css` (add `cursor: pointer`).

---

## 6. Search Bar

**What changes**: Current search is a flat input with no border-radius. Figma shows a rounded, bordered search with a shadow.

**CSS updates** (`styles.css` ~L206–231):
- `.home-search`: increase padding to `24px 16px` (Figma has `pb-24` on the search container).
- `.home-search input`: `border-radius: 12px`, `border: 1px solid #000`, `box-shadow: 0 2px 0 rgba(0,0,0,.25)`, `background: #fff`, `padding: 12px 12px 12px 42px`.
- Placeholder text: change from `"Search customers"` to `"Search customer name"` (matches Figma).
- Search icon: the current `⌕` text glyph can stay or be swapped for the SVG icon from Figma. Recommend keeping the text glyph for consistency since it already works — but update its position for the new padding.

**Files**: `styles.css` (~L206–231), `index.html` L131 (update placeholder text).

---

## 7. Customer Cards (Stacked)

**What changes**: The stacking is already implemented. Verify and refine:

**Current implementation** (correct, matches Figma):
- `margin-top: -20px` creates overlap ✓
- `border-radius: 12px 12px 0 0` (top corners only) ✓
- `box-shadow: 0 -2px 0 rgba(0,0,0,.12)` (subtle lift) ✓
- `border: 1px solid #000; border-bottom: 0` ✓
- `padding: 12px 12px 40px` (extra bottom padding for overlap area) ✓
- z-index stacking (first card highest) ✓

**Color mapping per status tone**:

| Status          | Card background | Badge background | Tone key      |
|-----------------|-----------------|------------------|---------------|
| In production   | `#E9F2D9`       | `#FFAED7` (pink) | `production`  |
| Invoice sent    | `#D9EDF2`       | `#AED8FF` (blue) | `invoice`     |
| Quote sent      | `#D9EDF2`       | `#AED8FF` (blue) | `invoice`     |
| In consultation | `#F2ECD9`       | `#E8DFC8` (warm) | `consultation`|
| Finished        | `#F6F6F6`       | `#DBDBDB` (grey) | `quiet`       |
| Cancelled       | `#F6F6F6`       | `#DBDBDB` (grey) | `quiet`       |

**New tone**: `consultation` — a warm cream/tan that sits visually between the blues (active work) and greys (done). Derived from the app's existing `#F2ECD9` (the Quote menu icon background), giving it a coherent family feel.

**CSS additions** (`styles.css` ~L258–287):
- `.home-customer-card--consultation { background: #F2ECD9; }`
- `.home-customer-card--consultation .home-customer-card__badge { background: #E8DFC8; }`

**Divider SVG**: The wavy line divider (`home-vector-1.svg`) between name and metadata already exists and matches Figma.

**z-index**: Currently only 4 levels defined (nth-child 1–4). Extend to cover more cards or use a CSS counter/calc approach: `z-index: calc(20 - var(--card-index))` — or just extend the list to 12+ which is simpler and more explicit.

**Last card**: The final card in the stack doesn't have `margin-top: -20px` (`:first-child` override) — wait, actually every card after the first has the negative margin. The last card is the one fully visible at the bottom. This is correct.

**Files**: `styles.css` (~L238–295), `app.js` `homepageStatus()` (~L953) and `renderCustomerList()` (~L936).

---

## 8. Status Priority & Mapping

**What changes**: Update `homepageStatus()` at `app.js:953` to use the new tone for "In consultation" and confirm the priority order.

**New priority order** (unchanged ranks, new tone for consultation):

| Rank | Label            | Tone           | Maps from                         |
|------|------------------|----------------|-----------------------------------|
| 0    | In production    | `production`   | Any order with status `In production` |
| 1    | Invoice sent     | `invoice`      | Any order with status `Confirmed` |
| 2    | Quote sent       | `invoice`      | Any order with status `Quoted`    |
| 3    | In consultation  | `consultation` | No orders exist for customer      |
| 4    | Finished         | `quiet`        | All orders are `Delivered`        |
| 5    | Cancelled        | `quiet`        | `cancelled_at` is set             |

**Change**: Line 961 — tone `'quiet'` → `'consultation'` for the "In consultation" case.

**Files**: `app.js` ~L953–964.

---

## 9. Black End Bar (Card Stack Footer)

**What changes**: The `.home-customers__end` element at `styles.css:296` is already implemented as a `12px` tall black bar with `box-shadow: 0 4px 0 rgba(0,0,0,.25)`. This matches the Figma design element. No change needed — already correct.

---

## 10. Footer

**What changes**: None. Already matches Figma: `"Made with ♥ for Ichaku"`, centered, muted `#888` text on white background, generous padding.

---

## 11. Microinteractions & Microanimations

The design language is tactile — hard borders, physical shadows, stacked paper — so all motion should feel like pressing, lifting, and sliding real objects. No elastic bouncing, no scale overshoots. The existing codebase convention is `.15s ease`; homepage animations stay in that family (`.12s`–`.2s`).

### 11a. Hero Content — Staggered Entrance

The sunflower, greeting, and deadline tag fade-and-slide in when the page loads, staggered 60ms apart. Gives the hero a sense of layers being laid down.

```
@keyframes hero-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.home-hero__flower   { animation: hero-in .3s ease both; }
.home-hero__greeting { animation: hero-in .3s ease .06s both; }
.home-hero__deadline { animation: hero-in .3s ease .12s both; }
```

Light, fast, one-shot — runs once on route entry and never replays during scroll.

### 11b. Customer Cards — Press Feedback

Cards are `<a>` links. On `:active` (finger down), the card presses into the stack: the top shadow flattens and the card shifts down 1px. Feels like pushing a card into a pile.

```css
.home-customer-card {
  transition: transform .12s ease, box-shadow .12s ease;
}
.home-customer-card:active {
  transform: translateY(1px);
  box-shadow: 0 0 0 rgba(0, 0, 0, .12);  /* shadow flattens */
}
```

No hover effect — this is a mobile-first app, and hover states on touch devices cause sticky problems. `:active` only.

### 11c. Menu Grid Cells — Tap Dimple

The 4 menu buttons press inward on tap. The icon circle scales down slightly and the cell background dims — like pressing a physical button that has a spring.

```css
.home-actions__cell {
  transition: background .12s ease;
}
.home-actions__cell:active {
  background: #f5f5f0;
}
.home-actions__cell:active .home-actions__icon {
  transform: scale(0.92);
  transition: transform .1s ease;
}
```

Currently `pointer-events: none` / `aria-disabled`, so this won't fire yet — but the CSS is ready for when navigation is wired up. Remove the `pointer-events: none` at that point.

### 11d. Alert Bar — Slide-In on Appear

When new submissions exist, the black bar slides in from the left edge on page load. Draws attention without being aggressive.

```css
@keyframes alert-in {
  from { transform: translateX(-100%); }
  to   { transform: translateX(0); }
}
.home-alert:not([hidden]) {
  animation: alert-in .35s ease both;
}
```

The chevron at the right edge subtly pulses opacity to hint tappability:

```css
@keyframes chevron-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.5; }
}
.home-alert__chevron {
  animation: chevron-pulse 2.5s ease-in-out infinite;
}
```

### 11e. Search Bar — Focus Lift

The search bar already gains a `box-shadow` on focus. Enhance it with a slight upward lift to feel like the input is rising off the page toward the user's finger:

```css
.home-search input {
  transition: box-shadow .15s ease, transform .15s ease, background .15s ease;
}
.home-search input:focus {
  transform: translateY(-1px);
  box-shadow: 0 3px 0 rgba(0, 0, 0, .25);
}
```

### 11f. Card Stack — Staggered Entrance

Customer cards stagger-animate in from below as the list renders, creating a "dealing cards onto a table" effect. Applied via JS by setting `--card-index` as a CSS variable on each card.

```css
@keyframes card-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.home-customer-card {
  animation: card-in .25s ease both;
  animation-delay: calc(var(--card-index, 0) * 40ms);
}
```

JS adds `style="--card-index: 0"`, `--card-index: 1`, etc. during `renderCustomerList()`. Max 8 cards get the stagger (after that, `animation-delay` caps at 320ms so late cards just appear together — avoids a long wait for big lists).

### 11g. Respects Reduced Motion

All animations honor the user's OS-level preference:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-delay: 0ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

The codebase already has a similar rule at `styles.css:2281` — verify it applies globally and covers the new keyframes.

### Summary Table

| Element         | Trigger        | Motion                          | Duration |
|-----------------|----------------|---------------------------------|----------|
| Hero content    | Page load      | Fade + slide up, staggered      | 300ms    |
| Customer cards  | `:active` tap  | Press down 1px, shadow flatten  | 120ms    |
| Customer cards  | Page load      | Fade + slide up, staggered 40ms | 250ms    |
| Menu cells      | `:active` tap  | Icon scale down, bg dim         | 120ms    |
| Alert bar       | Page load      | Slide in from left              | 350ms    |
| Alert chevron   | Always         | Opacity pulse                   | 2.5s     |
| Search bar      | `:focus`       | Lift up 1px, shadow deepen      | 150ms    |

All motion is GPU-composited (`transform`, `opacity` only — no layout-triggering properties). Total added CSS: ~50 lines. JS addition: one `--card-index` variable per card in `renderCustomerList()`.

---

## 12. Loading State

**Current state**: `showCustomers()` at `app.js:767` sets `el.customerList.innerHTML = '<p class="empty">Loading…</p>'` — plain text, no visual structure. The hero, menu grid, alert bar, and search all render immediately from the HTML but sit empty or stale until the data arrives.

**New approach — skeleton shimmer placeholders** that match the card layout, so the page feels populated from the first frame:

### 12a. Skeleton Cards

Replace the "Loading…" text with 3 skeleton card placeholders that mirror the real card shape: name block, badge block, divider, and metadata row — all as solid `#E8E8E8` rectangles with a shimmer sweep.

```html
<!-- Injected by JS at the start of showCustomers() -->
<div class="home-customer-card home-customer-card--skeleton">
  <span class="home-customer-card__top">
    <span class="skeleton-block" style="width:60%;height:24px"></span>
    <span class="skeleton-block" style="width:72px;height:16px"></span>
  </span>
  <span class="skeleton-block skeleton-block--divider"></span>
  <span class="home-customer-card__meta">
    <span class="skeleton-block" style="width:64px;height:16px"></span>
    <span class="skeleton-block" style="width:96px;height:16px"></span>
  </span>
</div>
<!-- repeated 3× -->
```

CSS:

```css
.home-customer-card--skeleton {
  pointer-events: none;
  background: #F6F6F6;
}

.skeleton-block {
  display: block;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    #E8E8E8 25%,
    #F2F2F2 50%,
    #E8E8E8 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

.skeleton-block--divider {
  width: 100%;
  height: 2px;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

The skeleton cards stack just like real cards (`margin-top: -20px`) so the layout doesn't jump when data arrives.

### 12b. Hero Deadline Skeleton

While data loads, the deadline line shows a narrow skeleton block instead of being `hidden`:

```css
.home-hero__deadline--loading {
  width: 200px;
  height: 20px;
  background: rgba(248, 241, 225, 0.5);
  /* Subtle shimmer on the cream background */
}
```

When `renderHeroDeadline()` runs, it replaces this with real content or hides it.

### 12c. Transition from Skeleton to Real Content

When data arrives, `renderCustomerList()` replaces the skeleton HTML wholesale. Combined with the staggered card entrance animation (section 11f), the effect is: shimmer cards fade out → real cards deal in from below. No explicit crossfade needed — the `innerHTML` swap is instant and the `card-in` animation handles the entrance.

**Files**: `app.js` `showCustomers()` (~L767), `styles.css` (new skeleton rules ~15 lines).

---

## 13. Error State

**Current state**: Errors are caught in `handleRoute()` (`app.js:712–729`) and shown via `showToast()` — a transient notification that auto-dismisses. If the data fetch fails, the customer list is left showing the "Loading…" text with no recovery path.

**New approach — inline error card** with a retry action, matching the homepage design language:

### 13a. Error Card

When `showCustomers()` fails, instead of only toasting, render an error card into the customer list area:

```html
<div class="home-error">
  <p class="home-error__message">Could not load customers</p>
  <button class="home-error__retry btn btn--outline btn--sm">Try again</button>
</div>
```

CSS:

```css
.home-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 16px;
  text-align: center;
}

.home-error__message {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #888;
  letter-spacing: -0.42px;
}
```

The retry button calls `showCustomers()` again. The error card uses the same gentle, muted styling as the "No customers yet" empty state — no alarming red, no icons — just a calm acknowledgment and an action.

### 13b. Partial Failure Handling

The homepage loads 4 data sources in parallel (`customers`, `allOrders`, `allEvents`, `enquiries`). Events and enquiries already have `optional()` fallback handlers that swallow errors for missing tables. The critical path is `customers` + `allOrders`. If either fails:

- Show the error card in the customer list area
- Keep the hero (greeting + gradient) rendered — it doesn't need data
- Keep the menu grid rendered — it's static
- Hide the alert bar (no enquiry data to show)
- The toast still fires for the technical error message

This way the page never looks completely broken — the hero and menu are always there.

### 13c. Offline / Network Error

If the fetch fails with a network error (`TypeError: Failed to fetch` or similar), the error message reads "No connection — check your network" instead of the raw error. The retry button stays the same.

**Files**: `app.js` `showCustomers()` error handling (~L763–794), `styles.css` (new error rules ~12 lines).

---

## 14. Section Appear Animations

Beyond the card-level stagger (section 11f) and hero entrance (section 11a), each major homepage section animates in as a block when the page loads — creating a top-to-bottom cascade that feels like the page is being assembled.

### 14a. Section Cascade

Each section gets a `home-section-in` animation with a staggered delay matching its visual position:

```css
@keyframes section-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.home-actions   { animation: section-in .3s ease .15s both; }
.home-alert     { /* uses its own slide-in, see 11d */ }
.home-customers { animation: section-in .3s ease .25s both; }
.home-footer    { animation: section-in .3s ease .35s both; }
```

The hero doesn't get this — it has its own staggered content entrance (11a) and the gradient is already visible immediately. The alert bar has its own slide-in (11d). So the cascade is: hero content → menu grid → search + cards → footer.

### 14b. Re-entry Behavior

These animations should only play on initial route entry, not when returning from a sub-page via back navigation. A JS flag (`state.homepageEntered`) tracks whether the homepage has been shown this session — on re-entry, skip the animations by adding a `no-animate` class:

```css
.home-hero.no-animate *,
.home-actions.no-animate,
.home-customers.no-animate,
.home-footer.no-animate {
  animation: none !important;
}
```

First visit: full cascade. Subsequent visits (back from customer detail): instant render, no replay.

### 14c. Total Timeline

| Time   | What appears                                          |
|--------|-------------------------------------------------------|
| 0ms    | Hero gradient visible, hero content starts fading in  |
| 60ms   | Greeting text appears                                 |
| 120ms  | Deadline tag appears                                  |
| 150ms  | Menu grid fades in                                    |
| 200ms  | Data fetch typically completes (skeleton → real cards) |
| 250ms  | Search + customer section fades in                    |
| 250ms+ | Cards stagger in (40ms apart)                         |
| 350ms  | Alert bar slides in from left                         |
| 350ms  | Footer fades in                                       |

Total entrance sequence: ~500ms from first paint to fully settled. Fast enough to feel responsive, slow enough to feel crafted.

**Files**: `styles.css` (section animation rules ~10 lines), `app.js` (re-entry flag logic ~5 lines).

---

## File Change Summary

| File         | Sections affected                                    | Estimated lines |
|--------------|------------------------------------------------------|-----------------|
| `styles.css` | Hero gradient layers (~L80–141), menu grid border-radius (~L143–183), search bar (~L206–231), card tones (~L238–295), skeleton shimmer, error card, microinteractions, section animations | ~170 changed/added |
| `app.js`     | Time-of-day greeting + hero data-time (~L763), skeleton loading (~L767), hero deadline format (~L1055), homepageStatus tone (~L953), error state, card stagger index, re-entry flag | ~60 changed/added |
| `index.html` | Remove hero art div (L106), clear hardcoded greeting (L108), alert tap semantics (L121–125), search placeholder (L131) | ~10 changed |

No new files. No new dependencies. No build step changes. Total: ~240 lines changed/added.

---

## Implementation Order

1. **Greeting + time-of-day key** — JS function, wire into `showCustomers()`, set `data-time` on hero.
2. **Hero gradient** — CSS animated layers using the `data-time` attribute for palette switching. Remove static art.
3. **Hero deadline format** — Update `renderHeroDeadline()` to "In X days: Name - Event".
4. **Menu grid** — Add border-radius, shadow, overflow hidden to the actions grid.
5. **Search bar** — Update border-radius, shadow, placeholder text.
6. **Status mapping** — Update `homepageStatus()` tone for consultation, add CSS card/badge colors.
7. **Alert bar** — Add tap semantics (no-op for now).
8. **Loading state** — Skeleton cards in `showCustomers()`, shimmer CSS.
9. **Error state** — Inline error card with retry, network error message.
10. **Microinteractions** — Hero entrance, card press, menu tap, search lift, alert slide-in.
11. **Section appear animations** — Cascade timing, re-entry flag.
12. **Visual verification** — Run dev server, verify stacked cards, gradient animation, time-based theming, all status colors, skeleton→real transition, error recovery.

---

## Open Items (Deferred)

- Menu button navigation (user will design later)
- Alert bar destination page (user hasn't designed the page yet)
- Scroll/pagination for large customer lists (not in Figma scope)
