# Add Fitting Photos — Implementation Handoff

Status: decision-complete implementation plan. No feature code has been written yet.

This document records the repository discovery, Figma inspection, product decisions, technical design, database contract, implementation sequence, and acceptance tests for the Add fitting photos page. The implementing agent should still follow `AGENTS.md`, but should not need to repeat product discovery or inspect the broad repository again.

## 1. Figma source

Target review page, exact node:

https://www.figma.com/design/RqeGM5NJD3CTeasfarP9iM/Kelak-Kembali-Tools?node-id=266-3522&t=KlWRU0y3EjPbLoSM-11

MCP parameters:

```text
fileKey: RqeGM5NJD3CTeasfarP9iM
nodeId: 266:3522
```

The originally supplied link points to the parent fitting-log detail design and is useful for checking the transition and shared visual language:

https://www.figma.com/design/RqeGM5NJD3CTeasfarP9iM/Kelak-Kembali-Tools?node-id=229-2847&t=KlWRU0y3EjPbLoSM-11

MCP parameters for that frame:

```text
fileKey: RqeGM5NJD3CTeasfarP9iM
nodeId: 229:2847
```

The Figma MCP `get_design_context` call has already been run for both nodes. The target frame is named `Add fitting photos`. Its key visual behavior is:

- Black ledger background and grid rules shared with fitting-log detail.
- A stage-labelled back control, shown as `Fitting 2` in the example.
- Page heading `Add fitting photos`.
- Cream cards containing black, 4:3 image stages.
- Resting cards have Delete and Add/Edit caption actions.
- An editing card contains an inline caption field and red Cancel / green Save actions.
- A fixed bottom bar contains Add photos and Save changes.
- The Figma frame accidentally contains `Delete fitting logs`; the product owner explicitly said this was forgotten design debris and it must not be implemented.

Do not paste the React/Tailwind reference returned by Figma. Adapt the frame to the existing vanilla HTML, CSS, and `window.KK` architecture, reusing the fitting-detail ledger primitives and existing icons.

## 2. Final product decisions

These decisions were explicitly confirmed and should not be reopened during implementation.

### Entry and navigation

- Add photos remains available for both active and completed fitting logs.
- Tapping Add photos on fitting-log detail opens the native gallery sheet first.
- The native picker allows multiple images and is gallery-first; it does not open the custom camera overlay.
- Cancelling the native picker leaves the user on fitting-log detail. It must not navigate to an empty review page.
- A successful selection navigates to the Add fitting photos review page.
- The review page itself has another Add photos action that opens the same multi-select native picker and appends to the current batch.
- Back navigation warns before discarding any staged photos, caption edits, or deletions. A clean page returns without a warning.
- The review page is also safe to load directly or refresh. It fetches the session and existing photos and starts with no new local selections.

### Which photos appear

- Show all photos already stored in this fitting session, not only the new selection.
- Append newly selected photos after the existing photos.
- Existing photos keep their stored deterministic order.
- New photos use the browser `FileList` order.
- Reordering photos is out of scope.
- Replacing an existing image is out of scope on this page; the existing individual photo editor remains responsible for replacement.

### Captions

- Captions are optional.
- Several caption editors may be open simultaneously.
- Add caption/Edit caption opens an inline textarea inside that card.
- Card-level Save trims the caption and commits it only to the local review state. It does not call the database.
- Card-level Cancel restores the card's last locally saved caption and closes that editor.
- Save changes must not continue while any caption editor remains open.
- If Save changes is tapped with open caption editors, show a toast explaining that captions must be saved first, then scroll and focus the first open textarea.
- There is no new caption character limit.

### Deletion

- Deleting a newly selected, unsaved photo removes it immediately without confirmation.
- Deleting an existing stored photo only stages the deletion.
- A staged existing-photo deletion shows a page-level Undo toast for five seconds.
- Undo restores the most recently deleted existing photo at its original position.
- If restoring would exceed the 20-photo limit, refuse Undo and toast that another photo must be removed first.
- Existing database rows are deleted only by final Save changes.
- Deleting fitting-photo rows never deletes their Google Drive archive files.
- The entire fitting log cannot be deleted from this page.

### Capacity

- The fitting log may contain at most 20 photos total, counting existing visible photos plus staged new photos and excluding staged deletions.
- Add photos is disabled when the proposed visible total is 20.
- If the picker returns more files than available slots, keep the first files that fit and ignore the rest.
- Toast how many files were skipped and explain that fitting logs are limited to 20 photos.
- Legacy logs already containing more than 20 photos remain editable. They cannot add photos until reduced below 20, but caption-only changes must not be blocked merely because the legacy count is above the new limit.

