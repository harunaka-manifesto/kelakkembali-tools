# Kelak Kembali — Wedding Quotation & Invoice Generator

A single-page, mobile-first studio workflow for enquiries, customers, orders,
fittings, schedules, moodboards, quotations, and invoices. The generated
documents match the Kelak Kembali designs 1:1.

> **AI agents: do not read this file top to bottom.** It is 950+ lines of design
> rationale. Start at [AGENTS.md](AGENTS.md), then take one row from
> [docs/FEATURES.md](docs/FEATURES.md). Seek into this file by line range using
> [docs/README-INDEX.md](docs/README-INDEX.md) only when you need the *why*
> behind a rule the code does not explain.

Customers and their orders are kept in **Supabase**, behind a shared password.
There is still no build step: the whole thing is static files plus four CDN
scripts, deployed exactly as-is.

```
Customers  →  Customer  →  Order  →  Quotation PDF / Invoice PDF
   list        record       editor
```

## Setting up the database

The app will not start until `config.js` points at a project. One-time setup:

1. Create a project at [supabase.com](https://supabase.com) (the free tier is
   ample — this stores text, not files).
2. **SQL Editor → New query**, paste the whole of [`schema.sql`](schema.sql),
   run it. It creates the tables, the `updated_at` triggers and the row-level
   security policies. It is safe to re-run, and **must** be re-run after
   pulling: every schema change since the first release is appended to the
   bottom of that same file as an idempotent migration block.
3. **Authentication → Users → Add user** → *Create new user*. Use any address
   you own — no mail is ever sent to it — and pick the password the studio will
   share. Tick *Auto Confirm User*. This single account is what the gate signs
   in as.
4. **Project Settings → API**: copy the *Project URL* and the *anon public* key
   into `config.js`, along with the email you just used.

Both values in `config.js` are safe to commit. The anon key is a public
identifier, not a secret — every table denies anonymous callers outright, so the
key opens nothing on its own. **The shared password is the only credential that
matters; it is never stored in the repo.** If it leaks, change it in
Authentication → Users and tell the studio the new one.

## Running locally

Any static file server works — the app needs `http://`, not `file://`, so the
logo PNGs don't taint the export canvas and Supabase's auth session persists.

`serve.ps1` is included so this needs nothing installed: it is stock .NET via
PowerShell, no Node, no Python.

```bash
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Or, if you have Node:

```bash
npx serve -l 4173 .
```

Either way, open <http://localhost:4173>.

## Deploying to Vercel

Import the repo and deploy — no build step. `vercel.json` pins the project to a
plain static deployment (`framework: null`, output directory `.`), so nothing is
auto-detected or compiled.

```bash
npx vercel deploy --prod
```

## How it works

For module boundaries, dependency order, and a task-to-file entry map, start
with [`ARCHITECTURE.md`](ARCHITECTURE.md). This README retains the detailed
business, rendering, and design contracts.

| File | Role |
|---|---|
| `index.html` | The gate, SPA views/overlays, and three off-screen document templates |
| `styles/` | Page, shared UI, document, and moodboard/fitting styles in cascade order |
| `fonts.css` | Plus Jakarta Sans, self-hosted and inlined (see below) |
| `config.js` | Supabase URL, anon key, the shared account's email, Google client ID |
| `util.js` | Formatting, escaping, the seeded-PRNG primitives |
| `docs.js` | The document engine: fills both templates, exports the PDF |
| `moodboard.js` | Browser-local image cache, orientation-aware layout engine, and moodboard PDF renderer |
| `fittings.js` | Photo-first fitting revision log, captions, local previews, and Drive backup |
| `calendar.js` | The fitting schedule: places the appointments, draws the card |
| `db.js` | Every Supabase call — auth and CRUD, nothing else touches the client |
| `app.js` | Routing, views, form state, validation |
| `schema.sql` | The migrations to run in the Supabase SQL editor |
| `supabase/functions/google-calendar/` | Server-side: Google OAuth, fitting and follow-up calendar writes |
| `supabase/functions/google-drive/` | Server-side: archives moodboard PDFs and fitting photos in Google Drive |
| `supabase/functions/intake/` | Server-side: the public Tally webhook, HMAC-verified |
| `serve.ps1` | Local static server, so testing needs nothing installed |
| `assets/` | Logo marks, page icons, and the self-hosted UI font |

They are plain `<script>` files sharing a `window.KK` namespace, not ES
modules — modules would need `http://` even to open the file locally, and the
whole point of this repo is that it has no build and no toolchain.

`docs.js` takes `{ docName, date, items, includes, terms }` and knows nothing
about the database or the views, so the templates stay testable in isolation
and the storage layer can be swapped by rewriting `db.js` alone.

### The data model

See [`schema.sql`](schema.sql):

- **`customers`** — name, phone, Instagram, source, notes, the wedding date and
  how precisely it is known, the date the moodboard went out, the one open
  follow-up, and `cancelled_at`. There is no status column: every status but
  Cancelled is derived from the orders. See *The lifecycle* below.
- **`orders`** — belongs to a customer; carries a status
  (`Quoted` → `Confirmed` → `In production` → `Delivered`), the three payment
  dates, and the `items` and `includes` as `jsonb`. Both are short, always read
  and written whole, and order-sensitive; child tables would buy nothing and
  cost a position column plus two round trips per save. `document_date` is
  still on the table for compatibility but is no longer read or written by the
  app — see *Order status* below.
