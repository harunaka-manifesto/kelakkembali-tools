# DATABASE — data contract

Read this instead of `schema.sql` (1143 lines) or `db.js` (482 lines). Open the source only when this file lacks the column or query you need.

`db.js` is the **only** module allowed to touch Supabase or an Edge Function.

---

## 1. Tables — column contract

### `customers`
`id` uuid pk · `name` **not null** · `phone` · `instagram` · `source` (`Instagram|TikTok|Referral|Walk-in|Other`) · `wedding_date` · `wedding_date_precision` · `fitting_1_date` · `final_fitting_date` · `notes` · `stage` · `consult_date` · `moodboard_date` · `lost_reason` · `follow_up_date` · `follow_up_label` · `follow_up_google_event_id` · `follow_up_synced_at` · `cancelled_at` · `cancelled_reason` · `created_at` · `updated_at`

The customer owns the pipeline: stage, consult, moodboard, follow-up, cancellation. Wedding dates live here, not on the order.

### `orders`
`id` uuid pk · `customer_id` fk→customers **cascade** · `title` · `doc_name` · `document_date` · `status` (`Quoted|Confirmed|In production|Delivered` — `Draft` was dropped) · `items` jsonb `[]` · `includes` jsonb `[]` · `payment_scheme` default `standard` · `payment_terms` jsonb `[]` · `first_payment_date` · `second_payment_date` · `final_payment_date` · `fitting_1_date` · `final_fitting_date` · `created_at` · `updated_at`

The order owns money, items, documents, and the schedule anchors.

### `document_log`
`id` · `order_id` fk cascade · `kind` (`quotation|invoice|moodboard`) · `total` bigint (nullable since moodboards) · `drive_link` · `created_at`. Paper trail of numbers, not files.

A quotation and an invoice are two renderings of one order, not two records — this table is the only durable trace either leaves. Read through `document_feed` for the list pages.

### `order_history`
`id` · `order_id` fk cascade · `action` (`created|updated|payment_logged`) · `detail` jsonb · `created_at`.

### `order_events` — the fitting schedule
`id` · `order_id` fk cascade · `stage` · `event_date` · `end_date` · `google_event_id` (null until synced) · `synced_at` · `created_at` · `updated_at` · **unique (order_id, stage)**.

Stage set: `Design phase`, `Design deadline`, `Sizing`, `Fitting 1`, `Fitting 2`, `Fitting 3`, `Final fitting`.

### `fitting_sessions` — one durable log per stage
`id` · `order_id` fk cascade · `stage` (5 canonical: `Sizing`, `Fitting 1`, `Fitting 2`, `Fitting 3`, `Final fitting`) · `status` (`active|completed`) · `created_at` · `completed_at`.

### `fitting_photos`
`id` · `order_id` fk cascade · `session_id` fk→fitting_sessions **nullable** (photos predate sessions) · `stage` · `caption` · `drive_file_id` · `drive_link` · `position` smallint · `created_at`.

### RPC `public.save_fitting_photo_batch` (security_invoker)

The Add fitting photos page's single write. Signature:

```sql
save_fitting_photo_batch(
  p_session_id      uuid,
  p_caption_updates jsonb,   -- [{ id, caption|null }]
  p_delete_ids      uuid[],
  p_new_photos      jsonb    -- [{ client_key, caption|null }]
) returns jsonb              -- { photos: [row], created: [{ client_key, photo }] }
```

One transaction, in this order: lock the session row · reject duplicate ids, an id that is both edited and deleted, a missing/duplicate `client_key`, and any photo belonging to another session · cap additions at **20** photos (`existing - deletions + additions`) · apply captions · delete staged rows · reindex the retained rows to gap-free zero-based `position` · insert the new rows with `order_id`/`stage` taken from the **locked session**, never from the browser, and `drive_file_id`/`drive_link` null.

Captions and deletions are never capacity-checked, so a legacy log already above 20 photos stays editable; only additions are refused. Drive archival happens after this commits — uploading first would strand archive files whenever the transaction failed.

Any violation raises, so `unwrap` surfaces it and nothing is written. Granted to `authenticated` only; `security_invoker` keeps the table's own RLS in force.

