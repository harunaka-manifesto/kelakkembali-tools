# 01 — Data model

## Goal

Define every record, field, relation, file and lifecycle rule, so that all features read and write the same data in the same way.

## 1. Overview

```
Garment 1 ──< Round 1 ──< Shot (0…3, at most one per Angle)
```

- Records live in SwiftData, in one store file: `Application Support/FitLog.store`.
- Photo files live in `Application Support/Photos/<shotID>/`.
- Records never hold absolute file paths. The container path changes between installs and restores, so every path is built from `Shot.id` at runtime.

## 2. Enums and value types

All enums are `String`-backed. SwiftData stores the raw `String` (fields ending in `Raw`). Each model exposes a typed computed accessor without the suffix. Other PRDs use the typed accessor names.

Decision: store enums as raw strings. Reason: on iOS 17, `#Predicate` cannot filter on enum-typed fields, and raw strings migrate safely.

### `Angle`

| Case | Raw value | Label | Capture order |
| :--- | :--- | :--- | :--- |
| `front` | `"front"` | Front | 1 |
| `side` | `"side"` | Side | 2 |
| `back` | `"back"` | Back | 3 |

### `ShotSource`

| Case | Raw | Meaning |
| :--- | :--- | :--- |
| `camera` | `"camera"` | Captured in the FitLog Camera |
| `library` | `"library"` | Imported from the photo library |

### `AutoAlignState`

| Case | Raw | Meaning |
| :--- | :--- | :--- |
| `pending` | `"pending"` | Auto-align has not finished yet |
| `succeeded` | `"succeeded"` | Transform found; confidence ≥ 0.6 and no issues |
| `lowConfidence` | `"lowConfidence"` | Transform found but at least one `AlignIssue` was raised |
| `failed` | `"failed"` | No usable transform; `autoTransform` is `nil` |

### `AlignIssue`

Full rules in [04-auto-align.md](04-auto-align.md) §6. Raw value = case name.

`noPersonFound`, `requiredJointsMissing`, `personTooSmall`, `imageUnreadable` (these four mean `failed`), and `multiplePeople`, `shoulderTilt`, `hipsEstimated`, `unusualProportions`, `largeRotation`, `lowJointConfidence` (these six mean `lowConfidence`).

### `AutoAlignMode`

| Case | Raw | Meaning |
| :--- | :--- | :--- |
| `torso` | `"torso"` | Uses shoulders and hips |
| `fullBody` | `"fullBody"` | Hips not found; uses shoulders and ankles, hip point estimated |

### `AlignTransform` (struct, `Codable`, `Equatable`)

| Field | Type | Unit |
| :--- | :--- | :--- |
| `scale` | `Double` | Canvas units per Original pixel. > 0. |
| `rotation` | `Double` | Radians. Positive = clockwise on screen (y-down coordinates). |
| `translationX` | `Double` | Canvas units |
| `translationY` | `Double` | Canvas units |

Mapping from an upright Original pixel `p = (x, y)` to a canvas point `c`:

```
c = scale · R(rotation) · p + (translationX, translationY)
R(θ) = [ cos θ  −sin θ ]
       [ sin θ   cos θ ]
```

Canvas: width `0.75`, height `1.0`, origin top-left, y down. To draw at view height `h` points, multiply canvas units by `h`.

`AlignTransform.defaultFit(pixelWidth: w, pixelHeight: h)`:
```
scale = min(0.75 / w, 1.0 / h)
rotation = 0
translationX = (0.75 − w · scale) / 2
translationY = (1.0 − h · scale) / 2
```

Encoded as JSON `Data` in SwiftData. New fields added later must decode with a default (`decodeIfPresent`).

Decision: store transforms as encoded `Data`, not as a SwiftData composite attribute. Reason: optional `Codable` structs had storage bugs in iOS 17.0–17.3, and `Data` makes migrations explicit.

### `PoseLandmarks` (struct, `Codable`)

