# DATABASE — data contract

Read this instead of `schema.sql` (1143 lines) or `db.js` (482 lines). Open the source only when this file lacks the column or query you need.

`db.js` is the **only** module allowed to touch Supabase or an Edge Function.

---

## 1. Tables — column contract

### `customers`
`id` uuid pk · `name` **not null** · `phone` · `instagram` · `source` (`Instagram|TikTok|Referral|Walk-in|Other`) · `wedding_date` · `wedding_date_precision` · `fitting_1_date` · `final_fitting_date` · `notes` · `stage` · `consult_date` · `moodboard_date` · `lost_reason` · `follow_up_date` · `follow_up_label` · `follow_up_google_event_id` · `follow_up_synced_at` · `cancelled_at` · `cancelled_reason` · `completed_at` · `created_at` · `updated_at`

The customer owns the pipeline: stage, consult, moodboard, follow-up, cancellation. `completed_at` is set by hand (swipe right on the homepage) and sends the customer to the foot of the ledger; clearing it undoes that. Nothing is derived from it. Wedding dates live here, not on the order.

### `orders`
`id` uuid pk · `customer_id` fk→customers **cascade** · `title` · `doc_name` · `document_date` · `status` (`Quoted|Confirmed|In production|Delivered` — `Draft` was dropped) · `items` jsonb `[]` · `includes` jsonb `[]` · `payment_scheme` default `standard` · `payment_terms` jsonb `[]` · `first_payment_date` · `second_payment_date` · `final_payment_date` · `fitting_1_date` · `final_fitting_date` · `created_at` · `updated_at`

The order owns money, items, documents, and the schedule anchors.

### `document_log`
`id` · `order_id` fk cascade · `kind` (`quotation|invoice|moodboard`) · `total` bigint (nullable since moodboards) · `term_number` smallint nullable · `term_count` smallint nullable · `drive_link` · `created_at`. Paper trail of numbers, not files. New per-termin invoices store both positive, 1-based termin fields; quotations, moodboards, and legacy invoices leave both null.

A quotation and an invoice are two renderings of one order, not two records — this table is the only durable trace either leaves. Read through `document_feed` for the list pages.

### `order_history`
`id` · `order_id` fk cascade · `action` (`created|updated|payment_logged`) · `detail` jsonb · `created_at`.

### `order_events` — the fitting schedule
`id` · `order_id` fk cascade · `stage` · `event_date` · `end_date` · `google_event_id` (null until synced) · `synced_at` · `created_at` · `updated_at` · **unique (order_id, stage)**.

Stage set: `Design phase`, `Design deadline`, `Sizing`, `Fitting 1`, `Fitting 2`, `Fitting 3`, `Final fitting`.

### `fitting_sessions` — one durable log per stage
`id` · `order_id` fk cascade · `stage` (5 canonical: `Sizing`, `Fitting 1`, `Fitting 2`, `Fitting 3`, `Final fitting`) · `status` (`active|completed`) · `created_at` · `completed_at`.

The row is created when a stage is picked on the order page, not when the first photo lands, so the workspace always has a real session id to work against; a log left without a single photo deletes itself again on the way out. `status` and `completed_at` are legacy: the camera journal's Save log was the only writer, and nothing branches on them — the feed, the detail page and the PDF all read a log the same way whatever it says.

### `fitting_photos`
`id` · `order_id` fk cascade · `session_id` fk→fitting_sessions **nullable** (photos predate sessions) · `stage` · `caption` · **`annotation` jsonb nullable** · `drive_file_id` · `drive_link` · `position` smallint · `created_at`.

`annotation` holds the photo's red markup as vector strokes, never as pixels —
the Drive archive keeps holding the clean original, the marks stay editable, and
the browser and the PDF redraw from one array. Points are normalized to the
natural image, so a stroke survives every resolution, screen width, orientation
and page size it is drawn at:

