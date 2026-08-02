# Fitting Logs Implementation Plan

## 1. Overview & goals

Build a new read-only **Fitting logs** route inside the existing zero-build, mobile-first Vanilla JavaScript SPA. The page is a global feed of fitting sessions, follows the three supplied Figma frames, and reuses the visual language already implemented by the homepage and Customer detail ledger.

Source designs:

- Default: Figma node `218:1958`
- Filtered: Figma node `219:2547`
- No match: Figma node `219:2731`

Primary outcomes:

- Homepage **Fitting** shortcut opens the unfiltered feed.
- Customer detail **Fitting logs** banner opens the same feed with that customer's name visibly pre-filled and their records exactly scoped on first render.
- Search matches the three concepts named by Figma: customer name, order title, or displayed log date.
- Stage controls support any combination of Sizing, Fitting 1, Fitting 2, and Fitting 3.
- Search and stage filters combine with AND logic; selected stages combine with OR logic.
- Results are newest-first and load in stable batches of 10 with infinite scrolling.
- The icon-only New control and log cards have press feedback but no functional action in this release.
- Initial loading, pagination loading, empty, no-match, failure, retry, and end-of-feed behavior are implemented without shifting the page chrome or existing results.

### In scope

- New hash route and static routed view.
- Read-only fitting-log feed query backed by the existing Supabase data.
- Search, multi-stage filtering, and cursor pagination.
- Homepage and Customer-detail entry points.
- Figma-matched layout and documented supporting states.
- Focus, keyboard, screen-reader, responsive, and reduced-motion behavior.
- Focused tests for data normalization, routing, filtering, pagination, and state rendering.

### Explicit non-goals

- Creating, editing, deleting, or opening a fitting log from this feed.
- Navigating from a feed card to the existing fitting journal.
- Staff ownership, notes search, permissions redesign, or a new role model.
- Redesigning unrelated homepage, Customer, order, or fitting-journal experiences.
- Turning the SPA into React, adding Tailwind, or adding a build step.

## 2. Existing architecture and implementation boundaries

The application is a responsive web SPA, not a native application. It uses static HTML route sections in `index.html`, CSS in the existing ordered stylesheets, global `window.KK` modules, hash routing in `app.js`, and Supabase/PostgREST access exclusively through `db.js`. `app.js` remains the composition root.

Follow these boundaries:

- `index.html`: add the static `#viewFittingLogs` route shell and its stable state containers.
- `styles/pages.css`: add page-specific Fitting Logs geometry, colors, cards, tabs, skeletons, and responsive rules. Reuse the existing `--home-*`, spacing, motion, and font tokens.
- `app.js`: add route parsing, state, DOM registration, rendering, event coordination, query-string initialization, pagination observer, request cancellation/token guards, focus behavior, and the two entry-point handlers.
- `db.js`: add one public read method for the feed. Keep all PostgREST query construction out of `app.js`.
- `schema.sql`: append the read-model/view definition needed for a flat, searchable, paginated PostgREST resource. This repository currently records schema evolution in this file rather than a migration directory.
- `fittings.js`: only if necessary, expose the existing Google Drive thumbnail URL helper so the feed does not duplicate its URL construction. Do not move feed rendering into this journal/camera module.
- `util.js`: reuse `escapeHtml` and existing formatting conventions; add a pure Jakarta-calendar-date formatter only if the feed cannot safely reuse an existing helper.
- `tests/pure-modules.test.cjs`: extend only for pure helpers that live in testable modules. DOM/router coverage may require a lightweight browser/manual acceptance checklist because the current suite is primarily pure-module tests.

Do not introduce a new component framework, store, router, CSS file, dependency, or parallel API client.

## 3. Data model & API/read-model contract

### 3.1 Existing records are the source of truth

Do not create a mock fitting-log model. A fitting log is an existing `public.fitting_sessions` row:

| UI concept | Existing source | Rule |
| --- | --- | --- |
| Log ID | `fitting_sessions.id` | Stable row/deduplication key |
| Order | `fitting_sessions.order_id → orders.id` | Required relation |
| Customer | `orders.customer_id → customers.id` | Required relation |
| Customer label | `customers.name` | Fall back to `Unnamed customer` only for defensive rendering |
| Order label | `orders.title` | Use the same order-label fallback convention as Customer/order pages |
| Log timestamp | `fitting_sessions.created_at` | The moment the user tapped Add fitting log; never substitute `completed_at` |
| Stored stage | `fitting_sessions.stage` | Normalize to one of four feed stages below |
| Status | `fitting_sessions.status` | Return if useful for diagnostics, but do not expose a status control in this design |
| Photo count | `fitting_photos` where `session_id = fitting_sessions.id` | Count all session-linked photos |
| Preview photos | Same relation | First three by `position ASC, created_at ASC, id ASC`; return `drive_file_id` and a stable key |

