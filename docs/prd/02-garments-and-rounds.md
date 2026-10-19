# 02 — Garments and Rounds

## Goal

Let the user create and manage Garments and their Rounds in a few taps, and give every other feature (Camera, Import, Manual Align, Compare) one clear place to start from.

## User stories

1. As a pattern maker, I want to create a Garment and start shooting Proto 1 at once, so that I don't lose time at the fitting.
2. As a designer, I want my most recently worked-on Garment at the top of the list, so that I can find it with one hand.
3. As a designer, I want to add a new Round with a sensible default name, so that I don't type during a fitting.
4. As a sample maker, I want to rename a Round, so that I can call it "Final" or "Proto 2b".
5. As a founder, I want to archive Garments that are done, so that the list only shows current work without losing photos.
6. As a designer, I want to delete a Garment or Round I made by mistake, so that it doesn't clutter my work.
7. As a pattern maker, I want to reorder Rounds, so that the order matches the real fitting order when I created one late.
8. As a designer, I want to see at a glance which Angles of a Round are missing or need an alignment check, so that I can fix them before the model leaves.

## Navigation

```
Garment List ──> Garment Detail ──> Round Detail ──> Shot Detail
     │                 │                  │               ├─> Manual Align (05)
     │                 │                  │               ├─> Camera (03, retake)
     │                 │                  │               └─> Import Assign (07, replace)
     │                 │                  ├─> Camera (03)
     │                 │                  ├─> Import Assign (07)
     │                 │                  └─> Compare (06, "Compare with previous")
     │                 ├─> New Round Sheet ──> Camera (03, "Create & Shoot")
     │                 ├─> Compare (06)
     │                 └─> Import Assign (07)
     ├─> New Garment Sheet ──> Camera (03, "Create & Shoot") or Garment Detail
     ├─> Archived Garments ──> Garment Detail (archived)
     └─> Settings (08)
```

`NavigationStack` for the four main screens. Sheets for New/Rename. Camera is a full-screen cover.

## Flow (happy path)

1. User opens the app. Garment List shows (state `empty` on first launch).
2. User taps New Garment. New Garment Sheet opens with the name field focused.
3. User types "Linen Shirt" and taps Create & Shoot.
4. App creates Garment "Linen Shirt" and Round "Proto 1" (sortIndex 0), then opens Camera for Proto 1 at Front ([03](03-guided-camera.md)).
5. User captures Front, Side, Back and taps Done. Round Detail for Proto 1 shows 3 filled Angle Slots.
6. At the next fitting, the user opens Linen Shirt (top of the Garment List), taps New Round. The name field shows "Proto 2".
7. User taps Create & Shoot. Camera opens for Proto 2 at Front with the Proto 1 Front ghost.
8. After capture, Round Detail for Proto 2 shows 3 Shots. Garment Detail's Compare button is enabled.
9. When the garment is approved, the user archives it from the Garment List with a swipe.

## Screens and states

### Screen: Garment List

Root screen. Shows active (non-archived) Garments sorted by `lastActivityAt`, newest first.

Always present: title, New Garment button, Settings button, search field (filters by name; case- and diacritic-insensitive "contains").

Each Garment row shows: cover Thumbnail, Garment name (max 2 lines, then truncated), Round count ("3 rounds", "1 round", "No rounds"), last activity ("Today", "Yesterday", or a medium date such as "12 Oct 2026"), and an issue count if any Shot in it has `alignDisplayState` `needsReview` or `notAligned` ("2 to check").

Cover Thumbnail rule: the `thumb.jpg` of the Front Shot of the highest-sortIndex Round that has a Front Shot; else the first Shot (Front→Side→Back) of the highest-sortIndex Round with any Shot; else a placeholder.

Row actions: tap → Garment Detail. Trailing swipe: Archive (full swipe), Delete. Context menu (long-press): Rename, Archive, Delete.

The last list item is an "Archived (n)" row when n ≥ 1. Tap → Archived Garments.

| State | When | Must show |
| :--- | :--- | :--- |
| `loading` | Store not open yet, shown only if opening takes > 300 ms | Progress indicator, no rows |
| `empty` | 0 active and 0 archived Garments | Short line explaining Garment → Round → Shot; New Garment button |
| `emptyWithArchived` | 0 active, ≥ 1 archived | "No active garments" text; New Garment button; "Archived (n)" row |
| `ready` | ≥ 1 active Garment | Rows as above |
| `searchNoResults` | Search text matches no active Garment | "No garments match "<text>"", Clear Search button |
| `storeError` | SwiftData container failed to open | "FitLog can't open its data." Retry button. The app never deletes the store on its own. |

