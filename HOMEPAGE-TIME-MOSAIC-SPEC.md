# Homepage Time-Adaptive Mosaic — Implementation Specification

## 1. Goal

Replace the homepage hero's plain white background with a procedural, softly blended rectangular mosaic inspired by the two supplied references. The visual occupies the existing `390px × 344px` hero behind the greeting and nearest-deadline copy.

The atmosphere must:

- change with five device-local time phases;
- generate a different but deterministic composition each local calendar day;
- move continuously at a moderate ambient pace;
- cross-fade when the phase or date changes while the homepage remains open;
- preserve readable greeting and deadline text without a visible scrim or text panel;
- appear behind both the loading skeleton and ready homepage so there is no white flash;
- become fully static when the user prefers reduced motion.

The reference images are visual direction only. Do not ship, copy, preprocess, or derive raster assets from them.

## 2. Scope and constraints

Implementation is limited to:

- `index.html` — decorative atmosphere markup inside `#homeStage`;
- `styles/pages.css` — the mosaic, phase palettes, text contrast, motion, loading integration, and reduced-motion rules;
- `app.js` — local-time phase selection, seeded composition generation, scene scheduling, and lifecycle cleanup.

Do not add a library, canvas, image asset, stylesheet, module, public API, database field, or build step. Preserve the current hero height, greeting position, shortcut row, loading-stage geometry, route focus target, and downstream homepage layout.

The new layer is decorative. It must use `aria-hidden="true"`, receive no focus, and use `pointer-events: none`.

### Required implementation order

Follow this order. Do not begin with animation tuning.

1. Add the two-scene atmosphere markup to `#homeStage` and register its three element handles.
2. Add the static CSS stacking contract and make the loading and ready hero backgrounds transparent.
3. Add the exact phase configuration and phase-selection helper.
4. Add the deterministic hash, pseudo-random generator, grid partitioner, and scene builder.
5. Render one static scene and verify the loading skeleton, greeting, shortcuts, and ledger have not moved.
6. Add the quiet-zone rules and verify text contrast in all five phases.
7. Add front/back scene cross-fading.
8. Add ambient scene and tile animation.
9. Add the phase-boundary timer, midnight refresh, visibility refresh, and route cleanup.
10. Add reduced-motion behavior and run the complete validation matrix.

If a visual defect appears, fix it at the earliest responsible layer. Do not compensate for incorrect geometry with arbitrary margins in later steps.

## 3. Visual direction

Use the references' visual grammar rather than literal pixels:

- irregular rectangular fields arranged on a loose grid;
- translucent overlaps and softened gradient transitions;
- vivid cyan, yellow, orange, magenta, violet, and blue relationships during the day;
- deep navy, indigo, cobalt, and muted teal at night;
- a mixture of broad calm fields and smaller saturated accents;
- no checkerboard, sharp retro pixel-art outline, glass card, drop shadow, or visible container behind the copy.

The result should feel like a moving light study printed through a modular grid, not a dashboard visualization.

## 4. Exact time phases and palettes

Use the viewing device's local clock. Do not use Jakarta conversion for this feature.

Use these values as written. Do not ask the implementing agent to choose colors later.

| Phase | Local time | Base | Tile palette, in neighbor order | Quiet pair | Ink | Skeleton rest / peak |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Dawn | `05:00–07:59` | `#DCE9FF` | `#7FB9E8`, `#A596D9`, `#C97ABF`, `#F5B3A2`, `#FFD7A8`, `#F6E7D7` | `#F5E2D2`, `#D8E9F2` | `#17150F` | `rgba(23,21,15,.16)` / `rgba(23,21,15,.28)` |
| Morning | `08:00–11:59` | `#DDF8F8` | `#04A8D6`, `#49CFE2`, `#7CD4C4`, `#F7E733`, `#FFF6A8`, `#F36F32` | `#E8F9F1`, `#FFF7BF` | `#17150F` | `rgba(23,21,15,.16)` / `rgba(23,21,15,.28)` |
| Afternoon | `12:00–16:59` | `#FFEFA1` | `#18A9DC`, `#75D4EA`, `#FFF000`, `#FFB52E`, `#FF6533`, `#DD3C9D` | `#FFF4B5`, `#DDF6EF` | `#17150F` | `rgba(23,21,15,.16)` / `rgba(23,21,15,.28)` |
| Evening | `17:00–19:59` | `#44265F` | `#244F9B`, `#6A3FA0`, `#C32C95`, `#EF3F67`, `#FF7A2E`, `#FFB34D` | `#35234E`, `#243A70` | `#FEFAF1` | `rgba(254,250,241,.18)` / `rgba(254,250,241,.32)` |
| Night | `20:00–04:59` | `#071B3D` | `#0C2556`, `#173F7A`, `#315AA8`, `#5267A6`, `#372D72`, `#1C6F82` | `#071A36`, `#102B55` | `#FEFAF1` | `rgba(254,250,241,.18)` / `rgba(254,250,241,.32)` |