- **`order_events`** — the schedule, one row per appointment or block: the
  design phase and its deadline from the first payment, the measurements and
  fittings from the production payment and the wedding date. `end_date` is set
  only on the design phase, which is a fortnight rather than a day. `pinned`
  marks an appointment moved by hand in Google, which the calculator then
  treats as a fixed point. Each row remembers the Google event it created,
  which is why the schedule is stored rather than recomputed on read.
- **`document_log`** — one row per PDF actually saved: which kind, when, and
  for how much. No files, just the numbers. Rows are kept verbatim when the
  order is later edited, which is the whole point of having them.
- **`order_history`** — what happened to an order and when: created, updated,
  payment logged, schedule set, calendar synced.
- **`intake_submissions`** — what the public Tally form sent, waiting to be
  read. The whole webhook body is kept in `payload`; the extracted columns are
  a convenience for the review screen. Nothing here is a customer until
  somebody accepts it.
- **`google_credentials`** — one row, the Google refresh token. The only table
  with RLS on and no policies, so nothing the browser holds can read it. See
  *Google Calendar* below.

A quotation and an invoice are two renderings of one order, not two records.
Deleting a customer cascades to their orders, schedule and log rows.

The wedding date lives on the customer rather than the order because a bride
and groom booked together are one wedding and two orders. Each order still gets
its own schedule, because each has its own payments.

### Saving

Saving is explicit. An order editor that autosaved would write on every
keystroke and, worse, would silently rewrite a record you were only glancing
at. **Save** is a full-width button in a bar fixed to the bottom of the screen
— the thumb zone, not the top-right corner — and it reads `Saved` until
something changes. The bar only exists while something is editable: reading a
customer shows no bar at all, and pressing *Edit* brings it up. Leaving a dirty
view — by link, by back button, or by reloading — asks first.

Downloading always saves first. The log is a record of what was sent, so what
was sent has to be what is stored.

### Navigation

Up, not Back. The arrow in the app bar is a fixed link to the record's parent —
labelled with where it lands — so it is one level, every time, however you got
there. `history.back()` replayed pages you had already left: save a new customer
and it walked you straight back into the empty form. A **Home** button sits
beside it wherever Up does not already point at the customer list.

Finishing a form replaces its history entry rather than pushing past it, so the
browser's own Back cannot reopen something you have already completed. Where the
destination is the entry you came from, the app unwinds to it instead of
replacing — two identical adjacent entries would make the first Back press look
broken.

There are no breadcrumbs. Up names the level above and the page title names this
one; a trail could only restate both, and wrapped onto two lines to do it.

### The lifecycle

The app models the job as it actually runs:

> enquiry → consultation → moodboard → quotation → invoice →
> **first payment** → design phase → **second payment** → measurements →
> fittings → **final payment** → wedding

The three payments in bold are the only things that move the work along, and
each one starts something different. Everything before the first is a
conversation on WhatsApp with no timeline attached, which is why nothing lands
in the calendar until money does.

That is two ladders, not one, and they are split at the point where an order
starts to exist. **Neither is something you set.** There is no status control
anywhere in the app — both are read off records that exist anyway, which is both
less work and harder to get wrong than a dropdown someone has to remember to
move.

**Customer status** lives on the customer, because before the quotation there is
no order for it to live on. Shown beside the name and on every homepage card:

| Status | Means |
| --- | --- |
| `In consultation` | No orders yet — still a conversation |
| `Ordering` | At least one order exists |
| `Active` | At least one order has a first payment |
| `Completed` | Every order has its final payment |
| `Cancelled` | They said no — the only one you set |

Read in that order, most decisive first: a cancelled customer stays cancelled
whatever else is true. Creating an order or logging a payment moves the status
on its own; there is nothing to click.

`Completed` used to mean "the wedding date has passed", which filed a customer
away the morning after the day — including the ones still owing a balance, who
are exactly the ones you need to see. It is the final payment now. A wedding
that has been and gone with money still outstanding stays `Active`.

`Cancelled` is the exception because it is the one thing no other record
implies — nothing happens when a couple goes with another studio, so the
absence of events cannot distinguish "lost" from "slow". **Mark as not
proceeding** sits at the foot of the customer page and is offered only while
there is no payment in; after money has landed the honest answer is a
conversation about a refund, not a button. It hides nothing and deletes nothing:
the record stays, and **Reopen this customer** puts them back. Cancelled and
completed customers drop off the homepage deadline strip.

**Order status** is the second ladder. Each event raises a floor and never
lowers one, so re-sending a quotation for an order already in production tells
the record nothing new:

| Event | Status becomes at least |
| --- | --- |
| Quotation PDF downloaded | `Quoted` |
| Invoice PDF downloaded | `Confirmed` |
| First deposit logged | `Confirmed` |
| Production deposit logged | `In production` |
| Final deposit logged | `Delivered` |

The final deposit is asked for before delivery, so logging it is the event that
says the garment went out. That is a better answer than the wedding date, which
only ever said the day arrived.

### The follow-up

One automatic chase, and only while a customer has no order. That is the window
where a conversation can go quiet with nothing noticing; once an order exists
its own dates take over and a second reminder is noise.

- No moodboard sent yet → **Check in**, 3 days after the customer was created.
- Moodboard sent → **Follow up moodboard**, 3 days after that date.

It is recomputed from the moodboard date rather than stamped when you type it,
so recording a moodboard that went out last Tuesday puts the chase where it
actually falls instead of a week late. Both the date and the wording are
editable on the customer form, and an edit sticks — only changing the moodboard
date resets it. Creating an order clears it, and so does cancelling.

### The wedding date

