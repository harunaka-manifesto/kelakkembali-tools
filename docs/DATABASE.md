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
`id` · `order_id` fk cascade · `kind` (`quotation|invoice|moodboard`) · `total` bigint · `drive_link` · `created_at`. Paper trail of numbers, not files.

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

Existing migration titles (grep any of these to jump): `dashboard UX overhaul` · `document name + payment schemes` · `fitting schedule + Google` · `the real lifecycle` · `status stops being` · `schedule gets a second anchor` · `moodboard generator` · `fitting revisions log` · `atomic fitting photo batches`.

---

## 4. `db.js` API index — method → line

Everything below is on `window.KK.db`. All async unless noted.

**Auth & session** — `isConfigured` 15 · `init` 31 · `currentSession` 133 · `signIn(password, rememberMe)` 139 · `signOut` 160 · `refreshSession` 167 · `isStaleToken(err)` 174 · `savedPassword` 180

**Customers** — `listCustomers` 186 · `getCustomer(id)` 190 · `createCustomer(record)` 194 · `updateCustomer(id, record)` 198 · `deleteCustomer(id)` 202

**Orders** — `listOrders(customerId)` 208 · `listAllOrders` 212 · `getOrder(id)` 216 · `createOrder` 220 · `updateOrder(id, record)` 224 · `deleteOrder(id)` 228

**Documents & history** — `logDocument(orderId, kind, total)` 234 · `listDocumentLog(orderId)` 238 · `logOrderHistory(orderId, action, detail)` 246 · `listOrderHistory(orderId)` 250

**Schedule** — `listOrderEvents(orderId)` 256 · `listAllOrderEvents` 260 · **`replaceOrderEvents(orderId, newEvents, allowedStages)` 264** — rewrites the schedule while preserving `google_event_id` per stage; returns `{ removed, events }`

**Fitting sessions** — `listFittingSessions(orderId)` 311 · `getFittingSession(id)` 315 · `getFittingSessionByStage(orderId, stage)` 319 · `createFittingSession` 328 · `updateFittingSession(id, record)` 332 · `deleteFittingSession(id)` 336

**Fitting feed & photos** — **`listFittingLogs(options)` 352** (cursor paging, returns `{ rows, nextCursor }`) · `listFittingPhotos(orderId)` 389 · `listFittingPhotosBySession(sessionId)` 396 · `getFittingPhoto(id)` 403 · `createFittingPhoto` 407 · `updateFittingPhoto(id, record)` 411 · `deleteFittingPhoto(id)` 415 · **`saveFittingPhotoBatch(sessionId, captionUpdates, deleteIds, newPhotos)` 425** — the atomic RPC above; the only `.rpc(` call in the file

**Intake** — `listIntake(statusFilter)` 436 · `getIntake(id)` 442 · `resolveIntake(id, status, customerId)` 446

**Google Calendar** (via `callGoogle` 93) — `googleStatus` 456 · `googleExchange(code, redirectUri)` 457 · `googleDisconnect` 458 · `googleForget(eventIds)` 459 · `syncOrderCalendar(orderId)` 460 · `syncFollowUp(customerId)` 461

**Google Drive** (via `callDrive` 110) — `driveSaveMoodboardPdf(...)` 463 · `driveSaveFittingPhoto(imageBase64, mimeType, fileName, customerName, orderTitle, stage)` 465 · `driveGetFittingPhoto(photoId)` 470

**Moodboard log** — `logMoodboard(orderId, driveLink)` 472 · `countMoodboards(orderId)` 476

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