| Field | Type | Meaning |
| :--- | :--- | :--- |
| `imagePixelWidth` | `Int` | Width of the image Vision ran on (Display image) |
| `imagePixelHeight` | `Int` | Height of that image |
| `joints` | `[String: JointPoint]` | Key = `VNHumanBodyPoseObservation.JointName` raw value, e.g. `"left_shoulder_1_joint"` |
| `bodyCount` | `Int` | Number of observations with ≥ 4 joints at confidence ≥ 0.3 |

`JointPoint`: `x: Double`, `y: Double` (pixels in the Display image, top-left origin, y down), `confidence: Double`.

Only the primary body's joints are stored. They exist so the transform can be recomputed without running Vision again, and for debugging.

## 3. Entities

### `Garment`

| Field | Type | Default | Rules |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `UUID()` | `@Attribute(.unique)` |
| `name` | `String` | — | Trimmed, 1–60 characters. Unique among all Garments (archived included), case- and diacritic-insensitive. |
| `createdAt` | `Date` | now | Never changes |
| `lastActivityAt` | `Date` | now | Set to now when: Garment created, Round created, Shot saved (capture, import, retake, replace). Not on rename, archive, reorder or alignment edits. |
| `isArchived` | `Bool` | `false` | |
| `archivedAt` | `Date?` | `nil` | Set when archived, cleared when unarchived |
| `rounds` | `[Round]` | `[]` | `@Relationship(deleteRule: .cascade, inverse: \Round.garment)` |

### `Round`

| Field | Type | Default | Rules |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `UUID()` | `@Attribute(.unique)` |
| `name` | `String` | default name rule §5 | Trimmed, 1–60 characters. Unique within its Garment, case- and diacritic-insensitive. |
| `sortIndex` | `Int` | count of existing Rounds | Contiguous `0…n−1` within a Garment. Lower = earlier. |
| `createdAt` | `Date` | now | |
| `garment` | `Garment?` | — | Required in practice. Optional only because SwiftData inverses must be optional. |
| `shots` | `[Shot]` | `[]` | `@Relationship(deleteRule: .cascade, inverse: \Shot.round)` |

### `Shot`

| Field (stored) | Typed accessor | Type | Default | Rules |
| :--- | :--- | :--- | :--- | :--- |
| `id` | — | `UUID` | `UUID()` | `@Attribute(.unique)`. Also the folder name. |
| `angleRaw` | `angle` | `String` → `Angle` | — | At most one Shot per (Round, Angle). See §4. |
| `sourceRaw` | `source` | `String` → `ShotSource` | — | |
| `capturedAt` | — | `Date` | — | Camera: shutter time. Import: EXIF `DateTimeOriginal`, else import time. |
| `createdAt` | — | `Date` | now | Time the record was saved |
| `originalFileName` | — | `String` | — | `original.heic`, `original.jpg` or `original.png` |
| `pixelWidth` | — | `Int` | — | Upright Original width (after EXIF orientation) |
| `pixelHeight` | — | `Int` | — | Upright Original height |
| `autoAlignStateRaw` | `autoAlignState` | `String` → `AutoAlignState` | `"pending"` | |
| `autoAlignIssuesRaw` | `autoAlignIssues` | `String` → `[AlignIssue]` | `""` | Comma-separated raw values, sorted alphabetically, no spaces |
| `autoAlignModeRaw` | `autoAlignMode` | `String?` → `AutoAlignMode?` | `nil` | `nil` when `failed` or `pending` |
| `autoConfidence` | — | `Double?` | `nil` | 0–1; see [04](04-auto-align.md) §6 |
| `autoTransformData` | `autoTransform` | `Data?` → `AlignTransform?` | `nil` | In Original pixel space |
| `poseLandmarksData` | `poseLandmarks` | `Data?` → `PoseLandmarks?` | `nil` | |
| `alignAlgorithmVersion` | — | `Int?` | `nil` | Version of the align engine that wrote `autoTransform`. MVP = `1`. |
| `manualTransformData` | `manualTransform` | `Data?` → `AlignTransform?` | `nil` | Written only by Manual Align |
| `manualAlignedAt` | — | `Date?` | `nil` | Set when `manualTransform` is saved; cleared when it is removed |
| `round` | — | `Round?` | — | |

