# DESIGN-SYSTEM — visual language, tokens, and the tactile contract

The reference for anything that will be *seen*. Read this before writing CSS or
markup for a new feature. [CONVENTIONS.md](CONVENTIONS.md) governs how the code
is written; this file governs how the result looks and feels.

Nothing here is aspirational — every value is already shipping. Where a rule is
stated as a token that does not yet exist in `:root`, it is marked
**(proposed)** and the raw value it names is given, so the rule can be followed
today and the token added later.

---

## 0. The one-paragraph brief

Kelak Kembali's tools look like a **printed ledger with physical keys**. A black
grid page holds cream paper cards inset by 24px, ruled with 1px hairlines and
ticked at the margins. Every control is a **face sitting on a rail** — the rail
is its shadow, the depth of the key. Pressing a control moves height out of the
rail and into the face: the thing goes *down*, and nothing on the page moves.
Corners are square. Type is tight, dense, and set in one family. Colour is used
sparingly and always means something.

The opposite of this app is a translucent, floating, rounded, drop-shadowed
card that scales on hover. Do not build that.

---

## 1. Three surfaces, three rulebooks

The app is not one uniform skin. Know which surface you are on before you pick
a token.

| Surface | Where | Rulebook | File |
| :--- | :--- | :--- | :--- |
| **Ledger canvas** | Homepage, customer detail, customer editor, order detail, fitting logs feed / detail / editor / add | §2–§7 of this file. 390px canvas, black ground, cream cards, square corners, face-over-rail | `styles/pages.css` |
| **Utility chrome** | Boot, gate, app bar, order editor, calendar settings, enquiry, cost sheet, toast, save bar, moodboard editor | §8. 560px page, warm grey ground, rounded surfaces, `--ink` palette | `styles/shared.css`, `styles/moodboard.css` |
| **Documents** | `#quotation`, `#invoice`, moodboard PDF | **Locked.** Aileron, fixed 595px frame, pixel contract with Figma. Do not restyle — see README 458–594 | `styles/documents.css` |

The ledger canvas is the **direction of travel**. New user-facing pages get the
ledger canvas unless there is a reason they cannot. The utility chrome is the
older layer; extend it only when you are adding to a page that already uses it.

A page opts into the ledger canvas with a body class and four rules — always
this exact block, per page:

```css
body.is-<page>page { background: #292929; overflow-x: hidden; }
body.is-<page>page .appbar,
body.is-<page>page .pagehead { display: none; }
body.is-<page>page .page {
  width: min(390px, 100%);
  max-width: 390px;
  min-height: 100svh;
  margin: 0 auto;
  padding: 0;
  background: var(--home-black);
}
body.is-<page>page .view { gap: 0; }
```

`#292929` around the canvas is the *frame*, not a background — the page is a
390px object held up against a dark surround, and every colour that reads as
part of the product belongs to the canvas itself.

---

## 2. Colour tokens

### 2.1 Ledger canvas — shipping in `pages.css:5`

| Token | Value | Role |
| :--- | :--- | :--- |
| `--home-white` | `#fefaf1` | **Paper.** Cards, faces, hero, search band. Warm cream, never pure white |
| `--home-white-dark` | `#e3e3e3` | **Rail under paper.** The shadow of any cream key; also card dividers |
| `--home-black` | `#0d0d0d` | **Ledger.** The page ground, footer, primary rails, thumbnail backing |
| `--home-black-light` | `#292929` | **Frame / raised dark.** Surround outside the canvas, alert face, missing-photo panel |
| `--home-grid` | `#4c4c4c` | **Hairline + secondary ink.** Every 1px rule, every tick, all metadata text |
| `--home-orange` | `#ff6a00` | Schedule / next-deadline / primary destructive-adjacent action |
| `--home-green` | `#23b620` | Quotation / save |
| `--home-blue` | `#1e72ef` | Invoice |
| `--home-pink` | `#fc4fac` | Fitting |

Three greys, one paper, four accents. That is the whole palette. Adding a
fifth accent requires a new *meaning*, not a new page.

