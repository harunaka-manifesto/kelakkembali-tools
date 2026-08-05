# KELAK KEMBALI — Master UI/UX Design Styleguide & Token System

> **Target Audience:** UI/UX Designers & Web Developers  
> **Status:** Active Reference & Implementation Contract  
> **Location:** `docs/STYLEGUIDE.md`

---

## 1. Design Philosophy & Visual Identity

Kelak Kembali’s digital tools embody the concept of a **tactile printed atelier ledger combined with mechanical push-button controls**. 

Instead of imitating generic modern SaaS dashboards with soft drop shadows, floating translucent cards, and smooth scale-on-hover transitions, Kelak Kembali uses a **grounded, material-focused art direction**.

```
   ┌───────────────────────────────────────────────────────────┐
   │                      #292929 Frame                        │
   │   ┌───────────────────────────────────────────────────┐   │
   │   │  #0D0D0D Obsidian Ledger Ground                   │   │
   │   │  │ 24px inset tick                                │   │
   │   │  ├──────────────────────────────────────────────┤   │   │
   │   │  │  #FEFAF1 Cream Paper Surface                  │   │   │
   │   │  │  ┌─────────────────────────────────────────┐  │   │
   │   │  │  │  FACE  (e.g. #FF6A00 Orange Key)        │  │   │
   │   │  │  ├─────────────────────────────────────────┤  │   │
   │   │  │  │  RAIL  (#DD5D01 Dark Shadow Twin)       │  │   │
   │   │  │  └─────────────────────────────────────────┘  │   │
   │   │  └──────────────────────────────────────────────┘   │   │
   │   └───────────────────────────────────────────────────┘   │
   └───────────────────────────────────────────────────────────┘
```

### Core Design Invariants

1. **Physical Keycap Invariant (Face + Rail)**  
   Every pressable control is built as a physical two-layer keycap: a top **Face** resting on a bottom **Rail** (the physical key depth). Pressing a key depresses the face by redistributing height from rail to face (e.g. 48px face / 7px rail → 53px face / 2px rail). The total height footprint is **fixed**, meaning surrounding UI never shifts or reflows on press.
2. **Printed Ledger Invariant**  
   The primary workspace is a 390px mobile canvas set on an obsidian dark ground (`#0D0D0D`) within a dark desktop surround (`#292929`). Cards resemble heavy cream paper (`#FEFAF1`) inset by 24px, bound by 1px charcoal grid hairlines (`#4C4C4C`) and marked with margin ticks.
3. **Square Corner Standard**  
   The ledger canvas rejects arbitrary border radii. Canvas cards, keys, containers, and table cells have **sharp, 0px square corners** (`border-radius: 0`). Micro-radii (4px) are reserved strictly for top navigation action buttons and thumbnail frames.
4. **Purposeful & Meaningful Palette**  
   Every accent color is tied to a specific domain (Orange = Schedule, Green = Quotation, Blue = Invoice, Pink = Fitting). Every color has an exact 1:1 shadow twin for its physical rail.
5. **Single Typeface Integrity**  
   All interactive and UI surfaces use **Plus Jakarta Sans** with strict, mathematically defined negative tracking (`-3%` of font size for headers and labels, `-2%` for prose, positive `+0.6px` for uppercase).

---

## 2. Design Tokens

### 2.1 Color Palette Tokens

#### Ledger Canvas Palette (`styles/pages.css`)

