# 09 — Release plan

## Goal

Build the MVP in an order where each milestone is testable on a phone, get it to 5 indie designers on TestFlight, and decide from measured results whether to continue to an App Store release.

Assumption: one iOS developer full time, the owner designing in Figma in parallel. Durations are estimates, not commitments.

## 1. Milestones

| ID | Milestone | PRDs | Est. | Exit criteria |
| :--- | :--- | :--- | :--- | :--- |
| M0 | Project setup + data model | 01, 08 §4 | 0.5 wk | Xcode project, `FitLogSchemaV1` + migration plan, repositories, `PhotoStore`, launch check, CI (build + unit tests + privacy grep). 01 acceptance criteria pass. |
| M1 | Garments and Rounds | 02 | 1 wk | All 02 screens with placeholder styling; 02 unit + UI tests pass. |
| M2 | Camera without ghost | 03 (no rules 15–19) | 1.5 wk | Shoot-through capture, permissions, storage check, write order, interruptions. Per-Shot size measured (updates 08 §3). Internal TestFlight build 1. |
| M3 | Auto-align engine + test set | 04 | 2 wk | `PoseAligner`, `AlignmentService`; owner's fixture photos delivered and labeled; thresholds tuned; 04 AC 1–16 pass. Internal TestFlight build 2. |
| M4 | Ghost overlay + Manual Align | 03 rules 15–19, 05 | 1.5 wk | Ghost and Framing Guide; Manual Align; 03 and 05 tests pass. |
| M5 | Compare | 06 | 1.5 wk | Slider + Stack; 06 tests pass; performance AC 21–23 met. Internal TestFlight build 3. |
| M6 | Import | 07 | 1 wk | 07 tests pass. |
| M7 | Hardening | 08 | 1 wk | Settings, Test Stats, privacy manifest, accessibility pass, kill test, full performance table measured. External TestFlight build. |
| M8 | 5-user test | — | 2.5 wk | Test run (§4); results report; go/no-go (§6). |

Total: about 12.5 weeks.

Dependency notes:
- M3 can start in parallel with M2 using fixture photos, because `PoseAligner` is pure math.
- The owner's Figma screens for each milestone are needed at the milestone start: M1 (02 screens), M2 (Camera), M4 (Manual Align, Camera ghost states), M5 (Compare, Round Picker Sheet), M6 (Import Assign), M7 (Settings, Test Stats).
- The test image set (≥ 57 photos with consent, [04](04-auto-align.md) §9) is needed by the start of M3.

## 2. TestFlight plan

| Group | Who | Builds |
| :--- | :--- | :--- |
| Internal | Owner + developer | Every build from M2 on, at least weekly |
| External "Designers" | 5 testers (§3) | One build after M7, plus fix builds during M8 |

- External builds need Apple's Beta App Review. Allow 2 working days before the first external build date.
- TestFlight "What to Test" notes for each build list: new features, known issues, and the tasks to try.
- Testers send feedback with TestFlight's screenshot feedback. Crash reports come from TestFlight.
- Only fix builds during M8: crashes, data loss, blocked tasks. No new features, so results stay comparable.

## 3. Recruiting the 5 testers

Criteria (all required):
1. Indie brand founder, pattern maker or sample maker in a team of 1–10.
2. Runs at least 2 fittings in the 2-week test window.
3. Owns an iPhone on iOS 17 or later.
4. Today keeps fit photos in the camera roll (or another non-dedicated place).

Mix target: at least 2 pattern makers or sample makers, at least 1 who often fits on a dress form, at least 1 who works alone.

Testers sign a short consent for interview notes and, optionally, for sharing any photos with the team (photos are never collected by the app).

## 4. Test protocol

### Session 1 — setup (45 min, in studio if possible, else video call)

1. Install from TestFlight. Reset Test Stats.
2. The tester does 5 core tasks with no help. Observer notes success, time and errors.
   - T1: Create a Garment and shoot Front, Side, Back for Proto 1.
   - T2: Create Proto 2 and shoot it using the ghost.
   - T3: Compare Proto 1 and Proto 2 Front with the slider.
   - T4: Flip through all Rounds of Side in Stack mode.
   - T5: Import 3 photos from the camera roll into a new Round, then fix one alignment by hand.
