# MAP — index.html & styles/

Presentation layer. **Never read any of these files whole.** Jump to the range.

---

## index.html (1895 lines)

Structure: boot gate → auth gate → app shell (bar + header + all views) → overlays → locked PDF templates → scripts.

### Top-level blocks

| Lines | Block | Read when |
| ---: | :--- | :--- |
| 1–26 | Head, first-paint contract, stylesheet links | Changing CSS load order or the pre-paint theme |
| 27–33 | `#boot` — held until `db.js` resolves the session | Boot/auth |
| 34–56 | `#gate` — shared-password sign-in | Auth UI |
| 57–115 | `#app` shell: `.appbar`, overflow menu, `.pagehead` | App bar, title, page action |
| 116–1377 | **Routed views** (table below) | Feature work |
| 1378–1516 | Overlays: new-document sheet, month bar, day sheet, stage picker, photo viewer, **mark overlay**, undo toast, bottom bars | Fitting flow, bottom bars |
| 1517–1568 | `#savebar`, `#calcSheet` — cost calculator scratchpad | Pricing UI |
| 1569–1692 | `#routeLoader` shared fallback, `#toast` | Loading/toast |
| 1693–1880 | **Locked spec** PDF templates | Only on explicit request |
| 1881–1893 | CDN scripts + module load order | Adding a module |

### Views — id → line range

| Starts | View id | CSS class | Owner in app.js |
| ---: | :--- | :--- | :--- |
| 117 | `#viewCustomers` | `.view.home` | `showCustomers` 1923 |
| 214 | `#viewCustomer` | `.view.cust` | `showCustomerDetail` 6482 |
| 325 | `#viewFittingLogs` | `.view.fitlog` | `showFittingLogs` 3331 |
| 392 | `#viewFittingDetail` | `.view.fitdet` | `showFittingLogDetail` 4691 |
| 455 | `#viewFittingPhotoAdd` | `.view.fitadd` | `showFittingPhotoAdd` 6117 |
| 501 | `#viewCustomerEdit` | `.view.custedit` | `showCustomerEdit` 6507 |
| 712 | `#viewOrderEdit` | `.view` | order editor region 7341 |
| 811 | `#viewOrder` | `.view.order` | `showOrderDetail` 7104 |
| 1050 | `#viewCalendar` | `.view` | `showCalendarSettings` 7369 |
| 1084 | `#viewMoodboard` | `.view.moodboard-page` | `setupMoodboardListeners` 7768 |
| 1226 | `#viewEnquiry` | `.view` | `acceptEnquiry` 6306 |
| 1255 | `#viewSchedules` | `.view.schedcal` | `showSchedules` 2759 |
| 1320 | `#viewDocuments` | `.view.doclist` | `showDocuments` 3745 |

`#viewFittingPhotoEdit` and `#viewFittingJournal` are gone. The per-photo editor
and the camera journal were retired into `#viewFittingPhotoAdd`, which is the one
place a fitting log is edited; both old routes redirect there or to detail.

### Overlays & bars — id → line

`#docnewSheet` 1380 (new-document picker) · `#schedcalMonthbar` 1404 (fixed month paging, measured by `syncBottomBar`) · `#schedcalSheet` 1420 (calendar day sheet) · `#fittingPicker` 1438 (**the only fitting overlay left** — which fitting is this) · `#fittingPhotoViewer` 1442 · **`#fitmark` 1456** (full-screen red-pen mode) · `#fitdetBar` 1476 (two buttons) · `#fitaddUndo` 1493 · `#fitaddBar` 1500 · `#savebar` 1517 · `#calcSheet` 1530 · `#routeLoader` 1569 · `#toast` 1691

Hidden file inputs: `#fitdetPhotoInput` 445 (multi-select entry from detail) · `#fitaddFileInput` 488 (append in the workspace)

`#fitmark` holds an `<img>` and a `<canvas>` in one `.fitmark__stage`. The canvas
is positioned and sized by `layoutFittingMark`, never by CSS: it has to cover the
contained image rather than the stage, or every mark lands off by the letterbox.
`.fitmark__canvas { touch-action: none; }` is the line that stops the page
scrolling under a stroke.

### Locked PDF templates — do not edit without explicit request

| Lines | Template | Rendered by |
| ---: | :--- | :--- |
| 1693–1781 | `#quotation` | `docs.js` → `render` |
| 1782–1858 | `#invoice` | `docs.js` → `render` |
| 1859–1880 | moodboard document | `moodboard.js` → `generatePDF` |

