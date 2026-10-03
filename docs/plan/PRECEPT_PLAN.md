# Precept implementation plan

Version 1.0, written 2026-10-02. Source material: `docs/research/precept-market-and-product-strategy.md` (market and competitor research plus a codebase audit of the working copy on 2026-10-02). Track progress in `docs/plan/PLAN_STATUS.md`. Run the work with the prompt in `docs/plan/AGENT_ORCHESTRATOR_PROMPT.md`.

File paths in this plan come from a read-only audit that could not build, run tests or use git. Every implementer must confirm a path exists before editing it and must treat the audit as a map, not ground truth.

---

## 1. What we are building

### 1.1 Product promise

Precept helps a software engineer explain and defend their own engineering work in interviews and reviews, using evidence they captured, mapped to the exact requirements in front of them.

Paid core (first revenue):

1. Story bank v2 with spaced-repetition drilling and a real review history.
2. Opportunity workspace: requirements extracted from a job description, each linked to the user's own stories with a strength rating and a one-line rationale.
3. Grounded mock interviews: questions and follow-up probes built from the opportunity's requirements and the user's linked stories, evaluated with a visible rubric that cites the transcript and the story.
4. Interview and debrief loop: a debrief pushes weak stories and weak topics back into the drill queue and prep plan.

Retention track (after first revenue): the same requirements x evidence engine pointed at career ladders and review cycles, plus an evidence agent that drafts entries from sources the user connects and asks for confirmation. See milestone M10.

### 1.2 What we are not building (for now)

- A resume builder or resume tailoring tool (Teal, Huntr, Rezi win here).
- An "ATS score" or headline match percentage.
- A question library for system design or coding (Hello Interview, Exponent win here).
- Auto-apply of any kind.
- Any live, in-interview assistance or overlay. Precept is practice only, and the terms say so.
- Employer-side screening of candidates (would pull Precept into EU AI Act high-risk and NYC Local Law 144 territory).

### 1.3 Principles every feature must follow

1. **No fabricated data.** No hard-coded chart values, no invented metrics in AI output, no placeholder numbers shown as real. If there is not enough data, the UI says so.
2. **The user confirms, the AI suggests.** AI output that changes user data (stories, links, requirements) is saved as a suggestion until the user accepts it.
3. **Every AI call is metered.** All LLM calls go through the usage guard (M1-F3). No exceptions, including background jobs.
4. **AI reads stories only with opt-in.** Decision D9. Without opt-in, mapping is manual with dictionary keyword hints.
5. **Show the reasoning.** Strength ratings and rubric levels always carry a rationale or a quote.
6. **Small, testable steps.** Each feature lands with unit and integration tests and leaves the build green.
7. **Honest copy.** Landing, README and changelog describe only what exists.

---

## 2. Founder decision gates

Agents must stop and ask when a feature depends on an unresolved gate. Defaults are what the plan assumes if the founder accepts them. Record answers in `PLAN_STATUS.md`.

| ID | Decision | Default proposed | Needed before |
|---|---|---|---|
| D1 | Google sign-in: remove for launch, or implement real ID-token validation | Remove for launch; revisit after M8 | M1-F1 |
| D2 | Hosting: single always-on server running Docker Compose, or Cloud Run | Single always-on server (VPS) with Compose behind one reverse proxy on one origin | M2-F1 |
| D3 | Payments and tax: Stripe Managed Payments, Paddle, or Lemon Squeezy | Stripe Managed Payments with hosted Checkout (verify one-time payment support before building) | M7-F2 |
| D4 | Price points for the 30-day pass, 90-day pass and credit packs | Test roughly US$19 to $29 per 30 days and $39 to $49 per 90 days; packs of $10 or more | M7-F1 |
| D5 | Repository visibility and license (private, AGPL core, other) | Stay private until after M8 | M9 self-host item |
| D6 | Production LLM provider and model for text features | A mid-tier model with prompt caching; keep it in config only | M1-F3 |
| D7 | Demo approach | Ephemeral per-visitor demo account with canned AI responses | M1-F2 |
| D8 | Email provider | Keep Resend, already integrated | M1-F5 |
| D9 | Let AI read a user's stories for mapping and grounding | Per-user opt-in toggle, off by default, explained in plain words | M4-F4 |
| D10 | Mock rubric format | Per-dimension levels (Missing, Weak, Adequate, Strong) with quotes; no overall percentage | M5-F3 |
| D11 | Closed beta size and recruiting source | 15 to 30 engineers with interviews scheduled, from personal network and communities | M6 exit |
| D12 | Annual "keep-ready" plan for the retention track | Decide after beta interviews | M10 |

---

## 3. Engineering conventions for all agents

