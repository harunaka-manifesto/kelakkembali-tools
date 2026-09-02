# The fitting workspace — product contract

**Supersedes** the original *Add fitting photos* handoff. That document described
a batch-review page beside a camera journal and a per-photo editor. Those two are
retired: `#viewFittingPhotoAdd` is now the one place a fitting log is edited, and
this file records the decisions behind it.

For files, line numbers and data contracts, read [FEATURES.md](FEATURES.md) §8–§12
first. This file is the *why*, and it should not need reopening to implement a
change — only to question one.

---

## 1. The product in one sentence

A fitting log is a collection of fitting photos. Each photo can carry a red
visual markup and a written note. The user reviews them in one notebook-like
workspace, saves the log, and exports the same visual instructions as a readable
one-photo-per-page PDF for the tailor.

It is a **visual notebook**, not a camera application.

---

## 2. Decisions that should not be reopened

### Entry and navigation

- The gallery is the only photo input. The app requests no camera permission and
  owns no camera; the native picker already offers *Take Photo*.
- `Add photos` on fitting-log detail opens the native multi-select sheet **first**
  and navigates only once files come back. A cancelled picker changes nothing.
- `Edit log` on detail opens the workspace on what is already saved. A card's
  `Edit` opens it scrolled to that photo (`?focus=<photoId>`).
- The workspace is safe to load directly or refresh: it fetches the session and
  its photos and starts with no local selections.
- Back warns only when there is real unsaved work. A clean page returns silently.
- Starting a log from the order page or the calendar picks a stage, then creates
  the `fitting_sessions` row **before** opening the workspace. Leaving that log
  without a single photo deletes it again. The alternative — a workspace running
  with no session id until the first save — puts a null-session branch in
  capacity, undo, backup and the atomic batch, and still leaves an empty log when
  the batch fails after the create.

### Which photos appear

- Every photo already stored in the session, not only a new selection.
- Existing photos keep their stored order; new ones follow in `FileList` order.
- Reordering is out of scope. So is replacing an image — the per-photo editor
  that offered it is retired, and delete-then-add is the replacement.

### Captions

- Optional, one per photo, edited inline. Several editors may be open at once.
- Card `Save` trims and commits to local state only. Card `Cancel` restores that
  card's last local value.
- `Save fitting log` refuses to run while any editor is open: it toasts, scrolls
  to the first one, and focuses it. Silently discarding a half-typed note is the
  one thing this page must never do.
- No character limit.

### Marks

- **One red pen.** No colours, no shapes, no text, no stickers. The job is to
  circle the seam that has to move.
- An explicit full-screen mode, entered from a card's `Mark` action. Drawing
  inline in a scrolling list puts every stroke in a fight with the page scroll on
  a phone, and the card image is too small to circle anything accurately.
- `Undo` (last stroke), `Clear`, `Cancel` (discard), `Done` (commit locally).
  No redo — a red pen does not need one.
- A tap is a mark: a one-point stroke draws a dot.
- A photo with no image on this device cannot be marked, and says so.

### Deletion

- Deleting an unsaved draft removes it immediately; nothing was ever stored.
- Deleting a stored photo **stages** the deletion and offers a 5s Undo. The row
  survives until Save, and its Drive archive copy survives that too.
- Undo that would exceed 20 photos is refused with the reason.
- The log itself is deletable only from its detail page.

### Capacity

- 20 photos: existing, minus staged deletions, plus staged additions.
- A selection larger than the free slots keeps the files that fit and toasts how
  many were skipped and why.
- A legacy log already above 20 stays fully editable. Captions, marks and
  deletions never make it worse; only additions are refused, in the browser and
  again in the RPC.

### Saving

- One RPC applies caption edits, mark edits, deletions and insertions in one
  transaction. If it fails, nothing persists and every local edit survives for
  the retry.
- An update entry carries **only the keys that changed**, and the RPC reads key
  presence. This is what stops a caption edit from overwriting a mark.
- Drive backups run after the commit and continue in the background after
  navigation. A Drive failure is reported once and never rolls back a saved log.

---

## 3. Annotation: why vector, not a flattened image

The alternative was to bake the strokes into a derivative JPEG. Vector data on
the row wins on four counts:

1. **The original must survive.** Drive is the archive of what the camera saw. A
   derivative either replaces that or doubles it — a second upload to fail, a
   second lifecycle to keep in sync, a second file to orphan on delete. Vector
   data adds no file anywhere.
2. **Marks stay editable.** Editing a raster derivative means re-deriving from
   the original and re-uploading. Editing an array is editing an array.
3. **The PDF already draws vectors.** jsPDF renders strokes at any scale without
   the resampling blur a pre-flattened 2560px raster shows on A4.
4. **Size.** A typical mark is three strokes of sixty points — about 3 KB. A
   whole 20-photo log's marks weigh less than one thumbnail.