Declare one file-local constant in `app.js` named `HOME_ATMOSPHERE_PHASES`. Each entry must contain:

```js
{
  key: "morning",
  greetingPeriod: "morning",
  base: "#DDF8F8",
  palette: [/* exact ordered colors from the table */],
  quiet: [/* exact quiet pair */],
  ink: "#17150F",
  skeleton: "rgba(23,21,15,.16)",
  skeletonPeak: "rgba(23,21,15,.28)"
}
```

Use the same object shape for all phases. Do not split palette truth between JavaScript and several CSS selectors. JavaScript applies `--home-hero-ink`, `--home-hero-skeleton`, `--home-hero-skeleton-peak`, and the phase key to `#viewCustomers`; the scene builder consumes the other values.

Use this exact phase function:

```js
function homepageAtmospherePhase(dateObj) {
  const hour = dateObj.getHours();
  if (hour < 5) return HOME_ATMOSPHERE_PHASES.night;
  if (hour < 8) return HOME_ATMOSPHERE_PHASES.dawn;
  if (hour < 12) return HOME_ATMOSPHERE_PHASES.morning;
  if (hour < 17) return HOME_ATMOSPHERE_PHASES.afternoon;
  if (hour < 20) return HOME_ATMOSPHERE_PHASES.evening;
  return HOME_ATMOSPHERE_PHASES.night;
}
```

Greeting semantics remain:

- Dawn and Morning → `Good morning, Ichaku`
- Afternoon → `Good afternoon, Ichaku`
- Evening and Night → `Good evening, Ichaku`

Expose the selected text color through a hero-scoped custom property such as `--home-hero-ink`. The greeting, deadline copy, and deadline `<strong>` must inherit it.

## 5. Markup and layering

Add one persistent `.home-atmosphere` element as the first child of `#homeStage`, before the loading, error, and ready states.

It contains two equivalent scene elements:

```html
<div class="home-atmosphere" id="homeAtmosphere" aria-hidden="true">
  <div class="home-atmosphere__scene" id="homeAtmosphereSceneA"></div>
  <div class="home-atmosphere__scene" id="homeAtmosphereSceneB"></div>
</div>
```

The two scenes are a front/back buffer. One remains visible while the inactive scene is populated with the next composition. The inactive scene then fades in, becomes active, and the old scene is cleared after the transition.

Register the atmosphere and both scene nodes in the `app.js` element registry. Do not add handles for individual tiles; tile nodes are decorative children managed inside a scene.

Layering contract:

1. `.home-atmosphere` is absolute at the top of `.home-stage`, exactly `344px` high, clipped, and `z-index: 0`.
2. Homepage state layers are positioned above it at `z-index: 1`.
3. `.home-hero` and `.home-skel__hero` use transparent backgrounds so the atmosphere is visible.
4. The remaining loading and ready sections retain their current opaque white or black surfaces.
5. `.home-nav` remains at its existing `z-index: 100` and is visually unchanged.
6. The error state remains opaque and may cover the atmosphere.

Do not duplicate the atmosphere inside the loading and ready heroes. A single persistent layer prevents the mosaic from restarting or changing during the existing loading-to-ready cross-fade.

### Exact CSS geometry

