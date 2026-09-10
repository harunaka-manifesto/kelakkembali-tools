# MAP — app.js (9662 lines, ~386 KB)

**Never read this file whole.** It costs ~60k tokens. Jump to a region below, read ≤400 lines.

One IIFE. Everything is file-scoped; there is no class, no module, no split. Region boundaries are real comment banners in the source — grep the banner text to re-locate after edits.

---

## 1. Region table — pick one, read only its range

| Lines | Region | Banner to grep | Read when |
| ---: | :--- | :--- | :--- |
| 1–11 | File header, `window.KK` root | `SPA composition root` | Never |
| 12–21 | Dependency aliases (`db`, `util`, `cal`, `docs`…) | `Core Dependencies & Helper Aliases` | Resolving what `u.` / `cal.` mean |
| 22–50 | Domain constants (statuses, stages, copy) | `Domain Constants` | Adding a status/stage value |
| 51–56 | SVG icon aliases | `SVG Icons` | Adding an icon |
| 57–338 | **Element registry** — every `$("#id")` handle | `Element Registry` | You added DOM to `index.html` and need a handle |
| 339–535 | **Application state** object | `Application State` | Adding page state; read 339–535 in full |
| 536–650 | UI chrome: toast, dirty flag, save bar, app bar, menu | `UI Utilities & Chrome` | Changing bars, toasts, page actions |
| 651–806 | **Router**: curtain, route loader, error, focus | `Routing & View Transition` | Adding a route |
| 807–2109 | Status derivation, lifecycle, follow-up, `handleRoute` dispatch, homepage | `Status Helpers & Data Transformations` | Status/pipeline logic, route dispatch, homepage |
| 2110–2814 | **Schedules calendar** (month grid, lanes, day sheet, keyboard) | `Schedules calendar` | Calendar work |
| 2815–3406 | **Fitting logs feed** (list, paging, filters, parking) | `Fitting logs feed` | Feed work |
| 3407–4242 | **Document feed** (quotations + invoices list, new-document picker) | `Document feed` | Quotation/invoice list work |
| 4243–4819 | **Fitting log detail** (photos, marks, share, PDF, viewer) | `Fitting log session detail` | Detail page work |
| 4820–6294 | **Fitting workspace** (photos, captions, red marks, staged deletes, atomic save) | `Add fitting photos` | Workspace work — includes the `Photo annotation` sub-region at 5486 |
| 6295–6760 | **Customer detail + editor** (and enquiry review) | `Customer Detail & Edit Controller` | Customer pages, Tally intake UI |
| 6761–7340 | **Order detail** view model, render, schedule, payments | `Order Detail ViewModel & UI` | Order detail page |
| 7341–7747 | **Order editor + cost calculator** (items, terms, chips) | `Order Editor & Cost Calculator` | Order editing, pricing |
| 7748–8157 | **Moodboard integration** (canvas, overlay, gestures) | `Moodboard Integration` | Moodboard page glue |
| 8158–8427 | **Exports**: PDFs, deposit logging, Drive reconnect | `Exports` | Document/PDF export flows |
| 8428–8892 | **`bindEvents`** — every listener, one function | `Boot & Event Listeners` | Wiring a new control |
| 8893–8943 | Gate, boot, session restore | `App Boot` | Auth/boot changes |

### Region read recipes

```
Read app.js offset=57   limit=282   # element registry
Read app.js offset=339  limit=197   # state shape
Read app.js offset=651  limit=156   # router
Read app.js offset=2110 limit=400   # schedules calendar (first half)
Read app.js offset=3407 limit=400   # document feed (first half)
Read app.js offset=4243 limit=400   # fitting log detail
Read app.js offset=5486 limit=345   # photo annotation overlay
Read app.js offset=6761 limit=400   # order detail (first half)
Read app.js offset=8428 limit=400   # bindEvents
```

---

## 2. Routes → handler

Parsed in `handleRoute` at **995** (hash segments). Each returns `{ view, id?, kind?, sessionId?, photoId?, query }`.

