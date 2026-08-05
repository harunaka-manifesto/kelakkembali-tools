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
| caption edit, replace photo, delete photo | [10](#10-fitting-photo-editor) |
| add photos, batch captions, staged delete, undo, 20-photo cap | [11](#11-add-fitting-photos-batch-review) |
| camera, capture, journal, Drive upload | [12](#12-fitting-journal--camera) |
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
- **CSS** `pages.css` 76–660 (hero 133, nav bar 177, shortcuts 240, submissions bar 294, search 342, ledger 367, skeleton 534, error 614)
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
- **Route** `#/order/:id/edit`
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
- **Route** `#/fittings/:sessionId`
- **app.js** `showFittingLogDetail` **2601**; region **2137–2668**. `renderFittingDetail` 2261, `fittingDetailCardHtml` 2189, `shareFittingPhoto` 2364, `fittingPhotoBlob` 2308, `openFittingPhotoViewer` 2499, `addFittingDetailPhoto` 2546, `deleteFittingDetailLog` 2562, `setupFittingDetailListeners` 2881
- **HTML** `#viewFittingDetail` **355–411**, `#fittingPhotoViewer` 1306, `#fitdetBar` 1314, `#fitdetPhotoInput` 408
- **CSS** `pages.css` `.fitdet-*` 2667–2977 (photo cards 2667, actions 2753, bottom bar 2804, delete block 2868, viewer 3163)
- **Data** `db.getFittingSession`, `db.listFittingPhotosBySession`, `db.driveGetFittingPhoto`, `db.updateFittingSession`, `db.deleteFittingSession` · tables `fitting_sessions`, `fitting_photos`

## 9. Fitting log PDF
- **Entry** `fitting-pdf.js` (whole file, 290 lines — **pure geometry**)
- **app.js** `downloadFittingPdf` **2415** (resolves images, owns busy UI and save), `measureImage` 2337, `blobToDataUrl` 2328, `fittingShareFilename` 2346
- **Data** `google-drive` action `get_fitting_photo { photo_id }` — resolves the Drive id server-side
- **Do not** add DB, Drive, toast, or save calls to `fitting-pdf.js`

## 10. Fitting photo editor
- **Route** `#/fittings/:sessionId/photo/:photoId/edit`
- **app.js** `showFittingPhotoEditor` **2843**; region **2669–2983**. `renderFittingEditor` 2685, `stageFittingReplacement` 2713, `saveFittingEditor` 2735, `deleteFittingEditorPhoto` 2800, `fittingEditorDirty` 2674, `cleanupFittingEditor` 2831
- **HTML** `#viewFittingPhotoEdit` **416–474**, `#fiteditBar` 1328
- **CSS** `pages.css` `.fitedit-*` 2912–2977
- **Data** `db.updateFittingPhoto`, `db.deleteFittingPhoto`, `db.driveSaveFittingPhoto` · table `fitting_photos`
- **Note** upload first, write once — the old record and image stay usable until the new one lands

## 11. Add fitting photos (batch review)
- **Route** `#/fittings/:sessionId/photos/add?source=feed|order` — reached from Add photos on fitting-log detail, which opens the native multi-select gallery sheet first and only navigates once a file comes back
- **app.js** `showFittingPhotoAdd` **3821**; region **2984–3947**. `renderFittingPhotoAdd` 3383, `runAddPreparationQueue` 3115, `patchAddDraftCard` 3453, `openAddEditor` 3504, `saveAddEditor` 3535, `deleteAddCard` 3551, `undoAddDeletion` 3208, `saveFittingPhotoAdd` **3615**, `startAddBackups` 3736, `seedFittingPhotoAdd` 3803, `cleanupFittingPhotoAdd` 3793, `setupFittingPhotoAddListeners` 3893
- **HTML** `#viewFittingPhotoAdd` **482–516**, `#fitaddFileInput` 513, `#fitaddUndo` 1340, `#fitaddBar` 1347, and `#fitdetPhotoInput` 408 on the detail page
- **CSS** `pages.css` `.fitadd-*` 2978–3162 (4:3 stage 2985, inline caption editor 3049, undo toast 3081, skeletons 3127); cards, actions and the bottom bar reuse `.fitdet-*` 2667+
- **Data** **`db.saveFittingPhotoBatch(sessionId, captionUpdates, deleteIds, newPhotos)`** → RPC `save_fitting_photo_batch` · table `fitting_photos`. Also `db.getFittingSession`, `db.getOrder`, `db.getCustomer`, `db.listFittingPhotosBySession` on direct entry
- **Image prep** `KK.fittings.prepareImage` — 2560px longest edge, quality 0.90, one file at a time
- **Invariants** nothing is written until Save changes; captions, deletions and additions apply in **one transaction**; a staged existing-photo deletion offers a 5s Undo and never touches its Drive archive copy; the log caps at **20** photos, enforced again in the RPC; Drive backup runs **after** the commit through `KK.fittings.backupPhoto`, never before

## 12. Fitting journal & camera
- **Routes** `#/order/:id/fitting/new`, `#/order/:id/fitting/:sessionId` (dispatch at `handleRoute` 874/877)
- **Entry** `fittings.js` (whole file, 731 lines)
- **HTML** `#viewFittingJournal` **1246–1249**, overlays **1278–1374** (`#fittingCamera`, `#fittingConfirm`, `#fittingCaptionStep`, `#fittingPicker`, `#fittingEditSheet`)
- **CSS** `moodboard.css` fitting journal 502–581
- **Data** `db.createFittingSession`, `db.createFittingPhoto`, `db.driveSaveFittingPhoto` · tables `fitting_sessions`, `fitting_photos`
- **Invariant** never complete a session without awaiting `fittings.waitForSessionBackups`

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
- **app.js** `showSchedules` **2294**; region **1722–2348**. `buildScheduleItems` 1791, `indexScheduleItems` 1902, `scheduleItemHref` 1762, `renderSchedulesMonth` 2069, `schedcalCellHtml` 1962, `openScheduleDay` 2216, `handleSchedulesGridKey` 2250, `cleanupSchedules` 2276
- **calendar.js** `monthGrid` (42 cells, always), `eventSpan` (production stage → its Monday–Sunday week), `assignLanes` (one lane per band, agreed across every cell it covers), `weekdayIndex`, `addMonths`, `monthRange`
- **HTML** `#viewSchedules` **1293**, day sheet `#schedcalSheet` **1457** (outside `<main>`, so it is never inside a hidden view)
- **CSS** `pages.css` 3364+ (`.schedcal-*`). The grid deliberately has **no vertical rules**: a 1px separator between cells would cut every week band into seven pieces
- **Data** joined in the browser from four sources — `db.listAllOrderEvents`, `db.listCustomers` (weddings + follow-ups), `db.listAllOrders` (payment dates), `db.listAllFittingSessions` (tap target). Loaded once per visit; every month change is local, so paging costs no request
- **Tap targets** production stage with a session → its fitting log; without one → `#/order/:id/fitting/new?stage=…`; design rows and payments → the order; wedding and follow-up → the customer
- **Note** month-precision weddings are stored as the last day of the month, so they are named in a banner above the grid and never drawn on a cell

## 20. Quotations & invoices lists
- **Routes** `#/quotations` and `#/invoices` — one view (`#viewDocuments`) parameterised by kind
- **app.js** `showDocuments` **3279**; region **2941–3707**. `documentCardHtml` 2968, `renderDocumentFeed` 3093, `startDocumentFirstPage` 3149, `loadMoreDocuments` 3180, `parkDocuments` 3237, `openDocumentPicker` 3447, `generateDocumentFor` 3535
- **HTML** `#viewDocuments` **1360**, picker `#docnewSheet` **1439**
- **CSS** `pages.css` 3871+ (`.doclist-*`), picker in `shared.css` 2279+ (`.docnew*` — utility chrome, not ledger canvas). The search block is `.fitlog-search`, reused rather than copied
- **Data** `db.listDocumentFeed({kind, …})` (cursor paging, server-side `ilike`) · view `document_feed` · `db.logDocument` on create
- **The amount shown is the logged `total`, never recomputed** from the order's current items — see [14](#14-quotation--invoice-documents) and `document_log` in [DATABASE.md](DATABASE.md)
- **Create flow** New → pick customer → pick order → `docs.download` → `db.logDocument` → status advances via `advancedStatus` (forward only). Readiness comes from `documentReadiness`, shared with the order page so the two can never disagree
- **Known gap** `db.createOrder` has zero call sites, so a customer with no orders is a real dead end. The picker says so plainly rather than pretending otherwise
