# Architecture & Codebase Map

> **Agents: start at [AGENTS.md](AGENTS.md), not here.** This file is the rationale layer.
> For navigation use the maps — they are cheaper and more precise:
> [docs/FEATURES.md](docs/FEATURES.md) (feature → files) ·
> [docs/MAP-app.md](docs/MAP-app.md) (app.js regions + function index) ·
> [docs/MAP-html-css.md](docs/MAP-html-css.md) (views, overlays, CSS sections) ·
> [docs/DATABASE.md](docs/DATABASE.md) (tables, db.js API, edge actions) ·
> [docs/MODULES.md](docs/MODULES.md) (export surfaces) ·
> [docs/CONVENTIONS.md](docs/CONVENTIONS.md) (how to write code here) ·
> [docs/README-INDEX.md](docs/README-INDEX.md) (seek into README.md by line).

Kelak Kembali is a zero-build, native Vanilla JS Single Page Application (SPA) backed by Supabase PostgREST and Deno Edge Functions. `index.html` loads global `window.KK` modules in explicit dependency order.

---

## Start Here: Feature Entry-Point Map

To make a change safely without reading unnecessary files, use this map to target the exact minimum context:

| Feature / Domain | Primary Entry File | Supporting Files & Layout | Data & Edge Functions |
| :--- | :--- | :--- | :--- |
| **Homepage & Customer Ledger** | [app.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/app.js) (`showCustomers`, `renderCustomerList`) | `#viewCustomers` in [index.html](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/index.html), [styles/pages.css](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/styles/pages.css) | [db.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/db.js) (`listCustomers`) |
| **Customer Detail & Editor** | [app.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/app.js) (`showCustomerDetail`, `saveCustomer`) | `#viewCustomer`, `#viewCustomerEdit` in [index.html](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/index.html) | [db.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/db.js) (`updateCustomer`, `deleteCustomer`) |
| **Order Detail & Item Costing** | [app.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/app.js) (`showOrderDetail`, `saveOrder`) | `#viewOrder`, `#viewOrderEdit` in [index.html](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/index.html) | [db.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/db.js) (`updateOrder`, `logOrderHistory`) |
| **Fitting Schedule Rules** | [calendar.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/calendar.js) (`computeSchedule`) | `orderScheduleModel` in [app.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/app.js) | [db.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/db.js) (`replaceOrderEvents`) |
| **Fitting Logs Feed (global)** | [app.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/app.js) (`showFittingLogs`, `startFittingFirstPage`) | `#viewFittingLogs` in [index.html](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/index.html), `.fitlog-*` in [styles/pages.css](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/styles/pages.css) | [db.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/db.js) (`listFittingLogs`), `fitting_log_feed` view in [schema.sql](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/schema.sql) |
| **Fitting Log Detail & Photo Editor** | [app.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/app.js) (`showFittingLogDetail`, `showFittingPhotoEditor`) | `#viewFittingDetail`, `#viewFittingPhotoEdit`, `#fittingPhotoViewer` in [index.html](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/index.html), `.fitdet-*` / `.fitedit-*` in [styles/pages.css](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/styles/pages.css) | [db.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/db.js) (`listFittingPhotosBySession`, `getFittingPhoto`, `driveGetFittingPhoto`) |
| **Fitting Log PDF Snapshot** | [fitting-pdf.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/fitting-pdf.js) | orchestrated by `downloadFittingPdf` in [app.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/app.js) | `get_fitting_photo` action of the `google-drive` Edge Function |
| **Fitting Image Prep & Drive Archival** | [fittings.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/fittings.js) | `#viewFittingPhotoAdd` & the `#fitmark` overlay in [index.html](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/index.html) | `google-drive` Edge Function via [db.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/db.js) |
| **Moodboard Generator & Export** | [moodboard.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/moodboard.js) | `#viewMoodboard` in [index.html](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/index.html), [styles/moodboard.css](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/styles/moodboard.css) | `google-drive` Edge Function via [db.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/db.js) |
| **PDF Quotations & Invoices** | [docs.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/docs.js) | `#quotation`, `#invoice` in [index.html](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/index.html), [styles/documents.css](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/styles/documents.css) | [db.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/db.js) (`logDocument`) |
| **Intake / Tally Enquiries** | `supabase/functions/intake/index.ts` | `#viewEnquiry` in [index.html](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/index.html), [app.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/app.js) (`acceptEnquiry`) | `intake_submissions` in [schema.sql](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/schema.sql) |
| **Google Calendar Integration** | `supabase/functions/google-calendar/index.ts` | `#viewCalendar` in [index.html](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/index.html), `showCalendarSettings` in [app.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/app.js) | `callGoogle` in [db.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/db.js) |

---

## Runtime Map & Dependency Hierarchy

The script loading sequence in [index.html](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/index.html) defines a strict lower-to-higher dependency graph:

```text
Third-party Libraries (Supabase, html2canvas, jsPDF) + config.js
                     │
                  util.js (Pure helpers, shared icons, fitting-stage vocabulary)
           ┌─────────┼─────────┬──────────────┬────────────────┐
  docs.js moodboard.js fittings.js calendar.js fitting-pdf.js quotes.js
           └─────────┼─────────┴──────────────┴────────────────┘
                     │
                  db.js (Supabase Client & Edge Function invocations)
                     │
                  app.js (Composition Root: Router, State, DOM Controllers)
```

- Lower-level modules (`util.js`, `calendar.js`) MUST NEVER depend on `app.js` or DOM rendering.
- `app.js` acts as the composition root and orchestrates DOM events, routes, and API calls.

---

## Module Boundaries & Ownership Rules

1. **`index.html`**: Owns static HTML structure, SPA route views, modal/drawer markup, and offscreen PDF canvas templates.
2. **`styles/`**: Load order is fixed and set in `index.html` lines 18–22: `fonts.css` → `pages.css` → `shared.css` → `documents.css` → `moodboard.css`. `shared.css` loads *after* `pages.css`, so shared rules win ties at equal specificity — put page overrides in `pages.css` with higher specificity, never later in `shared.css`.
3. **`util.js`**: Dependency-free pure formatting functions (`formatRupiah`, `formatLongDate`, `escapeHtml`), HEIC image decoder, and SVG icon constants.
4. **`calendar.js`**: Pure date arithmetic and schedule generation algorithms for production and design phases.
4b. **`quotes.js`**: The lines shown on the boot curtain and the eligibility rules behind them — facts and jokes always, greetings only when the hour and the date agree. Pure: it does not know the curtain exists, and `app.js` decides when to show and when to swap.
5. **`docs.js`**: Pure document layout rendering, watermark generation, and PDF export via html2canvas & jsPDF.
6. **`moodboard.js`**: Canvas layout solver (16:9 / 9:16), mosaic grid engine, photo caching, and PDF snapshot generator.
7. **`fittings.js`**: Shared fitting image preparation (HEIC → 2560px JPEG at 0.90), local object-URL ownership, Drive archival, the pending-backup registry (`waitForSessionBackups`), and the stage picker. It owns no route and draws no page: the camera journal is retired, photos come from the device gallery, and Drive holds the clean original only — a photo's red markup is vector data on its row, not a second image.
8. **`fitting-pdf.js`**: Pure A4 page geometry for the fitting handoff sheet — natural-ratio fitting, red-mark rendering at image-relative coordinates, caption flow and overflow, filenames. **No cover page; one fitting photo is one page.** It never touches the database, Drive, toasts, or saving; `app.js` resolves every image and owns the busy UI and the final save.
9. **`db.js`**: Sole browser module owning the Supabase PostgREST client and Deno Edge Function invocations.
10. **`schema.sql`**: PostgreSQL database schema, tables, triggers, and RLS security policies.

### Fitting-log route family

`#/fittings`, `#/fittings/:sessionId`, and `#/fittings/:sessionId/photo/:photoId/edit` are one experience. Moving between them parks the feed's search, filters, loaded pages, DOM, and scroll offset so Back restores the exact list; leaving the family (or reloading) clears the snapshot and rebuilds from the URL. Both detail routes fetch and validate their own records, so a pasted URL behaves exactly like a tapped card.

The `google-drive` Edge Function's `get_fitting_photo { photo_id }` action is the byte source for individual image sharing and for PDF generation. It resolves the Drive id from the photo record server-side — an arbitrary Drive id can never be requested through it.

Fitting logs use five canonical one-to-one stages: Sizing, Fitting 1, Fitting 2,
Fitting 3, and Final fitting. An order can have at most one durable log per
stage. Planned weeks are independent schedule metadata: users always select a
stage explicitly, and a new log is not persisted until its first photo entry is
confirmed. Order-origin detail/editor routes carry a trusted `source=order`
marker; feed-origin routes return through the retained feed snapshot.

---

## How to Work in This Codebase (For Future AI Agents & Developers)

0. **Read [AGENTS.md](AGENTS.md) first.** It carries the reading budgets, edit budgets, search order, and invariants. Then take one row from [docs/FEATURES.md](docs/FEATURES.md), which expands each entry below into exact line ranges.
1. **Targeted Reading**: To fix or add a feature, consult the **Start Here: Feature Entry-Point Map** and load ONLY the 1-2 relevant files listed in the entry map. Never read `app.js`, `index.html`, `schema.sql`, `README.md`, or `styles/pages.css` whole — go through the maps in `docs/`.
2. **Verification Gate**: After making structural modifications, ALWAYS run the syntax validation check and unit test suite before declaring completion:

   ```bash
   node --check app.js db.js util.js calendar.js quotes.js config.js docs.js fittings.js fitting-pdf.js moodboard.js progress.js tests/pure-modules.test.cjs
   node --test tests/pure-modules.test.cjs
   ```
