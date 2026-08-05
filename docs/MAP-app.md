# MAP — app.js (8507 lines, ~338 KB)

**Never read this file whole.** It costs ~60k tokens. Jump to a region below, read ≤400 lines.

One IIFE. Everything is file-scoped; there is no class, no module, no split. Region boundaries are real comment banners in the source — grep the banner text to re-locate after edits.

---

## 1. Region table — pick one, read only its range

| Lines | Region | Banner to grep | Read when |
| ---: | :--- | :--- | :--- |
| 1–11 | File header, `window.KK` root | `SPA composition root` | Never |
| 12–21 | Dependency aliases (`db`, `util`, `cal`, `docs`…) | `Core Dependencies & Helper Aliases` | Resolving what `u.` / `cal.` mean |
| 22–38 | Domain constants (statuses, stages, copy) | `Domain Constants` | Adding a status/stage value |
| 39–44 | SVG icon aliases | `SVG Icons` | Adding an icon |
| 45–324 | **Element registry** — every `$("#id")` handle | `Element Registry` | You added DOM to `index.html` and need a handle |
| 325–507 | **Application state** object | `Application State` | Adding page state; read 322–503 in full |
| 508–623 | UI chrome: toast, dirty flag, save bar, app bar, menu | `UI Utilities & Chrome` | Changing bars, toasts, page actions |
| 624–783 | **Router**: curtain, route loader, error, focus | `Routing & View Transition` | Adding a route |
| 784–2083 | Status derivation, lifecycle, follow-up, `handleRoute` dispatch, homepage | `Status Helpers & Data Transformations` | Status/pipeline logic, route dispatch, homepage |
| 2084–2710 | **Schedules calendar** (month grid, lanes, day sheet, keyboard) | `Schedules calendar` | Calendar work |
| 2711–3302 | **Fitting logs feed** (list, paging, filters, parking) | `Fitting logs feed` | Feed work |
| 3303–4070 | **Document feed** (quotations + invoices list, new-document picker) | `Document feed` | Quotation/invoice list work |
| 4071–4586 | **Fitting log detail** (photos, share, PDF, viewer) | `Fitting log session detail` | Detail page work |
| 4587–4900 | **Fitting photo editor** (caption, replace, delete) | `Fitting photo editor` | Editor work |
| 4901–6065 | **Add fitting photos** (batch review, captions, staged deletes, atomic save) | `Add fitting photos` | Batch add/edit page work |
| 6066–6346 | **Customer detail + editor** (and enquiry review) | `Customer Detail & Edit Controller` | Customer pages, Tally intake UI |
| 6347–6926 | **Order detail** view model, render, schedule, payments | `Order Detail ViewModel & UI` | Order detail page |
| 6927–7323 | **Order editor + cost calculator** (items, terms, chips) | `Order Editor & Cost Calculator` | Order editing, pricing |
| 7324–7733 | **Moodboard integration** (canvas, overlay, gestures) | `Moodboard Integration` | Moodboard page glue |
| 7734–8003 | **Exports**: PDFs, deposit logging, Drive reconnect | `Exports` | Document/PDF export flows |
| 8004–8455 | **`bindEvents`** — every listener, one function | `Boot & Event Listeners` | Wiring a new control |
| 8456–8507 | Gate, boot, session restore | `App Boot` | Auth/boot changes |

### Region read recipes

```
Read app.js offset=45   limit=231   # element registry
Read app.js offset=322  limit=182   # state shape
Read app.js offset=620  limit=160   # router
Read app.js offset=1722 limit=400   # schedules calendar (first half)
Read app.js offset=2941 limit=400   # document feed (first half)
Read app.js offset=5973 limit=400   # order detail (first half)
Read app.js offset=7630 limit=440   # bindEvents
```

---

## 2. Routes → handler

Parsed in `handleRoute` at **968** (hash segments). Each returns `{ view, id?, kind?, sessionId?, photoId?, query }`.

| Hash | `view` | Entry function | Line |
| :--- | :--- | :--- | ---: |
| `#/` | `customers` | `showCustomers` | 1565 |
| `#/customer/:id` | `customer` | `showCustomerDetail` | 5694 |
| `#/customer/:id/edit` | `customerEdit` | `showCustomerEdit` | 5719 |
| `#/order/:id` | `order` | `showOrderDetail` | 6316 |
| `#/order/:id/edit` | `orderEdit` | (dispatch in `handleRoute`) | — |
| `#/order/:id/moodboard` | `moodboard` | `setupMoodboardListeners` | 6970 |
| `#/order/:id/moodboard/preview` | `moodboardPreview` | `openMoodboardCanvas` | 7102 |
| `#/schedules` | `schedules` | `showSchedules` | 2294 |
| `#/quotations` | `documents` (kind `quotation`) | `showDocuments` | 3279 |
| `#/invoices` | `documents` (kind `invoice`) | `showDocuments` | 3279 |
| `#/fittings` | `fittingLogs` | `showFittingLogs` | 2865 |
| `#/fittings/:sessionId` | `fittingLogDetail` | `showFittingLogDetail` | 4165 |
| `#/fittings/:sessionId/photo/:photoId/edit` | `fittingPhotoEdit` | `showFittingPhotoEditor` | 4397 |
| `#/fittings/:sessionId/photos/add` | `fittingPhotoAdd` | `showFittingPhotoAdd` | 5394 |
| `#/order/:id/fitting/new` | `fittingNew` | (dispatch in `handleRoute`) | — |
| `#/order/:id/fitting/:sessionId` | `fittingJournal` | (dispatch in `handleRoute`) | — |
| `#/calendar` | `calendar` | `showCalendarSettings` | 6581 |
| `#/enquiry/:id` | `enquiry` | `readableAnswer` / `acceptEnquiry` | 5536 |

