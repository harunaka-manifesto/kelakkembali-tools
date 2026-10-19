# 05 — Manual align

## Goal

When auto-align fails or isn't sure, let the user line up a Shot by hand in under 20 seconds. They drag, pinch and rotate it over guide lines and a reference photo. The result is saved as `Shot.manualTransform`; the Original and `autoTransform` stay as they are.

## User stories

1. As a designer, I want to fix a photo the app couldn't align, so that it still works in Compare.
2. As a pattern maker, I want to see last Round's photo behind the one I'm adjusting, so that I can match them exactly.
3. As a sample maker, I want to undo my manual changes and go back to the automatic result, so that a bad edit is not permanent.
4. As a designer using a dress form, I want manual alignment to be quick, so that the app is still useful when pose detection can't see a body.

## Flow (happy path)

1. In Shot Detail, the status line reads "Check alignment: Shoulders look uneven (raised arm?)". The user taps Adjust Alignment.
2. Manual Align opens full screen. The Shot is drawn with its current `effectiveTransform`. The Reference Shot shows at 50% opacity behind it. Guide lines mark the shoulder line, the hip line and the center.
3. The user drags with one finger to move the photo so the hips sit on the hip line.
4. The user pinches to resize until the shoulders sit on the shoulder line, and twists two fingers to level the shoulders. Near 0°, rotation snaps to level with a light haptic.
5. The user taps Save. Manual Align closes. Shot Detail shows "Aligned by hand" and the slot badge reads "Manual".

## Screens and states

### Screen: Manual Align

Full-screen modal. Elements:

| Element | Content |
| :--- | :--- |
| Cancel button | Leaves without saving (confirm if changed) |
| Title | "<Round name> · <Angle label>" |
| Save button | Saves the working transform. Disabled while the working transform equals the starting one. |
| Canvas | 3:4, full width. Shows the Shot's `display.jpg` drawn with the working transform. Area outside the photo is empty canvas fill. |
| Reference layer | The Reference Shot ([01](01-data-model.md) §6) drawn with its `effectiveTransform` at fixed 50% opacity, above the Shot |
| Guide lines | Shoulder line y = 0.24, hip line y = 0.46, vertical center x = 0.375. Always visible. |
| Reference toggle | Shows/hides the Reference layer. Default on each time the screen opens. |
| Reference label | "Reference: <Round name>", or "Reference: <name> (not aligned)", or "No reference photo" |
| Rotation readout | Current rotation in degrees, one decimal, e.g. "Rotation −1.5°" |
| Reset button | "Reset to auto" if `autoTransform` exists, else "Reset" |
| Hint | "Drag, pinch and rotate to put shoulders and hips on the lines." Shown until the first gesture each time the screen opens. |

| State | When | Must show |
| :--- | :--- | :--- |
| `loading` | Display images decoding, shown only after 200 ms | Thumbnail placeholder; gestures disabled |
| `ready` | Images loaded, no change yet | All elements; Save disabled |
| `ready.noReference` | Reference Shot is `nil` | Guide lines only; Reference toggle hidden; label "No reference photo" |
| `edited` | Working transform ≠ starting transform | Save enabled |
| `saving` | Save tapped | Save and Cancel disabled (normally < 100 ms; no spinner) |
| `saveError` | Save failed | Toast "Couldn't save. Try again."; stays in `edited` |
| `discardConfirm` | Cancel tapped in `edited` | Dialog "Discard changes?" with Discard (destructive) and Keep Editing |
| `fileMissing` | The Shot's `display.jpg` and Original can't be loaded | "This photo's file is missing." Close button only |

## Gesture math

Working transform `T = (s, θ, t)` maps Original pixels to the Canvas: `c = s · R(θ) · p + t` ([01](01-data-model.md) §2).

The canvas view is drawn at height `h` points. Screen points convert to canvas units by dividing by `h`, measured from the canvas view's top-left corner.

Each gesture update gives, in canvas units: centroid `g`, scale factor `k` (since the last update), rotation `δ` radians (since the last update), translation `Δ` (since the last update). A one-finger drag gives `k = 1`, `δ = 0`. The new transform:

```
s' = k · s
θ' = θ + δ
t' = k · R(δ) · (t − g) + g + Δ
```

