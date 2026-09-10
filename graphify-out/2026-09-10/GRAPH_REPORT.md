# Graph Report - kelakkembali-tools  (2026-08-06)

## Corpus Check
- 71 files · ~161,014 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1360 nodes · 2200 edges · 77 communities (75 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a05e1b2c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.js
- moodboard.js
- 3. Function index — symbol → line
- Homepage Figma `37:54` — Implementation Handoff
- Add Fitting Photos — Implementation Handoff
- showToast
- renderDocumentPicker
- DESIGN-SYSTEM — visual language, tokens, and the tactile contract
- Fitting Log Session Detail — Implementation Plan
- Homepage Revamp Plan
- fittings.js
- bindEvents
- renderFittingPhotoAdd
- handleRoute
- Independent One-Per-Stage Fitting Logs
- Features 2 & 3 — Quotations and invoices, one page parameterised by `kind`
- compress.py
- showOrderDetail
- KELAK KEMBALI — Master UI/UX Design Styleguide & Token System
- Homepage Search Experience Plan
- Kelak Kembali — Wedding Quotation & Invoice Generator
- validate.py
- caveman-compress/README.md
- FEATURES — one row per feature, everything you need to touch it
- google-calendar/index.ts
- 1. Tables — column contract
- showDocuments
- calendar.js
- google-drive/index.ts
- util.js
- saveCustomer
- cavecrew/SKILL.md
- Caveman Help
- setupMoodboardListeners
- docs.js
- styles/ — actual load order
- Customer Detail Page Revamp - Specification & Execution Plan
- Caveman Compress
- .agents/skills/caveman/SKILL.md
- db.js
- fitting-pdf.js
- AGENTS.md — read this first, read it whole, read nothing else yet
- caveman-commit
- caveman-review
- Moodboard Generator — Build Summary
- 14. Suggested task breakdown / build order
- Moodboard Canvas Revamp
- intake/index.ts
- CONVENTIONS
- Homepage Time Field — specification
- Fitting Logs Implementation Plan
- Order Detail Page Revamp — Implementation Plan
- MODULES — ownership & export surface
- 5. Component breakdown and Figma specification
- 9. Empty, loading, error, and pagination states
- 4. Figma anatomy and implementation geometry
- caveman-stats
- 9. JavaScript plan for `app.js`
- Tasks — schedules calendar, quotations list, invoices list
- exportMoodboard
- Architecture & Codebase Map
- 6. Search logic & lazy-loading/pagination
- 12. File-by-file implementation sequence
- 5. Stable state architecture
- caveman/skills/caveman/SKILL.md
- 3. Data model & API/read-model contract
- 4. Routing & navigation
- 13. Verification plan
- 8. CSS plan for `styles.css`
- vercel.json
- 3. Current implementation inventory
- 1. Overview & goals
- __init__.py
- README-INDEX — seek, do not read

## God Nodes (most connected - your core abstractions)
1. `bindEvents()` - 55 edges
2. `handleRoute()` - 50 edges
3. `3. Function index — symbol → line` - 42 edges
4. `showToast()` - 35 edges
5. `Homepage Figma `37:54` — Implementation Handoff` - 23 edges
6. `FEATURES — one row per feature, everything you need to touch it` - 22 edges
7. `renderFittingPhotoAdd()` - 20 edges
8. `setDirty()` - 19 edges
9. `Add Fitting Photos — Implementation Handoff` - 19 edges
10. `Homepage Revamp Plan` - 19 edges

## Surprising Connections (you probably didn't know these)
- `mosaic()` --references--> `VARIATIONS`  [EXTRACTED]
  moodboard.js → tests/pure-modules.test.cjs
- `setVariation()` --references--> `VARIATIONS`  [EXTRACTED]
  moodboard.js → tests/pure-modules.test.cjs
- `compress_file()` --calls--> `validate()`  [EXTRACTED]
  .agents/skills/caveman-compress/scripts/compress.py → .agents/skills/caveman-compress/scripts/validate.py
- `benchmark_pair()` --calls--> `validate()`  [EXTRACTED]
  .agents/skills/caveman-compress/scripts/benchmark.py → .agents/skills/caveman-compress/scripts/validate.py
- `main()` --calls--> `backup_dir_for()`  [EXTRACTED]
  .agents/skills/caveman-compress/scripts/cli.py → .agents/skills/caveman-compress/scripts/compress.py

## Import Cycles
- None detected.

## Communities (77 total, 2 thin omitted)

### Community 0 - "app.js"
Cohesion: 0.08
Nodes (47): alignDocumentSearch(), alignFittingSearch(), alignLedgerSearch(), announceFittingStatus(), cleanupFittingLogs(), custNextEvent(), custOrderStatus(), effectiveStatus() (+39 more)

### Community 1 - "moodboard.js"
Cohesion: 0.08
Nodes (42): addFiles(), applyStageGeometry(), bandCandidate(), bandPartitions(), buildWatermark(), cacheImage(), candidateScore(), cleanup() (+34 more)

### Community 2 - "3. Function index — symbol → line"
Cohesion: 0.04
Nodes (47): 1. Region table — pick one, read only its range, 2. Routes → handler, 3. Function index — symbol → line, 4. Coupling notes (read before a broad refactor), Active-session actions, Add fitting photos, Boot & Event Listeners, Calendar rendering (+39 more)

### Community 3 - "Homepage Figma `37:54` — Implementation Handoff"
Cohesion: 0.04
Nodes (44): 10. Shortcut buttons and appear animation, 11. Conditional submissions bar, 12. Inline search, 13. Exact customer ledger/grid, 14. Customer card pressed state, 15. Footer and page shell, 16. CSS cleanup, 17. JavaScript cleanup checklist (+36 more)

### Community 4 - "Add Fitting Photos — Implementation Handoff"
Cohesion: 0.05
Nodes (42): 10. Drive backup handoff, 11. Save orchestration, 12. Router and lifecycle integration, 13. Loading, layout stability, and interaction choreography, 14. Visual and accessibility acceptance, 15. Failure and edge-case matrix, 16. Validation plan, 17. Documentation completion (+34 more)

### Community 5 - "showToast"
Cohesion: 0.10
Nodes (41): acceptEnquiry(), addCustomInclude(), addFittingDetailPhoto(), announceDetailStatus(), applyAddBackupResult(), blobToDataUrl(), cleanupFittingEditor(), clearStagedReplacement() (+33 more)

### Community 6 - "renderDocumentPicker"
Cohesion: 0.06
Nodes (38): advancedStatus(), announceDocumentPickerStatus(), backToDocumentCustomers(), beginHomepageLoad(), buildHomepageAtmosphereScene(), clearHomepagePops(), clearHomepagePresses(), closeDocumentPicker() (+30 more)

### Community 7 - "DESIGN-SYSTEM — visual language, tokens, and the tactile contract"
Cohesion: 0.05
Nodes (38): 0. The one-paragraph brief, 10. Accessibility — enforced, not optional, 11. Icons and assets, 12. Checklist for a new ledger-canvas page, 13. Known drift — do not propagate, 1. Three surfaces, three rulebooks, 2.1 Ledger canvas — shipping in `pages.css:5`, 2.2 The shadow pair — mandatory (+30 more)

### Community 8 - "Fitting Log Session Detail — Implementation Plan"
Cohesion: 0.05
Nodes (36): 10. Tests and acceptance scenarios, 11. Completion criteria, 1. Goal and agreed behavior, 2. Scope boundaries, 3. Routes and navigation state, 4. Detail page design and behavior, 5. Dedicated photo editor, 6. Data and module interfaces (+28 more)

### Community 9 - "Homepage Revamp Plan"
Cohesion: 0.05
Nodes (36): 10. Footer, 11. Microinteractions & Microanimations, 11a. Hero Content — Staggered Entrance, 11b. Customer Cards — Press Feedback, 11c. Menu Grid Cells — Tap Dimple, 11d. Alert Bar — Slide-In on Appear, 11e. Search Bar — Focus Lift, 11f. Card Stack — Staggered Entrance (+28 more)

### Community 10 - "fittings.js"
Cohesion: 0.13
Nodes (33): archivePhoto(), base64(), cancelStagePicker(), captureFromVideo(), chooseFromGallery(), clearPending(), closeCamera(), closeCaptionStep() (+25 more)

### Community 11 - "bindEvents"
Cohesion: 0.11
Nodes (33): addCalcRow(), addItemRow(), addTermRow(), announceSchedulesStatus(), applyCostCalc(), bindEvents(), buildTerms(), closeCostCalc() (+25 more)

### Community 12 - "renderFittingPhotoAdd"
Cohesion: 0.11
Nodes (33): addCaptionFor(), addDirty(), addPhotosFromReview(), addPhotosPicked(), addSavedCaptionForKey(), admitAddFiles(), announceAddStatus(), captureAddFocus() (+25 more)

### Community 13 - "handleRoute"
Cohesion: 0.09
Nodes (33): beginRouteLoader(), beginSchedulesLoad(), buildScheduleItems(), cleanupFittingDetail(), cleanupHomepageAtmosphere(), cleanupSchedules(), closeFittingPhotoViewer(), closeMenu() (+25 more)

### Community 14 - "Independent One-Per-Stage Fitting Logs"
Cohesion: 0.06
Nodes (32): 10. Documentation Updates, 11. Migration and Rollout Order, 12. Test and Acceptance Matrix, 13. Completion Criteria, 1. Goal and Final Product Model, 2. Database and Data Migration, 3. Order Detail: Schedules as Fitting Stages, 4. Starting and Saving Logs (+24 more)

### Community 15 - "Features 2 & 3 — Quotations and invoices, one page parameterised by `kind`"
Cohesion: 0.06
Nodes (32): 1.10 Light the entry points, 1.1 `db.js` — three small reads, 1.2 `calendar.js` — pure month/span math, 1.3 `tests/pure-modules.test.cjs`, 1.4 `index.html` — `#viewSchedules`, 1.5 Month grid render — per-cell strips, not absolute bars, 1.6 `app.js` — registry, state, region, 1.7 Accessibility — real grid semantics (+24 more)

### Community 16 - "compress.py"
Cohesion: 0.12
Nodes (27): main(), print_usage(), backup_dir_for(), build_compress_prompt(), build_fix_prompt(), call_claude(), compress_file(), is_sensitive_path() (+19 more)

### Community 17 - "showOrderDetail"
Cohesion: 0.10
Nodes (31): beginOrderLoad(), buildOrderDetailViewModel(), bumpStatus(), clearOrderPresses(), closeOrderPaymentChooser(), deriveLoggedDeposits(), documentReadiness(), downloadDocument() (+23 more)

### Community 18 - "KELAK KEMBALI — Master UI/UX Design Styleguide & Token System"
Cohesion: 0.07
Nodes (29): 1. Design Philosophy & Visual Identity, 2.1 Color Palette Tokens, 2.2 Typography System, 2.3 Spacing & Grid System, 2.4 Motion & Animation Tokens, 2. Design Tokens, 3.1 Anatomy of a Tactile Control, 3.2 Rail Depth Matrix (+21 more)

### Community 19 - "Homepage Search Experience Plan"
Cohesion: 0.07
Nodes (28): 1. Idle, 2. Opening, 3. Editing, 4. Submitting, 5. Cancelling, Acceptance criteria, Accessibility, Accessibility and desktop (+20 more)

### Community 20 - "Kelak Kembali — Wedding Quotation & Invoice Generator"
Cohesion: 0.07
Nodes (28): A note on rendered font weight, Assets, Business rules, Customer intake (Tally), Deploying to Vercel, Exports, Fitting log, Full-screen overlay (+20 more)

### Community 21 - "validate.py"
Cohesion: 0.16
Nodes (22): benchmark_pair(), count_tokens(), main(), print_table(), Path, count_bullets(), extract_code_blocks(), extract_headings() (+14 more)

### Community 22 - "caveman-compress/README.md"
Cohesion: 0.09
Nodes (20): Before / After, Benchmarks, How It Work, <img src="../../docs/assets/dancing-rock.svg" width="20" height="20" alt="rock"/> Caveman (285 tokens), Install, 📄 Original (706 tokens), Part of Caveman, Security (+12 more)

### Community 23 - "FEATURES — one row per feature, everything you need to touch it"
Cohesion: 0.09
Nodes (22): 10. Fitting photo editor, 11. Add fitting photos (batch review), 12. Fitting journal & camera, 13. Moodboard, 14. Quotation & invoice documents, 15. Intake / enquiry review, 16. Google Calendar, 17. Auth gate & boot (+14 more)

### Community 24 - "google-calendar/index.ts"
Cohesion: 0.21
Nodes (20): accessToken(), callCalendar(), CORS, DESIGN_STAGES, disconnect(), eventTitle(), exchange(), FOLLOW_UP_REMINDERS (+12 more)

### Community 25 - "1. Tables — column contract"
Cohesion: 0.10
Nodes (21): 1. Tables — column contract, 2. Security model, 3. Editing schema.sql, 4. `db.js` API index — method → line, 5. Edge Functions — `supabase/functions/`, `customers`, DATABASE — data contract, `document_log` (+13 more)

### Community 26 - "showDocuments"
Cohesion: 0.15
Nodes (19): announceDocumentStatus(), cleanupDocuments(), documentBlockHtml(), documentCardHtml(), documentEmptyHtml(), documentPanelHtml(), documentRequestArgs(), documentSkeletonHtml() (+11 more)

### Community 27 - "calendar.js"
Cohesion: 0.25
Nodes (16): addMonths(), assignLanes(), computeDesign(), computeProduction(), computeSchedule(), daysBetween(), eventSpan(), fromDay() (+8 more)

### Community 28 - "google-drive/index.ts"
Cohesion: 0.24
Nodes (15): accessToken(), CORS, driveRequest(), findOrCreateFolder(), folderSegment(), getFittingPhoto(), json(), readCredential() (+7 more)

### Community 29 - "util.js"
Cohesion: 0.16
Nodes (5): digitsOnly(), formatLongDate(), formatShortDate(), groupDigits(), reformatPriceField()

### Community 30 - "saveCustomer"
Cohesion: 0.19
Nodes (15): cancelCustomer(), consultNudgeFor(), customerStatus(), fillCustomerForm(), followUpPatch(), lastDayOfMonth(), pushFollowUp(), recordMoodboardExport() (+7 more)

### Community 31 - "cavecrew/SKILL.md"
Cohesion: 0.14
Nodes (12): cavecrew, Example chaining, How to invoke, Model overrides, See also, What it does, Auto-clarity (inherited), Chaining patterns (+4 more)

### Community 32 - "Caveman Help"
Cohesion: 0.14
Nodes (12): caveman-help, Example output, How to invoke, See also, What it does, Caveman Help, Configure Default Mode, Deactivate (+4 more)

### Community 33 - "setupMoodboardListeners"
Cohesion: 0.22
Nodes (14): addMoodboardFiles(), applyMoodboardTransform(), bindMoodboardOverlayGestures(), clampMoodboardPan(), closeMoodboardOverlay(), fitMoodboardBoard(), handleMoodboardOverlayKey(), moodboardStageClone() (+6 more)

### Community 34 - "docs.js"
Cohesion: 0.26
Nodes (12): cloneReady(), computeTotal(), createWatermarkPattern(), download(), ensureFontsLoaded(), ensureImagesLoaded(), itemRowsHtml(), pdfFilename() (+4 more)

### Community 35 - "styles/ — actual load order"
Cohesion: 0.14
Nodes (14): Class-prefix → feature, index.html (1907 lines), Locked PDF templates — do not edit without explicit request, MAP — index.html & styles/, Overlays & bars — id → line, Script load order (1733–1741) — this is the dependency graph, styles/ — actual load order, styles/documents.css (473 lines) (+6 more)

### Community 36 - "Customer Detail Page Revamp - Specification & Execution Plan"
Cohesion: 0.14
Nodes (13): 1.1 Page Routing & Views, 1.2 Interactive Behavior & Visual Tokens, 📋 1. Requirements & Architecture Summary, 🎨 2. Design Tokens & Color Palette, 🧱 3. HTML Markup Specification (`index.html`), 🎨 4. CSS Rules & Styling Specification (`styles.css`), 5.1 Route Mapping Update, 5.2 Press State Event Handling (+5 more)

### Community 37 - "Caveman Compress"
Cohesion: 0.17
Nodes (11): Boundaries, Caveman Compress, Compress, Compression Rules, Pattern, Preserve EXACTLY (never modify), Preserve Structure, Process (+3 more)

### Community 38 - ".agents/skills/caveman/SKILL.md"
Cohesion: 0.17
Nodes (10): caveman, Example output, How to invoke, See also, What it does, Auto-Clarity, Boundaries, Intensity (+2 more)

### Community 39 - "db.js"
Cohesion: 0.23
Nodes (5): callDrive(), callGoogle(), init(), isConfigured(), rememberPreference()

### Community 40 - "fitting-pdf.js"
Cohesion: 0.33
Nodes (10): captionLinesFor(), captionPageCapacity(), fitContain(), generate(), loadLogo(), paintCaptionBlock(), paintCover(), paintFooter() (+2 more)

### Community 42 - "AGENTS.md — read this first, read it whole, read nothing else yet"
Cohesion: 0.18
Nodes (11): 1. Reading protocol — follow in order, stop as soon as you can act, 2. Reading budgets — hard limits, 3. Search strategy — in this order, stop at first hit, 4. Edit protocol & budgets, 5. Architectural invariants — do not violate, 6. Validation gate — run before declaring done, 7. Forbidden modifications, 8. Repository map (+3 more)

### Community 43 - "caveman-commit"
Cohesion: 0.18
Nodes (9): caveman-commit, Example output, How to invoke, See also, What it does, Auto-Clarity, Boundaries, Examples (+1 more)

### Community 44 - "caveman-review"
Cohesion: 0.18
Nodes (9): caveman-review, Example output, How to invoke, See also, What it does, Auto-Clarity, Boundaries, Examples (+1 more)

### Community 45 - "Moodboard Generator — Build Summary"
Cohesion: 0.18
Nodes (10): Architecture, Browser image cache (`moodboard.js`), Canvas and overlay (`app.js`, `styles/moodboard.css`), Current product flow, Database additions, Deployment, Layout engine (`moodboard.js`), Moodboard Generator — Build Summary (+2 more)

### Community 46 - "14. Suggested task breakdown / build order"
Cohesion: 0.18
Nodes (11): 14. Suggested task breakdown / build order, Task 10 — Verification and handoff, Task 1 — Add and verify the database read model, Task 2 — Add the `db.js` feed API, Task 3 — Build the static route shell, Task 4 — Match Figma styling, Task 5 — Implement page state, search, and filters, Task 6 — Implement cursor infinite scroll (+3 more)

### Community 47 - "Moodboard Canvas Revamp"
Cohesion: 0.18
Nodes (10): Assumptions, Full-screen moodboard overlay, Generated canvas experience, Implementation Changes, Interfaces and Documentation, Moodboard Canvas Revamp, Orientation and layout engine, PDF, tracking, and Drive (+2 more)

### Community 48 - "intake/index.ts"
Cohesion: 0.25
Nodes (9): CORS, extract(), Field, looksLikeDate(), MATCHERS, monthToLastDay(), readable(), safeEqual() (+1 more)

### Community 49 - "CONVENTIONS"
Cohesion: 0.20
Nodes (10): Adding things — checklists, Async & error handling, Comments, CONVENTIONS, Doc maintenance — required, not optional, Forbidden, Language & module form, Naming (+2 more)

### Community 50 - "Homepage Time Field — specification"
Cohesion: 0.20
Nodes (9): 1. What it is, 2. The five fields, 3. The pixel grid, 4. The contrast band, 5. Phase tokens, 6. What must not happen, Homepage Time Field — specification, Measured, not assumed (+1 more)

### Community 51 - "Fitting Logs Implementation Plan"
Cohesion: 0.20
Nodes (9): 10. Responsive/mobile behavior notes, 11. Accessibility notes, 12. Edge cases, 13. Open questions & recorded assumptions, 15. Final acceptance checklist, 2. Existing architecture and implementation boundaries, 7. Stage filter logic and interaction with search, 8. “New” button behavior (+1 more)

### Community 52 - "Order Detail Page Revamp — Implementation Plan"
Cohesion: 0.20
Nodes (9): 10. Accessibility requirements, 11. Navigation contract, 14. Definition of done, 15. Explicit non-goals, 1. Confirmed product decisions, 2. Desired outcome, 6. Normalized order-detail view model, 7. DOM plan for `index.html` (+1 more)

### Community 53 - "MODULES — ownership & export surface"
Cohesion: 0.25
Nodes (8): Adding a module (rare), calendar.js — `KK.cal` (read whole, 460 lines; tested), docs.js — `KK.docs` (read whole, 353 lines), fitting-pdf.js — `KK.fittingPdf` (read whole, 290 lines), fittings.js — `KK.fittings` (731 lines), MODULES — ownership & export surface, moodboard.js — `KK.moodboard` (724 lines), util.js — `KK.util` (read whole, 214 lines; tested)

### Community 54 - "5. Component breakdown and Figma specification"
Cohesion: 0.25
Nodes (8): 5.1 Page canvas, 5.2 Sticky navigation, 5.3 Title/header grid, 5.4 Search control, 5.5 Stage filter row, 5.6 Feed and fitting card, 5.7 Footer, 5. Component breakdown and Figma specification

### Community 55 - "9. Empty, loading, error, and pagination states"
Cohesion: 0.25
Nodes (8): 9.1 Initial loading, 9.2 Loading another page, 9.3 No logs exist at all, 9.4 No match, 9.5 Initial request failure, 9.6 Later-page failure, 9.7 Offline and end of feed, 9. Empty, loading, error, and pagination states

### Community 56 - "4. Figma anatomy and implementation geometry"
Cohesion: 0.25
Nodes (8): 4.1 Page canvas, 4.2 Top navigation, 4.3 Title band, 4.4 Items section, 4.5 Payments section, 4.6 Schedules section, 4.7 Pink fitting action and footer, 4. Figma anatomy and implementation geometry

### Community 57 - "caveman-stats"
Cohesion: 0.29
Nodes (5): caveman-stats, Example output, How to invoke, See also, What it does

### Community 58 - "9. JavaScript plan for `app.js`"
Cohesion: 0.29
Nodes (7): 9.1 Body/chrome state, 9.2 New named helpers, 9.3 Event delegation, 9.4 Existing async actions, 9.5 Refactor `refreshHistory()`, 9.6 Schedule and fitting data, 9. JavaScript plan for `app.js`

### Community 59 - "Tasks — schedules calendar, quotations list, invoices list"
Cohesion: 0.29
Nodes (6): Close out, Documents, Left for you, Schedules, Shared, Tasks — schedules calendar, quotations list, invoices list

### Community 60 - "exportMoodboard"
Cohesion: 0.47
Nodes (6): exportMoodboard(), flashMoodboardExportState(), offerGoogleReconnect(), resetMoodboardExports(), setMoodboardExportBusy(), setMoodboardExportState()

### Community 61 - "Architecture & Codebase Map"
Cohesion: 0.33
Nodes (6): Architecture & Codebase Map, Fitting-log route family, How to Work in This Codebase (For Future AI Agents & Developers), Module Boundaries & Ownership Rules, Runtime Map & Dependency Hierarchy, Start Here: Feature Entry-Point Map

### Community 62 - "6. Search logic & lazy-loading/pagination"
Cohesion: 0.33
Nodes (6): 6.1 Search behavior, 6.2 Search focus and keyboard space, 6.3 Feed request state, 6.4 Initial load and invalidation, 6.5 Infinite scrolling, 6. Search logic & lazy-loading/pagination

### Community 63 - "12. File-by-file implementation sequence"
Cohesion: 0.33
Nodes (6): 12. File-by-file implementation sequence, Phase 1 — Markup and assets, Phase 2 — Route state and data normalization, Phase 3 — Ready rendering and retained workflows, Phase 4 — Styling and motion, Phase 5 — Cleanup

### Community 64 - "5. Stable state architecture"
Cohesion: 0.33
Nodes (6): 5.1 Load sequence, 5.2 Race and stale-response protection, 5.3 Loading state, 5.4 Fatal error state, 5.5 Empty and partial data rules, 5. Stable state architecture

### Community 65 - "caveman/skills/caveman/SKILL.md"
Cohesion: 0.40
Nodes (4): Auto-Clarity, Boundaries, Intensity, Rules

### Community 66 - "3. Data model & API/read-model contract"
Cohesion: 0.40
Nodes (5): 3.1 Existing records are the source of truth, 3.2 Stage normalization, 3.3 Flat PostgREST read model, 3.4 `db.js` contract, 3. Data model & API/read-model contract

### Community 67 - "4. Routing & navigation"
Cohesion: 0.40
Nodes (5): 4.1 Route shape, 4.2 Homepage entry, 4.3 Customer entry, 4.4 Browser history and route lifecycle, 4. Routing & navigation

### Community 68 - "13. Verification plan"
Cohesion: 0.40
Nodes (5): 13.1 Static checks, 13.2 Visual checks, 13.3 Functional matrix, 13.4 Data/edge-case fixtures, 13. Verification plan

### Community 69 - "8. CSS plan for `styles.css`"
Cohesion: 0.40
Nodes (5): 8.1 Token mapping, 8.2 Constant-height tactile controls, 8.3 Focus, pointer, and disabled presentation, 8.4 Motion, 8. CSS plan for `styles.css`

### Community 70 - "vercel.json"
Cohesion: 0.40
Nodes (4): buildCommand, framework, outputDirectory, $schema

### Community 71 - "3. Current implementation inventory"
Cohesion: 0.50
Nodes (4): 3.1 Existing route and render flow, 3.2 Existing behavior to reuse, 3.3 Existing markup that will be replaced, 3. Current implementation inventory

### Community 72 - "1. Overview & goals"
Cohesion: 0.67
Nodes (3): 1. Overview & goals, Explicit non-goals, In scope

## Knowledge Gaps
- **628 isolated node(s):** `REMINDERS`, `FOLLOW_UP_REMINDERS`, `CORS`, `CORS`, `CORS` (+623 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MAP — app.js (8507 lines, ~338 KB)` connect `3. Function index — symbol → line` to `FEATURES.md`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `Kelak Kembali — Wedding Quotation & Invoice Generator` connect `Kelak Kembali — Wedding Quotation & Invoice Generator` to `FEATURES.md`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `DATABASE — data contract` connect `1. Tables — column contract` to `FEATURES.md`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Are the 17 inferred relationships involving `bindEvents()` (e.g. with `acceptEnquiry()` and `addCustomInclude()`) actually correct?**
  _`bindEvents()` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `handleRoute()` (e.g. with `bindEvents()` and `showToast()`) actually correct?**
  _`handleRoute()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `showToast()` (e.g. with `fittingDetailBridge()` and `handleRoute()`) actually correct?**
  _`showToast()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `REMINDERS`, `FOLLOW_UP_REMINDERS`, `CORS` to the rest of the system?**
  _628 weakly-connected nodes found - possible documentation gaps or missing edges._