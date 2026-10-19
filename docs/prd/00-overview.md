# 00 — Overview

Working name: **FitLog** (placeholder; not a brand).

## 1. Product summary

FitLog keeps fit photos of a garment sample in order: one Garment per sample style, one Round per fitting, and one Shot for each Angle (front, side, back). It lines up each photo on the body automatically. Then the user can compare two rounds with a swipe slider, or flip through every round in a stack.

## 2. Users

Primary user: indie fashion brand founders, pattern makers and sample makers in teams of 1–10 people.

Context (from the brief, not from research):
- They work fast, in a studio.
- They often hold the phone in one hand.
- They shoot each sample on a body at each fitting.

Assumptions (not verified; tested in the 5-user test, see [09-release-plan.md](09-release-plan.md)):
- A1. Most fittings use a live fit model, not a dress form.
- A2. The same person shoots all fittings of one garment on one iPhone.
- A3. Three angles (front, side, back) cover the comparison they need.
- A4. A studio has about 1.8 m of free distance in front of the model. This is enough for a full-body shot of a 1.75 m person with the 1× lens (geometry is in [03-guided-camera.md](03-guided-camera.md) rule 20).
- A5. Users already shoot photos at each fitting. FitLog replaces the camera roll; it does not create a new habit.

## 3. Problem

Fit photos sit in the camera roll, mixed with everything else. Each one is shot from a different distance and angle. To compare Proto 1 with Proto 2, the user must find both photos, then judge changes while the body sits in a different place and size in each frame. Small changes (a shoulder seam moved 1 cm, a hem raised 2 cm) are hard to see.

## 4. MVP scope

1. Create, rename, archive and delete Garments. → [02](02-garments-and-rounds.md)
2. Create, rename, reorder and delete Rounds per Garment. → [02](02-garments-and-rounds.md)
3. Guided camera with a ghost overlay of the matching Angle from the Reference Shot. → [03](03-guided-camera.md)
4. Auto-align with body landmarks. The original is never changed; the transform is stored apart from it. → [04](04-auto-align.md)
5. Compare: Slider mode (two Rounds, one Angle) and Stack mode (all Rounds, one Angle). → [06](06-compare.md)
6. Import from the photo library, with auto-align. → [07](07-import.md)
7. Manual align when auto-align fails or has low confidence. → [05](05-manual-align.md)

Platform: iPhone only, iOS 17.0+, SwiftUI, portrait only. Pose detection: Apple Vision (`VNDetectHumanBodyPoseRequest`). Storage: on-device only (SwiftData + files).

## 5. Out of scope for MVP

Markups, notes, measurements, tech packs, factory export, sharing, accounts, teams, Android, iPad layouts, cloud backup, cloud sync, login, server, paywall, self-timer, zoom and lens switching in the camera, multiple Shots per Angle per Round, landscape UI, localization beyond English.

## 6. Where a paywall could go later (do not build)

| Spot | Free tier idea | Paid idea |
| :--- | :--- | :--- |
| New Garment Sheet | Up to 3 active Garments | Unlimited Garments |
| Compare, Stack mode | Slider mode only | Stack mode |
| Future export (not MVP) | — | Export a compare as image or PDF |

The code must not include a paywall, StoreKit, or feature flags for one in the MVP.

## 7. Success metrics

FitLog has no network analytics (see [08-non-functional.md](08-non-functional.md)). We measure in the 5-user TestFlight test, with on-device Test Stats and interviews.

| ID | Metric | Target |
| :--- | :--- | :--- |
| S1 | Shots with `autoAlignState == succeeded` (no manual fix needed), out of all Shots taken by testers | ≥ 80% |
| S2 | Shots where a tester saved a manual transform, out of all Shots | ≤ 20% |
| S3 | Median time from Camera open to the third Angle captured (Test Stats `roundCaptureSeconds`) | ≤ 60 s |
| S4 | Testers who complete the 5 test tasks unaided in session 1 | ≥ 4 of 5 |
| S5 | Testers who use FitLog at ≥ 2 real fittings in the 2-week test | ≥ 3 of 5 |
| S6 | Data loss incidents (a captured or imported photo missing later) | 0 |
| S7 | Crash-free sessions (TestFlight crash reports) | ≥ 99% |
| S8 | False success: a Shot marked `succeeded` that is visibly or measurably wrong. On the align test set (error limits in [04](04-auto-align.md) §9) and in the field (confirmed in the exit interview). | 0 in both |

