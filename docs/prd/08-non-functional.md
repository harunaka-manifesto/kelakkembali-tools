# 08 — Non-functional requirements

## Goal

Set the limits every feature must meet: speed, storage, privacy, accessibility, offline use, crash safety and measurement. Also define the two small screens that belong to them: Settings and Test Stats.

## 1. Devices and platform

| Item | Value |
| :--- | :--- |
| Minimum OS | iOS 17.0 |
| Reference device | iPhone 13 (all main targets) |
| Oldest device tested | iPhone XS (oldest iPhone that runs iOS 17) |
| Also tested | One current Pro model with a 48 MP camera (for import size) |
| Orientation | Portrait only (`UISupportedInterfaceOrientations` = portrait) |
| Appearance | Light and Dark both supported; follows the system |
| Language | English only; all strings in a String Catalog so localization is a later content task |

## 2. Performance targets

All numbers are p90 over 10 runs on the reference device unless stated. Feature PRDs hold the feature-specific ones; this table collects them.

| Area | Metric | iPhone 13 | iPhone XS | Source |
| :--- | :--- | :--- | :--- | :--- |
| Launch | Cold start → Garment List rows visible, 200 Garments | ≤ 1.5 s | ≤ 2.5 s | here |
| Lists | Garment List scroll with 200 Garments | ≤ 5% frames over 16.7 ms | ≤ 5% over 33 ms | here |
| Lists | Garment Detail open with 20 Rounds | ≤ 300 ms | ≤ 500 ms | here |
| Camera | Open → live preview | ≤ 1.0 s | ≤ 1.5 s | [03](03-guided-camera.md) |
| Camera | Shutter → next Angle ready | ≤ 0.6 s | ≤ 0.9 s | [03](03-guided-camera.md) |
| Align | Whole job | ≤ 400 ms | ≤ 800 ms | [04](04-auto-align.md) |
| Align | Vision request | ≤ 300 ms | ≤ 600 ms | [04](04-auto-align.md) |
| Manual Align | Gesture frames | ≤ 5% over 16.7 ms | — | [05](05-manual-align.md) |
| Compare | Open → first image | ≤ 500 ms | ≤ 800 ms | [06](06-compare.md) |
| Compare | Slider drag | ≤ 5% over 16.7 ms, none over 33 ms | ≤ 5% over 33 ms | [06](06-compare.md) |
| Compare | Stack flip to neighbor | ≤ 50 ms | ≤ 100 ms | [06](06-compare.md) |
| Import | 3 local photos → sheet closes | ≤ 3.5 s | — | [07](07-import.md) |
| Memory | Peak app memory in any flow | ≤ 250 MB | ≤ 250 MB | here |
| Energy | 20 min of Camera use with ghost on | Battery drop ≤ 8% | — | here |
| Thermal | 20 min of Camera use | `ProcessInfo.thermalState` never `.serious` at 22 °C room | — | here |

Performance is measured with Instruments (Time Profiler, Animation Hitches, Allocations, Energy Log) and `os_signpost` intervals: `AppLaunch`, `CameraStart`, `CaptureToReady`, `AlignJob`, `VisionPose`, `CompareOpen`, `ImportRow`.

## 3. Storage

| Item | Rule |
| :--- | :--- |
| Location | `Application Support` only ([01](01-data-model.md) §7). Nothing in `Documents` (not exposed in the Files app) or `Caches` (the OS may purge it). |
| Per Shot | ≈ 3.2 MB (12 MP HEIC). Assumption, measured in M2. |
| Planning size | 200 Garments × 4 Rounds × 3 Shots = 2,400 Shots ≈ 7.7 GB. Performance targets hold at this size. |
| Hard limits | None on counts. |
| Free-space floor | 200 MB. Below it, Camera and Import block with `storageFull`. Records still save. |
| Free-space API | `URLResourceValues.volumeAvailableCapacityForImportantUsage` |
| Settings display | Space used by FitLog (sum of `Photos/` + store) and Shot count |
| Cleanup | Orphans and staging removed by the launch check ([01](01-data-model.md) §8) |

## 4. Privacy

Promise to users: **FitLog never sends your photos or data anywhere.**

| Rule | How it is checked |
| :--- | :--- |
| No networking code. No `URLSession`, `Network.framework`, `NWConnection`, WebKit, or third-party SDKs. | CI script greps the source for these symbols and fails the build if any appear. |
| No third-party dependencies at all in MVP | Code review; `Package.resolved` must not exist |
| No accounts, no identifiers, no IDFA, no ATT prompt | `NSPrivacyTracking = false` |
| Camera usage string | "FitLog uses the camera to take fit photos. Photos stay on this iPhone." |
| No photo library permission | `PhotosPicker` only; no `NSPhotoLibraryUsageDescription` and no `NSPhotoLibraryAddUsageDescription` |
| Privacy manifest `PrivacyInfo.xcprivacy` | `NSPrivacyTracking = false`; `NSPrivacyCollectedDataTypes` empty; required-reason APIs: `NSPrivacyAccessedAPICategoryUserDefaults` reason `CA92.1`; `NSPrivacyAccessedAPICategoryDiskSpace` reasons `E174.1` (check space before writing) and `85F4.1` (show space in Settings) |
| App Store privacy label | "Data Not Collected" |
| File protection | `completeUntilFirstUserAuthentication` |
| Device backup | Files are included in the user's own iPhone backup (iCloud or computer) if they have backup on. FitLog does not control that and does not send anything itself. Open question Q1 in [99-review.md](99-review.md). |

