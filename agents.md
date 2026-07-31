# AGENTS.MD: CODEBASE NAVIGATION MAP

## 🗺️ Architectural Topology
Vanilla JS Single Page Application (SPA) with a Supabase backend. Logic is heavily modularized into client-side JS files controlling DOM events, with a unified data access layer connected to PostgREST.

Read `ARCHITECTURE.md` for the dependency graph, module boundaries, and the
task-to-file entry map. Treat `PLAN-*.md` as historical implementation records,
not the current architecture source of truth.

## 🔍 Directory Blueprint & Intent
- `/`: Root directory. Contains all core HTML, CSS, and modular Vanilla JS logic files serving the single-page application.
- `/assets`: Static media, icons, and branding assets used across the interface.
- `/supabase`: Backend configuration, Edge Functions (e.g., Google Calendar/Drive sync), and database migrations.
- `/.agents`: AI subagent configurations, custom skills, and behavioral rules.

## 🎯 Modification Matrix (Where to adjust what)
- **Goal:** To add or modify external API integrations or third-party webhooks. -> **Look here:** `db.js`, `/supabase/functions/`
- **Goal:** To update database schemas, migrations, or data validation logic. -> **Look here:** `schema.sql`, `db.js`
- **Goal:** To adjust authentication guards, route protections, or user permissions. -> **Look here:** `app.js`, `db.js`, `config.js`
- **Goal:** To tweak shared utility functions, date formatters, or math helpers. -> **Look here:** `util.js`, `calendar.js`
- **Goal:** To alter complex frontend UI rendering, event listeners, or component state. -> **Look here:** `app.js`, `fittings.js`, `docs.js`, `moodboard.js`
- **Goal:** To update color schemes, typography, layout structures, and global variables. -> **Look here:** `/styles`, `fonts.css`
