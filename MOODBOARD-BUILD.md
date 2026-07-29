# Moodboard Generator — Build Summary

Status: **UI complete, backend not yet deployed.**

The moodboard generator lets stylists upload 1-16 images, arrange them in portrait-aware 16:9 grids with dynamic layout variations, preview in a fullscreen landscape overlay, and download a watermarked PDF. A copy is uploaded to Google Drive automatically after download.

Route: `#/order/:id/moodboard`, accessed via the **Create Moodboard** button on the order detail page.

## User flow

1. Navigate to moodboard from order page
2. Select up to 16 images via dropzone (tap or drag-drop)
3. Tap **Create Moodboard** → enters landscape overlay
4. On mobile portrait: rotate hint shown (auto-dismisses via resize/gyro when landscape detected)
5. On desktop or mobile landscape: fullscreen moodboard view with two buttons — **Randomize** and **Download**
6. **Randomize** shuffles image order AND picks a random valid layout variation
7. **Download** generates PDF → saves locally → uploads copy to Google Drive → logs to Supabase
8. **Back** button returns to image selector (normal orientation)

## What was built

### New files

| File | Purpose |
|---|---|
| `moodboard.js` | IIFE module (`KK.moodboard`) — portrait-aware algorithmic grid layout engine, image management, off-screen stage rendering, watermark compositing, PDF generation |
| `supabase/functions/google-drive/index.ts` | Edge function for Google Drive PDF upload — mirrors the `google-calendar` auth pattern |

### Modified files

| File | What changed |
|---|---|
| `index.html` | Added `#viewMoodboard` section (dropzone, Create Moodboard button) + landscape overlay (`#mbLandscape` with rotate hint, canvas, Randomize/Download/Back controls) + off-screen `.mb` stage template (1920x1080) |
| `styles.css` | Part 4: Moodboard CSS — dropzone, thumbnails, landscape overlay (fixed fullscreen, z-index 1000), rotate hint animation, control bar with safe-area insets, off-screen document styles |
| `app.js` | Added moodboard route, `showMoodboard()`, `setupMoodboardListeners()`, `enterMoodboardView()` (rotate hint on mobile, direct on desktop), `renderMoodboardLandscape()` (clones off-screen stage at scale), `exitMoodboardView()`, `doDownloadMoodboard()` (PDF save → Drive upload → logging → nudge) |
| `db.js` | `callDrive()`, `driveSaveMoodboardPdf(fileName, pdfBase64)`, `logMoodboard()` |
| `schema.sql` | Migration block: widens `document_log.kind` to include `'moodboard'`, adds `drive_link text` column, makes `total` nullable, widens `order_history.action` to include `'moodboard_generated'` |

## Architecture

### Portrait-aware layout engine (`moodboard.js`)

The engine is **algorithmic** and **portrait-aware**. `generateLayouts(count)` returns an array of valid layouts for a given image count, filtering to only those where every cell maintains a portrait-friendly aspect ratio (w/h between 0.30 and 1.15).

**Layout strategies tried for each count:**
- Balanced grids: all column counts 2–8, computing rows as `ceil(count/cols)`
- Hero left/right: hero image at 33%, 40%, or 50% width on left or right side, remaining images in a grid on the opposite side with 1–6 columns

**Deduplication:** layouts producing identical cell positions (rounded) are collapsed.

**Fallback:** if no layout passes the ratio filter, the most-square balanced grid is used.

**Variation counts decrease with image count** — e.g. 3 images may have 8+ valid layouts, while 16 images has only 1 or 2. This is inherent: more images means smaller cells, and the 16:9 grid (1856×960) forces landscape proportions at high column×row counts.

### Randomize behavior

`randomize()` does both at once:
1. Fisher-Yates shuffle on image display order
2. Picks a random layout from the valid set (guaranteed different from current if multiple exist)

### Rendering pipeline

1. Images managed as `{file, objectURL, id}` array in `moodboard.js` — stay in browser memory, no server upload until final PDF
2. `renderPreview()` populates the off-screen `.mb-grid` with positioned `.mb-cell` divs containing `<img>` tags with `object-fit: cover`
3. `renderMoodboardLandscape()` in app.js clones `#moodboardStage`, scales via CSS transform to fit the landscape overlay canvas (centered)
4. On download: `html2canvas` at scale 3 captures the stage → watermark composited → `jsPDF` landscape page as JPEG 0.95

