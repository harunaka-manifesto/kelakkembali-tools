# MAP — app.js (5402 lines, ~217 KB)

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
| 45–258 | **Element registry** — every `$("#id")` handle | `Element Registry` | You added DOM to `index.html` and need a handle |
| 259–349 | **Application state** object | `Application State` | Adding page state; read 259–349 in full |
| 350–462 | UI chrome: toast, dirty flag, save bar, app bar, menu | `UI Utilities & Chrome` | Changing bars, toasts, page actions |
| 463–609 | **Router**: curtain, route loader, error, focus | `Routing & View Transition` | Adding a route |
| 610–1164 | Status derivation, lifecycle, follow-up, `handleRoute` dispatch | `Status Helpers & Data Transformations` | Status/pipeline logic, route dispatch |
| 1165–1477 | Homepage / customer ledger render + reveal | (starts at `orderLabel`) | Homepage work |
| 1478–2061 | **Fitting logs feed** (list, paging, filters, parking) | `Fitting logs feed` | Feed work |
| 2062–2580 | **Fitting log detail** (photos, share, PDF, viewer) | `Fitting log session detail` | Detail page work |
| 2581–2890 | **Fitting photo editor** (caption, replace, delete) | `Fitting photo editor` | Editor work |
| 2891–2946 | Enquiry review (accept / dismiss intake) | (starts at `readableAnswer`) | Tally intake UI |
| 2947–3311 | **Customer detail + editor** | `Customer Detail & Edit Controller` | Customer pages |
| 3312–3880 | **Order detail** view model, render, schedule, payments | `Order Detail ViewModel & UI` | Order detail page |
| 3881–4277 | **Order editor + cost calculator** (items, terms, chips) | `Order Editor & Cost Calculator` | Order editing, pricing |
| 4278–4687 | **Moodboard integration** (canvas, overlay, gestures) | `Moodboard Integration` | Moodboard page glue |
| 4688–4957 | **Exports**: PDFs, deposit logging, Drive reconnect | `Exports` | Document/PDF export flows |
| 4958–5351 | **`bindEvents`** — every listener, one function | `Boot & Event Listeners` | Wiring a new control |
| 5352–5402 | Gate, boot, session restore | `App Boot` | Auth/boot changes |

### Region read recipes

```
Read app.js offset=45   limit=214   # element registry
Read app.js offset=259  limit=91    # state shape
Read app.js offset=463  limit=147   # router
Read app.js offset=3312 limit=400   # order detail (first half)
Read app.js offset=4958 limit=394   # bindEvents
```

---

## 2. Routes → handler

Parsed in `handleRoute` at **789** (hash segments, lines 789–840). Each returns `{ view, id?, sessionId?, photoId?, query }`.

| Hash | `view` | Entry function | Line |
| :--- | :--- | :--- | ---: |
| `#/` | `customers` | `showCustomers` | 1339 |
| `#/c/:id` | `customer` | `showCustomerDetail` | 3049 |
| `#/c/:id/edit` | `customerEdit` | `showCustomerEdit` | 3074 |
| `#/o/:id` | `order` | `showOrderDetail` | 3644 |
| `#/o/:id/edit` | `orderEdit` | (order editor region 3881+) | 3881 |
| `#/m/:id` | `moodboard` | `setupMoodboardListeners` | 4298 |
| `#/m/:id/preview` | `moodboardPreview` | `openMoodboardCanvas` | 4430 |
| `#/fittings` | `fittingLogs` | `showFittingLogs` | 1986 |
| `#/fittings/:sessionId` | `fittingLogDetail` | `showFittingLogDetail` | 2523 |
| `#/fittings/:sessionId/photo/:photoId/edit` | `fittingPhotoEdit` | `showFittingPhotoEditor` | 2757 |
| `#/o/:id/fitting/new` | `fittingNew` | (dispatch in `handleRoute`) | 813 |
| `#/o/:id/fitting/:sessionId` | `fittingJournal` | (dispatch in `handleRoute`) | 816 |
| `#/calendar` | `calendar` | `showCalendarSettings` | 3909 |
| `#/e/:id` | `enquiry` | `readableAnswer` / `acceptEnquiry` | 2891 / 2902 |

**Adding a route:** add a segment case near 789–839, add a `showX` entry function in the matching region, add the `<section class="view" id="viewX" hidden>` to `index.html`, register its elements at 45–258, add state at 259–349 if it needs any. That is the whole checklist.

---

## 3. Function index — symbol → line

Look up here instead of grepping. Arrow-function helpers are marked `→`.