```json
{ "v": 1, "w": 2560, "h": 1706,
  "strokes": [ { "width": 0.006, "points": [[0.12, 0.33], [0.13, 0.34]] } ] }
```

`width` is a fraction of `max(w, h)`. `null` — the default, and every row that
predates the feature — means no annotation, and an empty stroke list is stored as
`null` too, so cleared and never-marked are one state. `KK.util.normalizeAnnotation`
is the one gate the value passes through in either direction; a check constraint
caps the column at 64 KB.

### RPC `public.save_fitting_photo_batch` (security_invoker)

The fitting workspace's single write. Signature:

```sql
save_fitting_photo_batch(
  p_session_id    uuid,
  p_photo_updates jsonb,   -- [{ id, caption?, annotation? }]
  p_delete_ids    uuid[],
  p_new_photos    jsonb    -- [{ client_key, caption|null, annotation|null }]
) returns jsonb            -- { photos: [row], created: [{ client_key, photo }] }
```

**Key presence is the contract.** In `p_photo_updates`, an absent key leaves its
column alone and a key present with `null` clears it, so one entry per photo can
carry a caption edit, a mark edit, or both — and a caption edit can never
silently overwrite a mark the same batch did not touch. An entry carrying neither
key raises.

One transaction, in this order: lock the session row · reject duplicate ids, an entry that changes nothing, a malformed annotation, an id that is both edited and deleted, a missing/duplicate `client_key`, and any photo belonging to another session · cap additions at **20** photos (`existing - deletions + additions`) · apply caption and annotation updates · delete staged rows · reindex the retained rows to gap-free zero-based `position` · insert the new rows with `order_id`/`stage` taken from the **locked session**, never from the browser, and `drive_file_id`/`drive_link` null.

Edits and deletions are never capacity-checked, so a legacy log already above 20 photos stays editable; only additions are refused. Drive archival happens after this commits — uploading first would strand archive files whenever the transaction failed.

Any violation raises, so `unwrap` surfaces it and nothing is written. Granted to `authenticated` only; `security_invoker` keeps the table's own RLS in force.

The migration that added `annotation` drops the four-argument function and
recreates it, because Postgres refuses to rename a parameter through `create or
replace` and a second overload of the same arity would make every call ambiguous.