Legacy photos with `session_id IS NULL` are not assignable to a specific fitting log and must not be counted or previewed in this feed.

### 3.2 Stage normalization

Normalize database values at the read-model boundary so UI, filtering, copy, and colors use one vocabulary:

| Stored stage | Feed key | Display label | Color token/value |
| --- | --- | --- | --- |
| `Body measurements` | `sizing` | Sizing | dark blue `#1866da` |
| `Fitting 1` | `fitting-1` | Fitting 1 | dark green `#19aa16` |
| `Fitting 2` | `fitting-2` | Fitting 2 | dark pink `#e72a90` |
| `Fitting 3` | `fitting-3` | Fitting 3 | orange `#ff6a00` |
| `Final fitting` | `fitting-3` | Fitting 3 | orange `#ff6a00` |

The feed intentionally merges `Fitting 3` and `Final fitting`. No fifth filter is added.

### 3.3 Flat PostgREST read model

Add a read-only `public.fitting_log_feed` view (or equivalently named read model) instead of asking `app.js` to join every customer/order/session/photo collection in memory. This keeps cross-table search and batches of 10 reliable.

The view should expose at least:

```text
id                  uuid
order_id            uuid
customer_id         uuid
customer_name       text
order_title         text/null, raw orders.title for diagnostics
order_label         text, resolved with the existing orderLabel convention
stage_key           text: sizing | fitting-1 | fitting-2 | fitting-3
stage_label         text
created_at          timestamptz
log_date            date, derived from created_at in Asia/Jakarta
search_text         normalized customer + order label + visible date text
photo_count         integer
preview_photos      json/jsonb array of at most three { id, drive_file_id, position }
```

Implementation requirements for the view:

- Join only sessions with valid orders and customers.
- Derive `log_date` using the business timezone `Asia/Jakarta`, so a late-night tap is displayed and searched on the correct local day.
- Derive `order_label` exactly like `app.js`'s existing `orderLabel`: non-blank title; otherwise first item name plus ` + N more`; otherwise `Empty order`. Build `search_text` from customer name, this resolved order label, and the same `D Mon YYYY` text shown on the card. Lowercase it for case-insensitive substring matching. Do not include IDs, captions, notes, status, or staff.
- Aggregate photo count and preview metadata with correlated subqueries or a pre-aggregated photo subquery so joining photos cannot duplicate sessions.
- Use `security_invoker = true` where supported so underlying RLS remains effective. Grant read access only to the same authenticated role already allowed to read the source tables.
- Preserve current workspace permissions: all authenticated users can see all logs. No per-staff or per-customer visibility rules are introduced.
- Add an index strategy for `fitting_sessions(created_at DESC, id DESC)` and retain/use the existing session/photo indexes. If substring search becomes slow at production volume, flag a trigram index/materialized search column as a later optimization rather than silently broadening this task.

### 3.4 `db.js` contract

Add one method with a narrow contract:

```text
listFittingLogs({
  query: string,
  stages: string[],
  customerId: uuid | null,
  before: { createdAt: ISO timestamp, id: uuid } | null,
  limit: 10
}) -> {
  items: FittingLogFeedItem[],
  nextCursor: { createdAt, id } | null,
  hasMore: boolean
}
```

Query behavior:

- Order by `created_at DESC, id DESC` for deterministic newest-first results.
- Fetch `limit + 1`; return only 10 and use the extra row to determine `hasMore` without a separate count query.
- Apply `stage_key IN (...)` only when one or more stages are selected.
- Apply trimmed, whitespace-collapsed, lowercase substring matching to `search_text` only when query is non-empty.
- Apply exact `customer_id = customerId` only for an untouched Customer-entry seed, described in routing below.
- Apply the compound cursor: records older than `createdAt`, or with the same timestamp and a lexically lower `id`.
- Return a new plain object/array and let errors pass through the existing `unwrap` behavior.
- Never make one request per result card or per photo.

## 4. Routing & navigation

### 4.1 Route shape

Extend the existing hash parser with a route before the default Customers fallback:

```text
#/fittings
#/fittings?q=<customer name>&from=customer&customerId=<uuid>
```