It can be recorded as an exact day or as a month only, toggled on the customer
form. A month is stored as that month's **last day** — the safe direction to be
wrong in, since a schedule built on the earliest possible wedding runs late for
every date after it — and a flag records which of the two it is.

Everywhere it is shown, a month-only date reads as approximate. More
importantly, its fitting schedule is **not** pushed to Google Calendar until an
exact day is confirmed. Every appointment is measured back from the wedding, so
when the wedding is a guess all of them are, and a guess sitting in a real
calendar is worse than a gap: you stop trusting the entries that are right. Both
the Sync button and the Edge Function refuse it.

### Rendering

Each document lives in its own `.stage` container positioned off-screen at its
exact design size (598px wide). Both are re-rendered on every keystroke, so
either button is always one snapshot away from a finished file. On download the
chosen one is snapshotted with **html2canvas** at
3x over a transparent background, composited on top of the generated watermark
field, and placed into a **jsPDF** page that is A4-width (595.28pt) and
*dynamically tall*, so a longer item list simply yields a taller single page —
never a second page, never a clipped one. The page is embedded as JPEG (q0.95):
the grain is un-compressible noise that would push a lossless page past 10 MB.
Both libraries load from jsDelivr; there is no build.

### Why the capture is defended so heavily

html2canvas does not screenshot the live page. It deep-clones the document into
an iframe, lays that out again from scratch, and paints from the clone's
geometry using fonts resolved in *this* document. Anything that makes the clone
lay out differently from what was measured shows up as text drawn at the wrong
positions — glyphs at the right size, spread apart — and as content running off
the bottom of a canvas sized from the pre-clone measurement.

Three things guard against it:

1. **`text-size-adjust: none` on `.q`.** Chrome's mobile text autosizing inflates
   long paragraphs and nothing else — the description, never a table cell — at
   layout time, invisibly to `getComputedStyle`. The page's viewport meta
   suppresses it, but a viewport meta has no effect inside an iframe, so it
   switched back on in the clone. This is what broke the description on a phone
   while desktop, which never boosts, looked perfect.
2. **The font is inlined as a data URI**, so the clone cannot fail or lag on
   fetching it — and the PDF no longer depends on Google Fonts being reachable.
   `onclone` also awaits the clone's own `document.fonts`.
3. **The snapshot is taken 240px taller than measured and then trimmed** back to
   the last row of ink plus the document's 32px padding, with the measured
   height as a floor. If the clone ever does lay out taller, the overflow is
   inside the canvas and is kept instead of being clipped away.

## Moodboard generator

An order’s **Create Moodboard** action accepts 1–16 images. Selection is a
browser-local working session: each file is decoded before use and retained as
an object URL. Files with missing MIME metadata are still tested, and HEIC/HEIF
photos are converted locally to JPEG when the browser cannot display them
natively. Unsupported or corrupt images are skipped. Source images are never
uploaded, and there is no saved draft/edit flow; remaking a moodboard means
selecting the files again.

While selected photos are decoded, the dropzone displays preparation progress.
Files are handled sequentially to avoid simultaneous large-image or HEIC
conversion work on mobile devices.

**Generate Moodboard** opens the generated canvas at
`#/order/:id/moodboard/preview`: a centred column, up to 390px wide, holding the
framed board, **Randomize layout**, **Upload to Drive**, and **Download PDF**.
It does not change the device orientation. Randomize changes both photo order
and layout variation in one press. Browser Back returns to the selection page
with the locally cached photos, their order, and the current orientation
intact. Leaving the moodboard workflow discards the source images.

### Orientation

The frame on the canvas is always 9:16; the moodboard **inside** it is what
rotates. The rotate control switches the document between two exact 16:9
counterparts — landscape `1920 × 1080` and portrait `1080 × 1920`. Either one
fills the frame edge to edge with no letterboxing: a portrait board directly, a
landscape board laid in sideways with a quarter-turn, which the stylist reads by
turning the phone. Every browser-local session starts landscape. Rotating
recalculates geometry only: the photo order and the layout variation both
survive it.

For boards with 2–16 images, every layout keeps its image cells portrait while
filling the entire photo region in both orientations. Landscape partitions the
region into columns of one to four stacked photos; portrait transposes that into
rows of one to four photos side by side. Either way the band measurements are
solved together around a roughly 2:3 cell target, so the mosaic reaches all four
edges with no blank remainder. A one-image board is the sole exception: its
image fills the region full-bleed.

### Full-screen overlay

The composed board is the tap target — individual photos never open on their
own. It opens a full-screen overlay with the close control at the top right.
The board starts fitted and centred and supports gesture-centred pinch zoom,
bounded panning, mouse wheel and drag, double-tap or double-click, and the
keyboard `+`, `-`, and `0` (return to fitted) keys. Zoom is capped at 5×.
Escape closes it, focus is trapped while it is open and restored on dismissal,
background scrolling is locked, and resizing or rotating the viewport refits it.

### Exports

The two exports are independent, and each keeps its own busy, success, and
failure state. Orientation, randomization, and both exports are disabled during
a capture so the layout cannot change mid-render.

- **Download PDF** generates and downloads locally without contacting Drive.
- **Upload to Drive** generates the same PDF and uploads it without downloading.

The page follows the chosen orientation: landscape produces a 16:9 landscape
page, portrait a 9:16 portrait one. Watermarking, capture quality, and the
millisecond timestamped filename are unchanged, so repeated exports do not
collide:

`Moodboard-KelakKembali-{DocName}-{YYYY-MM-DD-HHmmss-SSS}.pdf`