### `intake_submissions` — Tally landing table
`id` · `payload` jsonb **verbatim, the record of truth** · `name` · `phone` · `instagram` · `source` (**unconstrained on purpose** — a stranger's answer must never reject the insert) · `wedding_date` · `wedding_date_precision` · `notes` · `status` (`new|accepted|dismissed`) · `customer_id` fk set-null · `created_at` · `reviewed_at`.

### `google_credentials` — singleton
`id` smallint pk `= 1` · `refresh_token` · `calendar_id` default `primary` · `connected_at` · `updated_at`.
**RLS enabled with zero policies** — denies `anon` and `authenticated` outright. Only the service-role Edge Function reads it. Never query it from the browser.

### View `public.document_feed` (security_invoker)
Row shape: `id`, `order_id`, `kind` (`quotation|invoice` only — moodboards are excluded in the view, not by the caller), `total` (nullable), `term_number`, `term_count`, `created_at`, `customer_id`, `customer_name`, `order_title`, `order_status`, `order_label` (same expression as `fitting_log_feed`), `issued_date` (Asia/Jakarta date), `search_text` (lowercased name + label + optional termin identity + `FMDD Mon YYYY`).

Backs `#/quotations` and `#/invoices`. `document_log` stores no customer name, no order label, and no search column, so the join has to happen here — a client-side join could not do server-side `ilike` or cursor paging. Index `document_log_kind_created_idx (kind, created_at desc, id desc)` matches the feed's ordering and cursor tie-break.

**The `total` on a row is the number that was actually sent.** Never recompute it from the order's current items — that is the whole reason the column exists.

> **Applied.** This migration is live on the project (`lgockcjjfkvuihhofyxi`):
> three tables, four functions, the `orders.items` id trigger with every
> existing order backfilled, the feed view, and the select-only grant model.
> `tests/production-ledger.sql` passes against it and rolls its fixtures back.
> `per-termin invoices` is applied as of 2026-09-14. It had been committed but never run against
> the project, so `document_feed` lacked `term_number` / `term_count`, PostgREST rejected the
> feed request, and the quotation and invoice lists showed the connection error.
> `customer done and penjahit removal` is applied too: `customers.completed_at`
> exists and `authenticated` holds DELETE on `penjahit`; payments remain RPC-only.

### `penjahit` — production partners
`id` uuid pk · `name` **not null**, 1–200 characters after trimming · `phone` · `notes` · `archived_at` · `created_at`.

Archiving is not deletion: an archived penjahit keeps every job and every rupiah of history and only stops receiving new work. Deletion is granted to `authenticated` since `customer done and penjahit removal`, but the restrict foreign key on `production_jobs` still refuses it for any penjahit with a job. Both RPCs check `archived_at is null` before accepting an assignment.

### `production_jobs` — one penjahit's work on one order item
`id` uuid pk (**client-generated**) · `penjahit_id` fk→penjahit **restrict** · `order_id` fk→orders **restrict** · `item_id` uuid · `item_name` · `description` (1–500 characters) · `quantity` int > 0 · `unit_price` bigint ≥ 0 · `assigned_date` default today in Asia/Jakarta · `due_date` · `notes` · `status` (`Assigned|In progress|Done|Cancelled`) · `cancellation_charge` bigint · `created_at` · `updated_at` · `create_request` jsonb.

`item_id` points into `orders.items[].id`, which the `production_item_ids` trigger stamps on every insert and update and preserves through renaming and reordering. That trigger also refuses an update that would drop an item a job is linked to, so the item and the job cannot part company. Deleting a linked customer or order is blocked by the `restrict` foreign keys.

One item may carry several jobs — sewing with one penjahit, embroidery with another — so the quantities across jobs are deliberately **not** treated as an inventory limit. Each job is capped at the source item's own quantity, nothing more.

A cancelled job must state its final agreed charge, including zero: the check constraint makes `status = 'Cancelled'` and a non-null `cancellation_charge` one and the same condition. From then on the job's amount is that charge, not quantity × price.

`create_request` is the payload the client sent. A retry with the same `id` compares against it: identical means the first save committed and the existing row is returned, different means the id was reused and the save is refused.

### `production_payments` — money in both directions
`id` uuid pk (**client-generated**) · `job_id` fk→production_jobs **restrict** · `kind` (`payment|refund`) · `amount` bigint ≥ 1 · `payment_date` · `notes` · `created_at` · `voided_at` · `void_reason` · `void_request_id` unique · `request` jsonb · `void_request` jsonb.

Entries are never edited or deleted. A correction voids the original with a stated reason and records a replacement in the same transaction, so the history stays readable and the balance stays right. `record_production_payment` recomputes the job's net after every write and refuses to let refunds exceed payments.

`authenticated` holds **select only** on both production tables; every write goes through a `security definer` RPC, so the validation above cannot be stepped around by a direct PostgREST call.

### RPCs `save_production_jobs` · `update_production_job` · `record_production_payment`
All `security definer`, all refuse an anonymous caller, all retry-safe on the client-generated `id`. `save_production_jobs` takes an array of 1–100 jobs, locks the source orders in id order so two simultaneous multi-customer saves cannot deadlock, and either writes every job or none. `update_production_job` refuses to move a job with payment history to another penjahit — cancel or settle it and assign a new one. See `tests/production-ledger.sql` for the executable version of all of this.

### View `public.production_job_feed` (security_invoker)
Row shape: the job's own columns plus `penjahit_name`, `customer_id`, `customer_name`, `order_title`, `amount` (the cancellation charge when cancelled, otherwise quantity × unit_price), `paid`, `refunded` (voided entries excluded), and `has_history`.

Balance is `amount − paid + refunded`. A positive balance is **outstanding**, a negative one is **credit**, and the two are aggregated separately per penjahit — never netted into a single figure, because a credit on one job must not read as a smaller debt on another.

### View `public.fitting_log_feed` (security_invoker)
Feed row shape: `id`, `order_id`, `customer_id`, `customer_name`, `order_title`, `order_label` (title → first item + "+N more" → `Empty order`), `stage_key` (`sizing|fitting-1|fitting-2|fitting-3|final-fitting`), `stage_label`, `status`, `created_at`, `log_date` (Asia/Jakarta date), `photo_count`, `preview_photos` (first 3), `search_text` (lowercased name + label + `FMDD Mon YYYY`).

Search and stage filtering both run against this view — never re-derive them client-side.

---

## 2. Security model

- Anon key is public and committed. Every table denies anonymous callers.
- RLS policy everywhere else: `"signed-in full access"` for `authenticated`.
- `production_jobs` and `production_payments` are the exception: `authenticated` is granted **select only**, and all writes go through the three `security definer` RPCs. Money is the one thing in this schema that a client cannot write directly.
- One shared Supabase Auth user; the shared password is the only real credential and is never in the repo.
- `google_credentials` is service-role only.

## 3. Editing schema.sql

Append-only. To change the schema:
1. Add an idempotent migration block at the **bottom** with a quoted title comment.
2. Add that title to the navigation list at `schema.sql` lines 8–18.
3. Never edit an applied block — the file is re-run whole after every pull.

Existing migration titles (grep any of these to jump): `dashboard UX overhaul` · `document name + payment schemes` · `fitting schedule + Google` · `the real lifecycle` · `status stops being` · `schedule gets a second anchor` · `moodboard generator` · `fitting revisions log` · `atomic fitting photo batches` · `quotation and invoice feeds` · `fitting photo annotations` · `per-termin invoices` · `penjahit production ledger` · `customer done and penjahit removal`.

---

## 4. `db.js` API index — method → line

Everything below is on `window.KK.db`. All async unless noted.

**Auth & session** — `isConfigured` 15 · `init` 31 · `currentSession` 151 · `signIn(password, rememberMe)` 157 · `signOut` 178 · `refreshSession` 185 · `isStaleToken(err)` 192 · `savedPassword` 198

**Customers** — `listCustomers` 204 · `getCustomer(id)` 208 · `createCustomer(record)` 212 · `updateCustomer(id, record)` 216 · `deleteCustomer(id)` 220

**Orders** — `listOrders(customerId)` 226 · `listAllOrders` 230 (carries `title` for the calendar) · `getOrder(id)` 234 · `createOrder` 238 (called only from `saveOrder`, on the `#/customer/:id/order/new/edit` route) · `updateOrder(id, record)` 242 · `deleteOrder(id)` 246

**Production** — `productionAvailable()` 327 (the one probe; `42P01`/`PGRST205` answers `false` so the feature can ship before its migration) · `listPenjahit` 337 (TTL-cached) · `listProductionSources` 341 (every order with its items, for the item picker) · `savePenjahit(record)` 351 · `deletePenjahit(id)` · `listProductionJobs({penjahitId?, orderId?, id?})` 356 · `listProductionPayments(jobId)` 371 · `saveProductionJobs(jobs)` 381 · `updateProductionJob(job)` 386 · `recordProductionPayment(change)` 391. The last three are `.rpc(` calls; every list pages past PostgREST's row cap in 500s, because a ledger that silently stops at 1000 rows is a wrong balance, not a short list.

**Documents & history** — `logDocument(orderId, kind, total, termNumber?, termCount?)` 326 · `listDocumentLog(orderId)` 331 · `logOrderHistory(orderId, action, detail)` 340 · `listOrderHistory(orderId)` 344

**Schedule** — `listOrderEvents(orderId)` 274 · `listAllOrderEvents` 284 (whole table, for the homepage strip and the schedules calendar) · `listAllFittingSessions` 342 (resolves a calendar tap target in one read) · **`replaceOrderEvents(orderId, newEvents, allowedStages)` 288** — rewrites the schedule while preserving `google_event_id` per stage; returns `{ removed, events }`

**Fitting sessions** — `listFittingSessions(orderId)` 335 · `getFittingSession(id)` 346 · `getFittingSessionByStage(orderId, stage)` 350 · `createFittingSession` 359 · `updateFittingSession(id, record)` 363 · `deleteFittingSession(id)` 367

**Fitting feed & photos** — **`listFittingLogs(options)` 386** (cursor paging, returns `{ rows, nextCursor }`) · `listFittingPhotos(orderId)` 463 · `listFittingPhotosBySession(sessionId)` 470 · `getFittingPhoto(id)` 477 · `createFittingPhoto` 481 · `updateFittingPhoto(id, record)` 485 (Drive ids, written by `archivePhoto`) · `deleteFittingPhoto(id)` 489 · **`saveFittingPhotoBatch(sessionId, photoUpdates, deleteIds, newPhotos)` 499** — the atomic RPC above

`PROJECTION_FITTING_PHOTOS` carries `annotation`. `PROJECTION_FITTING_FEED` deliberately does not: feed previews are three ~100px thumbnails, where a mark would be a smudge, and the jsonb would cost every page load.

**Document feed** — **`listDocumentFeed(options)` 427** — one kind per call, cursor paging, server-side `ilike`; same shape and same guarantees as `listFittingLogs`. `normalizeDocumentKind` rejects anything but `quotation`/`invoice` so a routing bug fails loudly instead of showing both.

**Intake** — `listIntake(statusFilter)` 510 · `getIntake(id)` 516 · `resolveIntake(id, status, customerId)` 520

**Google Calendar** (via `callGoogle` 111) — `googleStatus` 456 · `googleExchange(code, redirectUri)` 457 · `googleDisconnect` 458 · `googleForget(eventIds)` 459 · `syncOrderCalendar(orderId)` 460 · `syncFollowUp(customerId)` 461

**Google Drive** (via `callDrive` 128) — `driveSaveMoodboardPdf(...)` 463 · `driveSaveFittingPhoto(imageBase64, mimeType, fileName, customerName, orderTitle, stage)` 465 · `driveGetFittingPhoto(photoId)` 470

**Moodboard log** — `logMoodboard(orderId, driveLink)` 546 · `countMoodboards(orderId)` 550

**Internal helpers** (not exported): `unwrap(res)` 44 · `normalizeFeedQuery` 74 · `likeLiteral` 82 · `normalizeFeedStages` 86.

---

## 5. Edge Functions — `supabase/functions/`

Invoked only through `db.js`. All take `{ action, ...payload }`.

### `google-calendar/index.ts` (550 lines) — actions at 517–539
`exchange` · `status` · `sync` · `sync_follow_up` · `forget` · `disconnect`

Holds the service-role read of `google_credentials`. Sync preserves `google_event_id` per `order_events` row so moving a date moves the existing event.

### `google-drive/index.ts` (372 lines) — actions at 342–361
`save_moodboard_pdf` · `save_fitting_photo` · `get_fitting_photo`

`get_fitting_photo { photo_id }` resolves the Drive id **server-side** from the photo record — an arbitrary Drive id can never be requested. It is the byte source for photo sharing and for the fitting-log PDF.

Drive holds the **original photo and only the original photo**. Marks are vector data on the row, so nothing about them is uploaded and no derivative image exists; the PDF is the shareable annotated artifact. `save_fitting_photo` runs after the metadata commit, never before.

### `intake/index.ts` (211 lines)
Public Tally webhook. Writes the verbatim body to `intake_submissions.payload` plus convenience columns. Never rejects on a bad dropdown value.