### Screen: Archived Garments

List of archived Garments sorted by `archivedAt`, newest first. Same row content as Garment List. Tap → Garment Detail (`archived` state). Trailing swipe: Unarchive, Delete.

| State | When | Must show |
| :--- | :--- | :--- |
| `empty` | Last archived Garment was unarchived or deleted while open | "No archived garments"; screen auto-pops after 1 s |
| `ready` | ≥ 1 archived | Rows |

### Screen: New Garment Sheet

Fields: Name (text, focused, keyboard open). Buttons: Create & Shoot (primary), Create, Cancel.

| State | When | Must show |
| :--- | :--- | :--- |
| `editing` | Default | Name field, both create buttons disabled while trimmed name is empty |
| `invalidDuplicate` | Trimmed name equals an existing Garment name (case/diacritic-insensitive) | Inline error "A garment named "<name>" already exists." (add " It's in Archived." if that Garment is archived). Create buttons disabled. |
| `invalidTooLong` | Trimmed name > 60 characters | Inline error "Use 60 characters or fewer." Create buttons disabled. Typing beyond 60 is allowed so paste is not cut silently. |
| `saving` | After tap, until saved | Buttons disabled (normally < 100 ms; no spinner) |

Create: makes the Garment and Round "Proto 1", dismisses, pushes Garment Detail. Create & Shoot: same, then pushes Round Detail for Proto 1 and opens Camera at Front over it.

Paywall note (later, not built): this is where a Garment limit would be checked.

### Screen: Rename Garment Sheet

Field prefilled with the current name, text selected. Buttons: Save, Cancel. Same validation states as New Garment Sheet (`editing`, `invalidDuplicate`, `invalidTooLong`, `saving`). Save is disabled when the trimmed name equals the current name. Comparing against itself never counts as duplicate.

### Screen: Garment Detail

Title: Garment name. Shows Rounds in `sortIndex` order, lowest first.

Each Round row: Round name; three mini slots labeled F, S, B showing the Thumbnail or an empty placeholder; issue count ("1 to check") if any Shot is `needsReview` or `notAligned`.

Actions:
- New Round (opens New Round Sheet).
- Compare (opens Compare, [06](06-compare.md)). Enabled only when at least one Angle has Shots in ≥ 2 Rounds. When disabled, caption under it: "Shoot a second round to compare."
- Import (opens Import Assign with Round choice, [07](07-import.md)).
- Edit (enters edit mode: drag handles to reorder, delete buttons on rows).
- More menu: Rename, Archive, Delete.

Row tap → Round Detail. Row trailing swipe: Rename, Delete.

| State | When | Must show |
| :--- | :--- | :--- |
| `noRounds` | 0 Rounds | "No rounds yet"; New Round button; Compare disabled with caption |
| `roundsWithoutPhotos` | ≥ 1 Round, 0 Shots in total | Round rows with empty slots; prompt line "Open a round to shoot or import photos" |
| `ready` | ≥ 1 Shot | Rows as above |
| `editing` | Edit tapped | Drag handles, delete buttons, Done button; New Round, Compare, Import hidden |
| `archived` | `isArchived == true` | Banner "Archived. Unarchive to make changes." with Unarchive button. New Round, Import, Edit, Rename hidden. Compare available if enabled by the rule above. More menu shows Unarchive and Delete. |

### Screen: New Round Sheet

Fields: Name (prefilled with the default name rule, [01](01-data-model.md) §5, text selected). Suggestion chip "Final" (shown only if no Round named "Final" exists in the Garment); tapping it sets the field to "Final". Buttons: Create & Shoot (primary), Create, Cancel.

New Round is appended: `sortIndex = current Round count`.

States: `editing`, `invalidDuplicate` ("A round named "<name>" already exists in this garment."), `invalidTooLong`, `saving` — same behavior as New Garment Sheet.

Create → dismiss, stay on Garment Detail with the new row visible. Create & Shoot → push Round Detail for the new Round and open Camera at Front.

### Screen: Rename Round Sheet

Same as Rename Garment Sheet, with Round validation (unique within the Garment).