Use these values unless a browser bug requires an equivalent declaration:

```css
.home-atmosphere {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  width: 100%;
  height: 344px;
  overflow: hidden;
  pointer-events: none;
  contain: paint;
  background: var(--home-atmosphere-base, var(--home-white));
}

.home-atmosphere__scene {
  position: absolute;
  inset: -12px;
  opacity: 0;
  overflow: hidden;
  transform: scale(1.02);
  transition: opacity 900ms var(--ease-standard);
  animation: home-atmosphere-drift var(--scene-duration) ease-in-out var(--scene-delay) infinite alternate;
}

.home-atmosphere__scene.is-visible { opacity: 1; }

.home-atmosphere__tile {
  position: absolute;
  left: var(--tile-left);
  top: var(--tile-top);
  width: calc(var(--tile-width) + .35%);
  height: calc(var(--tile-height) + .35%);
  opacity: var(--tile-opacity);
  background:
    radial-gradient(circle at var(--tile-glow-x) var(--tile-glow-y), rgba(255,255,255,.42), transparent 68%),
    linear-gradient(var(--tile-angle), var(--tile-a), var(--tile-b));
  background-size: 145% 145%, 125% 125%;
  animation: home-atmosphere-tile-flow var(--tile-duration) ease-in-out var(--tile-delay) infinite alternate;
}

.home-atmosphere__tile--quiet {
  background-size: 125% 125%, 115% 115%;
}
```

Add `position: relative; z-index: 1` to `.home-state`. Change `.home-state--ready` to a transparent background. The child sections below the hero already paint their own surfaces; verify that the action faces, search, ledger, and footer remain opaque.

Change `.home-skel` from one black background to:

```css
background: linear-gradient(to bottom, transparent 0 344px, var(--home-black) 344px);
```

Change both `.home-hero` and `.home-skel__hero` to `background: transparent`. Do not change their height or padding.

Add a hero-only shimmer so night placeholders never animate toward the existing dark skeleton color:

```css
.home-skel__hero .home-skel__block {
  background: var(--home-hero-skeleton, rgba(76,76,76,.18));
  animation-name: home-hero-shimmer;
}

@keyframes home-hero-shimmer {
  50% { background-color: var(--home-hero-skeleton-peak, rgba(76,76,76,.32)); }
}
```

Do not change `home-shimmer` or `home-shimmer-dark`; other skeleton surfaces still rely on them.

## 6. Deterministic daily composition

### Seed

Create these file-local helpers in the homepage region of `app.js`. Do not export them or place them in `util.js`.

Use FNV-1a for the string hash and Mulberry32 for pseudo-random values:

```js
function homepageAtmosphereHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function homepageAtmosphereRandom(seed) {
  return function () {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
```

Build the seed key from:

```text
YYYY-MM-DD-W-PHASE
```

`MM` and `DD` are zero-padded, `W` is `dateObj.getDay()`, and `PHASE` is the phase key. Example: `2026-08-05-3-afternoon`.

Name the helper `homepageAtmosphereSeedKey(dateObj, phaseKey)`. Hash the resulting key once, then pass that integer to `homepageAtmosphereRandom`.

The same device-local day and phase must always reproduce the same composition. A different date or phase must produce a different composition. Do not use `Math.random()` directly after the seeded generator is created.

### Grid construction

Generate the scene from a virtual six-column by seven-band grid using this exact procedure:

1. Consume six random values as `0.75 + random() * 0.60` for column weights.
2. Consume seven random values as `0.75 + random() * 0.55` for row weights.
3. Normalize each weight array by dividing each value by its total. Build cumulative percentage offsets beginning at `0` and ending at `100`.
4. For each row, start at column zero with six columns remaining.
5. Roll once for span width. Use width `1` when the roll is below `.28`, width `2` below `.82`, otherwise width `3`.
6. Clamp the span to the remaining columns. If three columns remain and the roll selects width `2`, keep width `2`; the final one-column tile is acceptable.
7. Emit the tile, advance the column cursor by its span, and repeat until all six columns are consumed.
8. A tile is in the quiet zone when `rowIndex >= 5 && startColumn < 4`.
9. Create every tile with `document.createElement("i")`, set `className = "home-atmosphere__tile"`, add `home-atmosphere__tile--quiet` when applicable, assign its CSS custom properties, and append it to a `DocumentFragment`.
10. Replace the scene's children once with `scene.replaceChildren(fragment)`. Never append tiles one-by-one to the live scene.