| Hash | `view` | Entry function | Line |
| :--- | :--- | :--- | ---: |
| `#/` | `customers` | `showCustomers` | 1923 |
| `#/customer/:id` | `customer` | `showCustomerDetail` | 6482 |
| `#/customer/:id/edit` | `customerEdit` | `showCustomerEdit` | 6507 |
| `#/order/:id` | `order` | `showOrderDetail` | 7104 |
| `#/order/:id/edit` | `orderEdit` | (dispatch in `handleRoute`) | — |
| `#/customer/:id/order/new/edit` | `orderEdit` (`id` is `"new"`) | (dispatch in `handleRoute`) | — |
| `#/order/:id/moodboard` | `moodboard` | `setupMoodboardListeners` | 7768 |
| `#/order/:id/moodboard/preview` | `moodboardPreview` | `openMoodboardCanvas` | 7900 |
| `#/schedules` | `schedules` | `showSchedules` | 2759 |
| `#/quotations` | `documents` (kind `quotation`) | `showDocuments` | 3745 |
| `#/invoices` | `documents` (kind `invoice`) | `showDocuments` | 3745 |
| `#/fittings` | `fittingLogs` | `showFittingLogs` | 3331 |
| `#/fittings/:sessionId` | `fittingLogDetail` | `showFittingLogDetail` | 4691 |
| `#/fittings/:sessionId/edit` | `fittingPhotoAdd` | `showFittingPhotoAdd` | 6117 |
| `#/fittings/:sessionId/photos/add` | `fittingPhotoAdd` (synonym) | `showFittingPhotoAdd` | 6117 |
| `#/fittings/:sessionId/photo/:photoId/edit` | `fittingPhotoRedirect` | (redirect in `handleRoute`) | — |
| `#/order/:id/fitting/new` | `fittingNew` | (dispatch in `handleRoute`) | 1326 |
| `#/order/:id/fitting/:sessionId` | `fittingLogRedirect` | (redirect in `handleRoute`) | — |
| `#/calendar` | `calendar` | `showCalendarSettings` | 7369 |
| `#/enquiry/:id` | `enquiry` | `readableAnswer` / `acceptEnquiry` | 6306 |

Two fitting routes exist only to keep old links working, and neither renders a
view: `fittingPhotoRedirect` is the retired per-photo editor, which now opens the
workspace on the photo it named, and `fittingLogRedirect` is the retired
order-scoped journal, which joins the canonical detail route.

`#/calendar` is the Google Calendar **connection settings**, not the month view. The month view is `#/schedules` — that collision is why it is not called `#/calendar`.

**Adding a route:** add a segment case in the parse block inside `handleRoute`, add a `showX` entry function in the matching region, add the `<section class="view" id="viewX" hidden>` to `index.html`, register its elements at 57–338, add state at 339–535 if it needs any. Then check the five other route surfaces the same edit touches: view toggling, `routeHasOwnLoader`/`routeLoaderKind`, `focusRoute`, `syncBottomBar`, and cleanup on leaving. That is the whole checklist.

**Route coupling worth knowing:** the fitting feed keeps its state across the whole `FITTING_ROUTE_FAMILY`; the document feed has no family and parks **only** on the `documents → order` hop, because that is the one navigation that leaves the list and comes straight back. The schedules calendar never parks — its data is a snapshot that must not survive a write — but it does retain the month on screen.

---

## 3. Function index — symbol → line

Look up here instead of grepping. Arrow-function helpers are marked `→`.

### UI Utilities & Chrome
`showToast` 506 · `setDirty` 513 · `syncBottomBar` 519 · `syncVisualViewport` 535 · `trapModalFocus` 542 · `setSaveBar` 561 · `setPageAction` 567 · `setChrome` 575 · `closeMenu` 612

### Routing & View Transition
`wait` →627 · `coverCurtain` 629 · `revealCurtain` 651 · `routeHasOwnLoader` →666 · `routeLoaderKind` →669 · `beginRouteLoader` 678 · `hideRouteLoader` 704 · `showRouteError` 722 · `focusRoute` 745

