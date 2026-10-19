# 04 — Auto-align

## Goal

For every new Shot, find the body with Apple Vision and compute an `AlignTransform` that moves it to the same place, size and tilt in the Canvas. Then the same body lines up across Rounds. The Original is never changed. When the result may be wrong, say so instead of showing a silently bad alignment.

## User stories

1. As a designer, I want every new photo lined up on the body without doing anything, so that I can compare Rounds straight away.
2. As a pattern maker, I want photos shot from different distances or with a tilted phone to line up, so that I see the garment change, not the camera change.
3. As a sample maker, I want the app to tell me when it isn't sure about an alignment, so that I can fix it before I trust a comparison.
4. As a designer, I want my original photos kept untouched, so that I can always go back to them.

## Flow (happy path)

1. `ShotRepository` saves a new Shot with `autoAlignState = pending` ([01](01-data-model.md) §7) and calls `AlignmentService.enqueue(shotID, priority: .userInitiated)`.
2. `AlignmentService` loads `Photos/<shotID>/display.jpg`.
3. It runs `VNDetectHumanBodyPoseRequest` (revision pinned to `VNDetectHumanBodyPoseRequestRevision1`) with `VNImageRequestHandler(cgImage:orientation: .up)`. The Display image is already upright, so orientation is always `.up`.
4. It picks the primary body (§4), converts joints to Original pixels (§3), and computes the transform (§5).
5. It runs the checks (§6) and sets `autoAlignState`, `autoAlignIssues`, `autoAlignMode`, `autoConfidence`, `autoTransform`, `poseLandmarks`, `alignAlgorithmVersion = 1`.
6. It confirms the Shot still exists, writes the fields with a `@ModelActor` context, and saves.
7. Screens observing the Shot update: the Angle Slot goes from `aligning` to `aligned` (or `needsReview` / `notAligned`).

## Screens and states

Auto-align has no screen of its own. Its result shows in these places:

| Place | States shown | Defined in |
| :--- | :--- | :--- |
| Round Detail Angle Slot | `aligning`, `aligned`, `needsReview`, `notAligned` | [02](02-garments-and-rounds.md) |
| Garment List / Garment Detail rows | "n to check" count | [02](02-garments-and-rounds.md) |
| Shot Detail status line | Text per `alignDisplayState` + issue texts (§6 table) | [02](02-garments-and-rounds.md) |
| Camera last-shot thumbnail | "Aligning…", then a "Check" or "Not aligned" mark | [03](03-guided-camera.md) |
| Import Assign progress | "Aligning…" per row after import | [07](07-import.md) |
| Compare | "Check alignment" / "Not aligned" label on a side or card | [06](06-compare.md) |

## 1. Constants (`AlignConfig`)

All numbers live in one struct, `AlignConfig`, so tuning touches one place.

| Constant | Value | Meaning |
| :--- | :--- | :--- |
| `canvasWidth` | 0.75 | Canvas width (canvas units) |
| `canvasHeight` | 1.0 | Canvas height |
| `canonicalShoulderMid` | (0.375, 0.24) | Target shoulder midpoint |
| `canonicalHipMid` | (0.375, 0.46) | Target hip midpoint (translation anchor) |
| `canonicalAnkleMid` | (0.375, 0.812) | Target ankle midpoint (Framing Guide; fullBody) |
| `canonicalTorsoLength` | 0.22 | Shoulder-mid to hip-mid distance |
| `canonicalShoulderToAnkle` | 0.572 | Shoulder-mid to ankle-mid distance (= 0.22 × 2.6) |
| `hipFractionOfShoulderToAnkle` | 0.3846 | 0.22 / 0.572 |
| `jointPresentConfidence` | 0.3 | Below this, a joint counts as missing |
| `jointHighConfidence` | 0.6 | Below this, `lowJointConfidence` |
| `minJointsPerBody` | 4 | An observation with fewer present joints is ignored |
| `secondPersonAreaRatio` | 0.6 | Second body ≥ this × primary area → `multiplePeople` |
| `shoulderTiltToleranceDegrees` | 8 | Max gap between shoulder and torso rotation estimates |
| `maxRotationDegrees` | 20 | Above this, `largeRotation` |
| `minTorsoFraction` | 0.08 | Torso length < this × Original height → `personTooSmall` |
| `minShoulderToAnkleFraction` | 0.20 | Same check for fullBody mode |
| `shoulderWidthRatioRange` | 0.45…1.4 | Shoulder width / torso length allowed range (front/back) |
| `algorithmVersion` | 1 | Written to `alignAlgorithmVersion` |

