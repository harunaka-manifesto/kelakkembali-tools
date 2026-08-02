# Fitting Log Session Detail — Implementation Plan

## 1. Goal and agreed behavior

Build the fitting-log detail experience represented by Figma node `229:2847`. A user reaches it by tapping one fitting-log feed item. The page represents exactly one `fitting_sessions` record, even when an order has several sessions with the same stage.

The page must:

- show the session's ordered photos and captions;
- let the user open a photo in an in-app viewer;
- share an individual image file and its caption;
- open a dedicated editor for caption changes, photo replacement, and deletion;
- let active sessions add photos or be marked complete;
- download a client-ready PDF snapshot of the session;
- restore the fitting-log feed exactly when the user returns during the same browser-history visit.

Primary acceptance target is Android Chrome. The feature is online-only. On wider screens, it retains the application's centered 390px canvas instead of expanding into a grid.

This is a new detail/editor experience, not a restyle of the existing fitting journal. Existing capture, compression, Drive upload, and fitting data primitives should be reused behind the new UI.

## 2. Scope boundaries

### In scope

- Detail and photo-editor routes that work after reload or from a pasted URL.
- A clickable, keyboard-accessible fitting-log feed card.
- Session-level loading, empty, unavailable-image, pending-backup, and failure states.
- A temporary photo editor designed from the current application style guide.
- A temporary client-ready A4 PDF template.
- Reliable retrieval of app-created Drive photo bytes for sharing and PDF generation.
- Browser-history-only restoration of feed search, filters, loaded pages, and scroll.

### Out of scope

- Combining multiple sessions, stages, or a whole order into one detail page.
- Manual photo reordering; stored `position`, then `created_at`, remains authoritative.
- Offline caching, queued mutations, or offline PDF generation.
- Deleting or moving superseded Google Drive files.
- Uploading, logging, previewing, or sharing the session PDF through Drive.
- Final visual designs for the PDF or dedicated editor; both are deliberately replaceable temporary implementations.
- Database schema or RLS changes.

## 3. Routes and navigation state

### Routes

Extend hash parsing with these routes before the general `#/fittings` feed match:

```text
#/fittings/:sessionId
#/fittings/:sessionId/photo/:photoId/edit
```

Use route objects shaped as:

```js
{ view: "fittingLogDetail", sessionId, query }
{ view: "fittingPhotoEdit", sessionId, photoId, query }
```

Both routes must independently fetch and validate their records. The editor must verify that the selected photo belongs to the route's session.

### Feed entry

- Convert each feed record into a semantic anchor linking to `#/fittings/{sessionId}`.
- Preserve the existing card geometry, stage colors, thumbnail treatment, rails, pressed feedback, and accessible focus styling.
- Keep the complete card as one target; do not add nested interactive elements.
- Before navigation, record the feed's current scroll position and mark the feed state as eligible for restoration.

### Exact return restoration

The existing fitting feed clears its state whenever its route is left. Change this lifecycle only for movement inside the fitting-log route family:

```text
feed -> detail -> editor -> detail -> feed
```

During this traversal, retain:

- search text;
- selected stage filters;
- customer seed/origin metadata;
- loaded records and pagination cursor;
- load-more state;
- rendered feed DOM/state token;
- feed scroll position.

When Back returns to the feed, skip the first-page request, render the retained state if needed, and restore scroll after layout has settled. Leaving the fitting-log route family clears the retained snapshot normally. A full reload also clears it and rebuilds from URL inputs at the top.

When a detail URL is loaded directly, its Back control points to `#/fittings`. When entered from a feed, Back returns through browser history so the retained snapshot is restored.

### Invalid routes and request failures

- Missing or inaccessible session: return to `#/fittings` and show a toast.
- Missing photo or a photo belonging to another session: return to the parent detail and show a toast.
- Do not leave a broken detail/editor shell visible after these failures.
- Prevent stale async responses from rendering after a newer navigation, using the existing navigation token pattern.

## 4. Detail page design and behavior

### Page structure

Create a separate static view shell in `index.html` and route-specific styling in `styles/pages.css`. Follow the Figma frame and the existing fitting-feed ledger vocabulary:

1. Fixed navigation row:
   - left: back arrow and `Fitting logs` label;
   - right: Download PDF icon button;
   - cream button faces, gray rails, existing pressed behavior.