Parse it as `{ view: "fittingLogs", query }`. Register and toggle `#viewFittingLogs` alongside the other static views in `handleRoute`, include it in route focus selection, and add a dedicated body class such as `is-fittinglogspage` through `setChrome`.

Stage selections remain transient page state for this iteration and do not need URL parameters. The only required deep-link state is Customer-entry initialization.

### 4.2 Homepage entry

- Convert the existing `.home-action--fitting` from a prevented placeholder into a real route control targeting `#/fittings`.
- Preserve its existing press and haptic behavior.
- Remove only the Fitting shortcut's placeholder prevention/`aria-disabled`; do not enable the other unfinished homepage shortcuts.
- Fitting Logs initializes with an empty search, no selected stages, and the first 10 newest records.
- The back button reads **Home** and routes to `#/customers`.

### 4.3 Customer entry

- Convert `#custFittingBanner` into a real route control after the customer record has loaded.
- Set its target to `#/fittings?q=<encoded customer name>&from=customer&customerId=<encoded id>`.
- Preserve the Customer page's existing banner press geometry.
- The Fitting Logs search field visibly contains the customer name.
- On the initial untouched state, use `customerId` for exact server filtering; this avoids mixing two customers with the same name while retaining the Figma-visible search term.
- Once the user changes or clears the pre-filled query, clear the internal exact-customer seed and search globally using the edited visible text. Do not trap the user in a hidden customer scope.
- The back button reads the customer name (truncate with ellipsis within the Figma maximum width) and routes to `#/customer/:customerId`.
- If the customer no longer exists or query parameters are malformed, fall back safely to the **Home** back control and ordinary global text search rather than failing the route.

### 4.4 Browser history and route lifecycle

- Opening either entry point creates one normal hash-history entry.
- Search/filter changes are local UI state and must not push a history entry per keystroke/tap.
- Route exit must disconnect the `IntersectionObserver`, invalidate in-flight page tokens, cancel the search debounce timer, and remove route-only focus/viewport listeners.
- Returning later starts a fresh feed unless product requirements later request state restoration.

## 5. Component breakdown and Figma specification

Use semantic static HTML containers and small render functions, matching the repository's existing `elements` registry plus `innerHTML` rendering pattern.

### 5.1 Page canvas

- Use `width: min(390px, 100%)`, `max-width: 390px`, centered on wider viewports, matching homepage and Customer detail.
- Background is primary black `#0d0d0d`; feed cards/search use primary white `#fefaf1`; grid rules use `#4c4c4c`; rails use `#e3e3e3`.
- Use the existing Plus Jakarta Sans setup and `--home-*` variables. Add semantic aliases for the four dark stage colors only if existing tokens do not already distinguish face vs dark text colors.
- Preserve the 390px layout proportions on narrow screens by using fluid widths, not a horizontal scroll canvas.

### 5.2 Sticky navigation

- Reuse Customer navigation geometry: fixed/sticky transparent 390px strip, `12px 16px 0`, left back control and right icon control, above scrolling content.
- Back control: 48px face + 7px rail, 4px radius, 24px arrow, 16px label, maximum width 240px.
- Right New control: icon-only, 56px wide, using the Figma add-log icon at 24px.
- Give the right control `aria-label="New fitting log"` and `aria-disabled="true"`. Keep it focusable only if that matches the existing placeholder-control convention; it must produce press feedback but no navigation, modal, toast, or data mutation.
- Prevent accidental form submission by using `type="button"`.

### 5.3 Title/header grid

- Reserve the fixed-nav clearance exactly as Customer detail does, then render the title block on black.
- Add 24px vertical-grid tick rows around a title band with 1px top/bottom grid borders.
- Title: **Fitting logs**, 32px/40px, weight 700, letter spacing `-0.96px`, white, with 24px horizontal inset and 12px vertical padding.
- Render this shell immediately, before data resolves, so navigation/title/search/tabs never jump.

### 5.4 Search control

- Full-width white search face, 48px high, `16px 12px` padding, 10px gap, 20px search icon.
- Use a real `<input type="search">`, 16px/20px, letter spacing `-0.48px`, with placeholder exactly **Search customer, order, or date**.
- Hide the WebKit-native cancel decoration only if a custom clear control is not introduced; Figma shows no clear button.
- Add the 7px light-gray rail and 1px dark lower rule shown in Figma.
- Do not add search suggestions, recent searches, a submit button, or result counts.