The expected scene contains roughly 18–26 tiles. The algorithm above is authoritative; do not add a retry loop merely to hit that range.

Set geometry properties from the cumulative offsets:

- `--tile-left`: column start offset plus `%`;
- `--tile-top`: row start offset plus `%`;
- `--tile-width`: ending column offset minus starting column offset plus `%`;
- `--tile-height`: ending row offset minus starting row offset plus `%`.

### Tile color rules

- For a normal tile, select the first palette index with `floor(random() * palette.length)`.
- Roll once for the second-color distance. Use distance `1` normally and distance `3` only when the roll is below `.18`. Wrap the index through the ordered palette.
- If a tile would receive the same ordered pair as the tile immediately to its left, swap its first and second colors.
- For a quiet tile, use only the two quiet colors and swap their order when `random() >= .5`.
- Set normal opacity to `.78 + random() * .18`.
- Set quiet opacity to `.88 + random() * .08`.
- Set the gradient angle to one of `0`, `90`, `180`, or `270`, plus a jitter of `-18 + random() * 36` degrees.
- Set glow coordinates independently to `20 + random() * 60` percent.
- Set normal tile duration to `24 + random() * 16` seconds.
- Set quiet tile duration to `36 + random() * 16` seconds.
- Set tile delay to a negative value between zero and its full duration.
- Put a phase-level base gradient behind all tiles so tiny antialiasing gaps never reveal a flat page color.

Set each scene's background to:

```text
radial-gradient(circle at SEEDED_X SEEDED_Y, palette[1], transparent 62%),
linear-gradient(135deg, base, palette[4])
```

Choose `SEEDED_X` from `25–75%` and `SEEDED_Y` from `15–65%` using the scene's generator. Set `--home-atmosphere-base` on the container to the phase base color.

### Greeting quiet zone

The greeting occupies the lower-left portion of the hero, starting around 70% of its height. Any tile intersecting the bottom two grid bands and the left four columns belongs to the quiet zone.

Quiet-zone tiles must:

- use the phase's designated light pair for dark-text phases;
- use the phase's designated deep pair for white-text phases;
- use less color contrast and slightly lower gradient movement than accent tiles;
- maintain at least WCAG 4.5:1 contrast for the 14px deadline text throughout the animation.

Do not solve contrast with `mix-blend-mode`, text shadows, a frosted panel, or a visible scrim.

## 7. Motion

The selected motion level is moderate, but the greeting must remain the visual priority.

- Keep rectangle geometry fixed for the whole phase.
- Animate each complete scene with a slow `scale(1.00 → 1.04)` and a seeded `1–2%` translation over `24–36s`, alternating smoothly.
- Animate internal tile gradient positions over `20–40s`, using seeded negative delays so the tiles do not move in unison.
- Restrict animation to transforms, opacity, and background position. Do not run per-frame JavaScript.
- Use the existing standard easing family where appropriate; introduce a homepage-specific ambient keyframe only when the existing keyframes cannot express the movement.
- Apply `contain: paint`, clipping, and only narrowly scoped `will-change` declarations.
- The scaled scene must extend past every hero edge throughout its movement.

Use these exact animations:

```css
@keyframes home-atmosphere-drift {
  from { transform: scale(1.02) translate3d(var(--scene-from-x), var(--scene-from-y), 0); }
  to { transform: scale(1.05) translate3d(var(--scene-to-x), var(--scene-to-y), 0); }
}

@keyframes home-atmosphere-tile-flow {
  from { background-position: 0% 0%, 0% 0%; }
  to { background-position: 18% -12%, 12% 8%; }
}
```