- **Backend layering.** Follow the existing pattern: Controller -> Service (interface in `Services/Interfaces`) -> `PreceptDbContext`. DTOs live in `Precept.Api/DTOs`. Do not put EF queries in controllers.
- **Tenancy.** Every user-owned entity has `UserId` and is covered by the global per-user `HasQueryFilter` in `PreceptDbContext`. New entities must add the filter and an integration test proving cross-tenant access returns 404.
- **Soft delete.** Follow the existing Story and Application soft-delete pattern for any entity a user can delete and might want back.
- **Migrations.** One migration per feature, named for the feature (for example `M3F4_StoryReviewLog`). Never edit an applied migration. Features that add migrations must not run in parallel, because EF model snapshots conflict.
- **Enums.** Before changing an enum used in a column (for example `ApplicationStatus`), check whether it is stored as int or string and write the migration accordingly. Append values; never renumber.
- **CSRF.** Mutating `/api` calls require the `X-Requested-With` header that `Precept.Web/src/api.ts` already sends. New frontend calls go through `api.ts`.
- **Config, not code.** Model names, token limits, quotas, prices and prompt versions live in configuration or constants, never scattered in services.
- **Library APIs.** Do not guess method names or package names. Confirm against official docs or existing code in the repo, and say in the commit or notes what was verified.
- **Secrets.** Never open, print or commit `.env`, `appsettings.*.json` secrets or keys.
- **Tests.** Backend: xUnit, FluentAssertions, NSubstitute, Testcontainers PostgreSQL (existing setup in `Precept.Tests`). Frontend: Vitest and React Testing Library once M1-F9 lands. Each feature adds tests for its acceptance criteria.
- **User-facing copy.** Plain, specific language. No em dashes. Avoid stock AI vocabulary (seamless, robust, leverage, unlock, elevate and similar). Sentence case headings.
- **Definition of done (every feature):** acceptance criteria met; `dotnet build` and `dotnet test` pass; `npm run lint`, `npm run build` and (after M1-F9) `npm test` pass; no new warnings treated as errors; docs touched by the change are updated; `PLAN_STATUS.md` updated with commit hash and notes.

---

## 4. Milestone overview

| Milestone | Goal | Exit condition |
|---|---|---|
| M0 | Reconcile the repository and establish a true baseline | Clean git state, CI green, baseline recorded, docs no longer lie |
| M1 | Fix security and integrity blockers | No known critical or high issues; AI spend capped |
| M2 | Private production deployment and compliance baseline | Invite-only production URL running with backups, monitoring, privacy policy |
| M3 | Story bank v2 with review history | Structured stories, tags, real confidence trend |
| M4 | Opportunity workspace: requirements x evidence | Opportunity detail page with confirmed evidence links |
| M5 | Grounded mock interview studio | Persisted, metered, grounded sessions with cited rubric |
| M6 | Interview and debrief loop, closed beta | Debrief feeds the drill queue; closed beta running |
| M7 | Billing and entitlements | Users can buy passes and credits; features gated |
| M8 | Public launch | Public landing, pricing, demo, launch posts |
| M9 | Post-revenue backlog | Founder picks items one at a time |
| M10 | Retention track: career targets and evidence agent | Employed users have a weekly reason to return |

Dependencies: M0 -> M1 -> M2. M3 can start once M1 is done (M2 can run alongside M3 if files do not overlap). M4 needs M3-F1 and M3-F3. M5 needs M4 and M1-F3. M6 needs M5. M7 needs M1-F3 and should start after M5. M8 needs M6 and M7. M9 and M10 need M8.

---

## M0. Reconcile the repository

The audit found the git index badly out of sync with the working tree: `Precept.Web/package.json` missing from disk, many current files untracked, deleted files still tracked, and `deploy-api.yml` triggering on `main` while the local branch is `master`. Nothing else should start until this is resolved. Git operations in M0 are founder-confirmed: agents propose commands and wait for approval before anything that rewrites history or deletes files.

### M0-F1 Git state reconciliation
- **Do:** run `git status`, `git branch -a`, `git log --oneline -20`, and `git fetch` then compare with the remote default branch. Restore `Precept.Web/package.json` from git history, or if absent, from the copy inside `precept.md` (verify it matches `package-lock.json`). Stage the current source tree deliberately; confirm with the founder that files like `TokenService.cs`, `RefreshToken.cs`, `JwtSettings.cs`, `CookieOptionsFactory.cs`, `Subscription.tsx` are meant to be deleted. Pick one default branch name and align `.github/workflows/ci.yml` and `deploy-api.yml` triggers to it.
- **Acceptance:** `git status` is clean; remote default branch contains the current code; CI runs on that branch.
- **Parallel:** no. **Gate:** founder confirms every deletion and push.

### M0-F2 Baseline build and test record
- **Do:** run `dotnet build`, `dotnet test`, `npm ci`, `npm run lint`, `npm run build`. Record pass/fail, test counts and duration in `PLAN_STATUS.md` under "Baseline". Fix only what blocks the build; log other failures as M0 findings.
- **Acceptance:** baseline section filled in with real numbers.

### M0-F3 Repository hygiene
- **Do:** create `docs/archive/` and move older planning docs there (`R1_Implementation_Plan.md`, `Precept_Codebase_Analysis.md`, `IMPLEMENTATION_TUTORIAL.md`, `testing-masterclass.md`, `EVALUATION.md`, `precept_testing_strategy.md`, `auth_reuse_detection_cascade_revocation.md`, `Precept_Technical_Report.docx`). Ask the founder before removing `precept.md`, `precept-codebase.md`, `graphify-out/`, `create_technical_report.py`, `run_graphify.ps1`; default is to add them to `.gitignore` rather than delete. Delete unrouted `Precept.Web/src/pages/HomePage.tsx`. Remove `express`, `dotenv`, `tsx` from frontend runtime dependencies if no source imports them.
- **Acceptance:** root contains only project files, README, CHANGELOG, LICENSE, compose files and `docs/`; build still green.

