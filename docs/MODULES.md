# MODULES — ownership & export surface

One responsibility per file. Check the export list here before opening the file; if the symbol you need is listed, you already know it exists and where it comes from.

Every file is an IIFE assigning one `window.KK.<name>` object at the bottom.

| Module | `window.KK` name | Lines | Owns | Never does |
| :--- | :--- | ---: | :--- | :--- |
| `config.js` | `config` | 27 | Supabase URL, anon key, shared email | Hold secrets |
| `util.js` | `util` | 326 | Pure formatting, HEIC decode, icons, stage vocabulary, annotation data | DOM writes, network |
| `calendar.js` | `cal` | 460 | Pure date arithmetic, schedule generation, month-grid math | DOM, network |
| `docs.js` | `docs` | 353 | Quotation/invoice layout, watermark, PDF export | Touch the database |
| `moodboard.js` | `moodboard` | 724 | Canvas layout solver, mosaic engine, PDF snapshot | Routing |
| `fittings.js` | `fittings` | 284 | Image preparation, local URL ownership, Drive archival, stage picker | Own a route, render a page |
| `fitting-pdf.js` | `fittingPdf` | 319 | Pure A4 page geometry and red-mark rendering for the fitting handoff sheet | DB, Drive, toast, save |
| `db.js` | `db` | 556 | **Sole** Supabase + Edge Function gateway | Render |
| `app.js` | (composition root) | 8943 | Router, state, all controllers, all listeners | — see [MAP-app.md](MAP-app.md) |

---

## util.js — `KK.util` (read whole, 326 lines; tested)

`MONTHS` · `ICONS` · `FITTING_STAGES` · `fittingStage` · `jakartaDateISO` · `formatJakartaLongDate` · `$` · `$$` · `digitsOnly` · `escapeHtml` · `formatRupiah` · `groupDigits` · `reformatPriceField` · `formatLongDate` · `formatShortDate` · `todayISO` · `sanitizeForFilename` · `isHeic` · `convertHeicToJpeg` · `hashString` · `mulberry32`

Annotations: `ANNOTATION_VERSION` · `ANNOTATION_MAX_STROKES` · `ANNOTATION_MAX_POINTS` · `ANNOTATION_COLOR` · `ANNOTATION_DEFAULT_WIDTH` · **`normalizeAnnotation`** · `annotationStrokeCount` · **`annotationSvg`**

`normalizeAnnotation` is the one gate a photo's red markup passes through, on the way in from the canvas and on the way out of the database alike: it clamps every coordinate to 0..1, rounds to 4 decimals, drops malformed strokes, enforces the caps, and returns `null` rather than an empty object. `annotationSvg` builds the read-only overlay — its `viewBox` is the natural image size, so it letterboxes exactly the way an `object-fit: contain` `<img>` in the same box does and needs no measurement in JavaScript.

Pure. Covered by `tests/pure-modules.test.cjs`. Any change here needs the test suite run.

Use these instead of inlining: money → `formatRupiah`; dates → `formatLongDate` / `formatShortDate` / `todayISO` / `jakartaDateISO`; **all** interpolated user text → `escapeHtml`; filenames → `sanitizeForFilename`.

## calendar.js — `KK.cal` (read whole, 460 lines; tested)

Constants: `STAGES` · `DESIGN_STAGES` · `PRODUCTION_STAGES` · `ANCHOR_FIRST` · `ANCHOR_LAST` · `DROP_ORDER` · `WEEKDAYS`

Schedule generation: `computeDesign` · `computeProduction` · **`computeSchedule`** · `spanNeededFor` · `gapsFor` · `pinsFrom` · `stageOrder` · `isDesignStage` · `isProductionStage` · `eventTitle` · `renderSchedule`

Date math: `toDay` · `fromDay` · `daysBetween` · `plannedWeek` · `mondayOnOrBefore` · `weekdayIndex` · `addMonths` · `monthRange` · `monthGrid` · `eventSpan` · `assignLanes`

Pure date math on ISO day numbers, timezone-safe. A tight window drops middle fittings via `DROP_ORDER` rather than crowding them. `app.js` `orderScheduleModel` is the schedule generator's main caller; `db.replaceOrderEvents` persists the result.

The month-grid half serves the schedules calendar. Three rules live there rather than in `app.js`:
- `monthGrid` always returns **42 cells**, so paging months cannot move the footer.
- `eventSpan` is where "a production date means its whole Monday–Sunday week" is decided; everything that is not a production stage falls through to a single day, which is why weddings, follow-ups and payments can share one code path.
- `assignLanes` gives every band a lane that all seven of its cells agree on — that agreement is what makes a week render as one continuous bar instead of seven fragments.

