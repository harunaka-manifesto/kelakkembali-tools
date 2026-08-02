# README-INDEX — seek, do not read

`README.md` is 964 lines / ~51 KB of prose rationale. Reading it whole costs ~15k tokens and answers nothing a map already answers.

**Read a section only when you need the *why* behind a rule the code does not explain.** For *where* and *what*, use [FEATURES.md](FEATURES.md) and the file maps instead.

```
Read README.md offset=<line> limit=<span>
```

| Lines | Section | Read when |
| ---: | :--- | :--- |
| 7–21 | Overview + the four-step flow | Never — this file summarises it |
| 22–45 | Setting up the database | Onboarding a new Supabase project |
| 46–65 | Running locally | You need the serve command (it is in `AGENTS.md` §6) |
| 66–75 | Deploying to Vercel | Deployment questions |
| 76–109 | How it works | Never — see [ARCHITECTURE.md](../ARCHITECTURE.md) |
| 110–151 | The data model | Never — see [DATABASE.md](DATABASE.md) |
| 152–164 | Saving | Changing dirty-state / save-bar behaviour |
| 165–181 | Navigation | Changing routing or the Up-not-Back rule |
| 182–245 | The lifecycle | Changing customer stages or derived status |
| 246–260 | The follow-up | Touching follow-up dates or nudges |
| 261–274 | The wedding date | Touching `wedding_date_precision` |
| 275–287 | Rendering | Changing PDF snapshot flow |
| 288–312 | Why the capture is defended so heavily | **Before** changing anything in the html2canvas path |
| 313–334 | Moodboard generator | Moodboard work |
| 335–353 | Orientation | Changing 16:9 / 9:16 handling |
| 354–363 | Full-screen overlay | Overlay gestures |
| 364–401 | Exports | Moodboard export / Drive |
| 402–427 | Fitting log | Fitting feature background |
| 428–457 | The watermark | Watermark changes |
| 458–500 | The design contract — quotation | **Before** touching `#quotation` |
| 501–535 | The document typeface | Font questions |
| 536–553 | A note on rendered font weight | Font weight looks wrong in a PDF |
| 554–594 | The design contract — invoice | **Before** touching `#invoice` |
| 595–696 | **Business rules** | Any pricing, status, terms, or deposit logic — the densest useful section |
| 697–768 | Google Calendar | Calendar sync work |
| 769–870 | The schedule | **Before** changing `calendar.js` |
| 871–939 | Customer intake (Tally) | Intake webhook work |
| 940–964 | Assets | Asset questions |

---

## Other prose in the repo — do not read

| Path | Status |
| :--- | :--- |
| `plans/*.md` (8 files, ~4600 lines) | Historical implementation records. Superseded. Never read. |
| `PLAN-FITTING-STAGE-LOGS.md` (332 lines) | Same. Never read. |
| `MOODBOARD-BUILD.md` (181 lines) | Same. Never read. |
| `.claude/worktrees/` | Stale duplicate of the whole repo, including a 2803-line older `app.js`. Never read; exclude from every grep. |

If a plan file and the code disagree, **the code is right**. If a plan file and [ARCHITECTURE.md](../ARCHITECTURE.md) disagree, ARCHITECTURE.md is right.