Assumption: the 2.6 ratio (shoulder→ankle ÷ shoulder→hip) comes from typical adult proportions: shoulder ≈ 0.82, hip joint ≈ 0.52, ankle ≈ 0.04 of standing height. It is not measured on FitLog users.

The confidence and ratio thresholds are starting values. In milestone M3 ([09](09-release-plan.md)) they are tuned on the test image set. A change is allowed only if every acceptance criterion still passes. Any new value is written back into this table with the date.

## 2. Landmarks used

| Vision joint (`VNHumanBodyPoseObservation.JointName`) | Used for |
| :--- | :--- |
| `.leftShoulder`, `.rightShoulder` | Rotation (front/back), scale, shoulder midpoint |
| `.leftHip`, `.rightHip` | Scale, translation anchor (hip midpoint) |
| `.leftAnkle`, `.rightAnkle` | fullBody fallback when hips are missing |

Not used: `.neck` and `.root` (derived by Vision from the shoulders and hips, so they add no information), and arms, knees, head (they move with pose, not with the camera).

Decision: 2D only, no `VNDetectHumanBodyPose3DRequest`. Reason: a 2D similarity transform is all the Canvas needs, and 2D runs faster and on all iOS 17 devices.

## 3. Coordinates

1. Vision returns normalized points `(xn, yn)` with origin bottom-left.
2. Display pixels: `xd = xn · Wd`, `yd = (1 − yn) · Hd`, where `Wd × Hd` is the Display image size.
3. Original pixels: `x = xd · k`, `y = yd · k`, with `k = pixelWidth / Wd`. The Display image is a uniform, upright downscale, so one `k` works for both axes.
4. `poseLandmarks` stores Display pixels (2). `autoTransform` is in Original pixels (3).

## 4. Choosing the primary body

1. Ignore observations with fewer than `minJointsPerBody` joints at confidence ≥ `jointPresentConfidence`.
2. If none remain → `failed`, issue `noPersonFound`.
3. For each remaining observation, compute the bounding box of its present joints (normalized) and its area.
4. Primary = largest area. If two areas are within 5% of each other, pick the one whose box center is nearer the image center.
5. If any other observation's area ≥ `secondPersonAreaRatio` × primary area → issue `multiplePeople`.
6. `poseLandmarks.bodyCount` = number of observations kept in step 1.

## 5. Transform math

Notation: points in Original pixels, y down. `|a|` = vector length. `R(θ)` and the mapping `c = s · R(θ) · p + t` are as in [01](01-data-model.md) §2. `wrap(x)` wraps an angle to (−π, π].

Joint letters: `Ls, Rs` shoulders; `Lh, Rh` hips; `La, Ra` ankles. "Present" = confidence ≥ 0.3.

### 5.1 Front and back — `torso` mode

Needs `Ls, Rs, Lh, Rh` all present.