### 5.5 Stage filter row

- Four equal-width controls in one row: Sizing, Fitting 1, Fitting 2, Fitting 3.
- Each face uses `12px 8px`, centered 14px/20px semibold text, 1px separators, and an 8px gray rail.
- Inactive: white face with stage-colored text.
- Active: stage-colored face with white text, as shown by Fitting 2 in nodes `219:2547` and `219:2731`.
- Press feedback may transfer rail height into the face, consistent with existing homepage/Customer controls, while preserving total row height.
- Use `aria-pressed="true|false"`; a selected group is not a tablist because multiple selections are allowed.

### 5.6 Feed and fitting card

- Wrap each result in the same ledger rhythm as Figma: 1px full-width rule, 24px vertical grid tick space, then a 24px horizontal inset.
- Card face: white, 1px dark left/right borders, 12px padding, 12px internal gap.
- Card rail: 8px gray with dark side borders.
- Top row: customer name followed by a colon on line one, resolved order label on line two, 14px/20px bold with truncation matching the frame; stage label right-aligned in a fixed maximum 100px column, 14px/20px semibold.
- Internal divider: 1px `#e3e3e3`.
- Bottom row: up to three 32px square thumbnails with 4px gaps and 4px radius; right-aligned metadata in 14px/24px medium dark-gray text: `D Mon YYYY · N photo(s)`.
- Build thumbnail URLs using the existing Google Drive helper and request an appropriately small rendition. Set explicit image width/height, `object-fit: cover`, and a background color before image load to prevent reflow.
- Use empty `alt` text on thumbnails because the count and card context already describe them and the images are not actionable here.
- Treat each card as a semantic `<article>`/list item, not a link or button. Pointer press may change the face/rail visually, but cards receive no click handler, keyboard tab stop, navigation, or journal action.
- Keep press transitions dimension-preserving and disable them under `prefers-reduced-motion`.

### 5.7 Footer

- Reuse the existing footer copy **Made with love for Ichaku**, centered on black in 14px/24px gray text with 24px vertical padding.
- Keep the footer after the sentinel/state region. It may move downward as expected when another batch is appended, but already rendered cards must not move.

## 6. Search logic & lazy-loading/pagination

### 6.1 Search behavior

- Initialize from route `q` without waiting for user input.
- On input, trim outer whitespace and collapse repeated internal whitespace for the request while leaving the user's field value intact.
- Match a case-insensitive substring of customer name, resolved order title, or the visible `D Mon YYYY` date string only.
- Do not match order UUID, customer UUID, fitting stage, photo captions, notes, photo count, status, or staff.
- Debounce network requests by approximately 250ms. Empty query means no text predicate.
- Pressing Escape in the search field may clear it only if this follows native `type=search` behavior; do not add an unshown custom key command.

### 6.2 Search focus and keyboard space

When the search field receives focus:

- Wait for `visualViewport` resize/scroll to settle, then scroll so the search face sits immediately below the fixed navigation controls, not vertically centered by the app-wide generic focus handler.
- Give the search section a route-specific `scroll-margin-top` equal to the nav's occupied height plus a small safe gap.
- Calculate the target from the nav bottom and current search top and use `window.scrollBy`/equivalent exact offset; `scrollIntoView({block: "start"})` alone is insufficient under the mobile visual viewport.
- Re-run the correction once after the software keyboard changes `visualViewport.height`, guarded so it cannot create a feedback loop or jitter.
- Respect safe-area inset and `visualViewport.offsetTop`.
- Use smooth scrolling only when reduced motion is not requested.
- Exempt this field from the existing document-wide `focusin → scrollIntoView({block: "center"})` behavior, or that handler will fight the route-specific alignment.
- Do not blur the input after filtering. The keyboard stays open while the user refines the query.

### 6.3 Feed request state

Add a dedicated state object in `app.js`, for example:

```text
phase: idle | initial-loading | ready | initial-error
items: []
query: ""
selectedStages: Set
customerSeed: { id, originalQuery } | null
nextCursor: null
hasMore: true
loadingMore: false
loadMoreError: null
requestToken: 0
observer: null
```

Do not store feed data in `state.customerOrders` or the fitting-journal state.

### 6.4 Initial load and invalidation

- Route entry renders the stable shell and initial skeleton before awaiting data.
- Any effective search or selected-stage change increments `requestToken`, clears cursor/items, and starts a new first-page request.
- Ignore any response whose token no longer matches; this prevents slow previous searches from replacing newer results.
- If `AbortController` is practical with the Supabase client version, abort obsolete requests as an optimization; token validation remains mandatory.
- Do not briefly show the unfiltered list for a Customer deep link.

