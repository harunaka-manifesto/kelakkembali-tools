# AGENTS.md — read this first, read it whole, read nothing else yet

Kelak Kembali studio tool. Zero build step. Static files + 4 CDN scripts, deployed as-is.
Vanilla JS SPA (`window.KK` globals, no modules, no bundler) + Supabase PostgREST + 3 Deno Edge Functions.

**Stack:** HTML/CSS/ES2020 browser JS · Supabase (Postgres + Auth + Edge Functions) · html2canvas + jsPDF + heic2any + supabase-js from CDN · Node only for `node --check` / `node --test`.

---

## 1. Reading protocol — follow in order, stop as soon as you can act

1. Read this file. (done)
2. Open [docs/FEATURES.md](docs/FEATURES.md). Find the one row matching the task. It names every file, function, view id, CSS prefix, table, and edge action you need.
3. Open the map for each named file **before** the file itself:
   - `app.js` → [docs/MAP-app.md](docs/MAP-app.md) (line-range regions + function index)
   - `index.html`, `styles/*.css` → [docs/MAP-html-css.md](docs/MAP-html-css.md)
   - `db.js`, `schema.sql`, `supabase/functions/*` → [docs/DATABASE.md](docs/DATABASE.md)
   - `util.js`, `calendar.js`, `docs.js`, `fittings.js`, `fitting-pdf.js`, `moodboard.js` → [docs/MODULES.md](docs/MODULES.md)
4. Read only the line ranges the map gives you.
5. Read [docs/CONVENTIONS.md](docs/CONVENTIONS.md) before writing your first line.

Target: **1 feature map + 1 file map + 2 ranged reads.** If you have opened more than 4 files before editing, you skipped a map.

## 2. Reading budgets — hard limits

| Rule | Limit |
| :--- | :--- |
| Never read whole | `app.js` (6460 lines), `index.html` (1743), `README.md` (958), `schema.sql` (1143), `styles/pages.css` (3319), `styles/shared.css` (2277), `fonts.css` |
| Ranged read from `app.js` | ≤400 lines per call; use `offset`/`limit` from [docs/MAP-app.md](docs/MAP-app.md) |
| Whole-file reads allowed | `util.js`, `calendar.js`, `config.js`, `docs.js`, `fitting-pdf.js`, `db.js` (482 lines, prefer ranged) |
| Never read unless the task is literally about them | `plans/`, `PLAN-*.md`, `MOODBOARD-BUILD.md`, `.agents/`, `.claude/worktrees/`, `assets/`, `fonts.css` |
| `README.md` | Seek by heading via [docs/README-INDEX.md](docs/README-INDEX.md). Never read start-to-finish. |

`.claude/worktrees/` holds a stale duplicate of the entire repo. Never read it. Never grep into it. Exclude it from every search.

## 3. Search strategy — in this order, stop at first hit

1. [docs/FEATURES.md](docs/FEATURES.md) — feature-to-file lookup.
2. [docs/MAP-app.md](docs/MAP-app.md) function index — exact line for any `app.js` symbol.
3. [docs/DATABASE.md](docs/DATABASE.md) — data contract before reading any query.
4. `grep -n "function NAME" file.js` — single named file, never a directory.
5. Repo grep — **last resort only**, and always scoped:

```bash
grep -rn "PATTERN" --include="*.js" --include="*.html" --include="*.css" --exclude-dir=.claude --exclude-dir=.agents --exclude-dir=node_modules .
```

Never run recursive directory listings or unscoped `grep -r`.

## 4. Edit protocol & budgets

- Default: **≤3 files** per task. Most changes are `app.js` + `index.html` + one CSS file.
- At 4–5 files: state why in one sentence, then proceed.
- Over 5 files: stop. Explain the architectural reason and get approval before touching anything.
- Prefer `Edit` on a known line range over rewriting a file. Never `Write` over `app.js`, `index.html`, `schema.sql`, or any `styles/*.css`.
- New DOM goes in `index.html` next to its sibling view; new CSS goes at the end of the matching section banner in the matching file — never invent a new stylesheet.
- `schema.sql` is append-only: add an idempotent migration block at the bottom with a quoted title, and add that title to the navigation list at the top. Never edit an applied block.