### 2.2 The shadow pair — mandatory

Every coloured key has a darker twin used as its rail. **Never invent a rail
colour by opacity or `filter: brightness()`** — use the twin.

| Face | Rail | Token pair *(proposed: `--rail-<name>`)* |
| :--- | :--- | :--- |
| `--home-white` `#fefaf1` | `--home-white-dark` `#e3e3e3` | — |
| `--home-orange` `#ff6a00` | `#dd5d01` | `--rail-orange` |
| `--home-green` `#23b620` | `#19aa16` | `--rail-green` |
| `--home-blue` `#1e72ef` | `#1866da` | `--rail-blue` |
| `--home-pink` `#fc4fac` | `#e72a90` | `--rail-pink` |
| `--home-black-light` `#292929` | `--home-black` `#0d0d0d` | — |
| `--home-grid` `#4c4c4c` | `--home-black-light` `#292929` | — |

### 2.3 Stage colours — declared on `.fitlog`, `pages.css:2145`

The five fitting stages are a **fixed, exhaustive vocabulary**. They are the
dark text/fill pair (not the lighter banner hues), so they read on cream.

| Stage | Token | Value |
| :--- | :--- | :--- |
| Sizing | `--stage-sizing` | `#1866da` |
| Fitting 1 | `--stage-fitting-1` | `#19aa16` |
| Fitting 2 | `--stage-fitting-2` | `#e72a90` |
| Fitting 3 | `--stage-fitting-3` | `#ff6a00` |
| Final fitting | `--stage-final-fitting` | `var(--home-black)` |

Any new stage-aware component sets `--fitlog-stage-color` and reads it — see
`.fitlog-stage`. Do not re-list the five hex values in a new block.

"Body measurements" is a **retired** stage name. `tests/pure-modules.test.cjs`
greps for it and fails the suite. Do not reintroduce the word anywhere.

### 2.4 Destructive palette — ledger canvas

Red is never an outline chip on the black pages; it is the same face-over-rail
block in a destructive skin.

| Context | Face | Rail | Text |
| :--- | :--- | :--- | :--- |
| Full-width delete band (`.fitdet-delete`) | `#4b0000` | `#340000` | `--home-white` |
| Inline delete in an editor (`.fitedit-delete`) | `#2a0f09` | `#7a1f11` (also the 1px border) | `#ff8a72` |
| Cancel in a two-up action pair | `#ce0c33` | `#ae0728` | `--home-white` |
| Destructive text-only action | — | — | `#c50f0f` |

*(proposed: `--danger-face`, `--danger-rail`, `--danger-face-soft`, `--danger-ink-soft`.)*

### 2.5 Utility chrome — shipping in `pages.css:16`

| Token | Value | Role |
| :--- | :--- | :--- |
| `--bg` | `#E4E2DD` | Page ground, gate, cost sheet, app bar / save bar tint base |
| `--surface` | `#F4F3F0` | Nested rows: `.item`, `.term`, `.calcrow` |
| `--surface-2` | `#FBFAF8` | Cards, menus, journal bar |
| `--ink` | `#17150F` | Text, primary button fill, focus ring |
| `--muted` | `rgba(23,21,15,.56)` | Secondary text |
| `--label` | `rgba(23,21,15,.66)` | Small metadata and section labels — **the floor for readable text** |
| `--faint` | `rgba(23,21,15,.38)` | Decorative marks and placeholders **only** — fails contrast at 11–12px |
| `--line` | `rgba(23,21,15,.13)` | Hairline |
| `--line-2` | `rgba(23,21,15,.22)` | Input and chip borders |
| `--danger` | `#A4341F` | Destructive text, invalid state |

The `--label` / `--faint` split is a fix, not a preference: `--faint` on a card
surface lands around 2.4:1 and is unreadable at 11–12px. Anything a person has
to *read* uses `--label` or darker.

Danger tints on this surface are always `rgba(164,52,31,α)` — `.07/.10` fill,
`.28/.30` border, `.16/.22` hover, `.09` menu hover.

### 2.6 Interaction tints — the only two overlays