### Screen: Round Detail

Title: Round name. Subtitle: Garment name.

Three Angle Slots in order Front, Side, Back. Each slot shows the Angle label and one of the slot states below. Tap a filled slot → Shot Detail. Tap an empty slot → Camera at that Angle. Long-press an empty slot → menu: Shoot, Import.

Actions:
- Shoot: opens Camera at the first empty Angle in Front→Side→Back order. If all three are filled, opens Camera at Front (it will show "Replaces current photo").
- Import: opens Import Assign with this Round fixed ([07](07-import.md)).
- Compare with previous: opens Compare in Slider mode with Round A = the nearest lower-sortIndex Round that shares a filled Angle with this Round, Round B = this Round, Angle = first shared Angle in Front→Side→Back order. Hidden when no such Round exists.
- More menu: Rename, Delete Round.

| Angle Slot state | When | Must show |
| :--- | :--- | :--- |
| `empty` | No Shot for this Angle | Angle label, "Add Front" (or Side/Back) |
| `aligning` | `alignDisplayState == aligning` | Thumbnail, "Aligning…" with activity indicator |
| `aligned` | `aligned` | Thumbnail only |
| `needsReview` | `needsReview` | Thumbnail, "Check alignment" badge |
| `notAligned` | `notAligned` | Thumbnail, "Not aligned" badge |
| `manuallyAligned` | `manuallyAligned` | Thumbnail, "Manual" badge |
| `fileMissing` | `isFileMissing` | Placeholder, "Photo missing" badge |

| Screen state | When | Must show |
| :--- | :--- | :--- |
| `empty` | 0 Shots | Three `empty` slots; Shoot as the main action; Import |
| `partial` | 1 or 2 Shots | Mixed slots; Shoot label "Shoot missing angles" |
| `complete` | 3 Shots | Three filled slots; Shoot label "Retake" |
| `archived` | Garment archived | Slots read-only (tap filled → Shot Detail); Shoot, Import, Rename, Delete hidden; Compare with previous kept |

### Screen: Shot Detail

Shows one Shot drawn in the Canvas with its effective transform. Pinch to zoom up to 4×, double-tap toggles 1× / 2.5× at the tap point.

Always present: Round name + Angle label (e.g. "Proto 2 · Side"), capture date and time, source ("Camera" or "Imported"), a segmented control Aligned / Original (Original draws `defaultFit`), and the align status line.

Align status line text by `alignDisplayState`:
- `aligned`: "Aligned automatically"
- `needsReview`: "Check alignment: " + issue texts joined by "; " ([04](04-auto-align.md) §6 table)
- `notAligned`: "Couldn't align: " + issue text
- `manuallyAligned`: "Aligned by hand"
- `aligning`: "Aligning…"

Actions: Adjust Alignment (→ Manual Align), Retake (→ Camera at this Angle), Replace from Photos (→ Import Assign with this Round and Angle preset), Delete Photo.

| State | When | Must show |
| :--- | :--- | :--- |
| `loading` | Display image decoding, shown only after 200 ms | Thumbnail scaled up as placeholder |
| `ready` | Image loaded | Image, info, status line, actions |
| `aligning` | `alignDisplayState == aligning` | Image in `defaultFit`, "Aligning…"; Adjust Alignment disabled until done |
| `fileMissing` | Original missing | "This photo's file is missing." Delete Photo and Retake actions only |
| `archived` | Garment archived | Image, info, status line; no actions except Aligned/Original toggle |

Delete Photo confirmation: "Delete the Side photo from Proto 2? This can't be undone." Buttons: Delete (destructive), Cancel. After delete, pop to Round Detail.

## Rules and edge cases

### Required edge cases

| Case | Behavior |
| :--- | :--- |
| Permission denied | Not handled on these screens. Shoot always opens Camera; Camera shows `Camera / permissionDenied` ([03](03-guided-camera.md)). |
| Pose not found | Slot shows `notAligned`; Garment row and Garment Detail row count it in "n to check". |
| Two people in frame | Slot shows `needsReview`; Shot Detail status line includes "More than one person in the photo". |
| Garment with one round | Compare disabled with caption. Round Detail hides Compare with previous. Ghost uses Framing Guide (03). |
| Deleted round | Confirm, delete (cascade), re-pack `sortIndex`, pop to Garment Detail if the deleted Round's Round Detail or Shot Detail was open. Reference Shot and Compare defaults re-evaluate on next open. |
| Storage full | Creating, renaming, archiving and deleting still work (records are under 2 KB). Shoot and Import go to their own `storageFull` states (03, 07). |
| App killed mid-capture | On relaunch, Round Detail shows only Shots whose record was saved. Shots left `pending` show `aligning` until the launch check re-runs auto-align (01 §8). |