Derived (not stored):

- `effectiveTransform = manualTransform ?? autoTransform ?? AlignTransform.defaultFit(pixelWidth:pixelHeight:)`
- `alignDisplayState`:

| `alignDisplayState` | Condition (first match wins) | Badge text |
| :--- | :--- | :--- |
| `manuallyAligned` | `manualTransform != nil` | "Manual" |
| `aligning` | `autoAlignState == .pending` | "Aligning…" |
| `aligned` | `autoAlignState == .succeeded` | none |
| `needsReview` | `autoAlignState == .lowConfidence` | "Check alignment" |
| `notAligned` | `autoAlignState == .failed` | "Not aligned" |

- `isFileMissing`: `true` when `original.*` does not exist on disk. Checked on launch (§8) and when an image fails to load.

## 4. Invariants

1. At most one Shot per (Round, Angle). SwiftData on iOS 17 has no compound unique constraint (`#Unique` is iOS 18+), so `ShotRepository` enforces it in code. The launch integrity check (§8) repairs duplicates.
2. Every Round has a Garment. Every Shot has a Round.
3. `Round.sortIndex` values in a Garment are exactly `0…n−1`, no gaps or repeats.
4. The Original file is never written to after it is first moved into `Photos/<shotID>/`.
5. Auto-align writes only `autoAlignState`, `autoAlignIssues`, `autoAlignMode`, `autoConfidence`, `autoTransform`, `poseLandmarks`, `alignAlgorithmVersion`. It never writes `manualTransform`.
6. Manual Align writes only `manualTransform` and `manualAlignedAt`.
7. An archived Garment and its Rounds and Shots are read-only. Only `isArchived`, `archivedAt` change (unarchive), or the Garment is deleted.

## 5. Round default name rule

When a New Round Sheet opens for Garment `g`:
1. Look at every Round in `g` whose trimmed name matches `^Proto (\d+)$` (case-insensitive).
2. Let `k` = the highest captured number, or `0` if none.
3. Default name = `"Proto \(k + 1)"`.

"Final" is offered as a one-tap suggestion in the New Round Sheet ([02](02-garments-and-rounds.md)). It is a plain name, with no special behavior.

Examples: no Rounds → "Proto 1". Rounds "Proto 1", "Proto 2" → "Proto 3". Rounds "Proto 1", "Final" → "Proto 2". Rounds "Proto 3" only → "Proto 4".

## 6. Reference Shot rule

`referenceShot(round r, angle a) -> Shot?` is used by Camera (ghost) and Manual Align (overlay):

1. Among Rounds in the same Garment with `sortIndex < r.sortIndex`, take the one with the highest `sortIndex` that has a Shot with angle `a` and `isFileMissing == false`. Return that Shot.
2. Else, among Rounds with `sortIndex > r.sortIndex`, take the lowest `sortIndex` with such a Shot. Return it.
3. Else return `nil`. Callers show the Framing Guide.

The Shot being retaken or aligned is never its own Reference Shot.

## 7. File storage layout

```
<Application Support>/
├── FitLog.store            SwiftData store (+ -wal, -shm)
├── Photos/
│   └── <shotID>/           UUID string, uppercase, as UUID().uuidString
│       ├── original.heic   or original.jpg / original.png — never modified
│       ├── display.jpg     2048 px long edge, JPEG quality 0.85, sRGB, upright, no EXIF orientation
│       └── thumb.jpg       400 px long edge, JPEG quality 0.8, sRGB, upright
├── Staging/
│   └── <uuid>/             in-progress writes; emptied on every launch
└── TestStats.json          TestFlight builds only ([08](08-non-functional.md))
```

Rules:
- If the Original's long edge is ≤ 2048 px, `display.jpg` is still written, at the Original's size.
- File protection: `FileProtectionType.completeUntilFirstUserAuthentication` for all files. Reason: auto-align may finish in a background task while the phone is locked.
- Device backup: files are **not** excluded from iCloud/Finder device backup. See [99-review.md](99-review.md) Q1.
- Size estimate per Shot (assumption, iPhone 13 at 12 MP HEIC): Original 2.5 MB + display 0.6 MB + thumb 0.04 MB ≈ 3.2 MB.