### Image preparation and quality

- Open the review page immediately after selection rather than making the user wait on the detail page.
- Show selected previews while preparation proceeds.
- Prepare files sequentially to avoid decoding many full-resolution mobile photos at once.
- Use the existing HEIC conversion path.
- Standardize all fitting-photo paths on a longest-edge maximum of 2560 pixels and JPEG quality `0.90`.
- This quality applies to journal camera/gallery photos, this new batch page, and individual photo replacements.
- Correct the current `compressImage` calculation so the scale is based on `Math.max(naturalWidth, naturalHeight)`, not width alone.
- If one or more selected files cannot be converted or compressed, remove those failed draft cards automatically and show one aggregate singular/plural toast stating how many photos could not be added.
- Do not call this an upload failure: preparation happens before database or Drive work.

### Saving and Drive backups

- Save changes is a batch action.
- New photos, existing caption changes, and staged existing-photo deletions must be applied atomically to Postgres.
- If the metadata transaction fails, none of its changes may persist. Keep the complete local review state and allow retry.
- After a successful metadata transaction, return to fitting-log detail immediately.
- Google Drive backups for new photos continue in the background after navigation.
- Newly created detail cards show `Backing up to Drive…` through the existing pending-backup mechanism.
- Drive backup failures are reported but do not roll back the durable fitting-photo records.
- Aggregate backup failures with correct singular/plural copy.

## 3. Repository truth already discovered

Read `AGENTS.md` first. Then use the existing repository maps rather than broad searching.

Relevant feature rows in `docs/FEATURES.md`:

- Fitting log detail: section 8.
- Fitting photo editor: section 10.
- Fitting journal and camera: section 11.

Relevant implementation locations before this feature shifts line numbers:

- `app.js` fitting detail region: approximately 2062–2580.
- `app.js` fitting photo editor region: approximately 2581–2890.
- `app.js` element registry: approximately 45–258.
- `app.js` state: approximately 259–349.
- `app.js` router: approximately 789–840.
- `app.js` listener wiring: `bindEvents`, approximately 4960 onward.
- `index.html` fitting detail: approximately 355–399.
- `index.html` fitting photo editor: approximately 404–460.
- `index.html` fitting overlays and bars: approximately 1226–1298.
- `styles/pages.css` fitting detail/editor area: approximately 2653–2946.
- `fittings.js`: shared camera/gallery, compression, local URLs, archival, and pending-backup registry.
- `db.js` fitting session/photo methods: approximately 311–415.
- `schema.sql` existing fitting revision migration: starts around 690; never edit it in place.

Important current behavior:

- `addFittingDetailPhoto()` currently attaches a fitting detail bridge and calls `KK.fittings.addPhoto()`, which opens the custom camera overlay. Replace only the detail-page entry behavior; keep the journal camera workflow.
- `fittings.js` gallery input currently accepts one file and immediately proceeds through confirmation, caption, record creation, and background Drive archival.
- `fittings.js` already owns `localURLs`, pending backup sets, backup failure counts, HEIC conversion, JPEG preparation, Drive archive calls, and `waitForSessionBackups`.
- `app.js` fitting detail already knows how to display local images first, Drive thumbnails second, and `Backing up to Drive…` while `KK.fittings.isBackingUp(photo.id)` is true.
- `db.js` is the only file allowed to touch Supabase or call Edge Functions.
- Existing photo deletes intentionally retain Drive files.

## 4. Authorized file scope

The product owner explicitly approved the expanded scope required for an atomic implementation.

Six implementation files:

1. `app.js`
2. `index.html`
3. `styles/pages.css`
4. `fittings.js`
5. `db.js`
6. `schema.sql`

Five required repository documentation updates:

7. `docs/FEATURES.md`
8. `docs/MAP-app.md`
9. `docs/MAP-html-css.md`
10. `docs/DATABASE.md`
11. `docs/MODULES.md`

This exceeds the usual five-file task budget because a new routed view needs three presentation/composition files, reusable image preparation and backup tracking belong in `fittings.js`, Supabase access must remain isolated in `db.js`, atomicity requires an append-only SQL RPC migration, and repository policy requires all five maps/contracts to remain current.

Do not add a framework, package, build step, test dependency, or new browser module. Do not edit locked document templates, `assets/`, `.agents/`, `.claude/`, `plans/`, or any `PLAN-*.md` file.

## 5. Route and view design

