# 99 — Critical review

My own review of PRDs 00–09: the weakest assumptions, the top risks, and every open question for the owner in one place.

## 1. Weakest assumptions

| # | Assumption | Where it is used | Why it is weak | How we find out |
| :--- | :--- | :--- | :--- | :--- |
| A1 | Most fittings use a live model, not a dress form | 04 (Vision needs a human body) | Pattern makers often fit on dress forms. Vision may not detect a headless form at all. | `dress_form` fixtures in M3; interview question in 09 §4 |
| A2 | One person on one iPhone shoots all Rounds of a Garment | 01, 08 (on-device only) | Brief says teams of 1–10. Whoever shoots isn't always whoever reviews. | Interview; Q3 |
| A3 | Front, Side, Back are enough | 01 (one Shot per Angle) | Fit reviews often need detail shots (armhole, collar, hem) and 3/4 views. | Interview "missed features" ranking |
| A4 | ≈ 1.8 m free distance in front of the model | 03 (1× lens only) | Small studios and home studios may have less. With less, feet get cropped; the `torso` mode still works, but Compare loses the hem. | Session 1 observation in real studios |
| A5 | Users already shoot every fitting | 00 | If they only shoot sometimes, FitLog has fewer Rounds to compare and less value. | `activeDays`, interview |
| A6 | Shoulder→ankle ≈ 2.6 × shoulder→hip | 04 `fullBody` mode | Textbook proportion, not measured on fit models; varies by person and by Vision's joint placement. | `loose_garment_hips` fixture errors |
| A7 | Confidence thresholds 0.3 / 0.6 and the ratio ranges | 04 §1 | Starting values; Vision's confidence scale isn't documented as calibrated. | Tuning in M3 against the test set |
| A8 | Testers shoot front→side→back in that order when importing | 07 default Angles | Plausible habit, not observed. | Count of Angle changes in Import Assign during the test (interview) |

## 2. Top 5 risks

| Rank | Risk | Impact | Likelihood | Mitigation in the PRDs | Extra mitigation to consider |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **2D alignment can't fix camera height and tilt toward/away from the model.** Shooting from chest height in one Round and hip height in the next changes body proportions (legs look shorter, hem looks higher). A similarity transform can't undo perspective, so Compare may show a "fit change" that is really a camera change. | High: false conclusions about fit, the core promise | Medium–High | Ghost overlay pushes the same framing; Framing Guide; 1× lens only; `pair_distance` and `pair_tilt` fixtures | A pitch indicator in Camera from CoreMotion ("Hold the phone level"), plus a "phone at hip height" hint. Small to build (≈ 2 days). Not in MVP scope today; owner decision after the test. |
| 2 | **Dress-form fittings.** If a large share of fittings use a dress form, Vision fails and every Shot needs Manual Align. The app becomes a manual tool. | High for those users | Unknown (Q2) | Manual Align ≤ 20 s target; `failed` never blocks a save | A "dress form" alignment that uses two tapped points (neck and waist) with the same math as `fullBody` mode. Scope decision: Q2. |
| 3 | **Vision accuracy on real fit photos** (loose garments, long coats, dark fabric on dark background, low light, mirrors, fitters in frame) is lower than hoped, giving many "Check alignment" badges or, worse, false successes. | High: trust in Compare | Medium | Conservative states (`lowConfidence` instead of silent success); false-success count must be 0 on the test set; error limits from ground truth | If S1 < 80% in M3, tighten thresholds first (more `lowConfidence`, fewer false successes) rather than loosen. |
| 4 | **On-device only vs teams and phone loss.** Photos live on one phone. Colleagues can't see them, and a lost phone without backup loses all fittings. | Medium–High: limits adoption in 2–10 person teams | High for teams | Device backup included (Q1); Import accepts AirDropped photos | If Q3 says teams matter now, the cheapest step is "export Compare as image" via the share sheet — but sharing is out of scope today. |
| 5 | **Test image set and timeline.** Alignment quality depends on ≥ 57 consented, labeled real photos by the start of M3. Late or unrepresentative photos delay M3 or make tuning meaningless. The 12.5-week plan is an estimate for one developer. | Medium: schedule slip, weak tuning | Medium | M3 can start with synthetic tests; fixture cases are named and specified | Owner books 2 fittings with consenting models in week 2 just for the test set. |