```
S = (Ls + Rs) / 2                      shoulder midpoint
P = (Lh + Rh) / 2                      hip midpoint
u = P − S                              torso vector (points down)
d = |u|                                torso length

scale:      s = canonicalTorsoLength / d                    = 0.22 / d

rotation:   v = Rs − Ls;  if v.x < 0 then v = −v            (left-to-right on screen)
            θ_shoulder = −atan2(v.y, v.x)                   levels the shoulder line
            θ_torso    = wrap(π/2 − atan2(u.y, u.x))        makes the torso vertical
            if |wrap(θ_shoulder − θ_torso)| ≤ 8°:  θ = θ_shoulder
            else:                                  θ = θ_torso, add issue shoulderTilt

offset:     t = canonicalHipMid − s · R(θ) · P
```

Why both estimates: the brief asks for rotation from the shoulder line, and that is right for a normal standing pose. A raised arm lifts one shoulder joint, so when the two estimates disagree by more than 8°, the torso axis is the safer one.

Flipping `v` so `v.x ≥ 0` makes front and back work the same, since Vision's left/right labels swap on screen between the two.

### 5.2 Front and back — `fullBody` mode (hips missing)

Used when `torso` mode is not possible but `Ls, Rs, La, Ra` are all present.

```
S = (Ls + Rs) / 2
A = (La + Ra) / 2                      ankle midpoint
u = A − S
D = |u|
s = canonicalShoulderToAnkle / D       = 0.572 / D
θ  as in 5.1 (same tilt rule, using this u)
P_est = S + hipFractionOfShoulderToAnkle · u     estimated hip midpoint
t = canonicalHipMid − s · R(θ) · P_est
issue hipsEstimated (always)
```

### 5.3 Side — `torso` mode

Needs at least one present shoulder and at least one present hip. (In profile, the far-side joints are often hidden.)

```
S = mean of present shoulders
P = mean of present hips
u = P − S;  d = |u|
s = 0.22 / d
θ = wrap(π/2 − atan2(u.y, u.x))        torso axis vertical; shoulder line is not used in profile
t = canonicalHipMid − s · R(θ) · P
```

### 5.4 Side — `fullBody` mode

No present hip, but at least one shoulder and one ankle: same as 5.2, with `S` and `A` as means of the present joints, and `θ` from the torso axis only. Add `hipsEstimated`.

### 5.5 Nothing fits

If no mode's required joints are present → `failed`, issue `requiredJointsMissing`.

### 5.6 Worked example (use as a unit test)

Original 3024 × 4032, front. `Ls = (1700, 1200)`, `Rs = (1300, 1220)`, `Lh = (1620, 2000)`, `Rh = (1400, 2010)`, all confidence 0.9.

| Value | Result |
| :--- | :--- |
| `S` | (1500, 1210) |
| `P` | (1510, 2005) |
| `d` | 795.0629 |
| `s` | 2.767077e-4 |
| `θ_shoulder` | +2.8624° |
| `θ_torso` | +0.7207° |
| Gap | 2.14° ≤ 8° → `θ = θ_shoulder` = 0.0499584 rad |
| `t` | (−0.0146019, −0.1149720) |
| Check: `T(P)` | (0.375000, 0.460000) |
| Check: `T(Ls).y` and `T(Rs).y` | both 0.240154 (shoulders level) |

Tolerance in tests: 1e-5 on each value.

## 6. Checks, issues and state

Run after the transform is computed (or after it fails).

| Issue | Rule | Effect | Text shown to user |
| :--- | :--- | :--- | :--- |
| `imageUnreadable` | `display.jpg` can't be decoded, or Vision throws twice in a row | `failed` | "Photo couldn't be read" |
| `noPersonFound` | §4 step 2 | `failed` | "No person found in the photo" |
| `requiredJointsMissing` | §5.5 | `failed` | "Shoulders or hips not visible" |
| `personTooSmall` | `torso`: `d < 0.08 × pixelHeight`; `fullBody`: `D < 0.20 × pixelHeight` | `failed` | "Person is too small in the frame" |
| `multiplePeople` | §4 step 5 | `lowConfidence` | "More than one person in the photo" |
| `shoulderTilt` | §5.1 tilt rule chose the torso axis | `lowConfidence` | "Shoulders look uneven (raised arm?)" |
| `hipsEstimated` | `fullBody` mode was used | `lowConfidence` | "Hips hidden; position estimated from feet" |
| `unusualProportions` | Front/back `torso` mode only: `|Rs − Ls| / d` outside 0.45…1.4 | `lowConfidence` | "Body may be turned" |
| `largeRotation` | `|θ| > 20°` | `lowConfidence` | "Photo is tilted more than 20°" |
| `lowJointConfidence` | `autoConfidence < 0.6` | `lowConfidence` | "Body points are unclear" |