The Settings screen states this in plain words (§8).

## 5. Analytics decision

Decision: **no analytics in App Store builds. On-device Test Stats in TestFlight builds only.**

Reason: the privacy promise is the strongest when the app has no network code at all. The MVP question ("does auto-align save designers time?") is answered by 5 testers, interviews and a few counts, not by telemetry.

Test Stats:
- Compiled only when the build setting `FITLOG_TEST_STATS` is defined. The TestFlight scheme defines it; the App Store scheme does not. In App Store builds no counter code exists.
- Stored in `Application Support/TestStats.json`. Never sent. The tester shows the Test Stats screen during the exit interview (screen share or in person).

| Counter | Type | Incremented when |
| :--- | :--- | :--- |
| `garmentsCreated` | Int | A Garment is created |
| `roundsCreated` | Int | A Round is created (incl. auto "Proto 1") |
| `shotsCaptured` | Int | A camera Shot record saves |
| `shotsImported` | Int | An imported Shot record saves |
| `retakes` | Int | A camera Shot replaces an existing Shot |
| `autoAlignSucceeded` | Int | A job ends `succeeded` |
| `autoAlignLowConfidence` | Int | A job ends `lowConfidence` |
| `autoAlignFailed` | Int | A job ends `failed` |
| `manualAlignSaved` | Int | Manual Align saves a non-nil `manualTransform` |
| `compareSliderOpened` | Int | Compare enters Slider mode (open or switch) |
| `compareStackOpened` | Int | Compare enters Stack mode |
| `ghostToggledOff` | Int | Ghost button turns the overlay off |
| `roundCaptureSeconds` | [Double], last 50 | Camera opened on a Round with 0 Shots → seconds until `roundComplete` |
| `firstLaunchAt` | Date | First launch |
| `activeDays` | [Date], unique days | Any launch or foreground |

## 6. Accessibility