| Token | Hex / Value | Role & Usage | Contrast vs Paper |
| :--- | :--- | :--- | :--- |
| `--home-white` | `#FEFAF1` | **Cream Paper.** Cards, action faces, search surface, hero background. Never pure `#FFFFFF`. | — |
| `--home-white-dark` | `#E3E3E3` | **Paper Shadow / Rail.** Physical shadow rail for paper keys, card dividers. | 1.2:1 |
| `--home-black` | `#0D0D0D` | **Obsidian Ledger Ground.** Page canvas background, footer, primary dark rails. | 18.5:1 |
| `--home-black-light` | `#292929` | **Surround Frame.** Frame around the 390px canvas, dark alert faces, skeleton ground. | 13.8:1 |
| `--home-grid` | `#4C4C4C` | **Grid Hairlines & Metadata.** 1px section borders, ledger ticks, secondary text labels. | 8.4:1 |
| `--home-orange` | `#FF6A00` | **Schedule / Next Action.** Primary action face, deadlines, schedule shortcuts. | 2.5:1 (use dark text/rail) |
| `--home-green` | `#23B620` | **Quotation / Save.** Quotation shortcut face, save confirm state. | 2.7:1 |
| `--home-blue` | `#1E72EF` | **Invoice.** Invoice shortcut face, sizing stage. | 3.9:1 |
| `--home-pink` | `#FC4FAC` | **Fitting.** Fitting log shortcut face, fitting stage 2. | 2.8:1 |

#### Shadow Twin Rail Pairs (Mandatory)

When creating colored buttons or keys, **never use opacity or CSS filters** for the 3D key shadow. Use the designated 1:1 shadow twin rail color:

| Surface Name | Face Token | Face Hex | Shadow Rail Token | Rail Hex |
| :--- | :--- | :--- | :--- | :--- |
| **Paper Key** | `--home-white` | `#FEFAF1` | `--home-white-dark` | `#E3E3E3` |
| **Schedule Key** | `--home-orange` | `#FF6A00` | `--rail-orange` | `#DD5D01` |
| **Quotation Key** | `--home-green` | `#23B620` | `--rail-green` | `#19AA16` |
| **Invoice Key** | `--home-blue` | `#1E72EF` | `--rail-blue` | `#1866DA` |
| **Fitting Key** | `--home-pink` | `#FC4FAC` | `--rail-pink` | `#E72A90` |
| **Dark Alert Key** | `--home-black-light` | `#292929` | `--home-black` | `#0D0D0D` |
| **Grid Hairline Key**| `--home-grid` | `#4C4C4C` | `--home-black-light` | `#292929` |

#### Fitting Stage Domain Palette

Exhaustive stage palette used across fitting feed cards and logs:

| Stage Name | CSS Token | Hex Value | Semantic Meaning |
| :--- | :--- | :--- | :--- |
| **Sizing** | `--stage-sizing` | `#1866DA` | Initial measurement & sizing stage |
| **Fitting 1** | `--stage-fitting-1` | `#19AA16` | First garment fitting |
| **Fitting 2** | `--stage-fitting-2` | `#E72A90` | Second adjustment fitting |
| **Fitting 3** | `--stage-fitting-3` | `#FF6A00` | Third refinement fitting |
| **Final Fitting**| `--stage-final-fitting` | `#0D0D0D` | Final client review & handoff |

*Note: The vocabulary term "Body measurements" is strictly retired. Do not reintroduce it.*

#### Utility Chrome Palette (`styles/shared.css`)

| Token | Value | Role |
| :--- | :--- | :--- |
| `--bg` | `#E4E2DD` | Warm grey page background for forms and overlays |
| `--surface` | `#F4F3F0` | Sub-item background (e.g. `.item`, `.term` rows) |
| `--surface-2` | `#FBFAF8` | Card background in forms, cost calculator sheets |
| `--ink` | `#17150F` | Primary text, primary button fill, focus rings |
| `--muted` | `rgba(23, 21, 15, 0.56)` | Secondary labels & explanatory text |
| `--label` | `rgba(23, 21, 15, 0.66)` | Minimum contrast floor (4.5:1) for small labels |
| `--faint` | `rgba(23, 21, 15, 0.38)` | Decorative marks & placeholders only |
| `--line` | `rgba(23, 21, 15, 0.13)` | Soft hairline divider |
| `--line-2` | `rgba(23, 21, 15, 0.22)` | Input & chip borders |
| `--danger` | `#A4341F` | Destructive text & error state outlines |

---

### 2.2 Typography System

#### Typeface Specification
- **Primary App Typeface:** `Plus Jakarta Sans` (weights 200–800, base64 inlined).
- **Document Template Typeface:** `Aileron` (weights 300/400, strictly for `#quotation` & `#invoice` PDF generation).