Do not invent hover/press colours. Composite these over the face:

```css
/* Rest highlight on a coloured key — a top-lit face */
background: linear-gradient(180deg, rgba(0,0,0,.04), transparent), <face>;
/* on the dark alert face, the highlight goes the other way */
background: linear-gradient(180deg, rgba(255,255,255,.1), transparent), #292929;

/* Press shade — bottom-weighted, applied as background-image only */
background-image: linear-gradient(180deg, transparent, rgba(0,0,0,.06));  /* paper keys */
background-image: linear-gradient(180deg, transparent, rgba(0,0,0,.10));  /* colour keys */
background-image: linear-gradient(180deg, transparent, rgba(0,0,0,.14));  /* banners */
background-image: linear-gradient(180deg, transparent, rgba(0,0,0,.16));  /* the dark alert */
```

Utility chrome uses flat alpha instead: `rgba(23,21,15,.04)` outline hover,
`.05` quiet hover, `.06` secondary/menu hover, `.07` app-bar icon hover.

---

## 3. Typography

One family in the app: **Plus Jakarta Sans**, variable 200–800, latin subset,
inlined in `fonts.css` as a base64 `woff2`. No CDN, no second UI face, ever.
Documents use **Aileron** 300/400 and nothing else touches it.

```css
font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### 3.1 The tracking rule

**Letter-spacing is −3% of the font size**, expressed in px, on every ledger
canvas text style. This is what makes the type read as one system across nine
pages.

| Size | Tracking |
| ---: | ---: |
| 32px | `-.96px` |
| 20px | `-.6px` |
| 16px | `-.48px` |
| 14px | `-.42px` |
| 13px | `-.39px` |
| 12px | `-.36px` |

Two deliberate exceptions:

- **Prose on cards** (captions, panel copy — 13px/14px) uses **−2%**: `-.26px`,
  `-.28px`. Sentences need slightly more air than labels.
- **Uppercase labels** invert to **positive** tracking: `+.6px` at 12px, or
  `.04em`. Uppercase without positive tracking is unreadable.

### 3.2 Ledger canvas scale

| Role | Spec | Used by |
| :--- | :--- | :--- |
| Page title | `32/40 700 -.96px` | Hero name, ledger title band, editor title |
| Card title | `20/24 700 -.6px` | Customer name, order name, order card title |
| Control label | `16/20 400 -.48px` | Nav button face, action face, search input, text input |
| Prominent row | `16/24 600 -.48px` | Submissions alert |
| Body / meta | `14/20 400–700 -.42px` | Banners (600), summary rows (400), footers (400), stage filters (600), feed names (700) |
| Dense meta | `13/20 500 -.39px` | Card meta rows |
| Prose | `13/18 400 -.26px` | Captions, panel copy |
| Badge | `12/16 700 -.36px` | Status badges, pending pills |
| Field label | `12/16 700 +.6px UPPERCASE` | Editor card labels, editor field labels |

Numeric alignment: any column of figures gets
`font-variant-numeric: tabular-nums`.

### 3.3 Utility chrome scale

| Role | Spec |
| :--- | :--- |
| Page title | `25px / 1.2 / 700 / -.7px` (`23px` under 400px wide) |
| Panel title | `20px 700 -.5px` |
| Button | `15px 600 -.1px` |
| Menu item | `14.5px 500` |
| Input | **`16px` 500** — never smaller, or iOS zooms on focus |
| Field label | `13px 500` `--muted` |
| Hint / error | `12.5px` |
| Micro label | `11–12px 600` UPPERCASE `.08–.1em` |

### 3.4 Truncation

Every string that comes from the database is untrusted length. Names get
`-webkit-line-clamp: 2` with `overflow: hidden`; single-line meta gets
`text-overflow: ellipsis` + `white-space: nowrap` + `min-width: 0` on the flex
child. Long unbroken strings in titles get `overflow-wrap: anywhere`.

---

## 4. Space, geometry, and the grid

### 4.1 Tokens

`--space-1: 4px` · `--space-2: 8px` · `--space-3: 12px` · `--space-4: 16px` ·
`--space-5: 20px`

The ledger canvas works on a **4px base with a 12 / 16 / 24 rhythm**. `20px` is
a utility-chrome value (`--page-pad`); it does not appear on the canvas.

### 4.2 The ledger grid — non-negotiable

| Element | Spec |
| :--- | :--- |
| Canvas width | `min(390px, 100%)`, centred |
| Page inset | **24px** left and right (`.<prefix>-inset`) |
| Card padding | **12px** (feed/list cards) or **16px 16px 20px** (order cards) |
| Section rule | `height: 1px; background: var(--home-grid)` |
| Section spacer | `height: 24px` with 1px ticks at `left: 24px` and `right: 24px` |
| Card sides | `border-left` + `border-right` 1px `--home-grid`; the section rule above the card is its top border |
| Nav clearance | `padding-top: 67px` on the first ledger block |
| Hero clearance | `147px` (customer) / `240px` (homepage) top padding |
| Footer | `72px` tall, `24px` padding, centred, `--home-grid` on `--home-black` |

The rules and ticks are **real elements**, never a background pattern — a
background image drifts out of alignment the moment a card changes height.

### 4.3 Sizing floors

| Thing | Floor |
| :--- | :--- |
| Any touch target | **44px** total (face + rail counts) |
| `.input`, `.btn--add` | 48px |
| `.btn--primary`, `.btn--secondary` | 52px |
| Bottom-bar key | 52px face + 8px rail |
| Icon in nav / shortcut | 24px |
| Icon inline / in a bar | 20px |
| Feed thumbnail | 32px, `border-radius: 4px`, `object-fit: cover`, black backing |

### 4.4 Radius

**The ledger canvas is square.** `border-radius: 0` — and say so explicitly on
elements the UA rounds (`button`, `input`, `textarea`), because the browser
default will otherwise leak in.

The three sanctioned exceptions on canvas: `4px` on nav buttons and thumbnails,
`50%` on status dots, and nothing else.

Utility chrome: `--radius: 12px` cards · `10px` inputs, buttons, nested rows ·
`999px` chips and toast · `50%` circular icon buttons.

---

## 5. The tactile contract — how a control is built

This is the signature of the product. Get it right and a new page belongs
immediately; get it wrong and it reads as a different app.

### 5.1 Anatomy

Every pressable thing on the ledger canvas is a **two-row CSS grid**: a face
and a rail.

```html
<button class="thing">
  <span class="thing__face">Label</span>
  <span class="thing__rail"></span>
