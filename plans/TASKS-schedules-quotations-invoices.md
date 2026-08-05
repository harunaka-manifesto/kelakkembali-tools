# Tasks — schedules calendar, quotations list, invoices list

Plan: `~/.claude/plans/plan-with-me-to-inherited-cake.md`
Tick each box as it lands so a cut session can resume from here.

## Shared
- [x] Invert the four inertness guards (live iff it is an `<a>`) + update comments
- [x] Widen the stage-token block to `.fitlog, .schedcal, .schedcal-sheet` + four kind tokens

## Schedules
- [x] `db.js`: widen `listAllOrderEvents` + `listAllOrders`, add `listAllFittingSessions`
- [x] `calendar.js`: `WEEKDAYS`, `weekdayIndex`, `addMonths`, `monthRange`, `monthGrid`, `eventSpan`, `assignLanes` + exports
- [x] `tests/pure-modules.test.cjs`: five calendar tests — 27/27 green
- [x] `index.html`: `#viewSchedules` + `#schedcalSheet` overlay
- [x] `app.js`: element registry + `state.schedules` island
- [x] `app.js`: schedules region (build/index/render/href/sheet/cleanup/`showSchedules`)
- [x] `app.js`: grid keyboard map + roving tabindex + sheet focus trap
- [x] `app.js`: wire the six route surfaces + press wiring + `bindEvents`
- [x] `pages.css`: `.schedcal-*` section
- [x] Entry points: home Schedule key -> `<a>`, `#custNextBanner` -> `<a>` + href in `renderCustomerDetail`
- [x] Browser verify: grid geometry, band continuity (0px gap, same row), lanes,
      keyboard map, month-edge paging, sheet focus lifecycle, roving tabindex.
      NOT verified with real data — the app is behind a shared-password gate.

## Documents
- [x] `schema.sql`: `document_feed` view + index + nav-list title
      **NOT YET RUN against Supabase — the live DB has no document_feed, so
      both list routes render their error panel until it is applied.**
- [x] `db.js`: projection, kinds, `normalizeDocumentKind`, `listDocumentFeed` + test
- [x] `index.html`: `#viewDocuments` + `#docnewSheet`
- [x] `app.js`: `state.documents` island + registry
- [x] `app.js`: documents region (clones of the fitting feed) + `alignLedgerSearch` extraction
- [x] `app.js`: extract `documentReadiness` and `advancedStatus`; `bumpStatus` becomes a caller
- [x] `app.js`: create-flow picker (customer -> order -> generate -> log -> refresh)
- [x] `app.js`: wire both routes + park-on-order-hop cleanup + `bindEvents`
- [x] `pages.css` `.doclist-*` + `shared.css` `.docnew*`
- [x] Entry points: home Quotation/Invoice keys + both customer banners
- [x] Browser verify: both routes, kind switch resets rows, card + rail colours,
      picker focus lifecycle, error panel. Paging/search/generate NOT verified —
      needs the migration applied and a signed-in session.

## Close out
- [x] Docs: MAP-app (region table + routes + function index regenerated from
      source), MAP-html-css, FEATURES (§19, §20), DATABASE, MODULES, DESIGN-SYSTEM
- [x] Full `node --check` sweep + `node --test` green (28 tests)

## Left for you
1. **Run `schema.sql` in the Supabase SQL editor** (twice, to confirm it stays
   idempotent). Until then both document routes show their error panel —
   `Could not find the table 'public.document_feed'`.
2. Verify with real data behind the login: band alignment against a known
   order, search/paging, and one end-to-end generate.
3. Optional: `assets/doclist-new-icon.svg` — the New key ships with a text face.