```css
font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

#### Letter-Spacing (Tracking) Formula

To achieve a dense, precision-printed aesthetic, letter-spacing is calculated as **−3% of the font size** in pixels:

$$\text{Tracking (px)} = -0.03 \times \text{Font Size (px)}$$

| Font Size | Calculation | Applied Tracking | Primary Application |
| :--- | :--- | :--- | :--- |
| **32px** | $32 \times -0.03$ | `-0.96px` | Hero greeting, Page Titles |
| **20px** | $20 \times -0.03$ | `-0.60px` | Customer Name, Card Titles |
| **16px** | $16 \times -0.03$ | `-0.48px` | Control Labels, Inputs, Alerts |
| **14px** | $14 \times -0.03$ | `-0.42px` | Summary Text, Stage Filters |
| **13px** | $13 \times -0.03$ | `-0.39px` | Dense Metadata Rows |
| **12px** | $12 \times -0.03$ | `-0.36px` | Status Badges, Pending Pills |

**Exceptions to the −3% Rule:**
1. **Card Prose & Paragraphs:** Set to **−2%** (`-0.26px` at 13px, `-0.28px` at 14px) for legibility.
2. **Uppercase Micro-Labels:** Inverted to **positive tracking** (`+0.6px` or `+0.08em` to `+0.1em`).
3. **Tabular Numerals:** Money and dates must use `font-variant-numeric: tabular-nums` to prevent column drift.

---

### 2.3 Spacing & Grid System

#### Base Rhythm
- Base Unit: **4px**
- Canvas Spacing Scale: **12px**, **16px**, **24px** (Raw pixel values preferred over loose units on canvas).
- Utility Chrome Scale: `--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`, `--space-5: 20px`.

#### Canvas Inset & Geometry
- **Canvas Width:** Fixed `min(390px, 100%)`, horizontally centered on desktop (`margin: 0 auto`).
- **Page Margin Inset:** Exactly **24px** padding on left and right (`padding: 0 24px`).
- **Section Rule:** 1px hairline (`height: 1px; background: var(--home-grid)`).
- **Section Spacer:** 24px tall spacer (`height: 24px`) with pseudo-element margin ticks at `left: 24px` and `right: 24px`.

#### Sizing Floors (Touch Targets)

| Control Type | Minimum Dimension Floor |
| :--- | :--- |
| **Any Touch Target** | **44px** minimum total height |
| **Inputs (`.input`), Add Buttons (`.btn--add`)** | **48px** minimum height |
| **Primary Buttons (`.btn--primary`)** | **52px** minimum height |
| **Bottom Bar Keycaps** | **52px Face + 8px Rail** (60px total) |
| **Navigation & Shortcut Icons** | **24px × 24px** |
| **Inline Bar Icons** | **20px × 20px** |
| **Feed Thumbnails** | **32px × 32px** (4px radius, black backing) |

---

### 2.4 Motion & Animation Tokens

| Motion Token | Duration | Easing Curve | Use Case |
| :--- | :--- | :--- | :--- |
| `--motion-quick` | `140ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Keypress travel, icon state switches, image fades |
| `--motion-standard` | `240ms` | `cubic-bezier(0.22, 1, 0.36, 1)` | Surface color transitions, border highlights |
| `--motion-enter` | `320ms` | `cubic-bezier(0.22, 1, 0.36, 1)` | Incoming list items & sheet sliding |
| `--ease-out-expo` | — | `cubic-bezier(0.16, 1, 0.3, 1)` | Key depress snap & release curve |

---

## 3. Physical Tactile Controls (Face-over-Rail Mechanics)

### 3.1 Anatomy of a Tactile Control

Every interactive element on the ledger canvas consists of a **two-row CSS Grid** holding a `.face` and a `.rail`.

```html
<button class="home-action home-action--schedule">
  <span class="home-action__face">
    <img src="assets/schedule-icon.svg" alt="" width="24" height="24">
    <span>Schedule</span>
  </span>
  <span class="home-action__rail"></span>
</button>
```

