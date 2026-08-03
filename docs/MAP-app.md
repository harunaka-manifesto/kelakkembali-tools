# MAP — app.js (6460 lines, ~258 KB)

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
| 45–275 | **Element registry** — every `$("#id")` handle | `Element Registry` | You added DOM to `index.html` and need a handle |
| 276–400 | **Application state** object | `Application State` | Adding page state; read 276–400 in full |
| 401–514 | UI chrome: toast, dirty flag, save bar, app bar, menu | `UI Utilities & Chrome` | Changing bars, toasts, page actions |
| 515–669 | **Router**: curtain, route loader, error, focus | `Routing & View Transition` | Adding a route |
| 670–1239 | Status derivation, lifecycle, follow-up, `handleRoute` dispatch | `Status Helpers & Data Transformations` | Status/pipeline logic, route dispatch |
| 1240–1552 | Homepage / customer ledger render + reveal | (starts at `orderLabel`) | Homepage work |
| 1553–2136 | **Fitting logs feed** (list, paging, filters, parking) | `Fitting logs feed` | Feed work |
| 2140–2681 | **Fitting log detail** (photos, share, PDF, viewer) | `Fitting log session detail` | Detail page work |
| 2682–2996 | **Fitting photo editor** (caption, replace, delete) | `Fitting photo editor` | Editor work |
| 2997–3999 | **Add fitting photos** (batch review, captions, staged deletes, atomic save) | `Add fitting photos` | Batch add/edit page work |
| 4000–4156 | Enquiry review (accept / dismiss intake) | (starts at `readableAnswer`) | Tally intake UI |
| 4157–4421 | **Customer detail + editor** | `Customer Detail & Edit Controller` | Customer pages |
| 4422–4990 | **Order detail** view model, render, schedule, payments | `Order Detail ViewModel & UI` | Order detail page |
| 4991–5387 | **Order editor + cost calculator** (items, terms, chips) | `Order Editor & Cost Calculator` | Order editing, pricing |
| 5335–5744 | **Moodboard integration** (canvas, overlay, gestures) | `Moodboard Integration` | Moodboard page glue |
| 5745–6014 | **Exports**: PDFs, deposit logging, Drive reconnect | `Exports` | Document/PDF export flows |
| 6015–6409 | **`bindEvents`** — every listener, one function | `Boot & Event Listeners` | Wiring a new control |
| 6410–6460 | Gate, boot, session restore | `App Boot` | Auth/boot changes |

### Region read recipes

```
Read app.js offset=45   limit=231   # element registry
Read app.js offset=276  limit=125   # state shape
Read app.js offset=515  limit=155   # router
Read app.js offset=2984 limit=400   # add fitting photos (first half)
Read app.js offset=4369 limit=400   # order detail (first half)
Read app.js offset=6015 limit=395   # bindEvents
```

---

## 2. Routes → handler

Parsed in `handleRoute` at **849** (hash segments, lines 849–900). Each returns `{ view, id?, sessionId?, photoId?, query }`.

| Hash | `view` | Entry function | Line |
| :--- | :--- | :--- | ---: |
| `#/` | `customers` | `showCustomers` | 1414 |
| `#/customer/:id` | `customer` | `showCustomerDetail` | 4106 |
| `#/customer/:id/edit` | `customerEdit` | `showCustomerEdit` | 4131 |
| `#/order/:id` | `order` | `showOrderDetail` | 4701 |
| `#/order/:id/edit` | `orderEdit` | (dispatch in `handleRoute`) | 1005 |
| `#/order/:id/moodboard` | `moodboard` | `setupMoodboardListeners` | 5355 |
| `#/order/:id/moodboard/preview` | `moodboardPreview` | `openMoodboardCanvas` | 5487 |
| `#/fittings` | `fittingLogs` | `showFittingLogs` | 2061 |
| `#/fittings/:sessionId` | `fittingLogDetail` | `showFittingLogDetail` | 2611 |
| `#/fittings/:sessionId/photo/:photoId/edit` | `fittingPhotoEdit` | `showFittingPhotoEditor` | 2843 |
| `#/fittings/:sessionId/photos/add` | `fittingPhotoAdd` | `showFittingPhotoAdd` | 3821 |
| `#/order/:id/fitting/new` | `fittingNew` | (dispatch in `handleRoute`) | 874 |
| `#/order/:id/fitting/:sessionId` | `fittingJournal` | (dispatch in `handleRoute`) | 877 |
| `#/calendar` | `calendar` | `showCalendarSettings` | 4966 |
| `#/enquiry/:id` | `enquiry` | `readableAnswer` / `acceptEnquiry` | 3948 / 3959 |

