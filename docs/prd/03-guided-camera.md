# 03 — Guided camera

## Goal

Capture Front, Side and Back for a Round in under 60 seconds with one hand. A ghost of the matching Angle from the Reference Shot helps the user frame each photo like the last Round.

## User stories

1. As a designer holding the phone in one hand, I want to shoot all three Angles without leaving the camera, so that the model doesn't wait.
2. As a pattern maker, I want to see last fitting's photo as a see-through overlay, so that I stand at the same distance and the model stands the same way.
3. As a sample maker, I want to turn the overlay off or fade it, so that I can see the garment clearly.
4. As a designer, I want to retake one Angle without redoing the others, so that a blink or a bad pose costs one tap.
5. As a designer, I want to know when the light is too low, so that I fix the light before the photos are useless.
6. As a designer, I want to press a volume button to shoot, so that I can hold the phone steadily in one hand.

## Flow (happy path)

1. From Round Detail (or New Round Sheet "Create & Shoot"), Camera opens as a full-screen cover with the first empty Angle selected (Front for a new Round).
2. The live preview shows. The ghost of the Reference Shot for (this Round, Front) shows over it at the saved opacity (default 40%). The label reads "Ghost: Proto 1".
3. The user lines up the model's body with the ghost and presses the shutter (or a volume button).
4. Camera saves the photo in the background, plays a haptic, shows the new photo in the last-shot thumbnail with "Aligning…", and selects the next empty Angle (Side). The ghost switches to the Side Reference Shot.
5. The user shoots Side, then Back.
6. After the third Angle, the `roundComplete` state shows "Front, Side and Back saved."
7. The user taps Done. Camera closes. Round Detail shows three filled slots.

## Screens and states

### Screen: Camera

Portrait only. Elements on the screen in every live state:

| Element | Content |
| :--- | :--- |
| Close button | Closes Camera, returns to the screen that opened it |
| Title | "<Round name> · <Angle label>", e.g. "Proto 2 · Side" |
| Preview | Live 3:4 preview, full screen width. Exactly the area the photo will contain. |
| Overlay | Ghost or Framing Guide, inside the Preview rect |
| Overlay label | "Ghost: <Reference Round name>", or "Ghost: <name> (not aligned)" when the Reference Shot is `notAligned`, or "Framing guide" |
| Angle Picker | Front / Side / Back. Each shows a check mark when this Round already has a Shot for it. Tap selects. |
| Ghost button | Toggles the Overlay on/off |
| Opacity slider | Visible only while a Ghost (not the Framing Guide) is on. 10%–80%, steps of 10%. |
| Replace label | "Replaces current photo" — visible when the selected Angle already has a Shot |
| Shutter button | Takes the photo. Reachable with the right or left thumb while holding the phone in that hand. |
| Last-shot thumbnail | The latest Shot taken in this Camera session; shows "Aligning…", then nothing, "Check" or "Not aligned". Hidden until the first capture. |

Banners (non-blocking, over the Preview, at most one at a time; `holdUpright` wins):
- `holdUpright`: "Hold the phone upright." Shown when the phone has not been in portrait for 0.5 s.
- `lowLight`: "Low light. Add light for clearer photos and better alignment." Shown after 1 s of low light; hidden after 2 s of normal light (rule 7).

| State | When | Must show |
| :--- | :--- | :--- |
| `starting` | Camera session is configuring | Preview area dark; "Starting camera…" if it takes > 300 ms; Close button |
| `permissionDenied` | Camera access denied | "FitLog needs the camera to shoot fittings." Open Settings button; Import from Photos button (opens Import Assign for this Round, [07](07-import.md)); Close |
| `permissionRestricted` | Access restricted by Screen Time or a device profile | "Camera access is restricted on this iPhone." Import from Photos button; Close. No Settings button. |
| `cameraUnavailable` | No back camera, or the session failed to start | "The camera isn't available right now." Try Again button; Close |
| `interrupted` | Session interrupted (phone call, Siri, another app using the camera) | Last preview frame dimmed; "Camera paused"; resumes on its own when the interruption ends |
| `ready` | Session running | All elements above |
| `capturing` | Shutter pressed, photo data not yet received | Shutter disabled; Angle Picker disabled; brief capture feedback |
| `roundComplete` | All three Angles have a Shot, right after the last one was captured in this session | "Front, Side and Back saved." Done (primary) and Keep Shooting buttons; the three thumbnails |
| `storageFull` | Free space < 200 MB at open or before a capture | "iPhone storage is full. Free up at least 200 MB to keep shooting." Close button. Photos already saved stay saved. |
| `saveError` | Writing the photo failed (not space) | Toast "Couldn't save the <Angle> photo. Try again."; returns to `ready` on the same Angle |