</button>
```

```css
.thing {
  padding: 0;                     /* kill UA button padding, or the canvas
                                     shows down both sides of the face */
  border: 0;
  border-radius: 0;
  background: none;
  font: inherit;                  /* needed when the element is an <a> */
  display: grid;
  grid-template-rows: 48px 7px;   /* face, rail */
  overflow: hidden;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  transition: grid-template-rows 120ms var(--ease-out-expo);
}
.thing__face { /* solid face colour + the rest-highlight gradient */ }
.thing__rail { display: block; background: <the shadow twin>; }

.thing:active,
.thing.is-pressed { grid-template-rows: 53px 2px; }   /* 5px moves down */
.thing:active .thing__face,
.thing.is-pressed .thing__face {
  background-image: linear-gradient(180deg, transparent, rgba(0,0,0,.06));
}
```

**The invariant: face + rail is constant.** Pressing redistributes height; it
never changes the control's footprint, so nothing below it moves. For elements
that grow by padding instead of a track (cards, banners), the same rule holds —
add to the padding exactly what you take off the rail:

```css
.card:active .card__face  { padding-top: 16px; padding-bottom: 16px; }  /* was 12 */
.card:active .card__rail  { height: 4px; }                              /* was 12 */
```

### 5.2 Rail heights in use

| Rail at rest | Pressed | Used by |
| ---: | ---: | :--- |
| 7px | 2px | Nav buttons, card actions, search rail, textarea rail, inline editor keys |
| 8px | 2–3px | Banners, stage filters, feed card rails, bottom-bar keys |
| 12px | 4px | Homepage shortcut cells, customer/order card rails, editor field rails |

Pick the rail from the weight of the object: a full-width record gets 12px, a
control in a row gets 7–8px.

### 5.3 `display: grid` beats `[hidden]`

Any element that sets its own `display` must restate the hidden case, or a
withdrawn control keeps drawing:

```css
.thing[hidden] { display: none; }
```

This bites on every `.view`, `.card`, `.field`, `.terms`, and every
face-over-rail button. It is the single most common bug in this codebase's CSS.

### 5.4 Press state is also a JS contract

`:active` alone is not enough — it does not survive keyboard activation and it
sticks after a scroll on touch. `app.js` mirrors it with `.is-pressed`:

- `pointerdown` on the view → `closest(<selector list>)` → add `.is-pressed`
- `keydown` on `Enter` / `Space` → same, plus `preventDefault()` on inert keys
- Global `pointerup` / `pointercancel` / `pointerleave` / `blur` / `keyup` /
  `scroll` → `clearHomepagePresses()` removes every `.is-pressed` on the page

When you add a pressable control, **add its class to the `closest()` selector
list for that view** (`app.js` 1445–1553, 1997–2033, 2895–2907, 5385–5392).
A control with `:active` styling and no `.is-pressed` wiring is half-built.

Haptics: `hapticTap()` — `navigator.vibrate(10)`, wrapped in try/catch — fires
on the homepage shortcut keys only. Reserve it for primary launch actions; do
not vibrate on every tap.

### 5.5 What must never happen

- A control that changes the page's height when pressed
- A drop shadow standing in for a rail
- `transform: scale()` on a ledger-canvas key (that is the utility chrome's
  idiom, §8)
- A rounded corner on a canvas control
- A hover state as the *only* feedback — this is a phone-first product
- A press transition slower than 180ms

---

## 6. Motion

### 6.1 Tokens

| Token | Value | Use |
| :--- | :--- | :--- |
| `--motion-quick` | `140ms` | Press tracks, clear buttons, image cross-fades |
| `--motion-standard` | `240ms` | Colour, border, shadow, opacity on controls |
| `--motion-enter` | `320ms` | A record or panel arriving |
| `--ease-out-expo` | `cubic-bezier(.16,1,.3,1)` | Face/rail track changes — snaps out, settles |
| `--ease-standard` | `cubic-bezier(.22,1,.36,1)` | Everything else on a surface |
| `--ease-emphasized` | `cubic-bezier(.76,0,.24,1)` | The boot curtain only (520ms) |

Legacy literals still in the file: `120ms var(--ease-out-expo)` on canvas press
tracks, `160/180ms ease` on state cross-fades. Match the neighbouring block
rather than "correcting" it.

### 6.2 Named keyframes — reuse, do not clone

`spin` · `surface-pop` (menu, from `translateY(-6px) scale(.97)`) ·
`surface-rise` (sheet, from `translateY(14px)`) · `home-shimmer` (skeletons on
paper) · `home-shimmer-dark` (skeletons on the black ledger) ·
`fitlog-result-in` (a record arriving, `translateY(8px)` + fade).

### 6.3 The layer cross-fade

Loading → ready is **never** a layout swap. Both layers occupy the same
geometry; the ready layer is built and measured while still hidden
(`.is-measuring`: absolute, `visibility: hidden`), then the only property that
animates is `opacity`. Copy `.home-stage` / `.order-stage`.

### 6.4 Reduced motion is mandatory

Every section that animates ends with a `@media (prefers-reduced-motion:
reduce)` block that kills its own animations and transitions, and
`shared.css:2270` carries the global `.01ms` backstop. Skeletons drop to a flat
tint (`rgba(76,76,76,.25)`) rather than freezing mid-shimmer.

---

## 7. States — loading, empty, error

The rule for all three: **hold the geometry.** A state change may swap pixels;
it must not move the footer.

**Skeleton.** A structural stand-in for the real page, not a stack of grey
pills: same padding, same 32px thumbnail boxes, same divider, same rail, same
`min-height` (the homepage reserves `1322px`; a feed reserves `60svh`). Only
`background-color` animates.

**Empty / no-match.** Lives *inside* the ledger, between two grid spacers:
24px padding, centred, 14/20 `--home-grid` on black — or an inset white
`.fitlog-panel` (16px padding, 8px gap, title 14/20 600, copy 13/18 400) when
it needs to explain itself.

**Error.** Keeps the ledger's `min-height` so failure never collapses the page.
Panel: cream, 1px `--home-grid`, 24px padding, `max-width: 342px`, centred,
title 16/24 700, hint 14/20 `#4c4c4c`, and a square black retry key. Route-level
failure goes through `showRouteError`; user-triggered failure goes through
`showToast`.

