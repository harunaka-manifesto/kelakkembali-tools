# Schedules calendar, quotations list, invoices list

## Context

Three of the four home shortcuts are dead. `index.html:162-167` renders Schedule / Quotation / Invoice as `<button aria-disabled="true">` with no href and no handler — inertness enforced at `app.js:1467` and `app.js:1474-1476`. Only Fitting is a real link. The same three repeat as inert `<div>` banners on customer detail (`index.html:219-259`, guards at `app.js:1483-1490` / `1503-1505`). They are fully styled and animate in with the rest of the row, so they look live and lead nowhere.

The machinery behind all three already exists per-order; what's missing is the cross-cutting index view:

- **Schedules** — `order_events` holds every appointment (`schema.sql:267-279`, plus `end_date` at 589 and `pinned` at 595). `calendar.plannedWeek()` (`calendar.js:64-74`) already turns a stored fitting date into its Mon–Sun week, and the order page already prints fittings that way (`app.js:4516-4520`). No new table.
- **Quotations / invoices** — `README.md:145-146`: *"A quotation and an invoice are two renderings of one order, not two records."* The only durable trace is a `document_log` row (`schema.sql:69-75`, widened 672-682): `order_id, kind, total, drive_link, created_at`. No line items, no document number, no stored PDF. So the lists feed off `document_log`, and "create new" = pick customer → pick order → run the existing `docs.download()` + `db.logDocument()`.

Outcome: three live routes — `#/schedules`, `#/quotations`, `#/invoices` — and eight entry points that stop lying.

---

## Shared decisions

### Data access rule

> A Postgres view when the query needs server-side search or cursor paging over an unbounded table. A client-side join when the working set is small, bounded, and already fetched elsewhere.

- **Schedules → client join, no schema change.** Fixed month window, no search, no paging. `showCustomers` (`app.js:1425`) already `Promise.all`s `listCustomers + listAllOrders + listAllOrderEvents` on the busiest page in the app; the calendar needs those three plus one small read. `order_events` caps at 7 rows/order, `fitting_sessions` at 5. A view would have to be a four-way `UNION ALL` with synthesised ids — three of the four sources have no `order_events` row at all. **Load once per route visit; page months purely client-side** so prev/next costs zero round trips. Comment the tipping point: past ~5k `order_events` rows, switch `listAllOrderEvents` to a `.gte`/`.lte` ±13-month range query — no render changes needed.
- **Documents → new view `public.document_feed`.** Server-side `ilike` + cursor paging are required, and `document_log` has no customer name, no order label, no search column. The join *must* happen in the DB. It's also the one table that grows forever.

### CSS prefixes

`.schedcal-` for the calendar — `.sched` / `.sched__row` is already taken by `calendar.renderSchedule` and `.order-schedule-*` by the order page. `.doclist-` for both document lists — not `.doc-`, which reads like `documents.css`'s locked `.q` templates. Both get new sections at the end of `styles/pages.css`; never a new stylesheet.

### Invert the inertness guards instead of extending them

Four call sites hard-code which controls are alive. Replace each with a self-maintaining rule — **live iff it's an `<a>`**:

- `app.js:1467` → `… && !target.matches("a.home-action")`
- `app.js:1474-1476` → `… && !e.target.closest("a.home-action")`
- `app.js:1488` → `… && !target.matches("a.cust-banner")`
- `app.js:1503-1505` → `… && !e.target.closest("a.cust-banner")`

Update the comments at 1472 / 1502 — "Fitting is the one shortcut that leads somewhere" stops being true. After all three features only `#enquiriesCard` stays inert, and the guards hold it with no further edits.

### Stage colours: widen the token block, don't re-list hexes

`U.FITTING_STAGES` (`util.js:31-37`) covers only the five production stages; `fittingStage()` falls back to `#4c4c4c` for the two design rows. **Do not add a sixth entry** — `tests/pure-modules.test.cjs:201` asserts those five map one-to-one onto `fitting_log_feed`'s `stage_key` values, and `db.FITTING_STAGE_KEYS` is the same contract.

Keep colour in CSS, per `DESIGN-SYSTEM.md §2.3`. Widen the selector at `styles/pages.css:2144` — one line:

```css
.fitlog,
.schedcal {
  --stage-sizing:    #1866da;
  --stage-fitting-1: #19aa16;
  --stage-fitting-2: #e72a90;
  --stage-fitting-3: #ff6a00;
  --stage-final-fitting: var(--home-black);
  /* Added for the calendar. No new hues: grey is "not committed yet", orange is
     the next-deadline banner's, blue is the invoice/payment blue. */
  --stage-design:    var(--home-grid);
  --stage-wedding:   var(--home-black);
  --stage-follow-up: #dd5d01;
  --stage-payment:   #1866da;
}
```

JS emits class names only; no hex ever enters `app.js`.

---

# Feature 1 — Schedules calendar (`#/schedules`)

Build this first.

## 1.1 `db.js` — three small reads

- Widen `listAllOrderEvents` (`db.js:260`) to `'id,order_id,stage,event_date,end_date,pinned'`. Safe: the only existing caller, `nextDeadline` (`app.js:4093`), reads `event_date`/`end_date`/`stage`.
- Widen `listAllOrders` (`db.js:212`) with `title` so `orderLabel()` works off it. Safe: `homepageOverview` reads status/items/payment dates.
- Add `listAllFittingSessions` after `listFittingSessions` (`db.js:311`): `select('id,order_id,stage,status')`. Comment that it exists to resolve the calendar's tap target in one read.

`app.js` owns the `Promise.all`, as `showCustomers` does — `db.js` stays a gateway.

## 1.2 `calendar.js` — pure month/span math

Six additions beside `plannedWeek` (66-74), all ISO-day arithmetic via `toDay`/`fromDay`, all exported at 325-355, all tested:

```js
const WEEKDAYS = ['Monday',…,'Sunday'];   // Monday-first: a plannedWeek is Mon–Sun,
                                          // so a week band = exactly one grid row
weekdayIndex(iso)                 // 0 = Monday … 6 = Sunday, null on bad input
addMonths(year, month, delta)     // { year, month }, 0-based month, rolls both ways
monthRange(year, month)           // { start, end }
monthGrid(year, month)            // { …, days: [{iso, day, inMonth} × 42] }
eventSpan(stage, eventDate, endDate)
assignLanes(spans)                // [laneIndex], greedy, order-stable
```

- **`monthGrid` always returns 42 cells (6 rows)**, never 35 — a five-row month still renders six so paging can't move the footer ("hold the geometry", `DESIGN-SYSTEM.md §7`).
- **`eventSpan`** carries the week-block rule: production stage → `plannedWeek(eventDate)`; `end_date` present → that literal span (Design phase, 14 days); everything else → single day. Unknown stages (`'Wedding'`, `'Follow up'`, `'1st deposit'`) fall through to single-day, which is why every source can pass through one function.
- **`assignLanes`** is what stops a 7-day band breaking apart. Cells render their own strips, so a band only reads as one bar if every cell agrees on the row. Greedy interval colouring over the month's spans sorted by `(start, stageOrder, key)`; deterministic; non-mutating.

## 1.3 `tests/pure-modules.test.cjs`

Append after the `planned fitting weeks…` test (line 50): `monthGrid` returns 42 with correct lead-in for a Sunday-start (`2026-11`) and Monday-start (`2026-06`) month; `addMonths` rolls both directions; `weekdayIndex('1970-01-01') === 3`; `eventSpan` for a production stage equals `plannedWeek`, Design phase returns its literal span, Design deadline / Wedding are single-day, bad input is `null`; `assignLanes` separates overlaps, reuses lane 0 for disjoint spans, and is idempotent.

## 1.4 `index.html` — `#viewSchedules`

Append at the end of the routed-views block, immediately before `</main>` (line 1282), after `#viewEnquiry`, so no existing view's line range moves.

```
<section class="view schedcal" id="viewSchedules" hidden>
  <nav class="cust-nav">            ← reused wholesale, as #viewFittingLogs does
    #schedcalBackBtn (a, → #/customers)   #schedcalTodayBtn
  <header class="schedcal-head">    ← padding-top: 67px, cloned from .fitlog-head
    <h1 id="schedcalTitle">Schedules</h1>
  <div class="schedcal-monthbar">   ← #schedcalPrev · #schedcalMonthLabel (h2) · #schedcalNext
  <div class="schedcal-approx" id="schedcalApprox" hidden>   ← month-precision weddings
  <div class="schedcal-body" id="schedcalBody" aria-busy="true">
    <div class="schedcal-grid" id="schedcalGrid" role="grid" aria-labelledby="schedcalMonthLabel">
      <div class="schedcal-weekdays" role="row">  ← 7 × role="columnheader",
                                                     visible letter + .sr-only full name
      <!-- six .schedcal-week role="row", rendered by JS -->
    <div class="schedcal-state" id="schedcalState">   ← skeleton / empty / error, one slot
  <div class="schedcal-legend" id="schedcalLegend">
  <p class="sr-only" id="schedcalStatus" role="status" aria-live="polite">
  <footer class="schedcal-footer">Made with love for Ichaku</footer>
```

Day sheet goes **outside `<main>`** with the other overlays (beside `#fittingPicker`, `index.html:1307`) so it's never inside a hidden view: `#schedcalSheet` — `role="dialog" aria-modal="true" aria-labelledby="schedcalSheetTitle"`, backdrop + panel + `#schedcalSheetList` + close key.

The weekday row and six week rows stay in the DOM even in the skeleton, so loading→ready swaps pixels, not layout.

## 1.5 Month grid render — per-cell strips, not absolute bars

The textbook approach (absolutely positioned event bars) needs measured cell widths, lane stacking, and variable row heights. It breaks the ledger rhythm and needs JS measurement on resize. **Rejected.**

Instead each day cell renders, inside its own fixed box, a stack of three strip slots:

```
┌────────────────┐
│ 24        • •  │  date number 13/16 700 tabular-nums + up to 2 point-event dots
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬ │  lane 0 strip — 3px, full-bleed to the cell edges
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬ │  lane 1
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬ │  lane 2
└────────────────┘
```

A 7-day production week is seven adjacent cells carrying the same colour in the same lane — and since `plannedWeek` is Mon–Sun and `monthGrid` is Monday-first, that week is **always exactly one full grid row**. Strips abut with no gap, so they read as one continuous band with zero absolute positioning. Design phase (14 days, not week-aligned) wraps across rows by the same mechanism.

- Strips carry only the seven `order_events` stages. Empty lanes render as transparent spacers, which is what keeps lanes aligned across a week.
- Point events (follow-up, payment) are **dots**, max two; a third collapses the second to `--home-grid`.
- A wedding **inverts the date number** onto a filled `--stage-wedding` chip — the most important date on the page, distinguishable at 48px without spending vertical space.
- Overflow: >3 strips → lane 2 becomes a grey "more" strip. The cell's `aria-label` and the day sheet always carry the full truth.
- **Approximate weddings never touch a cell.** `wedding_date_precision === 'month'` stores the *last day of the month* (`schema.sql:397-399`) — putting it on the 31st would be a lie. They render in `#schedcalApprox` above the grid, reusing `isApproximateWedding` (`app.js:4114`) and the order page's existing estimate voice (`app.js:4531`).
- Out-of-month cells render at reduced ink with no strips, and stay focusable so arrows page the month instead of dead-ending.

## 1.6 `app.js` — registry, state, region

**Registry (45-271):** append after `mbOverlayClose` (270) — `viewSchedules, schedcalBackBtn, schedcalTodayBtn, schedcalTitle, schedcalPrev, schedcalNext, schedcalMonthLabel, schedcalApprox, schedcalBody, schedcalGrid, schedcalState, schedcalLegend, schedcalStatus, schedcalSheet, schedcalSheetTitle, schedcalSheetList, schedcalSheetClose`.