Every successful export writes a moodboard document row and a history event
recording the filename, orientation, and destination; a Drive export also
stores its link. Only the **first** successful export for an order sets
`moodboard_date` and recalculates the consultation follow-up — later exports add
history without moving that date. Downloading or uploading counts as generating
the moodboard; neither implies it was sent to the customer.

Drive uploads go to:

`Kelak Kembali Moodboards/{customer name}/{order title}/Moodboard/{filename}`

The order title is used first, then the document name, then `Untitled order`.
Folder segments are sanitized but keep readable Unicode names. A missing,
revoked, or invalid credential leaves the moodboard session and its photos
intact and offers to open the Google settings page in a new tab.

The Drive function needs the additional OAuth scope
`https://www.googleapis.com/auth/drive.file`. It exposes `save_moodboard_pdf`
(`{file_name, pdf_base64, customer_name, order_title}`) and
`save_fitting_photo`; no cleanup endpoint exists. After adding the scope,
reconnect Google once so the stored refresh token includes the new permission.

## Fitting log

Every order has at most one photo-first revision log per fitting stage —
Sizing, Fitting 1, Fitting 2, Fitting 3, Final fitting — and each one is
independent of whether that stage has a planned week. Staff always pick the
stage explicitly; nothing is chosen from today's date. Select a photo from the
native camera/library chooser, add an optional note, and it appears in the
timeline immediately. The browser compresses it to a 1600px JPEG before a
background archive upload to `Kelak Kembali Fittings/{customer}/{order}/{stage}`
in Google Drive. A failed archive does not remove the log row; its captured
photo remains available in the current browser session. Photos can be opened,
shared as a Drive link, or removed from the app (the Drive copy is retained).

A log is only written to the database when its first photo and note are
confirmed, so an abandoned capture leaves nothing behind. **Save log** marks it
saved and returns to the order; saved is a state, not a lock — photos can still
be added, replaced, recaptioned, or deleted afterwards. **Delete fitting log**
on the detail page removes the whole stage log and its photo records from the
app; the Google Drive archive copies stay where they are.

After applying the SQL migration, deploy the updated Drive function:

```bash
supabase functions deploy google-drive
```

## The watermark

The document background is not flat — it is a soft cream/ivory/sand tonal field
plus film grain, generated procedurally from a seed built out of the document's
own contents: **which document it is, the customer name, the date, and every
item's name, qty and price**. The kind is part of the seed, so a quotation and
the invoice drawn from the same figures still get fields of their own.

The washes are painted as a handful of large, rotated ellipses into a 48px-wide
canvas and blown up ~12x, which buys their softness for free and keeps them
reading as one flowing field rather than a cluster of spots.

Grain is a separate layer generated at **CSS resolution** and upscaled with
smoothing off, so each particle is a crisp 3x3 block, then composited in
`overlay`. Generating it per device pixel instead — the first attempt — makes it
far too fine: it averages away into flat mush. The PRNG is mulberry32 seeded
with an FNV-1a hash, so it is fully deterministic.

That makes the background a fingerprint of the content. Verified behaviour:

| Property | Result |
|---|---|
| Same document regenerated | Byte-identical field |
| Edited away and back again | Original field returns exactly |
| One rupiah changed | Completely different field, everywhere |

So a tampered copy no longer matches the background of the one that was sent.
Because the logos are keyed to true transparency, the field shows through
cleanly behind them.

## The design contract — quotation

`styles/documents.css` is a locked reproduction of the Figma frame
(`RqeGM5NJD3CTeasfarP9iM`, node `1:2`, table `2:245`). Only the data inside it
changes.

Verified against the source design: 32px padding, a 534px content column that
every block below the greeting now fills edge to edge (the old 100px right inset
has been removed), 44px title, 1px dividers at 10% black, 3px bullet dots,
`rgba(0,0,0,.05)` 4px-radius total row.

Two things have deliberately moved away from the Figma frame since — see
*The document typeface* below: the face is now Aileron at 400/300 rather than
Plus Jakarta Sans at 600/400, and the −3% tracking Figma carried has been
dropped and replaced with +1%, because the −3% was cut for Plus Jakarta Sans
and Aileron sets tighter to begin with. Geometry is unchanged.

**The items table matches node `2:245` exactly**, measured live:

| | x | width | align |
|---|---|---|---|
| Item | 0 | 346 (flexible) | left |
| Qty | 370 | 40 | centre |
| Price | 434 | 100 | left |

Row gap 24px. The Total row is the one exception, per Figma: gap 64px, padding
`4px 0 4px 8px`, and no Qty cell — the flexible label absorbs the difference so
Price stays aligned at x=434 with the rows above.

The one intentional departure from the frame's `#E4E2DD` fill: the page sits on
a slightly lighter `#EBE9E4`, so the watermark's grain doesn't read as dirt on
an already-mid-tone ground.

**Fixed, never exposed in the form:** both logos, the "Quotation" title, the
greeting paragraph and the Excludes sentence. Payment terms show percentages
only, as in Figma — but the terms themselves come from the order, so an order
on the "other services" scheme prints its own labels, shares and descriptions
in the same three-column block. The row wraps past three, so a longer list
still fits the page width.

The `Price` column shows each item's **unit** price; the Total is
`Σ (qty × price)`.

### The document typeface

