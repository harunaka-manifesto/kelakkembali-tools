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
| `app.js` | State, calculations, validation, PDF export |
| `assets/` | The two logo marks, exported from Figma at 4x |

The quotation lives in a `.stage` container positioned off-screen at its exact
design size (598px wide). On download it is snapshotted with **html2canvas** at
3x and placed into a **jsPDF** page that is A4-width (595.28pt) and *dynamically
tall*, so a longer item list simply yields a taller single page — never a second
page, never a clipped one. Both libraries load from jsDelivr; there is no build.

## The design contract

`styles.css` Part 2 is a locked reproduction of the Figma frame
(`RqeGM5NJD3CTeasfarP9iM`, node `1:2`). Only the data inside it changes.

Verified against the source design: 598×874 canvas, `#E4E2DD` background, 32px
padding, 534px content column with the document body inset 100px on the right
(434px), Plus Jakarta Sans 600/400, 44px `-1.32px` title, 1px dividers at 10%
black, 3px bullet dots, `rgba(0,0,0,.05)` 4px-radius total row.

**Fixed, never exposed in the form:** both logos, the "Quotation" title, the
greeting paragraph, the Excludes sentence, and the 35/35/30 payment-term
percentages with their three descriptions.

### Deliberate deviations from the Figma frame

Both are required by the build spec, not accidents:

1. **A `Qty` column** between Item and Price. The table keeps its 434px width,
   13px/20px type and 100px right inset; columns are Item (fills) / Qty (56px,
   centred) / Price (110px, right-aligned). Price is right-aligned here whereas
   Figma left-aligned it, so the money column reads as a column.
2. **Rupiah amounts appended to each payment term** — `1st deposit: 35% —
   Rp2.966.250`. Figma showed percentages only.

The `Price` column shows each item's **unit** price; the Total is
`Σ (qty × price)`.

## Business rules

- **Total** — auto-calculated, live, never entered by hand.
- **Currency** — `Rp7.225.000`: dot thousands separators, no decimals, no space
  after `Rp`. Formatted manually, since `Intl` for `id-ID` inserts a space.
- **Deposits** — 35% / 35% / 30% of the total, each rounded to whole Rupiah,
  with the rounding remainder absorbed by the 3rd deposit so the three always
  sum *exactly* to the total.
- **Date** — always rendered `D Month YYYY` ("21 March 2026"), defaults to today.
- **Includes** — only ticked items render, joined by 3px bullets with no trailing
  bullet. Ticking none leaves just the `Includes:` label.
- **Filename** — `Quotation-KelakKembali-{Customer}-{YYYY-MM-DD}.pdf`, falling
  back to `Quotation-KelakKembali-{YYYY-MM-DD}.pdf` when the name is blank.

## Sample data

The two sample items from the design are pre-filled so the tool is immediately
legible, all six includes ticked, and a persistent notice warns that they are
samples. **Clear sample data** resets to one blank row with nothing ticked. The
notice disappears once the sample rows are gone or edited.

## Assets

`assets/logo-header.png` and `assets/logo-signature.png` are the real Figma
layers (`2:92` and `2:101`) exported at 4x — not recreations. They carry an
opaque `#E4E2DD` background baked in, which is exactly the quotation's canvas
colour, so they composite seamlessly and with no antialiasing halo. If the
document background ever changes, re-export them with transparency.