**State (280-398):** one island after `orderDetail`, commented as to why it's separate from `state.overview` (that join is per-customer, this one per-day):

```js
schedules: {
  phase: "idle",       // idle | loading | ready | error
  loadToken: 0,
  cursor: { year: 0, month: 0 },   // month on screen, 0-based
  focusedDate: "",     // ISO of the cell holding tabindex="0"
  openDate: "", sheetReturn: null,
  items: [], byDay: null, lanes: null,
  lastStatus: "", error: null
}
```

**New region** `/* ---------- Schedules calendar ---------- */` inserted at line 1555, between the homepage region and the fitting feed — it reads the same three sources as the homepage.

| Function | Clones |
| :-- | :-- |
| `sched()`, `isSchedulesRoute()` | `feed()` 1579, `isFittingRoute()` 1580 |
| `beginSchedulesLoad` / `isCurrentSchedulesLoad` | `beginOrderLoad` 4404 / `isCurrentOrderLoad` 4390 |
| `buildScheduleItems(customers, orders, events, sessions)` | `homepageOverview` 1256 |
| `indexScheduleItems(items)` → `Map<iso, item[]>` | — |
| `scheduleItemHref(item)` | `renderOrderSchedule` 4664 |
| `schedcalCellHtml` / `schedcalWeekHtml` | `fittingCardHtml` 1604 |
| `schedcalSkeletonHtml` / `schedcalPanelHtml` / `schedcalStateHtml` | `fittingSkeletonHtml` 1654 / `fittingPanelHtml` 1672 / `fittingStateHtml` 1707 |
| `announceSchedulesStatus` | `announceFittingStatus` 1738 |
| `renderSchedulesMonth` | `renderFittingFeed` 1760 (full re-render, not append-only) |
| `goToMonth(year, month, focusIso)` | — |
| `openScheduleDay` / `closeScheduleDay` | `openFittingPhotoViewer` 2499 / `closeFittingPhotoViewer` 2511 |
| `handleSchedulesGridKey` | — (key map in §1.7) |
| `cleanupSchedules` | `cleanupFittingLogs` 1893 — but **keeps `cursor`** |
| `showSchedules(query)` | `showFittingLogs` 2063 |

**`buildScheduleItems`** — one pass per source into a flat normalised list. Skip cancelled customers for weddings/follow-ups; skip an `order_events` row whose `order_id` isn't in the orders map (defensive, as `homepageOverview:1268` guards). Item shape:

```js
{ key,        // "stage:<eventId>" | "wedding:<custId>" | "followup:<custId>" | "payment:<orderId>:<n>"
  kind, stage, colorKey, label,
  start, end,          // from calendar.eventSpan
  isBand,              // kind === "stage" → takes a lane; otherwise dot/chip
  approximate, pinned,
  customerId, customerName, orderId, orderLabel, sessionId, href }
```

Labels reuse `U.fittingStage(stage).label`, the raw stage name for the two design rows, `orderLabel(order)` (`app.js:1242`), and `follow_up_label`. **No money on the calendar** — payment items read "First / Production / Final payment" only.

**`scheduleItemHref`** — the confirmed routing:

| Item | Destination |
| :-- | :-- |
| production stage, session exists | `#/fittings/<sessionId>?source=order` |
| production stage, no session | `#/order/<orderId>/fitting/new?stage=<Stage>` |
| Design phase / Design deadline | `#/order/<orderId>` |
| payment | `#/order/<orderId>` |
| wedding / follow-up | `#/customer/<customerId>` |

Gate the first two on `calendar.PRODUCTION_STAGES.indexOf(stage) !== -1` — `fitting_sessions.stage` is constrained to those five (`schema.sql:882-883`) and `handleRoute`'s `fittingNew` branch rejects anything else.

**Use `?source=order`, not a new third value.** `showFittingLogDetail` treats `source` as strictly binary (`app.js:2613`), and `"feed"` would send Back to the fitting-logs feed — wrong from a calendar. A third value means editing five coupled decision points (2570, 2613, 2647, 2831, 3828). You tapped a fitting *belonging to an order*, so landing Back on that order is coherent. Record those five lines in the comment as the upgrade path.

**`showSchedules(query)`**: `setChrome({title:"Schedules", save:false, schedulespage:true})` → read and regex-validate `?month=YYYY-MM` / `?focus=YYYY-MM-DD` → cursor = focus's month, else month param, else retained cursor, else today → paint the 42-cell skeleton immediately → `token = beginSchedulesLoad()` → `Promise.all([listCustomers, listAllOrders, listAllOrderEvents, listAllFittingSessions])` → bail if stale → build + index + render → `openScheduleDay(focus)` if given. On throw: rethrow if `db.isStaleToken(err)`, else render the retry panel.

## 1.7 Accessibility — real grid semantics

Follow the WAI-ARIA date-picker grid pattern.

- `#schedcalGrid` is `role="grid"`, labelled by the `<h2>` month label. That label carries **no** `aria-live` — announcements go through `#schedcalStatus` alone so a month change is announced once, not twice.
- Weekday header: `role="row"` of seven `role="columnheader"`, each a visible letter plus `.sr-only` full name. Two letters are `T` and two are `S`; without the names the header is ambiguous.
- Each week is `role="row"`; **each day is a `<button role="gridcell">` directly** — no nested interactive, matching the single-control-per-record rule at `app.js:1618`.
- **Roving tabindex**: exactly one cell at `tabindex="0"` (`state.schedules.focusedDate`), all others `-1`. The grid is one tab stop.
- `aria-current="date"` on today; `aria-selected="true"` on the cell whose sheet is open.
- Accessible name per cell, built from `calendar.WEEKDAYS` + `U.MONTHS`: `"Monday 24 August 2026, 3 events"` / `"…, nothing scheduled"` / `"…, not in August"`.
- Key map, one `keydown` on `#schedcalGrid`, all arithmetic through `toDay`/`fromDay`:

  | Key | Behaviour |
  | :-- | :-- |
  | ← / → | ∓1 day; crossing the month edge pages and keeps focus on the target date |
  | ↑ / ↓ | ∓7 days, same edge behaviour |
  | Home / End | Monday / Sunday of the focused week |
  | PageUp / PageDown | ∓1 month, same day-of-month clamped to length |
  | Enter / Space | open the day sheet (`preventDefault` on Space) |
  | Escape | close the sheet, restore focus |

  After any move set the new cell to `tabindex="0"`, the old to `-1`, and `.focus({preventScroll:true})` — re-applied in the same synchronous turn after a month re-render.