| Requirement | Target |
| :--- | :--- |
| VoiceOver | Every control has a label; every badge is read as text; all core tasks (create Garment, create Round, capture 3 Angles, import, compare, manual align via custom actions) can be done with VoiceOver only |
| Dynamic Type | All list screens and sheets work at every size up to AX5 (text wraps, no clipping of names or buttons). Camera, Manual Align and Compare work up to AX3; at larger sizes their labels may truncate but buttons stay usable. |
| Hit targets | ≥ 44 × 44 pt for every tappable element |
| Color | Alignment state is never shown by color alone; each badge has text |
| Reduce Motion | No decorative motion; Stack is already an instant cut; sheet transitions use system defaults |
| Haptics | Capture, snap in Manual Align, end of Stack. Respect the system "System Haptics" switch |
| Announcements | Camera announces "<Angle> saved. <Next Angle> selected." after each capture |
| Reachability | Shutter, Angle Picker and the Compare mode switch sit in the bottom half of the screen (owner's design must keep them within thumb reach) |

## 7. Offline

FitLog is offline by design. Every feature works in Airplane Mode. The only network-dependent case is an iCloud-only photo during import, handled by `downloadFailed` ([07](07-import.md)).

## 8. Screen: Settings

Opened from Garment List. Elements:
- Storage: "FitLog uses <size> for <n> photos." and "Free on this iPhone: <size>."
- Privacy: "FitLog has no account and no internet connection. Your photos never leave this iPhone. They are included in your iPhone backup if backup is on."
- Version: "Version <x.y> (<build>)".
- Test Stats row: only in builds with `FITLOG_TEST_STATS`.

| State | When | Must show |
| :--- | :--- | :--- |
| `calculating` | Size sum not done (shown only after 300 ms) | "Calculating…" for the storage line |
| `ready` | Sizes known | All lines |

## 9. Screen: Test Stats (TestFlight only)

Read-only list of every counter in §5 with its value; `roundCaptureSeconds` shown as count, median and max. A Reset button with confirmation "Reset all test stats?" (used before the test starts).

| State | When | Must show |
| :--- | :--- | :--- |
| `empty` | All counters 0 | Counters at 0 |
| `ready` | Any counter > 0 | Values |

## 10. Crash and data safety

1. No third-party crash reporter. Crash data comes from Apple: TestFlight crash reports and App Store Connect / Xcode Organizer (only from users who opted in to share with developers).
2. Every repository method saves explicitly; autosave is not relied on ([01](01-data-model.md) §10).
3. Photo writes use staging + atomic move ([01](01-data-model.md) §7).
4. The launch integrity check runs on every cold launch ([01](01-data-model.md) §8).
5. If the SwiftData store can't open, the app shows `Garment List / storeError` and never deletes or recreates the store on its own. The developer handles this through TestFlight feedback.
6. Long saves (capture, import) run inside `beginBackgroundTask`.
7. `fatalError`, `try!` and force-unwraps are not allowed in data and file code (lint rule; code review).
8. Logs: `os.Logger` with subsystem `app.fitlog` (placeholder), categories `data`, `files`, `align`, `camera`, `import`. No photo content or names in logs at levels above `.debug`.

## Required edge cases (cross-cutting)

| Case | Rule |
| :--- | :--- |
| Permission denied | Camera: [03](03-guided-camera.md). Photos: no permission used ([07](07-import.md)). |
| Pose not found | Never blocks a save; shown as "Not aligned" everywhere ([04](04-auto-align.md)). |
| Two people in frame | `lowConfidence`, "Check alignment" ([04](04-auto-align.md)). |
| Garment with one round | Compare disabled; Framing Guide in Camera ([02](02-garments-and-rounds.md), [03](03-guided-camera.md)). |
| Deleted round | Records first, files second; launch check cleans leftovers ([01](01-data-model.md)). |
| Storage full | 200 MB floor for photo writes; records still save. |
| App killed mid-capture | Staging + atomic move + launch check; no half-written photo is ever visible. |

## Acceptance criteria

1. Given the release build's source, when the CI privacy script runs, then it finds no `URLSession`, `NWConnection`, `import Network`, `import WebKit` or `WKWebView`.
2. Given the App Store build, then `TestStats` symbols are not present in the binary (`nm` shows no `TestStats` symbol).
3. Given a TestFlight build, when a Garment is created, then Test Stats shows `garmentsCreated` = previous + 1 after reopening the screen.
4. Given Airplane Mode, then every acceptance criterion in 02–06 that does not involve iCloud photos passes.
5. Given 200 Garments with 2,400 Shots seeded, when the app cold-starts on iPhone 13, then Garment List rows are visible within 1.5 s (p90 of 10).
6. Given VoiceOver on, when a tester follows the 5 core tasks ([09](09-release-plan.md) §4), then each can be completed without turning VoiceOver off.
7. Given text size AX5, then Garment List, Garment Detail, Round Detail, Shot Detail, all sheets and Settings show no clipped text (manual check against screenshots).
8. Given the privacy manifest, when the app is archived, then Xcode's privacy report lists no collected data and the listed required-reason APIs only.
9. Given the app is killed (via `kill -9` from Xcode) at 10 random points during capture and import, then after each relaunch no Shot shows a broken image and `Staging/` is empty.
10. Given 20 minutes of continuous Camera use with Ghost on on iPhone 13 at room temperature, then battery drop ≤ 8% and thermal state never reaches `.serious`.
11. Given Settings, then the storage line equals the sum of `Photos/` and the store files (±1 MB).

## Definition of Done

- [ ] CI privacy grep script exists and runs on every build.
- [ ] `PrivacyInfo.xcprivacy` as specified.
- [ ] `FITLOG_TEST_STATS` build setting in the TestFlight scheme only; Test Stats screen and counters.
- [ ] Settings screen.
- [ ] `os_signpost` intervals listed in §2 exist.
- [ ] Performance table in §2 measured on iPhone 13 and iPhone XS before the external TestFlight build; results in `docs/perf-<date>.md` in the app repo.
- [ ] Accessibility checks AC 6 and 7 done and noted.
- [ ] Kill test AC 9 done and noted.

## Test plan

- Automated: AC 1, 2 in CI; AC 3 as a UI test; AC 5 and 11 as device tests with a seed launch argument `-seedFixture large_200`.
- Manual: AC 4 (Airplane Mode pass over each PRD's UI tests run by hand), 6, 7, 8, 9, 10.
- Instruments runs for every row in §2 before each external TestFlight build.

## Decisions made

| Decision | Reason |
| :--- | :--- |
| No analytics in App Store builds | Strongest, simplest privacy promise: no network code at all. |
| Test Stats only in TestFlight, never sent | Gives numbers for the 5-user test without breaking the promise. |
| Apple crash reports only | No SDK, no network; enough for a 5-user beta. |
| iPhone 13 reference, iPhone XS floor | iPhone 13 is a common mid-age device (assumption); XS is the oldest iOS 17 iPhone. |
| `Application Support`, not `Documents` | Users should not be able to rename or delete photo files from the Files app and break records. |
| Include files in device backup | Losing a phone should not lose all fittings; the user controls backup. Flagged as Q1. |

## Open questions

Q1 (device backup) is in [99-review.md](99-review.md).