### 6.5 Infinite scrolling

- Add a non-visual sentinel after the result list.
- Observe it with `IntersectionObserver` and a forward preload margin around 300px so the next batch begins before the user reaches the footer.
- Request exactly 10 visible records per batch using `nextCursor`.
- Guard against concurrent calls with `loadingMore`, `hasMore`, current route, and `requestToken` checks.
- Deduplicate appended records by `id` defensively.
- On success, append records without replacing existing DOM/list content; update the cursor and `hasMore`.
- On no further page, disconnect or pause the observer. Do not show an invented end-of-feed banner unless approved; the footer is sufficient.
- Provide a scroll-listener fallback only if required browser support excludes `IntersectionObserver`.

## 7. Stage filter logic and interaction with search

- Default selected-stage set is empty, meaning **all four normalized stages**.
- Tapping an inactive control adds its key; tapping an active control removes its key.
- One or several stages may be selected.
- Within the stage set, matching is OR: selecting Sizing and Fitting 2 returns either stage.
- Stage filtering combines with the search query using AND: `(stage in selected set) AND (search_text contains query)`.
- `fitting-3` includes both stored `Fitting 3` and stored `Final fitting` through read-model normalization.
- Every stage toggle resets pagination and requests a new first page.
- Preserve input focus and the open keyboard when a stage is toggled after search focus.
- Announce the updated result state after loading through the live region, not on pointer-down.

## 8. “New” button behavior

The icon-only top-right control is a deliberate stub.

- Match the Figma icon, sizing, rail, and pressed state.
- Accessible name: **New fitting log**.
- It performs no route change, modal opening, toast, mutation, analytics event, or call into the existing `fittingNew` order route.
- Mark it with `aria-disabled="true"` while retaining the agreed visual press feedback, following the codebase's placeholder-control convention.
- Add a concise code comment that the creation flow is intentionally out of scope so a later agent does not mistake the missing handler for a bug.
- Do not reuse the order-specific stage picker or infer which order a global New action would target.

## 9. Empty, loading, error, and pagination states

Only the no-match state is specified in Figma. The other treatments below are implementation proposals required to make the experience complete and layout-stable; keep them visually subordinate and flag them for design review rather than presenting them as Figma-authored states.

### 9.1 Initial loading

- Keep nav, title, search, filter row, grid ticks, and footer in their final positions from first paint.
- Set the feed region `aria-busy="true"` and render three card skeletons using the exact card outer geometry: fixed thumbnail boxes, two text lines, divider, metadata line, and 8px rail.
- Reserve at least the remaining visual-viewport height below filters so the footer does not jump up and then down.
- Reuse the existing home/route skeleton palette and shimmer timing. Disable shimmer under reduced motion.
- Skeletons are `aria-hidden`; expose one visually hidden `role="status"` message: **Loading fitting logs**.

### 9.2 Loading another page

- Preserve all loaded cards.
- Add one skeleton card at the bottom/sentinel region while the next batch loads; do not overlay or dim existing content.
- Do not move focus or announce every individual row. A polite status can say **Loading more fitting logs**.

### 9.3 No logs exist at all

- Condition: empty query, no selected stages, first request succeeds with zero rows.
- Render a card-shaped message region within the ledger grid, not the Figma search-miss copy.
- Proposed copy: **No fitting logs yet** / **New fitting logs will appear here after a fitting is started.**
- Do not make the New stub functional or add an alternate creation CTA.

### 9.4 No match

- Match Figma node `219:2731`: white inset panel, dark text, heading **Nothing matched your search**, and supporting text.
- With a query and one selected stage: **We couldn't find _{query}_ in _{stage}_. Check the spelling or search another stage.** Bold the escaped query and stage label as shown.
- With a query and several selected stages: list the human-readable stages concisely.
- With a query and no stages selected: omit the `in {stage}` phrase and suggest checking spelling or trying another search.
- With selected stages but no query: use proposed copy **No fitting logs in {stages}. Choose another stage to see more logs.**
- Never offer to create a customer or fitting log from this state.
- The message is a status result, not an error alert.

### 9.5 Initial request failure

- Replace only the feed skeleton region with an inset error panel; keep title/search/filters usable.
- Proposed copy: **Couldn't load fitting logs** / **Check your connection and try again.**
- Include a visible **Try again** button styled from the existing route/home retry patterns.
- Set `role="alert"` on first presentation, then avoid repeating the alert on every retry.
- Retry uses the current query and stages and resets only the failed first page.

