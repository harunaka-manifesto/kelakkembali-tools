# Moodboard Canvas Revamp

## Summary

Rebuild the generated moodboard route to match Figma node [`139:1733`](https://www.figma.com/design/RqeGM5NJD3CTeasfarP9iM/Kelak-Kembali-Tools?node-id=139-1733&m=dev).

The route will become a centered, mobile-width canvas page with:

- Landscape/portrait orientation toggle.
- Orientation-aware board and PDF dimensions.
- Randomized layout and photo order.
- Separate Drive upload and PDF download actions.
- A zoomable full-screen overlay for the complete moodboard.

## Implementation Changes

### Generated canvas experience

- Keep `#/order/:id/moodboard/preview` as the generated-page route, replacing its current presentation-only modal with the Figma ledger layout.
- Use a responsive column up to 390px wide, centered on wider screens.
- Add the back navigation, orientation toggle, framed moodboard, “Randomize layout,” “Upload to Drive,” “Download PDF,” and footer shown in Figma.
- Default every new browser-local moodboard session to landscape. Preserve orientation, uploaded photos, ordering, and variation while moving between selection and preview routes.
- Keep source images browser-local and discard them when leaving the moodboard workflow.

### Orientation and layout engine

- Add `landscape` and `portrait` orientation state to `KK.moodboard`, exposed through a setter/toggler and read-only getter.
- Use exact 16:9 counterparts:
  - Landscape stage: `1920 × 1080`.
  - Portrait stage: `1080 × 1920`.
- Keep the existing header, watermark, spacing, and one-photo full-bleed exception.
- Keep multi-photo frames portrait in both board orientations.
- Landscape uses the existing stacked-column partition solver. Portrait uses its transposed row-based equivalent, filling the complete photo region without blank remainder while targeting the existing approximately `0.72` photo-frame aspect.
- Orientation changes recalculate geometry without changing photo order. Randomize continues changing both layout variation and photo order.

### Full-screen moodboard overlay

- Make the complete composed moodboard preview the tap/click target; individual tiles do not open separately.
- Open an accessible full-screen modal with the close control at the top-right.
- Start fitted and centered, support gesture-centered pinch zoom, bounded panning, mouse wheel/drag, double-tap/double-click, and keyboard `+`, `-`, and `0` controls.
- Cap zoom at 5×, use `0` to return to fitted view, allow Escape to close, trap focus, restore focus on dismissal, and lock background scrolling.
- Resizing or rotating the browser viewport refits the overlay safely.

### PDF, tracking, and Drive

- Generate the PDF from the currently selected orientation:
  - Landscape produces a 16:9 landscape page.
  - Portrait produces a 9:16 portrait page.
- Preserve the existing visual content, watermarking, capture quality, timestamped filename format, and browser-local download behavior.
- Split exports:
  - **Download PDF:** generates and downloads locally without contacting Drive.
  - **Upload to Drive:** generates the same current PDF and uploads it without forcing a local download.
- Disable orientation/randomization/export controls during capture to prevent layout races, and give each export button its own busy/success/error state.
- Every successful export creates a moodboard document/history record, including filename, orientation, and destination. A Drive record also stores its link.
- Only the first successful export for an order sets `moodboard_date` and recalculates/syncs the follow-up. Existing moodboard records prevent later exports from advancing that date.
- Update `KK.db.driveSaveMoodboardPdf` and the `save_moodboard_pdf` Edge Function payload to accept `customer_name` and `order_title`.
- Upload to:
  `Kelak Kembali Moodboards/{customer name}/{order title}/Moodboard/{filename}`
- Use the order title first, then document name, then `Untitled order`; sanitize folder segments while retaining readable Unicode names.
- Continue using the shared Google credential and `drive.file` scope. Missing, revoked, or invalid credentials must leave the moodboard session intact and show an actionable reconnect message that opens the existing Google settings route in a new tab.
- Make `drive_link` optional when logging local-only downloads. No schema migration is required because the column already permits null.

## Interfaces and Documentation

- Extend `KK.moodboard` with orientation state and dynamic stage dimensions.
- Change:
  `driveSaveMoodboardPdf(fileName, pdfBase64)`
  to:
  `driveSaveMoodboardPdf(fileName, pdfBase64, customerName, orderTitle)`.
- Allow `logMoodboard(orderId, driveLink?)` for local and Drive exports.
- Update the README moodboard contract to document orientation, independent exports, tracking semantics, overlay controls, and the new Drive hierarchy.
- Preserve Vanilla JS and the existing stylesheet/token system; do not add React, Tailwind, or another UI framework.

## Test Plan

- Verify 1–16 images in both orientations: every layout remains within bounds, fills the photo region, has no overlap/gaps beyond the defined gutter, and keeps multi-photo cells portrait.
- Verify rotate preserves images/order, Randomize changes order and geometry, and returning to image selection preserves the session.
- Compare the 390px generated page against Figma and verify centered behavior on tablet/desktop.
- Test overlay opening, top-right close, focus restoration, Escape, keyboard zoom, pinch/pan, wheel/drag, double-tap/click, zoom bounds, and viewport resizing.
- Confirm landscape and portrait downloads have the correct page dimensions, filename, visual content, and no Drive request.
- Confirm Drive upload creates/reuses the complete folder hierarchy, returns a working link, and does not download locally.
- Confirm missing/revoked credentials show recovery guidance without losing selected photos.
- Confirm the first export updates tracking once, subsequent exports add history without changing the original moodboard date, and partial logging failures report accurately.
- Run `node --test tests/pure-modules.test.cjs`, syntax-check browser modules, and manually exercise the route over HTTP on touch and desktop browsers.

## Assumptions

- “Portrait” means 9:16 and “landscape” means 16:9.
- Google Drive continues using the app’s single shared OAuth credential rather than per-user credentials.
- The Drive folder is named `Moodboard` and remains under the existing `Kelak Kembali Moodboards` root.
- Downloading or uploading counts as generating the moodboard; neither action implies that it was separately sent to the customer.
