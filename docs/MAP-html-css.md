# MAP — index.html & styles/

Presentation layer. **Never read any of these files whole.** Jump to the range.

---

## index.html (1907 lines)

Structure: boot gate → auth gate → app shell (bar + header + all views) → overlays → locked PDF templates → scripts.

### Top-level blocks

| Lines | Block | Read when |
| ---: | :--- | :--- |
| 1–26 | Head, first-paint contract, stylesheet links | Changing CSS load order or the pre-paint theme |
| 27–33 | `#boot` — held until `db.js` resolves the session | Boot/auth |
| 34–56 | `#gate` — shared-password sign-in | Auth UI |
| 57–115 | `#app` shell: `.appbar`, overflow menu, `.pagehead` | App bar, title, page action |
| 116–1276 | **Routed views** (table below) | Feature work |
| 1277–1374 | Overlays: camera, confirm, caption, stage picker, edit sheet, photo viewer, undo toast, bottom bars, savebar | Fitting capture flow, bottom bars |
| 1375–1416 | `#calcSheet` — cost calculator scratchpad | Pricing UI |
| 1417–1542 | `#routeLoader` shared fallback, `#toast` | Loading/toast |
| 1543–1727 | **Locked spec** PDF templates | Only on explicit request |
| 1728–1743 | CDN scripts + module load order | Adding a module |

### Views — id → line range

| Starts | View id | CSS class | Owner in app.js |
| ---: | :--- | :--- | :--- |
| 117 | `#viewCustomers` | `.view.home` | `showCustomers` 1565 |
| 183 | `#viewCustomer` | `.view.cust` | `showCustomerDetail` 5694 |
| 294 | `#viewFittingLogs` | `.view.fitlog` | `showFittingLogs` 2865 |
| 361 | `#viewFittingDetail` | `.view.fitdet` | `showFittingLogDetail` 4165 |
| 422 | `#viewFittingPhotoEdit` | `.view.fitedit` | `showFittingPhotoEditor` 4397 |
| 488 | `#viewFittingPhotoAdd` | `.view.fitadd` | `showFittingPhotoAdd` 5394 |
| 534 | `#viewCustomerEdit` | `.view.custedit` | `showCustomerEdit` 5719 |
| 745 | `#viewOrderEdit` | `.view` | order editor region 6553 |
| 844 | `#viewOrder` | `.view.order` | `showOrderDetail` 6316 |
| 1083 | `#viewCalendar` | `.view` | `showCalendarSettings` 6581 |
| 1117 | `#viewMoodboard` | `.view.moodboard-page` | `setupMoodboardListeners` 6970 |
| 1259 | `#viewFittingJournal` | `.view` | `KK.fittings.renderJournal` |
| 1264 | `#viewEnquiry` | `.view` | `acceptEnquiry` 5547 |
| 1297 | `#viewSchedules` | `.view.schedcal` | `showSchedules` 2736 |
| 1373 | `#viewDocuments` | `.view.doclist` | `showDocuments` 3721 |

### Overlays & bars — id → line

`#docnewSheet` 1456 (new-document picker) · `#schedcalSheet` 1474 (calendar day sheet) · `#fittingCamera` 1285 · `#fittingConfirm` 1297 · `#fittingCaptionStep` 1302 · `#fittingPicker` 1307 · `#fittingEditSheet` 1309 · `#fittingPhotoViewer` 1313 · `#fitdetBar` 1321 · `#fiteditBar` 1335 · `#fitaddUndo` 1347 · `#fitaddBar` 1354 · `#fittingJournalBar` 1368 · `#savebar` 1372 · `#calcSheet` 1385 · `#routeLoader` 1424 · `#toast` 1546

Hidden file inputs: `#fitdetPhotoInput` 408 (multi-select entry from detail) · `#fitaddFileInput` 520 (append on the review page) · `#fiteditFileInput` 472 · `#fittingFileInput` 1295

### Locked PDF templates — do not edit without explicit request

| Lines | Template | Rendered by |
| ---: | :--- | :--- |
| 1544–1634 | `#quotation` | `docs.js` → `render` |
| 1635–1711 | `#invoice` | `docs.js` → `render` |
| 1712–1727 | moodboard document | `moodboard.js` → `generatePDF` |

Rendered off-screen at exact Figma dimensions, snapshotted by html2canvas. Any pixel change breaks the design contract.

### Script load order (1733–1741) — this is the dependency graph

`config.js` → `util.js` → `docs.js` → `moodboard.js` → `fittings.js` → `fitting-pdf.js` → `db.js` → `calendar.js` → `app.js`

Preceded by CDN: html2canvas 1.4.1, jsPDF 2.5.2, heic2any 0.0.4, supabase-js 2.45.4.

---

## styles/ — actual load order