`ready` sub-cases the owner must design (same screen, different overlay):
- `ready.ghost` — Reference Shot exists, Ghost on.
- `ready.framingGuide` — No Reference Shot, Overlay on. Lines at shoulder (y = 0.24), hip (y = 0.46), ankle (y = 0.812) and a vertical center line, plus the hint "No earlier photo. Line up shoulders, hips and feet with the lines."
- `ready.overlayOff` — Overlay off.
- `ready.replacing` — any of the above, with the Replace label.

### Sheet over Camera: Shot Detail

Tapping the last-shot thumbnail opens Shot Detail ([02](02-garments-and-rounds.md)) as a sheet over Camera. In this sheet, Retake closes the sheet and selects that Angle in Camera. Adjust Alignment opens Manual Align. Delete Photo works as in 02.

## Rules and edge cases

### Required edge cases

| Case | Behavior |
| :--- | :--- |
| Permission denied | First open with `.notDetermined`: call `AVCaptureDevice.requestAccess(for: .video)` directly (no custom pre-prompt). `.denied` → `permissionDenied`. `.restricted` → `permissionRestricted`. When the user returns from Settings with access granted, Camera moves to `starting` without being reopened. |
| Pose not found | Capture is never blocked by pose. The Shot is saved; auto-align marks it `failed`; the thumbnail shows "Not aligned". |
| Two people in frame | Same as above: saved; `multiplePeople` → thumbnail shows "Check". |
| Garment with one round | No Reference Shot for Proto 1 → `ready.framingGuide`. |
| Deleted round | Camera can't be open while its Round is deleted (full-screen cover blocks the UI). If the Reference Round was deleted earlier, the rule in [01](01-data-model.md) §6 picks the next one when Camera opens or the Angle changes. |
| Storage full | Checked when Camera opens and before each capture: `volumeAvailableCapacityForImportantUsage` < 200 MB → `storageFull`. |
| App killed mid-capture | The Original is first written to `Staging/`. If the app dies before the record is saved, the launch check deletes it; the Angle stays empty and the user retakes. If it dies after the save, the Shot exists as `pending` and is aligned on next launch. No half-written file is ever shown. |

### Capture settings

1. Device: back `builtInWideAngleCamera` (the 1× lens) only. No ultra-wide, no telephoto, no zoom.
2. Session preset `.photo`. Preview layer `videoGravity = .resizeAspect`, so the 3:4 Preview equals the photo frame exactly.
3. Photo format: HEIC (`AVVideoCodecType.hevc`) when `availablePhotoCodecTypes` contains it, else JPEG.
4. `maxPhotoDimensions` = 4032 × 3024 (12 MP), even on 48 MP devices. `photoQualityPrioritization = .balanced`. Flash off. Live Photo off.
5. Focus and exposure: continuous auto. Tap on the Preview sets the focus and exposure point there; it resets to continuous after 5 s without a tap or when the Angle changes.
6. Rotation: use `AVCaptureDevice.RotationCoordinator`. At capture, set the photo connection's `videoRotationAngle` to `videoRotationAngleForHorizonLevelCapture`, so the photo is always upright even when the phone is held sideways. The UI stays portrait.
7. Low light: sample `device.iso` every 0.5 s. Low when `iso ≥ 0.9 × activeFormat.maxISO`. Show the banner after 2 low samples in a row; hide after 4 normal samples in a row.
8. Hold-upright: show `holdUpright` when `videoRotationAngleForHorizonLevelCapture` ≠ 90° for 0.5 s; hide when it is 90° again.

### Shutter and angle behavior