### Status Helpers & Data Transformations
`badgeClass` →782 · `effectiveStatus` 784 · `advancedStatus` 794 · `bumpStatus` 800 · `renderOrderStatus` 813 · `customerStatus` 819 · `orderIsPaid` →829 · `designAnchor` →830 · `productionAnchor` →831 · `openCustomerOrders` →832 · `dateOnly` →833 · `followUpPatch` 835 · `consultNudgeFor` 850 · `setFollowUp` 860 · `pushFollowUp` 870 · `canCancel` →882 · `cancelCustomer` 884 · `deleteCustomerRecord` 904 · `reopenCustomer` 921 · `go` 942 · `leaveFormFor` 947 · `confirmLeave` 961 · **`handleRoute`** 968 · `orNull` →1389 · `orderLabel` 1391 · `isCosted` →1397 · `isNamed` →1398 · `greetingForClock` 1400 · `homepageOverview` 1405 · `reducedMotion` →1425 · `clearHomepagePops` 1428 · `clearHomepagePresses` 1433 · `isCurrentHomepageLoad` 1437 · `beginHomepageLoad` 1441 · `renderHomepageError` 1459 · `renderHomepageHero` 1479 · `renderHomepageAlert` 1500 · `renderHomepageSummary` 1507 · `renderHomepageReady` 1513 · `prepareShortcutAppearState` 1522 · `playShortcutAppear` 1527 · `revealHomepage` 1535 · **`showCustomers`** 1565 · `hapticTap` 1588

### Schedules calendar
`sched` →2115 · `isSchedulesRoute` →2116 · `beginSchedulesLoad` 2118 · `isCurrentSchedulesLoad` →2124 · `scheduleStageColorKey` →2128 · `scheduleSpanLabel` →2130 · `scheduleItemHref` 2139 · **`buildScheduleItems`** 2168 · `indexScheduleItems` 2279 · `scheduleDayItems` →2303

### Calendar rendering
`schedcalPanelHtml` 2310 · `schedcalStateHtml` 2318 · `schedcalCellHtml` 2348 · **`schedcalBandsHtml`** 2398 · `schedcalSkeletonHtml` 2439 · `renderScheduleApprox` 2457 · `renderScheduleLegend` 2485 · **`renderSchedulesMonth`** 2503 · `announceSchedulesStatus` 2555 · `scheduleCellFor` 2562 · `focusScheduleCell` 2568 · `goToMonth` 2580 · `shiftScheduleFocus` 2589 · `shiftScheduleMonth` 2605

`schedcalCellHtml` draws one day and nothing else — the coloured bands are `schedcalBandsHtml`'s, drawn once per week row and placed by `grid-column`, because a production date means its whole Monday–Sunday week and a Monday-first grid puts that week on exactly one row. Both are called from `renderSchedulesMonth`, which assigns lanes across the whole 42-cell window first so a band keeps one lane in every row it touches.

### The day sheet
`renderScheduleSheet` 2618 · `openScheduleDay` 2658 · `closeScheduleDay` 2677

### Keyboard & lifecycle
`handleSchedulesGridKey` 2250 · `cleanupSchedules` 2276 · **`showSchedules`** 2294

### Fitting logs feed
`feed` →2839 · `isFittingRoute` →2840 · `fittingStageLabel` 2842 · `fittingStageListText` 2847 · `fittingPhotoText` →2853 · `fittingBlockHtml` 2857 · `fittingCardHtml` 2864 · `fittingSkeletonHtml` 2914 · `fittingPanelHtml` 2932 · `fittingEmptyHtml` 2943 · `fittingStateHtml` 2967 · `announceFittingStatus` 2998 · `renderFittingStages` 3005 · `renderFittingSearchClear` 3012 · `renderFittingFeed` 3020 · `fittingPhotoSuffix` →3047

### Feed requests & paging
`fittingRequestArgs` 3051 · `ensureFittingObserver` 3063 · `stopFittingObserver` 3072 · `startFittingFirstPage` 3080 · `loadMoreFittingLogs` 3113 · `cleanupFittingLogs` 3153 · `inFittingFamily` →3175 · `parkFittingLogs` 3180