Add this route before the generic fitting-detail match:

```text
#/fittings/:sessionId/photos/add?source=feed|order
```

Suggested route object:

```js
{
  view: "fittingPhotoAdd",
  sessionId: segments[1],
  query
}
```

Suggested view id and controller names, following conventions:

```text
#viewFittingPhotoAdd
showFittingPhotoAdd
renderFittingPhotoAdd
cleanupFittingPhotoAdd
```

Use `.fitadd-*` for new page-specific CSS. Reuse established `.fitdet-*`, `.fitlog-grid-*`, `.cust-nav-*`, and `.fitdet-bar-*` primitives where the semantics and Figma geometry are identical. Do not duplicate an existing component under a new class name merely to make the selector page-specific.

Add the new `<section>` beside fitting detail and fitting photo edit in `index.html`. The page shell should contain:

- Stage-labelled back navigation.
- Ledger heading.
- A list container for existing and new photo cards.
- Empty state when the session contains no photos and no selection.
- Accessible live status for preparation/save counts.
- Page-level Undo toast with an actual Undo button.
- Hidden multi-file input with `accept="image/*"` and `multiple`.
- Fixed Add photos / Save changes bar, safe-area aware through the existing bottom-bar measurement system.

The detail page also needs a hidden multi-file input or a shared input whose context distinguishes detail entry from review-page append. Do not navigate until that detail-page picker returns at least one accepted file.

## 6. Suggested state model

Add a dedicated `state.fittingPhotoAdd` object. The exact property names may follow surrounding style, but it must represent these concepts explicitly:

```js
{
  phase: "idle",              // idle | loading | ready | saving
  loadToken: 0,
  sessionId: null,
  session: null,
  order: null,
  customer: null,
  source: "feed",
  existing: [],               // latest persisted records in deterministic order
  captionPatches: new Map(),  // photoId -> locally saved caption
  deleted: new Map(),         // photoId -> { photo, originalIndex }
  newPhotos: [],              // local draft records described below
  openEditors: new Set(),     // stable card keys with unsaved textarea state
  preparingCount: 0,
  failedPreparationCount: 0,
  saving: false,
  undoPhotoId: null,
  undoTimer: null,
  pickerContext: null
}
```

Each new photo needs a stable client-only key because its database UUID does not exist until final save:

```js
{
  clientKey: "...",
  file: File,
  sourceUrl: "blob:...",      // immediate raw preview, when supported
  preparedBlob: Blob | null,
  preparedUrl: "blob:..." | null,
  status: "queued" | "preparing" | "ready",
  caption: "",
  editorDraft: ""
}
```

Generate client keys without adding a dependency. A monotonically increasing page-local counter combined with the load token is sufficient; a cryptographic UUID is unnecessary because the key never leaves the request except as an RPC response correlation value.

Maintain caption editor draft text separately from locally saved caption text. This is required so card Cancel can truly restore the previous value and final Save changes can detect open editors reliably.

Dirty state is true when any of the following holds:

- At least one new photo exists.
- At least one existing caption differs from its persisted value.
- At least one existing photo is staged for deletion.
- At least one caption editor contains an unsaved draft.

Release every raw or prepared object URL when its draft is removed, preparation replaces the raw URL, the page is discarded, or ownership transfers to `KK.fittings.localURLs`. Never revoke a URL after it has been adopted by the shared map.

## 7. Rendering and interaction details

### Existing-photo cards

- Use `fittingPhotoDisplayURL()` behavior: shared local URL first, Drive thumbnail second.
- Reuse the existing unavailable-photo presentation when neither source exists.
- Render the persisted or locally saved caption under the image when non-empty.
- Resting actions are Delete and Add caption/Edit caption.
- Opening an editor initializes its textarea from the locally saved caption, not necessarily the original database caption.

### New-photo cards

- Render a 4:3 black stage immediately.
- Use `object-fit: contain` so portrait and landscape photos are never cropped.
- Show a visible, accessible preparing state until `preparedBlob` is ready.
- A ready card behaves like an existing card except Delete is immediate and there is no database identity yet.

### Caption editor

- Inline textarea should auto-grow within a reasonable maximum and use `scroll-margin-bottom` so it clears the fixed bar and mobile keyboard.
- Cancel closes only that editor and restores its last local value.
- Save stores the trimmed value in local state and closes only that editor.
- Multiple editors remain independent.

### Bottom bar

