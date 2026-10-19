# 07 — Import

## Goal

Bring existing fit photos from the photo library into a Round, assign each one an Angle, and auto-align them. Imported Shots then behave exactly like captured ones.

## User stories

1. As a designer with Proto 1 photos already in my camera roll, I want to import them, so that I can compare them with Proto 2 shot in FitLog.
2. As a pattern maker whose colleague AirDropped me fitting photos, I want to add them to the right Round, so that the record is complete.
3. As a designer, I want the app to guess which photo is Front, Side and Back from the order I picked them, so that I rarely change anything.
4. As a sample maker who was denied camera access or forgot to use FitLog at a fitting, I want to import instead, so that I'm not blocked.

## Entry points

| From | Target Round | Preset Angle | Selection limit |
| :--- | :--- | :--- | :--- |
| Round Detail → Import | That Round (fixed) | — | 3 |
| Round Detail → empty slot long-press → Import | That Round (fixed) | That Angle for the first photo | 3 |
| Shot Detail → Replace from Photos | That Shot's Round (fixed) | That Shot's Angle | 1 |
| Garment Detail → Import | Chooser; default = highest-sortIndex Round | — | 3 |
| Camera `permissionDenied` / `permissionRestricted` → Import from Photos | Camera's Round (fixed) | — | 3 |

Not shown for archived Garments.

## Flow (happy path)

1. In Round Detail for Proto 1 (no Shots), the user taps Import.
2. The system photo picker opens (`PhotosPicker`, filter `.images`, `selectionLimit = 3`, `preferredItemEncoding = .current`, `selectionBehavior = .ordered`).
3. The user taps 3 photos in the order front, side, back, then Add.
4. Import Assign opens. Rows show the 3 thumbnails with Angles pre-set to Front, Side, Back. The button reads "Import 3 photos".
5. The user taps Import. The screen shows "Importing 1 of 3", "2 of 3", "3 of 3".
6. When all 3 are saved, Import Assign closes. Round Detail shows 3 slots in `aligning`, which change to `aligned` within a few seconds.

## Screens and states

### System screen: photo picker

Apple's `PhotosPicker`. Not designed by the owner. Runs out of process; FitLog gets only the photos the user picks. Cancel returns to the opening screen with no change.

### Screen: Import Assign

Sheet. Elements:

| Element | Content |
| :--- | :--- |
| Cancel button | Closes without importing anything |
| Title | "Import photos" |
| Target row | "<Garment name> · <Round name>". When opened from Garment Detail, tapping it opens a menu: each Round (sortIndex order) and "New round (<default name>)". Otherwise not tappable. |
| Photo rows | One per picked photo, in selection order |
| Import button | "Import <n> photo(s)", n = rows in `ready` or `replaces`. Disabled when rule 6 says so. |

Photo row elements: Thumbnail; capture date ("Taken 12 Oct 2026, 14:05" or "Date unknown"); Angle picker Front / Side / Back; status text; Remove button (removes the row from this import only).

| Row state | When | Must show |
| :--- | :--- | :--- |
| `loading` | Photo data still transferring from Photos | Placeholder, activity indicator, "Loading…"; for iCloud photos, "Downloading from iCloud…" |
| `ready` | Data loaded, Angle free in target Round, no conflict | Thumbnail, date, Angle picker |
| `replaces` | Angle already has a Shot in the target Round | As `ready` + "Replaces the current <Angle> photo" |
| `conflict` | Another row has the same Angle | "Two photos set to <Angle>" on both rows |
| `unsupported` | Type is not HEIC, JPEG or PNG | "This format isn't supported. Use HEIC, JPEG or PNG." Remove button |
| `unreadable` | Data can't be decoded | "Can't read this photo." Remove button |
| `downloadFailed` | iCloud download failed (no network) | "Couldn't download from iCloud. Check your connection." Retry and Remove |
| `importing` | Being saved | "Saving…" |
| `imported` | Saved | "Imported" |
| `saveFailed` | Write failed | "Couldn't save this photo." |

| Screen state | When | Must show |
| :--- | :--- | :--- |
| `loading` | ≥ 1 row `loading` | Rows; Import disabled |
| `ready` | No row loading, ≥ 1 importable row, no conflict | Import enabled |
| `invalid` | A conflict exists, or 0 importable rows | Import disabled; rows show their errors |
| `importing` | Import tapped, rows saving | "Importing <i> of <n>"; Cancel, Angle pickers, Remove and target row disabled |
| `storageFull` | Free space check fails (rule 9) | "Not enough space. Free up <X> MB to import these photos." Close button. Nothing imported. |
| `partialFailure` | ≥ 1 row `saveFailed` after import | "<k> of <n> imported. <n−k> couldn't be saved." Done button |
| `done` | All importable rows `imported` | Sheet closes on its own (no waiting for alignment) |

## Rules and edge cases

### Assignment

