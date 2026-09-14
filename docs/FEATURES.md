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
| penjahit, production, assignment, job, sewing cost, outstanding, credit | [21](#21-penjahit-production-ledger) |
| mark customer done, swipe right, swipe left, delete from list | [1](#1-homepage--customer-ledger), [18](#18-shared-chrome) |
| keyboard, save bar covering a field, bottom CTA position | [18](#18-shared-chrome) |
| required field, inline error, form validation, "Saved" label | [22](#22-shared-form-validation) |

---

## 1. Homepage & customer ledger
- **Route** `#/`
- **app.js** `showCustomers` **1414**; region **1240–1552**. Also `renderCustomerList` 4004, `homepageStatus` 4028, `compareHomepageCustomers` 4048, `nextDeadline` 4068
- **HTML** `#viewCustomers` **117–175**
- **CSS** `pages.css` 76–690 (atmosphere 113, hero 205, nav bar 249, shortcuts 312, submissions bar 366, search 414, ledger 439, skeleton 606, error 686)
- **Time field** the picture behind the greeting: five drifting colour fields under a fixed 9px pixel grid, plus a contrast band that keeps the hero text legible whatever drifts under it. `transform`-only motion, so it is compositor work and nothing else. Built by `buildHomepageAtmosphereScene` 1525, phase tokens at 1408, full spec in [HOMEPAGE-TIME-FIELD-SPEC.md](../HOMEPAGE-TIME-FIELD-SPEC.md) — **re-measure contrast before changing any palette**
- **Shortcuts** **3 + 3, every tile 76px.** Customer (orange, the slot and colour Schedule used to hold), Order (neutral, opens the picker in `neworder` mode), Quotation (`?new=1`), then Invoice (`?new=1`), Moodboard (violet) and Fitting (pink). Moodboard and Order are `<button>`s because neither knows its destination until something is picked; Fitting is an `<a>` to the list whose click handler opens the picker instead, so the shortcut makes a log while the list stays reachable from the menu. One `repeat(3, 1fr)` grid, one section
- **76px, not 98px.** Seven shortcuts at 98px pushed the ledger off a 390px screen entirely. The label is what is read, so the icon shrank to 20px and the padding went — the type did not
- **Every shortcut carries its own icon**, and a test enforces it. Customer, Order and Assign to penjahit all used `home-add-icon.svg`, which made the three most-used of them the three hardest to tell apart. They are now `home-customer-icon` (person), `home-order-icon` (tag) and `home-penjahit-icon` (scissors); the plus is left where a plus belongs, on the "+ Add" controls inside a page
- **Above the six, full width: Assign to penjahit** — a 56px **row**, not a seventh tile: left-aligned icon, label, and a right chevron. The six are categories you land in; this one is a flow you start, and the shape says so before the label does. Same face, rail, and press. Hidden until the production probe answers; see [21](#21-penjahit-production-ledger)
- **Schedule has no entry points left.** No tile, no menu item, no link into the calendar from the customer page — `#custNextBanner` is a plain `<div>` now, like the wedding banner beside it. `#/schedules` still routes, and every schedule computation, `order_events` row, and fitting date is untouched: this is a door being closed, not a room being demolished
- **Adding a customer is in two places, deliberately** the Customer tile, and the last row of the ledger, which `renderCustomerList` renders for a full list as well as an empty one and seeds with whatever is in the search field. The ledger row is the one that can be found by looking; the tile is the one that is already under a thumb
- **`SHOW_FITTING_SHORTCUT`** (app.js, near the domain constants) is the one thing to flip to stand the Fitting tile down again. It sets the tile's `hidden` **and** `body.has-fitting-shortcut`; with it off the second row is Moodboard and Add order, and Moodboard takes the spare column and inherits Fitting's pink so the row is never a colour short. Fittings themselves do not depend on it: `#/fittings`, the order page's fitting entry, and scheduled appointments all work either way
- **Skeleton parity** `.home-skel__actions` must stay the exact size of the real row: 152px for the six, 208px once `body.has-production` adds the assignment row. The production placeholder is **last in the markup and `order: -1` in CSS**, so the six keep the `nth-child` positions the fitting-flag rules count on. A skeleton that is the wrong size makes the page jump as it loads, which is the same fault as any other layout shift
- **Ledger tabs** Customers and Penjahit (`#/customers?tab=penjahit`), both hidden until the production probe answers, each carrying its own count. One search field serves both: `syncLedgerTab` swaps the placeholder and parks the outgoing tab's query in `state.production.search`, and `state.production.scroll` returns each tab to where it was left. The penjahit ledger reuses `.home-customer-*` wholesale — same summary rail, same grid rules, same add row at the foot of the list
- **Both tabs share one scroll position.** `switchLedgerTab` keeps `window.scrollY` and gives the incoming list a `min-height` equal to the outgoing one's, so a shorter list cannot let the browser clamp the page upward — the tabs never move under the finger that tapped them. The hold is cleared on the next homepage load
- **Swipe right on a customer marks them done** — `toggleCustomerDone`, writing `customers.completed_at`. `homepageStatus` ranks a done customer 6, below Cancelled, so they drop to the foot of the ledger labelled "Done". Swiping a done customer right again offers Undo. Swipe left still deletes. Penjahit rows swipe left to delete and have no leading action
- **The penjahit card is the customer card span for span.** `.home-customer-card__meta` lays out `span:first-child` at 120px and `span:last-child` flush right; a `<strong>` in the second slot is what stranded the amount beside its label. There is no "Show archived" toggle any more — archived penjahit are always listed, last, badged "Archived"
- **Switching tabs is not a navigation.** `switchLedgerTab` moves the hash with `history.replaceState` — which fires no `hashchange` and so reaches no router — then swaps the two sections and renders. Routing to do it cost a full route change, four refetched queries and the homepage skeleton, to show a list that was already in memory. The rows are fetched once per homepage visit by `loadPenjahitLedger`, and the tab nobody is looking at is fetched in the background after the page paints, so the first switch is a render. A test asserts the handler never routes
- **The selected tab is a folder tab**, not a filled block: it wears the cream of the search band below it and its bottom edge is open into it, so tab and content read as one surface and the other tab reads as behind it. White-fill-versus-black-fill gave two equally loud blocks and no way to tell which was in front
- **Narrow phones** the homepage empty-state button sets `width: auto` — `.btn--block`'s `width: 100%` plus its own 24px side margins put it 24px past the right edge and gave the whole page horizontal scroll
- **Swipe a row left to reveal Delete.** `swipeRowHtml` wraps each card in a `.swipe`; the gesture is one delegated listener in `bindSwipeRows`, shared with the customer page's order list. Deleting happens in place — the row leaves, the summary re-counts, and you keep your scroll and your search. See [18](#18-shared-chrome)
- **Data** `db.listCustomers`, `db.listAllOrders`, `db.listAllOrderEvents`, `db.listIntake('new')` · tables `customers`, `orders`, `order_events`, `intake_submissions`

## 2. Customer detail
- **Route** `#/customer/:id`
- **app.js** `showCustomerDetail` **4106**, `renderCustomerDetail` 4215, `renderCustomerReadOnly` 4175, `custNextEvent` 4185, `custOrderStatus` 4207
- **HTML** `#viewCustomer` **183–277**
- **CSS** `pages.css` 661–993 (hero 753, banners 771, order ledger 851)
- **Data** `db.getCustomer`, `db.listOrders` · tables `customers`, `orders`, `order_events`
- **Delete customer sits at the very bottom**, past everything the customer is, in the editor's `.custedit-danger` idiom rather than a second one. The app-bar menu offers it too, but a menu is not an affordance you find. Each order row also swipes left to a Delete of its own — see [18](#18-shared-chrome)
- **The order list always ends with `+ Add an order`**, in both the populated and the empty branch, exactly as the ledger ends with `+ Add a customer`. It never had one: a customer with no orders read "No orders for this customer yet." and offered nothing, and the only route to `#/customer/:id/order/new/edit` was the homepage Add order tile. Same `.btn--empty` treatment, shared with the ledger's row rather than copied

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
- **Delete order sits at the very bottom**, above the footer, same idiom and same place as the customer page's. `deleteOrderRecord` is shared with the app-bar menu item, which used to hold the only copy of that code inline
- **Data** `db.getOrder`, `db.listOrderEvents`, `db.listDocumentLog`, `db.listOrderHistory`, `db.logOrderHistory`, `db.listFittingSessions`, `db.listFittingPhotos` · tables `orders`, `order_events`, `document_log`, `order_history`

## 5. Order editor & cost calculator
- **Route** `#/order/:id/edit`, and `#/customer/:id/order/new/edit` for one that does not exist yet — `route.id` is the string `"new"` and `route.customerId` carries whose it will be. `state.order` comes from `NEW_ORDER_TEMPLATE` instead of the database and the Delete order menu item is withheld; the form below it fills identically, and `saveOrder` branches on `state.order.id` alone
- **app.js** region **3881–4277**. `saveOrder` **5008**, `readItems` 5131, `addItemRow` 5067, `refreshItemTotals` 5096, `readTerms` 5216, `buildTerms` 5241, `validateTerms` 5053, `syncSchemeCard` 5251, `applyCostCalc` 5326, `closeCostCalc` 5310
- **HTML** `#viewOrderEdit` **681–774**, `#calcSheet` **1302–1340**
- **CSS** `shared.css` item rows 1586, payment terms 1689, chips 1753, cost sheet 2052, cost calc trigger 2158
- **Ledger skin** the whole editor and its cost sheet are re-skinned under `body.is-ordereditpage` (`pages.css`, end of file), set by the `orderedit` chrome flag. It is CSS only: the JS builds `.item` / `.term` / `.chip` with `.js-*` hooks and never queries a presentational class, so no template string was rewritten to change how any of this looks. **Scope every rule with the page class** — `shared.css` loads *after* `pages.css`, so a bare `.calcsheet` or `.card` rule here loses to its shared counterpart on source order
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
- **The New key is live.** `#fitlogNewBtn` opens the document picker in `fitting` mode — customer, then order, then the stage question the `fittingNew` route already asks. It sat disabled for as long as "a fitting needs an order context" was true and there was nothing here that could supply one

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
- **Entry** `KK.fittings.showStagePicker` when no `?stage` is given; `#fittingPicker` **1438** is the only fitting overlay left. Reached from the order page, from an order-page schedule row and a calendar appointment (both with `?stage=`, so the overlay is skipped), and from the fitting feed's New key through the picker
- **`?from=fittings`** says the log was started on the feed rather than an order, and decides three things: the up-link label, where Cancel returns, and whether the workspace URL carries `source=order`. `source` is already strictly binary — anything that is not `"order"` reads as `"feed"` — so the feed case omits it instead of adding a third value for every downstream branch to learn
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
- **The curtain reads.** `#bootPanel` carries a line from `quotes.js` — a wedding or fashion fact, a joke in English or Indonesian, or a greeting that matches the hour, the part of the month and the day of the week. `startBootQuotes` runs it **before** the session check, which is most of the wait, and rotates every 5.2s so a slow connection is not one sentence for a minute
- **The loading signal is a sheen** travelling through the glyphs of that line, `@keyframes boot-sheen`, looping until the app arrives. It is painted with `background-clip: text` behind an `@supports` guard — unguarded, a browser without it would render a blank curtain. Reduced motion keeps the words and drops the light
- **First boot only.** The same curtain covers every route change for 300ms, and copy that appears and vanishes that fast is noise, so `revealCurtain` retires the panel for good the first time it comes down
- **Data** `db.init`, `db.currentSession`, `db.signIn`, `db.signOut`, `db.refreshSession`, `db.isStaleToken`, `db.savedPassword`; `config.js`

## 18. Shared chrome
- **app.js** region **401–669**: `showToast` 403, `setDirty` 410, `setSaveBar` 458, `setPageAction` 464, `setChrome` 472, `closeMenu` 507, `beginRouteLoader` 572, `showRouteError` 616, `focusRoute` 639. All listeners in `bindEvents` **6017**
- **HTML** app bar **60–115**, `#savebar` 1365, `#routeLoader` 1417, `#toast` 1539
- **CSS** `shared.css` app bar 361, overflow menu 466, page header 514, buttons 1851, bottom bars 1964, toast 2192, motion 2223
- **The form save bar does not ride the keyboard; every other fixed bottom bar does.** `.savebar` (customer editor, order editor, penjahit editor, and the assignment wizard's `#productionBar`, which wears it) has `transform: none` — riding the keyboard put it on top of the field that had just taken focus. `.actionbar`, `.fitdet-bar` (which `#fitaddBar` wears), `.fitadd-undo`, `.schedcal-monthbar` and the `.toast` still carry `--keyboard-offset`. Two tests hold the line: one fails any non-save fixed bar without the offset, the other fails any `.savebar` rule that has it
- **The offset is measured against `documentElement.clientHeight`**, not `window.innerHeight` — see [CONVENTIONS.md](CONVENTIONS.md). `measureVisualViewport` is coalesced through one frame because the keyboard reports its height in several steps
- **Swipe rows open both ways.** `swipeRowHtml(card, deleteAttr, label, start)` renders the trailing Delete and, when `start` is given, a leading action revealed by swiping right (`.swipe__done`, `.is-open-start`). A flick moves one position and never skips from one side to the other. Rows without a leading action stop at rest when dragged right
- **Swipe rows** `swipeRowHtml` + `bindSwipeRows` (app.js, above the sheet-motion region; `.swipe*` in `shared.css`). `touch-action: pan-y` on the pane is what keeps the gesture out of a fight with the page: the browser keeps vertical scrolling and hands the script only the horizontal pan, so nothing has to guess what the finger meant. One axis decision per gesture, one row open at a time, `dragstart` cancelled because a mouse drag on the card's link fired `pointercancel` and killed the gesture one move in. The revealed button stays in the tab order and opens its own row on focus — a gesture nobody can discover is not an affordance
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
- **Entry points** The homepage Quotation and Invoice shortcuts link to `#/quotations?new=1` / `#/invoices?new=1`. The kind therefore always comes from the route, never from whichever feed was last looked at
- **`?new=1` always opens the picker.** It used to open only on an empty list, which made one tile mean two different things depending on how much work had been done — a creation shortcut has to create. The flag is still stripped from the hash immediately, and the sheet is still opened **after** `startDocumentFirstPage` resolves: opening earlier meant the picker focused its search field only for `focusRoute` to take focus back, raising the software keyboard and dropping it again. Cancelling reveals the list underneath, so nothing is buried, only covered
- **Sheet motion** both bottom sheets (this picker and the schedules day sheet) slide from `translateY(100%)` with the backdrop fading, in `--motion-sheet-in` and out `--motion-sheet-out`. Closing is deferred through `closeSheetElement` in app.js, which holds the element mounted for the out duration — `cancelSheetClose` on every open path is what stops a reopened sheet hiding itself a beat later, and reduced motion skips the wait entirely
- **Both picker steps offer to create what is missing** The order step's `Add new order` row has a twin on the customer step, `data-new-customer`, carrying whatever was typed into the search through to `#/customer/new/edit?name=`. Neither step is a dead end: a document needs a customer and an order, and "add one from the home page first" was an instruction to leave and come back
- **The picker is not only for documents** `picker.mode` is `quotation | invoice | moodboard | fitting | neworder`, set by whoever opens the sheet, never read off the feed's kind. quotation/invoice run both steps and generate; moodboard runs both steps and navigates to `#/order/:id/moodboard`; `fitting` runs both steps and navigates to `#/order/:id/fitting/new?from=fittings`, handing the stage question to the route that already answers it. Both of those skip the `documentReadiness` gate, because neither is rendered from the order's items — each is only anchored to it. `neworder` stops after the customer step and goes to `#/customer/:id/order/new/edit` (`pickDocumentCustomer` returns early, so `listOrders` is never called). Named `neworder` because `picker.step` already spends the word `order`
- **The sheet shows a list; it does not ask you to type.** It focuses its title, never `#docnewSearch`. Focusing the field raised the software keyboard on every open, which cut the panel to 272px and the list to its 64px floor — one customer visible out of twelve, above a keyboard nobody asked for. The field is still there, as a filter you reach for. The customer step's add row is **last** for the same reason, where `renderCustomerList` puts the ledger's; the order step keeps its own first, because adding an order is often the point of that step
- **`.docnew__list` is the scroller, not `.docnew__panel`.** Title, hint, search and actions stay pinned; only rows move. The height cap is `min(80svh, calc(100svh - var(--keyboard-offset) - 24px))`, so the sheet takes the room above the keyboard rather than 80% of a viewport the keyboard is not part of
- **Customers are refetched on every open.** `pk.customers` used to be filled once and cleared by nothing but the error-retry button, so a customer added afterwards was missing until a full reload. `db.listCustomers` is a TTL cache with epoch invalidation and `createCustomer` invalidates it, so a repeat open inside the TTL is a Map read and one after a write returns the customer that was missing
- **A customer with no orders is no longer a dead end** Every order step offers **Add new order**, which leads to `#/customer/:id/order/new/edit` — the same order editor the edit route opens, so `db.createOrder` runs through `saveOrder` and inherits its history entry and schedule rebuild. Nothing is written until Save

---

## 21. Penjahit production ledger
- **Routes** `#/production/new` (assign), `#/production/:id` (job), `#/production/:id/edit`, `#/penjahit/:id`, `#/penjahit/:id/edit`, and the `#/customers?tab=penjahit` ledger tab
- **app.js** region **7514–8540**, banner `Penjahit production ledger`. `showProductionRoute` **8034** (every production route but the homepage tab), `showProductionStep` 7781, `switchLedgerTab` 7653, `renderPenjahitLedger` 7679, `renderProductionJobs` 7740, `renderProductionJob` 8268, `bindProductionEvents` 8417. Homepage actions live with the other ledger deletes: `toggleCustomerDone` 1506, `deletePenjahitById` 1525 — full index in [MAP-app.md](MAP-app.md)
- **HTML** `#viewPenjahit` 882, `#viewPenjahitEdit` 961, `#viewProductionEdit` 1033, `#viewProductionJob` 1132, `#productionBar` 1977, `#homePenjahit` 249
- **CSS** `pages.css` 4939+ (`.production-*`, `.pstep`, `.pcard`, `.psource`, `.pjob`, `.ppay`, `.pbtn`, the ledger tabs)
- **Data** `db.productionAvailable`, `listPenjahit`, `listProductionSources`, `savePenjahit`, `deletePenjahit`, `listProductionJobs`, `listProductionPayments`, `saveProductionJobs`, `updateProductionJob`, `recordProductionPayment` · tables `penjahit`, `production_jobs`, `production_payments` · view `production_job_feed` — see [DATABASE.md](DATABASE.md)
- **There is no production design.** Pages you read (penjahit, job) are the order page: `setChrome({ productionpage: true })` hides the app bar, and the markup is `.order-nav`, `.order-ledger`, `.order-title-band`, `.order-card` and `.order-action`, with jobs listed as `.cust-order-card` records. Pages you fill in (penjahit editor, assignment wizard) are the customer editor: `setChrome({ custedit: true })`, `.cust-nav`, `.custedit-ledger`, `.custedit-title`, one `.custedit-card` per concern, the green save bar. The production CSS only adds what those two lack. A home-grown third design lived here — cream bands, the floating app bar, bordered selects, a black two-button CTA — and it read as another app
- **Everything is behind one probe.** `productionReady` asks the database once a session whether `penjahit` exists, remembers the answer in `localStorage`, and shows or stands down every `[data-production-entry]` element through `applyProductionEntries`
- **Penjahit detail**: fixed nav (back to the tab, edit icon), name and contact in the title band, a Money card with the green **Assign work** action directly under it, a job ledger (count and total in the summary rail, a five-way filter strip — Ongoing, Owed, Done, Cancelled, All — and `.cust-order-card` records showing status, customer · item, owed or credit, and deadline), then **Delete penjahit** at the bottom on the customer page's danger row. `deletePenjahitById` refuses up front for a penjahit with jobs and says to archive instead; the database's restrict foreign key refuses it too
- **Penjahit editor**: Name, Phone, Notes and an Active / Archived segmented control (`setPenjahitArchived`), each its own card. Archived penjahit keep everything and stop being offered for new work
- **Assignment wizard**: Back in the fixed nav (Cancel on step 1), step kicker, title and a three-bar stepper inside the title block, the step's cards, and the green bar whose label says what it carries ("Continue · 2 items selected", "Save 2 assignments · Rp 1.350.000"). Step 1 is `.pcard` radio cards; step 2 is one `.psource` card per order with its items as check rows and a rail that turns green once anything in it is chosen; step 3 is a "Same for every item" card plus one `.pjob` card per item. Arriving from a penjahit page opens on step 2. Editing one existing job shows step 3 alone
- **Step 3's shared card and rows write to the same jobs.** `applyProductionShared` fills every row not given its own answer; editing a row's description, price or deadline marks it custom (green rail) and detaches it for good. Quantity never detaches a row. A row whose error is inside its folded disclosure has it opened before focus is sent there
- **Job page**: Work card (status badge; penjahit, item, quantity × price, assigned, deadline — red when overdue — and notes) with **Open the customer order** beneath; Money card; Payments & refunds card (voided entries struck through, "Correct this entry" on live ones) with **Record payment or refund** beneath, which opens the entry form as a card in its place
- **Money never nets across jobs.** Balance is `amount − paid + refunded`; positive is owed, negative is credit, aggregated separately by `productionTotals`. `productionTotalsHtml` prints Refunded and Credit only when non-zero
- **Nothing about a job is edited in place.** A wrong payment is voided with a reason and replaced; a cancelled job states its final agreed charge, including zero; a job with payment history cannot move to another penjahit
- **Saves are retry-safe from the client.** `state.production.batchRequest` / `paymentRequest` hold the exact unconfirmed payload; a rejection with an error `code` drops it, a response that never arrived keeps it and the retry resends the same ids
- **The flow never dead-ends.** Missing penjahit, customer or order can each be made from inside it (`?from=production`) and every route back carries `?resume=1`
- **Errors land under the page title**, not at the top of the view: `showFormError` inserts after `.custedit-title` / `.order-title-band` when there is one, because the fixed nav covers the first 67px of these views. This also fixed the customer editor

## 22. Shared form validation
- **app.js** `setFieldError`, `fieldValidityMessage`, `validateFields`, `focusInvalid`, `showFormError` — chrome region, ~570–660. Live revalidation is one delegated `input` listener in `bindEvents`
- **CSS** `.form-error`, `.field-error`, `.optional`, `.input[aria-invalid="true"]` in `shared.css`, above Fixed bottom bars
- **One implementation, every editor.** Customer, order, payment terms, cost calculator, fitting, moodboard, sign-in, penjahit, and production surfaces all call the same four functions. There is no private validation anywhere
- **Messages go in the page, not in the browser's bubble.** Nothing here submits a real `<form>` to a server, so the native bubble never appears; `fieldValidityMessage` says the same things in the app's voice, into a `.field-error` wired to its field by `aria-describedby` and `aria-invalid`
- **Focus moves on submit only.** `validateFields` ends by focusing the first invalid field; the live listener deliberately does not, because the reader is mid-word in the field being corrected. `validateOrderItems(false)` is the non-focusing form of the same check
- **The save button says what it will do.** `setDirty` labels it Create customer / Create order / Create penjahit / Save assignments / Save changes from the route, and an untouched **new** form is enabled and never reads "Saved" — there is nothing saved yet to report
- **A failed save keeps the draft.** `showFormError` puts a `role="alert"` message at the top of the view and the values stay in the fields; `state.saving` blocks a second submit. A save that succeeded but whose follow-up failed says so as itself, not as a failed save