- Day sheet: record `sheetReturn = document.activeElement`, focus the title (`tabindex="-1"`), bind the existing `trapModalFocus` (`app.js:441`). Backdrop click and Escape both close and restore.
- Sheet rows are single `<a>`s with a full `aria-label` (`"Fitting 2 for Sarah, Cream gown, week of 24 Aug '26, open fitting log"`), mirroring `renderOrderSchedule`'s label construction at 4662.
- Focus rings need the three-way override (`DESIGN-SYSTEM.md §10`) — copy the block at `pages.css:2517`.
- `hapticTap()` (`app.js:1439`) on month prev/next only, not day cells.

## 1.8 Wire the route — the six surfaces from `docs/MAP-app.md:71`

1. **Parse** beside the `calendar` case (`app.js:898`): `if ("schedules" === segments[0]) return { view: "schedules", query };` — before the `customers` fallthrough at 904. `#/calendar` (Google settings) is untouched; that collision is why the route is `#/schedules`.
2. **Dispatch** in `renderFn` beside the `fittingLogs` branch (1157).
3. **View toggle** in the block at 938-952.
4. **`routeHasOwnLoader` (563)** — add it. The page paints its own skeleton, so the generic loader would be a second differently-shaped wait. Consequently load failures surface via `showToast` (1234), not `showRouteError`. No `routeLoaderKind` entry.
5. **`focusRoute` (641)** — `elements.schedcalTitle`.
6. **`syncBottomBar` (418)** — **no change**; that list is for fixed bars that publish `--bottombar-h`. The day sheet is an overlay. Say so in a comment so nobody "fixes" it.
7. **Cleanup** in the block at 954-987 — no feed-parking family; the calendar has no cursor and its data must not go stale across a write. It retains `cursor` only, so returning lands on the month you left.
8. **`setChrome` (474-482)** — add `is-schedulespage`.
9. **Press wiring** — a `viewSchedules` pointerdown/keydown block in the per-view section (1445-1553), and add `is-schedulespage` to the scroll handler's body-class list at 1492-1500.
10. **`bindEvents` (6036)** — prev/next/today, delegated grid `click`, grid `keydown`, sheet close/backdrop/Escape, `.js-schedcal-retry`.

## 1.9 CSS — new section at the end of `styles/pages.css`

