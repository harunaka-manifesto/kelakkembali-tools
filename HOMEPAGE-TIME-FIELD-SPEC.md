# Homepage Time Field — specification

The picture behind the homepage greeting: a slow mesh gradient that follows the
time of day, read through a fixed pixel grid, with a guaranteed contrast band
under the hero text.

Supersedes the rectangular-mosaic spec this file used to hold. That version drew
~40 blended tiles per scene and animated `background-position` on every one of
them, which repaints all forty on every frame — the reason it cost what it cost,
and the reason it read as a quilt rather than as light.

---

## 1. What it is

Three stacked layers inside the existing `390 × 344` `.home-atmosphere` box, in
paint order:

| Layer | Element | Built by | Moves? |
| :--- | :--- | :--- | :--- |
| Colour fields | `.home-atmosphere__scene` > 5 × `.home-atmosphere__blob` | `buildHomepageAtmosphereScene` (`app.js` 1525) | yes — `transform` only |
| Pixel grid | `.home-atmosphere__grid` | markup, static | no |
| Contrast band | `.home-atmosphere__scrim` | markup, static | no |

The grid and the scrim are plain markup in `index.html` because nothing about
them varies per seed — only their two colour tokens change with the phase.

Two scenes still exist (`#homeAtmosphereSceneA` / `…SceneB`) and still crossfade
on a phase boundary. That machinery is unchanged; only what a scene contains is
different.

---

## 2. The five fields

`ATMOSPHERE_BLOB_ANCHORS` places one field near each of five fixed anchors
(`20,24` · `80,18` · `50,55` · `16,80` · `86,72`) with ±13% seeded jitter.
Anchors rather than free placement: five random points bunch, and a mesh
gradient only reads as one picture if the fields are spread *and* overlapping.

Each field is a `radial-gradient(circle closest-side, <colour>, transparent)`
sized 64–110% of the box. `closest-side` keeps the falloff circular inside a
non-square box, so the fields stay round and blend instead of reading as
ellipses.

The palette is **shuffled**, not sampled, so five fields always mean five
different hues from that phase's six.

### Motion

`transform` only — `translate3d` ±5% and `scale` 0.90 → 1.16, 26–46s,
`ease-in-out`, `infinite alternate`, with a negative delay per field so they
never swing together. Travel is deliberately small: a mesh gradient should
breathe, and anything past a few percent reads as sliding wallpaper.

Because only `transform` animates, the whole field runs on the compositor. No
layout, no paint, no main-thread work per frame, five composited layers.
`will-change: transform` is set on the blob, which is five elements — well
inside the budget.

Reduced motion drops the animation. Stopped at their seeded positions the fields
are still a mesh gradient, so the setting loses the drift and none of the
picture.

---

## 3. The pixel grid

One static element, two linear gradients at `background-size: 9px 9px`, drawn in
`--home-atmosphere-line`.

It never moves. That is the whole trick: the colour travels underneath a grid
that is nailed down, so the motion reads as light behind a screen rather than as
a texture sliding about. A grid that drifted with the fields would read as
noise.

The line colour is per phase — dark ink on the light phases, paper on the dark
ones — so the grid is always the quieter of the two.

---

## 4. The contrast band

`.home-atmosphere__scrim` is a vertical gradient in `--home-atmosphere-scrim`,
transparent to 44%, 54% at 76%, 86% at the foot.

It is the greeting's safe area. A **band, not a box** behind the words: a box
would read as a label stuck onto the picture, where a band reads as the field
settling into the page.

The colour is the phase's own `base`, which is what makes one rule work for all
five phases — it lightens the light phases and darkens the dark ones, always in
the direction that phase's ink needs.

### Measured, not assumed

The band was tuned against rendered pixels, not by eye. Sampling the full
greeting rect across 12 daily seeds × both ends of the drift:

| Phase | Worst contrast vs its ink |
| :--- | ---: |
| dawn | 8.91 : 1 |
| morning | 9.72 : 1 |
| afternoon | 8.83 : 1 |
| evening | 5.57 : 1 |
| night | 9.71 : 1 |

Worst case 5.57:1 against a WCAG AA body-text floor of 4.5. Evening is the tight
one — its palette carries `#FF7A2E` and `#FFB34D`, and cream ink over a light
orange is the failure mode to watch. **If you touch a palette, re-measure that
phase before shipping it.**

---

## 5. Phase tokens

Each entry in `HOME_ATMOSPHERE_PHASES` (`app.js` 1408) carries, beyond the
existing `base` / `palette` / `ink` / `skeleton*`:

| Key | Role |
| :--- | :--- |
| `line` | grid hairline for this phase |
| `scrim` | contrast-band colour — normally a shade of `base` |
| `depth` | optional blob-opacity multiplier, default 1 |

`depth` exists for exactly one reason: dawn's palette is genuinely pastel, so
its fields need more of themselves before they read as colour at all. It is
`1.22` there and absent everywhere else. Reach for it only when a palette is
washing out, never to make a phase "pop".

`syncHomepageAtmosphere` (1599) writes `--home-atmosphere-base`, `-line`, and
`-scrim` onto `#homeAtmosphere` on every phase change.

---

## 6. What must not happen

- Animating anything but `transform` on a blob. `background-position`, `filter`,
  `width`, or `opacity` per frame puts the field back on the main thread and
  undoes the whole point.
- A `filter: blur()` to soften the fields. The gradient falloff already does it,
  for free; blur is one of the most expensive things a phone can be asked for.
- Moving the grid.
- Changing a palette without re-running the contrast measurement in §4.
- A box, pill, or shadow behind the greeting instead of the band.