For every scene, select `--scene-from-x`, `--scene-from-y`, `--scene-to-x`, and `--scene-to-y` independently from `-6px` through `6px`, a scene duration from `28–36s`, and a negative scene delay between zero and the full duration. Use `alternate` and `ease-in-out` infinitely. Use each tile's exact duration and negative delay with the tile-flow animation.

For scene changes, populate the inactive scene and cross-fade opacity over exactly `900ms`. Set `transition: color 900ms var(--ease-standard)` on the greeting and deadline. Clear the old scene only after the fade completes.

Initial render must not fade from white. Give the newly built first scene an `.is-instant` class that disables its opacity transition, add `.is-visible`, then remove `.is-instant` on the next animation frame.

Under `prefers-reduced-motion: reduce`:

- disable scene drift and tile gradient animations;
- remove the 900ms scene and text transitions;
- display the deterministic composition as a static image-like surface;
- switch phases immediately.

Use this exact reduced-motion override in the existing homepage media query:

```css
.home-atmosphere__scene,
.home-atmosphere__tile { animation: none; }

.home-atmosphere__scene { transition: none; transform: scale(1.02); }
.home-hero__greeting,
.home-hero__deadline { transition: none; }
```

Do not freeze a scene at an arbitrary animation progress using `animation-play-state: paused`; remove the animation so the deterministic base frame is used.

## 8. Loading integration

Initialize the atmosphere in `beginHomepageLoad()` before the homepage database requests begin. This ensures the correct phase is visible during the structural skeleton.

Update the loading styles as follows:

- `.home-skel__hero` becomes transparent.
- The rest of `.home-skel` retains its current black ledger background from `344px` downward.
- Hero skeleton blocks use a phase-aware placeholder color: darker translucent blocks during dark-text phases and lighter translucent blocks during white-text phases.
- Existing dimensions, shimmer timing, and loading-to-ready opacity cross-fade remain unchanged.

The ready hero must not regenerate the scene. It simply reveals its copy above the atmosphere already shown during loading.

## 9. Lifecycle and live updates

Create this file-local state beside the existing homepage animation state:

```js
const homeAtmosphereState = {
  activeIndex: 0,
  seedKey: "",
  phase: "",
  greetingPeriod: "morning",
  timer: null,
  transitionTimer: null,
  transitionToken: 0
};
```

Do not store tile records in application state. The scene DOM is the rendered representation.

Implement these exact named functions:

- `homepageAtmospherePhase(dateObj)` — returns the phase configuration.
- `homepageAtmosphereSeedKey(dateObj, phaseKey)` — returns the deterministic string key.
- `homepageAtmosphereHash(value)` — returns the unsigned FNV-1a hash.
- `homepageAtmosphereRandom(seed)` — returns the Mulberry32 closure.
- `buildHomepageAtmosphereScene(scene, config, seedKey)` — replaces one scene's tiles and seeded scene variables.
- `homepageAtmosphereNextBoundary(dateObj)` — returns the next local boundary as a `Date`.
- `scheduleHomepageAtmosphere(dateObj)` — clears and replaces the one boundary timer.
- `syncHomepageAtmosphere(options)` — validates or transitions the scene; `options.instant` controls the initial swap.
- `cleanupHomepageAtmosphere()` — clears timers and invalidates an in-flight transition without deleting valid scene DOM.

### Exact synchronization behavior

`syncHomepageAtmosphere({ instant })` must:

1. construct `const now = new Date()` and derive the configuration and seed key;
2. always call `scheduleHomepageAtmosphere(now)`, even when the seed did not change;
3. update `homeAtmosphereState.greetingPeriod`, `data-atmosphere-phase`, `--home-hero-ink`, `--home-hero-skeleton`, `--home-hero-skeleton-peak`, and `--home-atmosphere-base` before checking whether a rebuild is needed;
4. update the visible greeting immediately when the current route is the homepage and the greeting has already been rendered;
5. return without rebuilding when the seed key is unchanged, leaving the scene intact but retaining the new timer and reapplied variables;
6. increment `transitionToken` and clear `transitionTimer` before beginning a replacement;
7. choose scene A for index `0` and scene B for index `1`; use target index `0` when no seed exists, otherwise use `1 - activeIndex`;
8. build the target scene completely before changing opacity, then write the new seed key and phase;
9. use an instant swap when `options.instant`, no scene has been built yet, or reduced motion is active;
10. otherwise, capture the old active index, then in one animation frame add `.is-visible` to the target scene, remove it from the old scene, and immediately set `activeIndex` to the target index;
11. after `900ms`, only when the transition token still matches, clear the captured old scene and clear the transition timer.