### Search focus space
`alignLedgerSearch` 3198 · `alignFittingSearch` 3212 · `scheduleFittingSearchAlign` 3219

### Route entry
**`showFittingLogs`** 3331 · `restoreFittingScroll` 3389 · `setFittingBackControl` 3400 · **`showFittingLogDetail`** 4691 · **`showFittingPhotoAdd`** 6117

### Document feed
`docFeed` →2954 · `isDocumentsRoute` →2955 · `documentKindName` →2957 · `documentKindPlural` →2958 · `documentRouteFor` →2959 · `documentBlockHtml` 2961 · `documentCardHtml` 2968 · `documentSkeletonHtml` 3007 · `documentPanelHtml` 3025 · `documentEmptyHtml` 3035 · `documentStateHtml` 3052 · `announceDocumentStatus` 3082 · `renderDocumentSearchClear` 3089 · `renderDocumentFeed` 3093 · `documentRequestArgs` 3122 · `ensureDocumentObserver` 3132 · `stopDocumentObserver` 3141 · `startDocumentFirstPage` 3149 · `loadMoreDocuments` 3180 · `cleanupDocuments` 3216 · `parkDocuments` 3237 · `alignDocumentSearch` 3246 · `scheduleDocumentSearchAlign` 3251 · `setDocumentBackControl` 3261 · `restoreDocumentScroll` 3268 · **`showDocuments`** 3279

### New document picker
`picker` →4438 · `docnewRowHtml` 4440 · `renderDocumentPicker` 4459 · `announceDocumentPickerStatus` 4609 · `termLabelForPicker` 4613 · `openDocumentPicker` 4617 · `closeDocumentPicker` 4667 · `pickDocumentCustomer` 4683 · `backToDocumentCustomers` 4719 · `selectInvoiceOrder` 4744 · `openInvoiceTerminPicker` 4773 · **`generateDocumentFor`** 4807

### Document events
`openDocumentPickerReload` 5009

### Fitting log session detail
`detail` →4250 · `isDetailRoute` →4251 · `FITTING_IMAGE_MAX` →4256 · `invalidateFittingFeed` 4258 · `sortFittingPhotos` 4269 · `fittingPhotoState` 4277 · `fittingPhotoDisplayURL` →4285

### Detail render
`fittingDetailCardHtml` 4290 · `fittingDetailEmptyHtml` 4349 · `announceDetailStatus` 4362 · `renderFittingDetail` 4367

### Photo bytes
`fittingPhotoBlob` 4410 · `blobToDataUrl` 4433 · `measureImage` 4442 · `fittingShareFilename` 4451

### Sharing
`shareFittingPhoto` 4466

### PDF download
**`downloadFittingPdf`** 4520

### Photo viewer
`openFittingPhotoViewerImage` 4589 · `openFittingPhotoViewer` 4608 · `closeFittingPhotoViewer` 4621

### Photo entry & deletion
`addFittingDetailPhoto` 4639 · `detailPhotosPicked` 4647 · `deleteFittingDetailLog` 4655 · `cleanupFittingDetail` 4679 · **`showFittingLogDetail`** 4691

### Detail event wiring
`setupFittingDetailListeners` 4749

### Fitting workspace
`add` →4827 · `isAddRoute` →4828 · `FITTING_PHOTO_LIMIT` →4830 · `FITTING_UNDO_MS` →4831 · `addDetailHash` →4833

### Derived state
`addVisibleExisting` →4838 · `addVisibleCount` →4839 · `addRemainingSlots` →4840 · `addCaptionFor` 4842 · `addAnnotationFor` 4850 · `addDraftByKey` →4857 · `addExistingById` →4858 · `addSavedCaptionForKey` 4861 · `addAnnotationJson` →4870 · `addDirty` 4872 · `syncAddDirty` →4895 · `announceAddStatus` 4897

### Local drafts
`makeAddDraft` 4909 · `releaseAddDraft` 4931 · `removeAddDraft` 4938 · `admitAddFiles` 4948

### Sequential preparation
`runAddPreparationQueue` 4972 · `reportAddPreparationFailures` 5024

