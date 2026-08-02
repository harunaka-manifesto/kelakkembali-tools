# Independent One-Per-Stage Fitting Logs

## 1. Goal and Final Product Model

Replace the current schedule-driven session behavior with five canonical fitting stages. Each order has at most one durable fitting log per stage.

| Stored stage | Feed key | Display label | UI color |
|---|---|---|---|
| `Sizing` | `sizing` | Sizing | Blue |
| `Fitting 1` | `fitting-1` | Fitting 1 | Green |
| `Fitting 2` | `fitting-2` | Fitting 2 | Pink |
| `Fitting 3` | `fitting-3` | Fitting 3 | Orange |
| `Final fitting` | `final-fitting` | Final fitting | Black |

A fitting stage has two independent properties:

- An optional generated planned week.
- An optional fitting log containing photos and captions.

The generated week never selects or creates a log automatically.

## 2. Database and Data Migration

### Canonical stage rename

- Replace stored `Body measurements` values with `Sizing` in `order_events`, `fitting_sessions`, and `fitting_photos`.
- Update every stage check constraint to accept `Sizing` and reject new `Body measurements` values.
- Update schedule constants, tests, visible hints, PDF labels, filenames, Drive upload paths, and Google Calendar titles.
- Preserve existing order-event IDs, planned dates, pinned state, date spans, and Google Calendar IDs.
- Set migrated Sizing events' `synced_at` to null so the next calendar sync updates remote event titles without creating duplicate events.

### One log per order and stage

- Before adding uniqueness, normalize historical duplicates by `(order_id, stage)`:
  - Keep the newest session, using `created_at DESC, id DESC`.
  - Reassign older sessions' photos to the keeper.
  - Recalculate photo positions deterministically using session creation time, existing position, photo creation time, and photo ID.
  - Preserve the keeper as completed if any merged session was completed.
  - Delete the redundant session rows.
- Add a unique database constraint/index on `fitting_sessions(order_id, stage)`.
- Change the `fitting_photos.session_id` foreign key to `ON DELETE CASCADE`.
  - Deleting a whole fitting log removes its photo database records.
  - Google Drive archive files remain untouched.
  - Existing legacy photos with `session_id IS NULL` remain untouched.

### Feed read model

- Update `fitting_log_feed` to expose five distinct keys and labels.
- Stop normalizing Final fitting into Fitting 3.
- Map `Final fitting` to `final-fitting` and label it `Final fitting`.
- Continue filtering, searching, and paging through the existing PostgREST view contract.

## 3. Order Detail: Schedules as Fitting Stages

The stage rows discussed in this plan are the cards inside **Order detail -> Schedules**.

### Stage-row model

Always derive five rows from the canonical stage list, not only from generated events.

Each row contains:

- Canonical stage identity.
- Planned week when an `order_events` record exists.
- `Not scheduled` when no generated event exists.
- Existing log ID and status when present.
- Photo count and up to three thumbnails.
- Completed indicator after the initial log has been saved.

Format a stored stage date as a planned Monday-Sunday range. Keep database storage as the existing single `event_date`.

### Row interaction

- Existing log:
  - Render as a real link.
  - Open `#/fittings/:sessionId` with order-origin context.
- Missing log:
  - Render as an enabled button.
  - Start a draft for that exact stage and open capture.
  - Never inspect today's date or choose the nearest scheduled stage.
- Remove false `aria-disabled="true"` attributes and the order-page click cancellation that currently causes no-op rows.
- Keyboard activation with Enter or Space must match pointer behavior.

### Resilient loading

Do not allow one failed request to erase unrelated information:

- If planned events fail, still show all five stages and any successfully loaded logs.
- If logs or photos fail, still show generated planned weeks.
- Give the failed portion an accessible retry state.
- Refresh the stage row after creating, saving, editing, or deleting a log.

## 4. Starting and Saving Logs

### Stage selection

`Log a fitting note` always opens a five-stage picker.

Remove:

- Nearest-date `detectStage` behavior.
- Silent stage creation based on the current week.
- Redirection to an unrelated active session.
- Schedule-derived filtering of available stage choices.

On selection:

- If that order-stage log exists, open its detail.
- If it does not exist, start a new draft for that explicit stage.

### Empty-draft behavior

Do not immediately persist a session when the picker or stage row is tapped.

