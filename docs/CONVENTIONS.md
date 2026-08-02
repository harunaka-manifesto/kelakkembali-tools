# CONVENTIONS

Read before writing the first line. Everything here is enforced by existing code — match it rather than improving on it.

---

## Language & module form

- Browser ES2020. No `import`/`export`, no bundler, no transpiler, no `package.json`, no npm dependency. **The zero-build property is the deployment contract.**
- One IIFE per file. One `window.KK.<name>` object assigned at the bottom. Nothing else leaks to `window`.
- Third-party code comes from the four pinned CDN tags in `index.html` (1600–1603). Do not add a fifth without an explicit request.
- Named `function` declarations for anything called more than once or referenced by the maps in `docs/`. Arrow consts for one-line helpers only.
- Two-space indent, semicolons, no trailing commas in call args. Match the quote style of the file you are already in (`app.js` double, `db.js` and edge functions single).

## Naming

- Views: `#viewXxx` in `index.html`, `showXxx` entry function in `app.js`, `renderXxx` for pure render steps, `cleanupXxx` for teardown.
- CSS: one prefix per feature (`.fitlog-`, `.fitdet-`, `.fitedit-`, `.cust`, `.order`). Never introduce a second prefix for the same page.
- DB columns: `snake_case`. JS locals: `camelCase`. Records from PostgREST keep their snake_case keys — do not remap.
- Never rename an exported symbol, view id, or class prefix. The `docs/` maps index them by name.

## Safety rules

- **Every** interpolated value entering `innerHTML` goes through `util.escapeHtml`. No exceptions, including values that "come from the database" — they came from a user.
- Money always through `util.formatRupiah`; never `toLocaleString` inline.
- Dates always through `util.formatLongDate` / `formatShortDate` / `todayISO` / `jakartaDateISO`. Never `new Date(str)` on an ISO day string — it rolls timezones. `calendar.js` `toDay`/`fromDay` exist for arithmetic.
- Filenames through `util.sanitizeForFilename`.
- No secret, key, or password in the repo. `config.js` holds public values only.

## Async & error handling

- Every `db.*` call is async and throws. Wrap user-triggered calls and surface failure with `showToast`; route-level failure goes through `showRouteError` (558).
- Long loads use the load-token pattern: `beginXLoad()` returns a token, `isCurrentXLoad(token)` guards the render. Copy it (`beginOrderLoad` 3328, `beginHomepageLoad` 1215) rather than inventing a new one.
- Stale auth tokens: check `db.isStaleToken(err)` and refresh before failing.

## Comments

The codebase comments *why*, in full prose, above the block. It does not narrate *what* the next line does. Match the surrounding density — heavy in `index.html` and `schema.sql`, lighter in render helpers. Do not strip existing comments; they carry the design rationale that is nowhere else.

## Adding things — checklists

**A route:** segment case in `handleRoute` (789–839) → `showXxx` in the matching region → `<section class="view" id="viewXxx" hidden>` in `index.html` → element handles at 45–258 → state at 259–349 if needed → CSS section in `pages.css` → row in [FEATURES.md](FEATURES.md) and [MAP-app.md](MAP-app.md).

**A control:** markup in the view → handle in the element registry → listener block in `bindEvents` (4960) → styles at the end of the matching CSS section.

**A schema change:** append an idempotent migration block to the bottom of `schema.sql` with a quoted title → add that title to the navigation list at lines 8–18 → add the `db.js` method → update [DATABASE.md](DATABASE.md).

**A pure helper:** put it in `util.js` or `calendar.js`, export it, and add a test to `tests/pure-modules.test.cjs`.

## Validation gate

Run before declaring done:

```bash
node --check app.js && node --check db.js && node --check util.js && node --check calendar.js && node --check config.js && node --check docs.js && node --check fittings.js && node --check fitting-pdf.js && node --check moodboard.js && node --test tests/pure-modules.test.cjs
```

Serve locally:

```bash
python3 -m http.server 5173
```

`tests/pure-modules.test.cjs` covers `util.js`, `calendar.js`, `moodboard.js`, and the `db.js` feed-query normalizers. It also asserts that **no shipped source still names the retired "Body measurements" stage** — a grep-based guard. Adding a retired vocabulary word anywhere will fail the suite.

## Doc maintenance — required, not optional

Line numbers in `docs/MAP-app.md` and `docs/MAP-html-css.md` drift when you insert code. After any edit that shifts more than ~20 lines in `app.js` or `index.html`, update the affected rows. A stale map costs the next agent more than it saved you.

Also update:
- [FEATURES.md](FEATURES.md) when adding or moving a feature
- [DATABASE.md](DATABASE.md) when changing schema or `db.js`
- [MODULES.md](MODULES.md) when changing a module's export surface
- `AGENTS.md` §6 when adding a file to the check list

## Forbidden

- Build tooling, frameworks, npm.
- ES modules in browser files.
- Supabase or Edge Function calls outside `db.js`.
- DOM or network access in `util.js`, `calendar.js`, `fitting-pdf.js`.
- Database access in `docs.js`.
- Editing `index.html` locked-spec blocks (1412–1599) without an explicit request.
- Editing `.agents/`, `.claude/`, `.codex-plugins/`, `plans/`.
- Rewriting an applied `schema.sql` migration block.