- Add photos is disabled during final saving, when preparation is in a state that cannot accept more input, or when no capacity remains.
- Save changes is disabled when the page is genuinely clean or already saving.
- An open caption draft counts as interaction, so Save changes must remain actionable enough to deliver the required toast/focus behavior instead of silently doing nothing.
- If preparation is still running, Save changes must not submit; announce that photos are still being prepared.
- While saving, switch copy to `Saving…`, set `aria-busy`, and disable destructive/card actions.

### Undo toast

Implement the Undo UI inside this page rather than changing the global plain-text toast API. This keeps the change inside `index.html`, `styles/pages.css`, and `app.js` and avoids adding `styles/shared.css` to scope.

- Show the most recently staged existing-photo deletion.
- A newer deletion replaces the Undo target; older deletions remain staged.
- Timeout after five seconds.
- Clear the timer during cleanup and final save.
- Use an accessible live region plus a real button; do not make the entire toast clickable.

## 8. Image preparation design

Add shared constants and a helper in `fittings.js` rather than scattering new numeric settings:

```text
FITTING_IMAGE_MAX_DIMENSION = 2560
FITTING_IMAGE_QUALITY = 0.90
prepareImage(fileOrBlob) -> Promise<Blob>
```

`prepareImage` should:

1. Call the existing HEIC-to-JPEG conversion when needed.
2. Decode the usable blob.
3. Compute `scale = Math.min(1, 2560 / Math.max(naturalWidth, naturalHeight))`.
4. Draw the correctly scaled image to canvas.
5. Produce an `image/jpeg` blob at quality `0.90`.
6. Revoke only the temporary decoder URL it created.
7. Throw existing user-safe preparation errors.

Keep `compressImage`, `usableBlob`, and the existing exports for compatibility; do not rename them. Route all fitting paths through the new helper:

- Existing gallery selection in `fittings.js`.
- Existing camera capture when the captured frame exceeds the target.
- Existing individual replacement in `app.js`.
- New Add fitting photos preparation queue.

Process the new page queue one item at a time. Update `preparingCount` and render between items so the page feels responsive. Aggregate failures until the selection batch finishes, then emit one toast such as:

```text
1 photo couldn't be added.
3 photos couldn't be added.
```

If every selected photo fails and the page was entered from detail, remain on the review page if it has existing photos; otherwise returning to detail is acceptable only if no local edits exist.

## 9. Atomic database API

Append a new titled, idempotent migration at the bottom of `schema.sql` and add its quoted title to the navigation list at the top. Suggested title:

```text
"atomic fitting photo batches"
```

Add a security-invoker RPC with this contract:

```sql
public.save_fitting_photo_batch(
  p_session_id uuid,
  p_caption_updates jsonb,
  p_delete_ids uuid[],
  p_new_photos jsonb
) returns jsonb
```

Input shapes:

```json
{
  "captionUpdates": [
    { "id": "existing-photo-uuid", "caption": "Trimmed or null" }
  ],
  "deleteIds": ["existing-photo-uuid"],
  "newPhotos": [
    { "client_key": "draft-17-1", "caption": "Trimmed or null" }
  ]
}
```

The RPC must perform all of the following in one transaction:

1. Resolve and lock the fitting session row.
2. Fail if the session does not exist or is not visible to the authenticated caller.
3. Validate that every update/delete photo belongs to `p_session_id`.
4. Reject duplicate IDs and IDs present in both updates and deletes.
5. Derive `order_id`, `stage`, and `session_id` for new rows from the locked session; never trust those values from the browser.
6. Enforce the proposed-final capacity for additions.
7. Permit caption-only edits on a legacy over-capacity log when no additions make its count worse.
8. Apply caption updates.
9. Delete staged rows.
10. Reindex retained rows deterministically and append new rows using zero-based `position` values.
11. Insert new records with `drive_file_id` and `drive_link` null.
12. Return all final session photos plus a `client_key` mapping for newly created rows.

Suggested response:

```json
{
  "photos": ["complete fitting_photos rows in final order"],
  "created": [
    {
      "client_key": "draft-17-1",
      "photo": { "id": "generated-uuid", "...": "complete row" }
    }
  ]
}
```

Use the table's existing RLS policy and a security-invoker function. Grant execution only as required for `authenticated`; do not introduce a security-definer bypass. Normalize missing arrays to empty arrays. Raise useful errors for invalid session ownership, invalid payloads, and capacity violations so `db.js` can surface them through the standard `unwrap` behavior.

Add this sole browser gateway in `db.js`:

```js
saveFittingPhotoBatch: async function (sessionId, captionUpdates, deleteIds, newPhotos) {
  // init().rpc(...), unwrap result
}
```

