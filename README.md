# Kelak Kembali — Wedding Quotation & Invoice Generator

A single-page, mobile-first tool that turns a short form into a downloadable PDF
— either a **quotation** or an **invoice** — matching the Kelak Kembali designs
1:1. One form fills both documents; the action bar offers a button for each.

Customers and their orders are kept in **Supabase**, behind a shared password.
There is still no build step: the whole thing is static files plus three CDN
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
   run it. It creates the three tables, the `updated_at` triggers and the
   row-level security policies. It is safe to re-run.
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

| File | Role |
|---|---|
| `index.html` | The gate, the three views, and the two off-screen document templates |
| `styles.css` | Part 1: app UI. Part 2: the quotation. Part 3: the invoice |
| `fonts.css` | Plus Jakarta Sans, self-hosted and inlined (see below) |
| `config.js` | Supabase URL, anon key and the shared account's email |
| `util.js` | Formatting, escaping, the seeded-PRNG primitives |
| `docs.js` | The document engine: fills both templates, exports the PDF |
| `db.js` | Every Supabase call — auth and CRUD, nothing else touches the client |
| `app.js` | Routing, views, form state, validation |
| `schema.sql` | The migration to run once in the Supabase SQL editor |
| `serve.ps1` | Local static server, so testing needs nothing installed |
| `assets/` | The two logo marks, exported from Figma at 4x |

They are plain `<script>` files sharing a `window.KK` namespace, not ES
modules — modules would need `http://` even to open the file locally, and the
whole point of this repo is that it has no build and no toolchain.

`docs.js` takes `{ docName, date, items, includes, terms }` and knows nothing
about the database or the views, so the templates stay testable in isolation
and the storage layer can be swapped by rewriting `db.js` alone.

### The data model

Three tables (see [`schema.sql`](schema.sql)):

- **`customers`** — name, phone, Instagram, source, wedding date, estimated
  first and final fitting dates, notes.
- **`orders`** — belongs to a customer; carries a status
  (`Quoted` → `Confirmed` → `In production` → `Delivered`) and the `items` and
  `includes` as `jsonb`. Both are short, always read and written whole, and
  order-sensitive; child tables would buy nothing and cost a position column
  plus two round trips per save. `document_date` is still on the table for
  compatibility but is no longer read or written by the app — see
  *Order status* below.
- **`document_log`** — one row per PDF actually saved: which kind, when, and
  for how much. No files, just the numbers. Rows are kept verbatim when the
  order is later edited, which is the whole point of having them.

A quotation and an invoice are two renderings of one order, not two records.
Deleting a customer cascades to their orders and log rows.

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

### Order status

Status is read off what has happened, not set by hand — there is no status
field in the editor. Each event raises a floor and never lowers one, so
re-sending a quotation for an order already in production tells the record
nothing new:

| Event | Status becomes at least |
| --- | --- |
| Quotation PDF downloaded | `Quoted` |
| Invoice PDF downloaded | `Confirmed` |
| Any deposit logged | `In production` |

`Delivered` is derived rather than stored: an order shows as delivered once the
customer's wedding date is in the past. Nobody marks a wedding as having
happened, and the date that decides it stays correctable afterwards.

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

`styles.css` Part 2 is a locked reproduction of the Figma frame
(`RqeGM5NJD3CTeasfarP9iM`, node `1:2`, table `2:245`). Only the data inside it
changes.

Verified against the source design: 32px padding, a 534px content column that
every block below the greeting now fills edge to edge (the old 100px right inset
has been removed), 44px title, 1px dividers at 10% black, 3px bullet dots,
`rgba(0,0,0,.05)` 4px-radius total row.

Two things have deliberately moved away from the Figma frame since — see
*The document typeface* below: the face is now Aileron at 400/200 rather than
Plus Jakarta Sans at 600/400, and the −3% tracking Figma carried has been
dropped, because it was cut for Plus Jakarta Sans and Aileron sets tighter to
begin with. Geometry is unchanged.

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
domain by [dot colon](https://dotcolon.net/font/aileron/), v1.02) — **UltraLight
(200)** for body, **Regular (400)** for labels. That is the whole ladder either
document uses, shifted down 200 from the 400/600 the Figma frame specified,
because Aileron sets heavier than Plus Jakarta Sans at the same nominal weight.
The app UI keeps Plus Jakarta Sans; only the two `.q` templates changed.

Tracking is Aileron's own. The −3% the frame carried was cut for Plus Jakarta
Sans, and there is no `letter-spacing` left anywhere in Parts 2 and 3.

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

`styles.css` Part 3 is a locked reproduction of node `2:104` in the same file.
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
  a date sink to the bottom. A sort control beside the count switches to
  alphabetical, which is what you want when looking for one known name rather
  than working through the week; the choice is kept in `localStorage`. Search
  matches name, phone or Instagram handle, filtering the already-loaded list
  rather than re-querying, and both orders honour it.
- **Adding a customer** — the button sits beside the search field at the top of
  the list card, not under the list. It is the reason you opened the page as
  often as searching is, and it should not take a scroll past every existing
  name to reach.
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
  one it is, as calendar tiles in one horizontally scrolling strip. Stacked
  full-width rows cost three screenfuls to say three dates and pushed the
  customer list below the fold; the strip says the same in a fifth of the height
  and holds eight. A customer is active until every order they have is
  delivered; someone with no orders yet counts as active, since they are the one
  who needs one.

## Assets

`fonts.css` carries three faces, all as base64 `woff2` data URIs and all latin
subsets — no request to Google Fonts, Adobe Fonts or any CDN for type:

| Face | Used by | Size |
|---|---|---|
| Plus Jakarta Sans, variable 200–800 | the app UI | 27 KB |
| Aileron UltraLight (200) | document body | 17 KB |
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