### `intake_submissions` — Tally landing table
`id` · `payload` jsonb **verbatim, the record of truth** · `name` · `phone` · `instagram` · `source` (**unconstrained on purpose** — a stranger's answer must never reject the insert) · `wedding_date` · `wedding_date_precision` · `notes` · `status` (`new|accepted|dismissed`) · `customer_id` fk set-null · `created_at` · `reviewed_at`.

### `google_credentials` — singleton
`id` smallint pk `= 1` · `refresh_token` · `calendar_id` default `primary` · `connected_at` · `updated_at`.
**RLS enabled with zero policies** — denies `anon` and `authenticated` outright. Only the service-role Edge Function reads it. Never query it from the browser.

### View `public.document_feed` (security_invoker)
Row shape: `id`, `order_id`, `kind` (`quotation|invoice` only — moodboards are excluded in the view, not by the caller), `total` (nullable), `created_at`, `customer_id`, `customer_name`, `order_title`, `order_status`, `order_label` (same expression as `fitting_log_feed`), `issued_date` (Asia/Jakarta date), `search_text` (lowercased name + label + `FMDD Mon YYYY`).

Backs `#/quotations` and `#/invoices`. `document_log` stores no customer name, no order label, and no search column, so the join has to happen here — a client-side join could not do server-side `ilike` or cursor paging. Index `document_log_kind_created_idx (kind, created_at desc, id desc)` matches the feed's ordering and cursor tie-break.

**The `total` on a row is the number that was actually sent.** Never recompute it from the order's current items — that is the whole reason the column exists.

### View `public.fitting_log_feed` (security_invoker)
Feed row shape: `id`, `order_id`, `customer_id`, `customer_name`, `order_title`, `order_label` (title → first item + "+N more" → `Empty order`), `stage_key` (`sizing|fitting-1|fitting-2|fitting-3|final-fitting`), `stage_label`, `status`, `created_at`, `log_date` (Asia/Jakarta date), `photo_count`, `preview_photos` (first 3), `search_text` (lowercased name + label + `FMDD Mon YYYY`).

Search and stage filtering both run against this view — never re-derive them client-side.

---

## 2. Security model

- Anon key is public and committed. Every table denies anonymous callers.
- RLS policy everywhere else: `"signed-in full access"` for `authenticated`.
- One shared Supabase Auth user; the shared password is the only real credential and is never in the repo.
- `google_credentials` is service-role only.

## 3. Editing schema.sql

Append-only. To change the schema:
1. Add an idempotent migration block at the **bottom** with a quoted title comment.
2. Add that title to the navigation list at `schema.sql` lines 8–18.
3. Never edit an applied block — the file is re-run whole after every pull.

Existing migration titles (grep any of these to jump): `dashboard UX overhaul` · `document name + payment schemes` · `fitting schedule + Google` · `the real lifecycle` · `status stops being` · `schedule gets a second anchor` · `moodboard generator` · `fitting revisions log` · `atomic fitting photo batches` · `quotation and invoice feeds`.

---

## 4. `db.js` API index — method → line

Everything below is on `window.KK.db`. All async unless noted.

**Auth & session** — `isConfigured` 15 · `init` 31 · `currentSession` 151 · `signIn(password, rememberMe)` 157 · `signOut` 178 · `refreshSession` 185 · `isStaleToken(err)` 192 · `savedPassword` 198

**Customers** — `listCustomers` 204 · `getCustomer(id)` 208 · `createCustomer(record)` 212 · `updateCustomer(id, record)` 216 · `deleteCustomer(id)` 220

**Orders** — `listOrders(customerId)` 226 · `listAllOrders` 230 (carries `title` for the calendar) · `getOrder(id)` 234 · `createOrder` 238 (called only from `saveOrder`, on the `#/customer/:id/order/new/edit` route) · `updateOrder(id, record)` 242 · `deleteOrder(id)` 246

**Documents & history** — `logDocument(orderId, kind, total)` 252 · `listDocumentLog(orderId)` 256 · `logOrderHistory(orderId, action, detail)` 264 · `listOrderHistory(orderId)` 268

**Schedule** — `listOrderEvents(orderId)` 274 · `listAllOrderEvents` 284 (whole table, for the homepage strip and the schedules calendar) · `listAllFittingSessions` 342 (resolves a calendar tap target in one read) · **`replaceOrderEvents(orderId, newEvents, allowedStages)` 288** — rewrites the schedule while preserving `google_event_id` per stage; returns `{ removed, events }`

**Fitting sessions** — `listFittingSessions(orderId)` 335 · `getFittingSession(id)` 346 · `getFittingSessionByStage(orderId, stage)` 350 · `createFittingSession` 359 · `updateFittingSession(id, record)` 363 · `deleteFittingSession(id)` 367

**Fitting feed & photos** — **`listFittingLogs(options)` 386** (cursor paging, returns `{ rows, nextCursor }`) · `listFittingPhotos(orderId)` 463 · `listFittingPhotosBySession(sessionId)` 470 · `getFittingPhoto(id)` 477 · `createFittingPhoto` 481 · `updateFittingPhoto(id, record)` 485 · `deleteFittingPhoto(id)` 489 · **`saveFittingPhotoBatch(sessionId, captionUpdates, deleteIds, newPhotos)` 499** — the atomic RPC above; the only `.rpc(` call in the file

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

### `intake/index.ts` (211 lines)
Public Tally webhook. Writes the verbatim body to `intake_submissions.payload` plus convenience columns. Never rejects on a bad dropdown value.