### M0-F4 Documentation truth pass
- **Do:** rewrite `PRECEPT_OVERVIEW.md` to describe cookie auth (v1.3.0), not JWT and refresh rotation. In `README.md`, remove the link to the missing `OWASP-SECURITY-AUDIT.md`, the trash recovery UI claim, full-text search claim and per-user BYOK claim; fix the Postgres version to match compose. Add a CHANGELOG entry "Documentation corrections" listing what earlier entries overstated (Google OAuth, full-text search, confidence trajectory, skill soft delete, test count). Do not rewrite old entries.
- **Acceptance:** every claim in README and overview maps to code that exists.

---

## M1. Security and integrity blockers

Nothing goes on a public URL until M1 is complete. M1-F1 and M1-F2 are critical.

### M1-F1 Google sign-in (gate D1)
- **Problem:** `POST /api/auth/google` signs in any email without validating a token; `LoginPage.tsx` uses `window.prompt` for the email; `AuthEndpointTests.cs` (around line 297) asserts this behavior.
- **Do (default):** remove the endpoint, `GoogleAuthRequest` DTO, the button and the insecure test. Add a test that the route returns 404.
- **Do (if D1 says implement):** validate the Google ID token server-side with Google's official .NET library (confirm the package and method in Google's docs), check audience against the configured client ID, use the token's verified email only, require `email_verified`. Use Google Identity Services on the frontend. Tests: missing, forged and wrong-audience tokens are rejected.
- **Acceptance:** no code path signs a user in from an unverified email.

### M1-F2 Demo isolation (gate D7)
- **Problem:** `DemoLogin` signs everyone into one shared account with a hard-coded password; demo users can delete the account, change the profile, sign out every other visitor and call paid LLM endpoints.
- **Do:** replace with an ephemeral tenant per visitor: create `demo-{guid}@demo.invalid` with a random unguessable password, `IsDemo = true`, `DemoExpiresAt = now + 24h` (new fields on `ApplicationUser`), seed with the existing seed methods. Demo users: AI endpoints return canned, clearly labelled sample responses from fixtures (no LLM call); email-sending endpoints blocked; billing blocked. Limit demo creation per IP (for example 5 per hour). Add a cleanup background job that deletes expired demo users. Remove the hard-coded password from source.
- **Tests:** two demo logins get different users; demo user cannot reach an LLM client (assert with a substitute that records zero calls); expired demo users are deleted.
- **Acceptance:** demo visitors cannot affect each other or spend AI budget.

