# FEATURES — one row per feature, everything you need to touch it

Find your row. Read only what it lists. Line numbers are read offsets, not just references.

Column key: **app.js** = entry function + line ([MAP-app.md](MAP-app.md)) · **HTML** = view id + lines ([MAP-html-css.md](MAP-html-css.md)) · **CSS** = file + section line · **Data** = `db.js` methods + tables ([DATABASE.md](DATABASE.md)).

---

## Quick router

| If the task mentions… | Go to feature |
| :--- | :--- |
| homepage, ledger, greeting, shortcuts, search | [1](#1-homepage--customer-ledger) |
| customer page, banners, wedding date, follow-up, cancel | [2](#2-customer-detail), [3](#3-customer-editor) |
| order page, payments, deposits, schedule display | [4](#4-order-detail) |
| items, pricing, terms, cost calculator | [5](#5-order-editor--cost-calculator) |
| schedule dates, fitting weeks, rescheduling | [6](#6-fitting-schedule-computation) |
| fitting feed, filters, infinite scroll | [7](#7-fitting-logs-feed) |
| one fitting log, photo cards, share, log PDF | [8](#8-fitting-log-detail), [9](#9-fitting-log-pdf) |
| add photos, captions, red marks, annotation, staged delete, undo, 20-photo cap | [10](#10-fitting-workspace-photos-notes-marks) |
| starting a log, stage picker, empty log | [11](#11-starting-a-fitting-log) |
| HEIC, image compression, Drive upload, backup registry | [12](#12-fitting-image-preparation--drive-archival) |
| moodboard, mosaic, canvas, zoom | [13](#13-moodboard) |
| quotation, invoice, watermark, PDF layout | [14](#14-quotation--invoice-documents) |
| Tally, enquiry, intake | [15](#15-intake--enquiry-review) |
| Google Calendar, sync, connect | [16](#16-google-calendar) |
| sign in, gate, boot, session | [17](#17-auth-gate--boot) |
| app bar, toast, save bar, route loader | [18](#18-shared-chrome) |
| calendar, month view, week band, day sheet, schedules | [19](#19-schedules-calendar) |
| quotation list, invoice list, document log, document feed | [20](#20-quotations--invoices-lists) |

---

## 1. Homepage & customer ledger
- **Route** `#/`
- **app.js** `showCustomers` **1414**; region **1240–1552**. Also `renderCustomerList` 4004, `homepageStatus` 4028, `compareHomepageCustomers` 4048, `nextDeadline` 4068
- **HTML** `#viewCustomers` **117–175**
- **CSS** `pages.css` 76–690 (atmosphere 113, hero 205, nav bar 249, shortcuts 312, submissions bar 366, search 414, ledger 439, skeleton 606, error 686)
- **Time field** the picture behind the greeting: five drifting colour fields under a fixed 9px pixel grid, plus a contrast band that keeps the hero text legible whatever drifts under it. `transform`-only motion, so it is compositor work and nothing else. Built by `buildHomepageAtmosphereScene` 1525, phase tokens at 1408, full spec in [HOMEPAGE-TIME-FIELD-SPEC.md](../HOMEPAGE-TIME-FIELD-SPEC.md) — **re-measure contrast before changing any palette**
- **Shortcuts** Four coloured tiles — Schedule, Quotation (`?new=1`), Invoice (`?new=1`), Moodboard — then a neutral row of two: Add customer (`#/customer/new/edit`) and Add order (opens the picker in `neworder` mode). Moodboard and Add order are `<button>`s because neither knows its destination until something is picked
- **`SHOW_FITTING_SHORTCUT`** (app.js, near the domain constants) stands the Fitting tile down and is the only thing to flip to bring it back. It sets the tile's `hidden` **and** `body.has-fitting-shortcut`, which is what moves Moodboard to a full-width row and returns pink to Fitting — five tiles do not fit a four-column grid. Fittings themselves are untouched: `#/fittings`, the order page's fitting entry, and scheduled appointments all still work
- **Data** `db.listCustomers`, `db.listAllOrders`, `db.listAllOrderEvents`, `db.listIntake('new')` · tables `customers`, `orders`, `order_events`, `intake_submissions`

## 2. Customer detail
- **Route** `#/customer/:id`
- **app.js** `showCustomerDetail` **4106**, `renderCustomerDetail` 4215, `renderCustomerReadOnly` 4175, `custNextEvent` 4185, `custOrderStatus` 4207
- **HTML** `#viewCustomer` **183–277**
- **CSS** `pages.css` 661–993 (hero 753, banners 771, order ledger 851)
- **Data** `db.getCustomer`, `db.listOrders` · tables `customers`, `orders`, `order_events`

## 3. Customer editor
- **Route** `#/customer/:id/edit`
- **app.js** `showCustomerEdit` **4131**, `fillCustomerForm` 4252, `saveCustomer` **4297**, `setWeddingPrecision` 4277, `setNameError` 4269, `lastDayOfMonth` 4290. Lifecycle helpers 640–762: `setFollowUp` 741, `pushFollowUp` 751, `cancelCustomer` 765, `deleteCustomerRecord` 785, `reopenCustomer` 802
- **HTML** `#viewCustomerEdit` **521–730**
- **CSS** `pages.css` 994–1349 (error 1157, status actions 1193, save bar 1250); fields/chips in `shared.css` 1474, 1753
- **Data** `db.updateCustomer`, `db.createCustomer`, `db.deleteCustomer`, `db.syncFollowUp` · table `customers`

## 4. Order detail
- **Route** `#/order/:id`
- **app.js** `showOrderDetail` **4701**; region **4369–4937**. `buildOrderDetailViewModel` 4516, `renderOrderPayments` 4595, `renderOrderSchedule` 4629, `refreshOrderPayments` 4766, `refreshOrderSchedule` 4800, `logDeposit` 5914, `deriveLoggedDeposits` 4461
- **HTML** `#viewOrder` **831–1068**
- **CSS** `pages.css` 1350–2112 (ledger 1468, cards 1501, designs 1534, items 1614, payments 1665, schedules 1743, actions 1897, skeleton 1995, error 2042)
- **Data** `db.getOrder`, `db.listOrderEvents`, `db.listDocumentLog`, `db.listOrderHistory`, `db.logOrderHistory`, `db.listFittingSessions`, `db.listFittingPhotos` · tables `orders`, `order_events`, `document_log`, `order_history`

## 5. Order editor & cost calculator
- **Route** `#/order/:id/edit`, and `#/customer/:id/order/new/edit` for one that does not exist yet — `route.id` is the string `"new"` and `route.customerId` carries whose it will be. `state.order` comes from `NEW_ORDER_TEMPLATE` instead of the database and the Delete order menu item is withheld; the form below it fills identically, and `saveOrder` branches on `state.order.id` alone
- **app.js** region **3881–4277**. `saveOrder` **5008**, `readItems` 5131, `addItemRow` 5067, `refreshItemTotals` 5096, `readTerms` 5216, `buildTerms` 5241, `validateTerms` 5053, `syncSchemeCard` 5251, `applyCostCalc` 5326, `closeCostCalc` 5310
- **HTML** `#viewOrderEdit` **681–774**, `#calcSheet` **1302–1340**
- **CSS** `shared.css` item rows 1586, payment terms 1689, chips 1753, cost sheet 2052, cost calc trigger 2158
- **Data** `db.updateOrder`, `db.createOrder`, `db.logOrderHistory` · table `orders` (`items`, `includes`, `payment_terms`, `payment_scheme` jsonb)

## 6. Fitting schedule computation
- **Entry** `calendar.js` — `computeSchedule`, `computeDesign`, `computeProduction`, `DROP_ORDER`, `plannedWeek` (whole file, 356 lines — **pure, tested**)
- **app.js** `orderScheduleModel` **4471**, `rescheduleOrder` **4901**, `renderScheduleHint` 4866, `retryOrderSchedule` 4839
- **CSS** `shared.css` schedule 1117; `pages.css` schedules 1743
- **Data** `db.replaceOrderEvents` (preserves `google_event_id` per stage), `db.syncOrderCalendar` · table `order_events`
- **Gate** changes here must pass `node --test tests/pure-modules.test.cjs`

## 7. Fitting logs feed
- **Route** `#/fittings`
- **app.js** `showFittingLogs` **2061**; region **1553–2136**. `fittingCardHtml` 1602, `renderFittingFeed` 1758, `startFittingFirstPage` 1818, `loadMoreFittingLogs` 1851, `fittingRequestArgs` 1789, `parkFittingLogs` 1918, `cleanupFittingLogs` 1891
- **HTML** `#viewFittingLogs` **288–345**
- **CSS** `pages.css` 2113–2666 (`.fitlog-*`: title band 2153, search 2189, stage filters 2249, feed 2324, panels 2434, skeletons 2478, card link 2553)
- **Data** `db.listFittingLogs(options)` (cursor paging) · view `fitting_log_feed` — search and stage filtering happen in the view, never client-side

## 8. Fitting log detail
- **Route** `#/fittings/:sessionId?source=feed|order`
- **app.js** `showFittingLogDetail` **4691**; region **4243–4818**. `renderFittingDetail` 4367, `fittingDetailCardHtml` 4290, `shareFittingPhoto` 4466, `fittingPhotoBlob` 4410, `openFittingPhotoViewer` 4608, `addFittingDetailPhoto` 4639, `deleteFittingDetailLog` 4655, `setupFittingDetailListeners` 4749
- **HTML** `#viewFittingDetail` **392–453**, `#fittingPhotoViewer` 1442, `#fitdetBar` 1476 (two buttons: `#fitdetEditBtn`, `#fitdetAddBtn`), `#fitdetPhotoInput` 445
- **CSS** `pages.css` `.fitdet-*` 2862–3118 (photo cards 2862, actions 2950, bottom bar 3001, delete block 3075, marks layer 3322, viewer 3433)
- **Data** `db.getFittingSession`, `db.listFittingPhotosBySession`, `db.driveGetFittingPhoto`, `db.deleteFittingSession` · tables `fitting_sessions`, `fitting_photos`
- **Reads, never edits.** Every card shows its annotated image and its note; `Edit` on a card and `Edit log` in the bar both open the workspace (§10), the former with `?focus=<photoId>`. Marks render through `U.annotationSvg` over the `<img>` — nothing is drawn into the stored pixels

## 9. Fitting log PDF
- **Entry** `fitting-pdf.js` (whole file, 319 lines — **pure geometry**)
- **app.js** `downloadFittingPdf` **4520** (resolves images, owns busy UI and save), `measureImage` 4442, `blobToDataUrl` 4433, `fittingShareFilename` 4451
- **Data** `google-drive` action `get_fitting_photo { photo_id }` — resolves the Drive id server-side
- **Layout** **no cover page; one fitting photo is one page.** Six photos make six pages. Every page carries a customer/stage/date header, the photo contained at its natural ratio, its red marks at image-relative coordinates, and a 12pt note. An extreme note takes space from the image only down to `MIN_IMAGE_H` (300pt) and then continues on a plain caption page — it is never shrunk and never truncated
- **Do not** add DB, Drive, toast, or save calls to `fitting-pdf.js`

## 10. Fitting workspace (photos, notes, marks)
- **Routes** `#/fittings/:sessionId/edit?source=feed|order&focus=<photoId>&new=1` · `…/photos/add` is kept as a synonym · `…/photo/:photoId/edit` **redirects here** (the per-photo editor is retired)
- **app.js** `showFittingPhotoAdd` **6117**; region **4820–6294**. `renderFittingPhotoAdd` 5252, `runAddPreparationQueue` 4972, `patchAddDraftCard` 5338, `openAddEditor` 5403, `saveAddEditor` 5433, `deleteAddCard` 5449, `undoAddDeletion` 5065, **`saveFittingPhotoAdd` 5859**, `startAddBackups` 5997, `seedFittingPhotoAdd` 6086, `discardProvisionalFittingLog` 6067, `cleanupFittingPhotoAdd` 6075, `setupFittingPhotoAddListeners` 6198
- **Annotation** sub-region **5486–5830**: `openFittingMark` 5723, `layoutFittingMark` 5528, `redrawFittingMark` 5555, `drawFittingMarkStroke` 5564, `fittingMarkPoint` 5600, `onFittingMarkDown` 5607 / `Move` 5632 / `Up` 5670, `undoFittingMark` 5684, `clearFittingMark` 5695, `commitFittingMark` 5784, `closeFittingMark` 5800
- **HTML** `#viewFittingPhotoAdd` **455–499**, `#fitaddFileInput` 488, `#fitmark` overlay **1456–1474**, `#fitaddUndo` 1493, `#fitaddBar` 1500, and `#fitdetPhotoInput` 445 on the detail page
- **CSS** `pages.css` `.fitadd-*` 3119–3321 (stage 3124, inline caption editor 3192, undo toast 3240, skeletons 3286) and `.fitmark-*` 3322–3432; cards, actions and the bottom bar reuse `.fitdet-*` 2862+
- **Data** **`db.saveFittingPhotoBatch(sessionId, photoUpdates, deleteIds, newPhotos)`** → RPC `save_fitting_photo_batch` · table `fitting_photos`. Also `db.getFittingSession`, `db.getOrder`, `db.getCustomer`, `db.listFittingPhotosBySession` on direct entry
- **Image prep** `KK.fittings.prepareImage` — 2560px longest edge, quality 0.90, one file at a time
- **Marks** one red pen, full-screen mode, Pointer Events on a canvas sized to the **contained image** (`KK.fittingPdf.fitContain`), never to the stage. Strokes are normalized `0..1` image-space points; `U.normalizeAnnotation` is the one gate, and an empty stroke list stores `null` so cleared and never-marked are one state
- **Invariants** nothing is written until Save fitting log; caption edits, mark edits, deletions and additions apply in **one transaction**; an update entry carries only the keys that changed, and the RPC reads key presence, so a caption edit never overwrites a mark; a staged existing-photo deletion offers a 5s Undo and never touches its Drive archive copy; the log caps at **20** photos, enforced again in the RPC; Drive backup runs **after** the commit through `KK.fittings.backupPhoto`, never before

## 11. Starting a fitting log
- **Route** `#/order/:id/fitting/new?stage=` — dispatch in `handleRoute` **1326**. `#/order/:id/fitting/:sessionId` still redirects to the canonical detail route
- **Entry** `KK.fittings.showStagePicker` when no `?stage` is given; `#fittingPicker` **1438** is the only fitting overlay left
- **Behavior** resolve or create the `fitting_sessions` row for this order and stage, then open the workspace. An existing log is joined; a `23505` race joins the winner's. The row is created **before** the workspace opens, so every part of that page works against a real session id — and `discardProvisionalFittingLog` deletes it again if the log is left without a single photo
- **Data** `db.getFittingSessionByStage`, `db.createFittingSession`, `db.deleteFittingSession`

## 12. Fitting image preparation & Drive archival
- **Entry** `fittings.js` (whole file, 284 lines) — no route, no page markup, no camera
- **Owns** `prepareImage` (HEIC → 2560px JPEG at 0.90), `localURLs` ownership, `backupPhoto` / `waitForSessionBackups` / `isBackingUp` / `hasPendingBackups` / `consumeBackupFailures`, and the stage picker
- **Archive contract** Drive holds the **original photo and only the original photo**. Marks are vector data on the row, so nothing about them is uploaded and no derivative image exists. The PDF is the shareable annotated artifact
- **Data** `db.driveSaveFittingPhoto`, `db.updateFittingPhoto` · table `fitting_photos`
- **Invariant** archival runs **after** the metadata commit. A Drive failure is reported once and never rolls back a saved log

## 13. Moodboard
- **Routes** `#/order/:id/moodboard`, `#/order/:id/moodboard/preview`
- **Entry** `moodboard.js` (whole file, 724 lines)
- **app.js** region **5335–5744**: `setupMoodboardListeners` 5355, `addMoodboardFiles` 5452, `openMoodboardCanvas` 5487, `openMoodboardOverlay` 5544, `bindMoodboardOverlayGestures` 5649, `moodboardZoomAt` 5605; export `exportMoodboard` **5812**, `recordMoodboardExport` 5780
- **HTML** `#viewMoodboard` **1104–1244**, moodboard document **1712–1727** (locked spec)
- **CSS** `moodboard.css` (editor 8, canvas 264, actions 352, overlay 437, document 582)
- **Data** `db.driveSaveMoodboardPdf`, `db.logMoodboard`, `db.countMoodboards` · table `document_log` (kind `moodboard`)

## 14. Quotation & invoice documents
- **Entry** `docs.js` (whole file, 353 lines)
- **app.js** `downloadDocument` **5882**, `setDocumentBusy` 5865
- **HTML** `#quotation` **1544–1634**, `#invoice` **1635–1711** — **locked spec, 1:1 with Figma, do not edit without an explicit request**
- **CSS** `documents.css` (header 84, items 182, includes/excludes 254, terms 298, signature 351, invoice 378)
- **Data** `db.logDocument(orderId, kind, total)` · table `document_log`
- **Background** rationale lives in `README.md` §"The design contract" — seek via [README-INDEX.md](README-INDEX.md), do not read the file

## 15. Intake / enquiry review
- **Route** `#/enquiry/:id`
- **Entry** `supabase/functions/intake/index.ts` (211 lines) for the webhook
- **app.js** `readableAnswer` **3948**, `acceptEnquiry` 3959, `dismissEnquiry` 3990
- **HTML** `#viewEnquiry` **1251–1276**
- **Data** `db.listIntake`, `db.getIntake`, `db.resolveIntake` · table `intake_submissions`
- **Invariant** `payload` is the record; the columns are convenience. `source` is unconstrained so a stranger's answer can never reject the insert

## 16. Google Calendar
- **Route** `#/calendar`
- **Entry** `supabase/functions/google-calendar/index.ts` (550 lines, actions at 517–539)
- **app.js** `showCalendarSettings` **4966**, `connectGoogle` 4947, `disconnectGoogle` 4994, `googleRedirectUri` 4945, `offerGoogleReconnect` 5805
- **HTML** `#viewCalendar` **1070–1102**
- **Data** `db.googleStatus/Exchange/Disconnect/Forget`, `db.syncOrderCalendar`, `db.syncFollowUp` · tables `google_credentials` (service-role only), `order_events.google_event_id`

## 17. Auth gate & boot
- **app.js** `showGate` **6363**, `showApp` 6380, boot region **6410–6460**
- **HTML** `#boot` **27–33**, `#gate` **34–56**
- **CSS** `shared.css` boot 5, gate 300
- **Data** `db.init`, `db.currentSession`, `db.signIn`, `db.signOut`, `db.refreshSession`, `db.isStaleToken`, `db.savedPassword`; `config.js`

## 18. Shared chrome
- **app.js** region **401–669**: `showToast` 403, `setDirty` 410, `setSaveBar` 458, `setPageAction` 464, `setChrome` 472, `closeMenu` 507, `beginRouteLoader` 572, `showRouteError` 616, `focusRoute` 639. All listeners in `bindEvents` **6017**
- **HTML** app bar **60–115**, `#savebar` 1365, `#routeLoader` 1417, `#toast` 1539
- **CSS** `shared.css` app bar 361, overflow menu 466, page header 514, buttons 1851, bottom bars 1964, toast 2192, motion 2223
- **Warning** this region is shared by every page. Changing it is a repo-wide edit — justify it before starting.

---

## 19. Schedules calendar
- **Route** `#/schedules` (not `#/calendar` — that is the Google connection settings page)
- **app.js** `showSchedules` **2736**; region **2099–2789**. `buildScheduleItems` 2168, `indexScheduleItems` 2279, `scheduleItemHref` 2139, `renderSchedulesMonth` 2503, `schedcalCellHtml` 2348, `schedcalBandsHtml` 2398, `openScheduleDay` 2658, `handleSchedulesGridKey` 2692, `cleanupSchedules` 2718
- **calendar.js** `monthGrid` (42 cells, always), `eventSpan` (production stage → its Monday–Sunday week), `assignLanes` (one lane per band, agreed across every cell it covers), `weekdayIndex`, `addMonths`, `monthRange`
- **HTML** `#viewSchedules` **1305**, month bar `#schedcalMonthbar` **1477**, day sheet `#schedcalSheet` **1493** (both outside `<main>`, so neither is ever inside a hidden view)
- **Month bar** the `< >` keys are a fixed bar at the foot of the screen, not chrome beside the title — paging months is the one thing you do repeatedly here and it was the furthest control from a thumb. It is a real bar, so it joins `syncBottomBar`, publishes `--bottombar-h`, and `body.has-schedcal-monthbar` spends that height as page padding. Shown by `showScheduleMonthbar` 2680
- **CSS** `pages.css` 3434+ (`.schedcal-*`). A day is a **physical key**: carrying something → a raised cream key; in the month but empty → the same key unpopped, its face sunk to the bottom of the box; outside the month → no key, only the ledger. Reading a month is reading a relief
- **Week bands** are drawn **once per week row** (`schedcalBandsHtml`), positioned by `grid-column`, not as a strip inside each of seven cells. A production date means its whole Monday–Sunday week and the grid is Monday-first, so a band *is* a row-level object. That is what lets the cells carry real 3px gutters — the earlier per-cell version had to drop every vertical rule to keep its bands continuous, and lost the grid with it
- **Fixed geometry** every week reserves its three lane tracks and closes with a 1px rule whether or not anything is in them, so skeleton, ready, empty, and every month are all exactly the same height
- **Data** joined in the browser from four sources — `db.listAllOrderEvents`, `db.listCustomers` (weddings + follow-ups), `db.listAllOrders` (payment dates), `db.listAllFittingSessions` (tap target). Loaded once per visit; every month change is local, so paging costs no request
- **Tap targets** production stage with a session → its fitting log; without one → `#/order/:id/fitting/new?stage=…`; design rows and payments → the order; wedding and follow-up → the customer
- **Note** month-precision weddings are stored as the last day of the month, so they are named in a paper note **below** the grid (`.schedcal-note`) and never drawn on a cell. Below, not above, so the calendar starts in the same place in every month

## 20. Quotations & invoices lists
- **Routes** `#/quotations` and `#/invoices` — one view (`#viewDocuments`) parameterised by kind
- **app.js** `showDocuments` **3721**; region **3383–4149**. `documentCardHtml` 3410, `renderDocumentFeed` 3093, `startDocumentFirstPage` 3149, `loadMoreDocuments` 3180, `parkDocuments` 3237, `openDocumentPicker` 3447, `generateDocumentFor` 3535
- **HTML** `#viewDocuments` **1373**, picker `#docnewSheet` **1456**
- **CSS** `pages.css` 4130+ (`.doclist-*`), picker in `shared.css` 2285+ (`.docnew*` — utility chrome, not ledger canvas). The search block is `.fitlog-search`, reused rather than copied
- **The card is the fitting-log card**, deliberately: same 14/20 700 name pair, same right-aligned coloured kind text in place of the stage, same `--home-white-dark` rail with grid borders. The kind's green and blue are **ink, never a fill** — they are rail twins, and the canvas has no pill-shaped tags. A coloured rail would also say nothing on a route where every row is one kind
- **Data** `db.listDocumentFeed({kind, …})` (cursor paging, server-side `ilike`) · view `document_feed` · `db.logDocument` on create
- **The amount shown is the logged `total`, never recomputed** from the order's current items — see [14](#14-quotation--invoice-documents) and `document_log` in [DATABASE.md](DATABASE.md)
- **Create flow** New → pick customer → pick order → `docs.download` → `db.logDocument` → status advances via `advancedStatus` (forward only). Readiness comes from `documentReadiness`, shared with the order page so the two can never disagree
- **Entry points** The homepage Quotation and Invoice shortcuts link to `#/quotations?new=1` / `#/invoices?new=1`; `showDocuments` opens the picker and strips the flag from the hash. The kind therefore always comes from the route, never from whichever feed was last looked at
- **The picker is not only for documents** `picker.mode` is `quotation | invoice | moodboard | neworder`, set by whoever opens the sheet, never read off the feed's kind. quotation/invoice run both steps and generate; moodboard runs both steps and navigates to `#/order/:id/moodboard`, skipping the `documentReadiness` gate because a moodboard is anchored to an order rather than rendered from its items; `neworder` stops after the customer step and goes to `#/customer/:id/order/new/edit` (`pickDocumentCustomer` returns early, so `listOrders` is never called). Named `neworder` because `picker.step` already spends the word `order`
- **A customer with no orders is no longer a dead end** Every order step offers **Add new order**, which leads to `#/customer/:id/order/new/edit` — the same order editor the edit route opens, so `db.createOrder` runs through `saveOrder` and inherits its history entry and schedule rebuild. Nothing is written until Save
