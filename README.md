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

| File | Role |
|---|---|
| `index.html` | The gate, the six views, and the two off-screen document templates |
| `styles.css` | Part 1: app UI. Part 2: the quotation. Part 3: the invoice |
| `fonts.css` | Plus Jakarta Sans, self-hosted and inlined (see below) |
| `config.js` | Supabase URL, anon key, the shared account's email, Google client ID |
| `util.js` | Formatting, escaping, the seeded-PRNG primitives |
| `docs.js` | The document engine: fills both templates, exports the PDF |
| `calendar.js` | The fitting schedule: places the appointments, draws the card |
| `db.js` | Every Supabase call — auth and CRUD, nothing else touches the client |
| `app.js` | Routing, views, form state, validation |
| `schema.sql` | The migrations to run in the Supabase SQL editor |
| `supabase/functions/google-calendar/` | Server-side: Google OAuth, fitting and follow-up calendar writes |
| `supabase/functions/intake/` | Server-side: the public Tally webhook, HMAC-verified |
| `serve.ps1` | Local static server, so testing needs nothing installed |
| `assets/` | The two logo marks, exported from Figma at 4x |

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
  Cancelled is derived from the orders and the wedding date. See
  *The lifecycle* below.
- **`orders`** — belongs to a customer; carries a status
  (`Quoted` → `Confirmed` → `In production` → `Delivered`), the first payment
  date, and the `items` and `includes` as `jsonb`. Both are short, always read
  and written whole, and order-sensitive; child tables would buy nothing and
  cost a position column plus two round trips per save. `document_date` is
  still on the table for compatibility but is no longer read or written by the
  app — see *Order status* below.
- **`order_events`** — the fitting schedule, one row per appointment, derived
  from the order's first payment and the customer's wedding date. Each row
  remembers the Google event it created, which is why the schedule is stored
  rather than recomputed on read.
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
its own schedule, because each has its own first payment.

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
> **first payment** → design phase → fittings → wedding

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
| `Completed` | The wedding date has passed |
| `Cancelled` | They said no — the only one you set |

Read in that order, most decisive first: a cancelled customer stays cancelled
whatever else is true, and a wedding in the past outranks a deposit. Creating an
order or logging a payment moves the status on its own; there is nothing to
click.

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
| Any deposit logged | `In production` |

`Delivered` is derived from the wedding date, the same way `Completed` is above.
Nobody marks a wedding as having happened, and the date that decides it stays
correctable afterwards.

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
On the consent screen add the scope
`https://www.googleapis.com/auth/calendar.events` and add your own Google
account as a test user — the app never leaves testing, since it has exactly one
user.

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

## Fitting schedule

The programme has exactly two fixed points, and neither of them is a fitting:
the **first payment** on the order and the **wedding date** on the customer.
Nothing can be scheduled before the deposit clears — that is when the work is
actually commissioned — and nothing can happen after the wedding. Everything in
between is arithmetic on those two dates, so it is computed rather than
remembered. All of it lives in [`calendar.js`](calendar.js), which is pure:
dates in, dates out, no DOM and no network.

**The rules**

| | |
| --- | --- |
| Design phase | 14 days from the first payment, before anything is measured |
| Appointments | Body measurements, Fitting 1, Fitting 2, Fitting 3, Final fitting |
| Minimum gap | 14 days — a fitting is only useful once the last one has been acted on, and that is cutting-and-sewing time, not calendar time |
| Final fitting | 21 days before the wedding ideally, 7 at the very latest |

A full five-appointment programme therefore wants **91 days** from payment to
wedding: 14 of design, 56 of fittings, 21 of finishing.

**When it does not fit**, the buffer gives way before an appointment does. The
final fitting slides later — from 21 days out toward 7 — and only when even that
leaves too little room does it start dropping, middle-out: Fitting 3, then
Fitting 2, then Fitting 1. Measurements and a final fitting are the two you
cannot make a garment without, so those two are never dropped; below a 22-day
window not even they fit, and the card says so instead of inventing a schedule.

The card explains every compromise it made — how much room there was, what it
cost, and what the uncompromised version wants. It stays quiet about a buffer
still over 14 days, because a warning that fires for losing one day of slack
trains you to ignore the line that matters.

**How it behaves**

- **Built when the first payment is logged**, and rebuilt on every order save
  and whenever the wedding date moves. Logged in the order's History only when
  the dates actually changed. Stored rather than recomputed on read, because
  each row has to remember the Google event it created.
- **The first payment date is stamped as today** when you log the first deposit,
  and stays editable in the order editor for the transfer that landed on Friday
  and got logged on Monday. Only the first — a second deposit says nothing new
  about when the work began.
- **One schedule per order.** A bride and groom booked together are two orders
  with two deposits, so they get two schedules from one shared wedding date.
- **Syncing is a separate press.** Nothing reaches Google until you press Sync
  on the order. Events are all-day, titled `Fitting 2 — Sarah (Bride)`, with
  reminders 7 days and 3 days ahead. Follow-up nudges are the exception — see
  below.
- **Re-syncing moves events, it does not duplicate them.** Each row stores its
  Google event id and a later sync patches that event. An appointment dropped by
  a tighter window has its event deleted rather than left behind to be believed.
  An event you deleted by hand in Google is simply recreated.
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