If a new synchronization begins during a prior cross-fade, incrementing `transitionToken` must make the old cleanup callback a no-op. Normalize scene visibility before starting the new transition: keep the scene identified by `activeIndex` visible and hide the other.

`homepageAtmosphereNextBoundary(dateObj)` must construct local `Date` candidates at `05:00`, `08:00`, `12:00`, `17:00`, `20:00`, and the next local midnight. Filter to candidates strictly later than `dateObj`, then return the earliest. Do not calculate the delay with UTC strings.

Schedule the timer for `boundary.getTime() - Date.now() + 250`. The `250ms` guard prevents an equality race at the exact boundary. The delay is always under 24 hours and does not need long-timeout chunking.

The next boundary is therefore the earliest of:

- the next phase boundary;
- local midnight.

Also synchronize on `visibilitychange` when the document becomes visible. This handles sleeping devices and throttled background timers.

Add that listener once in the existing event-listener setup. It must return unless `document.visibilityState === "visible"` and `state.route.view === "customers"`.

Call `syncHomepageAtmosphere({ instant: !homeAtmosphereState.seedKey })` from `beginHomepageLoad()` before issuing database requests.

Change `renderHomepageHero()` so it no longer creates its own hour buckets. It must call `greetingForClock({ period: homeAtmosphereState.greetingPeriod })`. This prevents the copy and art from disagreeing at a boundary.

When leaving the homepage, call `cleanupHomepageAtmosphere()` from the existing route transition path:

- clear the scheduled boundary timer;
- clear any pending transition cleanup timer and increment `transitionToken`;
- keep the current scene DOM available for a return during the same phase, but revalidate the seed before reuse.

When returning to the homepage, rebuild only if the date or phase changed.

Do not refetch customers, orders, events, or enquiries when only the atmosphere changes.

### Route and transition edge cases

- If the homepage is left during a cross-fade, keep the scene named by `activeIndex`, hide the other scene, and cancel stale cleanup.
- If the homepage is revisited in the same seed, do not rebuild tiles; only reschedule the timer and reapply the phase variables.
- If it is revisited in a new seed, build the other scene and cross-fade while the normal homepage skeleton is visible.
- If the tab sleeps across several boundaries, build only the currently correct scene on visibility return. Do not replay missed phases.
- If the system clock moves backward, the next sync uses the newly derived seed and reschedules from the new local time.
- If the browser has no `document.visibilityState` event support, the boundary timer and route revisit remain sufficient; do not add polling.

## 10. File-by-file edit checklist

This is the implementation handoff checklist. Complete every item and do not introduce additional files.

### `index.html`

In `#homeStage`, before `#homeLoading`:

1. add `#homeAtmosphere` with `aria-hidden="true"`;
2. add exactly two empty child scenes, `#homeAtmosphereSceneA` and `#homeAtmosphereSceneB`;
3. do not add inline styles, tile nodes, text, or an image fallback;
4. do not move `#homeLoading`, `#homeError`, or `#homeReady`;
5. do not change the markup inside `.home-hero__content`.

### `styles/pages.css`

In the Homepage Stage and Layers section:

1. add the atmosphere container, scene, visibility, instant, and tile rules;
2. add `position: relative; z-index: 1` to `.home-state`;
3. make `.home-state--ready` transparent;
4. keep `.home-state--error` opaque.

In the Homepage Hero section:

1. make `.home-hero` transparent without changing any geometry;
2. change greeting and deadline color to `var(--home-hero-ink, var(--home-black))`;
3. add the exact `900ms` color transition to both copy elements.

In the Homepage Loading Skeleton section:

1. use the transparent-to-black split background on `.home-skel`;
2. make `.home-skel__hero` transparent;
3. set hero skeleton blocks to `var(--home-hero-skeleton, rgba(76,76,76,.18))` and give them the dedicated `home-hero-shimmer` animation;
4. do not change ledger skeleton colors or geometry.

At the end of the homepage section:

1. add the two atmosphere keyframes;
2. extend the existing reduced-motion query to disable scene transitions, scene animation, tile animation, and hero text transitions;
3. add `.home-atmosphere__scene.is-instant { transition: none; }` outside the media query.

Do not use `filter: blur()`, `backdrop-filter`, `mix-blend-mode`, or `transform: scale()` on the text.

### `app.js`

In the element registry:

1. register `homeAtmosphere`, `homeAtmosphereSceneA`, and `homeAtmosphereSceneB` immediately after `homeStage`.

In the homepage state/helper area:

1. add the exact five-phase configuration;
2. add `homeAtmosphereState`;
3. add the phase, seed, hash, PRNG, scene-builder, next-boundary, scheduler, synchronization, and cleanup functions;
4. keep these helpers file-local and use named function declarations;
5. do not touch Supabase or add a dependency alias.

In existing homepage functions:

1. call atmosphere synchronization in `beginHomepageLoad()` before requests begin;
2. change `renderHomepageHero()` to use `homeAtmosphereState.greetingPeriod`;
3. do not alter deadline selection or deadline HTML;
4. do not regenerate the atmosphere in `renderHomepageReady()` or `revealHomepage()`.

In routing and event wiring:

1. call atmosphere cleanup whenever the target route is not `customers`;
2. add one `visibilitychange` listener inside the existing listener setup;
3. do not add an interval, scroll listener, resize listener, or animation-frame loop.

After editing, if `app.js` or `index.html` shifts more than approximately 20 lines, update the affected line references in `docs/MAP-app.md` or `docs/MAP-html-css.md` as required by `docs/CONVENTIONS.md`.

## 11. Implementation pseudocode

The following is structural pseudocode. Preserve surrounding repository quote style and two-space indentation.

```js
function buildHomepageAtmosphereScene(scene, config, seedKey) {
  const random = homepageAtmosphereRandom(homepageAtmosphereHash(seedKey));
  const columns = normalizedAtmosphereWeights(6, 0.75, 0.60, random);
  const rows = normalizedAtmosphereWeights(7, 0.75, 0.55, random);
  const columnOffsets = atmosphereOffsets(columns);
  const rowOffsets = atmosphereOffsets(rows);
  const fragment = document.createDocumentFragment();

  scene.style.background = homepageAtmosphereBackground(config, random);
  setHomepageSceneMotion(scene, random);

  for (let rowIndex = 0; rowIndex < 7; rowIndex++) {
    let startColumn = 0;
    let leftPair = "";

    while (startColumn < 6) {
      const remaining = 6 - startColumn;
      const roll = random();
      const wantedSpan = roll < .28 ? 1 : roll < .82 ? 2 : 3;
      const span = Math.min(wantedSpan, remaining);
      const quiet = rowIndex >= 5 && startColumn < 4;
      const colors = homepageAtmosphereTileColors(config, quiet, leftPair, random);
      const tile = document.createElement("i");

      tile.className = "home-atmosphere__tile" + (quiet ? " home-atmosphere__tile--quiet" : "");
      setHomepageTileProperties(tile, {
        left: columnOffsets[startColumn],
        top: rowOffsets[rowIndex],
        width: columnOffsets[startColumn + span] - columnOffsets[startColumn],
        height: rowOffsets[rowIndex + 1] - rowOffsets[rowIndex],
        colors,
        quiet
      }, random);
      fragment.appendChild(tile);
      leftPair = colors.join("|");
      startColumn += span;
    }
  }

  scene.replaceChildren(fragment);
}
```

`normalizedAtmosphereWeights(count, floor, spread, random)` returns an array totaling `1`. `atmosphereOffsets(weights)` returns `count + 1` cumulative percentage values with the last value forced to exactly `100`. These may be separate named helpers or clearly named local helpers inside the scene builder; do not repeat the normalization logic for rows and columns.