9. Shutter inputs: on-screen button, and volume up/down via `AVCaptureEventInteraction` on iOS 17.2+. On iOS 17.0–17.1, volume buttons keep their normal function.
10. On capture: medium impact haptic, system shutter sound (cannot be muted in some regions; FitLog doesn't try).
11. After the photo data arrives, select the next Angle in Front → Side → Back order that has no Shot in this Round. If all three have a Shot and at least one was captured in this session → `roundComplete`. If all three already had Shots when the user shot a replacement, stay on the same Angle (no `roundComplete`).
12. Shooting an Angle that already has a Shot replaces it: the new Shot is saved first, then the old one is deleted ([01](01-data-model.md) §7 step 5). There is no confirm dialog; the Replace label is the warning.
13. Keep Shooting in `roundComplete` → `ready` on Front with the Replace label.
14. Close while a save is still running: Camera closes at once; the save finishes in a background task.

### Ghost overlay

15. Ghost image = Reference Shot ([01](01-data-model.md) §6) for (this Round, selected Angle), its `display.jpg` drawn into the Preview rect with its `effectiveTransform` (Canvas → Preview rect: multiply canvas units by the rect height).
16. Ghost opacity default 0.4. Stored in `UserDefaults` key `camera.ghostOpacity` (Double). Overlay on/off stored in `camera.ghostEnabled` (Bool, default `true`). Both apply to every Garment.
17. The Framing Guide ignores opacity; it is drawn as thin lines and is controlled only by the Ghost button.
18. The ghost is updated within 150 ms when the Angle changes.
19. Ghost is not mirrored and not edge-detected in MVP; it is the plain photo at the chosen opacity.

### Framing and distance

20. The Canvas framing places a standing adult's head top near y = 0.11 and feet near y = 0.84. For a 1.75 m person and the iPhone 1× lens (≈ 67° field of view along the long side), that needs about 1.8 m between phone and model with the phone at hip height. (Calculation: canvas height ≈ 1.75 / 0.733 = 2.39 m; distance ≈ 1.19 / tan 33.5° ≈ 1.8 m.) The UI does not enforce distance; the ghost guides it.

### Performance

| Metric | Target (iPhone 13) | Target (iPhone XS) |
| :--- | :--- | :--- |
| Camera open → live preview, cold, p90 | ≤ 1.0 s | ≤ 1.5 s |
| Shutter → `ready` on next Angle, p90 | ≤ 0.6 s | ≤ 0.9 s |
| Preview frame rate with Ghost on | ≥ 30 fps, no frame > 50 ms during 30 s | same |
| Write order steps 1–4, p90 | ≤ 700 ms (off main thread) | ≤ 1.2 s |

## Data touched

| Entity.field | Read | Write |
| :--- | :--- | :--- |
| `Round.name, shots` | ✓ (title, check marks) | — |
| `Shot.angle` of this Round | ✓ | — |
| Reference Shot `display.jpg`, `effectiveTransform`, `alignDisplayState`, Round name | ✓ | — |
| New `Shot`: `id, angle, source = camera, capturedAt, createdAt, originalFileName, pixelWidth, pixelHeight, autoAlignState = pending` | — | ✓ |
| Replaced `Shot` (same Round + Angle) | — | delete + files |
| `Garment.lastActivityAt` | — | ✓ |
| Files `Staging/`, `Photos/<shotID>/original.heic, display.jpg, thumb.jpg` | — | ✓ |
| `UserDefaults camera.ghostOpacity, camera.ghostEnabled` | ✓ | ✓ |

## Acceptance criteria

1. Given a Round with no Shots, when Camera opens, then Front is selected and the Angle Picker shows no check marks.
2. Given camera permission `.notDetermined`, when Camera opens, then the system permission alert appears with no FitLog screen before it.
3. Given permission `.denied`, when Camera opens, then `permissionDenied` shows with Open Settings and Import from Photos buttons.
4. Given `permissionDenied`, when the user enables camera in Settings and returns to FitLog, then Camera leaves `permissionDenied` and shows the live Preview without being reopened.
5. Given Proto 1 has a Front Shot, when Camera opens for Proto 2 at Front, then the Proto 1 Front `display.jpg` is drawn over the Preview at 40% opacity and the label reads "Ghost: Proto 1".
6. Given Proto 1 is the only Round, when Camera opens for it, then `ready.framingGuide` shows with the four lines and the hint text.
7. Given Ghost is on, when the user taps the Ghost button, then the Overlay disappears and `camera.ghostEnabled` becomes `false`; after closing and reopening Camera, the Overlay is still off.
8. Given opacity is moved to 70%, when Camera is reopened for any Garment, then the slider shows 70% and the ghost draws at 0.7 opacity.
9. Given Front is selected, when the user captures, then within 0.6 s Side is selected and the last-shot thumbnail shows the new photo with "Aligning…".
10. Given Front and Side exist, when the user captures Back, then `roundComplete` shows.
11. Given a Round with all three Shots, when the user selects Side, then "Replaces current photo" is visible.
12. Given that state, when the user captures, then the Round has exactly one Side Shot, it has the new `createdAt`, and the old Side Shot's folder no longer exists.
13. Given iOS 17.2+, when the user presses volume up in `ready`, then a photo is captured.
14. Given free space is 150 MB, when Camera opens, then `storageFull` shows and the shutter is not shown.
15. Given the phone is held in landscape for 1 s, then the `holdUpright` banner shows; and a capture in that position saves a Shot whose `pixelWidth` > `pixelHeight` and whose Display image is upright.
16. Given a covered lens in a dark room (iso at max), then the `lowLight` banner appears within 1.5 s and capture is still possible.
17. Given a capture in progress, when the app is killed after step 1 of the write order, then after relaunch the Round has no Shot for that Angle and `Staging/` is empty.
18. Given a phone call arrives in `ready`, then `interrupted` shows; when the call ends, `ready` returns without user action.
19. Given 10 launches of Camera on iPhone 13, then the p90 time from tap to first Preview frame is ≤ 1.0 s.
20. Given Proto 1 Front is `notAligned`, when Camera opens for Proto 2 Front, then the label reads "Ghost: Proto 1 (not aligned)" and the ghost draws with `defaultFit`.

## Definition of Done

- [ ] Camera screen with all states and `ready` sub-cases implemented.
- [ ] `CameraController` (AVFoundation) is separate from the SwiftUI view and can be replaced by `MockCameraController` via launch argument `-mockCamera` (feeds fixture images).
- [ ] Capture settings 1–8 implemented exactly; verified by reading the session config in a debug log once.
- [ ] Saves go through `ShotRepository` with the write order of [01](01-data-model.md) §7.
- [ ] Unit tests: next-Angle selection (rule 11, all 8 fill combinations), `roundComplete` rule, low-light hysteresis, hold-upright debounce, Reference Shot selection.
- [ ] UI tests (mock camera): AC 1, 5, 6, 7, 8, 9, 10, 11, 12, 14 pass.
- [ ] Device tests: AC 2, 3, 4, 13, 15, 16, 17, 18, 19 run on a physical iPhone and noted in the PR.
- [ ] VoiceOver: shutter label "Take <Angle> photo"; after capture announce "<Angle> saved. <Next Angle> selected."; opacity slider adjustable in 10% steps.
- [ ] Info.plist `NSCameraUsageDescription`: "FitLog uses the camera to take fit photos. Photos stay on this iPhone."
- [ ] Test Stats events wired ([08](08-non-functional.md)): `shotsCaptured`, `retakes`, `ghostToggledOff`, `roundCaptureSeconds`.

## Test plan

Unit:
- Next-Angle logic for every combination of existing Shots (2³ = 8) × selected Angle.
- Reference Shot for the ghost: lower Round, higher Round only, none, reference file missing.
- Canvas → Preview rect conversion for the ghost at rect heights 520 pt and 640 pt.

UI (simulator, `-mockCamera`):
- Shoot-through of 3 Angles; `roundComplete`; Keep Shooting; retake replaces.
- Ghost toggle and opacity persistence.
- `storageFull` via launch argument `-fakeFreeSpaceMB 150`.

Manual (device, in a real or mock studio):
- One-handed run: hold the phone in the right hand only, shoot 3 Angles with volume up; time it (target ≤ 60 s including turning the model).
- Same with the left hand.
- Low light: dim the room until the banner shows; confirm it hides when lights return.
- Hold landscape; confirm banner and an upright saved photo.
- Deny permission, then grant in Settings, return.
- Receive a call during `ready`.
- Force-quit with the app switcher right after the shutter; relaunch; check no broken slot.
- Shoot Proto 2 with the ghost on at 1.8 m; check the body roughly matches the ghost before capture.

## Decisions made

| Decision | Reason |
| :--- | :--- |
| Shoot-through: auto-save and auto-advance, no per-photo review screen | One-handed speed; three Angles in about 15 s of shutter time. |
| Replace without a dialog, with a visible label | A dialog per retake slows the fitting; the label is shown before the shutter. |
| Ghost = Reference Shot drawn with its alignment | Every Round converges on the same Canvas framing, so auto-align has less to correct. |
| Framing Guide when no Reference Shot | Proto 1 still gets consistent framing for Proto 2 to match. |
| 1× lens only, no zoom | Lenses distort differently; mixing them across Rounds makes Compare lie. |
| 12 MP cap | 48 MP files are 4× bigger with no benefit for fit review. |
| No flash | Flash flattens drape and creates hot spots; photos stop being comparable. |
| No live pose detection in the preview | Keeps the preview smooth and the battery cool; the ghost does the guiding. Revisit after the 5-user test. |
| No self-timer | Brief assumes someone holds the phone. Listed as a test question in [09](09-release-plan.md). |
| No custom permission pre-prompt | One fewer screen and tap; the usage string explains. |
| Ghost settings global, not per Garment | Users set a preference once; per-Garment memory adds hidden state. |

## Open questions

None.
