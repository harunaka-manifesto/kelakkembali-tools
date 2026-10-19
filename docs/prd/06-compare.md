# 06 — Compare

## Goal

Show how a garment changed between Rounds. All Shots are drawn in the same aligned Canvas, so the body stays still and only the garment changes. Slider mode compares two Rounds side by side with a draggable divider. Stack mode flips through every Round in place.

## User stories

1. As a pattern maker, I want to drag a divider across Proto 1 and Proto 2, so that I can see exactly where the shoulder seam moved.
2. As a designer, I want to flip through all Rounds of one Angle, so that I can see the whole development of the fit.
3. As a sample maker, I want to zoom into the same spot on both Rounds, so that I can check a hem or a dart.
4. As a designer, I want to pick any two Rounds, so that I can compare Proto 1 with Final, not only neighbors.
5. As a designer, I want to fix a bad alignment from inside Compare, so that I don't lose my place.

## Flow (happy path)

Slider:
1. From Garment Detail, the user taps Compare. Compare opens in the last-used mode (first time: Slider), Angle Front.
2. Round A (left) = the second-latest Round with a Front Shot; Round B (right) = the latest. The divider is at 50%.
3. The user drags one finger across the image. The divider follows the finger. Left of it shows A, right of it shows B.
4. The user pinches to zoom to 2.5× on the waist; both Rounds zoom together. They drag the divider again.
5. The user taps the Round A label, picks Proto 1 in the Round Picker Sheet. The left side now shows Proto 1.
6. The user switches the Angle to Side. Both Rounds have Side Shots, so the Rounds stay and zoom resets to 1×.

Stack:
1. The user switches to Stack. The latest Round with a Front Shot is shown, labeled "Proto 3 · 3 of 3".
2. The user swipes right (or taps the left third) to see Proto 2, then Proto 1. Each change is an instant cut.
3. The user taps a Round in the scrubber to jump.

## Screens and states

### Screen: Compare

Full-screen push from Garment Detail or Round Detail.

Common elements:

| Element | Content |
| :--- | :--- |
| Back button | Returns to the previous screen |
| Title | Garment name |
| Mode switch | Slider / Stack |
| Angle switch | Front / Side / Back. An Angle is disabled when fewer than 2 Rounds have a Shot for it. |
| Canvas | 3:4, full width. Every Shot drawn with its `effectiveTransform`; area outside a photo is empty canvas fill. |
| Zoom | Pinch 1×–4×; two-finger drag pans when zoomed; double-tap toggles 1× / 2.5× at the tap point |
| Fix Alignment | Menu button. Hidden for archived Garments. |

Slider mode elements:

| Element | Content |
| :--- | :--- |
| Round A label | Left, top of Canvas: Round name; below it "Check alignment" or "Not aligned" when that Shot is `needsReview` or `notAligned`. Tap → Round Picker Sheet for A. |
| Round B label | Same, on the right |
| Swap button | Swaps A and B |
| Divider | Vertical line with a handle, at the divider position |
| Fix Alignment menu | "Fix <A name> <Angle>" and "Fix <B name> <Angle>" → Manual Align for that Shot |

Stack mode elements:

| Element | Content |
| :--- | :--- |
| Round label | "<Round name> · <n> of <total>", plus the alignment badge text if any |
| Scrubber | One item per Round shown in the stack, in `sortIndex` order; current one marked. Tap jumps. |
| Skipped note | When Rounds were skipped: "Skipped: Proto 2, Proto 4 (no Side photo)". Hidden when none. |
| Fix Alignment | Single action "Fix Alignment" → Manual Align for the current card's Shot |

