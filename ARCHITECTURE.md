# Architecture & Codebase Map

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
| **Fitting Journal & Camera Overlay** | [fittings.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/fittings.js) | `#viewFittingJournal` & overlays in [index.html](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/index.html) | `google-drive` Edge Function via [db.js](file:///Users/nikanakamanifesto/Documents/GitHub/kelakkembali-tools/db.js) |
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
                  util.js (Pure helper functions & shared icons)
           ┌─────────┼─────────┬──────────────┐
        docs.js  moodboard.js fittings.js  calendar.js (Pure schedule rules)
           └─────────┼─────────┴──────────────┘
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
2. **`styles/`**: Load order is fixed (`shared.css` → `pages.css` → `documents.css` → `moodboard.css`).
3. **`util.js`**: Dependency-free pure formatting functions (`formatRupiah`, `formatLongDate`, `escapeHtml`), HEIC image decoder, and SVG icon constants.
4. **`calendar.js`**: Pure date arithmetic and schedule generation algorithms for production and design phases.
5. **`docs.js`**: Pure document layout rendering, watermark generation, and PDF export via html2canvas & jsPDF.
6. **`moodboard.js`**: Canvas layout solver (16:9 / 9:16), mosaic grid engine, photo caching, and PDF snapshot generator.
7. **`fittings.js`**: Fitting journal UI adapter, camera/gallery overlay handlers, and image compression.
8. **`db.js`**: Sole browser module owning the Supabase PostgREST client and Deno Edge Function invocations.
9. **`schema.sql`**: PostgreSQL database schema, tables, triggers, and RLS security policies.

---

## How to Work in This Codebase (For Future AI Agents & Developers)

1. **Targeted Reading**: To fix or add a feature, consult the **Start Here: Feature Entry-Point Map** and load ONLY the 1-2 relevant files listed in the entry map.
2. **Verification Gate**: After making structural modifications, ALWAYS run the syntax validation check and unit test suite before declaring completion:

   ```bash
   node --check app.js db.js util.js calendar.js config.js docs.js fittings.js moodboard.js tests/pure-modules.test.cjs
   node --test tests/pure-modules.test.cjs
   ```