- `autoConfidence` = the lowest confidence among the joints used in the chosen mode.
- State: any `failed` issue → `failed`, and `autoTransform = nil`, `autoAlignMode = nil`. Else any issue → `lowConfidence`. Else → `succeeded`.
- `lowConfidence` keeps and uses the transform. The UI shows "Check alignment".
- `failed` Shots render with `defaultFit` until the user aligns them by hand ([05](05-manual-align.md)).
- `poseLandmarks` is stored whenever a primary body was found, even on `failed`.

## 7. Job handling

1. `AlignmentService` is an actor with one serial queue. One job runs at a time. Reason: Vision uses the Neural Engine/GPU, and parallel jobs slow capture.
2. Priority: `.userInitiated` for Shots just captured or imported; `.utility` for the launch backlog. A new `.userInitiated` job runs before queued `.utility` jobs.
3. Enqueueing a Shot that is already queued or running does nothing.
4. If Vision throws, retry once. Two failures → `failed` with `imageUnreadable`.
5. Hard timeout per job: 5 s. On the first timeout, the job is re-queued once at `.utility`. A second timeout on the same Shot in the same app session marks it `failed` with `imageUnreadable`.
6. Jobs started while the app is active continue in a `beginBackgroundTask` when the app goes to background. If the OS expires the task, the Shot stays `pending`.
7. On `scenePhase == .active`, every `pending` Shot is enqueued at `.utility`.
8. Before writing, the job re-fetches the Shot by `id`. If it is gone, the result is dropped.
9. The job never touches `manualTransform` or `manualAlignedAt`.

## 8. Performance budget

| Metric | iPhone 13 (reference) | iPhone XS (oldest iOS 17 device) |
| :--- | :--- | :--- |
| Vision request on a 2048 × 1536 Display image, p90 | ≤ 300 ms | ≤ 600 ms |
| Transform math + checks | ≤ 1 ms | ≤ 2 ms |
| Whole job (decode display.jpg + Vision + math + save), p90 | ≤ 400 ms | ≤ 800 ms |
| Extra memory during a job | ≤ 120 MB | ≤ 120 MB |
| Main-thread work per job | ≤ 4 ms (the save notification only) | ≤ 8 ms |

Measured with `os_signpost` intervals named `AlignJob` and `VisionPose`, and an XCTest `measure` block (10 runs) on the physical devices, over the `good_front` fixtures.

Decision: run Vision on the 2048 px Display image, not the Original. Reason: Vision downsizes internally anyway, and decoding a 12–48 MP HEIC costs more than the request itself.

## 9. Test image set

Folder: `FitLogTests/AlignFixtures/`. Not part of the app bundle.

Per image:
- `<caseID>_<n>.jpg` (or `.heic`), as shot.
- `<caseID>_<n>.json` with: `angle`, `expectedStates` (list of allowed `AutoAlignState`), `requiredIssues` (list), and hand-labeled ground-truth points in Original pixels for `leftShoulder`, `rightShoulder`, `leftHip`, `rightHip`, `leftAnkle`, `rightAnkle` (`null` when not visible).

Supply: the owner provides at least 3 photos per case (≥ 57 images), with written consent from each person shown, before milestone M3. Photos come from real fittings where possible. The developer labels the points with a simple labeling tool or Preview + a script, and a second person spot-checks 10% of the labels.