### Write order for a new Shot (camera or import)

1. Write the Original bytes to `Staging/<uuid>/original.<ext>`.
2. Generate `display.jpg` and `thumb.jpg` in the same staging folder.
3. Atomically move `Staging/<uuid>/` to `Photos/<shotID>/` (`FileManager.moveItem`, same volume).
4. Insert the `Shot` record with `autoAlignState = pending`. Update `Garment.lastActivityAt`. Call `modelContext.save()`.
5. If this replaces an existing Shot for the same (Round, Angle): delete the old record, save, then delete the old folder.
6. Enqueue auto-align ([04](04-auto-align.md)).

### Delete order (Shot, Round or Garment)

1. Collect the `id` of every Shot that will be removed.
2. Delete the record (cascade removes children). Call `modelContext.save()`.
3. Delete each `Photos/<shotID>/` folder. A failure here is logged and left to the launch check.

Decision: records are deleted before files. Reason: a leftover folder is invisible and cleaned up later; a record without a file is a broken photo the user sees.

## 8. Launch integrity check

Runs once per cold launch, off the main thread, after the store opens and before auto-align resumes. It must not block the Garment List.

1. Delete everything in `Staging/`.
2. Delete each folder in `Photos/` whose name is not the `id` of an existing Shot.
3. For each (Round, Angle) with more than one Shot: keep the one with the newest `createdAt`; delete the others (records, then files).
4. For each Shot: if `display.jpg` or `thumb.jpg` is missing and the Original exists, regenerate them.
5. For each Shot whose Original is missing: set `isFileMissing = true` in an in-memory set (not stored). Shot Detail shows `Shot Detail / fileMissing`.
6. Re-pack `sortIndex` to `0…n−1` for any Garment where it has gaps or repeats, keeping the current order (ties broken by `createdAt`).
7. Enqueue auto-align for every Shot with `autoAlignState == pending`, oldest `createdAt` first.

## 9. Schema versioning and migration plan

- `FitLogSchemaV1: VersionedSchema`, `versionIdentifier = Schema.Version(1, 0, 0)`, models `Garment`, `Round`, `Shot`.
- `FitLogMigrationPlan: SchemaMigrationPlan` with `schemas = [FitLogSchemaV1.self]` and `stages = []` in MVP.
- The `ModelContainer` is always created with `migrationPlan: FitLogMigrationPlan.self` from the first build. Reason: adding a plan later to a store created without one is error-prone.

Rules for future versions:
1. Adding an optional field or a field with a default: new `VersionedSchema` + `MigrationStage.lightweight`.
2. Renaming a field: use `@Attribute(originalName:)` + lightweight stage.
3. Changing a field's type or splitting data: `MigrationStage.custom` with `willMigrate`/`didMigrate`.
4. Enum raw values are never renamed or reused. New cases are added only.
5. `AlignTransform` and `PoseLandmarks` JSON: new keys decode with `decodeIfPresent` and a default. Old keys are never removed.
6. Changing the align algorithm: bump `alignAlgorithmVersion`. A later release may re-run auto-align on Shots with an older version and `manualTransform == nil`. Not in MVP.
7. Every new schema version ships with a migration test that opens a store fixture from every previous version.

## 10. Repositories (code boundary)

All writes go through three types. Views never write to `ModelContext` directly.

| Type | Owns |
| :--- | :--- |
| `GarmentRepository` | create, rename, archive, unarchive, delete Garment; name validation |
| `RoundRepository` | create, rename, reorder, delete Round; default name; name validation |
| `ShotRepository` | create Shot (write order §7), replace, delete; uniqueness; `referenceShot`; writes alignment fields |
| `PhotoStore` | all file I/O under `Photos/` and `Staging/`; derivative generation; free-space checks |

Every repository method calls `modelContext.save()` before it returns. The app does not rely on SwiftData autosave.

## Acceptance criteria

