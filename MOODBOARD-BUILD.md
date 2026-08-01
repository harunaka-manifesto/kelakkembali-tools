# Moodboard Generator — Build Summary

Status: **UI and browser flow complete; backend deployment still required.**

The moodboard generator lets a stylist select 1–16 images, review the finished
composition on a dedicated canvas page in either orientation, randomize both its
image order and layout, zoom the board full screen, and export it — locally, to
Google Drive, or both.

Routes:

- `#/order/:id/moodboard` — image selection, opened with **Create Moodboard**.
- `#/order/:id/moodboard/preview` — the generated canvas. Figma node `139:1733`.

## Current product flow

1. Select images with **Add images** or any empty cell in the 4×4 upload grid.
   Each file is decoded and retained only as a browser object URL. Blank MIME
   metadata is accepted, and an unsupported HEIC/HEIF image is converted locally
   to JPEG. An image that still cannot be decoded is skipped instead of
   appearing as a broken tile. Source images are never uploaded to Drive.
2. Press **Generate Moodboard**. There is no embedded preview in the upload
   form. The app navigates to `#/order/:id/moodboard/preview` without changing
   or locking the device orientation.
3. The canvas is a centred column up to 390px wide holding the back link, the
   rotate control, the framed board, **Randomize layout**, **Upload to Drive**,
   **Download PDF**, and the footer.
4. The frame is always 9:16; the moodboard inside it is what rotates. Rotate
   switches the document between landscape `1920 × 1080` and portrait
   `1080 × 1920`. Both fill the frame edge to edge — portrait directly,
   landscape laid in sideways with a quarter-turn, read by turning the phone.
   Every session starts landscape. Rotating recalculates geometry only; the
   photo order and layout variation survive it. Randomize changes both the
   photo order and the layout variation in one press.
5. Tapping the board opens a full-screen zoom overlay. Individual photos never
   open on their own.
6. The two exports are independent. Each writes a document/history record; only
   the first successful export for an order sets `moodboard_date` and
   recalculates the consultation follow-up.

Every PDF filename includes a local timestamp down to milliseconds:

`Moodboard-KelakKembali-{DocName}-{YYYY-MM-DD-HHmmss-SSS}.pdf`

## Architecture

### Browser image cache (`moodboard.js`)

Images are represented as `{file, objectURL, id}`. `addFiles()` creates an
object URL, loads it through an `Image` probe, and keeps it only after decoding
succeeds. It probes files even when their MIME type is missing. When native
HEIC/HEIF decoding fails, `heic2any` converts the blob locally and the JPEG is
probed again. Removing an image, leaving the moodboard, or starting a fresh one
revokes the corresponding URLs. There is deliberately no saved draft or edit
flow; remaking a moodboard starts with a fresh upload.

Selection immediately reserves cells with a shimmer and circular progress
indicator. Photos are decoded sequentially so several large phone images do
not trigger simultaneous HEIC conversions or a large memory spike. Each image
fades into its cell as it becomes ready and its progress indicator morphs into
the remove control. The picker and Generate controls remain disabled until the
batch finishes.

### Layout engine (`moodboard.js`)

`computeGrid(count, variation)` produces `{x, y, w, h}` cells for 1–16 images
against the active orientation's photo region. For 2–16 images the engine
enumerates mosaics built from bands of one to four photos: columns of stacked
photos in landscape, rows of side-by-side photos in portrait. It solves all band
measurements together so the cells share a portrait aspect ratio — favouring
roughly 2:3 — while the complete photo region stays filled. The three variations
select and reorder alternate mosaics. One image is necessarily full-bleed.
Randomize uses a non-identity image shuffle and selects a different variation.

The stage is `1920 × 1080` landscape or `1080 × 1920` portrait, written inline
onto the document element whenever the orientation changes. Both keep the same
branded header, the 32px margin, and the 12px gutter, so the content grid is
`1856 × 960` landscape and `1016 × 1800` portrait.

`tests/pure-modules.test.cjs` exercises the solver directly: for every count
from 1 to 16, in both orientations and all three variations, it asserts the
cells stay in bounds, keep the gutter, never overlap, reach all four edges, and
stay portrait for multi-photo boards.

### Canvas and overlay (`app.js`, `styles/moodboard.css`)