**Adding a route:** add a segment case near 855–900, add a `showX` entry function in the matching region, add the `<section class="view" id="viewX" hidden>` to `index.html`, register its elements at 45–275, add state at 276–400 if it needs any. Then check the five other route surfaces the same edit touches: view toggling, `routeHasOwnLoader`/`routeLoaderKind`, `focusRoute`, `syncBottomBar`, and cleanup on leaving. That is the whole checklist.

---

## 3. Function index — symbol → line

Look up here instead of grepping. Arrow-function helpers are marked `→`.

### Chrome & router (401–669)
`showToast` 403 · `setDirty` 410 · `syncBottomBar` 416 · `syncVisualViewport` 432 · `trapModalFocus` 439 · `setSaveBar` 458 · `setPageAction` 464 · `setChrome` 472 · `closeMenu` 507 · `wait` →522 · `coverCurtain` →524 · `revealCurtain` →546 · `routeHasOwnLoader` →561 · `routeLoaderKind` →563 · `beginRouteLoader` 572 · `hideRouteLoader` →598 · `showRouteError` 616 · `focusRoute` 639

### Status, lifecycle, dispatch (670–1239)
`badgeClass` →672 · `effectiveStatus` 674 · `bumpStatus` →679 · `renderOrderStatus` 694 · `customerStatus` 700 · `orderIsPaid` →710 · `designAnchor` →711 · `productionAnchor` →712 · `openCustomerOrders` →713 · `dateOnly` →714 · `followUpPatch` 716 · `consultNudgeFor` 731 · `setFollowUp` →741 · `pushFollowUp` →751 · `canCancel` →763 · `cancelCustomer` →765 · `deleteCustomerRecord` →785 · `reopenCustomer` →802 · `go` 823 · `leaveFormFor` 828 · `confirmLeave` 842 · **`handleRoute` 849** · `renderFn` →998 · `startSessionFn` →1097 · `loadTask` →1199

### Homepage (1240–1552)
`orderLabel` 1240 · `isCosted` →1246 · `isNamed` →1247 · `greetingForClock` 1249 · `homepageOverview` 1254 · `clearHomepagePops` 1277 · `clearHomepagePresses` 1282 · `isCurrentHomepageLoad` 1286 · `beginHomepageLoad` 1290 · `renderHomepageError` 1308 · `renderHomepageHero` 1328 · `renderHomepageAlert` 1349 · `renderHomepageSummary` 1356 · `renderHomepageReady` 1362 · `prepareShortcutAppearState` 1371 · `playShortcutAppear` 1376 · `revealHomepage` →1384 · **`showCustomers` 1414** · `hapticTap` 1437

### Fitting logs feed (1553–2136)
`isFittingRoute` →1578 · `fittingStageLabel` 1580 · `fittingStageListText` 1585 · `fittingBlockHtml` 1595 · `fittingCardHtml` 1602 · `fittingSkeletonHtml` 1652 · `fittingPanelHtml` 1670 · `fittingEmptyHtml` 1681 · `fittingStateHtml` 1705 · `announceFittingStatus` 1736 · `renderFittingStages` 1743 · `renderFittingSearchClear` 1750 · `renderFittingFeed` 1758 · `fittingRequestArgs` 1789 · `ensureFittingObserver` 1801 · `stopFittingObserver` 1810 · `startFittingFirstPage` →1818 · `loadMoreFittingLogs` →1851 · `cleanupFittingLogs` 1891 · `parkFittingLogs` 1918 · `alignFittingSearch` 1933 · `scheduleFittingSearchAlign` 1949 · **`showFittingLogs` 2061** · `restoreFittingScroll` 2119 · `setFittingBackControl` 2130

