# Precept S-tier layer

Version 1.0, written 2026-10-03. This is a layer on top of `docs/plan/PRECEPT_PLAN.md`, not a replacement. Milestones M0 to M10 stay the backbone and their order does not change. Each item here names the milestone it extends and the features it depends on. Track progress in `docs/plan/PLAN_STATUS.md` (rows `S1` to `S7` and `S-Q1` to `S-Q5`).

Everything in `PRECEPT_PLAN.md` still applies: the exclusions in section 1.2, the principles in section 1.3, the decision gates in section 2 and the engineering conventions in section 3.

---

## 1. What S-tier means for Precept

The goal is both a product engineers would pay for and a codebase that holds up to review by senior engineers.

An A-tier Precept works, is honest and looks good. An S-tier Precept also does four things together that the competitors in the research do not:

1. **It questions your own stories the way an interviewer does.** It asks follow-up probes about the story you wrote, not generic questions from a library.
2. **It knows how well you can tell each story today.** That comes from a memory model fed by your real review history, not a streak counter.
3. **It shows the source of every number and every judgement.** Every figure on screen can answer "how is this computed?", and every AI judgement quotes its evidence.
4. **It closes the loop.** An interview leads to a debrief, the debrief changes the drill queue, and the changed queue prepares the next interview.

The engineering is checkable by anyone reading the repository:
- evaluated AI;
- end-to-end tests;
- accessibility and performance budgets enforced in CI;
- observability;
- written decisions (ADRs).

## 2. Rules for this layer

- **Deterministic before AI.** Every signature feature has a version that works with no LLM call. The AI version is an upgrade behind the usage guard (M1-F3) and, where it reads stories, the opt-in from gate D9.
- **Verify outside facts first.** Some items depend on facts outside this repository: FSRS formulas and weights, browser speech recognition support, OpenTelemetry packages, the MCP C# SDK, and OpenAPI type generators. The implementer must confirm these in official documentation and cite the source in the ADR or commit message. Do not write them from memory.
- **Quality bars are measured, not claimed.** Nobody has measured the current Lighthouse, accessibility or latency values. Each S-Q item starts by recording a baseline in `PLAN_STATUS.md`. A bar joins the definition of done only after its baseline exists.

---

## 3. Signature features

### S1 Defend mode: follow-up probe drills
- **Extends:** M3-F5 (story detail page and drill angles), M5-F2 (follow-up generation).
- **Depends on:** M3-F1 (structured story fields). The AI version also needs M1-F3 and D9.
- **Do:**
  - **Probe library.** Add a deterministic probe library keyed to story fields; each missing or thin field yields interviewer follow-ups. Examples:
    - no `MeasurableImpact` → "How did you know it worked?";
    - no `TradeOffs` → "What did you give up to get this?";
    - no `Constraints` → "What would you change with half the time?";
    - no `Lessons` → "What would you do differently?".
  - **Probe metadata.** Each probe has a stable `ProbeType`: Impact, TradeOff, Constraint, Alternative, Failure, Ownership, Scale.
  - **Session flow.** A Defend session shows the story prompt, then chains 2 to 4 probes. The user answers aloud or typed, then self-rates each probe with the existing rating scale.
  - **Storage.** Ratings are stored per probe type on the review row from M3-F4 (add a nullable `ProbeType` column), or in a small `ProbeResult` table if that keeps the review log clean. Record the choice in an ADR.
  - **Weak probe types.** Surface them per user ("trade-off questions are your weakest") on the story detail page and the dashboard. This needs at least 3 rated probes of a type; below that, show "not enough data".
  - **AI version.** Probes generated from the user's own story text: capped per session, metered as feature `defend_probe`, output schema-validated, falling back to the deterministic library on failure.
- **Reuse:**
  - the drill flow and keyboard shortcuts in `Precept.Web/src/pages/QuizMode.tsx`;
  - `ConfidencePicker` and `confidenceMeta` in `Precept.Web/src/components/domain.tsx`;
  - `ReviewScheduler` for rescheduling.