The source stage stays off-screen. Both the framed board and the overlay show a
clone of it, so there is only ever one composition to keep correct. The frame
holds its 9:16 aspect in CSS; the clone is scaled to fill it, taking a
`rotate(90deg)` when the document is landscape, and refitted by a
`ResizeObserver`. The overlay clone is contained rather than turned — it is a
pan/zoom surface, so turning it would invert the gesture axes; a landscape board
fills the overlay as soon as the phone is turned. Pinch, drag, wheel, double-tap or
double-click, and the `+`, `-`, `0` keys all drive the same clamped state. Zoom
caps at 5×, panning is bounded to the scaled board, Escape closes, focus is
trapped and restored, background scrolling is locked, and resize or
orientationchange refits both surfaces.

### PDF and Drive pipeline

`KK.moodboard.generatePDF()` waits for fonts and cached images, captures the
stage with html2canvas at 3×, composites the deterministic watermark, and puts
the JPEG onto a page matching the current orientation: `841.89 × 473.56` pt
landscape or `473.56 × 841.89` pt portrait.

`exportMoodboard(kind)` then:

1. builds one timestamped filename;
2. for `download`, calls `pdf.save(filename)` and contacts nothing else;
   for `drive`, calls
   `db.driveSaveMoodboardPdf(filename, base64, customerName, orderTitle)`;
3. reads `db.countMoodboards(orderId)` before logging;
4. writes the document row and the history event with the filename,
   orientation, destination, and — for Drive — the link;
5. records `moodboard_date` and updates the follow-up only when this was the
   first successful export for the order.

Orientation, randomization, and both exports are disabled during a capture. Each
button carries its own busy/success/error label. A missing or revoked Google
credential leaves the session and its photos intact and offers to open the
Google settings route in a new tab.

The `google-drive` Edge Function has one moodboard action:

| Action | Payload | Result |
|---|---|---|
| `save_moodboard_pdf` | `{file_name, pdf_base64, customer_name, order_title}` | Archives the PDF in `Kelak Kembali Moodboards/{customer}/{order}/Moodboard/`, grants viewer access, and returns its Drive link |

The former draft-image upload and cleanup actions have been removed.

## Database additions

The migration at the end of `schema.sql`:

- permits `kind='moodboard'` in `document_log`;
- adds nullable `document_log.drive_link` — a local-only download logs with no
  link, so no further migration is needed;
- makes `document_log.total` nullable for a non-monetary document;
- permits `action='moodboard_generated'` in `order_history`.

## Deployment

1. Re-run `schema.sql` in the Supabase SQL editor.
2. Deploy the Drive function:

   ```bash
   supabase functions deploy google-drive
   ```

3. Add `https://www.googleapis.com/auth/drive.file` to the Google OAuth consent
   scopes, alongside the existing Calendar scope.
4. Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured as
   Supabase secrets.
5. Reconnect Google Calendar once so the stored refresh token receives the new
   Drive permission.

## Verification checklist

- Select supported images and confirm thumbnails remain local and intact.
- Select several large/HEIC photos and confirm preparation progress appears
  before decoding begins and advances after each image.
- Select an unsupported/corrupt image and confirm it is skipped with a message.
- Generate on desktop and on a portrait phone without an orientation prompt.
- Compare the 390px canvas against Figma `139:1733`, and confirm it centres on
  tablet and desktop.
- Rotate and confirm the frame keeps its 9:16 shape, the document inside it
  swaps orientation and still fills the frame with no bars, and the photos,
  their order, and the variation are unchanged.
- Confirm Randomize changes both arrangement and layout.
- Open the overlay and test top-right close, Escape, focus restoration,
  `+`/`-`/`0`, pinch, pan bounds, wheel, drag, double-tap/click, the 5× cap, and
  a viewport resize.
- Confirm **Download PDF** produces the right page dimensions per orientation
  and makes no Drive request.
- Confirm **Upload to Drive** creates or reuses the full folder hierarchy,
  returns a working link, and does not download locally.
- Confirm missing/revoked credentials show recovery guidance without losing the
  selected photos.
- Confirm the first export updates tracking once and later exports add history
  without moving the moodboard date.
- Run `node --test tests/pure-modules.test.cjs`.