```css
.home-action {
  height: 98px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  display: grid;
  grid-template-rows: 86px 12px; /* 86px Face + 12px Rail = 98px Total */
  cursor: pointer;
  transition: grid-template-rows 180ms var(--ease-out-expo);
}

.home-action__face {
  background: linear-gradient(180deg, rgba(0,0,0,.04), transparent), #FF6A00;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -.42px;
  color: var(--home-white);
}

.home-action__rail {
  display: block;
  background: #DD5D01; /* Shadow Twin */
}

/* Active / Pressed State: Height transfers from Rail to Face */
.home-action:active,
.home-action.is-pressed {
  grid-template-rows: 96px 2px; /* 96px Face + 2px Rail = 98px Total */
}

.home-action:active .home-action__face,
.home-action.is-pressed .home-action__face {
  background-image: linear-gradient(180deg, transparent, rgba(0,0,0,.10));
}
```

### 3.2 Rail Depth Matrix

Choose rail depths according to physical visual weight:

| Component Type | Rest State (Face / Rail) | Pressed State (Face / Rail) | Total Constant Height |
| :--- | :--- | :--- | :--- |
| **Top Nav Buttons (`.home-nav-btn`)** | `48px / 7px` | `53px / 2px` | `55px` |
| **Submissions Alert (`.home-alert`)** | `56px / 7px` | `61px / 2px` | `63px` |
| **Shortcut Keys (`.home-action`)** | `86px / 12px` | `96px / 2px` | `98px` |
| **Bottom Bar Keys (`.savebar-btn`)** | `52px / 8px` | `57px / 3px` | `60px` |
| **Customer Ledger Cards** | `Padding: 12px, Rail: 12px` | `Padding: 16px, Rail: 4px` | Constant |

### 3.3 State Synchronization Contract (`app.js`)

Keyboard navigation and touch events are synchronized via `.is-pressed`:
1. `pointerdown` adds `.is-pressed` to the target control.
2. `Enter` / `Space` keydown adds `.is-pressed`.
3. Global `pointerup`, `pointercancel`, `scroll`, and `keyup` trigger `clearHomepagePresses()` to remove `.is-pressed`.
4. Primary launch actions fire haptic feedback via `navigator.vibrate(10)`.

---

## 4. UI Layouts & Surface Contexts

The application comprises three distinct surface rulebooks:

```
               ┌─────────────────────────────────────────────────┐
               │           Kelak Kembali Application             │
               └───────────────────────┬─────────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌──────────────────┐         ┌──────────────────┐          ┌──────────────────┐
│  Ledger Canvas   │         │  Utility Chrome  │          │    Documents     │
│  (styles/pages)  │         │ (styles/shared)  │          │ (styles/docs)    │
├──────────────────┤         ├──────────────────┤          ├──────────────────┤
│ • 390px ground   │         │ • 560px max width│          │ • Locked 595px   │
│ • Cream cards    │         │ • Warm grey bg   │          │ • Aileron font   │
│ • Square corners │         │ • 10-12px radius │          │ • 1:1 Figma snap │
│ • Face/Rail keys │         │ • Outline buttons│          │ • Off-screen stage│
└──────────────────┘         └──────────────────┘          └──────────────────┘
```

### 4.1 Opt-in Rules for New Ledger Views

Any new user-facing page must adopt the Ledger Canvas contract by specifying:

```css
body.is-featurepage { background: #292929; overflow-x: hidden; }
body.is-featurepage .appbar,
body.is-featurepage .pagehead { display: none; }
body.is-featurepage .page {
  width: min(390px, 100%);
  max-width: 390px;
  min-height: 100svh;
  margin: 0 auto;
  padding: 0;
  background: var(--home-black);
}
body.is-featurepage .view { gap: 0; }
```

### 4.2 Z-Index Layering Matrix