### 9.6 Later-page failure

- Preserve all existing cards and cursor.
- Replace the bottom loading skeleton with a compact inline message and **Try again** control.
- Retrying must request the same cursor once; the observer remains paused until success or an explicit retry.
- Never clear the feed because page 2+ failed.

### 9.7 Offline and end of feed

- Existing global online/offline toasts remain in effect.
- A request failure while offline uses the same inline error state, with retry available after reconnection.
- End of feed adds no new copy in this iteration because Figma does not specify one. Stop observing and let the standard footer close the page.

## 10. Responsive/mobile behavior notes

- Treat 390px as the reference canvas, centered on desktop using the same dark outer background as homepage/Customer detail.
- At widths below 390px, make the canvas, cards, title, search, and filters fluid with no horizontal scrolling.
- Keep all four stage controls on one row. Allow label text to remain one line; their known labels fit at the supported narrow widths. Do not wrap or convert to a dropdown without a new design.
- Respect `env(safe-area-inset-top)` in fixed navigation positioning and search-focus offset.
- Use `100svh`/`100dvh` and the existing `--keyboard-offset`/`visualViewport` infrastructure rather than hard-coded keyboard heights.
- Explicit image dimensions and stable skeleton/card boxes prevent photo loading from changing card height.
- Long customer/order names truncate as shown; preserve full text in the article's accessible label/description if needed without adding a visual tooltip.
- On orientation/viewport change, recompute the search focus offset and observer geometry without resetting results.
- This is responsive web behavior that mimics a native paginated feed; do not add pull-to-refresh or native-only gestures.

## 11. Accessibility notes

- Use one `<main>`/route section with an `<h1>` of **Fitting logs** and programmatically focus that heading on route entry, following `focusRoute` conventions.
- Back control has a contextual accessible name, e.g. **Back to Home** or **Back to {customer}**.
- New control has `aria-label="New fitting log"` and disabled semantics matching its no-op state.
- Search has a persistent programmatic label even though Figma visually shows only placeholder text. Placeholder is not the sole accessible name.
- Filter controls use actual `<button type="button">` elements with `aria-pressed`; include a group label such as **Filter fitting logs by stage**.
- Results use a semantic list with card articles/list items. Because cards do nothing, do not give them button/link roles or keyboard focus.
- Mark decorative grid ticks, rails, divider dots, and thumbnail images `aria-hidden` or empty-alt as appropriate.
- Use a dedicated polite live region for loading completion and result summaries such as **12 fitting logs found** or **No fitting logs matched**. Do not announce every keystroke before the debounced request completes.
- Ensure active white-on-stage-color and inactive colored-text-on-white combinations meet WCAG AA. The Figma colors should be contrast-tested; if any fail, flag the exact pair before changing source-of-truth colors.
- Maintain visible focus rings on back, New, search, filters, and retry actions; adapt ring color to dark versus white surfaces.
- Touch targets for navigation/search/filter controls are at least 44px high where possible. The Figma filter face plus rail is 44px total.
- Respect `prefers-reduced-motion` for press transitions, smooth search scrolling, and skeleton shimmer.

## 12. Edge cases

- Two customers have the same name: Customer entry uses `customerId` until the user edits the seeded query.
- Customer was deleted after a deep link was created: fall back to global search and Home back navigation.
- Order title is null/blank: use the same order fallback label as existing order/customer rendering and include that resolved label in search.
- Customer/order text contains HTML or quotes: always escape before rendering and safely encode route values.
- Search is only whitespace: treat as empty without altering what the user typed until normal input behavior does so.
- Search contains `%`, `_`, commas, parentheses, or PostgREST syntax characters: escape them as literal user input in `db.js`; never concatenate an unsafe filter expression.
- Very long query: cap the effective request length to a documented reasonable value (for example 200 characters) while allowing ordinary editing.
- Created near midnight: derive both display and search date in Asia/Jakarta from `created_at`.
- Equal timestamps: use `id DESC` as deterministic secondary order/cursor.
- A new session is inserted while scrolling: cursor pagination prevents duplicates/reordering in already loaded pages; it appears on a fresh route/filter/search reload.
- Session is deleted between pages: the next cursor still works and simply returns fewer records if appropriate.
- Stored `Final fitting`: display/filter as Fitting 3.
- Unsupported/invalid stored stage: exclude it from the four-stage read model and log/monitor during development rather than inventing a UI label.
- Zero photos: show `0 photos`; preview behavior remains an open visual question below.
- One or two photos: count remains exact; do not duplicate photos to fill three positions.
- More than three photos: show the first three previews and the total count.
- Missing/broken Drive thumbnail: keep the 32px box stable and use the established neutral fallback; do not show a broken-image glyph.
- Legacy `session_id IS NULL` photos: excluded from count/previews.
- Rapid typing/filter tapping: stale responses cannot overwrite the newest state.
- Sentinel intersects during initial loading or error: guards prevent duplicate requests.
- User leaves mid-request: observer/listeners are cleaned up and late results are ignored.
- Browser lacks `visualViewport`: use fixed-nav geometry plus `scroll-margin-top` fallback; never assume a keyboard height.
- JavaScript disabled: no new fallback is required beyond the existing SPA behavior.