Both documents are set in **Aileron** (Sora Sagano, released into the public
domain by [dot colon](https://dotcolon.net/font/aileron/), v1.02) — **Light
(300)** for body, **Regular (400)** for labels. That is the whole ladder either
document uses, shifted down from the 400/600 the Figma frame specified, because
Aileron sets heavier than Plus Jakarta Sans at the same nominal weight. The app
UI keeps Plus Jakarta Sans; only the two `.q` templates changed.

Body was UltraLight (200) at first, one step further down. Aileron's UltraLight
is genuinely hairline: fine on a screen, and it breaks up in print and in the
downscaled PDF. Light holds together and is still clearly lighter than the 400
labels, so the document keeps its contrast either way.

Tracking is **+1%** (`letter-spacing: 0.13px` on `.q` — 1% of the 13px body,
in px because the document is a fixed 598px frame and an em would resolve
against an inherited size that the html2canvas clone need not share), and that
is the only
`letter-spacing` in Parts 2 and 3. The −3% the frame carried was cut for Plus
Jakarta Sans and is gone; the +1% is the opposite correction, because Aileron's
own tracking is tight for a document read at arm's length off a phone. Much
past +1% and the table columns drift wider than their headers.

Both faces are subset to latin and inlined into `fonts.css` as data URIs, for
the same reason Plus Jakarta Sans is: html2canvas snapshots each document
through a clone in its own iframe, which re-resolves font references from
scratch. A URL there is a race the PDF can lose — the clone lays text out in a
fallback while the glyphs are painted from the real face. A data URI has nothing
to fetch, so the clone cannot miss it.

Each `src` must be **one unbroken line**. An unquoted `url()` may not contain
whitespace and a quoted CSS string may not contain a raw newline, so wrapping
the base64 for readability drops the face silently — the document keeps
rendering, just in the system fallback.

### A note on rendered font weight

Historic, and no longer a like-for-like comparison: the figures below were taken
when every text node was exactly Figma's weight — Plus Jakarta Sans, 400 body
and 600 labels. They are kept because what they measure is the *capture path*,
not the typeface. Ink coverage of the table against Figma's own render of node
`2:245`:

| | mean luminance | ink fraction |
|---|---|---|
| Figma | 218.04 | 0.02809 |
| This app @3x | 217.13 | 0.03174 |

The 0.4% residual is html2canvas rasterising glyphs through the canvas API,
which lays down marginally fatter antialiasing than Figma's renderer. It is not
a CSS weight difference, and raising the snapshot scale to 4x does not reduce it
(0.0313), so the scale stays at 3.

## The design contract — invoice

The invoice section of `styles/documents.css` is a locked reproduction of node
`2:104` in the same file.
It reuses every `.q-` class the quotation already defines — same 598px shell,
32px padding, 534px column, dividers, header, items table, Total row and
signature — and adds only what the invoice does differently.

Verified live against the source frame, measured from the document's top-left:

| | Figma | Rendered |
|---|---|---|
| Header container | y 32, h 117 | y 32, h 118 |
| Items container | y 159, h 399 | y 160, h 399 |
| Terms of payment | h 122 | h 122 |
| Payment to | h 107 | h 107 |
| Signature | y 568, h 120 | y 569, h 120 |
| Price column | x 466 | x 466 |

The 1px offset is the 44px title measuring 55.x px at `line-height: normal`
rather than Figma's flat 55, and is inherited from the quotation, not new here.

What differs from the quotation:

- **No greeting paragraph.** The 32px that sat above it moves onto the header
  container itself, per node `2:105`.
- **No Includes / Excludes block.** The Includes card in the form feeds the
  quotation only.
- **Terms of payment** is a titled band — divider, 13/600 label, divider — with
  the order's terms as rupiah amounts rather than the quotation's descriptions.
  Term rows carry no Qty cell, so Figma widens their gap to 64px; the label
  is flexible either way, so Price still lands at x=434.
- **Payment to** is the same band, with the bank details at 24px leading, not
  the 20px used everywhere else. `BCA 6800 691 425 / Annisa Beauty` is fixed and
  never exposed in the form, like the Excludes sentence.

**The items table is the exception to the frame**: the Figma invoice omits the
Qty column, which was an oversight in the design rather than an intent. The
invoice therefore prints the same three-column Item / Qty / unit-Price table as
the quotation, from the identical code path.

## Business rules

- **Total** — auto-calculated, live, never entered by hand.
- **Currency** — `Rp7.225.000`: dot thousands separators, no decimals, no space
  after `Rp`. Formatted manually, since `Intl` for `id-ID` inserts a space.
- **Document date** — always the day the PDF is generated, rendered
  `D Month YYYY` ("21 March 2026"). It is not a field: a document is dated when
  it is issued, and a date you had to remember to set was one more thing to get
  wrong. Note that it feeds the watermark seed, so the same order downloaded on
  two different days yields two distinguishable files.
- **Includes** — six standing options plus any number of user-added ones, all
  six ticked on a new order because that is what the studio actually includes.
  Only ticked entries render, joined by 3px bullets with no trailing bullet.
  Ticking none leaves just the `Includes:` label. Adding a label that already
  exists (ignoring case and spacing) ticks the existing chip rather than
  duplicating it. A saved label that is not one of the six comes back as a
  removable chip on reload, rather than vanishing.
- **Price entry** — thousands separators are inserted as you type. The caret is
  restored by digit count, not by string offset, so it doesn't jump a place each
  time a new dot appears.
- **Payment scheme** — two. `Wedding attire` is the standing 35 / 35 / 30 split
  and stores nothing on the order, so the package's terms live in one place.
  `Other services` carries the order's own list: any number of terms, each with
  a label, a share and an optional description. The shares have to add up to
  100% — a running total sits under the list and the save is refused until it
  lands — because terms summing to 90% mean an invoice whose instalments never
  reach its own total. Switching back to the standard scheme clears the custom
  list rather than leaving it to be read again later.
- **Deposit amounts** — every share but the last is rounded to the nearest
  rupiah and the last takes the remainder, so the terms always sum to the Total
  exactly rather than drifting a rupiah off it.
- **What each deposit starts** — logging a deposit stamps a date on the order as
  well as writing a history line, and which date depends on where the term sits.
  The first starts the design phase, the *production* deposit starts the
  measurements and fittings, and the last marks the order finished. For the
  standard 35 / 35 / 30 scheme the production deposit is the second. A custom
  scheme has no second term anyone can reason about — it might have two stages
  or five, and none of them necessarily means "design approved" — so it gets no
  gate: its **first** payment starts everything at once. A custom scheme with a
  single term therefore starts and finishes the order in one click, which is
  legitimate but surprising, so it asks first. All three dates stay editable on
  the order form, for the transfer that landed on Friday and got logged on
  Monday.
- **Name on documents** — an order's own field, not the customer's name. The
  record is filed under whoever books and pays; the document is addressed to
  whoever the outfit is for, and on a family booking those are several different
  people. It is asked for per order and starts blank, and both downloads stay
  disabled until it is filled in — a document addressed to nobody is worse than
  no document. It also feeds the filename and the watermark seed.
- **Filename** — `{Quotation|Invoice}-KelakKembali-{DocName}-{YYYY-MM-DD}.pdf`,
  falling back to `{Kind}-KelakKembali-{YYYY-MM-DD}.pdf` when the name is blank.
- **Validation** — shared. Either button runs the same check, and both lock
  while a capture is running; only the pressed one shows the spinner.
- **Customer list order** — soonest wedding first by default; customers without
  a date sink to the bottom. The sort control switches to alphabetical, which is
  what you want when looking for one known name rather than working through the
  week; the choice is kept in `localStorage`. It has its row to itself: it used
  to share one with a count and the word "Sort", which was three quiet labels
  competing to say what the list already showed. Search matches name, phone or
  Instagram handle, filtering the already-loaded list rather than re-querying,
  and both orders honour it.
- **Search that finds nothing** — offers to create the customer instead of just
  reporting the miss, since searching for a name that is not there is mostly how
  you discover it has not been entered yet. The name rides to the form in the
  hash (`#/customer/new?name=…`), so it survives a reload of that URL, and the
  caret lands on Phone rather than on the field already filled in.
- **Adding a customer** — the button sits beside the search field at the top of
  the list card, not under the list. It is the reason you opened the page as
  often as searching is, and it should not take a scroll past every existing
  name to reach. It is outlined, not solid: up there a black slab was the
  loudest thing on a page whose subject is the list.
- **Deleting** — always behind a confirm, and always cascading: a customer
  takes their orders and download log with them. Both deletes live in the app
  bar's overflow menu rather than as red buttons at the foot of the page, so
  the only irreversible actions in the UI take two deliberate taps to reach.
- **Payments** — the order page lists the order's terms with their amounts and
  whether each is paid, and the chooser only offers the ones still outstanding,
  so the same term cannot be logged twice.
- **Empty orders** — both download buttons are disabled until the order has at
  least one named item with a price, since the alternative is a document with
  no lines on it.
- **Production cost** — internal, per unit, never printed. The field carries a
  live target of 35% of that item's price: under it the hint names the ceiling,
  over it the hint names the overshoot. It is guidance, not validation — nothing
  is blocked.
- **Nett profit** — internal, and computed only over items that have a
  production cost. A blank cost means nobody has worked it out yet, not that the
  item is free to make; counting it as zero turned every unpriced item into pure
  margin and quietly overstated the figure. Items without one sit out of the sum
  and a line under it says how many did, so the number never means something
  narrower than its label. With no costs filled in at all it reads `—`.
- **Homepage** — the active customers with the soonest date still ahead of them,
  sorted by whichever of wedding or fitting comes first and labelled with which
  one it is, as calendar tiles in one horizontally scrolling strip. It sorts by
  whichever comes first of the wedding, a scheduled fitting, and the outstanding
  follow-up, and labels which one it is. Stacked full-width rows cost three
  screenfuls to say three dates and pushed the customer list below the fold; the
  strip says the same in a fifth of the height and holds eight. Who appears is
  read off the same derived status as the badges, so the two can never disagree:
  everyone except `Completed` and `Cancelled`. Someone with no orders yet counts,
  since they are the one who needs one.

## Google Calendar

Optional. Without it the fitting schedule still works — it just stays inside the
app. Server-side code exists here only because a Google refresh token is a
standing grant over a calendar and does not belong in a browser.

**1. Create the OAuth client.** In the [Google Cloud
Console](https://console.cloud.google.com/), make a project, enable the **Google
Calendar API**, and create an **OAuth 2.0 Client ID** of type *Web application*.
On the consent screen add the scopes
`https://www.googleapis.com/auth/calendar.events` and
`https://www.googleapis.com/auth/drive.file`, then add your own Google account
as a test user — the app never leaves testing, since it has exactly one user.

Register both environments, or the redirect back from Google fails on whichever
one you left out:

| | Authorized JavaScript origin | Authorized redirect URI |
|---|---|---|
| Local | `http://localhost:4173` | `http://localhost:4173/` |
| Live | `https://your-app.vercel.app` | `https://your-app.vercel.app/` |

**2. Put the client ID in `config.js`.** It is public, exactly like the Supabase
anon key — it names the app to Google and authorizes nothing:

```js
GOOGLE_CLIENT_ID: '…apps.googleusercontent.com'
```

**3. Give the secret to Supabase, never to the repo.**

```bash
supabase secrets set GOOGLE_CLIENT_ID=… GOOGLE_CLIENT_SECRET=… APP_URL=https://your-app.vercel.app
```

`APP_URL` is optional; it only puts a link back to the order in each event's
description.

**4. Deploy the function.**

```bash
supabase functions deploy google-calendar
```

**5. Connect.** Open the app, choose **Google Calendar** from the overflow menu,
and press Connect. One consent screen, once.

A few things worth knowing:

- The refresh token is stored in `google_credentials`, which has RLS enabled and
  **no policies at all**. The signed-in app cannot read it; only the function's
  service-role key can. To confirm, run `await KK.db.init().from('google_credentials').select()`
  in the browser console while signed in — it must come back empty.
- Consent is requested with `access_type=offline&prompt=consent`. Both are
  needed: without them Google hands back an access token that dies in an hour
  and no refresh token, and syncing works only until you close the tab.
- If Google ever declines to issue a refresh token, remove the app at
  [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
  and connect again.
- **Follow-up nudges sync on their own**, unlike the fitting schedule. A
  schedule is five events recomputed on every save, which is why sending it is a
  decision; a nudge is one event whose entire purpose is to fire when you would
  otherwise forget, and one that needs remembering to sync is not a nudge. It
  goes out as an all-day event reminding you the day before, and clearing the
  follow-up deletes it. A failure is logged and shown on the customer page
  rather than blocking the save that caused it.
- **The redirect URI must match exactly.** The app sends
  `location.origin + location.pathname`, which for a site served from its root
  is the domain **with a trailing slash**. `https://your-app.vercel.app` and
  `https://your-app.vercel.app/` are two different strings to Google, and
  registering only the first is what produces `Error 400: redirect_uri_mismatch`.

## The schedule

**Two groups, two anchors.** They are computed separately and stored separately,
and neither can ever delete the other. All of it lives in
[`calendar.js`](calendar.js), which is pure: dates in, dates out, no DOM and no
network.

| Group | Anchored on | Needs the wedding date? |
| --- | --- | --- |
| Design phase, Design deadline | The **first payment** | No |
| Sizing, Fitting 1–3, Final fitting | The **production payment** and the **wedding date** | Yes |

The design block needing nothing but the payment is the point of the split. A
customer who has paid a deposit but is still arguing about the venue gets a
calendar block for the fortnight of work that is genuinely happening, and a
wedding date that arrives late — or moves — cannot take it away.

**The rules**

| | |
| --- | --- |
| Design phase | The 14 days after the first payment, as one all-day block, with a deadline event on its last day: present the design, ask for the next payment |
| Sizing | Within 7 days of the production payment. A ceiling, not a target |
| Minimum gap | 3 weeks — a fitting is only useful once the last one has been acted on, and that is cutting-and-sewing time, not calendar time |
| Final fitting | 21 days before the wedding ideally, 7 at the very latest |

Order detail always shows all five fitting stages. A stored appointment is
displayed as its planned Monday–Sunday week; stages without an appointment say
`Not scheduled` and can still start a log. Planned weeks never choose or create
logs—staff select the stage explicitly, and the log becomes durable only when
its first photo entry is confirmed.

A full five-appointment programme wants **12 weeks** from measurements to the
final fitting, plus the week before them and the three after: about **16 weeks**
from the production payment to the wedding.

**Everything lands on a Monday.** Appointments are placed in whole weeks and
snapped to the Monday on or before the computed date. Two reasons. Whole weeks
make a three-week gap exactly three weeks instead of something that rounds to
twenty days; and snapping *backwards* can never push an appointment past the
7-day measurement ceiling or the final-fitting floor, which snapping forward
could do. The day itself is a starting point for the conversation with the
client, not a booking — move it in Google and it stays moved, see below.

**When the wedding is far off** the gaps simply grow. There is no cap: the five
appointments spread evenly across whatever room there is, so a booking two years
out has months between fittings rather than a cluster near the wedding and a
year of silence.

**When it does not fit**, three things give way in order. The finishing buffer
first — the final fitting slides from 21 days out toward 7. Then the gaps, down
to a 2-week floor, because a cramped fitting still puts eyes on the garment and
a missing one does not. Only when neither is enough does an appointment drop,
middle-out: Fitting 3, then Fitting 2, then Fitting 1. Measurements and a final
fitting are the two you cannot make a garment without, so those two are never
dropped; below a two-week window not even they fit, and the card says so instead
of inventing a schedule.

The card explains every compromise it made — how much room there was, what it
cost, and what the uncompromised version wants. It stays quiet about a buffer
still over 14 days, because a warning that fires for losing one day of slack
trains you to ignore the line that matters.

**Moving an appointment in Google pins it.** The studio owns the programme; the
person who dragged the event owns that appointment, because they had a
conversation the calculator did not — the client can only do Thursdays, the
fitting had to move a week. So the sync reads before it writes: an event whose
date in Google is not the date we hold is adopted rather than overwritten, the
row is marked pinned, and every recalculation from then on treats it as a fixed
point and reflows the appointments after it around it. The card shows a hollow
ring on a pinned row and says how many there are.

**How it behaves**

- **The design block is built when the first payment is logged**; the fittings
  when the production payment is. Both are rebuilt on every order save, and the
  fittings whenever the wedding date moves. Logged in the order's History only
  when the dates actually changed. Stored rather than recomputed on read,
  because each row has to remember the Google event it created.
- **Each payment date is stamped as today** when you log that deposit, and all
  three stay editable in the order editor. Each is written once — a date already
  set is the answer to when that money came in.
- **One schedule per order.** A bride and groom booked together are two orders
  with two deposits, so they get two schedules from one shared wedding date.
- **Syncing is a separate press.** Nothing reaches Google until you press Sync
  on the order. Events are all-day, titled `Fitting 2 — Sarah (Bride)`, with
  reminders 7 days and 3 days ahead. The design phase is the one multi-day
  event. Follow-up nudges are the exception — see below.
- **A month-precision wedding date holds back the fittings, not the design
  block.** Every fitting is measured back from the wedding, so "sometime in
  June" makes all of them guesses, and a guess in a real calendar is worse than
  a gap. The design block is measured from the payment and is exact either way,
  so it syncs. Both the app and the Edge Function draw that line.
- **Re-syncing moves events, it does not duplicate them.** Each row stores its
  Google event id and a later sync patches that event. An appointment dropped by
  a tighter window has its event deleted rather than left behind to be believed.
  An event you deleted by hand in Google is recreated — and loses its pin with
  it, since there is no longer a hand-moved date to honour.
- **The homepage strip reads the schedule**, alongside the wedding and whatever
  follow-up is outstanding — so a customer who has not paid yet still surfaces,
  which is exactly when the nudge is the thing worth seeing.

## Customer intake (Tally)

Optional. Without it customers are created by hand, as before.

A [Tally](https://tally.so) form posts to the `intake` Edge Function, which
verifies the signature and drops the answers into `intake_submissions`. They
appear as **New enquiries** at the top of the homepage. Opening one shows every
answer as submitted; **Create customer** files them at `In consultation` with the
check-in reminder already set, and **Dismiss** keeps the submission on record
without creating anything.

Nothing becomes a customer automatically. A public form is a public form, and
deciding whether a submission is real is the job the queue exists to let you do.

**1. Build the form.** The live one is at
[tally.so/r/Y5XG6N](https://tally.so/r/Y5XG6N) — four pages: how we reach you,
the occasion, your vision, and a thank-you page. Only the name, WhatsApp number,
who is being dressed and whether the day is set are required; everything else is
optional, because a first enquiry is not a form to be completed correctly.

Ask whatever you like — the mapping matches on the question's label,
case-insensitively and by substring:

| Ask something containing | Fills |
| --- | --- |
| `name` | Name |
| `whatsapp`, `phone`, `nomor` | Phone |
| `instagram`, `handle` | Instagram |
| `hear about`, `how did you`, `source` | Source |
| `looking for`, `tell us`, `message`, `anything else` | Notes |
| **`wedding`** | Wedding date — an exact date is taken as-is, a month (`May 2027` or `2027-05`) becomes that month's last day and is flagged approximate |

The wedding matcher requires the word **wedding**, not merely `date`. A form asks
for several dates and any of them would parse; matching on `date` meant whichever
came last silently became the wedding, and the entire fitting schedule counts
back from that one. For the same reason the first `wedding` answer wins and a
later one cannot overwrite it — the form asks for either an exact day or a month,
never both.

Source options should mirror the app's own list — `Instagram`, `TikTok`,
`Referral` — since anything else is filed as `Other` when the enquiry is
accepted. The raw answer is still kept and shown on the review screen.

Nothing else is lost either: the entire webhook body is stored, and the review
screen prints every answer it finds there. So a question added in Tally shows up
in the app without this repo being touched.

**2. Set the secret and deploy.**

```bash
supabase secrets set TALLY_SIGNING_SECRET=…
```

```bash
supabase functions deploy intake
```

**3. Point Tally at it.** In the form's *Integrations → Webhooks*, add
`https://<project-ref>.supabase.co/functions/v1/intake` and set the signing
secret to the same value.

This is the only function with `verify_jwt` off — Tally has no Supabase session
to present — which makes that signature check the entire security boundary
rather than a second layer behind one. It runs on the raw request bytes before
anything is parsed, compares in constant time, and answers a bare `401` that
says nothing about why. An unset `TALLY_SIGNING_SECRET` rejects everything
rather than accepting it: the failure mode of guessing the other way is an open
endpoint into the database.

## Assets

`fonts.css` carries three faces, all as base64 `woff2` data URIs and all latin
subsets — no request to Google Fonts, Adobe Fonts or any CDN for type:

| Face | Used by | Size |
|---|---|---|
| Plus Jakarta Sans, variable 200–800 | the app UI | 27 KB |
| Aileron Light (300) | document body | 17 KB |
| Aileron Regular (400) | document labels | 17 KB |

The Plus Jakarta Sans file is kept unencoded at `assets/fonts/` for reference.
Aileron is rebuilt from the dot colon `.otf` release by subsetting to latin —
`pyftsubset Aileron-<weight>.otf --unicodes=… --flavor=woff2` — then base64ing
the result onto a single `src` line.

`assets/logo-header.png` and `assets/logo-signature.png` are the real Figma
layers (`2:92` and `2:101`) exported at 4x — not recreations.

The source layers are ink photographed on flat `#E4E2DD`, so they exported
opaque. They have been keyed to true transparency by un-compositing each pixel
against that known background (`ink = (p − (1−a)·bg) / a`, alpha from
luminance), which recovers clean antialiased edges and the original ink colour
with no halo. This matters: over the watermark's gradient, an opaque logo would
punch a visible flat rectangle through the field.