`fonts.css` → `styles/pages.css` → `styles/shared.css` → `styles/documents.css` → `styles/moodboard.css` (index.html 18–22).

`shared.css` loads **after** `pages.css`, so shared rules win ties at equal specificity. Put page-specific overrides in `pages.css` with higher specificity, not later in `shared.css`.

### Which file

| Need | File |
| :--- | :--- |
| A specific page's layout | `pages.css` |
| A control reused across pages (button, field, chip, bar, toast) | `shared.css` |
| Quotation / invoice PDF | `documents.css` |
| Moodboard editor, canvas, overlay, journal | `moodboard.css` |
| Fonts | `fonts.css` — never open, base64 only |

### styles/pages.css (4114 lines) — section → line

**Homepage:** Customers homepage 76 · Stage and layers 106 · Hero 133 · Fixed nav bar 177 · Shortcut row 240 · Submissions bar 294 · Search 342 · Customer ledger 367 · Footer 518 · Loading skeleton 534 · Error state 614

**Customer detail:** 661 · Navigation 686 · Hero 753 · Banners 771 · Order ledger 851

**Customer editor:** 994 · Error state 1157 · Status actions 1193 · Save bar 1250

**Order detail:** 1350 · Stage and layers 1368 · Navigation 1398 · Ledger 1468 · Cards 1501 · Designs 1534 · Items table 1614 · Payments 1665 · Schedules 1743 · Actions 1897 · Footer 1978 · Loading skeleton 1995 · Error state 2042

**Fitting logs:** 2113 · Title band 2153 · Search 2189 · Stage filters 2249 · Feed 2324 · Feed message panels 2434 · Skeletons 2478 · Feed card as link 2553 · Photo cards 2667 · Card actions 2753 · Fixed bottom bar 2804 · Delete block 2868 · Editor 2912 · **Add fitting photos 2978** · Inline caption editor 3051 · Undo toast 3105 · Add-page skeletons 3151 · Photo viewer 3187 · Detail focus rings 3239 · Detail route skeleton 3279

**Schedules calendar:** 3364 · Title band 3395 · Month bar 3426 · Approximate notice 3471 · The grid 3504 · Panels and legend 3616 · Day sheet 3700

**Quotations & invoices:** 3871 · Card 3937 · Panels, skeletons, footer 4035

### styles/shared.css (2384 lines) — section → line

Boot 5 · Shared route loading 52 · Gate 300 · App bar 361 · Overflow menu 466 · Page header 514 · Layout 553 · Deadlines 749 · Lists and records 859 · Schedule 1117 · Items table 1215 · Payment chooser 1328 · Segmented 1396 · Download log 1420 · Fields 1474 · Item rows 1586 · Payment terms 1689 · Chips 1753 · Inline add row 1840 · Buttons 1851 · Fixed bottom bars 1964 · Cost sheet 2052 · Cost calc trigger 2158 · Toast 2192 · Interaction motion 2223 · New document picker 2279

### styles/documents.css (473 lines)

Header block 84 · Items block 182 · Includes/Excludes 254 · Payment terms 298 · Signature 351 · (invoice variants) 378

### styles/moodboard.css (659 lines)

Editor page 8 · Generated canvas 264 · Actions 352 · Full-screen overlay 437 · Fitting journal 502 · Moodboard document (off-screen) 582

### Class-prefix → feature

| Prefix | Feature | File |
| :--- | :--- | :--- |
| `.schedcal-*` | Schedules calendar (day keys, per-week bands, day sheet) | `pages.css` 3434+ |
| `.doclist-*` | Quotations and invoices list (both routes) | `pages.css` 4130+ |
| `.docnew*` | New-document picker — utility chrome, not ledger canvas | `shared.css` 2285+ |
| `.fitlog-*` | Fitting logs feed (search block reused by `.doclist`) | `pages.css` 2113+ |
| `.fitdet-*` | Fitting log detail (reused by the editor and add pages) | `pages.css` 2667+ |
| `.fitedit-*` | Fitting photo editor | `pages.css` 2912+ |
| `.fitadd-*` | Add fitting photos: 4:3 stage, inline caption editor, undo toast | `pages.css` 2978+ |
| `.fitview*` | Photo viewer overlay | `pages.css` 3163+ |
| `.fitting-*` | Journal, camera, picker overlays | `moodboard.css` 502+ |
| `.cust*` / `.custedit*` | Customer pages | `pages.css` 661+, 994+ |
| `.order*` | Order detail | `pages.css` 1350+ |
| `.q`, `.q.inv` | Quotation / invoice documents | `documents.css` |
| `.appbar`, `.pagehead`, `.savebar`, `.btn`, `.chip`, `.toast` | Shared chrome | `shared.css` |

**Rule:** add new rules at the end of the matching section, keeping the existing prefix. Never create a new stylesheet.