## 13. Open questions & recorded assumptions

The following are not shown in the supplied Figma frames. They must not be silently presented as designer-approved details:

1. **Fewer than three photos:** the frames always show three black thumbnail blocks. This plan assumes they represent preview image slots, renders only real photos, and keeps a neutral fixed-size fallback only for a failed image. Confirm whether empty slots should instead remain visible when a log has 0–2 photos.
2. **Initial empty copy:** proposed copy is documented in section 9.3 but needs design/content approval.
3. **Loading skeleton appearance:** geometry and palette deliberately reuse existing patterns, but Figma supplies no loading frame.
4. **Initial and pagination error copy/layout:** proposed in section 9 and requires visual review.
5. **Multiple selected filters:** behavior is confirmed, but Figma shows only one active filter. The plan applies the same filled treatment independently to every selected control.
6. **Filter-only no-result copy:** proposed in section 9.4 because only query-plus-one-filter is designed.
7. **End-of-feed treatment:** assumption is no special label; the existing footer is sufficient.
8. **Business timezone:** assumption is `Asia/Jakarta`, matching the project/user context. If the workshop timezone becomes configurable, both view search text and display formatting must use the same configured zone.

Confirmed product decisions captured by this plan:

- Body measurements displays as Sizing.
- Final fitting displays and filters as Fitting 3.
- Date is always `fitting_sessions.created_at`.
- Search scope is customer, order, or displayed date only.
- Stage selection is multi-select and toggles off on a second tap.
- Search and selected stages combine with AND logic.
- Customer routes carry query text plus exact customer ID.
- Back destinations are Home or the originating Customer.
- New is icon-only and truly does nothing.
- Cards are press-only and non-navigating.
- All authenticated users retain workspace-wide visibility.
- Search focus should position the field below sticky navigation for keyboard space.

## 14. Suggested task breakdown / build order

### Task 1 — Add and verify the database read model

- Append `fitting_log_feed` to `schema.sql` with stage normalization, Jakarta date, resolved order label, search text, photo count, and three-photo aggregation.
- Apply security-invoker/authenticated read behavior.
- Verify sample rows for every stored stage, especially Body measurements and Final fitting.
- Verify zero, one, three, and more-than-three photo sessions.
- Confirm query plans use session/photo indexes and that one session produces one feed row.

Acceptance gate: direct PostgREST queries can search customer/order/date, select multiple normalized stages, sort deterministically, and paginate without duplicates.

### Task 2 — Add the `db.js` feed API

- Add projection/constants and `listFittingLogs`.
- Implement literal-safe query normalization, filters, `limit + 1`, and compound cursor logic.
- Keep result shaping and cursor creation in the data layer.
- Add pure tests for query/stage normalization if helpers can be cleanly isolated.

Acceptance gate: calls return the documented `{ items, nextCursor, hasMore }` contract and errors follow existing `unwrap` behavior.

### Task 3 — Build the static route shell

- Add `#viewFittingLogs` markup to `index.html` with nav, title, labelled search input, pressed filters, feed/state containers, sentinel, live region, and footer.
- Register all new elements and route/body-class toggles in `app.js`.
- Add `#/fittings` parsing and route focus behavior.
- Render a stable initial shell before starting the request.

Acceptance gate: direct navigation to both route shapes shows the correct chrome/back control without flashing another view.

### Task 4 — Match Figma styling