The cost is that strokes must render deterministically in two engines. That cost
is paid once, in one function per engine, both fed by the same normalized array.

### The coordinate rule

Points are normalized to the **natural image**, `0..1` on each axis, four
decimals. Stroke width is a fraction of the longest edge. Nothing is ever read
back out of canvas pixels, so a resize, a rotation, a different device pixel
ratio and an A4 page are all just different multipliers.

Two things carry that rule:

- **In the browser**, `layoutFittingMark` sizes the canvas with
  `KK.fittingPdf.fitContain` to the box the photo actually occupies — never to
  the stage around it. A canvas stretched over the whole stage would put every
  mark off by exactly the letterbox bars.
- **Everywhere read-only**, `KK.util.annotationSvg` emits an `<svg>` whose
  `viewBox` is the natural image size. An `<svg>` and an `object-fit: contain`
  `<img>` given the same box letterbox identically, so the overlay lands without
  a single measurement in JavaScript.

`normalizeAnnotation` is the one gate, in both directions. An empty stroke list
stores `null`, so cleared and never-marked are one state.

---

## 4. The PDF is a working document, not an archive

It is forwarded to the tailor to explain every requested revision, so
**readability beats density**:

- **No cover page.** Six photos make six pages, not seven.
- One fitting photo is one page. Never two photos on a page to shorten the file.
- The photo is as large as the page allows, contained at its natural ratio,
  portrait or landscape.
- The red marks appear exactly where they were drawn. A document that printed
  the clean original would be describing a revision nobody can see.
- The note is set at body size. For an extreme note the image gives way first,
  down to `MIN_IMAGE_H`, and only then does the text continue on a plain
  continuation page — never shrunk, never truncated.

---

## 5. Failure and edge-case matrix

The implementation is incomplete until these are intentionally handled.

| Scenario | Required result |
| --- | --- |
| Picker cancelled from detail | Stay on detail; no route or dirty change. |
| Picker cancelled in the workspace | Stay put; preserve the current batch. |
| Selection exceeds free slots | Keep the first files that fit; toast the skipped count and the 20-photo reason. |
| Unsupported or corrupt image | Remove the failed draft after preparation; one aggregate toast. |
| HEIC conversion fails | Same as any preparation failure; the queue continues. |
| Caption editor left open | Save blocked; toast, scroll and focus the first editor. |
| New draft deleted | Removed immediately; its unowned object URLs revoked. |
| Stored photo deleted | Staged only; Undo for 5s; no database call. |
| Undo within capacity | Restore the card at its original position. |
| Undo would exceed 20 | Keep the deletion staged and explain why. |
| Mark on a photo with no image | `Mark` disabled, and its label says why. |
| Mark overlay cancelled | Working strokes discarded; the page stays clean; focus returns to the card. |
| Marks cleared and saved | `annotation` stored as `null`, not an empty object. |
| Phone rotated mid-mark | Canvas re-fits and redraws from the normalized array; nothing is lost. |
| Second finger on the canvas | One stroke, no fork, no page zoom, no scroll. |
| Back with local changes | Confirm discard; Cancel stays. |
| New log abandoned empty | The session row is deleted on the way out. |
| Direct or reloaded workspace URL | Fetch the session and its photos; no drafts. |
| Session deleted remotely | Error panel with a way back, never a permanent skeleton. |
| Photo from another session in the payload | The whole RPC fails; nothing is written. |
| Metadata network failure | Every draft, caption, mark and staged deletion retained for the retry. |
| Metadata success, Drive slow | Return to detail; pending cards show `Backing up to Drive…`. |
| One Drive upload fails | Record and local image remain; one aggregate failure toast. |
| Legacy log above 20 photos | Captions, marks and deletions allowed; additions refused until below the cap. |
| Legacy log with no marks | Renders, edits and prints exactly as it always did. |
| No actual changes | Save disabled, or reports nothing to save; no RPC. |
| Reduced motion | State copy, focus movement and announcements remain; crossfades and shimmer do not. |

---

## 6. Validation

The repository gate, plus the annotation and pagination assertions in
`tests/pure-modules.test.cjs`:

```bash
node --check app.js && node --check db.js && node --check util.js && \
node --check calendar.js && node --check config.js && node --check docs.js && \
node --check fittings.js && node --check fitting-pdf.js && node --check moodboard.js && \
node --test tests/pure-modules.test.cjs
```

```bash
python3 -m http.server 5173
```

Browser coverage, in the order things actually break: annotation coordinates
(320/375/390px, rotation, resize, portrait and landscape, both edges of the
image), then the PDF (page count, mark placement, long captions), then the
workflow (add, mark, caption, delete, undo, save, reopen), then the failure rows
above with a throttled network and a forced Drive failure.

Database verification must prove the rollback: a batch carrying a photo id from
another session leaves captions, marks, deletions and insertions all unapplied.
