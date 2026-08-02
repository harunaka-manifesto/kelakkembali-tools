# MODULES — ownership & export surface

One responsibility per file. Check the export list here before opening the file; if the symbol you need is listed, you already know it exists and where it comes from.

Every file is an IIFE assigning one `window.KK.<name>` object at the bottom.

| Module | `window.KK` name | Lines | Owns | Never does |
| :--- | :--- | ---: | :--- | :--- |
| `config.js` | `config` | 27 | Supabase URL, anon key, shared email | Hold secrets |
| `util.js` | `util` | 214 | Pure formatting, HEIC decode, icons, stage vocabulary | DOM writes, network |
| `calendar.js` | `cal` | 356 | Pure date arithmetic and schedule generation | DOM, network |
| `docs.js` | `docs` | 353 | Quotation/invoice layout, watermark, PDF export | Touch the database |
| `moodboard.js` | `moodboard` | 724 | Canvas layout solver, mosaic engine, PDF snapshot | Routing |
| `fittings.js` | `fittings` | 696 | Journal UI adapter, camera overlays, compression, Drive archival | Own a route |
| `fitting-pdf.js` | `fittingPdf` | 290 | Pure A4 page geometry for the fitting-log snapshot | DB, Drive, toast, save |
| `db.js` | `db` | 467 | **Sole** Supabase + Edge Function gateway | Render |
| `app.js` | (composition root) | 5402 | Router, state, all controllers, all listeners | — see [MAP-app.md](MAP-app.md) |

---

## util.js — `KK.util` (read whole, 214 lines; tested)

`MONTHS` · `ICONS` · `FITTING_STAGES` · `fittingStage` · `jakartaDateISO` · `formatJakartaLongDate` · `$` · `$$` · `digitsOnly` · `escapeHtml` · `formatRupiah` · `groupDigits` · `reformatPriceField` · `formatLongDate` · `formatShortDate` · `todayISO` · `sanitizeForFilename` · `isHeic` · `convertHeicToJpeg` · `hashString`

Pure. Covered by `tests/pure-modules.test.cjs`. Any change here needs the test suite run.

Use these instead of inlining: money → `formatRupiah`; dates → `formatLongDate` / `formatShortDate` / `todayISO` / `jakartaDateISO`; **all** interpolated user text → `escapeHtml`; filenames → `sanitizeForFilename`.

## calendar.js — `KK.cal` (read whole, 356 lines; tested)

Constants: `STAGES` · `DESIGN_STAGES` · `PRODUCTION_STAGES` · `ANCHOR_FIRST` · `ANCHOR_LAST` · `DROP_ORDER`

Functions: `computeDesign` · `computeProduction` · **`computeSchedule`** · `spanNeededFor` · `gapsFor` · `pinsFrom` · `stageOrder` · `isDesignStage` · `isProductionStage` · `eventTitle` · `renderSchedule` · `toDay` · `fromDay` · `daysBetween` · `plannedWeek`

Pure date math on ISO day numbers, timezone-safe. A tight window drops middle fittings via `DROP_ORDER` rather than crowding them. `app.js` `orderScheduleModel` (3414) is the only caller that matters; `db.replaceOrderEvents` persists the result.

## docs.js — `KK.docs` (read whole, 353 lines)

`DOCS` · `STANDARD_TERMS` · `termsFor` · `termLabel` · `termAmounts` · `computeTotal` · `render`

Receives an order object, fills `#quotation` / `#invoice` in `index.html` (locked spec, lines 1412–1577), snapshots via html2canvas + jsPDF. Never queries. `app.js` `downloadDocument` (4825) supplies data and logs the result.

## fitting-pdf.js — `KK.fittingPdf` (read whole, 290 lines)

Geometry constants: `PAGE_W` `PAGE_H` `MARGIN` `CONTENT_W` `BODY_H` `CAPTION_LINE_H` `CAPTION_GAP` `MIN_IMAGE_H`
Functions: `fitContain` · `captionPageCapacity` · `planPhotoPage` · `buildFilename`

Pure. Given image dimensions and captions it returns a page plan. `app.js` `downloadFittingPdf` (2338) resolves every image, owns busy UI, and saves.

## moodboard.js — `KK.moodboard` (724 lines)

`MAX_IMAGES` · `init` · `cleanup` · `addFiles` · `removeImage` · `randomize` · `setVariation` · `setOrientation` · `toggleOrientation` · `computeGrid` · `photoRegion` · `generatePDF` · `pdfToBase64` · `buildFilename` · getters `stage` `images` `variation` `orientation` `stageWidth` `stageHeight`

Layout solver for 16:9 and 9:16 mosaics; both orientations are exact counterparts (asserted in tests). `app.js` moodboard region (4278–4687) owns the route, gestures, and export.

## fittings.js — `KK.fittings` (696 lines)

`compressImage` · `base64` · `thumbURL` · `imageURL` · `localURLs` · `archivePhoto` · **`waitForSessionBackups`** · `isBackingUp(photoId)` · `hasPendingBackups(sessionId)` · `consumeBackupFailures` · **`attachSession(state)`** · `detachSession` · `addPhoto` · `releaseLocalURL` · `adoptLocalURL` · `showStagePicker` · `endSession` · `renderJournal` · `renderHistoryList` · `bindOverlays` · `openCamera` · `closeCamera` · `closeAll`

Two integration styles:
- A page that owns its own markup calls `attachSession({ …, onChange })` — this is what the fitting-log detail page does.
- The journal route calls `renderJournal` and lets `fittings.js` draw.

`waitForSessionBackups` is the pending-Drive-upload registry. Never mark a session complete without awaiting it.

---

## Adding a module (rare)

1. New file at repo root, IIFE, single `window.KK.<name>` export at the bottom.
2. Add a `<script>` tag in `index.html` at the correct depth (1604–1612): after everything it depends on, before everything that depends on it.
3. Add a row to this file and to `AGENTS.md` §8.
4. Add it to the `node --check` list in `AGENTS.md` §6.

Do not add a module for anything under ~200 lines that belongs to one page — put it in the matching `app.js` region instead.