## 8. PRD index and dependencies

| File | Content | Depends on |
| :--- | :--- | :--- |
| [01-data-model.md](01-data-model.md) | Entities, fields, file layout, migrations | — |
| [02-garments-and-rounds.md](02-garments-and-rounds.md) | Garment List, Garment Detail, Round Detail, Shot Detail | 01 |
| [03-guided-camera.md](03-guided-camera.md) | Camera, ghost overlay, capture | 01, 02, 04 |
| [04-auto-align.md](04-auto-align.md) | Landmarks, transform math, confidence, test set | 01 |
| [05-manual-align.md](05-manual-align.md) | Manual Align screen and gestures | 01, 04 |
| [06-compare.md](06-compare.md) | Slider and Stack modes | 01, 02, 04, 05 |
| [07-import.md](07-import.md) | Photo picker, Import Assign, auto-align on import | 01, 02, 04 |
| [08-non-functional.md](08-non-functional.md) | Performance, storage, privacy, accessibility, crash handling, Test Stats, Settings | all |
| [09-release-plan.md](09-release-plan.md) | Milestones, TestFlight, 5-user test | all |
| [99-review.md](99-review.md) | Risks and all open questions | all |

Build order is in [09-release-plan.md](09-release-plan.md).

## 9. Screen list (names used in every file)

| Screen | Owner PRD |
| :--- | :--- |
| Garment List | 02 |
| Archived Garments | 02 |
| New Garment Sheet | 02 |
| Rename Garment Sheet | 02 |
| Garment Detail | 02 |
| New Round Sheet | 02 |
| Rename Round Sheet | 02 |
| Round Detail | 02 |
| Shot Detail | 02 |
| Camera | 03 |
| Manual Align | 05 |
| Compare | 06 |
| Round Picker Sheet | 06 |
| Import Assign | 07 |
| Settings | 08 |
| Test Stats | 08 (TestFlight builds only) |

Screen states are written as `Screen Name / stateName`, for example `Camera / permissionDenied`.

## 10. Glossary

| Term | Meaning |
| :--- | :--- |
| Garment | One sample style being fitted. Entity `Garment`. |
| Round | One fitting of a Garment, e.g. Proto 1. Entity `Round`. |
| Shot | One photo of one Angle in one Round. Entity `Shot`. At most one Shot per (Round, Angle). |
| Angle | `front`, `side` or `back`. Enum `Angle`. Shown as Front, Side, Back. |
| Original | The photo file exactly as captured or imported (`original.heic`, `.jpg` or `.png`). Never changed. |
| Display image | `display.jpg`, a 2048 px long-edge copy used for alignment and on-screen rendering. |
| Thumbnail | `thumb.jpg`, a 400 px long-edge copy used in lists. Not aligned. |
| Canvas | The shared 3:4 portrait frame every aligned Shot is drawn into. Width 0.75, height 1.0, in canvas units. |
| Canonical points | Fixed canvas positions the body is moved to: shoulder midpoint (0.375, 0.24), hip midpoint (0.375, 0.46). |
| `AlignTransform` | Scale, rotation, translation that maps Original pixels into the Canvas. |
| Auto transform | `Shot.autoTransform`, written by auto-align. |
| Manual transform | `Shot.manualTransform`, written by Manual Align. |
| Default fit transform | Fits the whole Original inside the Canvas, centered, no rotation. Used when no other transform exists. |
| Effective transform | `manualTransform ?? autoTransform ?? defaultFit`. What every screen renders. |
| Reference Shot | The Shot used as the ghost in Camera and as the overlay in Manual Align. Rule in [01](01-data-model.md) §6. |
| Ghost | The Reference Shot drawn semi-transparent over the live camera preview. |
| Framing Guide | Lines for shoulder, hip, ankle and center, shown when no Reference Shot exists. |
| Align display state | What the UI shows for a Shot: `aligning`, `aligned`, `needsReview`, `notAligned`, `manuallyAligned`. |
| Joint / landmark | A body point from Vision (e.g. `leftShoulder`) with a confidence from 0 to 1. |
| Test Stats | On-device usage counters, in TestFlight builds only. |