| State | When | Must show |
| :--- | :--- | :--- |
| `loading` | First images decoding, shown only after 200 ms | Thumbnails scaled up as placeholders; gestures disabled |
| `ready.slider` | Slider mode, both Shots loaded | Slider elements |
| `ready.stack` | Stack mode, current card loaded | Stack elements |
| `notEnoughRounds` | No Angle has Shots in ≥ 2 Rounds any more. The UI can't cause this while Compare is open; it guards against data changed underneath (for example by the launch integrity check). | "Compare needs two rounds with photos of the same angle." Close button |
| `sideFileMissing` | Slider: one side's file can't load | That side shows "Photo missing"; the other side works |
| `cardFileMissing` | Stack: current card's file can't load | "Photo missing" on that card; flipping still works |
| `archived` | Garment archived | Same as ready; Fix Alignment hidden |

### Sheet: Round Picker Sheet

Opened from Round A or Round B label. Title "Choose round for left side" / "…right side".

Rows: every Round of the Garment in `sortIndex` order. Each row: Round name; the Thumbnail of its Shot for the current Angle; a check mark on the current choice.

| Row state | When | Must show |
| :--- | :--- | :--- |
| `available` | Has a Shot for the Angle | Thumbnail; tappable |
| `missingAngle` | No Shot for the Angle | "No <Angle> photo"; disabled |
| `otherSide` | Chosen on the other side | "Shown on the other side"; disabled |
| `current` | Chosen on this side | Check mark |

Tap an `available` row → sheet closes, that side changes, divider stays where it was, zoom stays.

## Rules and edge cases

### Selection rules

1. Opening Compare from Garment Detail: mode = `UserDefaults compare.lastMode` (`"slider"` default, or `"stack"`). Angle = Front if enabled, else the first enabled in Front → Side → Back.
2. Opening from Round Detail "Compare with previous": mode = Slider; A, B and Angle as defined in [02](02-garments-and-rounds.md) (Round Detail actions).
3. Slider defaults for an Angle: let `R` = Rounds with a Shot for that Angle, by `sortIndex`. B = last of `R`; A = second last.
4. Changing the Angle in Slider: if both A and B have a Shot for the new Angle, keep them. Otherwise apply rule 3 and show a 3 s toast "<Round> has no <Angle> photo." naming the Round that was replaced (both names joined with " and " if both).
5. Stack shows every Round with a Shot for the Angle, in `sortIndex` order. It opens on the last one (latest).
6. Switching modes keeps the Angle. Slider → Stack opens on Round B. Stack → Slider keeps A/B from the last Slider use in this Compare session, else rule 3.
7. Zoom and pan are shared by both sides and all cards. They are kept when Rounds or modes change, and reset to 1× when the Angle changes.

### Gesture rules

8. Slider: a one-finger horizontal drag anywhere on the Canvas sets the divider to the finger's x position (absolute, not relative), clamped 0%–100% of the Canvas width. A tap without movement does not move the divider.
9. Slider: when zoomed, the divider position is in screen space (it stays under the finger), not in image space.
10. Stack: one-finger horizontal swipe of ≥ 40 pt (or velocity ≥ 300 pt/s) goes to the next Round when swiping left and the previous when swiping right. Tap on the left third → previous; right third → next; middle third → nothing.
11. Stack: change is an instant cut, no slide or fade. Reason: a hard cut makes small differences jump out, like a blink comparator.
12. Stack: at the first or last card, the gesture does nothing and plays a light haptic. No wrap-around.
13. Two-finger gestures never move the divider or flip cards.

### Required edge cases

| Case | Behavior |
| :--- | :--- |
| Permission denied | Not applicable; Compare needs no permission. |
| Pose not found | That Shot draws with `defaultFit`; its label shows "Not aligned"; Fix Alignment offers it. |
| Two people in frame | That Shot draws with its `lowConfidence` transform; label shows "Check alignment". |
| Garment with one round | Compare button disabled in Garment Detail with caption ([02](02-garments-and-rounds.md)); Compare can't open. |
| Deleted round | Compare re-reads Rounds on appear. If the Round shown in A or B is gone, apply rule 3. If fewer than 2 Rounds remain for every Angle → `notEnoughRounds`. |
| Storage full | Not applicable; Compare writes nothing. |
| App killed mid-capture | Shots still `pending` draw with `defaultFit` and the label "Aligning…"; they update in place when auto-align finishes. |