- **Tests:**
  - each missing field yields its probe type;
  - a fully filled story still gets generic probes (Alternative, Failure, Scale);
  - weakest-type aggregation, including the minimum-data rule;
  - the AI path makes zero LLM calls when D9 opt-in is off;
  - invalid AI output falls back to the library.
- **Principle check:**
  - no AI is needed for the core;
  - no fabricated data, since weak-type claims need a minimum sample;
  - the user rates themselves.

### S2 Recall forecast: real FSRS
- **Extends:** M3-F4 (review log). Replaces M9 item 10.
- **Depends on:** M3-F4.
- **Do:**
  - **Replace the stub.** `Precept.Api/Services/SpacedRepetition/FsrsAlgorithm.cs` currently falls back to SM-2; replace it with a real FSRS implementation behind the existing `ISpacedRepetitionAlgorithm` interface.
  - **Verification gate.** Take the formulas, the rating mapping and the default parameters from the official open-spaced-repetition documentation or reference implementation, and cite the exact source and version in an ADR. Before writing your own, check whether a maintained .NET implementation exists, and record the build-or-adopt decision in the ADR.
  - **Rating mapping.** Map the existing ratings to FSRS grades, and document the mapping.
  - **Per-user fitting.** Fit parameters per user only once they have enough reviews. Take the minimum count from the FSRS documentation. Until then, use the defaults.
  - **What it shows.** "Chance you can tell this story cold today" (retrievability) on story cards and the story detail page, and the drill queue ordered by lowest retrievability.
  - **Honesty rule.** A story with no review history shows "not enough reviews yet" instead of a number.
  - **Fallback.** Keep SM-2 selectable per user or by config.
- **Tests:**
  - **Test vectors.** Unit tests against published vectors from the reference implementation (exact outputs for given inputs, if available). If none are published, use hand-computed cases from the cited formulas.
  - **Monotonicity.** Retrievability decays with elapsed time.
  - **Grades.** Interval ordering across grades.
  - **Fallback.** Switching back to SM-2 works.
  - **Empty state.** Shown with no history.
- **Principle check:** a number appears only with real review history, and the formula is visible through S7.

