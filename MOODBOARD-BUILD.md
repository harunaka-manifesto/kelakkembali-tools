# Moodboard Generator — Build Summary

Status: **UI complete, backend not yet deployed.**

The moodboard generator lets stylists upload 1-16 images, arrange them in aesthetic 16:9 grids across 3 layout variations, preview live, generate a watermarked PDF, upload to Google Drive, and log everything in Supabase.

Route: `#/order/:id/moodboard`, accessed via the **Create Moodboard** button on the order detail page.

## What was built

### New files

| File | Purpose |
|---|---|
| `moodboard.js` | IIFE module (`KK.moodboard`) — algorithmic grid layout engine, image management, off-screen stage rendering, watermark compositing, PDF generation |
| `supabase/functions/google-drive/index.ts` | Edge function for Google Drive uploads — mirrors the `google-calendar` auth pattern (reads refresh token from `google_credentials`, mints fresh access token per invocation) |

### Modified files

| File | What changed |
|---|---|
| `index.html` | Added `#viewMoodboard` section (dropzone, preview, controls, generate button) + off-screen `.mb` stage template (1920x1080, header with logo + customer name, grid area) |
| `styles.css` | Added Part 4: Moodboard generator CSS — dropzone, thumbnails (72px squares, hover-reveal remove button), preview (16:9 via `padding-bottom: 56.25%`), off-screen document styles, drive link in history |
| `app.js` | Added `#/order/:id/moodboard` route, `showMoodboard()` handler, `setupMoodboardListeners()` (dropzone click/drag-drop, file input, thumbnail remove, variation toggle, randomize, generate), `refreshMoodboardPreview()` (clones off-screen stage at scale into preview container), `doGenerateMoodboard()` (PDF + Drive upload + logging + nudge compute + cleanup), `'moodboard_generated'` in `historyLabel()`, Drive link rendering in history |
| `db.js` | Added `callDrive()`, `driveUploadDraftImages()`, `driveSaveMoodboardPdf()`, `driveCleanupDraft()`, `logMoodboard()`. Modified `listDocumentLog()` to select `drive_link` with graceful fallback (catches "column does not exist" error and retries without `drive_link`) |
| `schema.sql` | Added migration block: widens `document_log.kind` constraint to include `'moodboard'`, adds `drive_link text` column, makes `total` nullable, widens `order_history.action` constraint to include `'moodboard_generated'` |

## Architecture

### Grid layout engine (`moodboard.js`)

The engine is **algorithmic**, not template-based. `computeGrid(count, variation)` returns an array of `{x, y, w, h}` cell positions for any image count 1-16.

**Variation A (Balanced):** Finds the optimal cols/rows combination by minimizing aspect-ratio deviation from 16:9. Last row centers if it has fewer cells than the rows above.

**Variation B (Highlight 1):** Hero image takes ~45% width on the LEFT, full height. Remaining images fill a grid on the right side.

**Variation C (Highlight 2):** Same as B but hero on the RIGHT.

Edge cases: count=1 is full-bleed, count=2 is two equal columns.

Constants: `GRID_W=1856`, `GRID_H=960`, `GAP=12px`, `CONTENT_TOP=88px` (below header).

### Rendering pipeline

1. Images managed as `{file, objectURL, id}` array in `moodboard.js`
2. `renderPreview()` populates the off-screen `.mb-grid` with absolutely-positioned `.mb-cell` divs containing `<img>` tags with `object-fit: cover`
3. `refreshMoodboardPreview()` in app.js clones `#moodboardStage` and scales it (via CSS transform) into the `#mbPreviewInner` container
4. On generate: `html2canvas` at scale 3 captures the stage, watermark composited on top (same seeded-PRNG pattern as docs.js), placed into `jsPDF` landscape page as JPEG 0.95

### Google Drive integration (`supabase/functions/google-drive/index.ts`)

Three actions:

| Action | What it does |
|---|---|
| `upload_draft_images` | Creates temp folder `Moodboard Drafts/{customer}_{orderId}/`, uploads images |
| `save_moodboard_pdf` | Writes PDF to `Kelak Kembali Moodboards/` archive folder, sets viewer permissions, returns `{drive_link, file_name}` |
| `cleanup_draft` | Deletes the temp draft folder |

Auth: reads `refresh_token` from `google_credentials` singleton table (same pattern as `google-calendar`), mints fresh access token per invocation. Uses multipart upload to Drive API.

PDF filename: `Moodboard-KelakKembali-{DocName}-{YYYY-MM-DD}.pdf`