**Pending / in-flight.** An 8px orange dot on `home-shimmer`, beside a 12/16 600
label. Not a spinner. Spinners are utility chrome only.

---

## 8. Utility chrome reference

For pages that still live on `shared.css`. Same tokens, different idiom:
rounded, flat-tinted, transform-based feedback.

**Buttons.** `.btn` base is `15px 600 -.1px`, `radius 10px`, 1px transparent
border, `translateY(1px) scale(.985)` on `:active`.

| Variant | Shape |
| :--- | :--- |
| `--primary` | Full width, 52px, `--ink` fill, white text, 55% opacity + `cursor: progress` when disabled |
| `--secondary` | Full width, 52px, white fill, `--ink` border — the second download, level with primary |
| `--outline` | 48px, transparent, `--line-2` border |
| `--new` | `--outline` + `border-style: dashed` — reserved for "+" slots, reads as an empty slot to fill |
| `--danger` | 48px, transparent, `rgba(164,52,31,.35)` border, `--danger` text |
| `--quiet` | 44px, no border, `--muted` text, 500 weight — reversible actions that should not be hit in passing |

**Inputs.** 48px, `#fff`, `--line-2` border, `radius 10px`, **16px** text.
Focus: `border-color: var(--ink)` + `box-shadow: 0 0 0 3px rgba(23,21,15,.10)`.
Invalid: the same in `rgba(164,52,31,.10)`. `scroll-margin: 88px 0 calc(var(--bottombar-h) + 24px)`
so a focused field clears the app bar and the save bar.