### S3 Interview kit: the fewest stories that cover the most requirements
- **Extends:** M4-F4 (evidence links), M6-F2 (prep plan).
- **Depends on:** M4-F4.
- **Do:**
  - **Algorithm.** Greedy weighted set cover over confirmed `EvidenceLink` rows for one opportunity:
    - choose stories one at a time, each covering the most uncovered required requirements, with Strong links worth more than Partial (record the weights in an ADR);
    - stop at 6 stories or when nothing more is covered;
    - list the remaining uncovered requirements as gaps, linked to M4-F7 "gap to action".
  - **Kit page.** `/applications/:id/kit` shows the chosen stories, the requirements each covers with strength badges, a one-line hook (from the story's summary field) and the numbers from the user's own `MeasurableImpact` text.
  - **10-minute warm-up.** A drill session that uses only the kit's stories, with S1 probes on the weakest probe types.
  - **Print view.** A print stylesheet so the kit can be saved as PDF from the browser. It is labelled as preparation material. The page must not suggest using it during an interview (see the exclusions in section 1.2 of the main plan).
- **Tests:**
  - the set cover picks the expected stories on fixture data;
  - ties break deterministically, by StoryId;
  - no confirmed links produces an empty kit with every requirement listed as a gap;
  - suggested (unconfirmed) links are ignored.
- **Principle check:** no AI, and the reasoning is visible (each story shows what it covers).

### S4 Answer replay and delivery metrics
- **Extends:** M5-F8 (voice stays local), M5-F3 (rubric).
- **Depends on:** M5-F1 (session persistence) for storing metrics; the replay itself is client-side only.
- **Do:**
  - **Recording.** Record answers with `MediaRecorder` and capture a timestamped transcript from browser speech recognition. Audio stays in the browser; only the transcript and metrics are sent to the server, and only when the user saves the session.
  - **Delivery metrics, computed in the browser:**
    - words per minute;
    - filler-word count (fixed list, shown to the user);
    - answer length compared with the drill angle's target (for example the 2-minute version);
    - longest pause.
  - **Rubric links.** Rubric quotes from M5-F3 link to the matching moment in the replay.
  - **Verification gate.** Speech recognition support differs between browsers. Check current support in official browser documentation before building, and show a clear "typed answers only in this browser" state where it is missing.
- **Tests:**
  - metric functions on fixture transcripts with timestamps;
  - the filler-word count ignores words inside longer words;
  - no network request carries audio (frontend test that inspects calls made through `api.ts`).
- **Principle check:** no audio upload, and metrics are deterministic and explained.

### S5 Story drift check
- **Extends:** M5-F3 (the "Consistency with the stored story" dimension).
- **Depends on:** M5-F1. The AI comparison also needs M1-F3 and D9.
- **Do:**
  - **Extraction.** Extract numbers (with units and percentages), named technologies (using the existing skill dictionary in `JobDescriptionKeywordExtractor`) and the decision sentence from both the mock transcript and the linked story.
  - **Differences shown.** A number that changed ("40% here, 25% in your story"), technologies that appear in only one version, and a missing decision.
  - **Shared code.** The M5-F3 fabricated-number guard uses the same number extraction.
  - **AI comparison.** An optional deeper comparison runs only with opt-in, and is metered.
- **Tests:**
  - number extraction handles `40%`, `3x`, `200 ms`, `1.2k` and written numbers from a fixed list;
  - a changed number is flagged and an identical one is not;
  - there are no false flags on a fixture where the numbers are only reordered.
- **Principle check:** the check flags differences for the user to resolve and never edits the story.

### S6 Visible loop: debrief, then what changed
- **Extends:** M6-F3 (debrief), M6-F4 (dashboard v2).
- **Depends on:** M6-F3. It is richer with S1, since weak probe types feed in.
- **Do:**
  - **After saving a debrief**, show a "What this changed" summary:
    - which stories moved to due now;
    - which probe types were added to Defend mode for the next round;
    - which prep items were created;
    - each item links to where it lives.
  - **Dashboard.** Show the loop per opportunity: last interview, debrief done or not, changes pending.
- **Tests:**
  - the summary lists exactly the side effects the debrief caused (compare against database state);
  - saving the same debrief twice causes no duplicate changes.
- **Principle check:** shows real side effects only.

### S7 Proof on every number
- **Extends:** M1-F8 (integrity fixes), M6-F4 (readiness formula).
- **Depends on:** M1-F9 (frontend test runner).
- **Do:**
  - **Required source.** Every metric component (`Stat` in `Precept.Web/src/components/ui/kit.tsx`, readiness, coverage, recall forecast, delivery metrics) requires a `source` prop: the formula in plain words plus the underlying counts.
  - **Popover.** It renders as a "How is this computed?" popover, reachable by keyboard.
  - **API.** Server aggregates return their inputs alongside the result, so the popover never recomputes or guesses.
- **Tests:**
  - a frontend test fails if any metric renders without a source;
  - an API test checks that the aggregate endpoints return their input counts.
- **Principle check:** this is principle 5 ("show the reasoning") applied everywhere.

### Stretch, after M8 (founder picks one at a time)
- **Offline drill PWA.**
  - The app is installable, caches the due queue, records reviews offline and syncs when back online.
  - **Conflict rule.** The review log is append-only, and the newest review per story sets the schedule.
  - `Precept.Web/public/sw.js` exists; audit it before extending.
- **Read-only MCP server (M9 item 1).** Lets an assistant quiz the user on their stories. Verify the official C# MCP SDK and its current API before building.
- **GitHub evidence agent (M10-F3).** Unchanged from the main plan.

---

## 4. Engineering quality bars

### S-Q1 Accessibility
- **Do:**
  - **Target.** WCAG 2.2 AA.
  - **Automated checks.** Add axe checks to the Playwright suite. Verify the current package name for axe with Playwright in its documentation.
  - **Baseline.** Record violations on the core pages. Fix them until zero remain on the five core journeys.
  - **Keyboard and motion.** Each journey must be completable by keyboard alone. Reduced motion is already respected; keep it that way.
- **Tests:** axe runs in CI on the core journeys.

### S-Q2 Performance budgets
- **Do:**
  - **Baseline.** Record a Lighthouse baseline for `/` and `/dashboard`, then set budgets for performance score, Largest Contentful Paint and JavaScript per route.
  - **Chunking.** Confirm GSAP and Lenis load only on the landing route. They are split into their own chunks today; check that nothing in the app shell imports them.
  - **CI.** Add a Lighthouse CI step. Verify the current tool and configuration in its documentation.
- **Tests:** the CI step fails when a budget is exceeded.

### S-Q3 API contract
- **Do:**
  - **Generate types.** The API already serves an OpenAPI document (`AddOpenApi` and `MapOpenApi` in `Precept.Api/Program.cs`). Generate TypeScript types from it to replace the hand-written `Precept.Web/src/types.ts`, one area at a time.
  - **Generator.** Choose it after checking its documentation, and record the choice in an ADR.
  - **CI.** Regenerate the types and fail on drift.
- **Tests:** the drift check in CI, plus the type check (`npm run lint`).

### S-Q4 Security headers and threat model
- **Do:**
  - **Headers.** Add a Content Security Policy and the standard security headers at the reverse proxy or in the API, whichever serves the frontend in production (depends on M2-F1).
  - **Threat model.** Write `docs/security/THREAT_MODEL.md` covering auth, demo accounts, AI prompt injection, SSRF in job capture, and data export and deletion.
  - **Scans.** Keep the existing NuGet and npm scans in `ci.yml`.
- **Tests:** an integration test asserts the headers on a page response.

### S-Q5 Architecture decision records
- **Do:**
  - **Format.** Add `docs/adr/`, one short file per decision (context, decision, consequences, sources).
  - **Backfill:**
    - cookie authentication;
    - per-visitor demo accounts;
    - AI opt-in for reading stories (D9);
    - local-only audio.
  - **New ADRs**, written with their features:
    - FSRS (S2);
    - Defend mode probe storage (S1);
    - interview kit weights (S3);
    - generic requirement target (M4-F2);
    - OpenAPI type generator (S-Q3).
- **Tests:** none (documentation).

### AI evaluation is required
M5-F7 (offline evaluation harness) moves from optional to required. That means:
- versioned prompts;
- at least 30 fixture transcripts with expected rubric levels;
- an agreement report per prompt version;
- the M5-F6 injection corpus.

Schema validation and guard tests run in CI. Live-model evaluations run on demand, not in CI, because they cost money and are not deterministic.

### Frontend tests
M1-F9 adds Vitest and React Testing Library. This layer adds Playwright end-to-end tests for five core journeys:
1. Sign up.
2. Bank a story.
3. Drill.
4. Add an opportunity and link evidence (after M4).
5. Run a mock and debrief (after M6).

Start with journeys 1 to 3. The screenshot scripts used for the frontend redesign are a starting point.

---

## 5. Sequencing

| When | S items |
|---|---|
| Alongside M1 | S-Q5 backfill; baselines for S-Q1, S-Q2 and S-Q3; Playwright smoke for journeys 1 to 3 with M1-F9 |
| With M2 | S-Q4 (headers depend on the production stack) |
| With M3 | S2 after M3-F4; deterministic S1 with M3-F5; S7 starts |
| With M4 | S3 after M4-F4; journey 4 |
| With M5 | S4, S5, AI probes for S1, required AI evaluation harness |
| With M6 | S6; journey 5 |
| M8 launch | Defend mode in the no-signup demo is the launch hook; the incident story checker (M8-F3) reuses the S1 probe library |
| After M8 | Stretch items, one at a time |

Migrations still follow section 3 of the main plan: one per feature, and features that add migrations do not run in parallel.

## 6. Risks specific to this layer

| Risk | Response |
|---|---|
| FSRS adds complexity that users cannot see | Ship it only with the visible recall forecast and the S7 explanation; keep SM-2 as fallback |
| Probe library feels repetitive | Track probe repeats per story; rotate wording; AI probes as the upgrade |
| Quality bars slow feature work | Bars apply only after a baseline exists, and only to the journeys listed |
| Browser speech recognition is unavailable for some users | Typed answers are a full path; delivery metrics that need timing are hidden, not faked |