### Generate flow (`doGenerateMoodboard()` in app.js)

1. Generate PDF via `KK.moodboard.generatePDF()`
2. Convert to base64, upload to Drive via `db.driveSaveMoodboardPdf()`
3. Save PDF locally via `pdf.save()`
4. Log to `document_log` (kind='moodboard', drive_link)
5. Log to `order_history` (action='moodboard_generated')
6. Update `customer.moodboard_date` to today
7. Compute follow-up nudge, sync if applicable
8. Clean up draft folder on Drive
9. Navigate back to order detail page

## Bug found and fixed during testing

**Problem:** `gridEl` in `moodboard.js` was initialized via `$('#mbGrid')`, which resolves to `document.querySelector('#mbGrid')`. After `refreshMoodboardPreview()` clones the stage into the preview container, there are TWO elements with `id="mbGrid"` in the DOM — the clone comes first in DOM order. On subsequent `init()` calls, `$('#mbGrid')` returned the clone. When `refreshMoodboardPreview()` then destroyed and recreated the clone, `gridEl` pointed to a detached element, and all subsequent `renderPreview()` calls silently did nothing.

**Fix:** Changed `init()` to scope the selectors through the stage element:
```javascript
stageEl = document.querySelector('.stage #moodboardStage');
gridEl = stageEl ? stageEl.querySelector('#mbGrid') : null;
headerNameEl = stageEl ? stageEl.querySelector('#mbHeaderName') : null;
```

This ensures `gridEl` always references the original element in the off-screen `.stage` div, never a clone.

## What still needs to be done

### Must do (backend deployment)

1. **Run the schema migration on Supabase.** Open SQL Editor, paste and run the migration block at the end of `schema.sql` (the `alter table` statements for `document_log` and `order_history`). Until this runs, `listDocumentLog` falls back silently but logs a console error on each order page load.

2. **Deploy the google-drive edge function:**
   ```bash
   supabase functions deploy google-drive
   ```

3. **Add `drive.file` scope to Google OAuth.** In the Google Cloud Console, add `https://www.googleapis.com/auth/drive.file` to the OAuth consent screen's scopes. This is in addition to the existing `calendar.events` scope.

4. **Set the Google secrets for Drive** (if not already set for Calendar):
   ```bash
   supabase secrets set GOOGLE_CLIENT_ID=… GOOGLE_CLIENT_SECRET=…
   ```

### Should verify after deployment

- Full generate flow with real images (upload, PDF, Drive upload, logging)
- Drive folder creation and permissions
- `drive_link` column populates in `document_log` after migration
- History section shows moodboard entries with clickable Drive links
- Follow-up nudge computation after moodboard generation
- `moodboard_date` updates on customer record

### Known issues

- **Console error on order page load:** `column document_log.drive_link does not exist` — this is expected until the schema migration runs. The fallback in `listDocumentLog` catches it and retries without `drive_link`. The error appears in the console but does not break functionality.
- **Scroll behavior in the browser pane:** The Browser pane's native scroll action times out on this page. Use `javascript_tool` with `window.scrollBy()` or `element.scrollIntoView()` as workarounds when testing.

## File reference

```
moodboard.js          — KK.moodboard IIFE module
  init(opts)           — sets up DOM refs, resets state
  addFiles(files)      — pushes images, renders preview + dropzone
  removeImage(i)       — removes by index, revokes objectURL
  shuffleImages()      — Fisher-Yates on display order
  setVariation(v)      — 'A'|'B'|'C', re-renders grid
  generatePDF()        — html2canvas + watermark + jsPDF → returns jsPDF doc
  pdfToBase64(pdf)     — converts to base64 for Drive upload
  buildFilename()      — returns formatted PDF filename
  .images              — current image array (read-only property)
  .variation           — current variation letter
  .draftFolderId       — Drive folder ID for cleanup
  .MAX_IMAGES          — 16

app.js additions:
  showMoodboard(id)    — route handler, loads order/customer, calls init
  setupMoodboardListeners() — wires all UI event handlers
  refreshMoodboardPreview() — clones stage into preview at scale
  doGenerateMoodboard() — full generate + upload + log flow

db.js additions:
  callDrive(action, body)      — invokes google-drive edge function
  driveUploadDraftImages(...)  — uploads images to temp Drive folder
  driveSaveMoodboardPdf(...)   — uploads PDF to archive folder
  driveCleanupDraft(folderId)  — deletes temp folder
  logMoodboard(orderId, link)  — inserts document_log row
```