- Add the 390px canvas, fixed nav, header grid, search, filters, card geometry, stage colors, footer, and dimension-preserving press styles to `styles/pages.css`.
- Reuse `--home-*` tokens and existing assets where identical; add only missing fitting-log-specific selectors/assets.
- Compare at 390px against all three Figma screenshots.
- Check narrow mobile and centered desktop canvases.

Acceptance gate: default, one-filter active, and no-match layouts align with the supplied frames in spacing, type, colors, borders, rails, and truncation.

### Task 5 — Implement page state, search, and filters

- Add isolated fitting-log state and render functions in `app.js`.
- Initialize query/customer seed from route.
- Debounce search, clear exact seed after user edits, toggle multi-select filters, and use request tokens.
- Render cards with escaped text, normalized stage colors, stable thumbnails, local dates, and correct pluralization.
- Add press-only behavior without card activation.

Acceptance gate: all filter combinations use OR within stages and AND with search; changing controls cannot show stale results.

### Task 6 — Implement cursor infinite scroll

- Add sentinel observer, 10-row first/next batches, prefetch margin, guards, deduplication, and cleanup.
- Preserve existing rows during next-page loading/error.
- Verify equal-timestamp cursors and insertion/deletion edge cases.

Acceptance gate: 25+ fixtures render as 10, then 10, then remainder with no duplicates, skipped rows, concurrent requests, or premature footer flashes.

### Task 7 — Implement all supporting states

- Add stable card skeletons and live statuses.
- Add initial empty, exact Figma no-match, initial error/retry, and pagination error/retry.
- Stop observation cleanly at end of feed.
- Test offline/online behavior with existing global toasts.

Acceptance gate: no page-chrome jump occurs between loading and resolved states; page-2 failure never removes page-1 results.

### Task 8 — Wire the two existing entry points

- Enable only the homepage Fitting shortcut and route it to `#/fittings`.
- Enable only the Customer Fitting logs banner and construct its encoded route after customer load.
- Update delegated click prevention so these two controls are no longer swallowed while unfinished siblings remain inert.
- Verify contextual back behavior and browser history.

Acceptance gate: both paths enter the same page with the required initial state and return to the correct origin.

### Task 9 — Keyboard, viewport, and accessibility pass

- Add the route-specific search focus alignment and exempt it from global center scrolling.
- Test iOS Safari and Android Chrome software keyboards where available.
- Verify focus order, names, `aria-pressed`, busy/live announcements, retry focus, contrast, safe areas, and reduced motion.
- Confirm no-op cards are absent from the tab order and the New stub communicates disabled behavior.

Acceptance gate: focusing search consistently places it below navigation with useful keyboard space and no oscillation or layout jump.

### Task 10 — Verification and handoff

- Run the repository's required checks:

  ```text
  node --check app.js db.js util.js calendar.js config.js docs.js fittings.js moodboard.js tests/pure-modules.test.cjs
  node --test tests/pure-modules.test.cjs
  ```

- Manually verify all three Figma states at 390px plus initial empty, skeleton, initial error, pagination error, multi-filter, long names, broken thumbnails, and keyboard focus.
- Confirm unrelated homepage shortcuts, Customer banners, order pages, and fitting creation/journal flows remain unchanged.
- Record any decisions made on the open visual questions in this document or the implementation PR before considering the feature complete.

## 15. Final acceptance checklist

- [ ] `#/fittings` loads all logs newest-first, 10 at a time.
- [ ] Homepage entry is unfiltered and returns to Home.
- [ ] Customer entry visibly pre-fills the name, exactly scopes duplicate names initially, and returns to that Customer.
- [ ] Editing the seeded Customer query switches to global search.
- [ ] Search matches only customer, resolved order title, and visible date.
- [ ] Any combination of four stage controls works; selected stages OR together and AND with search.
- [ ] Body measurements appears as Sizing; Final fitting appears as Fitting 3.
- [ ] Cards show `created_at` in Jakarta calendar time, up to three previews, and the total session-linked photo count.
- [ ] New control and cards have agreed press feedback but perform no action.
- [ ] Loading and photo arrival do not shift established chrome/cards.
- [ ] No-match matches Figma node `219:2731` for its designed case.
- [ ] Empty, initial error, retry, pagination error, offline, and end-of-feed cases behave as specified.
- [ ] Search focus scrolls directly below sticky navigation and stays stable as the software keyboard opens.
- [ ] Route cleanup prevents observers/listeners/late requests from affecting other pages.
- [ ] Keyboard, screen-reader, contrast, safe-area, and reduced-motion checks pass.
- [ ] No unrelated page behavior or application architecture is changed.