### Missing Angle

14. An Angle with Shots in fewer than 2 Rounds is disabled in the Angle switch. VoiceOver reads it as "Side, dimmed, needs photos in two rounds".
15. Slider never shows a Round without the Angle (rule 4 and the picker's `missingAngle` rows).
16. Stack skips Rounds without the Angle and lists them in the Skipped note.

### Performance

| Metric | Target (iPhone 13) | Target (iPhone XS) |
| :--- | :--- | :--- |
| Tap Compare → first aligned image visible, p90 | ≤ 500 ms | ≤ 800 ms |
| Slider drag, 10 s continuous | ≤ 5% frames over 16.7 ms; none over 33 ms | ≤ 5% over 33 ms |
| Stack flip to a neighbor | Next image visible ≤ 50 ms after gesture ends | ≤ 100 ms |
| Stack jump via Scrubber to any Round (20 Rounds) | ≤ 250 ms | ≤ 400 ms |
| Memory with 20 Rounds | ≤ 200 MB total app | ≤ 200 MB |

Implementation constraint to meet these: decode Display images for the current card and its 2 neighbors on each side (≤ 5 decoded at 2048 × 1536 ≈ 63 MB); release others.

### Other rules

17. Compare writes nothing. The only change path is Fix Alignment → Manual Align ([05](05-manual-align.md)). On return, the Canvas redraws that Shot with its new `effectiveTransform`; divider, zoom and card stay.
18. The Canvas never shows the Original pixels unaligned unless the Shot has no auto or manual transform (`defaultFit`).
19. Paywall note (later, not built): Stack mode is a candidate paid feature.

## Data touched

| Entity.field | Read | Write |
| :--- | :--- | :--- |
| `Garment.name, isArchived, rounds` | ✓ | — |
| `Round.name, sortIndex, shots` | ✓ | — |
| `Shot.angle, effectiveTransform (manualTransform, autoTransform, pixelWidth, pixelHeight), alignDisplayState` | ✓ | — |
| Files `display.jpg`, `thumb.jpg` | ✓ | — |
| `UserDefaults compare.lastMode` | ✓ | ✓ |

## Acceptance criteria

1. Given Rounds P1, P2, P3 all with Front Shots, when Compare opens in Slider, then A = P2, B = P3, Angle = Front, divider at 50%.
2. Given Slider, when the user drags one finger to 25% of the Canvas width, then the divider is at 25% (±1 pt) and the area left of it shows Round A.
3. Given Slider, when the user taps without moving, then the divider does not move.
4. Given Slider at 2.5× zoom, when the user changes Round A, then the zoom is still 2.5× and the divider is unchanged.
5. Given Slider with A = P1 and B = P3, when Swap is tapped, then A = P3 and B = P1.
6. Given P2 has no Side Shot and A = P2, B = P3, when the Angle changes to Side, then A and B follow rule 3 and the toast reads "Proto 2 has no Side photo."
7. Given only P1 has a Back Shot, then the Back segment is disabled.
8. Given the Round Picker Sheet for A with B = P3, then P3's row shows "Shown on the other side" and is disabled, and Rounds without the Angle show "No <Angle> photo" and are disabled.
9. Given Stack with P1, P2, P3 Front Shots, when Stack opens, then P3 shows with label "Proto 3 · 3 of 3".
10. Given Stack on P3, when the user swipes right 60 pt, then P2 shows with no animation.
11. Given Stack on P1, when the user swipes right, then P1 stays and a haptic plays.
12. Given Stack on P2, when the user taps the right third, then P3 shows; tapping the middle third changes nothing.
13. Given P2 has no Side Shot, when Stack shows Side, then P2 is not in the Scrubber and the note reads "Skipped: Proto 2 (no Side photo)".
14. Given zoom 3× in Stack, when the user flips to the next card, then the zoom and pan are unchanged.
15. Given zoom 3×, when the Angle changes, then zoom is 1×.
16. Given B's Shot is `notAligned`, then its label shows "Not aligned" and Fix Alignment lists "Fix <B name> <Angle>".
17. Given the user fixes B in Manual Align and saves, when Compare returns, then B redraws with the new `manualTransform` and the divider position is unchanged.
18. Given the user last used Stack, when Compare opens from Garment Detail, then it opens in Stack.
19. Given "Compare with previous" from Round Detail of P3, then Compare opens in Slider with A = P2 and B = P3 regardless of `compare.lastMode`.
20. Given an archived Garment, then Fix Alignment is not shown.
21. Given iPhone 13 and 3 Rounds, then Compare shows the first aligned image ≤ 500 ms after the tap (p90 of 10 runs).
22. Given iPhone 13 and a 10 s slider drag, then ≤ 5% of frames exceed 16.7 ms and none exceed 33 ms.
23. Given 20 Rounds in Stack on iPhone 13, then flipping to a neighbor shows the image ≤ 50 ms after the gesture ends and memory stays ≤ 200 MB.

## Definition of Done

- [ ] Compare screen and Round Picker Sheet with all states.
- [ ] `CompareSelection` (pure: default A/B, angle change, enabled Angles, stack list, skipped list) with unit tests for rules 1–7 and 14–16.
- [ ] `AlignedImageView` (draws a Shot's Display image with its `effectiveTransform` into a Canvas) is shared with Shot Detail, Camera ghost and Manual Align.
- [ ] Unit tests: AC 1, 5, 6, 7, 8, 9, 13, 18, 19.
- [ ] UI tests: AC 2, 3, 4, 10, 11, 12, 14, 15, 16, 17, 20.
- [ ] Device performance tests: AC 21, 22, 23 on iPhone 13 and the XS targets; numbers in the PR.
- [ ] VoiceOver: Slider Canvas is adjustable (±10% per swipe), label "Comparison, <A> left, <B> right, divider at <n> percent"; Stack Canvas is adjustable (next/previous), label "<Round>, <n> of <total>".
- [ ] Test Stats events `compareSliderOpened`, `compareStackOpened` ([08](08-non-functional.md)).

## Test plan

Unit:
- Default selection with 2, 3, 20 Rounds; with gaps in Angles; after a Round delete.
- Angle change keeps or replaces A/B; toast text with one and two replaced Rounds.
- Stack list and skipped note text.

UI (seeded `-seedFixture compare_basic`: 4 Rounds, P2 missing Side, P3 Back `notAligned`):
- All gesture rules 8–13.
- Round Picker Sheet row states.
- Fix Alignment round trip.

Manual (device):
- Real garment, 3 Rounds shot at different distances: slider drag shows the body still while the garment changes (record a screen video for the PR).
- One-handed: use Slider and Stack with only the right thumb; note any control out of reach.
- 20-Round Garment (seeded): scrub fast; check no blank frames.

## Decisions made

| Decision | Reason |
| :--- | :--- |
| Divider follows absolute finger position, drag anywhere | One thumb, no need to grab a small handle. |
| Instant cut in Stack | Small fit changes are easiest to see when the image switches in place. |
| Shared zoom across sides and cards | Comparing a detail only works when both images show the same region. |
| Zoom resets on Angle change | A zoomed region on the front makes no sense on the back. |
| Stack opens on the latest Round | The newest state is what the user checks first; earlier Rounds are one swipe back. |
| No onion-skin (opacity blend) mode | Not in the brief; Slider and Stack cover the need. Note for after the test. |
| Missing Angles are skipped, not shown as blank cards | Blank cards break the flip rhythm; the Skipped note keeps it honest. |
| Same Round can't be on both sides | Comparing a Round with itself is never useful. |

## Open questions

None.