No `.from(...)`, `.rpc(...)`, client creation, or Edge Function invocation may appear outside `db.js`.

## 10. Drive backup handoff

The metadata RPC creates new rows without Drive ids. After it succeeds:

1. Match every returned created row to its draft through `client_key`.
2. Transfer the prepared object URL to `KK.fittings.localURLs` via `adoptLocalURL`.
3. Update `state.fittingDetail.photos` from the RPC's final `photos` response.
4. Update an existing detail bridge if present and invalidate the fitting feed.
5. Navigate to the fitting detail hash, preserving `source`.
6. Start one tracked Drive backup per created record.

Expose a small tracked backup entry point from `KK.fittings`, without renaming existing APIs. It should wrap the existing private `trackBackup` plus `archivePhoto` path and return the tracked promise so `app.js` can patch the corresponding detail record when it settles.

The settlement path must re-render detail when it is currently visible. This is important because the bridge object attached before navigation may differ from the bridge active after navigation; relying only on `activeSessionState === sessionState` can leave a stale `Backing up…` indicator.

On successful upload:

- Replace the in-memory photo row with the returned row containing Drive ids.
- Clear the pending visual state.
- Keep the adopted local URL for fast display during the current session.

On failure:

- Let the existing pending/failure registry record the failure.
- Clear the pending visual state.
- Keep the durable photo record and local URL.
- Aggregate completed backup failures into one toast.
- Do not delete or roll back the photo metadata.

## 11. Save orchestration

`saveFittingPhotoAdd()` should follow this order:

1. Return if already saving.
2. If any caption editor is open, toast, scroll, and focus the first editor; do not call the database.
3. If preparation is pending, announce it and do not call the database.
4. If no changes remain, do nothing or announce `Nothing to save.` consistently with the existing editor.
5. Freeze the current local payload and enter saving state.
6. Build caption updates only for existing captions that differ from persisted values.
7. Build deletion ids from the staged deletion map.
8. Build new-photo metadata from ready drafts only.
9. Call `db.saveFittingPhotoBatch(...)` once.
10. On RPC failure, leave all local state and object URLs intact, clear saving state, and show the returned error.
11. On RPC success, reconcile returned records and transfer URL ownership.
12. Mark the page clean, clear Undo state, invalidate fitting feed state, and return to detail.
13. Start/continue background backups and report their failures without blocking navigation.

Do not upload images to Drive before the atomic metadata save. Doing so would create orphan archive files when the Postgres transaction fails. Drive is deliberately the post-commit archival phase.

## 12. Router and lifecycle integration

Update every route surface listed in `docs/MAP-app.md`:

- Segment parsing before the generic fitting detail match.
- View selection and route loader behavior.
- Element registry.
- Page state.
- `showFittingPhotoAdd` entry.
- Cleanup when leaving the route family.
- Event listeners.
- Bottom-bar measurement and body classes.

Preserve `source=order|feed` exactly as fitting detail and photo editor do. Successful save and clean Back return to:

```text
#/fittings/:sessionId?source=:source
```

The detail page's picker should create/stage the initial draft state before calling `go()` so the new route can render previews immediately. Direct route entry must fetch independently, following the existing pasted-URL invariant used by detail and editor.

Do not let generic fitting-detail cleanup revoke newly staged object URLs during the detail-to-add transition. Object URL ownership must be explicit between detail picker state, add-page state, and `KK.fittings.localURLs`.

## 13. Loading, layout stability, and interaction choreography

The page must feel deliberately responsive on a phone even when it is preparing 20 large images. Loading behavior is part of the feature, not follow-up polish.

### Route loading skeleton

When the add route is opened directly, refreshed, or cannot reuse a fully populated fitting-detail state:

- Render the navigation and title ledger immediately so the route has a stable identity.
- Use the shared route-loading vocabulary rather than a centered spinner on an empty page.
- Render two representative photo-card skeletons inside the real 24px ledger inset.
- Each card skeleton reserves the final 4:3 image stage, caption/action area, borders, grid rules, and inter-card spacer.
- Keep the fixed bottom bar hidden or inert until session capacity and permissions are known; do not briefly show an enabled Add photos button and then disable it.
- Skeleton animation must use the existing shimmer tokens and stop under `prefers-reduced-motion: reduce`.
- Replace the skeleton list in one render after session, customer, order, and existing photos resolve. Do not append the real cards one network response at a time.
- If the route load fails, replace the skeleton with the established fitting error/panel treatment and provide a reliable return to fitting-log detail or the feed. Never leave a permanent skeleton.

