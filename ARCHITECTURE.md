# Architecture

Kelak Kembali is a build-free browser SPA backed by Supabase. `index.html`
loads global `window.KK` modules in dependency order; there is no bundler,
framework, package manifest, or generated application code.

## Start here

| Task | Primary files | Supporting files |
| --- | --- | --- |
| Change a route, screen, form, or interaction | `app.js`, `index.html` | Relevant feature section in `styles.css` |
| Change customer/order persistence or auth | `db.js` | `schema.sql`, `config.js` |
| Change quotation or invoice content/PDF output | `docs.js`, document templates in `index.html` | Document section of `styles.css`, `fonts.css` |
| Change moodboards | `moodboard.js` | Moodboard view in `index.html`, moodboard CSS, `google-drive` |
| Change fitting photos/journal | `fittings.js` | Fitting markup/CSS, `db.js`, `google-drive` |
| Change schedule rules | `calendar.js` | Schedule rendering in `app.js`, `google-calendar` |
| Change Google Calendar or Drive behavior | Matching function under `supabase/functions/` | Browser call wrapper in `db.js` |
| Change intake/Tally handling | `supabase/functions/intake/index.ts` | `intake_submissions` in `schema.sql`, enquiry UI in `app.js` |
| Change database shape or policies | Append an idempotent block to `schema.sql` | Update projections and writes in `db.js` |
| Change shared formatting/date/DOM helpers | `util.js` | Callers under `window.KK` |

Historical implementation plans (`PLAN-*.md`) explain past design decisions,
but current code and this file are the navigation source of truth.

## Runtime map

The script order at the bottom of `index.html` is a dependency contract:

```text
CDN libraries + config.js
          │
       util.js
       ├── docs.js ───────── quotation/invoice templates
       ├── moodboard.js ──── moodboard template
       ├── fittings.js
       ├── db.js ─────────── Supabase + Edge Functions
       └── calendar.js
               │
             app.js ──────── routes, view state, DOM events
```

Modules publish APIs on `window.KK`; they are not ES modules. Preserve script
order when adding a dependency. `app.js` is the composition root and may call
every browser module. Lower-level modules must not call `app.js`.

## Ownership and boundaries

- `index.html` owns static structure only: SPA views, overlays, fixed action
  bars, and three off-screen PDF canvases. It does not fetch data or decide
  business state.
- `styles.css` owns all layout and presentation. Its order is significant
  because later feature/revamp rules override older shared rules.
- `app.js` owns hash routing, in-memory page state, rendering, validation, and
  workflow orchestration. It should obtain persistent data only through
  `KK.db` and schedule calculations only through `KK.calendar`.
- `db.js` is the only browser module that owns the Supabase client. It owns
  queries and Edge Function calls, but not UI messages or business rendering.
- `calendar.js` is pure date/schedule policy: no DOM, network, or storage.
- `docs.js` owns quotation/invoice data-to-document rendering and capture. It
  does not know about routes or persistence.
- `moodboard.js` owns local image state, layout, preview, and PDF capture. Drive
  archival is requested by `app.js` through `db.js` after generation.
- `fittings.js` owns camera/gallery overlays and fitting-journal interaction.
  Persistence callbacks are injected by `app.js`.
- `util.js` contains dependency-free helpers used by multiple browser modules.
- `schema.sql` is an append-only, re-runnable migration history. Do not rewrite
  old applied blocks; append a new idempotent block.
- Edge Functions own secrets and privileged third-party calls. Calendar and
  Drive use authenticated Supabase sessions; intake instead authenticates the
  raw Tally webhook signature.

## Data flow

```text
User event → app.js → db.js → Supabase tables
                         └── Edge Function → Google Calendar/Drive

Order data → app.js → docs.js/moodboard.js → browser PDF
Payment/wedding dates → calendar.js → app.js → db.js → calendar sync
Tally → intake Edge Function → intake_submissions → app.js review → customer
```

The detailed lifecycle, payment, scheduling, and rendering rules remain in
`README.md`; those rules are product contracts, not incidental implementation.

## How to work in this repo

1. Read the row for the task in **Start here**, then the ownership paragraph
   for those files. Load `README.md` only for the relevant business-rule section.
2. For a feature, update structure, behavior, persistence, and styling only in
   the owning layers. For a bug, trace from the UI handler in `app.js` toward a
   pure module or `db.js`; do not bypass the data layer.
3. There is no automated test suite, build, linter, or CI job. Before and after
   a change, run:

   ```sh
   for file in app.js calendar.js config.js db.js docs.js fittings.js moodboard.js util.js; do
     node --check "$file" || exit 1
   done
   git diff --check
   ```

4. Serve the repository over HTTP and manually verify the touched route. PDF,
   authenticated Supabase, Edge Function, and visual flows require manual checks.
5. Add database changes as new idempotent blocks at the end of `schema.sql` and
   update the corresponding `db.js` projection/write in the same change.