Opt-in block first, verbatim per `DESIGN-SYSTEM.md §1` (`body.is-schedulespage` — `#292929` canvas, hide `.appbar`/`.pagehead`, 390px `.page`, `.view { gap: 0 }`). Then the token widening from above; `.schedcal-head`/`-title` cloned from `.fitlog-head`/`-title` (2155-2175); `.schedcal-grid-rule`/`-spacer` from 2174-2186; `.schedcal-monthbar` as a 3-column face-over-rail group; `.schedcal-grid` as `repeat(7, 1fr)` inside a 24px inset; `.schedcal-day` at fixed height (`grid-template-rows: 20px repeat(3, 3px)` → stable ~44px face, meeting the touch floor with its rail); `.schedcal-strip--<kind>`; `.schedcal-dot--follow-up/--payment`; the inverted wedding chip; `.schedcal-day--outside`; `.schedcal-panel*` from 2439-2476; `.schedcal-skel__block` reusing the `home-shimmer` keyframe (2482); `.schedcal-body--initial { min-height: 60svh }`; `.schedcal-sheet` in the ledger idiom at `z-index: 120`; the three-way focus block; `[hidden] { display: none }` on every face-over-rail control (§5.3 — the most common bug in this codebase's CSS); closing `@media (prefers-reduced-motion: reduce)`.

## 1.10 Light the entry points

- `index.html:163` — `<button class="home-action home-action--schedule" aria-disabled>` → `<a … href="#/schedules">`, same inner spans. Confirm `.home-action` sets `font: inherit` for the `<a>`-vs-`<button>` swap (`.cust-nav-btn` does, `pages.css:707-710`); add it if not.
- Apply the guard inversion (§Shared decisions).
- `index.html:219` `#custNextBanner` → `<a … href="#/schedules">`; register it.
- `renderCustomerDetail` (`app.js:4249`) — beside the existing `#custFittingBanner` href write at 4241:
  ```js
  elements.custNextBanner.href = nextEvt
    ? "#/schedules?focus=" + encodeURIComponent(nextEvt.date) : "#/schedules";
  ```
  plus an `aria-label`. With nothing scheduled it still opens the current month — an honest destination, not a dead key.

---

# Features 2 & 3 — Quotations and invoices, one page parameterised by `kind`

## 2.1 `schema.sql` migration

Add the title to the nav list at `schema.sql:8-18`, then append at the bottom (idempotent, per the file's convention):

```sql
-- =========================================================================
-- Migration — "quotation and invoice feeds"
--
-- A quotation and an invoice are two renderings of one order, not two
-- records: the only durable trace either leaves is a document_log row holding
-- the total that was actually sent. The list pages therefore feed off
-- document_log, and need what it deliberately does not store — whose order it
-- was and what the order was called. Resolving that in the browser would mean
-- holding every order and every customer in memory to render ten rows, and
-- would reduce the search to a client filter over one loaded page. So the
-- join, the Jakarta date, and the search haystack are resolved here, exactly
-- as fitting_log_feed does for fitting sessions.
--
-- Moodboard rows share this table but are a different object with a Drive
-- link and no total, and neither route can show one, so they are excluded
-- here rather than filtered by every caller.
-- =========================================================================

create index if not exists document_log_kind_created_idx
  on public.document_log (kind, created_at desc, id desc);

drop view if exists public.document_feed;

create view public.document_feed
with (security_invoker = true) as
with resolved as (
  select dl.id, dl.order_id, dl.kind, dl.total, dl.created_at,
    o.customer_id, c.name as customer_name, o.title as order_title, o.status as order_status,
    -- Mirrors orderLabel() in app.js and the identical expression in fitting_log_feed.
    case
      when nullif(btrim(coalesce(o.title, '')), '') is not null then btrim(o.title)
      when nullif(btrim(coalesce(o.items -> 0 ->> 'name', '')), '') is not null then
        btrim(o.items -> 0 ->> 'name') ||
        case when jsonb_array_length(o.items) > 1
             then ' + ' || (jsonb_array_length(o.items) - 1)::text || ' more' else '' end
      else 'Empty order'
    end as order_label,
    -- The workshop's day, not UTC's.
    (dl.created_at at time zone 'Asia/Jakarta')::date as issued_date
  from public.document_log dl
  join public.orders    o on o.id = dl.order_id
  join public.customers c on c.id = o.customer_id
  where dl.kind in ('quotation', 'invoice')
)
select r.*,
  lower(coalesce(r.customer_name,'') || ' ' || coalesce(r.order_label,'') || ' ' ||
        to_char(r.issued_date, 'FMDD Mon YYYY')) as search_text
from resolved r;

grant select on public.document_feed to authenticated;
```

## 2.2 `db.js`

Beside the fitting-feed helpers (63-89) and `listFittingLogs` (352):

```js
const PROJECTION_DOCUMENT_FEED =
  'id,order_id,customer_id,customer_name,order_title,order_label,order_status,kind,total,created_at,issued_date';
const DOCUMENT_KINDS = ['quotation', 'invoice'];
const DOCUMENT_FEED_PAGE_SIZE = 10;

/* The route decides the kind, so an unrecognised value is a routing bug, not
   user input. Returning both kinds would silently show invoices on the
   quotations page; an empty string makes the caller fail loudly instead. */
function normalizeDocumentKind(kind) { … }
```

`listDocumentFeed(options)` is `listFittingLogs` (352-387) with three substitutions — `document_feed` for `fitting_log_feed`, `.eq('kind', kind)` for `.in('stage_key', stages)`, and the new projection. Everything else is unchanged **and deliberately so**: `limit + 1`, `created_at desc, id desc`, the `.or('created_at.lt.X,and(created_at.eq.X,id.lt.Y)')` cursor tie-break, `ilike` on `search_text`, the optional `.eq('customer_id', …)`, and the `{ items, hasMore, nextCursor }` shape. Reuses `normalizeFeedQuery` and `likeLiteral` verbatim — both already generic, already tested. Open with `if (!kind) throw new Error('A document kind is required');`.

**No other db method is needed for create.** `listCustomers`, `listOrders(customerId)`, `logDocument`, `updateOrder` all exist, and `PROJECTION_ORDERS` (`db.js:56`) already carries everything `docs.download` reads.

Test in `pure-modules.test.cjs` beside the feed-normaliser tests (173-200): `normalizeDocumentKind` accepts `'quotation'`/`'invoice'`, rejects `'moodboard'`, `''`, `null`, `'QUOTATION'`.

## 2.3 `index.html` — one `#viewDocuments`

Append after `#viewSchedules`. Structural clone of `#viewFittingLogs` (288-345):

- `.cust-nav` with `#doclistBackBtn` and `#doclistNewBtn` — a real, **enabled** key with a *text* face reading "New". No suitable 24px asset exists; flag `assets/doclist-new-icon.svg` as a design ask. Comment the asymmetry: `#fitlogNewBtn` is disabled because a fitting needs an order context it can't get; this one is live because the picker supplies it.
- `.doclist-head` with `<h1 id="doclistTitle">`, text set per kind.
- **Search: reuse the `.fitlog-search*` classes verbatim**, ids `#doclistSearchSection` / `#doclistSearch` / `#doclistSearchClear`. `DESIGN-SYSTEM.md §13` says if a third search appears, unify all three rather than adding a fourth copy — reusing the existing block is the zero-risk way to honour that, and `#viewFittingLogs` already reuses `.cust-nav` on the same logic. Full three-way unification is a separate mechanical follow-up.
- **No filter chips.** Decided, not omitted: *order status* is derived **from** these documents (issuing a quotation bumps the order to Quoted, `app.js:5922`) so filtering a quotations list by "Quoted" returns nearly everything — no signal. *Date range* is already served, since `search_text` contains `to_char(issued_date,'FMDD Mon YYYY')`, so typing `Aug 2026` filters by month through the search that's already there. *Amount band* is arbitrary; *kind* is fixed by the route. State this in the view's HTML comment so the absence reads as a decision. If asked for later, order status is the only defensible axis and drops into the slot `#fitlogStages` occupies.
- Feed: `.doclist-feed` > `<ol id="doclistList">` + `#doclistState` + `#doclistSentinel`, then `#doclistStatus` (`role="status"`), then footer.

Picker overlay beside the others: `#docnewSheet` — `role="dialog" aria-modal="true"`, backdrop + panel with `data-step`, `#docnewTitle`, `#docnewHint`, `#docnewSearch`, `#docnewList`, Back/Cancel keys, `#docnewStatus`.

## 2.4 `app.js` — documents region

New region `/* ---------- Document feed ---------- */` immediately after the fitting-logs region (after 2137) — same kind of object, should read together.

State island after `schedules`, one island not two *because two would guarantee they drift*:

```js
documents: {
  kind: "quotation", phase: "idle",
  items: [], query: "", customerSeed: null,
  nextCursor: null, hasMore: true, loadingMore: false, loadMoreError: null,
  requestToken: 0, renderedToken: 0, observer: null, searchTimer: null,
  alignPending: false, errorAnnounced: false, lastStatus: "",
  retainHash: "", retainScroll: 0,
  /* The create flow. Nothing is written until Generate, and state.order is
     deliberately untouched so a picker that never opened the order page
     cannot corrupt it. */
  picker: { open: false, step: "customer", customers: null, customerId: null,
            customer: null, orders: null, query: "", loading: false,
            generating: false, error: null, returnEl: null }
}
```

Functions are direct clones: `docs_()` ← 1579 · `documentBlockHtml` ← 1597 · `documentCardHtml` ← 1604 · `documentSkeletonHtml` ← 1654 · `documentPanelHtml` ← 1672 · `documentEmptyHtml` ← 1683 · `documentStateHtml` ← 1707 · `announceDocumentStatus` ← 1738 · `renderDocumentSearchClear` ← 1752 · `renderDocumentFeed` ← 1760 (**append-only, same token-guarded clear**) · `documentRequestArgs` ← 1791 · `ensureDocumentObserver`/`stopDocumentObserver` ← 1803/1812 · `startDocumentFirstPage` ← 1820 · `loadMoreDocuments` ← 1853 · `cleanupDocuments` ← 1893 · `parkDocuments` ← 1920 · `showDocuments(kind, query)` ← 2063 · `restoreDocumentScroll` ← 2121 · `setDocumentBackControl` ← 2132.

What differs:

- **`documentCardHtml`** — one `<a class="doclist-card-link" href="#/order/<orderId>">` per row, nothing else interactive inside. Face: customer name + order label + kind on the top line; `24 Aug '26 · Rp7.225.000` beneath. Rails `#19aa16` (quotation) / `#1866da` (invoice) — the greens and blues that already mean quotation and invoice on the shortcut row.
  **The amount is `item.total`, never recomputed.** Comment citing `schema.sql:66-68`: nothing but the number is snapshotted, so an order edited afterwards would otherwise rewrite history — which is precisely what the column exists to prevent. Null `total` (possible since the moodboard migration dropped NOT NULL) renders `—` and says "amount not recorded" in the `aria-label`.
- **`documentEmptyHtml`** — three cases, not four (no second filter axis): no rows; query with no match; customer seed with no rows.
- **`documentStateHtml`** — same five branches as `fittingStateHtml`, including the bottom-slot `loadMoreError` panel that leaves page 1 in place.
- **Search** — server-side, 250 ms debounce, same `customerSeed`-drops-on-edit rule (1967-1970) and the same `db.getCustomer` check that degrades a dead deep link to a plain text search (2105-2115).
- **Search alignment** — do **not** write a second `alignFittingSearch` (1935). Extract `alignLedgerSearch(sectionEl, viewEl)` into the chrome region (401-514); `alignFittingSearch` becomes a one-line caller and `alignDocumentSearch` the second. Twelve lines of duplication becomes thirty by the third page otherwise.
- **Parking — one hop only.** Rows go to `#/order/:id`, so a family array is the wrong shape. In the cleanup block (954-987): `if ("order" === targetRoute.view) parkDocuments(); else cleanupDocuments();`. `parkDocuments` is `parkFittingLogs` verbatim; `showDocuments` opens with the same retain short-circuit (2078-2086).

## 2.5 The create flow

**A sheet, not a route** — a transient modal task with no shareable state; a route would add three router surfaces, two mid-flow history entries, and a back-button trap between steps. `#fittingPicker` is the existing precedent.

1. Record `picker.returnEl`, open, `trapModalFocus`, title "New quotation" / "New invoice", hint "Which customer?".
2. `db.listCustomers()` behind a skeleton; one `<button class="docnew__row">` per customer — name + `weddingText(customer)` (`app.js:4116`). Client-side filter on `#docnewSearch`, mirroring the homepage's `customerSearch`.
3. Pick → step `"order"`, hint "Which order?", Back shown, `db.listOrders(customerId)`.
4. Order rows show `orderLabel(o)`, item count, `U.formatRupiah(docs.computeTotal(o.items))`. A row that cannot produce a document renders `disabled` with the reason beneath it.
   **Extract the readiness rule rather than restating it.** `buildOrderDetailViewModel` computes it at `app.js:4539-4576`; pull those lines into `documentReadiness(order, customer)` in the order-detail region and call it from both surfaces, so the order page's download keys and the picker's rows can never disagree. Same strings, one source.
5. **Zero orders — the known blocker, stated honestly.** `db.createOrder` (`db.js:220`) has **zero call sites**; `saveOrder` only ever calls `db.updateOrder`, and `#/order/:id/edit` needs an existing id. Orders are inserted by hand in Supabase, so this branch is reachable for any customer who has never had one. Copy:
   > **No orders for this customer yet** — A quotation is a rendering of an order, and orders are still created in the studio database rather than in the app. Open the customer to check their details, or pick someone else.
   > `[Open customer]` `[Back]`
6. **Generate** — busy state (`aria-busy`, "Generating…", `picker.generating` blocking re-entry) because `docs.download` runs html2canvas at `scale: 3` and takes seconds. Then, in exactly the order `downloadDocument` (`app.js:5901-5931`) uses:
   ```js
   const total = await docs.download(kind, {
     docName: order.doc_name || customer.name || "",
     date: U.todayISO(),
     items: order.items || [],
     includes: order.includes || [],
     terms: docs.termsFor(order)
   });
   ```
   `docs.download` fills the global offscreen `#quotation` / `#invoice` templates via `docs.render` and reads its own DOM nodes — it never touches app state and doesn't need the order view active, which is exactly why generating from a list page works. Comment that.
   Then toast → advance status → `db.logDocument(order.id, kind, total)` → close → `startDocumentFirstPage()` so the new row lands at the top (the feed is append-only; a token bump and clean first page is the correct way to introduce a row, not a splice).
   **Do not call `bumpStatus` (`app.js:679`)** — it mutates `state.order` and calls `renderOrderStatus()`, writing `elements.viewSub`, which is order-page chrome that isn't on screen. Extract the ordering rule at 682-684 into `advancedStatus(current, target)` over `ORDER_STATUSES` (`app.js:33`); `bumpStatus` becomes a caller, and the picker calls `db.updateOrder(id, { status })` directly when it actually changes. Status only ever moves forward — re-issuing a quotation for a confirmed order must not demote it.
   Failure paths match the existing ones exactly: PDF throws → `"Could not generate the PDF — please try again"`, sheet stays open, **nothing logged, status untouched**; log throws after a successful download → `"Downloaded, but could not record it"` and refresh anyway.
7. **Accessibility** — focus to the title on open, then the search field once the list paints; `trapModalFocus` on Tab; Escape and backdrop restore `picker.returnEl`; `#docnewStatus` announces "12 customers" / "Loading orders" / "Generating quotation" / "Quotation downloaded"; disabled rows use `aria-describedby` on their reason, not colour alone.

## 2.6 Wire the routes

Parse `quotations` → `{ view: "documents", kind: "quotation" }` and `invoices` → `{ …, kind: "invoice" }`. One dispatch branch, one view-toggle line for both. Add to `routeHasOwnLoader`; `focusRoute` → `elements.doclistTitle`; `syncBottomBar` unchanged; cleanup = the park-or-teardown branch plus always `closeDocumentPicker()`; `setChrome` gains `is-doclistpage`; press wiring block plus `is-doclistpage` in the scroll handler at 1492; `bindEvents` gets the New key, search input/clear/focus, retry keys, and the picker's delegation.

## 2.7 Entry points

- `index.html:164-165` → `<a href="#/quotations">` / `<a href="#/invoices">`. The guard inversion already lets them through. Rewrite the comment at `app.js:1472` — only `#enquiriesCard` stays inert.
- `index.html:244` / `:254` — `#custQuotationBanner` / `#custInvoiceBanner` from `<div aria-disabled>` to `<a>`; register both; write hrefs in `renderCustomerDetail` beside the fitting banner (4241-4243) using the identical seed contract:
  ```js
  const seed = "?q=" + encodeURIComponent(name) + "&from=customer&customerId=" + encodeURIComponent(id);
  ```
  `showDocuments` honours `q` / `from` / `customerId` exactly as `showFittingLogs` does at 2063-2115.

## 2.8 CSS

New `.doclist-*` section at the end of `pages.css` after the schedules section: the `body.is-doclistpage` opt-in; head/title/rule/spacer/inset cloned from the `.fitlog-*` equivalents; `.doclist-card` and `-card-link` from 2324 / 2553 with the two kind rails; panels and skeletons from 2439 / 2482; `--initial { min-height: 60svh }`; footer; the three-way focus block; `[hidden]`; reduced-motion.

`.docnew*` is **utility chrome, not ledger canvas** — a modal over a page, so it uses `shared.css`'s idiom (`--surface-2`, `--radius`, `.btn--outline`/`--primary`, `surface-rise`, `z-index: 210`). Put it at the end of `shared.css`'s sheet area, not in `pages.css`.

---

## Docs (mandatory per `docs/CONVENTIONS.md`)

`docs/MAP-app.md` — correct the existing ~2-line drift (`handleRoute` is at 851, `showFittingLogs` at 2063, `downloadDocument` at 5901, `bindEvents` at 6036); add two region rows, three route rows, every new function, and a coupling note that the documents feed parks only on the `documents → order` hop. `docs/MAP-html-css.md` — two view rows, two overlay ids, two `pages.css` sections, the class-prefix table, the `.docnew*` entry under `shared.css`. `docs/FEATURES.md` — two new numbered sections plus quick-router rows. `docs/DATABASE.md` — the `document_feed` shape, the three new/widened `db.js` methods, the migration title. `docs/MODULES.md` — six new `calendar.js` exports. `docs/DESIGN-SYSTEM.md` — §2.3 (tokens now shared by `.fitlog` and `.schedcal`, four kinds joined), §13 (the third search reuses the second's block). `README.md` — nothing; the statement at 145-146 stays exactly true.

---

## Verification

Gate, every time (`AGENTS.md §6`):

```bash
node --check app.js && node --check db.js && node --check util.js && node --check calendar.js && node --check config.js && node --check docs.js && node --check fittings.js && node --check fitting-pdf.js && node --check moodboard.js && node --test tests/pure-modules.test.cjs
```

Serve with:

```bash
python3 -m http.server 5173
```

**Schema:** re-run all of `schema.sql` in the Supabase SQL editor **twice** to confirm it stays idempotent. Then `select * from public.document_feed limit 5;` as `authenticated`, and confirm it returns nothing as `anon`.

**Schedules:**
1. The Schedule key is a real link, presses with haptics, lands on `#/schedules`; the other shortcuts behave as before.
2. The 42-cell skeleton paints before the network resolves, and the swap to real data moves nothing — watch the footer.
3. A scheduled `Fitting 2` spans **exactly one full row**, Monday to Sunday, no gaps between cells. Cross-check against the order page's schedule card, which prints the same range as `24 Aug '26 – 30 Aug '26`.
4. A 14-day `Design phase` wraps two rows and keeps the same lane in both.
5. Two overlapping bands hold distinct lanes for their whole length; a fourth band in one week collapses to the grey "more" strip and the sheet still lists all four.
6. A month-precision wedding appears **only** in the approximate banner, never on the 31st.
7. Prev/next/PageUp/PageDown page instantly — **zero network requests after the first load** (check the Network panel).
8. Tap a fitting with a session → `#/fittings/<id>?source=order`, Back lands on the order. Tap one without → `#/order/<id>/fitting/new?stage=Fitting%202`, stage picker skipped, camera opens. Design deadline / payment → the order. Wedding / follow-up → the customer.
9. Keyboard only: Tab reaches exactly one cell; arrows move 1/7 days; crossing the month edge pages and keeps focus on the target; Home/End hit Mon/Sun; Enter opens, Escape closes and returns focus to the same cell.
10. VoiceOver: grid announces "August 2026, grid"; a cell announces "Monday 24 August 2026, 3 events"; a month change is announced **once**; the sheet announces as a dialog and traps Tab.
11. Kill the network → retry panel holds `60svh`, footer stays put, Retry recovers.
12. Customer page → Next event banner opens the right month with the sheet open; a customer with nothing scheduled still opens the current month.
13. `prefers-reduced-motion: reduce` → no shimmer, no press transitions.

**Documents:**
1. Both keys navigate; correct title and rail colour on each.
2. Scroll to the sentinel → page 2 appends without re-rendering page 1 (existing `<li>` nodes keep identity).
3. One request 250 ms after typing stops, not one per keystroke; `Aug 2026` filters by month; `%`, `_`, `*` match literally.
4. A row's amount equals its `document_log.total`. **Then edit the order's items and reload — the amount must not change.** That is the whole point of the snapshot.
5. Row tap → `#/order/:id`; Back returns the same list, pages, and scroll offset.
6. List → customer → back to list rebuilds from page 1 (parking is one hop, by design).
7. New → customer → order → Generate: PDF downloads, toast fires, status advances Quoted/Confirmed but **never backwards on a re-issue**, a `document_log` row appears, the new row is at the top.
8. A customer with no orders shows the honest empty state and `[Open customer]` navigates.
9. An order with no priced items renders disabled with the same copy the order page uses.
10. Offline mid-generate → PDF error toast, sheet open, **no** log row, **no** status change. PDF succeeds but insert blocked → "Downloaded, but could not record it", list still refreshes.
11. Customer → Quotations banner opens seeded to that customer; editing the search field drops the seed.
12. Picker traps Tab, Escape restores focus, disabled rows announce their reason.
13. `#/quotations` never shows an invoice or moodboard row; `#/invoices` never shows a quotation.

---

## Out of scope — flag before starting

1. **In-app order creation.** `db.createOrder` has zero call sites; orders are inserted by hand in Supabase. The picker's zero-orders state says so plainly. The gateway method exists, so the follow-up is a `#/order/new?customerId=` route reusing `#viewOrderEdit` plus one branch in `saveOrder` — but that's a new route with its own validation and history semantics, and folding it in here would roughly double this work.
2. **A third `?source=` value** for the fitting-detail Back control. Five coupled call sites: `app.js` 2570, 2613, 2647, 2831, 3828.
3. **Unifying `.home-search` / `.fitlog-search` / the documents search** into one `.ledger-search` block (`DESIGN-SYSTEM.md §13`). This plan reuses the second rather than adding a third copy.
4. **Document filter chips** — decided against, reasons in §2.3.
5. **A document detail page** — rows go to `#/order/:id`; there's nothing to show the order doesn't.
6. **`assets/doclist-new-icon.svg`** — the New key ships with a text face until a designer supplies the glyph.

---

## Critical files

`app.js` · `index.html` · `db.js` · `calendar.js` · `schema.sql` · `styles/pages.css` · `styles/shared.css` · `tests/pure-modules.test.cjs` · `docs/*`

---

## Task list

**Step 0 of implementation:** copy this checklist verbatim to `plans/TASKS-schedules-quotations-invoices.md` and tick each box as it lands, so a cut session can resume from the file.

**Shared**
- [ ] Invert the four inertness guards (`app.js` 1467, 1474, 1488, 1503) + update comments
- [ ] Widen the stage-token block to `.fitlog, .schedcal` and add the four kind tokens (`pages.css:2144`)

**Schedules**
- [ ] `db.js`: widen `listAllOrderEvents` + `listAllOrders`, add `listAllFittingSessions`
- [ ] `calendar.js`: `WEEKDAYS`, `weekdayIndex`, `addMonths`, `monthRange`, `monthGrid`, `eventSpan`, `assignLanes` + exports
- [ ] `tests/pure-modules.test.cjs`: five calendar tests — **gate: `node --test` green**
- [ ] `index.html`: `#viewSchedules` + `#schedcalSheet` overlay
- [ ] `app.js`: element registry + `state.schedules` island
- [ ] `app.js`: schedules region (build/index/render/href/sheet/cleanup/`showSchedules`)
- [ ] `app.js`: grid keyboard map + roving tabindex + sheet focus trap
- [ ] `app.js`: wire the six route surfaces + press wiring + `bindEvents`
- [ ] `pages.css`: `.schedcal-*` section
- [ ] Entry points: home Schedule key → `<a>`, `#custNextBanner` → `<a>` + href in `renderCustomerDetail`
- [ ] Browser verify 1-13

**Documents**
- [ ] `schema.sql`: `document_feed` view + index + nav-list title — **run twice, confirm idempotent**
- [ ] `db.js`: projection, kinds, `normalizeDocumentKind`, `listDocumentFeed` + test
- [ ] `index.html`: `#viewDocuments` + `#docnewSheet`
- [ ] `app.js`: `state.documents` island + registry
- [ ] `app.js`: documents region (clones of the fitting feed) + `alignLedgerSearch` extraction
- [ ] `app.js`: extract `documentReadiness` and `advancedStatus`; `bumpStatus` becomes a caller
- [ ] `app.js`: create-flow picker (customer → order → generate → log → refresh)
- [ ] `app.js`: wire both routes + park-on-order-hop cleanup + `bindEvents`
- [ ] `pages.css` `.doclist-*` + `shared.css` `.docnew*`
- [ ] Entry points: home Quotation/Invoice keys + both customer banners
- [ ] Browser verify 1-13

**Close out**
- [ ] Docs: MAP-app, MAP-html-css, FEATURES, DATABASE, MODULES, DESIGN-SYSTEM
- [ ] Full `node --check` sweep + `node --test` green