| Case ID | Description | Angle | Allowed states | Required issues |
| :--- | :--- | :--- | :--- | :--- |
| `good_front` | Standing straight, arms relaxed, full body, even light | front | `succeeded` | — |
| `good_side` | Profile, full body | side | `succeeded` | — |
| `good_back` | Back view, full body | back | `succeeded` | — |
| `arm_raised` | One arm overhead (checking armhole) | front | `succeeded`, `lowConfidence` | — |
| `side_angle` | Body turned 30–45° (three-quarter) but labeled front | front | `succeeded`, `lowConfidence` | — |
| `cropped_feet` | Frame ends at mid-shin; no ankles | front | `succeeded` | — |
| `loose_garment_hips` | Oversized coat or full skirt hides hips; feet visible | front | `succeeded`, `lowConfidence` | — (expect `hipsEstimated` when hips are not found) |
| `low_light` | Dim studio light, high ISO noise | front | `succeeded`, `lowConfidence`, `failed` | — |
| `two_people` | Fitter pinning the garment next to the model | front | `lowConfidence` | `multiplePeople` |
| `mirror_reflection` | Model in front of a studio mirror, reflection visible | front | `succeeded`, `lowConfidence` | — |
| `no_person` | Garment on a hanger | front | `failed` | `noPersonFound` |
| `dress_form` | Garment on a headless dress form | front | `failed`, `lowConfidence` | — |
| `tilted_phone` | Phone rolled 10–15° | front | `succeeded` | — |
| `far_small` | Person very far; torso < 8% of height | front | `failed` | `personTooSmall` |
| `upper_body` | Close shot cropped at the knees | front | `succeeded` | — |
| `exif_rotated` | JPEG stored sideways with EXIF orientation 6 | front | same as its upright copy | — |
| `landscape` | Landscape photo, full body | front | `succeeded` | — |
| `pair_distance` | Same person and garment, shot at 2 m and at 3 m | front | `succeeded` both | — |
| `pair_tilt` | Same person and garment, phone at 0° and at 12° | front | `succeeded` both | — |

### Error limits (computed from ground truth, not from Vision's points)

Let `T` = the computed `autoTransform`. GT = ground truth.

| Error | Definition | Limit (`torso`) | Limit (`fullBody`) |
| :--- | :--- | :--- | :--- |
| `E_hip` | `|T(GT hip mid) − (0.375, 0.46)|` | ≤ 0.020 | ≤ 0.040 |
| `E_torso` | `| |T(GT S) − T(GT P)| − 0.22 | / 0.22` | ≤ 5% | ≤ 10% |
| `E_rot` (front/back) | Angle of `T(GT Rs) − T(GT Ls)` from horizontal | ≤ 2° (≤ 3° for `arm_raised`) | ≤ 3° |
| `E_rot` (side) | Angle of `T(GT P) − T(GT S)` from vertical | ≤ 2° | ≤ 3° |
| `E_pair` (pair cases) | Distance between the two Shots' `T(GT hip mid)`, and between their `T(GT shoulder mid)` | ≤ 0.015 each | — |

For cases where GT hips are hidden (`loose_garment_hips`), the labeler marks the best-guess hip joints and sets `"hipsGuessed": true`; that case uses the `fullBody` limits.

A fixture **passes** when its state is in `allowedStates`, its `requiredIssues` are all present, and, if the state is `succeeded`, every error is within its limit. If the state is `lowConfidence`, errors are reported but not enforced.

**False success** = a fixture with state `succeeded` and any error over its limit. The suite fails on any false success.

## Rules and edge cases

### Required edge cases