When navigation originates from an already loaded detail page:

- Reuse the session/order/customer/photo state immediately where safe.
- Paint the review shell and existing cards on the first frame rather than flashing the generic route loader.
- Still use a load token for any background validation/refetch so stale responses cannot repaint a later route.

### Stable photo-card geometry

- Every photo stage has `aspect-ratio: 4 / 3` before an image source is available.
- Images use `width: 100%`, `height: 100%`, and `object-fit: contain` against a black background.
- Set explicit intrinsic width/height or CSS aspect ratio so image decode never changes card height.
- Raw preview, prepared preview, Drive thumbnail, unavailable state, preparation skeleton, and error state must all occupy the exact same stage box.
- Swapping a raw object URL for a prepared object URL must not remount or resize the card.
- Reserve the action row under every card. Opening a caption editor may expand that card intentionally, but background preparation must never move controls vertically.
- Caption display should reserve no empty paragraph when the caption is blank. The transition between resting and editing modes is user-triggered and may animate height; image loading may not.
- Use `scrollbar-gutter` only if consistent with current browser support; do not add desktop-only compensation that misaligns the 390px ledger.

### Selected-photo preparation states

Each new card has a visible state machine:

```text
queued -> preparing -> ready
                   -> removed after failure
```

- `queued`: render the raw preview when the browser can display it; overlay a quiet `Waiting to prepare…` status.
- `preparing`: keep the preview visible, add a non-blocking scrim or bottom status row, and announce `Preparing photo N of M` in the page live region without producing a toast for every card.
- `ready`: crossfade only the image pixels when swapping to the prepared URL; keep the card, controls, and scroll position fixed.
- Preparation failure: briefly mark the affected stage as failed for accessibility, remove it from the batch, close its editor if open, revoke its URLs, and aggregate it into the final failure toast.
- The queue continues after one failure.
- Do not show percentage progress because canvas decode/compression exposes no reliable byte progress. Use determinate `N of M` copy instead.
- If another picker selection is appended while preparation is running, append its accepted items to the existing queue rather than starting a competing compression loop.

### Image decoding and transition behavior

- Use `img.decode()` when available before swapping from raw to prepared or from placeholder to Drive thumbnail.
- If decode rejects, fall back to the normal image load/error path; do not stall the queue.
- Prepared preview crossfade should be subtle, approximately 120–180ms, using the existing quick motion token where possible.
- Never fade the entire card to opacity zero, because that makes the list appear to jump and temporarily hides its controls.
- Existing Drive images should use lazy loading below the fold, but the first visible image should be eager enough to avoid a blank first card.
- A Drive thumbnail error should resolve to the existing unavailable-photo state inside the reserved stage instead of collapsing the `<img>`.

### Card microinteractions

- Reuse the existing face-over-rail pressed behavior: the face grows into the rail while pressed and returns on release/cancel.
- Apply pressed state for pointer, Space, and Enter consistently with fitting detail.
- Delete of a new draft may animate the card out over the existing quick duration, then remove its occupied space. Under reduced motion, remove it immediately.
- Existing-photo staged deletion uses the same exit animation and then reveals the Undo toast. Undo restores the card at its original index with a short entrance animation and scrolls it into view only when it would otherwise be off-screen.
- Opening a caption editor transitions the card body without moving the page to the top. After render, preserve the card's top visual anchor where possible.
- Card Save and Cancel provide an immediate pressed response. Save then closes the editor and updates the resting caption without a global success toast; the local visual change is sufficient feedback.
- Do not animate every rerender. Only the card that changed state should transition.
- All animations must be interruptible and must not delay state changes, navigation, or database work.

### Native picker feedback

- The tap on Add photos must show its pressed state before the native sheet takes over.
- While the native picker is open, do not set the page to a permanent busy state; browsers do not provide a reliable picker-open lifecycle.
- When focus returns with no files, restore the button normally and make no announcement.
- When files return, add placeholder cards in the same frame that navigation/review rendering begins so the user immediately sees that the selection was accepted.
- Disable duplicate picker activation only while the returned `FileList` is being admitted into state; re-enable it while the sequential preparation queue continues, subject to capacity.

### Caption keyboard UX