- Create a virtual draft containing the order and chosen stage.
- Open capture normally.
- Persist the fitting session only when the first photo and caption are confirmed.
- If capture is cancelled or the user leaves before the first entry, discard the virtual draft with no database cleanup required.
- Handle concurrent creation with the database unique constraint:
  - Attempt creation.
  - On unique-violation code `23505`, fetch and use the existing order-stage session.

This prevents empty logs from appearing in the order page or global feed.

### Save log

Rename `Done` to `Save log`.

- Disable Save log until the draft contains at least one persisted photo/caption entry.
- Wait for currently pending photo-backup tasks to settle.
- Mark the initial active draft completed.
- Return to its order.
- A Drive backup failure must not erase the database log; surface the failure clearly and retain the existing retry/error behavior.

After initial save, the log remains durable and editable forever:

- Add more photos.
- Edit or replace photos.
- Edit captions.
- Delete individual photos.
- Share photos.
- Generate the PDF.
- Delete the entire stage log.

Completed status is a saved-state indicator, not an edit lock.

## 5. Fitting Detail and Deletion

### Detail behavior

- Allow Add photo for active and completed logs.
- Keep photo edit, delete, and share actions available regardless of session status.
- If an interrupted active log is opened, show Save log plus Add photo.
- If a completed log is opened, show Add photo without requiring Reopen.
- Update empty-state copy so it no longer claims completed logs cannot be edited.

### Whole-log deletion

Add a destructive `Delete fitting log` action to the detail page.

- Confirm with the stage and order name.
- Explain that the log and its photo records disappear from the app while Drive archive copies remain.
- Delete the fitting session; the database cascade removes associated photo records.
- Release local object URLs and clear detail/editor caches.
- Return to the originating order or feed.
- Remove or refetch the deleted card immediately so parked feed state cannot display a stale entry.

## 6. Navigation and Cache Consistency

Use a trusted route-source marker, not an arbitrary return URL.

- Detail opened from an order returns to `#/order/:orderId`.
- Detail opened from the global feed returns to the retained feed query, filters, pages, and scroll position.
- Propagate the source marker into photo-edit routes and back to detail.
- Whole-log deletion respects the same source.
- Invalid or missing source values fall back to `#/fittings`.

After any fitting mutation:

- Refresh the order-stage row when returning to an order.
- Update or invalidate the parked feed item after photo add, edit, or delete.
- Remove the feed item after whole-log deletion.
- Ensure photo counts, previews, stage labels, and empty states cannot remain stale.

## 7. Five-Button Feed Filter

### Final fitting filter

Add a fifth multi-select filter:

- Label: `Final fitting`
- Key: `final-fitting`
- Resting text and rail color: `var(--home-black)`
- Selected state: black filled face with white text and black rail.
- Fitting-log cards, detail badges, and PDFs retain Final fitting as a distinct black stage rather than adopting Fitting 3 orange.

### Horizontal scrolling

Replace the four-column grid with a single-row horizontal flex strip:

- `overflow-x: auto`
- No wrapping.
- Buttons use `flex: 1 0 108px`, allowing them to fill wider layouts while overflowing compact layouts.
- Preserve a 44px total touch target.
- Hide only the decorative scrollbar where supported; do not disable keyboard or touch scrolling.
- Keep focus rings visible.
- Scroll a keyboard-focused filter into view with nearest alignment.
- Preserve multi-select `aria-pressed` semantics and status announcements.

### Instant pressed feedback

Remove animated filter transitions.

- Pointer-down and keyboard-down feedback must appear immediately.
- Selection changes must be instant.
- Remove opacity, scale, grid-track, color, and rail transition durations from filter buttons.
- Keep the outer 44px button footprint constant in resting, pressed, and selected states.
- Clear transient `.is-pressed` state on pointer up, cancellation, pointer leave, blur, scrolling, and key up.
- Horizontal dragging must scroll the filter strip rather than leave a filter visually stuck.

## 8. Schedule-Row Pressed-State Fix

The order-detail schedule-stage cards have a separate height-shift problem.

- Do not animate or change face padding, grid tracks, borders, or total height during press.
- Keep photo and non-photo variants at their resting dimensions.
- Use an instantaneous background/inset treatment for tactile feedback.
- Confirm that pointer, touch, Enter, and Space produce no `getBoundingClientRect().height` change.
- Maintain visible focus styling independently from the transient pressed state.

## 9. Public Module and Data-Layer Changes

Add or update these interfaces:

- `db.getFittingSessionByStage(orderId, stage)`
- `db.createFittingSession(record)`, with unique-conflict handling in orchestration.
- `db.deleteFittingSession(sessionId)`
- `db.FITTING_STAGE_KEYS`, containing five keys.
- Shared fitting-stage metadata containing five one-to-one stage mappings.
- Draft-session capture support that can call an asynchronous `ensureSession()` before saving the first photo.
- Replace or retire `fittings.detectStage`.
- Replace completion-only `endSession` semantics with Save log behavior.
- Add pure planned-week formatting using timezone-safe ISO date arithmetic.

Keep `db.js` as the only browser-side database access layer and keep scheduling calculations in `calendar.js`.

## 10. Documentation Updates

Update current sources of truth:

- `ARCHITECTURE.md`: one log per order-stage, explicit stage selection, five-stage vocabulary, and order/detail navigation.
- `README.md`: Sizing terminology and planned-week behavior.
- Module comments that still describe repeatable sessions, four feed stages, or completed logs as read-only.
- Visible HTML hints containing `Body measurements`.

Do not rewrite historical `PLAN-*.md` records or the old fitting-log implementation plan; they remain historical artifacts.

Existing Drive folders named `Body measurements` are not automatically renamed because folder IDs are not stored locally. New uploads use `Sizing`. Renaming old external folders would require a separate audited Drive migration.

## 11. Migration and Rollout Order

1. Back up or inspect duplicate session counts by order and stage.
2. Drop and recreate affected constraints around the in-place Sizing migration.
3. Rename stored stages and mark calendar events unsynced.
4. Merge duplicate sessions and reindex photos.
5. Add uniqueness and cascade deletion.
6. Recreate the five-stage feed view.
7. Deploy frontend vocabulary, routing, draft, detail, and filter changes together.
8. Run Google Calendar sync and verify existing Sizing events update rather than duplicate.
9. Verify the feed before removing any temporary compatibility handling.

## 12. Test and Acceptance Matrix

### Pure and database tests

- `Sizing` is the first production-stage anchor.
- No current module emits `Body measurements`.
- Five shared stage mappings have unique keys.
- Final fitting remains distinct from Fitting 3 in labels, colors, filters, cards, detail, and PDF output.
- Feed-stage normalization accepts `final-fitting`.
- Duplicate migration keeps the newest session and every photo.
- Photo positions remain deterministic after merging.
- Duplicate order-stage insertion is rejected.
- Deleting a session cascades photo database records.
- Legacy sessionless photos remain untouched.

### Workflow tests

- Starting a fitting during Sizing week still asks for a stage.
- Selecting Fitting 2 creates Fitting 2 regardless of the planned or current week.
- Tapping an empty schedule-stage row starts that exact stage.
- Cancelling initial capture creates no database log.
- Selecting an existing stage opens its existing detail.
- Save log returns to the order and marks the row completed.
- A completed log accepts later photo additions and edits.
- Whole-log deletion removes order and feed references while retaining Drive archives.
- Order-origin and feed-origin Back behavior remain correct through photo editing.

### Interface tests

Test at 320px, 390px, tablet, and desktop widths:

- Five filters remain one line and scroll horizontally.
- Final fitting has black resting text and black selected treatment.
- Filter response is instantaneous and never visually sticks.
- Keyboard users can reach and reveal all five filters.
- Filter and schedule-row outer heights remain unchanged across press states.
- Schedule rows show planned Monday-Sunday ranges on the order detail page.
- `Not scheduled` stages remain usable for logging.
- Loading, partial failure, empty, retry, and stale-cache states remain readable.

### Repository verification gate

```bash
node --check app.js db.js util.js calendar.js config.js docs.js fittings.js fitting-pdf.js moodboard.js tests/pure-modules.test.cjs
node --test tests/pure-modules.test.cjs
```

## 13. Completion Criteria

The change is complete only when:

- `Body measurements` no longer appears in current application UI, current code vocabulary, or stored stage data.
- Schedules never auto-assign fitting stages.
- Every order-stage has zero or one fitting log.
- All five stage rows are usable regardless of generated dates.
- Existing logs open from the order detail.
- Final fitting is independently filterable and visually black.
- Feed filters scroll horizontally and respond instantly.
- Pressing schedule rows or filters causes no outer-height shift.
- Saved logs remain editable and can be deleted as a whole.
- Feed and order caches reflect mutations without requiring a manual reload.