| Case | Behavior |
| :--- | :--- |
| Permission denied | Not applicable. Auto-align needs no permission; it reads files FitLog already owns. |
| Pose not found | `failed` + `noPersonFound` or `requiredJointsMissing`. Shot renders with `defaultFit`, badge "Not aligned". |
| Two people in frame | Primary = largest body (§4). `multiplePeople` → `lowConfidence`, badge "Check alignment". |
| Garment with one round | No effect. Every Shot aligns to the fixed Canvas, not to another Round. |
| Deleted round | A running job for a Shot in it drops its result (§7 rule 8). |
| Storage full | The job writes no files, only a record update (< 2 KB). If the save fails, the Shot stays `pending` and is retried later. |
| App killed mid-capture | Shot saved as `pending`; re-enqueued by the launch check ([01](01-data-model.md) §8 step 7). If killed before the record saved, there is no Shot to align. |

### Other rules

1. Every Shot is aligned to the Canvas, never to another Shot. So any two Shots of the same Angle can be compared, and a bad earlier Round never spreads its error.
2. Rotation is applied about the canvas origin; the offset step (`t`) makes the anchor land correctly. No other pivot math is needed.
3. Mirrored front/back are not detected. The user picks the Angle; FitLog trusts it.
4. Very large `s` (tiny body) is blocked by `personTooSmall`. Very small `s` (body larger than the frame) is allowed; the Canvas simply crops.
5. `exif_rotated` works because the Display image is written upright ([01](01-data-model.md) §7) and `pixelWidth/Height` are upright sizes.

## Data touched

| Entity.field | Read | Write |
| :--- | :--- | :--- |
| `Shot.id, angle, pixelWidth, pixelHeight` | ✓ | — |
| `Shot.autoAlignState, autoAlignIssues, autoAlignMode, autoConfidence, autoTransform, poseLandmarks, alignAlgorithmVersion` | ✓ | ✓ |
| `Shot.manualTransform` | — | never |
| File `Photos/<shotID>/display.jpg` | ✓ | — |

## Acceptance criteria

1. Given the worked example joints (§5.6), when the math runs, then `s`, `θ`, `t` match the table within 1e-5.
2. Given synthetic joints made by applying a known similarity transform (scale 0.5–3.0, rotation −15°…+15°, any offset) to the canonical points, when the math runs on 1,000 random cases, then the recovered transform maps the hip midpoint to (0.375, 0.46) within 1e-6 and levels the shoulders within 0.01°.
3. Given front joints where the shoulder line is tilted 12° and the torso axis is vertical, then `θ = θ_torso` and `autoAlignIssues` contains `shoulderTilt`.
4. Given front joints with hips at confidence 0.1 and ankles at 0.9, then `autoAlignMode == fullBody` and issues contain `hipsEstimated`.
5. Given side joints with only `rightShoulder` and `rightHip` present, then `autoAlignMode == torso` and the state is not `failed`.
6. Given two bodies where the second's area is 70% of the first, then issues contain `multiplePeople` and the transform uses the larger body.
7. Given a torso length of 5% of `pixelHeight`, then the state is `failed` with `personTooSmall` and `autoTransform == nil`.
8. Given all used joints at confidence ≥ 0.6 and no other issue, then the state is `succeeded` and `autoAlignIssues` is empty.
9. Given a Shot with `manualTransform` set, when auto-align runs, then `manualTransform` and `manualAlignedAt` are byte-identical before and after.
10. Given a Shot deleted while its job runs, when the job finishes, then no error is thrown and no record is created.
11. Given the full test image set, when `AlignFixtureTests` runs on an iPhone 13, then every fixture passes and the false-success count is 0.
12. Given the fixtures `good_front`, `good_side`, `good_back`, `cropped_feet`, `tilted_phone`, `upper_body`, `landscape`, `exif_rotated`, then ≥ 90% of them end `succeeded`.
13. Given 10 runs over `good_front` on an iPhone 13, then the `AlignJob` p90 is ≤ 400 ms and `VisionPose` p90 is ≤ 300 ms.
14. Given the same on an iPhone XS, then `AlignJob` p90 ≤ 800 ms and `VisionPose` p90 ≤ 600 ms.
15. Given 30 `pending` Shots at launch, when the backlog runs, then the Garment List scrolls with no frame over 33 ms (Instruments, Hitches template) and all 30 finish within 30 s on an iPhone 13.
16. Given a Shot that is captured while 20 backlog jobs are queued, then its job starts before the remaining backlog jobs.