| Z-Index | Occupant | Role |
| ---: | :--- | :--- |
| **0–1** | Page content, base card surfaces | Document ground |
| **20** | Sticky `.appbar`, fixed `.savebar`, `.actionbar` | Primary toolbars |
| **40** | Overflow dropdown menus, detail action bars | Contextual overlays |
| **45** | Undo toasts (`#fitaddUndo`) | Floating action toast |
| **50** | Cost calculator scratchpad (`#calcSheet`) | Dynamic sheet |
| **100** | Fixed page navigation bar (`.home-nav`, `.moodboard-nav`) | Master navigation |
| **120** | Photo lightbox viewer (`#fittingPhotoViewer`) | Full-screen image preview |
| **200–210**| Camera overlay, stage picker, caption sheet | Capture modal pipeline |
| **300** | Route loading curtain (`#routeLoader`), system toast | Page transition loader |
| **400** | Boot curtain (`#boot`) | Authentication splash gate |

---

## 5. Form Components & Input Controls

### 5.1 Text Inputs & Select Fields

```css
.input {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  font-family: inherit;
  font-size: 16px; /* Prevents iOS auto-zoom on focus */
  font-weight: 500;
  color: var(--ink);
  background: #FFFFFF;
  border: 1px solid var(--line-2);
  border-radius: 10px;
  appearance: none;
  transition: border-color 240ms ease, box-shadow 240ms ease;
}

.input:focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(23, 21, 15, 0.10);
}

.input.is-invalid {
  border-color: var(--danger);
  box-shadow: 0 0 0 3px rgba(164, 52, 31, 0.10);
}
```

### 5.2 Currency & Percentage Prefixed Inputs

All money values display currency prefixes (e.g. `Rp`) or percentage suffixes (`%`):

```html
<div class="prefixed">
  <span class="prefix">Rp</span>
  <input type="text" class="input" placeholder="0">
</div>
```

---

## 6. Accessibility & Contrast Standards

1. **Focus Ring Invariant**  
   Focus rings must adapt to surface background colors:
   - On Utility Chrome: `2px solid var(--ink)` with `outline-offset: 3px`.
   - On Dark Ledger Ground (`#0D0D0D`): `2px solid var(--home-white)`.
   - On Cream Cards (`#FEFAF1`): `2px solid var(--home-black)` with `outline-offset: -2px`.
2. **Text Contrast Floor**  
   All body, metadata, and form text must maintain a minimum contrast ratio of **4.5:1** against its surface. Use `--label` (`rgba(23, 21, 15, 0.66)`) as the absolute floor. `--faint` (`rgba(23, 21, 15, 0.38)`) is strictly decorative.
3. **Reduced Motion Support**  
   Every animated component must respond to `prefers-reduced-motion: reduce`:

```css
@media (prefers-reduced-motion: reduce) {
  .home-action,
  .home-nav-btn,
  .route-loader__card i {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## 7. Developer Checklist for New Features

When building a new page or component in Kelak Kembali tools, verify against this 12-point checklist:

- [ ] **Surface Choice:** Assigned correct surface rulebook (Ledger Canvas vs Utility Chrome).
- [ ] **Canvas Setup:** Applied 390px width container with 24px left/right margins.
- [ ] **Square Corners:** Enforced `border-radius: 0` on canvas elements.
- [ ] **Face-over-Rail:** Constructed all interactive keys with 2-row grid and 1:1 shadow twin rails.
- [ ] **Constant Footprint:** Verified keypress active state transfers height without shifting surrounding elements.
- [ ] **Color Twins:** Used exact hex pairs from Shadow Twin Rail table.
- [ ] **Tracking Formula:** Applied `-3%` tracking formula (`-0.03 * fontSize`) to all headings and labels.
- [ ] **Tabular Numerals:** Wrapped monetary values with `font-variant-numeric: tabular-nums` and `util.formatRupiah`.
- [ ] **iOS Zoom Prevention:** Ensured all focusable inputs have `font-size: 16px` or greater.
- [ ] **HTML Escaping:** Passed all dynamic innerHTML interpolations through `util.escapeHtml`.
- [ ] **JS Press Wiring:** Added element selector to `app.js` `closest()` list for `.is-pressed` state handling.
- [ ] **Validation Gate:** Validated syntax with `node --check app.js` and `node --test tests/pure-modules.test.cjs`.