### Landscape overlay

- Fixed fullscreen div (`z-index: 1000`) covering the entire viewport
- On mobile portrait: shows rotate hint (animated phone icon) that auto-dismisses when `window.innerWidth > window.innerHeight`
- On desktop or landscape: shows moodboard canvas with control bar (Back, Randomize, Download)
- Control bar uses `backdrop-filter: blur` and respects `safe-area-inset-bottom` for notched devices
- `document.body.overflow = 'hidden'` prevents scroll-through

### Google Drive integration

Single action: `save_moodboard_pdf { file_name, pdf_base64 }` — writes PDF to `Kelak Kembali Moodboards/` archive folder with viewer permissions.

Filename includes timestamp (e.g. `Moodboard-KelakKembali-BrideName-2026-07-29-143052.pdf`) for uniqueness.

### Download flow (`doDownloadMoodboard()` in app.js)

1. Generate PDF via `KK.moodboard.generatePDF()`
2. Save PDF locally via `pdf.save(mb.buildFilename())`
3. Upload copy to Drive via `db.driveSaveMoodboardPdf(fileName, pdfBase64)` (best-effort — download already happened)
4. Log to `document_log` (kind='moodboard', drive_link)
5. Log to `order_history` (action='moodboard_generated')
6. Update `customer.moodboard_date` to today
7. Compute follow-up nudge, sync if applicable

## What still needs to be done

### Must do (backend deployment)

1. **Run the schema migration on Supabase.** Open SQL Editor, paste and run the migration block at the end of `schema.sql`.

2. **Deploy the google-drive edge function:**
   ```bash
   supabase functions deploy google-drive
   ```

3. **Add `drive.file` scope to Google OAuth.** In Google Cloud Console, add `https://www.googleapis.com/auth/drive.file` to the OAuth consent screen's scopes.

4. **Set the Google secrets** (if not already set for Calendar):
   ```bash
   supabase secrets set GOOGLE_CLIENT_ID=… GOOGLE_CLIENT_SECRET=…
   ```

### Should verify after deployment

- Full download flow with real images (PDF generation, local save, Drive upload, logging)
- Drive folder creation and permissions
- `drive_link` column populates in `document_log` after migration
- History section shows moodboard entries with clickable Drive links
- Follow-up nudge computation after moodboard download
- `moodboard_date` updates on customer record
- Landscape overlay on mobile (rotate hint, auto-dismiss, controls)

### Known issues

- **Console error on order page load:** `column document_log.drive_link does not exist` — expected until schema migration runs. The fallback in `listDocumentLog` catches and retries without `drive_link`.

## File reference

```
moodboard.js          — KK.moodboard IIFE module
  init(opts)           — sets up DOM refs, resets state
  addFiles(files)      — pushes images, renders dropzone, updates controls
  removeImage(i)       — removes by index, revokes objectURL
  randomize()          — Fisher-Yates shuffle + random layout pick
  renderPreview()      — populates off-screen stage grid
  generatePDF()        — html2canvas + watermark + jsPDF → returns jsPDF doc
  pdfToBase64(pdf)     — converts to base64 for Drive upload
  buildFilename()      — timestamped PDF filename
  generateLayouts(n)   — returns array of valid portrait-aware layouts for n images
  .images              — current image array (read-only)
  .layoutCount         — number of valid layouts for current image count
  .MAX_IMAGES          — 16

app.js additions:
  showMoodboard(id)           — route handler, loads order/customer, calls init
  setupMoodboardListeners()   — wires dropzone, create, landscape controls
  enterMoodboardView()        — shows landscape overlay (with rotate hint on mobile)
  exitMoodboardView()         — closes overlay, restores scroll
  renderMoodboardLandscape()  — clones stage into landscape canvas at scale
  handleMbOrientation()       — toggles rotate hint vs. moodboard view
  doDownloadMoodboard()       — PDF save + Drive upload + logging

db.js additions:
  callDrive(action, body)           — invokes google-drive edge function
  driveSaveMoodboardPdf(name, b64)  — uploads PDF to archive folder
  logMoodboard(orderId, link)       — inserts document_log row
```