1. Given a new install, when the app launches, then `FitLog.store` exists and `Photos/` and `Staging/` folders exist.
2. Given a Garment with 2 Rounds and 6 Shots, when the Garment is deleted, then 0 Rounds and 0 Shots of it remain in the store and the 6 `Photos/<shotID>/` folders do not exist.
3. Given a Round with a Front Shot, when `ShotRepository` saves a second Front Shot for that Round, then exactly one Front Shot exists and it is the new one.
4. Given a `Photos/<uuid>/` folder with no matching Shot, when the app cold-launches, then that folder is deleted within 10 s.
5. Given a Shot with `autoAlignState == pending`, when the app cold-launches, then auto-align runs for it and its state becomes `succeeded`, `lowConfidence` or `failed`.
6. Given Rounds named "Proto 1" and "Final", when the default name is computed, then it is "Proto 2".
7. Given a Shot with `manualTransform` set, when auto-align runs again on it, then `manualTransform` is unchanged.
8. Given Rounds with sortIndex 0, 2, 5, when the launch check runs, then their sortIndex values are 0, 1, 2 in the same order.
9. Given `AlignTransform.defaultFit(pixelWidth: 3024, pixelHeight: 4032)`, then `scale` = 1/4032 (±1e-9), `translationX` = 0 (±1e-9), `translationY` = 0 (±1e-9).
10. Given an `AlignTransform` JSON without a future key, when decoded by a newer model, then it decodes without error.
11. Given Round "Proto 1" (sortIndex 0, Front Shot), "Proto 2" (sortIndex 1, no Front), "Proto 3" (sortIndex 2), when `referenceShot(Proto 3, front)` runs, then it returns the Proto 1 Front Shot.

## Definition of Done

- [ ] `FitLogSchemaV1`, `FitLogMigrationPlan`, all three models and all enums/structs exist with the exact names in this file.
- [ ] `GarmentRepository`, `RoundRepository`, `ShotRepository`, `PhotoStore` exist; no View writes to `ModelContext`.
- [ ] Write order and delete order follow §7 exactly.
- [ ] Launch integrity check implements all 7 steps of §8.
- [ ] Unit tests for every acceptance criterion above pass in the simulator.
- [ ] A V1 store fixture (`Fixtures/FitLogV1.store`) is committed for future migration tests.
- [ ] No absolute path is stored in any record (code review check: grep for `path` in model files).

## Test plan

- Unit: default name rule (8 cases incl. "proto 2" lowercase, "Proto 02", "Proto 2 " with trailing space → matches after trim, "Proto two" → ignored); `referenceShot` (lower, higher, none, missing file skipped, self excluded); `defaultFit` for portrait, landscape and square; `AlignTransform` JSON round-trip; `autoAlignIssues` encode/decode ordering.
- Unit (in-memory `ModelContainer`): cascade delete; uniqueness on replace; `lastActivityAt` updates exactly on the listed events; sortIndex re-pack.
- Integration (temp directory): kill-simulation by stopping after each write-order step (1–5), then running the launch check; assert no orphan folder, no duplicate Shot, no Shot without an Original.
- Manual: install, add 3 Shots, delete the app's `Photos/<id>` folder via Xcode's container download/replace, relaunch; Shot Detail shows `fileMissing`.

## Decisions made

| Decision | Reason |
| :--- | :--- |
| One Shot per (Round, Angle) | Compare needs exactly one image per Round per Angle; alternates would need a picker. |
| Flat `Photos/<shotID>/` layout | No file moves on Round reorder; delete is one folder. |
| Display image at 2048 px | Full 12 MP decode is too slow for 60 fps compare and for Vision. |
| Thumbnails are not aligned | Generating aligned thumbnails costs a render per Shot change; lists only need recognition. |
| Garment names unique globally | Import and pickers show names only; duplicates would be ambiguous. |
| No soft delete or trash | Archive is the safe, reversible path. Delete is confirmed and final. |
| Store landmarks | Lets a later algorithm version recompute without Vision and helps debug field failures. |

## Open questions

None. Device backup inclusion is listed in [99-review.md](99-review.md) Q1.