2. Session identity:
   - large title: existing derived order label;
   - stage badge: normalized feed label and color;
   - customer name;
   - session start date formatted as a long date in `Asia/Jakarta`.
3. Photo-card ledger.
4. Existing `Made with love for Ichaku` footer.
5. Active-session fixed action bar.

Continue using the feed vocabulary:

- `Body measurements` displays as `Sizing`;
- `Final fitting` displays as `Fitting 3`;
- stage colors remain blue, green, pink, and orange respectively.

### Photo cards

- Sort by numeric `position`, then `created_at`, then ID for deterministic ties.
- Render the complete image at its natural aspect ratio and full card width. Do not crop or force the Figma placeholder's 4:3 ratio.
- Keep the image background black while loading.
- If a caption is empty, omit the caption region entirely.
- Preserve line breaks and do not impose a new caption-length limit.
- Place an equal-width Edit and Share action row under each card.
- Use/recreate permanent local SVG assets for Edit, Share, and Download; never depend on expiring Figma MCP URLs.

### Image states

Each photo has one of these display states:

- `ready-local`: a new/replaced image is available from the in-memory object URL;
- `backing-up`: local image is visible while its Drive upload promise is pending;
- `ready-drive`: a Drive-backed image is available;
- `unavailable`: the record exists but neither a usable local image nor Drive source exists.

An unavailable card keeps its caption and Edit/Delete access, replaces the image with a designed unavailable-photo panel, and disables Share with an explanatory accessible label. It remains counted as part of the session. PDF generation treats it as a hard failure.

### Empty state

Keep the complete session header visible. In the photo ledger, explain that the session has no photos.

- Active session: retain End session and Add photo actions.
- Completed session: no fixed action bar.
- Disable PDF download when the session has no photos.

### Active-session action bar

Show a fixed, safe-area-aware bottom bar only when `session.status === "active"`:

- left half: gray secondary `End session` button;
- right half: orange primary `Add photo` button using `--home-orange` and the existing tactile rail/pressed style.

The two buttons are equal width. Publish the bar height through the existing bottom-bar CSS variable so content, toasts, and focus targets clear it.

`End session` requires confirmation, updates status to `completed`, records `completed_at`, removes the fixed bar, and leaves the user on the detail page.

`Add photo` launches the existing camera/gallery, confirmation, and caption flow. It retains the current behavior of creating the app record and returning immediately while Drive backup continues in the background. On completion, update the card from `backing-up` to `ready-drive`; on failure, keep the local image for the current page lifetime, show an error toast/status, and expose the normal repair path through Edit.

### Photo viewer

Create an accessible full-screen modal for one selected photo:

- full image using contain behavior;
- caption when present;
- visible close control;
- Escape closes on keyboard;
- focus is trapped and returned to the originating photo button;
- no swipe, next/previous controls, or gallery browsing.

## 5. Dedicated photo editor

### Route and temporary layout

The editor lives at `#/fittings/:sessionId/photo/:photoId/edit`. Build a temporary design using the current black-ledger/cream-card style so its structure can later be replaced without changing route or persistence behavior.

Include:

- Back control to the session detail;
- current or staged replacement image preview;
- multiline caption field;
- Replace photo control, using the existing camera/gallery preparation path;
- explicit fixed `Save changes` primary action;
- separate destructive `Delete photo` action near the bottom of the content.

### Dirty state and saving

- Caption edits and a staged replacement set the global dirty flag.
- Route changes, browser reload, and Back prompt before discarding unsaved changes.
- Caption-only Save updates the record once, clears dirty state, and returns to detail.
- Save controls show a busy state and prevent duplicate submission.
- Saving errors keep the user in the editor with their staged values intact.

### Transactional replacement

Do not copy the existing replacement behavior that clears Drive columns before backup succeeds.

Replacement sequence:

1. Prepare/compress the selected image using the current fitting-photo limits.
2. Upload it through the existing `save_fitting_photo` Drive action.
3. Only after upload succeeds, update the photo record once with the new caption, `drive_file_id`, and `drive_link`.
4. Update local detail state, clear dirty state, and return to the detail page.

Until step 3 succeeds, the original database record and image remain usable. If Drive upload fails, the old photo is untouched. If database update fails after upload, keep the uploaded result in editor memory for a retry so a second Save does not upload another duplicate during the same editor visit. Superseded Drive files remain archived.

### Deletion