### Undo toast
`clearAddUndo` 5045 · `showAddUndo` 5054 · `undoAddDeletion` 5065 · `cssEscapeAttr` →5092

### Render
`fitaddStageHtml` 5096 · `fitaddIconHtml` 5115 · `fitaddActionHtml` 5120 · `fitaddCardHtml` 5132 · `fitaddDraftStatusHtml` 5190 · `fitaddSkeletonHtml` 5198 · `fitaddStateHtml` 5208 · `captureAddFocus` 5233 · `restoreAddFocus` 5239 · **`renderFittingPhotoAdd`** 5252 · `patchAddDraftCard` 5338 · `renderAddBar` 5373

### Card actions
`growAddTextarea` 5398 · `openAddEditor` 5403 · `closeAddEditor` 5422 · `saveAddEditor` 5433 · `deleteAddCard` 5449 · `focusFirstOpenAddEditor` 5476

### Photo annotation
`mark` →5495 · `markStrokesJson` →5496 · `fittingMarkSource` 5500 · `fittingMarkNumber` 5513 · **`layoutFittingMark`** 5528 · `redrawFittingMark` 5555 · `drawFittingMarkStroke` 5564 · **`fittingMarkPoint`** 5600 · `onFittingMarkDown` 5607 · `onFittingMarkMove` 5632 · `onFittingMarkUp` 5670 · `undoFittingMark` 5684 · `clearFittingMark` 5695 · `syncFittingMarkTools` 5704 · `fittingMarkImageReady` 5710 · **`openFittingMark`** 5723 · `commitFittingMark` 5784 · `closeFittingMark` 5800

`layoutFittingMark` is the one that matters: it sizes the canvas to the box the
photo actually occupies (`KK.fittingPdf.fitContain`), not to the stage around it.
A canvas stretched over the whole stage would put every mark off by exactly the
letterbox bars. `fittingMarkPoint` then reads pointer coordinates against that
canvas and clamps them to 0..1, so nothing is ever stored outside the image.

### Picker entry
`addPhotosFromReview` 5833 · `addPhotosPicked` 5839

### Saving
**`saveFittingPhotoAdd`** 5859

### Drive backup handoff
`applyAddBackupResult` 5989 · `startAddBackups` 5997

### Lifecycle
`resetFittingPhotoAdd` 6027 · `discardProvisionalFittingLog` 6067 · `cleanupFittingPhotoAdd` 6075 · `seedFittingPhotoAdd` 6086 · `scrollToFocusPhoto` 6106 · **`showFittingPhotoAdd`** 6117

### Event wiring
`setupFittingPhotoAddListeners` 6198 · `readableAnswer` 6295 · `acceptEnquiry` 6306 · `dismissEnquiry` 6337 · `renderCustomerList` 6351 · `homepageStatus` 6387 · `compareHomepageCustomers` 6407 · `isActive` →6425 · `nextDeadline` 6427 · `relativeDays` →6440 · `firstName` →6441 · `daysUntil` →6470 · `isApproximateWedding` →6471 · `weddingText` 6473

### Customer Detail & Edit Controller
**`showCustomerDetail`** 5694 · **`showCustomerEdit`** 5719 · `renderCustomerReadOnly` 5763 · `custNextEvent` 5773 · `custOrderStatus` 5795 · `renderCustomerDetail` 5803 · `relativeToToday` 5849 · `fillCustomerForm` 5856 · `setNameError` 5873 · `setWeddingPrecision` 5881 · `weddingPrecision` →5892 · `lastDayOfMonth` 5894 · **`saveCustomer`** 5901 · `scheduleFor` →5970