Rendered off-screen at exact Figma dimensions, snapshotted by html2canvas. Any pixel change breaks the design contract.

### Script load order (1885–1893) — this is the dependency graph

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

### styles/pages.css (4594 lines) — section → line

**Homepage:** Customers homepage 76 · Stage and layers 106 · Hero 133 · Fixed nav bar 177 · Shortcut row 240 · Submissions bar 294 · Search 342 · Customer ledger 367 · Footer 518 · Loading skeleton 534 · Error state 614

**Customer detail:** 661 · Navigation 686 · Hero 753 · Banners 771 · Order ledger 851

**Customer editor:** 994 · Error state 1157 · Status actions 1193 · Save bar 1250

**Order detail:** 1350 · Stage and layers 1368 · Navigation 1398 · Ledger 1468 · Cards 1501 · Designs 1534 · Items table 1614 · Payments 1665 · Schedules 1743 · Actions 1897 · Footer 1978 · Loading skeleton 1995 · Error state 2042

**Fitting logs:** 2295 · Title band 2348 · Search 2384 · Stage filters 2444 · Feed 2519 · Feed message panels 2629 · Skeletons 2673 · Feed card as link 2748 · Photo cards 2862 · Card actions 2950 · Fixed bottom bar 3001 · Delete block 3075 · **Fitting workspace 3119** · Inline caption editor 3192 · Undo toast 3240 · Workspace skeletons 3286 · **Photo annotation 3322** · Photo viewer 3433 · Detail focus rings 3492 · Detail route skeleton 3529

**Schedules calendar:** 3596 · Title band 3634 · Month bar (fixed, foot of screen) 3674 · The grid 3767 · Week bands 3908 · Skeleton and states 3935 · Approximate-wedding note 4007 · Legend 4059 · Day sheet 4123

**Quotations & invoices:** 4334 · Card 4402 · Panels, skeletons, footer 4508

### styles/shared.css (2411 lines) — section → line

Boot 5 · Shared route loading 52 · Gate 300 · App bar 361 · Overflow menu 466 · Page header 514 · Layout 553 · Deadlines 749 · Lists and records 859 · Schedule 1117 · Items table 1215 · Payment chooser 1328 · Segmented 1396 · Download log 1420 · Fields 1474 · Item rows 1586 · Payment terms 1689 · Chips 1753 · Inline add row 1840 · Buttons 1851 · Fixed bottom bars 1964 · Cost sheet 2052 · Cost calc trigger 2158 · Toast 2192 · Interaction motion 2223 · New document picker 2279

### styles/documents.css (473 lines)

Header block 84 · Items block 182 · Includes/Excludes 254 · Payment terms 298 · Signature 351 · (invoice variants) 378

### styles/moodboard.css (607 lines)

Editor page 8 · Generated canvas 264 · Actions 352 · Full-screen overlay 437 · Fitting stage picker 502 · Moodboard document (off-screen) 530

### Class-prefix → feature

| Prefix | Feature | File |
| :--- | :--- | :--- |
| `.schedcal-*` | Schedules calendar (day keys, per-week bands, month bar, day sheet) | `pages.css` 3596+ |
| `.doclist-*` | Quotations and invoices list (both routes) | `pages.css` 4334+ |
| `.docnew*` | New-document picker — utility chrome, not ledger canvas | `shared.css` 2285+ |
| `.fitlog-*` | Fitting logs feed (search block reused by `.doclist`) | `pages.css` 2295+ |
| `.fitdet-*` | Fitting log detail (cards, actions and bars reused by the workspace) | `pages.css` 2862+ |
| `.fitadd-*` | Fitting workspace: photo stage, inline caption editor, undo toast | `pages.css` 3119+ |
| `.fitmark-*` | Red-pen marks: the read-only `.fitmark-layer` overlay and the full-screen `.fitmark` mode | `pages.css` 3322+ |
| `.fitview*` | Photo viewer overlay | `pages.css` 3433+ |
| `.fitting-picker*` | Fitting stage picker sheet | `moodboard.css` 502+ |
| `.cust*` / `.custedit*` | Customer pages | `pages.css` 661+, 994+ |
| `.order*` | Order detail | `pages.css` 1350+ |
| `.q`, `.q.inv` | Quotation / invoice documents | `documents.css` |
| `.appbar`, `.pagehead`, `.savebar`, `.btn`, `.chip`, `.toast` | Shared chrome | `shared.css` |

**Rule:** add new rules at the end of the matching section, keeping the existing prefix. Never create a new stylesheet.