`#/calendar` is the Google Calendar **connection settings**, not the month view. The month view is `#/schedules` — that collision is why it is not called `#/calendar`.

**Adding a route:** add a segment case in the parse block inside `handleRoute`, add a `showX` entry function in the matching region, add the `<section class="view" id="viewX" hidden>` to `index.html`, register its elements at 45–321, add state at 322–503 if it needs any. Then check the five other route surfaces the same edit touches: view toggling, `routeHasOwnLoader`/`routeLoaderKind`, `focusRoute`, `syncBottomBar`, and cleanup on leaving. That is the whole checklist.

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
`sched` →1738 · `isSchedulesRoute` →1739 · `beginSchedulesLoad` 1741 · `isCurrentSchedulesLoad` →1747 · `scheduleStageColorKey` →1751 · `scheduleSpanLabel` →1753 · `scheduleItemHref` 1762 · **`buildScheduleItems`** 1791 · `indexScheduleItems` 1902 · `scheduleDayItems` →1926

### Calendar rendering
`schedcalPanelHtml` 1933 · `schedcalStateHtml` 1941 · `schedcalCellHtml` 1962 · `schedcalSkeletonHtml` 2018 · `renderScheduleApprox` 2033 · `renderScheduleLegend` 2051 · **`renderSchedulesMonth`** 2069 · `announceSchedulesStatus` 2116 · `scheduleCellFor` 2123 · `focusScheduleCell` 2129 · `goToMonth` 2141 · `shiftScheduleFocus` 2150 · `shiftScheduleMonth` 2166

### The day sheet
`renderScheduleSheet` 2179 · `openScheduleDay` 2216 · `closeScheduleDay` 2235

### Keyboard & lifecycle
`handleSchedulesGridKey` 2250 · `cleanupSchedules` 2276 · **`showSchedules`** 2294

### Fitting logs feed
`feed` →2373 · `isFittingRoute` →2374 · `fittingStageLabel` 2376 · `fittingStageListText` 2381 · `fittingPhotoText` →2387 · `fittingBlockHtml` 2391 · `fittingCardHtml` 2398 · `fittingSkeletonHtml` 2448 · `fittingPanelHtml` 2466 · `fittingEmptyHtml` 2477 · `fittingStateHtml` 2501 · `announceFittingStatus` 2532 · `renderFittingStages` 2539 · `renderFittingSearchClear` 2546 · `renderFittingFeed` 2554 · `fittingPhotoSuffix` →2581

### Feed requests & paging
`fittingRequestArgs` 2585 · `ensureFittingObserver` 2597 · `stopFittingObserver` 2606 · `startFittingFirstPage` 2614 · `loadMoreFittingLogs` 2647 · `cleanupFittingLogs` 2687 · `inFittingFamily` →2709 · `parkFittingLogs` 2714

### Search focus space
`alignLedgerSearch` 2732 · `alignFittingSearch` 2746 · `scheduleFittingSearchAlign` 2753

### Route entry
**`showFittingLogs`** 2865 · `restoreFittingScroll` 2923 · `setFittingBackControl` 2934 · **`showFittingLogDetail`** 4165 · **`showFittingPhotoAdd`** 5394

### Document feed
`docFeed` →2954 · `isDocumentsRoute` →2955 · `documentKindName` →2957 · `documentKindPlural` →2958 · `documentRouteFor` →2959 · `documentBlockHtml` 2961 · `documentCardHtml` 2968 · `documentSkeletonHtml` 3007 · `documentPanelHtml` 3025 · `documentEmptyHtml` 3035 · `documentStateHtml` 3052 · `announceDocumentStatus` 3082 · `renderDocumentSearchClear` 3089 · `renderDocumentFeed` 3093 · `documentRequestArgs` 3122 · `ensureDocumentObserver` 3132 · `stopDocumentObserver` 3141 · `startDocumentFirstPage` 3149 · `loadMoreDocuments` 3180 · `cleanupDocuments` 3216 · `parkDocuments` 3237 · `alignDocumentSearch` 3246 · `scheduleDocumentSearchAlign` 3251 · `setDocumentBackControl` 3261 · `restoreDocumentScroll` 3268 · **`showDocuments`** 3279

### New document picker
`picker` →3336 · `docnewRowHtml` 3338 · `renderDocumentPicker` 3346 · `announceDocumentPickerStatus` 3443 · `openDocumentPicker` 3447 · `closeDocumentPicker` 3486 · `pickDocumentCustomer` 3499 · `backToDocumentCustomers` 3520 · **`generateDocumentFor`** 3535