### Chrome & router (350–609)
`showToast` 352 · `setDirty` 359 · `syncBottomBar` 365 · `syncVisualViewport` 380 · `trapModalFocus` 387 · `setSaveBar` 406 · `setPageAction` 412 · `setChrome` 420 · `closeMenu` 455 · `wait` →470 · `coverCurtain` →472 · `revealCurtain` →494 · `routeHasOwnLoader` →506 · `routeLoaderKind` →507 · `beginRouteLoader` 514 · `hideRouteLoader` →540 · `showRouteError` 558 · `focusRoute` 581

### Status, lifecycle, dispatch (610–1164)
`badgeClass` →612 · `effectiveStatus` 614 · `bumpStatus` →619 · `renderOrderStatus` 634 · `customerStatus` 640 · `orderIsPaid` →650 · `designAnchor` →651 · `productionAnchor` →652 · `openCustomerOrders` →653 · `dateOnly` →654 · `followUpPatch` 656 · `consultNudgeFor` 671 · `setFollowUp` →681 · `pushFollowUp` →691 · `canCancel` →703 · `cancelCustomer` →705 · `deleteCustomerRecord` →725 · `reopenCustomer` →742 · `go` 763 · `leaveFormFor` 768 · `confirmLeave` 782 · **`handleRoute` 789** · `renderFn` →925 · `startSessionFn` →1024 · `loadTask` →1124

### Homepage (1165–1477)
`orderLabel` 1165 · `isCosted` →1171 · `isNamed` →1172 · `greetingForClock` 1174 · `homepageOverview` 1179 · `clearHomepagePops` 1202 · `clearHomepagePresses` 1207 · `isCurrentHomepageLoad` 1211 · `beginHomepageLoad` 1215 · `renderHomepageError` 1233 · `renderHomepageHero` 1253 · `renderHomepageAlert` 1274 · `renderHomepageSummary` 1281 · `renderHomepageReady` 1287 · `prepareShortcutAppearState` 1296 · `playShortcutAppear` 1301 · `revealHomepage` →1309 · **`showCustomers` 1339** · `hapticTap` 1362

### Fitting logs feed (1478–2061)
`isFittingRoute` →1503 · `fittingStageLabel` 1505 · `fittingStageListText` 1510 · `fittingBlockHtml` 1520 · `fittingCardHtml` 1527 · `fittingSkeletonHtml` 1577 · `fittingPanelHtml` 1595 · `fittingEmptyHtml` 1606 · `fittingStateHtml` 1630 · `announceFittingStatus` 1661 · `renderFittingStages` 1668 · `renderFittingSearchClear` 1675 · `renderFittingFeed` 1683 · `fittingRequestArgs` 1714 · `ensureFittingObserver` 1726 · `stopFittingObserver` 1735 · `startFittingFirstPage` →1743 · `loadMoreFittingLogs` →1776 · `cleanupFittingLogs` 1816 · `parkFittingLogs` 1843 · `alignFittingSearch` 1858 · `scheduleFittingSearchAlign` 1874 · **`showFittingLogs` 1986** · `restoreFittingScroll` 2044 · `setFittingBackControl` 2055

### Fitting log detail (2062–2580)
`isDetailRoute` →2071 · `isEditorRoute` →2072 · `invalidateFittingFeed` 2077 · `sortFittingPhotos` 2088 · `fittingPhotoState` 2096 · `fittingPhotoDisplayURL` →2104 · `fittingDetailCardHtml` 2109 · `fittingDetailEmptyHtml` 2163 · `announceDetailStatus` 2176 · `renderFittingDetail` 2181 · `fittingPhotoBlob` 2228 · `blobToDataUrl` 2251 · `measureImage` 2260 · `fittingShareFilename` 2269 · `shareFittingPhoto` →2284 · **`downloadFittingPdf` 2338** · `openFittingPhotoViewer` 2407 · `closeFittingPhotoViewer` 2421 · `fittingDetailBridge` 2435 · `addFittingDetailPhoto` 2453 · `endFittingDetailSession` →2461 · `deleteFittingDetailLog` →2484 · `cleanupFittingDetail` 2508 · **`showFittingLogDetail` 2523**

### Fitting photo editor (2581–2890)
`fittingEditorDirty` 2586 · `syncFittingEditorDirty` 2593 · `renderFittingEditor` 2597 · `clearStagedReplacement` 2619 · `stageFittingReplacement` →2625 · `saveFittingEditor` →2649 · `deleteFittingEditorPhoto` →2714 · `cleanupFittingEditor` 2745 · **`showFittingPhotoEditor` 2757** · `setupFittingDetailListeners` 2818

