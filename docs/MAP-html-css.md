# MAP — index.html & styles/

Presentation layer. **Never read any of these files whole.** Jump to the range.

---

## index.html (1614 lines)

Structure: boot gate → auth gate → app shell (bar + header + all views) → overlays → locked PDF templates → scripts.

### Top-level blocks

| Lines | Block | Read when |
| ---: | :--- | :--- |
| 1–26 | Head, first-paint contract, stylesheet links | Changing CSS load order or the pre-paint theme |
| 27–33 | `#boot` — held until `db.js` resolves the session | Boot/auth |
| 34–56 | `#gate` — shared-password sign-in | Auth UI |
| 57–115 | `#app` shell: `.appbar`, overflow menu, `.pagehead` | App bar, title, page action |
| 116–1225 | **Routed views** (table below) | Feature work |
| 1226–1298 | Overlays: camera, confirm, caption, stage picker, edit sheet, photo viewer, bottom bars, savebar | Fitting capture flow, bottom bars |
| 1299–1340 | `#calcSheet` — cost calculator scratchpad | Pricing UI |
| 1341–1411 | `#routeLoader` shared fallback, `#toast` | Loading/toast |
| 1412–1599 | **Locked spec** PDF templates | Only on explicit request |
| 1600–1613 | CDN scripts + module load order | Adding a module |

### Views — id → line range

| Lines | View id | CSS class | Owner in app.js |
| ---: | :--- | :--- | :--- |
| 117–175 | `#viewCustomers` | `.view.home` | `showCustomers` 1339 |
| 183–277 | `#viewCustomer` | `.view.cust` | `showCustomerDetail` 3049 |
| 288–345 | `#viewFittingLogs` | `.view.fitlog` | `showFittingLogs` 1986 |
| 355–399 | `#viewFittingDetail` | `.view.fitdet` | `showFittingLogDetail` 2523 |
| 404–460 | `#viewFittingPhotoEdit` | `.view.fitedit` | `showFittingPhotoEditor` 2757 |
| 470–679 | `#viewCustomerEdit` | `.view.custedit` | `showCustomerEdit` 3074 |
| 681–774 | `#viewOrderEdit` | `.view` | order editor region 3881 |
| 780–1017 | `#viewOrder` | `.view.order` | `showOrderDetail` 3644 |
| 1019–1051 | `#viewCalendar` | `.view` | `showCalendarSettings` 3909 |
| 1053–1193 | `#viewMoodboard` | `.view.moodboard-page` | `setupMoodboardListeners` 4298 |
| 1195–1198 | `#viewFittingJournal` | `.view` | `KK.fittings.renderJournal` |
| 1200–1225 | `#viewEnquiry` | `.view` | `acceptEnquiry` 2902 |

### Overlays & bars — id → line

`#fittingCamera` 1227 · `#fittingConfirm` 1239 · `#fittingCaptionStep` 1244 · `#fittingPicker` 1249 · `#fittingEditSheet` 1251 · `#fittingPhotoViewer` 1255 · `#fitdetBar` 1263 · `#fiteditBar` 1276 · `#fittingJournalBar` 1285 · `#savebar` 1289 · `#calcSheet` 1302 · `#routeLoader` 1341 · `#toast` 1410

### Locked PDF templates — do not edit without explicit request

| Lines | Template | Rendered by |
| ---: | :--- | :--- |
| 1412–1500 | `#quotation` | `docs.js` → `render` |
| 1501–1577 | `#invoice` | `docs.js` → `render` |
| 1578–1599 | moodboard document | `moodboard.js` → `generatePDF` |

Rendered off-screen at exact Figma dimensions, snapshotted by html2canvas. Any pixel change breaks the design contract.

### Script load order (1604–1612) — this is the dependency graph

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

### styles/pages.css (2986 lines) — section → line

**Homepage:** Customers homepage 76 · Stage and layers 106 · Hero 133 · Fixed nav bar 177 · Shortcut row 240 · Submissions bar 294 · Search 342 · Customer ledger 367 · Footer 518 · Loading skeleton 534 · Error state 614

**Customer detail:** 661 · Navigation 686 · Hero 753 · Banners 771 · Order ledger 851

**Customer editor:** 994 · Error state 1157 · Status actions 1193 · Save bar 1250

**Order detail:** 1350 · Stage and layers 1368 · Navigation 1398 · Ledger 1468 · Cards 1501 · Designs 1534 · Items table 1614 · Payments 1665 · Schedules 1743 · Actions 1897 · Footer 1978 · Loading skeleton 1995 · Error state 2042

**Fitting logs:** 2113 · Title band 2153 · Search 2189 · Stage filters 2249 · Feed 2324 · Feed message panels 2434 · Skeletons 2478 · Feed card as link 2552 · Photo cards 2653 · Card actions 2739 · Fixed bottom bar 2790 · Editor 2845 · Photo viewer 2887 · Detail focus rings 2939

### styles/shared.css (2277 lines) — section → line

Boot 5 · Shared route loading 52 · Gate 300 · App bar 361 · Overflow menu 466 · Page header 514 · Layout 553 · Deadlines 749 · Lists and records 859 · Schedule 1117 · Items table 1215 · Payment chooser 1328 · Segmented 1396 · Download log 1420 · Fields 1474 · Item rows 1586 · Payment terms 1689 · Chips 1753 · Inline add row 1840 · Buttons 1851 · Fixed bottom bars 1964 · Cost sheet 2052 · Cost calc trigger 2158 · Toast 2192 · Interaction motion 2223

### styles/documents.css (473 lines)

Header block 84 · Items block 182 · Includes/Excludes 254 · Payment terms 298 · Signature 351 · (invoice variants) 378

### styles/moodboard.css (659 lines)

Editor page 8 · Generated canvas 264 · Actions 352 · Full-screen overlay 437 · Fitting journal 502 · Moodboard document (off-screen) 582

### Class-prefix → feature

| Prefix | Feature | File |
| :--- | :--- | :--- |
| `.fitlog-*` | Fitting logs feed | `pages.css` 2113+ |
| `.fitdet-*` | Fitting log detail | `pages.css` 2653+ |
| `.fitedit-*` | Fitting photo editor | `pages.css` 2845+ |
| `.fitview*` | Photo viewer overlay | `pages.css` 2887+ |
| `.fitting-*` | Journal, camera, picker overlays | `moodboard.css` 502+ |
| `.cust*` / `.custedit*` | Customer pages | `pages.css` 661+, 994+ |
| `.order*` | Order detail | `pages.css` 1350+ |
| `.q`, `.q.inv` | Quotation / invoice documents | `documents.css` |
| `.appbar`, `.pagehead`, `.savebar`, `.btn`, `.chip`, `.toast` | Shared chrome | `shared.css` |

**Rule:** add new rules at the end of the matching section, keeping the existing prefix. Never create a new stylesheet.