- Focus the textarea after its editor is painted, not before, so mobile browsers reliably open the keyboard.
- Use `enterkeyhint="done"` only as a hint; multiline captions must still allow line breaks where the platform does so.
- Auto-grow the textarea without shrinking on every keystroke and cap its visible height before allowing internal scrolling.
- Use `visualViewport`/the existing bottom-bar synchronization so the focused editor and its Save/Cancel controls remain above the keyboard.
- Saving or cancelling a caption returns focus to that card's Add/Edit caption button.
- Final Save changes with open editors scrolls the first editor into the center/nearest visible region, focuses it, and waits for scrolling to settle; it must not fire repeated focus animations for every open editor.

### Final-save feedback

- Save changes enters busy state synchronously on tap to prevent double submission.
- Keep the review content visible during the RPC; do not replace the page with a full-screen spinner.
- Change button copy to `Saving…`, set `aria-busy="true"`, and disable Add photos and all card mutations.
- A compact busy indicator may appear inside the Save changes face, but its dimensions must be reserved so the button label does not shift horizontally.
- Do not optimistically remove existing records from persistent detail state before the RPC succeeds.
- On success, navigate once to detail and announce one concise summary such as `Fitting log updated` or `4 photos added`—not one toast per row.
- On failure, restore every control in place, retain scroll position and local drafts, focus no arbitrary element, and show a retryable error toast. The Save changes button returns to its normal label.

### Background Drive backup feedback

- Detail navigation must not wait for Drive.
- The existing `Backing up to Drive…` row appears inside each newly created card without changing the image-stage dimensions.
- Pending dots/shimmer use the existing animation and honor reduced motion.
- Backup completion removes only the pending row; it must not rerender the full list or reset scroll position.
- Aggregate multiple failures into one toast after the currently known backup set settles. Do not stack 20 failure toasts.
- A failed backup card continues showing its local image for the current browser session and must not be mislabeled as successfully archived.

### Empty, clean, and boundary states

- If the log has no existing photos and the picker selection is empty/failed, show the designed empty panel with Add photos as the primary available action.
- If all new photos are deleted and no existing edits remain, the page becomes clean: Save changes is disabled and Back leaves without a discard warning.
- At exactly 20 visible proposed photos, Add photos is disabled with an explanatory `aria-label` or nearby status, not only a visual opacity change.
- When a staged deletion creates capacity, enable Add photos without moving either bottom-bar button.
- When preparation is active, preserve the bottom bar's dimensions and publish the same `--bottombar-h` value.
- Long caption text wraps inside its card and never creates horizontal scrolling.
- Extremely tall source images remain contained in the 4:3 stage and are never allowed to determine card height.

### Motion tokens and reduced motion

- Use the existing `--motion-quick`, `--motion-enter`, `--ease-standard`, and existing fitting-log entrance/shimmer keyframes where they express the intended behavior.
- Do not introduce a parallel timing system for this page.
- Add a targeted `prefers-reduced-motion: reduce` override for any new `.fitadd-*` transition or keyframe.
- Reduced motion keeps state feedback, busy copy, focus movement, and live announcements; it removes crossfades, slide/height easing, shimmer, and card entrance/exit movement.

## 14. Visual and accessibility acceptance

At 390px wide, compare against Figma node `266:3522`:

- 16px top navigation inset and 24px ledger content inset.
- Stage back label and tactile indicator rail.
- 32px bold page title with 40px line height.
- Black grid rules and spacers matching fitting detail.
- Cream cards with 12px inner image inset and 4:3 black image stage.
- Inline caption field visually attached to the image.
- Red Cancel, green card Save, cream resting actions, and fixed bottom actions.
- Correct safe-area padding and content bottom clearance.
- No full-log delete block.

Accessibility requirements:

- Meaningful button labels include the photo number where repeated actions could be ambiguous.
- Decorative icons use empty alt text or `aria-hidden`.
- Preparation, skipped-file, save, and backup statuses use live regions/toasts without duplicating announcements.
- Keyboard users can open, save, cancel, delete, undo, and submit captions.
- Save changes focuses the first unsaved caption editor.
- Textareas clear the mobile keyboard and fixed bottom bar when focused.
- Pointer and keyboard pressed states follow existing fitting-detail controls.
- Respect the repository's existing reduced-motion behavior.

## 15. Failure and edge-case matrix

The implementation is incomplete until these cases are intentionally handled:

| Scenario | Required result |
| --- | --- |
| Picker cancelled from detail | Stay on detail; no route or dirty state change. |
| Picker cancelled from review | Stay on review; preserve current batch. |
| Selection exceeds free slots | Keep first fitting files; toast skipped count and 20-photo reason. |
| Unsupported/corrupt image | Remove failed draft after attempted preparation; aggregate toast. |
| HEIC conversion fails | Same as other preparation failure; remaining photos continue. |
| Caption editor remains open | Final save blocked; toast and focus first editor. |
| New draft deleted | Remove immediately and revoke its unowned URLs. |
| Existing photo deleted | Stage only; show Undo; no database call. |
| Undo within capacity | Restore original card and position. |
| Undo would exceed 20 | Keep deletion staged and explain why Undo is blocked. |
| Back with local changes | Confirm discard; Cancel stays; confirm releases drafts and returns. |
| Direct/reloaded add route | Fetch existing session photos; no new drafts. |
| Session was deleted remotely | Toast and return to fitting logs. |
| Photo from another session in RPC payload | Entire RPC fails; no metadata changes. |
| Metadata network failure | Entire local draft retained for retry. |
| Metadata success, Drive slow | Return to detail; show pending cards. |
| One Drive upload fails | Durable record/local image remains; aggregate failure toast. |
| Completed fitting log | Same add/edit behavior as active log. |
| Legacy log has more than 20 | Caption/deletion edits allowed; additions disabled until below cap. |
| No actual changes | Save disabled or reports nothing to save; no RPC. |
| Direct route data is loading | Stable shell plus two full-geometry card skeletons; no enabled bottom bar flash. |
| Raw preview becomes prepared preview | Image crossfades inside the same 4:3 box; card and scroll position do not move. |
| Existing Drive thumbnail fails | Reserved stage becomes the unavailable state; no collapsed image or layout jump. |
| Second selection arrives during preparation | Accepted drafts join the one sequential queue; no competing canvas loops. |
| Save RPC is slow | Review stays visible and stable; controls lock once; Save shows reserved busy state. |
| Reduced motion is enabled | No shimmer/crossfade/card movement; state copy and accessibility feedback remain. |

## 16. Validation plan

Run the repository's complete required gate:

```bash
node --check app.js && node --check db.js && node --check util.js && node --check calendar.js && node --check config.js && node --check docs.js && node --check fittings.js && node --check fitting-pdf.js && node --check moodboard.js && node --test tests/pure-modules.test.cjs
```

Use a local static server:

```bash
python3 -m http.server 5173
```

Manual browser coverage:

- 320px narrow viewport and 390px Figma viewport.
- iOS-like safe area and virtual keyboard behavior.
- One photo, several photos, and a full 20-photo log.
- Portrait, landscape, square, transparent PNG, WebP, and HEIC inputs.
- Caption editors open on several cards simultaneously.
- Existing and new deletion behavior.
- Back/discard paths.
- Completed-session mutation.
- Throttled network during metadata save and Drive backup.
- Forced Drive failure.
- Direct URL refresh.
- Slow 3G and disabled-cache runs to check skeleton replacement and thumbnail failures.
- Performance recording with 20 large photos to confirm one-at-a-time preparation and no competing decode spikes.
- Layout-shift observation while raw previews become prepared previews and Drive thumbnails load.
- `prefers-reduced-motion: reduce`, keyboard-only navigation, and screen-reader live announcements.

Database verification should explicitly prove atomicity:

- A valid mixed batch updates captions, deletes rows, inserts rows, and reindexes positions.
- An invalid cross-session update causes the complete transaction to roll back.
- A capacity violation inserts nothing and changes no captions/deletions.
- RLS remains active for the authenticated role.
- The response maps each `client_key` to exactly one created row.

## 17. Documentation completion

After implementation and before handoff:

- Add a dedicated feature row/section to `docs/FEATURES.md` with the new route, view id, controller functions, CSS prefix, database method, and RPC.
- Recalculate all shifted `app.js` functions and regions in `docs/MAP-app.md`.
- Recalculate shifted `index.html` views/overlays and the new `.fitadd-*` section in `docs/MAP-html-css.md`.
- Document the RPC and `db.saveFittingPhotoBatch` in `docs/DATABASE.md`.
- Document new `KK.fittings` exports and the 2560px/0.90 shared preparation contract in `docs/MODULES.md`.
- Add the quoted migration title to the top navigation list in `schema.sql`.

Do not declare the feature complete while these maps contain stale line numbers.

## 18. Explicit non-goals

- No photo reordering.
- No image replacement from this page.
- No full-screen photo viewer changes.
- No PDF layout changes.
- No fitting-log deletion from this page.
- No synchronous wait for Drive backups before returning to detail.
- No camera-first behavior from fitting detail or this review page.
- No changes to the existing fitting journal's broader session workflow.
- No deletion of Google Drive files.
- No new dependencies, modules, build tools, or framework code.