**Chips.** 44px pill, `radius 999px`, 18px `radius 6px` check box. Checked is
a `rgba(23,21,15,.05)` wash plus a filled box — **not** a solid black chip;
six checked chips as black slabs outweighed everything around them.

**Bars.** `.appbar` (sticky, `rgba(228,226,221,.92)` + `saturate(150%) blur(12px)`)
and `.savebar` / `.actionbar` (fixed, `.94`, `bottom: var(--keyboard-offset)`).
Both `max-width: 560px` inner, safe-area padded on all four sides.

**Measured clearance.** `app.js` publishes the live height of whichever fixed
bar is up as `--bottombar-h`, and body classes `.has-savebar` /
`.has-fitting-journal-bar` add `calc(var(--bottombar-h) + 32px)` of page
padding. **Never hard-code a bar height** — the toast sat behind the action bar
for exactly that reason.

**Toast.** `bottom: calc(var(--bottombar-h) + 16px)`, `--ink` pill, white,
14px 500, `radius 999px`, `z-index: 300`. With no bar up it falls back to
`24px + env(safe-area-inset-bottom)`.

**Hover, desktop only.** Wrapped in `@media (hover: hover) and (pointer: fine)`:
rows lift 2px, primary lifts 1px with a `0 6px 16px rgba(23,21,15,.18)` shadow.
Never on touch.

---

## 9. Layering

| z-index | Occupant |
| ---: | :--- |
| 0–1 | Content, face isolation |
| 20 | App bar, save bar, action bar |
| 40 | Overflow menu, fitting detail bar |
| 45 | Undo toast (sits *on* the bar it must never cover) |
| 50 | Cost sheet |
| 80 / 90 | Moodboard overlay / journal bar |
| 100 | Fixed page nav (ledger canvas) |
| 120 | Photo viewer |
| 200 / 210 | Camera, confirm, caption / picker, edit sheet |
| 300 | Route loader, toast |
| 400 | Boot curtain |