### Other rules

1. Names are trimmed of leading/trailing whitespace and newlines before validation and save. Internal spaces are kept.
2. Delete Garment confirmation: "Delete "<name>"? This deletes <r> rounds and <s> photos. This can't be undone." With 0 photos: "Delete "<name>"? This can't be undone." Buttons: Delete (destructive), Cancel.
3. Delete Round confirmation: "Delete <round name>? This deletes <s> photos. This can't be undone." (0 photos: no count clause.)
4. Archive needs no confirmation and is undoable: a 5 s toast "Archived "<name>"" with Undo. Undo sets `isArchived = false`, `archivedAt = nil`.
5. Reorder: dragging a Round row writes new contiguous `sortIndex` values for all Rounds in the Garment in one save, on drop.
6. Reorder does not rename Rounds. "Proto 2" moved above "Proto 1" keeps its name.
7. A Garment may have 0 Rounds (the user deleted them all). New Round then defaults to "Proto 1".
8. If a Garment or Round is deleted while auto-align is running on one of its Shots, the align job must check that the Shot still exists before writing and drop the result if not.
9. Search is local to the Garment List; it does not search Rounds.
10. No limits on Garment or Round counts. Performance is specified at 200 Garments and 20 Rounds per Garment ([08](08-non-functional.md)).

## Data touched

| Entity.field | Read | Write |
| :--- | :--- | :--- |
| `Garment.id, name, createdAt` | ✓ | create, rename |
| `Garment.lastActivityAt` | ✓ (sort) | create; Round create |
| `Garment.isArchived, archivedAt` | ✓ | archive, unarchive |
| `Garment.rounds` | ✓ | cascade delete |
| `Round.id, name, sortIndex, createdAt, garment` | ✓ | create, rename, reorder, delete |
| `Shot.angle, autoAlignState, manualTransform, autoAlignIssues` | ✓ (slots, badges, counts) | — |
| `Shot.*` | — | delete (Delete Photo, cascade) |
| Files `Photos/<shotID>/thumb.jpg`, `display.jpg` | ✓ | delete |

## Acceptance criteria

1. Given 0 Garments, when the app launches, then Garment List is in state `empty` and shows the New Garment button.
2. Given New Garment Sheet with name "  Linen Shirt  ", when the user taps Create, then a Garment named "Linen Shirt" exists with exactly one Round named "Proto 1" with sortIndex 0, and Garment Detail is shown.
3. Given New Garment Sheet, when the user taps Create & Shoot with a valid name, then Camera opens for Round "Proto 1" at Angle Front.
4. Given a Garment "Linen Shirt" exists, when the user types "linen shirt" in New Garment Sheet, then the error "A garment named "linen shirt" already exists." shows and both create buttons are disabled.
5. Given a name of 61 characters, then the `invalidTooLong` error shows and create buttons are disabled.
6. Given Garments A (lastActivityAt yesterday) and B (today), then Garment List shows B above A.
7. Given Garment A below B, when a Shot is saved in A, then A moves above B on the next display of the list.
8. Given a Garment with Rounds "Proto 1" and "Proto 2", when New Round Sheet opens, then the name field contains "Proto 3".
9. Given a Garment with a Round named "Final", when New Round Sheet opens, then the "Final" chip is not shown.
10. Given an active Garment, when the user full-swipes Archive, then it leaves Garment List, appears in Archived Garments, and an Undo toast shows for 5 s.
11. Given the Undo toast, when the user taps Undo within 5 s, then the Garment is active again and `archivedAt` is nil.
12. Given an archived Garment, when Garment Detail opens, then New Round, Import, Edit and Rename are not shown and the Unarchive banner is shown.
13. Given a Garment with 2 Rounds and 5 Shots, when the user taps Delete, then the dialog text reads "Delete "<name>"? This deletes 2 rounds and 5 photos. This can't be undone."
14. Given that dialog, when the user taps Delete, then the Garment, its Rounds, its Shots and their 5 photo folders are gone, and Garment List no longer shows it.
15. Given Rounds P1 (0), P2 (1), P3 (2), when the user drags P3 to the top and taps Done, then sortIndex values are P3=0, P1=1, P2=2 and names are unchanged.
16. Given Rounds P1, P2, P3, when P2 is deleted, then sortIndex values are P1=0, P3=1.
17. Given a Garment where only one Round has Shots, then Compare is disabled and the caption "Shoot a second round to compare." is visible.
18. Given Rounds P1 and P2 both with a Front Shot, then Compare is enabled.
19. Given a Round with Front only, when the user taps Shoot, then Camera opens at Side.
20. Given a Round with all 3 Angles, when the user taps Shoot, then Camera opens at Front.
21. Given a Shot with `autoAlignState == lowConfidence` and no manual transform, then its Angle Slot shows the "Check alignment" badge.
22. Given a Shot whose Original file was deleted from disk, when the app cold-launches and Round Detail opens, then its slot shows "Photo missing".
23. Given Shot Detail of a Side Shot in Proto 2, when the user deletes the photo, then the confirmation text reads "Delete the Side photo from Proto 2? This can't be undone." and after Delete the slot is `empty`.
24. Given search text "zzz" with no match, then Garment List shows `searchNoResults` with a Clear Search button.