### Order Detail ViewModel & UI
`isCurrentOrderLoad` 5975 · `clearOrderPresses` 5979 · `closeOrderPaymentChooser` 5983 · `beginOrderLoad` 5989 · `orderErrorCopy` 6015 · `renderOrderError` 6022 · `orderFirstName` →6048 · `orderDateLabel` 6053 · `pushInto` 6059 · `deriveLoggedDeposits` 6065 · `orderScheduleModel` 6075 · `documentReadiness` 6123 · **`buildOrderDetailViewModel`** 6138 · `renderOrderItems` 6187 · `renderOrderDocumentState` 6202 · `renderOrderPayments` 6210 · `renderOrderPaymentChoices` 6236 · `renderOrderSchedule` 6244 · `renderOrderReady` 6269 · `revealOrder` 6286 · **`showOrderDetail`** 6316 · `refreshOrderPayments` 6381 · `refreshOrderSchedule` 6415 · `retryOrderSchedule` 6454 · `toggleOrderPaymentChooser` 6460 · `setOrderPaymentBusy` 6471 · `renderScheduleHint` 6481 · `rescheduleOrder` 6516

### Order Editor & Cost Calculator
`googleRedirectUri` →6560 · `connectGoogle` 6562 · `showCalendarSettings` 6581 · `disconnectGoogle` 6609 · **`saveOrder`** 6623 · `validateTerms` 6668 · `addItemRow` 6682 · `refreshItemTotals` 6711 · `rowElements` →6737 · `refreshRemoveButtons` 6739 · `readItems` 6746 · `customChip` 6759 · `checkedIncludes` →6768 · `addCustomInclude` 6770 · `addTermRow` 6794 · `termRowElements` →6817 · `refreshTermRemoveButtons` 6819 · `parsePercent` →6826 · `readTerms` 6831 · `termsTotal` →6839 · `roundPct` →6840 · `refreshTermsSum` 6842 · `showTermsError` 6849 · `buildTerms` 6856 · `syncSchemeCard` 6866 · `addCalcRow` 6877 · `calcRowElements` →6898 · `refreshCalcRemoveButtons` 6900 · `readCalcRows` 6907 · `refreshCalcTotal` 6915 · `closeCostCalc` 6925 · `applyCostCalc` 6941

### Moodboard Integration
`setupMoodboardListeners` 6970 · `addMoodboardFiles` 7067 · `openMoodboardCanvas` 7102 · `moodboardStageClone` 7108 · `syncMoodboardCanvas` 7118 · `fitMoodboardBoard` 7146 · `openMoodboardOverlay` 7159 · `closeMoodboardOverlay` 7184 · `renderMoodboardOverlay` 7200 · `moodboardZoomAt` 7220 · `clampMoodboardPan` 7245 · `applyMoodboardTransform` 7257 · `bindMoodboardOverlayGestures` 7264 · `handleMoodboardOverlayKey` 7335

### Exports
`setMoodboardExportBusy` 7362 · `setMoodboardExportState` 7369 · `flashMoodboardExportState` 7381 · `resetMoodboardExports` 7387 · `recordMoodboardExport` 7395 · `offerGoogleReconnect` 7420 · `exportMoodboard` 7427 · `setDocumentBusy` 7480 · **`downloadDocument`** 7497 · `logDeposit` 7529 · `logDepositRequest` 7542 · `signOutFromMenu` 7615

### Boot & Event Listeners
**`bindEvents`** 7632 · `showGate` 8023 · `showApp` 8040

---

## 4. Coupling notes (read before a broad refactor)

- `bindEvents` (8428–8892) is one function holding every listener. Adding a control means adding one block here — do not split it. The fitting pages keep their own wiring in `setupFittingDetailListeners` 4749 and `setupFittingPhotoAddListeners` 6198, both called from it.
- The element registry (57–338) and `state` (339–535) are the two shared surfaces every region touches. A change here is repo-wide; treat it as a >5-file edit.
- The three fitting routes (feed / detail / workspace) share `state.fittingLogs` parking, and detail + workspace share photo records through `state.fittingDetail.photos`. Changing one usually means checking `parkFittingLogs` 3079, `cleanupFittingLogs` 3052, and `setFittingBackControl` 3400.
- The workspace owns the annotation overlay outright: `state.fittingPhotoAdd.mark` is the only place a stroke lives before it is committed, and `closeFittingMark` is the only writer of `annotationPatches`. The detail page and the PDF are pure readers of `photo.annotation`.
- Order detail and order editor share nothing but `db.getOrder`. Editing one does not require reading the other.