1. Default Angles, applied when the screen opens and when the target Round changes:
   - If a preset Angle exists, the first row gets it.
   - The remaining rows, in selection order, get the target Round's empty Angles in Front → Side → Back order, skipping Angles already given to earlier rows.
   - Rows still without an Angle get the unused Angles in Front → Side → Back order (these will show `replaces`).
2. Changing the target Round re-applies rule 1 to all rows, even rows the user edited. Reason: the right defaults depend on which Angles the new Round has.
3. "New round" in the target menu does not create a Round yet. The Round is created (with the default name, appended at the end) when Import is tapped. Cancel leaves no Round behind.
4. Selection order comes from `selectionBehavior = .ordered`.

### Validation

5. Accepted types: `public.heic`, `public.jpeg`, `public.png`, detected from the data with `CGImageSource` (not from a file name). Everything else → `unsupported`. Live Photos import their still image. Videos can't be picked (filter `.images`).
6. Import is enabled only when: no row is `loading`, no row is `conflict`, and ≥ 1 row is `ready` or `replaces`. Rows in `unsupported`, `unreadable` or `downloadFailed` are skipped and not counted.
7. No resolution limit. A 48 MP import is stored as is; only Display and Thumbnail are downscaled.

### Saving

8. Rows save one at a time, in row order, using the write order in [01](01-data-model.md) §7 with `source = library`. The Original bytes are stored exactly as received from the picker. Extension: `.heic`, `.jpg` or `.png` by detected type.
9. Before saving, check `volumeAvailableCapacityForImportantUsage ≥ 200 MB + 1.3 × (sum of row data sizes)`. If not → `storageFull`, nothing saved. `X` in the message = the shortfall, rounded up to the next 10 MB.
10. `capturedAt` = EXIF `DateTimeOriginal` (+ `OffsetTimeOriginal` when present; else device time zone). If missing, the time of import.
11. `pixelWidth`, `pixelHeight` = upright size: EXIF orientations 5–8 swap width and height.
12. Display and Thumbnail are made with `CGImageSourceCreateThumbnailAtIndex` with `kCGImageSourceCreateThumbnailWithTransform = true`, so they are upright.
13. Each saved Shot is enqueued for auto-align at `.userInitiated` right after its record saves ([04](04-auto-align.md)).
14. `Garment.lastActivityAt` updates once per saved row.
15. The photo library is never changed. FitLog keeps its own copy.

### Required edge cases

| Case | Behavior |
| :--- | :--- |
| Permission denied | No photo library permission is needed: `PhotosPicker` runs out of process. Import works even if the user denied "Photos" access in Settings. FitLog has no `NSPhotoLibraryUsageDescription`. |
| Pose not found | Photo is imported; auto-align marks it `failed`; slot shows "Not aligned". |
| Two people in frame | Imported; `multiplePeople` → "Check alignment". |
| Garment with one round | From Garment Detail the target menu lists that Round and "New round (Proto 2)". |
| Deleted round | Import Assign is a modal sheet, so its target Round can't be deleted while it is open. If the user picked "New round" and then cancels, nothing is created. |
| Storage full | Rule 9; nothing is half-imported because the check runs before the first save. If space runs out mid-import anyway, the failing row is `saveFailed` and the screen ends in `partialFailure`. |
| App killed mid-capture (mid-import) | Rows whose record was saved stay imported. The row being saved is lost (staging is cleaned at launch). Rows not yet started are lost. The user re-imports the missing ones; the remaining Angles are pre-assigned to empty slots by rule 1. |

### Performance

| Metric | Target (iPhone 13) |
| :--- | :--- |
| Picker Add → Import Assign with 3 local thumbnails visible, p90 | ≤ 1.0 s |
| Save one 12 MP HEIC row (copy + Display + Thumbnail + record), p90 | ≤ 1.0 s |
| Save one 48 MP HEIC row, p90 | ≤ 2.5 s |
| Import 3 rows → sheet closes, p90 | ≤ 3.5 s |

## Data touched

| Entity.field | Read | Write |
| :--- | :--- | :--- |
| `Garment.name, isArchived, rounds` | ✓ | `lastActivityAt` |
| `Round.name, sortIndex, shots` | ✓ | new Round when "New round" is chosen |
| New `Shot`: `id, angle, source = library, capturedAt, createdAt, originalFileName, pixelWidth, pixelHeight, autoAlignState = pending` | — | ✓ |
| Replaced `Shot` | ✓ | delete + files |
| Files `Staging/`, `Photos/<shotID>/original.*, display.jpg, thumb.jpg` | — | ✓ |

## Acceptance criteria