3. Success = done without help within 5 minutes per task.

### Two weeks of own use

- Tester uses FitLog at real fittings.
- Day 3: 10-minute check-in message: "Anything blocking you?"
- Day 7: same.

### Session 2 — exit interview (45 min)

1. Tester opens Test Stats and shares it.
2. Questions (fixed order):
   - Walk me through your last fitting with FitLog.
   - When did auto-align get it wrong? What did you do?
   - Did you use the ghost? When did you turn it off?
   - What did you still do in the camera roll or another app?
   - Did you miss a self-timer, notes, more angles, or sharing with your team? Which one most?
   - How many fittings a month do you shoot on a dress form vs a person?
   - Would you use FitLog at your next fitting? (Yes / Maybe / No) Why?
3. Rate 1–5: "Comparing rounds is easier than before."

## 5. What to measure

| ID | Measure | Source | Target |
| :--- | :--- | :--- | :--- |
| S1 | Auto-align `succeeded` share | Test Stats (`autoAlignSucceeded` / all align jobs) | ≥ 80% |
| S2 | Manual align share | `manualAlignSaved` / (`shotsCaptured` + `shotsImported`) | ≤ 20% |
| S3 | Round capture time | `roundCaptureSeconds` median | ≤ 60 s |
| S4 | Core task success | Session 1 observation | ≥ 4 of 5 testers do all 5 tasks |
| S5 | Real use | `activeDays` and the interview: ≥ 2 real fittings | ≥ 3 of 5 testers |
| S6 | Data loss | Interview + TestFlight feedback | 0 incidents |
| S7 | Crash-free sessions | TestFlight crash data | ≥ 99% |
| S8 | False success in the field | Interview: "aligned" photos that were visibly wrong, checked on the tester's phone | 0 confirmed |
| — | Ghost use | `ghostToggledOff` vs captures; interview | Learn (no target) |
| — | Compare preference | `compareSliderOpened` vs `compareStackOpened` | Learn (paywall input) |
| — | Missing-feature ranking | Interview | Learn (next scope) |

## 6. Go / no-go after M8

Metric IDs S1–S8 are the success metrics in [00](00-overview.md) §7. Milestone IDs M0–M8 are in §1.

- **Go to App Store prep** when S4, S6, S7 and S8 meet target and at least 2 of S1, S2, S3 meet target.
- **Iterate one more TestFlight round** when S6 and S7 meet target but S1, S2 or S8 miss (alignment is the problem), or S4 misses (UI is the problem).
- **Stop and rethink** when S5 is ≤ 1 of 5 (designers don't come back), whatever the other numbers.

## 7. After the MVP (not planned, listed for context)

Candidate next items, ranked later by the M8 interviews: self-timer, dress-form alignment mode, backlog import across many Rounds, notes, sharing/export, paywall (see [00](00-overview.md) §6).

## Acceptance criteria

1. Given the end of M7, then an external TestFlight build exists, has passed Beta App Review, and its "What to Test" lists T1–T5.
2. Given the end of M8, then a results report exists with a value for every row of §5 and the go/no-go outcome from §6.
3. Given any milestone M0–M7, then it is closed only when its exit criteria and its PRDs' Definition of Done are met.

## Definition of Done

- [ ] Every milestone exit criterion met and noted in the milestone PR.
- [ ] 5 testers recruited by the end of M6.
- [ ] Session 1 and Session 2 held with all 5 (or replacements recruited by day 3 of M8).
- [ ] Results report written and shared with the owner.

## Test plan

This document defines the user test itself (§4). Code tests are in each feature PRD.

## Decisions made

| Decision | Reason |
| :--- | :--- |
| Align engine (M3) before ghost (M4) | The ghost draws the aligned Reference Shot, so it needs the engine. |
| Camera before Compare | Real captured data is needed to judge Compare. |
| Import last among features | It reuses every earlier part; it is also the fallback for camera problems. |
| Feature freeze during M8 | Keeps the 5 testers' results comparable. |
| In-studio Session 1 when possible | One-handed studio behavior can't be seen on a video call. |

## Open questions

None.
