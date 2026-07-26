# Kelak Kembali — Wedding Quotation Generator

A single-page, mobile-first tool that turns a short form into a downloadable PDF
quotation matching the Kelak Kembali design 1:1.

No backend, no login, no saved history. Pure client-side, static-deployable.

## Running locally

Any static file server works — the app needs `http://`, not `file://`, so the
logo PNGs don't taint the export canvas.

```bash
npx serve -l 4173 .
```

Then open <http://localhost:4173>.

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
| `index.html` | Form UI + the off-screen quotation template |
| `styles.css` | Part 1: form UI. Part 2: the locked quotation document |
| `fonts.css` | Plus Jakarta Sans, self-hosted and inlined (see below) |
| `app.js` | State, calculations, validation, PDF export |
| `assets/` | The two logo marks, exported from Figma at 4x |

The quotation lives in a `.stage` container positioned off-screen at its exact
design size (598px wide). On download it is snapshotted with **html2canvas** at
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
plus film grain, generated procedurally from a seed built out of the quotation's
own contents: **customer name, date, and every item's name, qty and price**.

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
| Same quotation regenerated | Byte-identical field |
| Edited away and back again | Original field returns exactly |
| One rupiah changed | Completely different field, everywhere |

So a tampered copy no longer matches the background of the one that was sent.
Because the logos are keyed to true transparency, the field shows through
cleanly behind them.

## The design contract

`styles.css` Part 2 is a locked reproduction of the Figma frame
(`RqeGM5NJD3CTeasfarP9iM`, node `1:2`, table `2:245`). Only the data inside it
changes.

Verified against the source design: 32px padding, a 534px content column that
every block below the greeting now fills edge to edge (the old 100px right inset
has been removed), Plus Jakarta Sans 600/400, 44px `-1.32px` title, 1px dividers
at 10% black, 3px bullet dots, `rgba(0,0,0,.05)` 4px-radius total row.

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
greeting paragraph, the Excludes sentence, and the 35/35/30 payment terms with
their three descriptions. Payment terms show percentages only, as in Figma.

The `Price` column shows each item's **unit** price; the Total is
`Σ (qty × price)`.

### A note on rendered font weight

Every text node is exactly Figma's weight — 400 body, 600 labels. Measured ink
coverage of the table against Figma's own render of node `2:245`:

| | mean luminance | ink fraction |
|---|---|---|
| Figma | 218.04 | 0.02809 |
| This app @3x | 217.13 | 0.03174 |

The 0.4% residual is html2canvas rasterising glyphs through the canvas API,
which lays down marginally fatter antialiasing than Figma's renderer. It is not
a CSS weight difference, and raising the snapshot scale to 4x does not reduce it
(0.0313), so the scale stays at 3.

## Business rules

- **Total** — auto-calculated, live, never entered by hand.
- **Currency** — `Rp7.225.000`: dot thousands separators, no decimals, no space
  after `Rp`. Formatted manually, since `Intl` for `id-ID` inserts a space.
- **Date** — always rendered `D Month YYYY` ("21 March 2026"), defaults to today.
- **Includes** — six standing options plus any number of user-added ones. Only
  ticked entries render, joined by 3px bullets with no trailing bullet. Ticking
  none leaves just the `Includes:` label. Adding a label that already exists
  (ignoring case and spacing) ticks the existing chip rather than duplicating it.
- **Price entry** — thousands separators are inserted as you type. The caret is
  restored by digit count, not by string offset, so it doesn't jump a place each
  time a new dot appears.
- **Filename** — `Quotation-KelakKembali-{Customer}-{YYYY-MM-DD}.pdf`, falling
  back to `Quotation-KelakKembali-{YYYY-MM-DD}.pdf` when the name is blank.

## Sample data

The two sample items from the design are pre-filled so the tool is immediately
legible, all six includes ticked, and a persistent notice warns that they are
samples. **Clear sample data** resets to one blank row with nothing ticked. The
notice disappears once the sample rows are gone or edited.

## Assets

`fonts.css` carries Plus Jakarta Sans (latin subset, variable 200–800) as a
base64 `woff2` data URI — one 27 KB face covers every weight the app uses. The
same file is kept unencoded at `assets/fonts/` for reference. There is no
request to Google Fonts anywhere.

`assets/logo-header.png` and `assets/logo-signature.png` are the real Figma
layers (`2:92` and `2:101`) exported at 4x — not recreations.

The source layers are ink photographed on flat `#E4E2DD`, so they exported
opaque. They have been keyed to true transparency by un-compositing each pixel
against that known background (`ink = (p − (1−a)·bg) / a`, alpha from
luminance), which recovers clean antialiased edges and the original ink colour
with no halo. This matters: over the watermark's gradient, an opaque logo would
punch a visible flat rectangle through the field.