### Fitting log detail (2140–2681)
`isDetailRoute` →2149 · `isEditorRoute` →2150 · `invalidateFittingFeed` 2157 · `sortFittingPhotos` 2168 · `fittingPhotoState` 2176 · `fittingPhotoDisplayURL` →2184 · `fittingDetailCardHtml` 2189 · `fittingDetailEmptyHtml` 2243 · `announceDetailStatus` 2256 · `renderFittingDetail` 2261 · `fittingPhotoBlob` 2308 · `blobToDataUrl` 2331 · `measureImage` 2340 · `fittingShareFilename` 2349 · `shareFittingPhoto` →2364 · **`downloadFittingPdf` 2418** · `openFittingPhotoViewerImage` 2487 · `openFittingPhotoViewer` 2499 · `closeFittingPhotoViewer` 2511 · `fittingDetailBridge` 2525 · `addFittingDetailPhoto` 2546 · `deleteFittingDetailLog` 2562 · `cleanupFittingDetail` 2586 · **`showFittingLogDetail` 2601**

### Fitting photo editor (2682–2996)
`fittingEditorDirty` 2687 · `syncFittingEditorDirty` 2694 · `renderFittingEditor` 2698 · `clearStagedReplacement` 2720 · `stageFittingReplacement` →2726 · `saveFittingEditor` →2748 · `deleteFittingEditorPhoto` →2813 · `cleanupFittingEditor` 2844 · **`showFittingPhotoEditor` 2856** · `setupFittingDetailListeners` 2917

### Add fitting photos (2997–3999)
`addVisibleExisting` →3015 · `addVisibleCount` →3016 · `addRemainingSlots` →3017 · `addCaptionFor` 3019 · `addSavedCaptionForKey` 3028 · `addDirty` 3035 · `announceAddStatus` 3054 · `makeAddDraft` 3066 · `releaseAddDraft` 3087 · `removeAddDraft` 3094 · `admitAddFiles` 3104 · **`runAddPreparationQueue` 3128** · `reportAddPreparationFailures` 3180 · `clearAddUndo` 3201 · `showAddUndo` 3210 · `undoAddDeletion` 3221 · `fitaddStageHtml` 3252 · `fitaddIconHtml` 3269 · `fitaddActionHtml` 3279 · `fitaddCardHtml` 3291 · `fitaddDraftStatusHtml` 3336 · `fitaddSkeletonHtml` 3344 · `fitaddStateHtml` 3354 · `captureAddFocus` 3379 · `restoreAddFocus` 3385 · **`renderFittingPhotoAdd` 3398** · `patchAddDraftCard` 3476 · `renderAddBar` 3508 · `growAddTextarea` 3533 · `openAddEditor` 3538 · `closeAddEditor` 3557 · `saveAddEditor` 3568 · `deleteAddCard` 3584 · `focusFirstOpenAddEditor` 3611 · `addPhotosFromReview` 3623 · `addPhotosPicked` 3629 · **`saveFittingPhotoAdd` 3649** · `applyAddBackupResult` 3761 · `startAddBackups` 3770 · `resetFittingPhotoAdd` 3800 · `cleanupFittingPhotoAdd` 3832 · `seedFittingPhotoAdd` 3842 · **`showFittingPhotoAdd` 3859** · `setupFittingPhotoAddListeners` 3931

### Enquiry (3948–4103)
`readableAnswer` 3948 · `acceptEnquiry` →3959 · `dismissEnquiry` →3990

### Customer detail & editor (4104–4368)
`renderCustomerList` 4004 · `sumTotal` →4020 · `homepageStatus` 4028 · `compareHomepageCustomers` 4048 · `nextDeadline` 4068 · `weddingText` 4097 · **`showCustomerDetail` 4106** · **`showCustomerEdit` 4131** · `renderCustomerReadOnly` 4175 · `custNextEvent` 4185 · `custOrderStatus` 4207 · `renderCustomerDetail` 4215 · `relativeToToday` 4245 · `fillCustomerForm` 4252 · `setNameError` 4269 · `setWeddingPrecision` 4277 · `lastDayOfMonth` 4290 · **`saveCustomer` →4297**