## 5. Architectural invariants — do not violate

1. `db.js` is the **only** module that touches Supabase or invokes an Edge Function. No `createClient`, `.from(`, or `functions.invoke` anywhere else. (`config.js` holds the project URL as a string — that is the one allowed mention.)
2. `app.js` is the composition root — the only module that owns the router, global state, and DOM event wiring.
3. `util.js` and `calendar.js` are **pure**: no DOM writes, no network, no upward `window.KK` calls. They are unit-tested.
4. `fitting-pdf.js` is pure geometry: no database, no Drive, no toast, no save. `app.js` resolves images and owns the save.
5. `docs.js` never reaches the database; it receives an order object and renders.
6. Load order in `index.html` is a dependency graph, not a preference. Lower modules never reference higher ones.
7. Every view lives in `index.html` and is toggled by `hidden` — no client-side template strings for page shells.
8. `config.js` holds public values only. The shared password is never in the repo.

## 6. Validation gate — run before declaring done

```bash
node --check app.js && node --check db.js && node --check util.js && node --check calendar.js && node --check config.js && node --check docs.js && node --check fittings.js && node --check fitting-pdf.js && node --check moodboard.js && node --test tests/pure-modules.test.cjs
```

Local preview:

```bash
python3 -m http.server 5173
```

## 7. Forbidden modifications

- No build step, bundler, framework, `package.json`, or npm dependency. Zero-build is the deployment contract.
- No ES module syntax (`import`/`export`) in browser files. `window.KK.*` only.
- No renaming files, exported names, view ids, or CSS class prefixes — the maps in `docs/` index them by name.
- No edits to `index.html` blocks marked `locked spec` (quotation, invoice, moodboard documents) without an explicit request; they are 1:1 with Figma.
- No changes to `.agents/`, `.claude/`, `.codex-plugins/`, `plans/`.
- No secret, key, or password committed.

## 8. Repository map

| Path | Purpose | Agent action |
| :--- | :--- | :--- |
| `index.html` | All view markup, overlays, locked PDF templates | Ranged edit via map |
| `app.js` | Composition root: router, state, all page controllers | Ranged edit via map |
| `db.js` | Sole Supabase + Edge Function gateway | Read/edit whole |
| `util.js` `calendar.js` | Pure helpers, pure schedule math | Read/edit whole; tested |
| `docs.js` `moodboard.js` `fittings.js` `fitting-pdf.js` | Feature modules, one domain each | Read/edit whole |
| `config.js` | Supabase URL / anon key / shared email | Rarely touched |
| `schema.sql` | Postgres schema, append-only migrations | Append only |
| `styles/` | `pages.css` `shared.css` `documents.css` `moodboard.css` | Ranged edit via map |
| `fonts.css` | Base64 font faces, 85 KB | Never read |
| `supabase/functions/` | `intake`, `google-calendar`, `google-drive` Deno handlers | Read when the task is server-side |
| `tests/pure-modules.test.cjs` | Node unit tests for pure modules | Extend when changing pure logic |
| `assets/` | Static media | Never read |
| `docs/` | Agent navigation maps — this system | Read first |
| `plans/` `PLAN-*.md` `MOODBOARD-BUILD.md` | Historical records, **not** current truth | Never read |
| `.claude/worktrees/` | Stale full-repo duplicate | Never read, exclude from grep |

Dependency direction is strictly one-way, bottom to top:

```
config.js → util.js → {docs, moodboard, fittings, fitting-pdf} → db.js → calendar.js → app.js
```

## 9. Coding conventions (summary — full text in docs/CONVENTIONS.md)

- IIFE per file, single `window.KK.<name>` export object at the bottom.
- Named `function` declarations for anything reused; arrows for one-liners.
- All user-facing strings go through `escapeHtml` before entering `innerHTML`.
- Money via `formatRupiah`, dates via `formatLongDate` / `todayISO` / `jakartaDateISO` — never ad-hoc.
- Comments explain *why*, in prose, not *what*. Match the surrounding density.
- Two-space indent, semicolons; match the quote style of the file you are already in.

---

Deeper context, only when the maps are insufficient: [ARCHITECTURE.md](ARCHITECTURE.md) for the rationale layer.