## Definition of Done

- [ ] All 9 screens in this file exist with every listed state, reachable in the simulator.
- [ ] All writes go through `GarmentRepository` / `RoundRepository` / `ShotRepository` ([01](01-data-model.md) §10).
- [ ] Validation rules (trim, 1–60 chars, uniqueness) are in the repositories, with the sheets only displaying results.
- [ ] Every user-facing string in this file is in the String Catalog (English only).
- [ ] Unit tests for acceptance criteria 2, 4, 5, 6, 7, 8, 9, 13, 14, 15, 16, 17, 18 pass.
- [ ] UI tests for acceptance criteria 1, 3, 10, 11, 12, 19, 20, 23, 24 pass on the iPhone 15 simulator.
- [ ] VoiceOver: every row, slot and button has a label; slot labels include state (e.g. "Front, check alignment").
- [ ] Dynamic Type: all screens usable at AX3 without clipped text in names or buttons.
- [ ] Manual test checklist below run once on a physical device and results noted in the PR.

## Test plan

Unit (in-memory store):
- Name validation: empty, spaces only, 60 chars, 61 chars, duplicate in active, duplicate in archived, case variant, diacritic variant ("Café" vs "Cafe"), rename to same name.
- Default round name examples from [01](01-data-model.md) §5.
- Sorting by `lastActivityAt`; which events update it.
- Reorder and re-pack after delete.
- Delete counts in dialog text.
- Compare enable rule: 0, 1, 2 Rounds; 2 Rounds sharing no Angle (P1 Front only, P2 Back only → disabled).

UI (XCUITest, seeded store via launch argument `-seedFixture garments_basic`):
- Create & Shoot path reaches Camera (camera mocked with `-mockCamera`).
- Archive, Undo, Unarchive from Archived Garments.
- Delete Round while its Round Detail is in the stack.

Manual (device):
- One-handed: create a Garment and reach Camera using only the right thumb, phone in the right hand. Record tap count (target ≤ 3 taps after typing the name).
- Make 25 Garments, scroll and search; check list stays smooth.
- Kill the app from the app switcher right after Create; relaunch; Garment and Proto 1 exist.

## Decisions made

| Decision | Reason |
| :--- | :--- |
| New Garment auto-creates "Proto 1" | Every Garment needs a Round to hold photos; saves 2 taps at the first fitting. |
| Garments sort by last activity; no manual Garment reorder | The current Garment rises to the top with zero effort. |
| Rounds have manual reorder | Round order drives Compare and the ghost; users sometimes create a Round late. |
| Archived Garments are read-only | One simple rule; no edge cases about shooting into finished work. |
| Archive has Undo, Delete has confirmation, no trash | Archive is the soft path; a trash adds a screen and storage rules. |
| "Final" is a suggested name, not a flag | The brief only asks for the name; a flag adds behavior nobody specified. |
| No onboarding screens | The `empty` state explains the model in one line; fewer screens for the owner to design. |
| Portrait only | One-handed studio use; Camera overlay geometry is portrait. |

## Open questions

None.