### Order detail (4369–4937)
`isCurrentOrderLoad` 4371 · `clearOrderPresses` 4375 · `closeOrderPaymentChooser` 4379 · `beginOrderLoad` 4385 · `orderErrorCopy` 4411 · `renderOrderError` 4418 · `orderDateLabel` 4449 · `pushInto` 4455 · `deriveLoggedDeposits` 4461 · **`orderScheduleModel` 4471** · `buildOrderDetailViewModel` 4516 · `renderOrderItems` 4572 · `renderOrderDocumentState` 4587 · `renderOrderPayments` 4595 · `renderOrderPaymentChoices` 4621 · `renderOrderSchedule` 4629 · `renderOrderReady` 4654 · `revealOrder` 4671 · **`showOrderDetail` 4701** · `refreshOrderPayments` 4766 · `refreshOrderSchedule` 4800 · `retryOrderSchedule` 4839 · `toggleOrderPaymentChooser` 4845 · `setOrderPaymentBusy` 4856 · `renderScheduleHint` 4866 · **`rescheduleOrder` 4901**

### Order editor & cost calculator (4938–5334)
`googleRedirectUri` →4945 · `connectGoogle` →4947 · `showCalendarSettings` 4966 · `disconnectGoogle` →4994 · **`saveOrder` →5008** · `validateTerms` 5053 · `addItemRow` 5067 · `refreshItemTotals` 5096 · `refreshRemoveButtons` 5124 · `readItems` 5131 · `customChip` 5144 · `addCustomInclude` 5155 · `addTermRow` 5179 · `refreshTermRemoveButtons` 5204 · `readTerms` 5216 · `refreshTermsSum` 5227 · `showTermsError` 5234 · `buildTerms` 5241 · `syncSchemeCard` 5251 · `addCalcRow` 5262 · `refreshCalcRemoveButtons` 5285 · `readCalcRows` 5292 · `refreshCalcTotal` 5300 · `closeCostCalc` 5310 · `applyCostCalc` 5326

### Moodboard (5335–5744)
**`setupMoodboardListeners` 5355** · `addMoodboardFiles` →5452 · `openMoodboardCanvas` 5487 · `moodboardStageClone` 5493 · `syncMoodboardCanvas` 5503 · `fitMoodboardBoard` 5531 · `openMoodboardOverlay` 5544 · `closeMoodboardOverlay` 5569 · `renderMoodboardOverlay` 5585 · `moodboardZoomAt` 5605 · `clampMoodboardPan` 5630 · `applyMoodboardTransform` 5642 · `bindMoodboardOverlayGestures` 5649 · `handleMoodboardOverlayKey` 5720

### Exports & boot (5745–6460)
`setMoodboardExportBusy` 5747 · `setMoodboardExportState` 5754 · `flashMoodboardExportState` 5766 · `resetMoodboardExports` 5772 · `recordMoodboardExport` 5780 · `offerGoogleReconnect` 5805 · **`exportMoodboard` →5812** · `setDocumentBusy` 5865 · **`downloadDocument` →5882** · `logDeposit` →5914 · `logDepositRequest` →5927 · `signOutFromMenu` →6000 · **`bindEvents` 6017** · `showGate` 6363 · `showApp` 6380

---

## 4. Coupling notes (read before a broad refactor)

- `bindEvents` (6017–6361) is one function holding every listener. Adding a control means adding one block here — do not split it. The fitting pages keep their own wiring in `setupFittingDetailListeners` 2904 and `setupFittingPhotoAddListeners` 3893, both called from it.
- The element registry (45–275) and `state` (276–400) are the two shared surfaces every region touches. A change here is repo-wide; treat it as a >5-file edit.
- The four fitting routes (feed / detail / editor / add) share `state.fittingLogs` parking, and detail + add share photo records through `state.fittingDetail.photos`. Changing one usually means checking `parkFittingLogs` 1918, `cleanupFittingLogs` 1891, and `setFittingBackControl` 2130.
- Order detail and order editor share nothing but `db.getOrder`. Editing one does not require reading the other.