This keeps the point under the fingers fixed while scaling and rotating.

Recognizers: `DragGesture` (one finger), `MagnifyGesture` and `RotateGesture` (two fingers) run simultaneously. A two-finger move also pans through `Δ` of the centroid.

Limits (applied after each update):
1. Scale: `s' / s0` clamped to 0.4…5.0, with `s0 = AlignTransform.defaultFit(...).scale`.
2. Rotation: `θ'` clamped to −45°…+45°.
3. Translation: the photo's center point (`pixelWidth/2, pixelHeight/2` mapped through `T'`) clamped inside the Canvas rect (0…0.75, 0…1.0).
4. Snap: while `|θ'| ≤ 1°`, display and store `θ' = 0`. A light haptic plays once when entering the snap zone.

## Save and reset rules

1. Starting transform = `effectiveTransform` at the time the screen opened.
2. Reset sets the working transform to `autoTransform` if it is not `nil`, else to `defaultFit`. Reset is enabled whenever the working transform differs from that target.
3. Save:
   - If the working transform equals `autoTransform` exactly (the user reset and made no further gesture), set `manualTransform = nil` and `manualAlignedAt = nil`. The Shot goes back to its auto state.
   - Otherwise set `manualTransform` = working transform and `manualAlignedAt` = now.
   - Then `modelContext.save()` and close.
4. Save never changes `autoTransform`, `autoAlignState`, `autoAlignIssues`, the Original or any file.
5. Unsaved changes are not kept. If the app is killed while Manual Align is open, `manualTransform` keeps its previous value.

## Entry points

| From | Condition |
| :--- | :--- |
| Shot Detail → Adjust Alignment | Garment not archived; `alignDisplayState != aligning`; file present |
| Compare → Fix Alignment ([06](06-compare.md)) | Same conditions; opens for the Shot on the active side (Slider) or the current card (Stack) |
| Camera → last-shot thumbnail → Shot Detail sheet → Adjust Alignment | Same conditions |

## Rules and edge cases

### Required edge cases

| Case | Behavior |
| :--- | :--- |
| Permission denied | Not applicable; no permission needed. |
| Pose not found | Main use case. The Shot opens in `defaultFit` (no `autoTransform`); Reset label is "Reset". |
| Two people in frame | The user lines up the right person by hand; nothing special in this screen. |
| Garment with one round | No Reference Shot unless another Round has this Angle → `ready.noReference` with guide lines. |
| Deleted round | Can't happen while open (modal). If the Reference Round was deleted earlier, the rule picks the next Reference Shot when the screen opens. |
| Storage full | Save writes only a record field (< 1 KB); allowed. If the save throws, `saveError`. |
| App killed mid-capture | Not applicable to this screen; for a kill while this screen is open, see rule 5. |

### Other rules

1. Manual Align never runs Vision.
2. The Reference Shot is never the Shot being edited.
3. Manual transforms survive a later auto-align run (auto-align never writes `manualTransform`, [04](04-auto-align.md) §7 rule 9).
4. VoiceOver users can't do multi-finger gestures reliably, so the Canvas exposes accessibility custom actions: Move Up / Down / Left / Right (0.01 canvas units), Bigger / Smaller (×1.02 / ÷1.02 about the canvas center), Rotate Left / Right (0.5°). They use the same math with `g` = canvas center.

## Data touched

| Entity.field | Read | Write |
| :--- | :--- | :--- |
| `Shot.autoTransform, manualTransform, pixelWidth, pixelHeight, angle` | ✓ | — |
| `Shot.manualTransform, manualAlignedAt` | ✓ | ✓ |
| Reference Shot `display.jpg`, `effectiveTransform`, `alignDisplayState`, Round name | ✓ | — |
| File `Photos/<shotID>/display.jpg` | ✓ | — |

## Acceptance criteria

1. Given a Shot with `autoAlignState == failed`, when Manual Align opens, then the Shot is drawn with `defaultFit` and the Reset button reads "Reset".
2. Given a Shot with an `autoTransform`, when Manual Align opens, then the Reset button reads "Reset to auto".
3. Given `ready`, then Save is disabled.
4. Given a one-finger drag of 100 pt on a canvas drawn at h = 500 pt, then `t` changes by exactly 0.2 canvas units in the drag direction (±0.001) and `s`, `θ` are unchanged.
5. Given a pinch with `k = 2` centered at `g`, then the canvas point at `g` maps to the same Original pixel before and after (±1e-6), and `s` doubles.
6. Given a rotation that ends at θ = 0.8°, then the stored and displayed rotation is 0.0° and a haptic fired once.
7. Given a pinch that would make `s / s0 = 6.0`, then `s / s0` is 5.0.
8. Given a rotation gesture of 60°, then θ is 45°.
9. Given an edited transform, when the user taps Save, then `manualTransform` equals the working transform, `manualAlignedAt` is set, `autoTransform` is unchanged, and the slot badge reads "Manual".
10. Given a Shot with `manualTransform` set, when the user taps Reset to auto, then Save, then `manualTransform == nil`, `manualAlignedAt == nil`, and `alignDisplayState` equals the auto state (`aligned` or `needsReview`).
11. Given `edited`, when the user taps Cancel, then the "Discard changes?" dialog shows; Discard closes without changing any field.
12. Given Proto 1 Front exists and Manual Align opens for Proto 2 Front, then the Reference label reads "Reference: Proto 1" and the Proto 1 image is drawn at 0.5 opacity.
13. Given Manual Align for the only Front Shot in the Garment, then `ready.noReference` shows and the Reference toggle is hidden.
14. Given `edited`, when the app is killed and relaunched, then `manualTransform` equals its value before the screen opened.
15. Given VoiceOver on, when the user triggers the custom action Move Up, then `t.y` decreases by 0.01.
16. Given an iPhone 13, when the user pinches and rotates continuously for 10 s, then no frame takes over 16.7 ms more than 5% of the time (Instruments, Animation Hitches).

## Definition of Done

- [ ] Manual Align screen with all states.
- [ ] `ManualAlignMath` (pure functions: apply gesture, clamp, snap) has no SwiftUI dependency and full unit tests.
- [ ] Save and reset rules 1–5 implemented exactly.
- [ ] Unit tests: AC 4, 5, 6, 7, 8, 9, 10, 14 (in-memory store for 9, 10, 14).
- [ ] UI tests: AC 1, 2, 3, 11, 12, 13, 15.
- [ ] Device test: AC 16 on iPhone 13; result in the PR.
- [ ] Test Stats event `manualAlignSaved` fires once per Save that writes a non-nil `manualTransform` ([08](08-non-functional.md)).
- [ ] All strings in the String Catalog.

## Test plan

Unit:
- Gesture composition: drag only; pinch only at off-center `g`; rotate only at `g`; combined; sequence of 100 small updates equals one large update (±1e-6).
- Clamps at each limit and just inside.
- Snap zone entry/exit; haptic fires once per entry.
- Save rule: equal-to-auto → nil; any other → stored.

UI (seeded store with a `failed` Shot, a `lowConfidence` Shot and a reference):
- Open from Shot Detail; drag; Save; badge "Manual".
- Reset to auto; Save; badge gone.
- Cancel with and without changes.

Manual (device):
- Align a `dress_form` fixture photo by hand against a reference in ≤ 20 s; record time for 5 tries.
- Use the screen with the phone on a table (two hands) and in one hand (drag only); note which steps need two hands.
- VoiceOver custom actions reach a level shoulder line.

## Decisions made

| Decision | Reason |
| :--- | :--- |
| Move the photo, not the reference | The edited Shot is the one being saved; moving the reference would be confusing. |
| Guide lines always on | They are the target in the Canvas; the reference can be off. |
| Fixed 50% reference opacity | Fewer controls; 50% shows both images equally. |
| Snap rotation to 0° within ±1° | Most fit photos should be level; snapping removes tiny tremor errors. |
| Reset + Save with an equal transform clears `manualTransform` | Gives users a way back to auto without a separate "Remove manual" button. |
| No nudge buttons on screen (VoiceOver actions only) | Keeps the screen simple; gestures are fast for sighted users. |
| No draft persistence | Edits take seconds; a draft store adds rules for little gain. |

## Open questions

None.