Scene swapping must follow this ownership rule:

```text
Before transition: activeIndex points to the visible old scene.
Transition frame: new scene becomes visible, old scene becomes hidden,
                  activeIndex immediately points to the new scene.
After 900ms:      old scene children are cleared.
```

This rule ensures route cleanup during a cross-fade preserves the new correct scene rather than reviving the old phase.

## 12. Failure guards for the implementing agent

- If the atmosphere is invisible, inspect stacking and opaque hero backgrounds before changing opacity.
- If content below the hero moves, revert geometry changes; the atmosphere must be absolute and must not participate in layout.
- If a white flash appears, confirm synchronization occurs before requests and both hero backgrounds are transparent.
- If thin seams appear, retain the phase base background and the `.35%` tile overlap; do not add blur.
- If the greeting becomes unreadable, correct quiet-zone color assignment. Do not add a panel or text shadow.
- If the visual changes on every refresh, find and remove unseeded `Math.random()` calls.
- If the old phase reappears after navigation, fix active-scene ownership and transition-token cleanup.
- If timers multiply, ensure every scheduler clears the previous timer before assigning a new one.
- If the greeting and palette disagree, remove independent hour logic and use `homeAtmosphereState.greetingPeriod` exclusively.
- If reduced-motion still drifts, verify both scene and tile animation names are set to `none`, not merely paused mid-animation.
- If scrolling or tapping becomes sluggish, confirm there is no per-frame JavaScript and no large blur/filter effect.

## 13. Accessibility and performance

- Keep the visual `aria-hidden` and non-interactive.
- Preserve `#heroGreeting` as the homepage route focus target.
- Never announce phase changes through a live region.
- Preserve all current nav and shortcut touch targets and focus rings.
- Verify deadline text contrast, not just the larger greeting.
- Avoid canvas, filters with large blur radii, continuously changing DOM, and JavaScript animation loops.
- Rebuild tiles only at first display, phase changes, or midnight.
- No decorative tile may affect document flow or homepage height.

## 14. Validation and acceptance criteria

### Functional scenarios

Test with controlled local times immediately before and after every boundary:

- `04:59 → 05:00`
- `07:59 → 08:00`
- `11:59 → 12:00`
- `16:59 → 17:00`
- `19:59 → 20:00`
- `23:59 → 00:00`

Confirm that:

- the phase, palette, greeting, and text color are correct;
- a live page cross-fades without fetching homepage data again;
- midnight produces a new deterministic daily composition;
- returning from a background tab catches up to the correct phase;
- leaving the route prevents stale timers from changing hidden homepage DOM.

### Determinism

- The same date and phase reproduce identical row sizes, column sizes, tile spans, colors, and animation offsets.
- A different local date changes the composition.
- A different phase changes both composition and palette.
- Refreshing the page does not create a random new layout within the same date and phase.

### Visual review

Capture the hero at `320px`, `390px`, and a centered desktop viewport for all five phases. Check:

- no white flash during loading;
- no movement of the shortcut row or page content;
- no uncovered edges during maximum drift;
- moderate motion that remains subordinate to the greeting;
- readable greeting and deadline copy, including long customer/deadline text;
- correct cream navigation controls above every palette;
- no visible text container or scrim;
- a clear family resemblance to the supplied soft rectangular references.

Repeat the review with reduced motion enabled and confirm that everything is static.

### Repository gate

Run the complete validation command from `AGENTS.md`:

```bash
node --check app.js && node --check db.js && node --check util.js && node --check calendar.js && node --check config.js && node --check docs.js && node --check fittings.js && node --check fitting-pdf.js && node --check moodboard.js && node --test tests/pure-modules.test.cjs
```

Then run a local preview and inspect the homepage in an authenticated session:

```bash
python3 -m http.server 5173
```

## 15. Definition of done

The work is complete when the homepage hero shows a deterministic, time-appropriate soft mosaic during both loading and ready states; changes live at phase boundaries and midnight; remains readable and performant across supported widths; becomes static under reduced motion; and passes the repository validation gate without altering any document template, data contract, or non-homepage visual behavior.