Other risks, lower rank:
- SwiftData on iOS 17.0–17.3 has known bugs. Mitigated by raw-string enums, `Data` transforms and explicit saves ([01](01-data-model.md)). Residual risk: crashes on early iOS 17 builds. Test on iOS 17.0 in the simulator.
- Volume-button shutter needs iOS 17.2+. Users on 17.0–17.1 must tap. Low impact.
- Storage growth: ≈ 3.2 MB per Shot; heavy users reach several GB. The 200 MB floor and Settings usage line cover it; there is no cleanup tool in MVP.
- Owner's Figma screens arrive later than milestone starts. Mitigation: build with placeholder styling; screens and states are named so styling can drop in.
- Self-timer missing for designers who fit themselves. Asked in the interview.

## 3. Where the PRDs are thinnest

1. **Canvas framing is fixed for all bodies.** A very tall or short model fills the Canvas differently only through head and feet; torso is always 0.22. That is intended, but a garment for children or a petite fit model is untested.
2. **Side view facing.** The PRDs don't force left- or right-facing profiles. If a user faces the model left in Proto 1 and right in Proto 2, Compare shows mirrored bodies. The ghost discourages this but doesn't stop it.
3. **Backlog import** is one Round per pass, max 3 photos. Onboarding a Garment with 4 past Rounds takes 4 passes.
4. **No re-run of auto-align** after a threshold change between TestFlight builds. Old Shots keep old results (`alignAlgorithmVersion` makes a later re-run possible).

## 4. Open questions for the owner

Only questions that change scope, cost or the core experience. Everything else is decided in the PRDs.

| ID | Question | Why it matters | My recommendation | Affects |
| :--- | :--- | :--- | :--- | :--- |
| Q1 | Should FitLog's photos be **included in the user's iPhone backup** (iCloud or computer)? | Included: a lost phone doesn't lose fittings, but photos sit in the user's Apple backup, so "photos never leave the device" becomes "FitLog never sends your photos anywhere". Excluded: the strict promise holds, but phone loss or replacement deletes every fitting. | Include (the current spec). The user controls their own backup. Use the wording in [08](08-non-functional.md) §8. | 01 §7, 08 §4, §8 |
| Q2 | Roughly what share of your target users' fittings are on a **dress form** rather than a person? | Above about 30%, Manual Align becomes the main path and a tap-two-points dress-form mode should join the MVP (≈ 1 week). | Ask 3–5 designers before M3. Keep MVP as is if the share is low. | 04, 05, 09 timeline |
| Q3 | Is a **single-phone, single-person** MVP acceptable for teams of 2–10, or must a second person see the photos? | If a second person must see them, some form of sharing or export moves into MVP scope, which the brief excludes today. | Keep single-phone for the 5-user test; recruit at least 1 solo tester and 1 team; decide after M8. | 00 scope, 08, 09 |

## 5. Name consistency check

Checked across 00–09 before finishing:
- Entities: `Garment`, `Round`, `Shot`. Enums: `Angle`, `ShotSource`, `AutoAlignState`, `AlignIssue`, `AutoAlignMode`. Structs: `AlignTransform`, `PoseLandmarks`, `JointPoint`.
- Shot fields used outside 01 use the typed accessors defined in [01](01-data-model.md) §3 (`angle`, `source`, `autoAlignState`, `autoAlignIssues`, `autoAlignMode`, `autoTransform`, `manualTransform`, `poseLandmarks`).
- Display states: `aligning`, `aligned`, `needsReview`, `notAligned`, `manuallyAligned` (+ `fileMissing` slot state).
- Screens: the 16 names in [00](00-overview.md) §9.
- Code types: `GarmentRepository`, `RoundRepository`, `ShotRepository`, `PhotoStore`, `AlignmentService`, `PoseAligner`, `AlignConfig`, `ManualAlignMath`, `CompareSelection`, `AlignedImageView`, `ImportAssignment`, `PhotoImporter`, `CameraController`, `MockCameraController`.
- UserDefaults keys: `camera.ghostOpacity`, `camera.ghostEnabled`, `compare.lastMode`.
- Success metrics S1–S8 ([00](00-overview.md) §7); milestones M0–M8 ([09](09-release-plan.md) §1).