### Document events
`openDocumentPickerReload` 3679

### Fitting log session detail
`detail` →3715 · `editor` →3716 · `isDetailRoute` →3717 · `isEditorRoute` →3718 · `invalidateFittingFeed` 3725 · `sortFittingPhotos` 3736 · `fittingPhotoState` 3744 · `fittingPhotoDisplayURL` →3752

### Detail render
`fittingDetailCardHtml` 3757 · `fittingDetailEmptyHtml` 3811 · `announceDetailStatus` 3824 · `renderFittingDetail` 3829

### Photo bytes
`fittingPhotoBlob` 3872 · `blobToDataUrl` 3895 · `measureImage` 3904 · `fittingShareFilename` 3913

### Sharing
`shareFittingPhoto` 3928

### PDF download
**`downloadFittingPdf`** 3982

### Photo viewer
`openFittingPhotoViewerImage` 4051 · `openFittingPhotoViewer` 4063 · `closeFittingPhotoViewer` 4075

### Active-session actions
`fittingDetailBridge` 4089 · `addFittingDetailPhoto` 4110 · `detailPhotosPicked` 4118 · `deleteFittingDetailLog` 4126 · `cleanupFittingDetail` 4150

### Fitting photo editor
`fittingEditorDirty` 4228 · `syncFittingEditorDirty` 4235 · `renderFittingEditor` 4239 · `clearStagedReplacement` 4261 · `stageFittingReplacement` 4267 · `saveFittingEditor` 4289 · `deleteFittingEditorPhoto` 4354 · `cleanupFittingEditor` 4385 · **`showFittingPhotoEditor`** 4397

### Detail & editor event wiring
`setupFittingDetailListeners` 4458

### Add fitting photos
`add` →4544 · `isAddRoute` →4545 · `addDetailHash` →4550

### Derived state
`addVisibleExisting` →4555 · `addVisibleCount` →4556 · `addRemainingSlots` →4557 · `addCaptionFor` 4559 · `addDraftByKey` →4564 · `addExistingById` →4565 · `addSavedCaptionForKey` 4568 · `addDirty` 4575 · `syncAddDirty` →4592 · `announceAddStatus` 4594

### Local drafts
`makeAddDraft` 4606 · `releaseAddDraft` 4627 · `removeAddDraft` 4634 · `admitAddFiles` 4644

### Sequential preparation
`runAddPreparationQueue` 4668 · `reportAddPreparationFailures` 4720

### Undo toast
`clearAddUndo` 4741 · `showAddUndo` 4750 · `undoAddDeletion` 4761 · `cssEscapeAttr` →4788

### Render
`fitaddStageHtml` 4792 · `fitaddIconHtml` 4809 · `fitaddActionHtml` 4814 · `fitaddCardHtml` 4826 · `fitaddDraftStatusHtml` 4871 · `fitaddSkeletonHtml` 4879 · `fitaddStateHtml` 4889 · `captureAddFocus` 4914 · `restoreAddFocus` 4920 · **`renderFittingPhotoAdd`** 4933 · `patchAddDraftCard` 5011 · `renderAddBar` 5043

### Card actions
`growAddTextarea` 5068 · `openAddEditor` 5073 · `closeAddEditor` 5092 · `saveAddEditor` 5103 · `deleteAddCard` 5119 · `focusFirstOpenAddEditor` 5146

### Picker entry
`addPhotosFromReview` 5158 · `addPhotosPicked` 5164

### Saving
**`saveFittingPhotoAdd`** 5184

### Drive backup handoff
`applyAddBackupResult` 5296 · `startAddBackups` 5305

### Lifecycle
`resetFittingPhotoAdd` 5335 · `cleanupFittingPhotoAdd` 5367 · `seedFittingPhotoAdd` 5377

### Event wiring
`setupFittingPhotoAddListeners` 5466 · `readableAnswer` 5536 · `acceptEnquiry` 5547 · `dismissEnquiry` 5578 · `renderCustomerList` 5592 · `homepageStatus` 5616 · `compareHomepageCustomers` 5636 · `isActive` →5654 · `nextDeadline` 5656 · `relativeDays` →5669 · `firstName` →5670 · `daysUntil` →5682 · `isApproximateWedding` →5683 · `weddingText` 5685

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

- `bindEvents` (6017–6361) is one function holding every listener. Adding a control means adding one block here — do not split it. The fitting pages keep their own wiring in `setupFittingDetailListeners` 2904 and `setupFittingPhotoAddListeners` 3893, both called from it.
- The element registry (45–275) and `state` (276–400) are the two shared surfaces every region touches. A change here is repo-wide; treat it as a >5-file edit.
- The four fitting routes (feed / detail / editor / add) share `state.fittingLogs` parking, and detail + add share photo records through `state.fittingDetail.photos`. Changing one usually means checking `parkFittingLogs` 1918, `cleanupFittingLogs` 1891, and `setFittingBackControl` 2130.
- Order detail and order editor share nothing but `db.getOrder`. Editing one does not require reading the other.