## docs.js — `KK.docs` (read whole, 353 lines)

`DOCS` · `STANDARD_TERMS` · `termsFor` · `termLabel` · `termAmounts` · `computeTotal` · `render`

Receives an order object, fills `#quotation` / `#invoice` in `index.html` (locked spec, lines 1412–1577), snapshots via html2canvas + jsPDF. Never queries. `app.js` `downloadDocument` (4825) supplies data and logs the result.

## fitting-pdf.js — `KK.fittingPdf` (read whole, 319 lines)

Geometry constants: `PAGE_W` `PAGE_H` `MARGIN` `CONTENT_W` `HEADER_H` `BODY_TOP` `BODY_H` `CAPTION_LINE_H` `CAPTION_GAP` `MIN_IMAGE_H` `MARK`
Functions: `fitContain` · `captionPageCapacity` · `planPhotoPage` · `annotationSegments` · `buildFilename` · `generate`

Pure. Given image dimensions, captions and annotations it returns a page plan and paints the document. `app.js` `downloadFittingPdf` (4520) resolves every image, owns busy UI, and saves.

**No cover page; one fitting photo is one page.** Six photos make six pages. `annotationSegments` maps normalized strokes onto the box the image actually occupies on the page and is exported so the coordinate mapping is unit-tested without a PDF engine. `fitContain` is also what `app.js` uses to size the annotation canvas, so the browser and the page agree on where a mark belongs.

## moodboard.js — `KK.moodboard` (724 lines)

`MAX_IMAGES` · `init` · `cleanup` · `addFiles` · `removeImage` · `randomize` · `setVariation` · `setOrientation` · `toggleOrientation` · `computeGrid` · `photoRegion` · `generatePDF` · `pdfToBase64` · `buildFilename` · getters `stage` `images` `variation` `orientation` `stageWidth` `stageHeight`

Layout solver for 16:9 and 9:16 mosaics; both orientations are exact counterparts (asserted in tests). `app.js` moodboard region (4278–4687) owns the route, gestures, and export.

## fittings.js — `KK.fittings` (284 lines)

`isHeic` · `usableBlob` · `compressImage` · **`prepareImage`** · `FITTING_IMAGE_MAX_DIMENSION` · `FITTING_IMAGE_QUALITY` · `base64` · `thumbURL` · `imageURL` · `localURLs` · `releaseLocalURL` · `adoptLocalURL` · `archivePhoto` · **`backupPhoto`** · **`waitForSessionBackups`** · `isBackingUp(photoId)` · `hasPendingBackups(sessionId)` · `consumeBackupFailures` · `showStagePicker` · `bindOverlays` · `closeAll`

The camera journal is retired. This module owns no route, draws no page, and has
one overlay left — the stage picker that asks which fitting a new log is for.

**Shared image-preparation contract:** every fitting photo goes through
`prepareImage(fileOrBlob)`, which converts HEIC when needed and returns an
`image/jpeg` blob scaled so its **longest edge is at most
`FITTING_IMAGE_MAX_DIMENSION` (2560)** at **`FITTING_IMAGE_QUALITY` (0.90)**.
`compressImage(file, maxDimension, quality)` stays exported for callers that need
other numbers; it scales on `Math.max(naturalWidth, naturalHeight)`, so a portrait
photo is capped by its height. Do not inline new size or quality constants.

**Archival contract:** Drive holds the original photo and only the original
photo. A red mark is vector data on the row, so nothing about it is uploaded and
no derivative image is ever created — the clean original stays the truth, and the
PDF is the shareable annotated artifact.

`backupPhoto(photoRecord, pendingRecord, context)` is the archival half of the
save path for a page that already owns the durable record: it registers the
upload with the pending-backup set (so `isBackingUp` / `hasPendingBackups` /
`consumeBackupFailures` stay truthful) and returns the tracked promise. `app.js`
`startAddBackups` uses it **after** the atomic metadata save — uploading first
would strand archive files whenever the transaction failed. A Drive failure is
reported once and never rolls back a saved log.

`waitForSessionBackups` is the pending-Drive-upload registry; `downloadFittingPdf`
awaits it so the document and the archive describe the same session.

---

## Adding a module (rare)

1. New file at repo root, IIFE, single `window.KK.<name>` export at the bottom.
2. Add a `<script>` tag in `index.html` at the correct depth (1604–1612): after everything it depends on, before everything that depends on it.
3. Add a row to this file and to `AGENTS.md` §8.
4. Add it to the `node --check` list in `AGENTS.md` §6.

Do not add a module for anything under ~200 lines that belongs to one page — put it in the matching `app.js` region instead.