### M1-F3 AI usage guard and spend caps (gate D6)
- **Do:**
  - New entity `UsageLedger` (Id, UserId, Feature, Units, InputTokens, OutputTokens, EstimatedCostUsd, Provider, Model, PromptVersion, CreatedAt). Per-user query filter.
  - New `IUsageGuard` with `CheckAsync(userId, feature)` and `RecordAsync(...)`. Limits from config: per-user per-day and per-month units per feature, plus a global daily USD budget. Over the user limit returns HTTP 402 with a structured body (`{ code: "limit_reached", feature, remaining, resetsAt }`); over the global budget returns 503 with a friendly message and logs an alert.
  - Wrap every LLM call. Simplest path: a decorator over `ILlmClient` resolved through `ILlmClientFactory` that requires a usage context, so no call can bypass it.
  - Set max output tokens on every client from config (OpenAI and Gemini clients currently set none).
  - Move the Gemini key from the URL query string to a request header (confirm the header name in Google's Gemini API docs).
  - Parse token usage from provider responses where the response includes it; otherwise estimate and mark as estimated.
  - Cost table per model in config, with a note to update it when prices change.
- **Tests:** limits enforced per user; global budget enforced; ledger rows written with tokens; clients send max tokens.
- **Acceptance:** no LLM call exists without a ledger row and a limit check.

### M1-F4 Data Protection keys and forwarded headers
- **Do:** persist Data Protection keys to the database (confirm the EF Core key store package and API in Microsoft docs) with a fixed application name. Add `UseForwardedHeaders` configured for the reverse proxy chosen in D2 (known proxies or networks only).
- **Tests:** integration test that a cookie issued by one app instance is accepted by a second instance sharing the database.
- **Acceptance:** restarts and multiple instances do not log users out.

### M1-F5 Email verification and password reset (gate D8)
- **Do:** wire the unused `PreceptSettings` (FrontendUrl, EmailSenderDomain) into a typed options class. On register, send a verification email through `IEmailService`. `forgot-password` emails a reset link to `{FrontendUrl}/reset-password?token=...`; never log tokens in any environment; always return the same response whether or not the email exists. Require a confirmed email for AI features and purchases, not for basic use. Add or fix frontend pages for verify and reset. Add "resend verification".
- **Tests:** fake email service captures messages; reset token works once; unknown email gets the same response; unverified user gets 403 with a clear code on AI endpoints.
- **Acceptance:** a user can recover an account without the founder.

### M1-F6 Partitioned rate limiting
- **Do:** replace the unpartitioned `auth` and `general` policies with partitioned limiters: auth by client IP (after forwarded headers), general by user id with IP fallback, and a stricter `ai` policy by user id. Values in config.
- **Tests:** two different IPs do not share an auth bucket; one user hitting the limit does not block another.

### M1-F7 SSRF hardening for job capture
- **Do:** in `ApplicationService` capture: disable automatic redirects and follow up to 3 manually, validating each hop; validate the resolved IP at connect time (a `SocketsHttpHandler` connect callback) so DNS rebinding cannot swap the address; block loopback, private, link-local, CGNAT, IPv6 ULA and link-local, IPv4-mapped IPv6, `0.0.0.0`, and cloud metadata hosts; fail closed on DNS errors; keep the 10 s timeout and 2 MB cap.
- **Tests:** redirect to `169.254.169.254` rejected; IPv6 private rejected; DNS failure rejected; public URL allowed (use a fake resolver and handler, no real network).

### M1-F8 Integrity fixes
- **Do:**
  - `ConfidenceTrendChart.tsx`: remove the hard-coded Week 1 to 4 values. Until M3-F4 lands, show "Not enough review history yet."
  - `MockInterviewService.EvaluateFallbackAnswer`: remove the invented "35%" metric; label fallback output as "offline heuristic, not an AI evaluation" in the response and UI.
  - `MockInterview.tsx` `handleSaveToStarBank`: stop writing the evaluator's critique into Situation/Task/Action/Result. Save the user's own transcript as a draft story the user must edit before it counts (full flow in M5-F5).
  - `Landing.tsx`: remove "Bring your own key" and the "JWT Rotation" card; remove any claim not true today.
  - `DashboardService`: `NeedsReview` uses `NextReviewAt <= now` and includes behavioral stories.
  - Dashboard: compute counts server-side instead of from the first 25 paginated items.
  - Funnel: count stages reached using `ApplicationEvent` history, not current status.
- **Tests:** unit tests for NeedsReview and the event-based funnel; snapshot or render test that the trend chart shows the empty state with no history.
- **Acceptance:** nothing on screen is invented.

### M1-F9 Frontend test runner
- **Do:** add Vitest and React Testing Library (confirm versions compatible with Vite 6 and React 19), a `test` script, and smoke tests for: login form submit, story drill review, mock interview page render with a mocked API. Add `npm test` to `ci.yml`.
- **Acceptance:** CI runs frontend tests.

### M1-F10 Health checks, logging and migrations
- **Do:** split health into `/api/health/live` (static) and `/api/health/ready` (checks the database). Set Serilog file retention (for example 14 files). Turn off `RunMigrationsOnStartup` in production and add an explicit migration step (EF migration bundle or a one-off command) documented in the deploy guide.
- **Acceptance:** readiness fails when the database is down; logs do not grow without limit.

**M1 exit:** run a security-focused review of the whole auth, demo, AI and capture surface (orchestrator milestone review). No open critical or high findings.

---

## M2. Private production deployment and compliance baseline

Goal: a real production environment, invite-only, so M3 to M6 ship to real users early.

### M2-F1 Production stack (gate D2)
- **Do (default VPS):** `docker-compose.prod.yml` with Postgres (named volume), API, web (nginx static) and a reverse proxy with automatic TLS on one origin so the `SameSite=Strict` cookie works. Secrets via an env file on the server, never committed. Delete `Precept.Web/vercel.json`. Deployment through a GitHub Actions workflow that builds images, pushes to a registry and runs a deploy step the founder approves, or a documented manual script.
- **If D2 = Cloud Run:** keys in DB (M1-F4) are mandatory, the digest job moves to a scheduled job (Cloud Scheduler calling a protected endpoint), and the web app must be served from the same origin as the API.
- **Acceptance:** `https://<domain>` serves the app and API on one origin; deploy is repeatable from a doc.

### M2-F2 Backups
- **Do:** nightly `pg_dump` to storage off the server, 14 to 30 day retention, and a written restore drill that has been run once.
- **Acceptance:** a restore into a scratch database succeeds and is logged in `PLAN_STATUS.md`.

### M2-F3 Monitoring and alerts
- **Do:** error tracking for API and web (choose a hosted or self-hosted tool; confirm SDK usage in its docs), an external uptime check on `/api/health/ready`, and an alert when daily AI spend passes 80% of the global budget (from M1-F3).
- **Acceptance:** a forced test error appears in the tracker; budget alert fires in a test.

### M2-F4 Background jobs safe for one or many instances
- **Do:** make the daily digest and demo cleanup idempotent and single-runner (database advisory lock or a job-run table). Confirm `LastDigestSentAt` prevents duplicate sends.
- **Tests:** two concurrent runs send one digest.

### M2-F5 Privacy policy, terms and AI disclosure
- **Do:** add a privacy policy page covering purposes, data collected (stories, job descriptions, transcripts), sub-processors (LLM provider, email, hosting, payments later), data location (state the hosting country), retention, deletion, export, the statement that user content is not used to train models, and contact. Update `TermsOfService.tsx`: practice only, no live interview assistance, no use for screening other people's candidacies, AI output may be wrong. Show "You are talking to an AI interviewer" in the mock studio. Never send user data to any provider tier that trains on inputs. Mark these pages "general information, reviewed by the founder", since none of this is legal advice.
- **Acceptance:** founder has reviewed the copy; links present in footer and signup.

### M2-F6 Data export and deletion completeness
- **Do:** export includes every user-owned entity (including `ApplicationEvent`, review logs, sessions, links as they arrive) as JSON, plus a Markdown export of stories. Verify account deletion cascades through all new tables. Add an integration test that walks every DbSet with a `UserId` and asserts deletion and export cover it, so future entities cannot be missed.
- **Acceptance:** the coverage test fails if a new user-owned entity is not exported or deleted.

### M2-F7 Invite-only access
- **Do:** registration requires an invite code (table `InviteCode`: Code, MaxUses, Uses, ExpiresAt) while a config flag is on. Admin endpoint (Admin role exists for testimonials) to create codes.
- **Acceptance:** signups without a valid code are refused while the flag is on.

---

## M3. Story bank v2 with review history

### M3-F1 Structured technical story fields
- **Do:** add nullable fields to `Story`: Context, Problem, Constraints, Decision, Implementation, TradeOffs, Outcome, MeasurableImpact, Lessons. Keep CodeSnippet and Explanation (Explanation becomes "summary"; relax the 50-character minimum only if the new fields are filled). Add a computed `Completeness` (count of filled core fields: Problem, Decision, TradeOffs, Outcome, MeasurableImpact) returned in DTOs, with no AI involved. Update create and edit forms with progressive sections.
- **Tests:** create and update with new fields; completeness computed correctly; existing stories still load.

### M3-F2 Behavioral story parity
- **Do:** add soft delete to `BehavioralStory` (matching `Story`), plus optional Constraints, TradeOffs, MeasurableImpact, Lessons. Add trash and restore endpoints for behavioral stories, and a Trash tab in Settings covering stories and applications (the README promised it).
- **Tests:** delete, list trash, restore; cross-tenant 404.

### M3-F3 Tags
- **Do:** `Tag` (Id, UserId, Name normalized) and join tables `StoryTag` and `BehavioralStoryTag`. Migrate the technical `Category` value and the behavioral comma-separated `Tags` into tags (keep `Category` column for now). Tag filter and autocomplete in the Story Bank UI.
- **Tests:** migration data mapping (seed then migrate in a Testcontainers test); tag filter returns correct stories.

### M3-F4 Review log and real confidence trend
- **Do:** `StoryReview` (Id, UserId, StoryKind, StoryId, Rating, Quality, ConfidenceBefore, ConfidenceAfter, IntervalDays, ReviewedAt, DrillAngle nullable). Insert a row on every review in both story services. Endpoints: `GET /api/story/{id}/reviews`, `GET /api/behavioralstory/{id}/reviews`, `GET /api/dashboard/review-trend?days=`. Rebuild `ConfidenceTrendChart` from real data with the empty state from M1-F8.
- **Tests:** review writes a log row; trend endpoint aggregates correctly; chart renders real points.

### M3-F5 Story detail page
- **Do:** route `/story-bank/:kind/:id` modelled on concept screen 3: structured fields with inline edit, tags, completeness, review history list, confidence trend, upcoming review date, and drill angles. Drill angles are fixed prompts (explain to a junior engineer, 2-minute version, deep dive on trade-offs, what would you do differently); choosing one starts a drill and records the angle on the review row. No AI required.
- **Tests:** frontend render tests for empty and filled stories.

### M3-F6 Search coverage
- **Do:** extend `SearchService` to behavioral stories, job descriptions and the new structured fields. Consider PostgreSQL full-text search with a generated `tsvector` column; if adopted, update the CHANGELOG honestly.
- **Tests:** each entity type is returned for a matching term; cross-tenant isolation.

### M3-F7 Story draft from pasted text (stretch, needs M1-F3)
- **Do:** user pastes a postmortem or design doc; the AI returns suggested structured fields as JSON (schema-validated); the user edits and saves. Nothing saves automatically. Metered as feature `story_draft`. Strip code blocks over a size limit and warn the user not to paste confidential material.
- **Tests:** schema validation rejects malformed output; fallback message on failure; ledger row written.

---

## M4. Opportunity workspace: requirements x evidence

This is the paid core and the main differentiator.

### M4-F1 Stage model and history
- **Do:** check how `ApplicationStatus` is stored, then append stages `Saved` and `Onsite` (keep existing values), add `ClosedReason` (nullable), and expose days-in-stage computed from `ApplicationEvent`. Kanban gains the new columns.
- **Tests:** migration preserves existing rows; days-in-stage correct; status transition rules still enforced.

### M4-F2 Requirement entity on a generic target
- **Design note:** requirements hang off a generic target so the retention track (M10) can reuse them for career ladders and review cycles without a rewrite.
- **Do:** `RequirementSet` (Id, UserId, TargetKind enum {JobDescription, CareerLevel, ReviewCycle}, TargetId nullable, Title, CreatedAt, PromptVersion, Source). `Requirement` (Id, UserId, RequirementSetId, Text, Kind {Required, Preferred, Responsibility, SenioritySignal}, Category nullable, SortOrder, Source {Ai, Dictionary, Manual}, IsDeleted). A job description owns one requirement set. CRUD endpoints so the user can add, edit, reorder and delete requirements.
- **Tests:** CRUD, ordering, tenancy.

### M4-F3 Requirement extraction
- **Do:** `IRequirementExtractor` with two implementations: `LlmRequirementExtractor` (structured JSON output validated against a schema, one retry on invalid JSON, metered as `jd_extract`, prompt version recorded) and the existing dictionary extractor as fallback when AI is off, the user is over quota, or the call fails. The UI marks each requirement's source.
- **Tests:** valid JSON parsed; invalid JSON triggers retry then fallback; quota exceeded falls back to dictionary with a visible notice; prompt-injection text in the JD does not break the schema.

### M4-F4 Evidence links (gate D9)
- **Do:** `EvidenceLink` (Id, UserId, RequirementId, StoryKind, StoryId, Strength {Strong, Partial, Weak}, Rationale max 300 chars, Source {AiSuggested, User}, Status {Suggested, Confirmed, Rejected}, CreatedAt, ConfirmedAt). Users can link stories manually from both the requirement side and the story side. With AI opt-in (new `ApplicationUser.AllowAiOnStories`, settings toggle with a plain explanation), `POST /api/requirement-sets/{id}/suggest-links` sends requirement texts plus story summaries (title, problem, decision, outcome, impact; not code snippets) and returns suggestions with strength and rationale. Suggestions stay `Suggested` until the user confirms or rejects. Without opt-in, show keyword overlap hints computed locally.
- **Alignment summary:** counts of requirements with Strong, Partial, Weak, or no confirmed evidence. No overall percentage.
- **Tests:** AI path blocked when opt-in is false (zero LLM calls); suggestions never auto-confirm; summary counts correct; deleting a story removes or flags its links.

### M4-F5 Opportunity detail page
- **Do:** route `/applications/:id` modelled on concept screen 4: header (company, role, source, dates), stage pipeline with dates from events, requirements x evidence table with strength badges and rationale, recommended stories (confirmed Strong and Partial links), gaps (requirements with no confirmed evidence), next actions, and an interview history placeholder until M6. Add `OpportunityTask` (Id, UserId, ApplicationId, Title, DueAt, DoneAt) for next actions; migrate `FollowUpDate` into a task or keep both and show both.
- **Tests:** page renders with and without a JD; tasks CRUD.

### M4-F6 Merge the JD matcher into opportunities
- **Do:** "Analyze a JD" creates a `Saved` opportunity with its JD and runs extraction, then opens the detail page. Retire the skill-name match percentage as a headline (keep skills as an inventory in Settings and Readiness). Redirect `/jd-matcher` to the new flow.
- **Acceptance:** no page shows a single match percentage.

### M4-F7 Gap to action
- **Do:** from a gap row, the user can create a story draft prefilled with the requirement text, or add a drill task. No AI needed.

---

## M5. Grounded mock interview studio

### M5-F1 Session persistence
- **Do:** `MockSession` (Id, UserId, ApplicationId nullable, Mode {Behavioral, TechnicalDeepDive, SystemDesign, OpportunitySpecific}, Difficulty {Entry, Mid, Senior, StaffPlus}, FocusTags, Status, StartedAt, EndedAt, Provider, Model, PromptVersion, TotalInputTokens, TotalOutputTokens, EstimatedCostUsd). `MockTurn` (Id, UserId, MockSessionId, ParentTurnId nullable for follow-ups, Question, AnswerTranscript, RubricJson, GroundedStoryRefs, AskedAt, AnsweredAt, EvaluatedAt). Refactor `MockInterviewController` to session endpoints: start, next question, submit answer, evaluate, end, list, get. Max turns per session from config.
- **Tests:** full session lifecycle; tenancy; turn limit; each AI call writes a ledger row.

### M5-F2 Grounded question and follow-up generation
- **Do:** for opportunity sessions, build prompts from the opportunity's requirements and, with AI opt-in, the confirmed linked stories. After an answer, generate at most N follow-up probes that ask about missing constraints, trade-offs, alternatives considered, and measurable results in the user's own story. Without opt-in, ground only on requirements and the JD.
- **Tests:** prompt builder includes requirement texts; excludes stories when opt-in is off; follow-up count capped.

### M5-F3 Rubric evaluation with citations (gate D10)
- **Do:** fixed dimensions: Specificity, Ownership, Technical depth, Trade-off reasoning, Quantified impact, Structure, Consistency with the stored story (only when grounded). Each dimension gets a level (Missing, Weak, Adequate, Strong), a short quote from the transcript, and where relevant a reference to the story field it compared against. Output is schema-validated. Integrity guard: any number in the suggested improved answer that does not appear in the transcript or the linked story is removed and flagged. No aggregate percentage.
- **Tests:** schema validation; fabricated-number guard strips invented metrics (unit test with a fixture); evaluation without a story omits the consistency dimension.

### M5-F4 Session history and weakness tally
- **Do:** sessions list and session detail pages; a per-user tally of dimensions rated Weak or Missing across the last N sessions, shown on the mock studio and later on analytics.
- **Tests:** tally aggregation.

### M5-F5 Save practice to the story bank
- **Do:** from a turn, the user can (a) create a draft story from their own transcript, opening the story form for editing, or (b) attach the transcript to an existing story as a practice note. Never copy evaluator text into story fields.
- **Tests:** draft created with transcript text only.

### M5-F6 Prompt injection hygiene
- **Do:** wrap user-provided text (JD, transcript, story fields) in clear delimiters, instruct the model to treat it as data, cap input lengths, and validate every output against a schema. Add a test corpus of injection strings.
- **Tests:** injection strings do not change output shape or leak system prompt text into fields.

### M5-F7 Offline evaluation harness (optional, portfolio value)
- **Do:** a console project or test category (excluded from CI) that runs fixture transcripts through the evaluator and records levels per prompt version to a CSV, so prompt changes can be compared before release.

### M5-F8 Voice stays local
- **Do:** keep browser speech recognition and local MediaRecorder playback; never upload audio. Show a note when the browser does not support speech recognition. An AI-voiced interviewer is deferred to M9.

---

## M6. Interview and debrief loop, closed beta

### M6-F1 Interview entity
- **Do:** `Interview` (Id, UserId, ApplicationId, RoundType {RecruiterScreen, Technical, SystemDesign, Behavioral, Onsite, Other}, ScheduledAt, DurationMinutes, Format {Video, Phone, Onsite}, InterviewerNotes, Status {Upcoming, Done, Cancelled}). CRUD under the opportunity.
- **Tests:** CRUD, tenancy, ordering by date.

### M6-F2 Prep plan per interview
- **Do:** computed checklist (no AI): stories linked to the opportunity's required requirements to rehearse, gaps to address, a recommended mock mode based on round type, and user tasks. Store check state in `InterviewPrepItem` (Id, UserId, InterviewId, Kind, RefId, Title, DoneAt).
- **Tests:** plan built from links; check state persists.

### M6-F3 Debrief
- **Do:** `Debrief` (Id, UserId, InterviewId, QuestionsAsked list, StoryRefsUsed, WentWell, FeltWeak, TopicsEncountered list, Outcome, Notes, CreatedAt). On save: stories marked weak get `NextReviewAt = now`; weak topics become prep items on the next interview for the same opportunity; the opportunity timeline records the debrief.
- **Tests:** saving a debrief schedules weak stories for review; creates prep items.

### M6-F4 Dashboard v2 and per-opportunity readiness
- **Do:** overview modelled on concept screen 2 using only real data: quick actions, active opportunities with stage and days-in-stage, upcoming interviews, stories due for review, next actions, and readiness per opportunity. Readiness is a transparent formula shown on hover: share of required requirements with confirmed Strong or Partial evidence, and share of those linked stories reviewed in the last 14 days. Recent activity from events.
- **Tests:** readiness formula unit tests; dashboard endpoint returns server-side aggregates.

### M6-F5 Interviews page
- **Do:** route `/interviews` modelled on concept screen 7 (before: upcoming and prep plan; after: debrief form and what it changed).

### M6-F6 Product usage events for the beta
- **Do:** `ActivityEvent` (Id, UserId, Type, RefKind, RefId, CreatedAt) written for key actions (story created, review done, link confirmed, session completed, debrief saved). Admin-only aggregate endpoint. No third-party analytics scripts.
- **Acceptance:** founder can see weekly active users and feature use during the beta.

**M6 exit (gate D11):** open the closed beta on the invite-only production site. Beta goals: confirm who pays, test price points (D4), and test whether requirements x evidence changes how people prepare. The founder runs 10 or more short interviews with beta users and logs findings in `PLAN_STATUS.md`.

---

## M7. Billing and entitlements

### M7-F1 Plans and entitlements (gate D4)
- **Do:** plan catalog in config (Free, Pass30, Pass90, credit packs) with feature limits per plan. `Entitlement` (Id, UserId, PlanCode, StartsAt, EndsAt, Source {Stripe, Manual, Beta}, ExternalRef). Credits as grant rows in `UsageLedger` (negative units consumed, positive units granted) or a separate `CreditGrant` table; pick one and document it. `IEntitlementService` answers "can this user use feature X now, and how much is left". `IUsageGuard` (M1-F3) reads limits from the active entitlement instead of flat config. Admin endpoint to grant beta passes.
- **Tests:** free limits; active pass limits; expired pass falls back to free; credits consumed before pass limits or after (document the rule).

### M7-F2 Checkout and webhooks (gate D3)
- **Do:** before coding, verify in Stripe's docs that Managed Payments supports one-time payments (passes do not auto-renew) and which Checkout parameters it needs. Server endpoint creates a Checkout Session for a plan code; redirect success and cancel pages. Webhook endpoint verifies the signature, records event ids in `ProcessedWebhookEvent` for idempotency, grants entitlements or credits on payment success, and revokes on refund or dispute. Keep Stripe keys in server config only.
- **Tests:** webhook signature rejection; idempotent replay; refund revokes; using Stripe's test mode fixtures or a fake webhook payload builder.

### M7-F3 Gating in the UI
- **Do:** handle the 402 body from M1-F3 in `api.ts` with an upgrade dialog that states price, length, no auto-renew and refund policy. Show usage meters ("3 of 5 mock sessions left this month").
- **Tests:** frontend test that a 402 opens the dialog.

### M7-F4 Billing settings
- **Do:** Settings section showing current plan, expiry date, credits remaining, purchase history, and links to receipts.

### M7-F5 Pricing page
- **Do:** public pricing page with plain terms: what Free includes, what passes include, passes never auto-renew, refund policy, taxes handled at checkout.

### M7-F6 Tax and accounting gate (founder)
- **Do:** founder confirms with an accountant the GST/HST position when selling through a merchant of record, EU VAT handling, and bookkeeping. Admin endpoint reports trailing four-quarter revenue to watch the $30,000 small-supplier threshold.

---

## M8. Public launch

### M8-F1 Landing page rewrite
- **Do:** rewrite `Landing.tsx` around the narrow promise: practise the follow-up questions about your own work; requirements mapped to your evidence; grounded mocks; debriefs that change what you drill. State "practice, not live assistance". Real screenshots only. Pricing section linking to the pricing page. Privacy summary. Remove anything not built.
- **Acceptance:** founder reviews every claim against the app.

### M8-F2 No-signup demo
- **Do:** public "Try the demo" using the M1-F2 ephemeral tenant and canned AI responses, so Show HN and community posts have something usable without signup.

### M8-F3 Free tools and long-tail pages
- **Do:** (a) incident story checker: paste a story, get a deterministic completeness check against the M3 fields, no login, no AI; (b) requirement extractor: paste a JD, get the dictionary extraction, with AI extraction after signup; (c) a small set of long-tail guides (for example how to talk about a production incident in a backend interview), written by the founder, not generated in bulk.
- **Acceptance:** tools rate-limited by IP and work without an account.

### M8-F4 Onboarding
- **Do:** first-run flow: add 2 to 3 stories from templates, add one opportunity, run the first mock. Track completion with `ActivityEvent`.

### M8-F5 Admin console
- **Do:** admin-only page: signups, active users, AI spend by day and feature, revenue, testimonial approval (endpoint exists), invite codes.

### M8-F6 Launch checklist (founder-led)
- Turn off the invite flag.
- Show HN post (demo link works without signup).
- Check each subreddit's self-promotion rules before posting.
- Real testimonials from beta users with written permission only.
- Support email and a public status or changelog page.

---

## M9. Post-revenue backlog

Founder picks one item at a time. Each needs its own short spec in `PLAN_STATUS.md` before work starts.

1. Read-only MCP server with scoped API tokens (`ApiToken`: hashed token, scopes per resource, LastUsedAt, ExpiresAt), per-tool consent, then listing in assistant directories. Confirm the official C# MCP SDK and its current API before building.
2. Per-user BYOK: provider keys encrypted with Data Protection; BYOK usage bypasses credit consumption but still logs to the ledger.
3. Self-host image and license decision (D5): AGPL core with hosted inference kept cloud-only is the most common precedent.
4. Analytics and outcomes page (concept screen 8): funnel from events, source effectiveness, recurring weaknesses, preparation performance. Resume effectiveness waits for item 6.
5. Evidence capture integrations (see M10).
6. Resume entity and versions: blob storage plus single-pass text extraction; link applications to a version.
7. AI-voiced interviewer as a speech-to-text, LLM, text-to-speech cascade with its own caps (voice costs many times more than text).
8. Team tier for coaches and bootcamps (software seats only; no employer screening).
9. CLI (`precept extract`), calendar and email integrations, PDF export, graph search (concept screen 9).
10. Replace the `FsrsAlgorithm` stub or remove it.

---

## M10. Retention track: career targets and evidence agent

Hypothesis to test, not a proven model: engineers will keep a paid or free account active between job searches if Precept maps their evidence to their career ladder and does the capture work for them. Decide pricing with D12 after the beta.

### M10-F1 Career targets
- **Do:** user creates a `RequirementSet` with `TargetKind = CareerLevel` (paste their company's ladder or pick a public template they supply) or `ReviewCycle`. The same requirements x evidence UI from M4 works unchanged.

### M10-F2 Evidence inbox
- **Do:** `EvidenceCandidate` (Id, UserId, SourceKind, SourceRef, Summary, SuggestedStoryId nullable, SuggestedRequirementIds, Status {New, Accepted, Dismissed}, CreatedAt). A weekly review screen where the user accepts, edits or dismisses candidates in a couple of minutes.

### M10-F3 Evidence agent (bounded, opt-in)
- **Do:** a scheduled job per opted-in user that reads only sources the user connected (start with GitHub pull requests the user authored, and documents the user pastes or uploads), produces summaries (never stores source code), and writes `EvidenceCandidate` rows. Every run is metered through the usage guard with a per-user monthly cap. Include a redaction step and a clear warning about employer confidentiality. BYOK or local-model mode for cautious users.
- **Rules:** the agent never sends anything on the user's behalf, never applies to jobs, never modifies stories without acceptance.

### M10-F4 Review and promotion drafts
- **Do:** generate a quarterly self-review or promotion-packet draft from confirmed evidence mapped to the career target, with every claim linked to its evidence. Fabricated-number guard from M5-F3 applies.

### M10-F5 Readiness nudges
- **Do:** a weekly digest item: stale stories, new evidence awaiting review, and "if an interview landed tomorrow" readiness against the user's last opportunity or career target.

### M10-F6 Measure it
- **Do:** track weekly active users who are not in an active search, inbox acceptance rate, and reactivation of users who return for a new search. Report in the admin console.

---

## 5. Risk register

| Risk | Signal to watch | Response |
|---|---|---|
| Interview prep is a small slice of the funnel | Beta users with no interviews churn immediately | Keep a free tier useful for evidence capture; lean on M10 |
| Revarta or StoryProof already cover the core | Hands-on test before M8 | Sharpen positioning on technical incident stories and grounding |
| AI spend exceeds revenue | Ledger cost per active user | Caps, cheaper model, BYOK, canned demo responses |
| Users distrust AI scoring | Rejected suggestion rate, feedback | Levels with quotes, no percentages, user confirms everything |
| Employer confidentiality with evidence capture | User questions, opt-in rate | Summaries only, redaction, local model option |
| Price too low or too high | Beta interviews, checkout conversion | Test D4 ranges; passes are easy to reprice |
| Solo founder bandwidth | Milestones slipping | Ship M0 to M2 first; cut M3-F7, M5-F7 and M9 items freely |
