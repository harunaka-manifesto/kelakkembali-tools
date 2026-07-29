# Moodboard Generator — Build Summary

Status: **UI and browser flow complete; backend deployment still required.**

The moodboard generator lets a stylist select 1–16 images, review the finished
16:9 composition in a dedicated landscape presentation, randomize both its
image order and layout, download a watermarked PDF, and archive a copy in
Google Drive.

Route: `#/order/:id/moodboard`, opened with **Create Moodboard** on an order.

## Current product flow

1. Select images. Each file is decoded and retained only as a browser object
   URL. An image the browser cannot decode is skipped instead of appearing as a
   broken tile. Source images are never uploaded to Drive.
2. Press **Generate Moodboard**. There is no embedded preview in the upload
   form. Desktop opens the presentation immediately; a portrait phone first
   shows a rotate hint. Where supported, the app requests fullscreen and locks
   the screen to landscape.
3. The presentation fills the viewport and exposes exactly two actions:
   **Randomize** and **Download**. Randomize changes both the photo order and
   the layout variation in one press.
4. Download generates the PDF and triggers the local browser download first.
   Only then is the same PDF uploaded to Google Drive.
5. A successful Drive archive writes the document/history rows, records the
   moodboard date, recomputes the consultation follow-up, and returns to the
   order.

Every PDF filename includes a local timestamp down to milliseconds:

`Moodboard-KelakKembali-{DocName}-{YYYY-MM-DD-HHmmss-SSS}.pdf`

The browser and Drive copy use the exact same filename and bytes.

## Architecture

### Browser image cache (`moodboard.js`)

Images are represented as `{file, objectURL, id}`. `addFiles()` creates an
object URL, loads it through an `Image` probe, and keeps it only after decoding
succeeds. Removing an image, leaving the moodboard, or starting a fresh one
revokes the corresponding URLs. There is deliberately no saved draft or edit
flow; remaking a moodboard starts with a fresh upload.

### Layout engine (`moodboard.js`)

`computeGrid(count, variation)` produces `{x, y, w, h}` cells for 1–16 images.

- A — balanced rows and columns, selected by aspect-ratio fit.
- B — a left-side hero with a supporting grid.
- C — a right-side hero with a supporting grid.

One image is full bleed. Two images receive a dedicated split. Randomize uses
a non-identity image shuffle and always selects a different layout variation.

The document stage is fixed at 1920×1080. Its content grid is 1856×960 with a
12px gap and begins at y=88 below the branded header.

### Presentation (`app.js`, `styles.css`)

The source stage stays off-screen. The presentation clones it, strips IDs, and
scales it with `contain` geometry into a fixed viewport layer. Resize and
orientation changes redraw the clone. Phone detection is limited to coarse
pointer devices with a short screen dimension of at most 820 CSS pixels.

Because mobile Safari does not expose orientation locking, the prompt also
works without the Screen Orientation API: rotate the device, then press
**Continue** to open the presentation.

### PDF and Drive pipeline

`KK.moodboard.generatePDF()` waits for fonts and cached images, captures the
stage with html2canvas at 3×, composites the deterministic watermark, and puts
the JPEG onto a landscape PDF page with the same 16:9 ratio.

`downloadMoodboard()` then:

1. builds one timestamped filename;
2. calls `pdf.save(filename)`;
3. converts that PDF to base64;
4. calls `db.driveSaveMoodboardPdf(filename, base64)`;
5. logs the Drive link and history event;
6. records `moodboard_date` and updates its follow-up.

If Drive fails after the browser download, the presentation stays open and the
message explicitly says the PDF downloaded but its Drive copy failed.

The `google-drive` Edge Function has one action:

| Action | Payload | Result |
|---|---|---|
| `save_moodboard_pdf` | `{file_name, pdf_base64}` | Archives the PDF in `Kelak Kembali Moodboards/`, grants viewer access, and returns its Drive link |

The former draft-image upload and cleanup actions have been removed.

## Database additions

The migration at the end of `schema.sql`:

- permits `kind='moodboard'` in `document_log`;
- adds nullable `document_log.drive_link`;
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
- Select an unsupported/corrupt image and confirm it is skipped with a message.
- Generate on desktop and on portrait/landscape phones.
- Confirm Randomize changes both arrangement and layout.
- Confirm the local PDF download begins before the Drive request.
- Confirm local and Drive filenames match and contain a millisecond timestamp.
- Confirm the Drive history link and moodboard follow-up are recorded.
