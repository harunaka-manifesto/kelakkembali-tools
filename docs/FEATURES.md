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
| camera, capture, journal, Drive upload | [11](#11-fitting-journal--camera) |
| moodboard, mosaic, canvas, zoom | [12](#12-moodboard) |
| quotation, invoice, watermark, PDF layout | [13](#13-quotation--invoice-documents) |
| Tally, enquiry, intake | [14](#14-intake--enquiry-review) |
| Google Calendar, sync, connect | [15](#15-google-calendar) |
| sign in, gate, boot, session | [16](#16-auth-gate--boot) |
| app bar, toast, save bar, route loader | [17](#17-shared-chrome) |

---

## 1. Homepage & customer ledger
- **Route** `#/`
- **app.js** `showCustomers` **1339**; region **1165–1477**. Also `renderCustomerList` 2947, `homepageStatus` 2971, `compareHomepageCustomers` 2991, `nextDeadline` 3011
- **HTML** `#viewCustomers` **117–175**
- **CSS** `pages.css` 76–660 (hero 133, nav bar 177, shortcuts 240, submissions bar 294, search 342, ledger 367, skeleton 534, error 614)
- **Data** `db.listCustomers`, `db.listAllOrders`, `db.listAllOrderEvents`, `db.listIntake('new')` · tables `customers`, `orders`, `order_events`, `intake_submissions`

## 2. Customer detail
- **Route** `#/c/:id`
- **app.js** `showCustomerDetail` **3049**, `renderCustomerDetail` 3158, `renderCustomerReadOnly` 3118, `custNextEvent` 3128, `custOrderStatus` 3150
- **HTML** `#viewCustomer` **183–277**
- **CSS** `pages.css` 661–993 (hero 753, banners 771, order ledger 851)
- **Data** `db.getCustomer`, `db.listOrders` · tables `customers`, `orders`, `order_events`

## 3. Customer editor
- **Route** `#/c/:id/edit`
- **app.js** `showCustomerEdit` **3074**, `fillCustomerForm` 3195, `saveCustomer` **3240**, `setWeddingPrecision` 3220, `setNameError` 3212, `lastDayOfMonth` 3233. Lifecycle helpers 640–762: `setFollowUp` 681, `pushFollowUp` 691, `cancelCustomer` 705, `deleteCustomerRecord` 725, `reopenCustomer` 742
- **HTML** `#viewCustomerEdit` **470–679**
- **CSS** `pages.css` 994–1349 (error 1157, status actions 1193, save bar 1250); fields/chips in `shared.css` 1474, 1753
- **Data** `db.updateCustomer`, `db.createCustomer`, `db.deleteCustomer`, `db.syncFollowUp` · table `customers`

## 4. Order detail
- **Route** `#/o/:id`
- **app.js** `showOrderDetail` **3644**; region **3312–3880**. `buildOrderDetailViewModel` 3459, `renderOrderPayments` 3538, `renderOrderSchedule` 3572, `refreshOrderPayments` 3709, `refreshOrderSchedule` 3743, `logDeposit` 4857, `deriveLoggedDeposits` 3404
- **HTML** `#viewOrder` **780–1017**
- **CSS** `pages.css` 1350–2112 (ledger 1468, cards 1501, designs 1534, items 1614, payments 1665, schedules 1743, actions 1897, skeleton 1995, error 2042)
- **Data** `db.getOrder`, `db.listOrderEvents`, `db.listDocumentLog`, `db.listOrderHistory`, `db.logOrderHistory`, `db.listFittingSessions`, `db.listFittingPhotos` · tables `orders`, `order_events`, `document_log`, `order_history`

## 5. Order editor & cost calculator
- **Route** `#/o/:id/edit`
- **app.js** region **3881–4277**. `saveOrder` **3951**, `readItems` 4074, `addItemRow` 4010, `refreshItemTotals` 4039, `readTerms` 4159, `buildTerms` 4184, `validateTerms` 3996, `syncSchemeCard` 4194, `applyCostCalc` 4269, `closeCostCalc` 4253
- **HTML** `#viewOrderEdit` **681–774**, `#calcSheet` **1302–1340**
- **CSS** `shared.css` item rows 1586, payment terms 1689, chips 1753, cost sheet 2052, cost calc trigger 2158
- **Data** `db.updateOrder`, `db.createOrder`, `db.logOrderHistory` · table `orders` (`items`, `includes`, `payment_terms`, `payment_scheme` jsonb)

## 6. Fitting schedule computation
- **Entry** `calendar.js` — `computeSchedule`, `computeDesign`, `computeProduction`, `DROP_ORDER`, `plannedWeek` (whole file, 356 lines — **pure, tested**)
- **app.js** `orderScheduleModel` **3414**, `rescheduleOrder` **3844**, `renderScheduleHint` 3809, `retryOrderSchedule` 3782
- **CSS** `shared.css` schedule 1117; `pages.css` schedules 1743
- **Data** `db.replaceOrderEvents` (preserves `google_event_id` per stage), `db.syncOrderCalendar` · table `order_events`
- **Gate** changes here must pass `node --test tests/pure-modules.test.cjs`

## 7. Fitting logs feed
- **Route** `#/fittings`
- **app.js** `showFittingLogs` **1986**; region **1478–2061**. `fittingCardHtml` 1527, `renderFittingFeed` 1683, `startFittingFirstPage` 1743, `loadMoreFittingLogs` 1776, `fittingRequestArgs` 1714, `parkFittingLogs` 1843, `cleanupFittingLogs` 1816
- **HTML** `#viewFittingLogs` **288–345**
- **CSS** `pages.css` 2113–2652 (`.fitlog-*`: title band 2153, search 2189, stage filters 2249, feed 2324, panels 2434, skeletons 2478, card link 2552)
- **Data** `db.listFittingLogs(options)` (cursor paging) · view `fitting_log_feed` — search and stage filtering happen in the view, never client-side

## 8. Fitting log detail
- **Route** `#/fittings/:sessionId`
- **app.js** `showFittingLogDetail` **2523**; region **2062–2580**. `renderFittingDetail` 2181, `fittingDetailCardHtml` 2109, `shareFittingPhoto` 2284, `fittingPhotoBlob` 2228, `openFittingPhotoViewer` 2407, `addFittingDetailPhoto` 2453, `endFittingDetailSession` 2461, `deleteFittingDetailLog` 2484, `setupFittingDetailListeners` 2818
- **HTML** `#viewFittingDetail` **355–399**, `#fittingPhotoViewer` 1255, `#fitdetBar` 1263
- **CSS** `pages.css` `.fitdet-*` 2653–2938 (photo cards 2653, actions 2739, bottom bar 2790, viewer 2887)
- **Data** `db.getFittingSession`, `db.listFittingPhotosBySession`, `db.driveGetFittingPhoto`, `db.updateFittingSession`, `db.deleteFittingSession` · tables `fitting_sessions`, `fitting_photos`

## 9. Fitting log PDF
- **Entry** `fitting-pdf.js` (whole file, 290 lines — **pure geometry**)
- **app.js** `downloadFittingPdf` **2338** (resolves images, owns busy UI and save), `measureImage` 2260, `blobToDataUrl` 2251, `fittingShareFilename` 2269
- **Data** `google-drive` action `get_fitting_photo { photo_id }` — resolves the Drive id server-side
- **Do not** add DB, Drive, toast, or save calls to `fitting-pdf.js`

## 10. Fitting photo editor
- **Route** `#/fittings/:sessionId/photo/:photoId/edit`
- **app.js** `showFittingPhotoEditor` **2757**; region **2581–2890**. `renderFittingEditor` 2597, `stageFittingReplacement` 2625, `saveFittingEditor` 2649, `deleteFittingEditorPhoto` 2714, `fittingEditorDirty` 2586, `cleanupFittingEditor` 2745
- **HTML** `#viewFittingPhotoEdit` **404–460**, `#fiteditBar` 1276
- **CSS** `pages.css` `.fitedit-*` 2845–2938
- **Data** `db.updateFittingPhoto`, `db.deleteFittingPhoto`, `db.driveSaveFittingPhoto` · table `fitting_photos`
- **Note** upload first, write once — the old record and image stay usable until the new one lands

## 11. Fitting journal & camera
- **Routes** `#/o/:id/fitting/new`, `#/o/:id/fitting/:sessionId` (dispatch at `handleRoute` 813/816)
- **Entry** `fittings.js` (whole file, 696 lines)
- **HTML** `#viewFittingJournal` **1195–1198**, overlays **1227–1298** (`#fittingCamera`, `#fittingConfirm`, `#fittingCaptionStep`, `#fittingPicker`, `#fittingEditSheet`)
- **CSS** `moodboard.css` fitting journal 502–581
- **Data** `db.createFittingSession`, `db.createFittingPhoto`, `db.driveSaveFittingPhoto` · tables `fitting_sessions`, `fitting_photos`
- **Invariant** never complete a session without awaiting `fittings.waitForSessionBackups`

## 12. Moodboard
- **Routes** `#/m/:id`, `#/m/:id/preview`
- **Entry** `moodboard.js` (whole file, 724 lines)
- **app.js** region **4278–4687**: `setupMoodboardListeners` 4298, `addMoodboardFiles` 4395, `openMoodboardCanvas` 4430, `openMoodboardOverlay` 4487, `bindMoodboardOverlayGestures` 4592, `moodboardZoomAt` 4548; export `exportMoodboard` **4755**, `recordMoodboardExport` 4723
- **HTML** `#viewMoodboard` **1053–1193**, moodboard document **1578–1599** (locked spec)
- **CSS** `moodboard.css` (editor 8, canvas 264, actions 352, overlay 437, document 582)
- **Data** `db.driveSaveMoodboardPdf`, `db.logMoodboard`, `db.countMoodboards` · table `document_log` (kind `moodboard`)

## 13. Quotation & invoice documents
- **Entry** `docs.js` (whole file, 353 lines)
- **app.js** `downloadDocument` **4825**, `setDocumentBusy` 4808
- **HTML** `#quotation` **1412–1500**, `#invoice` **1501–1577** — **locked spec, 1:1 with Figma, do not edit without an explicit request**
- **CSS** `documents.css` (header 84, items 182, includes/excludes 254, terms 298, signature 351, invoice 378)
- **Data** `db.logDocument(orderId, kind, total)` · table `document_log`
- **Background** rationale lives in `README.md` §"The design contract" — seek via [README-INDEX.md](README-INDEX.md), do not read the file

## 14. Intake / enquiry review
- **Route** `#/e/:id`
- **Entry** `supabase/functions/intake/index.ts` (211 lines) for the webhook
- **app.js** `readableAnswer` **2891**, `acceptEnquiry` 2902, `dismissEnquiry` 2933
- **HTML** `#viewEnquiry` **1200–1225**
- **Data** `db.listIntake`, `db.getIntake`, `db.resolveIntake` · table `intake_submissions`
- **Invariant** `payload` is the record; the columns are convenience. `source` is unconstrained so a stranger's answer can never reject the insert

## 15. Google Calendar
- **Route** `#/calendar`
- **Entry** `supabase/functions/google-calendar/index.ts` (550 lines, actions at 517–539)
- **app.js** `showCalendarSettings` **3909**, `connectGoogle` 3890, `disconnectGoogle` 3937, `googleRedirectUri` 3888, `offerGoogleReconnect` 4748
- **HTML** `#viewCalendar` **1019–1051**
- **Data** `db.googleStatus/Exchange/Disconnect/Forget`, `db.syncOrderCalendar`, `db.syncFollowUp` · tables `google_credentials` (service-role only), `order_events.google_event_id`

## 16. Auth gate & boot
- **app.js** `showGate` **5305**, `showApp` 5322, boot region **5352–5402**
- **HTML** `#boot` **27–33**, `#gate` **34–56**
- **CSS** `shared.css` boot 5, gate 300
- **Data** `db.init`, `db.currentSession`, `db.signIn`, `db.signOut`, `db.refreshSession`, `db.isStaleToken`, `db.savedPassword`; `config.js`

## 17. Shared chrome
- **app.js** region **350–609**: `showToast` 352, `setDirty` 359, `setSaveBar` 406, `setPageAction` 412, `setChrome` 420, `closeMenu` 455, `beginRouteLoader` 514, `showRouteError` 558, `focusRoute` 581. All listeners in `bindEvents` **4960**
- **HTML** app bar **60–115**, `#savebar` 1289, `#routeLoader` 1341, `#toast` 1410
- **CSS** `shared.css` app bar 361, overflow menu 466, page header 514, buttons 1851, bottom bars 1964, toast 2192, motion 2223
- **Warning** this region is shared by every page. Changing it is a repo-wide edit — justify it before starting.