- Require one explicit destructive confirmation.
- State that the photo disappears from the fitting log but its Drive archive remains.
- On success, remove the database record, clear any local object URL, and return to the detail page.
- If it was the final photo, render the agreed empty state and disable PDF download.

## 6. Data and module interfaces

### Browser data layer

Add focused methods to `KK.db`:

```js
listFittingPhotosBySession(sessionId)
getFittingPhoto(photoId)
driveGetFittingPhoto(photoId)
```

`listFittingPhotosBySession` orders by `position`, then `created_at`. `getFittingPhoto` uses the existing fitting-photo projection. `driveGetFittingPhoto` invokes the new Edge Function action described below.

The detail loader performs:

1. `getFittingSession(sessionId)`;
2. order and session-photo requests in parallel;
3. customer request after resolving the order's `customer_id`.

Do not expand `fitting_log_feed` or add schema columns; direct pages can load authoritative records through existing tables.

### Google Drive Edge Function

Add this action to `supabase/functions/google-drive/index.ts`:

```text
get_fitting_photo { photo_id }
  -> { image_base64, mime_type, file_name }
```

Behavior:

- validate `photo_id`;
- look up its `drive_file_id` server-side instead of accepting an arbitrary Drive ID;
- reject missing or unbacked-up records clearly;
- download the app-created Drive file with `alt=media` using the existing credential;
- return the original MIME type and a sanitized filename with base64 bytes;
- preserve existing authentication/CORS/error conventions;
- do not alter Drive permissions or delete files.

Use this action as the reliable byte source for sharing and PDF generation. Cache resolved blobs only for the current page/session lifetime.

### Fitting controller

Refactor reusable fitting-photo behavior without coupling it to a particular view:

- keep compression, HEIC conversion, local object URLs, and Drive archival in `KK.fittings`;
- let Add-photo completion notify the detail controller so its card state updates without a reload;
- track pending Drive promises by session ID;
- expose a `waitForSessionBackups(sessionId)`-style promise used by PDF generation;
- keep editor-specific routing and rendering in the application composition layer.

### PDF module

Add `fitting-pdf.js` as a pure browser module loaded before `db.js`/`app.js`:

```js
KK.fittingPdf.generate({ session, customer, photos, resolveImage })
KK.fittingPdf.buildFilename({ session, customer })
```

`generate` returns a jsPDF instance and does not save, upload, toast, or access the database. `app.js` coordinates pending backups, image resolution, busy UI, error messages, and the final local save.

Update `ARCHITECTURE.md` so the new detail/editor routes, PDF ownership, and Edge action become current architecture rather than relying on this historical plan.

## 7. Individual image sharing

On Share:

1. Resolve the best available image blob: current local object URL first, otherwise `driveGetFittingPhoto(photo.id)`.
2. Construct a sanitized JPEG `File`, using customer, stage, and photo position in its name.
3. Check `navigator.share` and `navigator.canShare({ files: [file] })` where available.
4. Invoke the native share sheet with the actual file and the full caption as text when present.

If file sharing is unsupported, byte preparation fails, or the image is unavailable, show a clear message and stop. Do not fall back to a Drive link, WhatsApp, clipboard copy, or automatic image download. Treat `AbortError` as a normal user cancellation without an error toast.

Disable the pressed Share control while preparing bytes to prevent duplicate native share sheets.

## 8. Temporary client-ready PDF

### Document contract

Generate an A4 portrait document in-browser with jsPDF and existing local brand assets.

Cover page:

- Kelak Kembali logo/signature;
- customer name;
- normalized fitting-stage label;
- fitting start date in Asia/Jakarta;
- cream, black, and orange visual system;
- no order label, status, internal IDs, start/end times, generated timestamp, or Draft label.

Photo pages:

- one photo per page in stored order;
- preserve the full natural aspect ratio using contain sizing;
- never crop;
- caption below the photo only when present;
- page number and `Made with love for Ichaku` footer.

Long captions reduce the maximum photo height until a defined readable minimum image area is reached. If the remaining caption still cannot fit, continue only the overflow text onto an additional branded caption page. Never truncate stored text.

### Generation flow

1. Disable Download and show preparation progress.
2. If the session has pending background backups, wait for them to settle.
3. Resolve every session photo to a local blob/data URL.
4. If any item remains unavailable, abort without saving a partial file and report its one-based photo number(s).
5. Wait for brand assets and image decoding.
6. Generate the complete PDF.
7. Save locally with a sanitized filename:

```text
Customer-Stage-YYYY-MM-DD.pdf
```

8. Restore the Download control and announce success or failure.

PDF generation is allowed for active sessions and produces a normal current snapshot without a Draft label. It is disabled only for zero-photo sessions or while another generation is running.

## 9. Loading, accessibility, and interaction details

- Add detail/editor labels to the shared route loader and use the ledger loader appearance.
- Focus the detail title after navigation and the editor heading after editor load.
- Use semantic headings, lists, articles, buttons, links, and live status regions.
- Ensure every control has at least a 44px touch target.
- Maintain visible focus on cream and black surfaces.
- Trap focus in viewer/camera/confirmation overlays and restore it on close.
- Honor reduced-motion preferences for card entrance, button rails, loaders, and viewer transitions.
- Account for `env(safe-area-inset-bottom)` in active and editor fixed bars.
- Ensure caption keyboard opening does not hide the field or Save action.
- Disable controls during mutations and expose busy state with `aria-busy`/status text, not color alone.
- Keep page content and toasts clear of the fixed bottom bar.

## 10. Tests and acceptance scenarios

### Automated checks

Extend the pure-module test suite for:

- deterministic photo ordering;
- normalized stage labels/colors used by detail and PDF;
- Jakarta session-date and filename date handling;
- PDF filename sanitization, including Unicode and reserved filename characters;
- natural-ratio fit calculations for portrait, landscape, and square images;
- caption layout, minimum image area, and overflow-page decisions;
- zero-photo rejection and all-or-nothing missing-image errors;
- fitting feed state-retention decision logic;
- new DB request shaping where it can be tested without Supabase.

Run:

```bash
node --check app.js db.js util.js calendar.js config.js docs.js fittings.js fitting-pdf.js moodboard.js tests/pure-modules.test.cjs
node --test tests/pure-modules.test.cjs
```

Also type-check or serve-test the modified Edge Function using the repository's available Deno/Supabase tooling.

### Manual functional scenarios

1. Open a middle feed result after searching, filtering, and loading multiple pages; Back restores the same list and scroll position.
2. Reload a direct detail URL; it loads independently and Back defaults to Fitting logs.
3. Open completed and active sessions for every normalized stage.
4. Verify mixed portrait/landscape images display uncropped and in stored order.
5. Verify blank captions remove their text region without removing actions.
6. Open and close the single-photo viewer with touch, close button, and Escape.
7. Edit only a caption, save, and confirm detail/PDF/share use the updated text.
8. Stage a replacement and cancel/leave; the original remains intact.
9. Force replacement upload failure; the original remains intact and the editor retains the draft.
10. Delete a photo, confirm the warning, and verify the Drive copy is not deleted.
11. Add a photo to an active session and observe pending, success, and failed-backup states.
12. End a session from the gray left action; confirm the active bar disappears.
13. Share a photo through Android Chrome and verify the native sheet receives the image file and caption.
14. Test unsupported file sharing and confirm only the explanatory message appears.
15. Generate active and completed PDFs containing mixed orientations, empty captions, multiline captions, and an exceptionally long caption.
16. Start PDF generation while an upload is pending; verify it waits.
17. Force one image retrieval failure; verify no partial PDF downloads and failed indices are reported.
18. Verify zero-photo empty states and disabled PDF behavior for active and completed sessions.
19. Verify invalid session/photo IDs return to the correct safe route with a toast.
20. Check Android Chrome safe areas, soft keyboard behavior, touch targets, fixed bars, and download/share flows; then perform secondary keyboard and responsive checks in desktop Chrome.

## 11. Completion criteria

The feature is complete when:

- every fitting feed record opens its exact session detail;
- feed state restores exactly within the agreed browser-history lifetime;
- detail and editor routes survive direct reloads;
- all photos render in deterministic natural-ratio order with correct caption and failure behavior;
- active sessions can add photos and end from the fixed equal-width gray/orange action bar;
- the dedicated editor safely supports caption, replacement, and deletion workflows;
- Android Chrome shares an actual image file plus caption where supported;
- the temporary PDF downloads locally, contains the complete available session, and never silently omits failed photos;
- accessibility, reduced motion, busy states, and fixed-bar clearance are verified;
- architecture documentation, syntax checks, automated tests, and relevant Edge Function validation pass.