## Definition of Done

- [ ] `AlignConfig`, `AlignmentService`, `PoseAligner` (pure math: joints in → transform + issues out, no Vision, no I/O) exist.
- [ ] `PoseAligner` has no dependency on Vision, SwiftData or UIKit, so it is unit-testable with plain structs.
- [ ] All 16 acceptance criteria pass; 1–10 run in the simulator on every build.
- [ ] `AlignFixtureTests` (11, 12) and performance tests (13, 14) run on physical devices before every TestFlight build; the report `AlignFixtureReport.csv` (case, state, issues, E_hip, E_torso, E_rot, ms) is attached to the build notes.
- [ ] `os_signpost` intervals `AlignJob` and `VisionPose` are present.
- [ ] Any threshold change is reflected in the §1 table with a date.
- [ ] Issue texts in §6 are in the String Catalog.

## Test plan

Unit (simulator, every build):
- Worked example (§5.6).
- Randomized synthetic recovery (AC 2), front, back and side.
- Branches: tilt rule both ways; `fullBody` front and side; side with one shoulder and one hip; nothing fits; `personTooSmall` for both modes; `unusualProportions` at 0.44 and 1.41; `largeRotation` at 20.1°; `lowJointConfidence` at 0.59.
- Primary body choice: largest; tie within 5% → center; observations with 3 joints ignored.
- Coordinate conversion: Vision bottom-left to pixels; Display → Original scale `k`.

Integration (simulator):
- `AlignmentService` with a fake pose detector: priority order, dedupe, retry-once on error, first timeout re-queues, second timeout → `failed`, deleted Shot dropped, `manualTransform` untouched.

Device (before each TestFlight build):
- `AlignFixtureTests` over all cases in §9, including the named cases: good pose (`good_front`/`good_side`/`good_back`), arm raised (`arm_raised`), side angle (`side_angle` and `good_side`), cropped feet (`cropped_feet`), loose garment hiding hips (`loose_garment_hips`), low light (`low_light`).
- Performance tests on iPhone 13 and iPhone XS.

Manual:
- Shoot 3 Rounds of one garment on a real person at 2 m, 2.5 m and 3 m with slight tilt; open Compare; the shoulder and hip lines visibly match (record E_pair from a screenshot overlay if in doubt).
- Shoot a dress form and a hanger; confirm no `succeeded` badge-free result on a clearly wrong alignment.

## Decisions made

| Decision | Reason |
| :--- | :--- |
| Align every Shot to a fixed Canvas, not to the previous Round | Any pair compares; errors don't chain; no re-align when a Round is deleted or reordered. |
| Similarity transform (scale, rotate, translate), no perspective warp | Two body points define it fully; warps would bend the garment and mislead fit judgment. |
| Scale from shoulder–hip distance | Least affected by arm pose and garment length. |
| Rotation from shoulder line, with torso-axis fallback past 8° | Follows the brief for normal poses; guards against a raised arm. |
| Side view uses the torso axis only | In profile the two shoulders overlap, so the shoulder line is noise. |
| `fullBody` fallback with ankles | Loose garments often hide hips; feet are usually visible in fit photos. |
| `lowConfidence` still applies the transform | It is usually close; the badge asks the user to check instead of showing a raw photo. |
| Run on the Display image | Faster; same accuracy for body-scale landmarks. |
| Pin Vision request revision 1 | An OS update must not silently change results between Rounds. |

## Open questions

None. Dress-form usage is a product question, listed in [99-review.md](99-review.md) Q2.