### Enquiry (2891–2946)
`readableAnswer` 2891 · `acceptEnquiry` →2902 · `dismissEnquiry` →2933

### Customer detail & editor (2947–3311)
`renderCustomerList` 2947 · `sumTotal` →2963 · `homepageStatus` 2971 · `compareHomepageCustomers` 2991 · `nextDeadline` 3011 · `weddingText` 3040 · **`showCustomerDetail` 3049** · **`showCustomerEdit` 3074** · `renderCustomerReadOnly` 3118 · `custNextEvent` 3128 · `custOrderStatus` 3150 · `renderCustomerDetail` 3158 · `relativeToToday` 3188 · `fillCustomerForm` 3195 · `setNameError` 3212 · `setWeddingPrecision` 3220 · `lastDayOfMonth` 3233 · **`saveCustomer` →3240**

### Order detail (3312–3880)
`isCurrentOrderLoad` 3314 · `clearOrderPresses` 3318 · `closeOrderPaymentChooser` 3322 · `beginOrderLoad` 3328 · `orderErrorCopy` 3354 · `renderOrderError` 3361 · `orderDateLabel` 3392 · `pushInto` 3398 · `deriveLoggedDeposits` 3404 · **`orderScheduleModel` 3414** · `buildOrderDetailViewModel` 3459 · `renderOrderItems` 3515 · `renderOrderDocumentState` 3530 · `renderOrderPayments` 3538 · `renderOrderPaymentChoices` 3564 · `renderOrderSchedule` 3572 · `renderOrderReady` 3597 · `revealOrder` 3614 · **`showOrderDetail` 3644** · `refreshOrderPayments` 3709 · `refreshOrderSchedule` 3743 · `retryOrderSchedule` 3782 · `toggleOrderPaymentChooser` 3788 · `setOrderPaymentBusy` 3799 · `renderScheduleHint` 3809 · **`rescheduleOrder` 3844**

### Order editor & cost calculator (3881–4277)
`googleRedirectUri` →3888 · `connectGoogle` →3890 · `showCalendarSettings` 3909 · `disconnectGoogle` →3937 · **`saveOrder` →3951** · `validateTerms` 3996 · `addItemRow` 4010 · `refreshItemTotals` 4039 · `refreshRemoveButtons` 4067 · `readItems` 4074 · `customChip` 4087 · `addCustomInclude` 4098 · `addTermRow` 4122 · `refreshTermRemoveButtons` 4147 · `readTerms` 4159 · `refreshTermsSum` 4170 · `showTermsError` 4177 · `buildTerms` 4184 · `syncSchemeCard` 4194 · `addCalcRow` 4205 · `refreshCalcRemoveButtons` 4228 · `readCalcRows` 4235 · `refreshCalcTotal` 4243 · `closeCostCalc` 4253 · `applyCostCalc` 4269

### Moodboard (4278–4687)
**`setupMoodboardListeners` 4298** · `addMoodboardFiles` →4395 · `openMoodboardCanvas` 4430 · `moodboardStageClone` 4436 · `syncMoodboardCanvas` 4446 · `fitMoodboardBoard` 4474 · `openMoodboardOverlay` 4487 · `closeMoodboardOverlay` 4512 · `renderMoodboardOverlay` 4528 · `moodboardZoomAt` 4548 · `clampMoodboardPan` 4573 · `applyMoodboardTransform` 4585 · `bindMoodboardOverlayGestures` 4592 · `handleMoodboardOverlayKey` 4663

### Exports & boot (4688–5402)
`setMoodboardExportBusy` 4690 · `setMoodboardExportState` 4697 · `flashMoodboardExportState` 4709 · `resetMoodboardExports` 4715 · `recordMoodboardExport` 4723 · `offerGoogleReconnect` 4748 · **`exportMoodboard` →4755** · `setDocumentBusy` 4808 · **`downloadDocument` →4825** · `logDeposit` →4857 · `logDepositRequest` →4870 · `signOutFromMenu` →4943 · **`bindEvents` 4960** · `showGate` 5305 · `showApp` 5322

---

## 4. Coupling notes (read before a broad refactor)

- `bindEvents` (4960–5304) is one 344-line function holding every listener. Adding a control means adding one block here — do not split it.
- The element registry (45–258) and `state` (259–349) are the two shared surfaces every region touches. A change here is repo-wide; treat it as a >5-file edit.
- The three fitting routes (feed / detail / editor) share `state.fittingLogs` parking. Changing one usually means checking `parkFittingLogs` 1843, `cleanupFittingLogs` 1816, and `setFittingBackControl` 2055.
- Order detail and order editor share nothing but `db.getOrder`. Editing one does not require reading the other.