1. Given Round Detail for an empty Round, when the user taps Import, then the system picker opens with a limit of 3 and images only.
2. Given 3 photos picked in order, when Import Assign opens, then their Angles are Front, Side, Back in that order.
3. Given a Round with only Side filled, when 2 photos are picked, then their Angles are Front and Back, and neither row shows `replaces`.
4. Given a Round with all 3 filled, when 1 photo is picked, then it gets Front and shows "Replaces the current Front photo".
5. Given two rows set to Front, then both show "Two photos set to Front" and Import is disabled.
6. Given a GIF picked, then its row shows `unsupported` and the Import button counts only the other rows.
7. Given Shot Detail → Replace from Photos on a Side Shot, then the picker limit is 1 and the row's Angle is Side.
8. Given Import from Garment Detail with Rounds P1 and P2, then the target row shows P2, and its menu lists P1, P2 and "New round (Proto 3)".
9. Given "New round (Proto 3)" chosen, when the user taps Cancel, then the Garment still has 2 Rounds.
10. Given "New round (Proto 3)" chosen, when the user taps Import, then Round "Proto 3" exists with sortIndex 2 and holds the imported Shots.
11. Given 3 rows imported, then 3 Shots exist with `source == library`, each `Photos/<shotID>/` has `original.*`, `display.jpg`, `thumb.jpg`, and each Shot's `autoAlignState` leaves `pending` within 5 s on iPhone 13.
12. Given a JPEG with EXIF `DateTimeOriginal` 2026:10:12 14:05:00, then the Shot's `capturedAt` is 12 Oct 2026 14:05 (device time zone when no offset).
13. Given a JPEG with EXIF orientation 6 and stored size 4032 × 3024, then the Shot's `pixelWidth` = 3024, `pixelHeight` = 4032, and `display.jpg` is portrait.
14. Given the imported Original, then its bytes are identical (SHA-256) to the data returned by the picker.
15. Given free space 250 MB and 3 photos totaling 60 MB, then `storageFull` shows with "Free up 30 MB" (200 + 78 − 250 = 28 → 30) and no Shot is created.
16. Given an iCloud-only photo and no network, then its row shows `downloadFailed` with Retry; after network returns, Retry moves it to `ready`.
17. Given camera `permissionDenied`, when the user taps Import from Photos, then the picker opens for the Camera's Round.
18. Given an import of 3 rows, when the app is killed after row 1 saved, then after relaunch the Round has exactly 1 new Shot and `Staging/` is empty.
19. Given the Photos access for FitLog is set to None in Settings, when the user imports, then the picker still opens and import succeeds.

## Definition of Done

- [ ] Import Assign with all row and screen states.
- [ ] All entry points in the table wired, with the right target, preset and limit.
- [ ] `ImportAssignment` (pure: default Angles, conflicts, enabled rule, button count) with unit tests for rules 1, 2, 6.
- [ ] `PhotoImporter` (type detection, EXIF date, upright size, derivatives) with unit tests on fixture files: HEIC, JPEG, PNG, JPEG orientation 6, GIF, corrupted bytes, no EXIF.
- [ ] Saves go through `ShotRepository` ([01](01-data-model.md) §7).
- [ ] Unit tests: AC 2, 3, 4, 5, 6, 12, 13, 14, 15.
- [ ] UI tests (picker replaced by `-mockPhotoPicker` returning fixture data): AC 7, 8, 9, 10, 11, 17.
- [ ] Device tests: AC 1, 16, 18, 19; results in the PR.
- [ ] Test Stats event `shotsImported` ([08](08-non-functional.md)).
- [ ] All strings in the String Catalog.

## Test plan

Unit:
- Default Angle assignment: all 8 fill states of the target Round × 1–3 photos × with/without preset.
- Enabled rule with every mix of row states.
- Storage math rounding.
- EXIF parsing: with offset, without offset, missing, malformed.

UI (mock picker):
- Each entry point; target change re-applies defaults; Remove a row; conflict resolution by changing an Angle.

Manual (device):
- Import 3 real HEIC photos from the camera roll; compare `original.heic` size to the library export.
- Import an iCloud-only photo with Wi-Fi off, then on.
- Import a 48 MP ProRAW-off HEIC from an iPhone 15 Pro; check timing.
- Import a screenshot (PNG); check it imports and fails align with "No person found in the photo".
- AirDrop 3 photos from another phone, then import them.

## Decisions made

| Decision | Reason |
| :--- | :--- |
| One target Round per import, max 3 photos | Matches the one-Shot-per-Angle model; a multi-Round mapper is a bigger screen. Revisit after the test (backlog imports). |
| Angles from selection order | Users tend to shoot front→side→back; zero taps in the common case. Assumption, checked in the test. |
| Use `PhotosPicker`, no library permission | Better privacy; no permission screen; works when Photos access is denied. |
| Store the Original bytes unchanged | Same "never overwrite the original" rule as capture. |
| Only HEIC, JPEG, PNG | Covers iPhone photos and screenshots; RAW/other formats would need conversion, which would change the Original. |
| Close the sheet before alignment finishes | Alignment shows progress in Round Detail; waiting adds seconds for nothing. |
| "New round" is created on Import, not on pick | Cancel leaves no empty Round behind. |

## Open questions

None.