Anything new picks the nearest existing band. Do not open a new one, and do not
use a value above 400.

---

## 10. Accessibility — enforced, not optional

- **44px minimum** on every target, at rest *and* pressed. The face-over-rail
  press exists partly because it never shrinks the footprint.
- **Focus rings are surface-aware.** `2px solid var(--ink)` with `offset: 3px`
  on utility chrome; on a black canvas the ink ring disappears, so the page
  overrides to `var(--home-white)`, and controls sitting on a *white* face
  override again to `var(--home-black)` with `outline-offset: -2px`. Every
  ledger page needs this three-way block — copy `pages.css:2517`.
- **State on the element**: `aria-pressed` on toggle filters, `hidden` on
  withdrawn controls, `.sr-only` for labels the layout does not show.
- **16px minimum** on any focusable input, or iOS zooms the page.
- **Contrast**: `--label` (66%) is the floor for read text; `--faint` (38%) is
  decorative only.
- **Escape everything**: every interpolated value into `innerHTML` goes through
  `util.escapeHtml`, without exception.
- Keyboard activation must produce the same press state as touch — see §5.4.

---

## 11. Icons and assets

SVG files in `assets/`, named `<feature>-<name>-icon.svg`, referenced as `<img>`
with explicit `width`/`height`. 24px in nav and shortcuts; 20px inline, in bars,
and in search. Monochrome, single weight, no icon library, no inline sprite
sheet. `display: block` + `flex: none` so they never stretch or shrink.

Logos (`logo-header.png`, `logo-signature.png`) are 4x Figma exports keyed to
true transparency; documents only.

---

## 12. Checklist for a new ledger-canvas page

1. Body class `is-<page>page` + the five-rule opt-in block (§1).
2. One CSS prefix for the whole page (`.<prefix>-`), a new section at the **end**
   of `pages.css`, a comment naming the Figma node and the reason.
3. Fixed nav reusing `.cust-nav` / `.cust-nav-btn`; ledger opens with
   `padding-top: 67px`.
4. Title band: 12px/24px padding, hairline top and bottom, `32/40 700 -.96px`
   in `--home-white`.
5. Content as cream cards on a 24px inset, sides ruled, separated by
   `-grid-rule` and `-grid-spacer` ticks.
6. Every control is face-over-rail with a shadow twin from §2.2, square, ≥44px.
7. `.is-pressed` added to the view's `closest()` selector list in `app.js`.
8. Skeleton, empty, and error states that hold the geometry (§7).
9. The three-way focus-ring override (§10).
10. A `@media (prefers-reduced-motion: reduce)` block for whatever you animated.
11. `[hidden] { display: none; }` on anything that sets its own `display`.
12. Update [MAP-html-css.md](MAP-html-css.md) and [FEATURES.md](FEATURES.md).

---

## 13. Known drift — do not propagate

Recorded so the next person does not read it as intent:

- **~90 raw hex literals** in `pages.css`, mostly the shadow twins (`#dd5d01`,
  `#19aa16`, `#1866da`, `#e72a90`) and the destructive palette. The values are
  correct and consistent; only the *names* are missing. Use the same literals
  until the tokens in §2.2 and §2.4 exist, then swap in one pass.
- **Two tracking families** on the canvas (−3% for Figma-derived text, −2% for
  fitting-log prose). Both are deliberate; §3.1 says which is which.
- **Two press timings** (`120ms --ease-out-expo` on older canvas controls,
  `--motion-quick --ease-standard` on newer fitting controls). Match the file
  you are in.
- `.home-search` and `.fitlog-search` are near-duplicate blocks. If a third
  search appears, unify all three rather than adding a fourth copy.
- `--space-*` tokens are barely used on the canvas, which works in raw
  12/16/24. Do not force `--space-5` (20px) into a canvas layout — 20px is not
  part of that rhythm.
