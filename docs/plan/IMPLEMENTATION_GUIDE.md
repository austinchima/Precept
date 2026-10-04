# Precept implementation guide

Version 1.0, written 2026-10-04 against `master` at `1df10af` (after PR #18).

`PRECEPT_PLAN.md` says **what** each feature is and why; `S_TIER_PLAN.md` adds the signature
features and quality bars. This guide says **how** to build each remaining feature in the code
as it exists today: the files involved, what they do now, the steps, the tests, and what must be
checked in official documentation first. The earlier plans were written from an audit that
could not read the code; where this guide disagrees with them, this guide reflects the code.

Status lives in `PLAN_STATUS.md`. Done so far: M0, M1-F1, M1-F2, M1-F3.

---

## 1. How each feature is built and tested

Every feature below goes through the same loop, one feature at a time:

1. **Read first.** Re-read the files listed under "Current state". The code moves; a plan
   step that no longer matches the code is updated here before coding.
2. **Check outside facts.** Anything marked **Verify** is confirmed in official documentation
   (Microsoft Learn is reachable from the agent environment; other vendor docs may need the
   official SDK packages as a source) and cited in the commit message or an ADR.
3. **Tests first where practical.** Write the acceptance tests from "Tests", watch them fail
   for the right reason, then implement.
4. **Full checks.** `dotnet build`, the whole `dotnet test` suite (Docker required),
   `npm run lint`, `npm run build`, and `npm test` once M1-F9 lands.
5. **Run it.** Start PostgreSQL, the API and Vite locally; exercise the feature in a browser
   (Playwright scripts), in both themes for UI work; check the API log for errors.
6. **Adversarial self-review.** Re-read the diff asking what would break it: tenancy,
   demo accounts, concurrency, empty data, migration on a populated database, honesty of copy.
7. **Record.** Update `PLAN_STATUS.md` (status, commit, tests added, deviations), the
   CHANGELOG, and any README section the change affects.
8. **Ship.** One PR per feature (or per small group of tightly linked features), merged
   before the next starts, so `master` is always releasable.

Migrations: one per feature, named for it (`M1F4_DataProtectionKeys`), never edited after
merge, never two features with migrations in flight at once. Enums stored as integers
(`ApplicationStatus`, `ConfidenceLevel`, `Category`) only get new values appended.

Sizes are rough: **S** about half a day, **M** one to two days, **L** three days or more,
for one developer with this codebase. They are estimates, not commitments.

---

## 2. Decisions needed before some features

| Needed by | Decision | Why it blocks |
|---|---|---|
| M1-F4, M2-F1, M2-F4 | Confirm Cloud Run for the API and Vercel for the web app (gate D2 says GCP; `vercel.json` and Vercel preview checks exist) | Decides the proxy chain for client IPs, where background jobs run, and how the browser reaches `/api` |
| M1-F5 | Sender domain for Resend (D8), and whether registering an existing email should stop returning 409 | Verification and reset emails need a verified sending domain |
| M2-F5 | A support email address | The Terms contact section currently points at GitHub Issues on a repository planned to stay private |
| M2-F2 | Database host: Cloud SQL or self-managed PostgreSQL | Backups and restore drills differ completely |
| M4-F4 | D9 wording for the AI-reads-my-stories opt-in | Shown in Settings and the Terms |
| M7 | D3 payment provider, D4 prices | Billing cannot start without them |
| Portfolio use | Repository visibility (D5) | A private repository cannot be reviewed by employers |

---

## 3. Recommended order

1. **M1 completion:** M1-F8 (leftovers) → M1-F9 (frontend tests, so everything after is
   tested) → M1-F4 → M1-F6 → M1-F7 → M1-F5 → M1-F10 → M1 milestone security review.
   S-Q5 (ADR backfill) and the S-Q1/S-Q2/S-Q3 baselines run alongside.
2. **M2 production:** F1 → F4 → F3 → F2 → F6 → F5 → F7; S-Q4 with F1.
3. **M3 story bank v2:** F1 → F2 → F3 → F4 → S2 → F5 with deterministic S1 → F6 → S7 → F7.
4. **M4 opportunities:** F1 → F2 → F3 → F4 → F5 → F6 → F7 → S3.
5. **M5 mock studio:** F1 → F6 → F2 → F3 with S5 → F7 (required) → F4 → F5 → F8 with S4,
   AI probes for S1.
6. **M6 loop and beta:** F1 → F2 → F3 → S6 → F4 → F5 → F6.
7. **M7 billing, M8 launch, then M9/M10** as the founder picks.

---

## 4. M1 remaining: security and integrity

### M1-F8 Integrity fixes (leftovers) · S
**Current state.** The redesign already removed the fake trend chart, the funnel, the landing
claims and the critique-into-story bug. Still wrong:
- `Precept.Api/Services/MockInterviewService.cs` `EvaluateFallbackAnswer` builds a
  `ModelAnswer` that ends with an invented "improved delivery speed by 35%", and the fallback
  is not labelled as a heuristic.
- `Precept.Api/Services/DashboardService.cs` counts `NeedsReview` as stories never reviewed or
  rated Panic/Shaky, ignoring `NextReviewAt`, and only counts technical stories.
- `Precept.Web/src/pages/Dashboard.tsx` builds the review queue and counts from the first
  page (25 items) of `/api/story`, `/api/behavioralstory` and `/api/application`.

**Plan.**
1. Fallback evaluation: drop the fabricated `ModelAnswer` sentence (return an empty model
   answer or a template with `[your result]` placeholders), add `IsHeuristic = true` to
   `MockInterviewEvaluationResponse`, and show "Offline heuristic, not an AI evaluation" in
   `MockInterview.tsx` when set.
2. `DashboardService`: `NeedsReview` = technical plus behavioral stories with
   `NextReviewAt == null || NextReviewAt <= now` (now from `TimeProvider`).
3. New `GET /api/dashboard/review-queue?limit=10` returning both story kinds due now, weakest
   confidence first, plus total due count; add server-side counts (active applications,
   follow-ups due, stories banked) to `DashboardStatsResponse`. Dashboard uses these instead
   of paging client-side.

**Tests.** Unit: `NeedsReview` with due, not-due, never-reviewed, behavioral; fallback output
contains no digit that is not in the transcript. Integration: review queue returns 30 due
stories correctly counted when the user has 30 (beyond one page).
**Done when.** No number on the dashboard depends on page size; fallback output has no
invented figures.

### M1-F9 Frontend test runner · M
**Current state.** No frontend tests; `npm run lint` is `tsc --noEmit`; CI runs lint and
build only. Pages call `api.ts` directly.

**Plan.**
1. **Verify** current Vitest and React Testing Library versions compatible with Vite 6 and
   React 19 (npm registry and their docs); add `vitest`, `@testing-library/react`,
   `@testing-library/user-event`, `jsdom`, `@testing-library/jest-dom`.
2. `vitest.config.ts` (jsdom, setup file stubbing `matchMedia`, `IntersectionObserver` and
   `ResizeObserver`, which motion and GSAP code touch). Add `"test": "vitest run"`.
3. A small `renderWithProviders` helper (router, Auth context, toast provider) and a
   `mockApi` helper that stubs `fetch`.
4. Smoke tests: login form submit and error; quiz reveal and rate (keyboard R, 1-3);
   mock interview renders and shows the 402 message from M1-F3; `CompanyLogo` stable per
   name.
5. Add `npm test` to the `npm-audit` job in `.github/workflows/ci.yml`.
6. Playwright E2E (S-Q1 base): move the screenshot scripts' login and seed logic into
   `Precept.Web/e2e/` with journeys 1 to 3 (sign up, bank a story, drill). Run on demand
   first; add to CI once stable (needs API and PostgreSQL services in the job).

**Tests.** The tests are the deliverable; confirm each fails when its assertion is broken.
**Done when.** CI runs frontend unit tests on every PR.

### M1-F4 Data Protection keys and forwarded headers · M
**Current state.** No `AddDataProtection` call, so keys live in the container and every
restart or second Cloud Run instance logs everyone out. Forwarded headers are opt-in via
`ForwardedHeaders:TrustAllProxies` with `ForwardLimit = 1` (`Program.cs`).

**Plan.**
1. Add `Microsoft.AspNetCore.DataProtection.EntityFrameworkCore` (verified on Microsoft Learn:
   `PersistKeysToDbContext<TContext>()`, context implements `IDataProtectionKeyContext`).
   `PreceptDbContext` implements it with `DbSet<DataProtectionKey> DataProtectionKeys`;
   migration `M1F4_DataProtectionKeys`.
2. `builder.Services.AddDataProtection().SetApplicationName("Precept").PersistKeysToDbContext<PreceptDbContext>()`.
3. Key encryption at rest: Microsoft notes that an explicit store disables the default
   at-rest protection. Options: protect with a certificate from Secret Manager
   (`ProtectKeysWithCertificate`), or accept plaintext keys in a database that already holds
   all user data. Record the choice in an ADR; default to the certificate in production if
   the founder can manage the secret.
4. Proxy chain. If the browser reaches the API through a Vercel rewrite (M2-F1), the chain is
   client → Vercel → Google front end → container, and `ForwardLimit = 1` would pick a proxy
   address. Replace the boolean with `ForwardedHeaders:ForwardLimit` (int) and document the
   value per topology. **Verify** what Cloud Run and Vercel each append to `X-Forwarded-For`
   by logging a test request in staging; neither vendor's docs are reachable from the agent
   environment.

**Tests.** Integration: two `WebApplicationFactory` instances sharing one database; a cookie
issued by the first is accepted by the second. Unit: forwarded IP chosen correctly for limits
1, 2 and 3 with crafted headers.
**Done when.** Restarting the API does not sign users out.

### M1-F6 Partitioned rate limiting · S
**Current state.** `auth` (10/min sliding) and `general` (100/min fixed) are single global
buckets: one noisy client throttles everyone. `demo` is already partitioned by IP.

**Plan.**
1. `auth`: `AddPolicy` partitioned by client IP (after forwarded headers).
2. `general`: partitioned by user ID (`ClaimTypes.NameIdentifier`), falling back to IP.
3. New `ai` policy: per-user fixed window (for example 10/min) on `MockInterviewController`,
   on top of the M1-F3 daily limits.
4. Limits in a `RateLimitSettings` options class; 429 body unchanged.

**Tests.** Integration with low limits from settings: two IPs do not share the auth bucket;
user A exhausting `general` does not block user B; the `ai` policy returns 429 before the
usage guard is touched.

### M1-F7 SSRF hardening for job capture · M
**Current state.** `ApplicationService.CaptureApplicationAsync` checks the host with
`IsPrivateOrLoopback` before fetching. Gaps found in the code:
- IPv6 is not checked (ULA `fc00::/7`, link-local `fe80::/10`, IPv4-mapped `::ffff:0:0/96`);
  `0.0.0.0/8` is not blocked.
- DNS failure falls through to "allowed".
- The check resolves DNS separately from the actual connection (DNS rebinding).
- `HttpClient` follows redirects automatically, so a public URL can redirect to
  `169.254.169.254`.
- `Dns.GetHostAddresses` is synchronous; the 2 MB cap counts characters, not bytes.

**Plan.**
1. New `Services/Capture/SafeHttpFetcher` behind an interface: a named `HttpClient`
   ("capture") whose `SocketsHttpHandler` has `AllowAutoRedirect = false` and a
   `ConnectCallback` that resolves the host, rejects any blocked address, and connects to the
   vetted IP. **Verify** the `ConnectCallback` pattern on Microsoft Learn.
2. `IpBlocklist` covering IPv4 private, loopback, link-local, CGNAT, `0.0.0.0/8`, multicast,
   and IPv6 loopback, ULA, link-local, IPv4-mapped (check the mapped IPv4 too).
3. Follow up to 3 redirects manually, re-validating scheme (http/https only) and host each
   hop. Fail closed on DNS errors. Count bytes from the stream; stop at 2 MB.
4. Inject an `IHostResolver` so tests need no network.

**Tests.** Unit: every blocked range, IPv4-mapped IPv6, `0.0.0.0`, DNS failure, redirect to
metadata IP, redirect loop, non-http scheme, oversize body truncated. Public host allowed
through a fake handler.

### M1-F5 Email verification and password reset · M
**Current state.**
- `register` never sends a verification email; `verify-email` exists but nothing links to it.
- `forgot-password` generates a token and logs it in Development only; no email is sent.
- `ResendEmailService` "simulation" mode logs the full email text at Warning, which would
  include reset links; one `LogError` call passes arguments in the wrong order for its
  template.
- No frontend pages for verify or reset; the "Forgot?" link was removed in the redesign.
- `DailyDigestService` reads `FrontendUrl` directly from configuration.

**Plan.**
1. `PreceptSettings` options class (`FrontendUrl`, `EmailSenderDomain`), bound and validated
   at startup; replace direct configuration reads.
2. `IAccountEmailSender` building verify and reset emails (plain text plus simple HTML) with
   links `{FrontendUrl}/verify-email?email=&token=` and `/reset-password?...`; tokens
   URL-encoded (Identity tokens are base64 with `+` and `/`; **Verify** encoding guidance).
3. Register sends the verification email; `POST /api/auth/resend-verification` (rate-limited,
   same response whether or not the account exists). Demo accounts never get any of these
   emails (M1-F2 review note).
4. `forgot-password` sends the email; never log tokens in any environment; simulation mode
   logs recipient and subject only.
5. Require a confirmed email for AI features (403 `email_unconfirmed` from the metered client
   or a filter on `MockInterviewController`); the dashboard shows a banner with "Resend".
6. Frontend: `VerifyEmail.tsx`, `ResetPassword.tsx`, `ForgotPassword` form on the login page;
   bring back the "Forgot?" link.
7. Decide (gate above) whether register returns 409 for an existing email; the safer pattern
   is "check your inbox" for both cases.

**Tests.** Fake `IEmailService` captures messages: register sends one verification email;
token works once; reset changes the password and signs out other sessions; unknown email gets
the identical response and status; demo user gets no email; unverified user gets 403 on AI
endpoints; logs never contain the token (capture logger output).

### M1-F10 Health checks, logging and migrations · S
**Current state.** One `/api/health` that always returns 200. Serilog writes to console and a
daily file with no retention limit. Startup migration runs in Development or with
`RunMigrationsOnStartup`, and on failure it logs and keeps serving.

**Plan.**
1. Health (verified on Microsoft Learn): `AddHealthChecks().AddDbContextCheck<PreceptDbContext>(tags: ["ready"])`
   from `Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore`;
   `/api/health/live` (no checks) and `/api/health/ready` (tag `ready`); keep `/api/health`
   as an alias of live for existing probes.
2. Serilog file sink `retainedFileCountLimit: 14`; in Production log to console only (Cloud
   Run collects stdout); JSON formatting for structured logs. **Verify** the Serilog option
   names in its docs.
3. Migrations: if startup migration fails, stop the app (throw) instead of serving against
   an old schema. Production deploys use an EF migration bundle (verified on Microsoft Learn:
   `dotnet ef migrations bundle --self-contained -r linux-x64`) run as a Cloud Run job before
   the new revision; document in `docs/DEPLOY.md`.

**Tests.** Integration: ready returns 503 when the database connection string points to a
stopped database; live stays 200.

### M1 milestone review
A separate review of auth, demo, AI metering, capture and email against the OWASP API Top 10
categories; record findings in `PLAN_STATUS.md`. Exit when no critical or high finding is
open.

---

## 5. M2: production deployment and compliance

### M2-F1 Production stack · M (founder runs the cloud steps)
**Current state.** `deploy-api.yml` builds and deploys the API to Cloud Run and has failed at
Google auth three times (secrets not set). The web app has `vercel.json` with only a SPA
rewrite, and `api.ts` calls relative `/api/...` URLs, so the Vercel deployment cannot reach
the API today. `nginx.conf` proxies `/api/` for the Docker setup.

**Plan.**
1. Keep the browser on one site so the `SameSite=Strict` cookie works: add a Vercel rewrite
   `/api/:path*` → the Cloud Run URL before the SPA rewrite. **Verify** external rewrites in
   Vercel's docs and that cookies set by the proxied response are stored for the Vercel
   domain.
2. Set `ForwardedHeaders:ForwardLimit` for this chain (M1-F4).
3. Cloud Run settings in `deploy-api.yml`: environment variables (`CORS_ORIGINS`,
   `FrontendUrl`, `Usage__*`), secrets via Secret Manager references (connection string,
   AI keys, Resend key), min instances, request timeout.
4. Migration job step (bundle from M1-F10) before `deploy-cloudrun`.
5. `docs/DEPLOY.md`: one-time GCP setup (Workload Identity Federation, Artifact Registry,
   service accounts, Cloud SQL or database host), secrets, first deploy, rollback.

**Tests.** Staging checklist run by hand: sign up, sign in, restart a revision and stay
signed in, demo login rate-limited per real IP, AI call metered.

### M2-F4 Background jobs safe on Cloud Run · M
**Current state.** `DailyDigestService` and `DemoCleanupService` are `BackgroundService`
loops. Cloud Run may throttle CPU between requests and may run several instances, so jobs can
stall or run twice. Expired demo sessions are not rejected at request time.

**Plan.**
1. Move each job's body into a plain service (`IDigestRunner`, `IDemoCleanupRunner`).
2. `POST /api/internal/jobs/{name}` protected by a shared secret header (or Cloud Scheduler
   OIDC token; **Verify** the OIDC audience check pattern) and excluded from CSRF and rate
   limits; Cloud Scheduler calls it.
3. Single-run guard: a PostgreSQL advisory lock (`pg_try_advisory_lock`) per job name.
4. Keep the hosted loops for Docker Compose, disabled by a setting on Cloud Run.
5. Reject expired demo accounts at request time (cookie validation event or middleware
   checking `DemoExpiresAt`).

**Tests.** Two concurrent job calls run the body once; expired demo cookie gets 401; wrong
secret gets 401.

### M2-F3 Monitoring and alerts · S
Structured logs to Cloud Logging; log-based alerts on `LogCritical` (AI cap reached), 5xx
rate, ready-check failures; uptime check on `/api/health/ready`. Document in `DEPLOY.md`.
Optional: OpenTelemetry (S-Q2 observability row), **Verify** package names first.

### M2-F2 Backups · S (founder)
Automated daily backups with 7 to 30 days retention on the database host; a written restore
drill into a scratch database, run once and timed, recorded in `PLAN_STATUS.md`.

### M2-F6 Export and deletion completeness · S
**Current state.** `DashboardController.ExportUserData` exports profile, skills, both story
kinds, applications and job descriptions; it omits application events, trashed items,
testimonials, usage ledger and digest settings, and the Terms now say so.
**Plan.** Add the missing sets (`IgnoreQueryFilters` plus explicit user scope), a
`schemaVersion` field, and move the endpoint to `GET /api/account/export`. Deletion test that
seeds one row in every user-owned table and asserts none remain. Update the Terms export
section when complete.

### M2-F5 Privacy policy and AI disclosure · S
New `/privacy` page listing data collected, processors (database host, email provider, AI
provider), retention, export and deletion, and contact. Founder reviews the copy; link from
footer, sign-up and Settings.

### M2-F7 Invite-only access · S
`InviteCode` table (code hash, max uses, uses, expires); `Registration:InviteOnly` setting;
register requires a valid code when on; admin endpoint to create codes (admin role from
Identity roles). Tests: on/off, exhausted and expired codes.

---

## 6. M3: story bank v2

### M3-F1 Structured technical story fields · M
**Current state.** `Story` has `Title`, `CodeSnippet`, `Explanation` (required, min 50),
`SourceProject`, `Category`, SM-2 fields and soft delete.
**Plan.** Add nullable `Context`, `Problem`, `Constraints`, `Decision`, `Implementation`,
`TradeOffs`, `Outcome`, `MeasurableImpact`, `Lessons` (each `MaxLength` around 2000).
`Completeness` computed in the DTO (count of Problem, Decision, TradeOffs, Outcome,
MeasurableImpact filled). Relax the 50-character minimum to "Explanation or at least two
structured fields". Story form in `StoryBank.tsx` gains collapsible sections. Migration
`M3F1_StructuredStories`.
**Tests.** Create and update with new fields; completeness; existing stories load; validation
rule.

### M3-F2 Behavioral story parity and trash · M
`BehavioralStory` gets `IsDeleted`, `DeletedAt`, query filter update, trash and restore
endpoints (mirror `StoryService`), plus `Constraints`, `TradeOffs`, `MeasurableImpact`,
`Lessons`. Settings gets a Trash section listing stories and applications with restore.
Tests: delete, trash list, restore, cross-tenant 404.

### M3-F3 Tags · M
`Tag` (Id, UserId, Name, NormalizedName unique per user), `StoryTag`, `BehavioralStoryTag`.
Data migration: technical `Category` becomes a tag (keep the column); behavioral
comma-separated `Tags` split into tags. Tag filter and autocomplete in Story Bank. Tests: the
data migration in a Testcontainers test seeded with old-format rows.

### M3-F4 Review log · M
**Current state.** `StoryService.ReviewStoryAsync` and `BehavioralStoryService.ReviewStoryAsync`
overwrite SM-2 state; no history. `ReviewRating` has three values (`NailedIt`, `Partial`,
`BlankPanic`).
**Plan.** `StoryReview` (Id, UserId, StoryKind, StoryId, Rating, QualityGrade,
ConfidenceBefore, ConfidenceAfter, IntervalDaysAfter, ReviewedAt, DrillAngle nullable,
ProbeType nullable for S1). Both review paths write a row in the same transaction.
`GET /api/{story|behavioralstory}/{id}/reviews`, `GET /api/dashboard/review-trend?days=`.
Tests: one row per review; trend aggregation; tenancy.

### S2 Recall forecast: real FSRS · L
**Plan.**
1. **Verify** the FSRS formulas, default parameters and rating scale from the official
   open-spaced-repetition documentation or reference implementation; check for a maintained
   .NET implementation and its license. ADR records build-or-adopt and the source version.
2. Map Precept ratings to FSRS grades. Three ratings cover Again, Hard and Good; decide
   whether to add an "Easy" rating (UI change) or map without it. Record in the ADR.
3. Add FSRS state columns (stability, difficulty) to both story tables; implement
   `FsrsAlgorithm` behind `ISpacedRepetitionAlgorithm`; algorithm choice in config with SM-2
   kept as fallback.
4. Retrievability shown only for stories with review history; queue ordered by lowest
   retrievability.
5. Per-user parameter fitting later, after enough `StoryReview` rows (threshold from the FSRS
   docs).

**Tests.** Published or hand-computed vectors; retrievability decreases with time; grade
ordering of intervals; fallback switch.

### M3-F5 Story detail page with deterministic Defend mode (S1) · L
Route `/story-bank/:kind/:id`: structured fields with inline edit, tags, completeness,
review history, next review, drill angles (explain to a junior engineer, 2-minute version,
trade-off deep dive, what you would do differently). S1 deterministic probe library in
`Precept.Api/Services/Defend/ProbeLibrary.cs` keyed to missing or thin fields, with stable
`ProbeType`s; a Defend session chains 2 to 4 probes and records self-ratings on the review
row. Weak probe types shown only with at least 3 rated probes of that type. Tests per
`S_TIER_PLAN.md` S1.

### M3-F6 Search coverage · S
Extend `SearchService` to behavioral stories, job descriptions and the new structured fields.
Keep `ILIKE` unless result quality demands full-text search; if adopted, a generated
`tsvector` column and GIN index, **Verify** Npgsql's EF mapping for it, and update the
CHANGELOG claim.

### S7 Proof on every number · M
`Stat` and other metric components in `Precept.Web/src/components/ui/kit.tsx` require a
`source` prop rendered as a keyboard-accessible "How is this computed?" popover. Aggregate
endpoints return their input counts. A Vitest test walks the rendered dashboard and fails on
any metric without a source.

### M3-F7 Story draft from pasted text · M (after M1-F3, needs D9 wording)
`POST /api/story/draft` (metered feature `story_draft`): pasted postmortem or design doc in,
suggested structured fields out as schema-validated JSON; nothing saved until the user edits
and saves. Input length cap, confidentiality warning, injection delimiters (M5-F6 helper).

---

## 7. M4: opportunity workspace

### M4-F1 Stage model and history · S
`ApplicationStatus` is stored as an integer: append `Saved = 6` and `Onsite = 7` (never
renumber). Add `ClosedReason` (nullable). Days-in-stage from the latest `ApplicationEvent`.
`STATUS_ORDER` in `Precept.Web/src/components/domain.tsx` controls column order, so the
board shows Saved first and Onsite after Interviewing. Tests: existing rows unchanged;
days-in-stage; transitions write events.

### M4-F2 Requirement sets on a generic target · M
`RequirementSet` (TargetKind JobDescription/CareerLevel/ReviewCycle, TargetId, Title,
PromptVersion, Source) and `Requirement` (Text, Kind, Category, SortOrder, Source, IsDeleted);
CRUD and reorder endpoints. A job description owns one set. Tenancy tests.

### M4-F3 Requirement extraction · M
`IRequirementExtractor` with `LlmRequirementExtractor` (metered `jd_extract`, schema-validated
JSON, one retry) and a dictionary fallback built from `JobDescriptionKeywordExtractor`. The UI
marks each requirement's source. Tests: valid, invalid-then-retry, quota fallback with notice,
injection text in the JD.

### M4-F4 Evidence links · L (needs D9)
`EvidenceLink` (RequirementId, StoryKind, StoryId, Strength, Rationale, Source, Status
Suggested/Confirmed/Rejected). Manual linking from both sides. With opt-in
(`ApplicationUser.AllowAiOnStories`), `suggest-links` sends requirement texts and story
summaries (no code snippets); suggestions never auto-confirm. Alignment summary counts, no
percentage. Story deletion flags or removes links. Tests per `PRECEPT_PLAN.md`.

### M4-F5 Opportunity detail page · L
Route `/applications/:id`: header, stage timeline from events, requirements × evidence table,
recommended stories, gaps, next actions (`OpportunityTask`), interview history placeholder.

### M4-F6 Merge JD Matcher into opportunities · M
"Analyze a job post" creates a `Saved` opportunity with its JD and runs extraction;
`/jd-matcher` redirects. No single match percentage anywhere (the current JD Matcher score
ring is removed).

### M4-F7 Gap to action · S
From a gap: create a story draft prefilled with the requirement, or add a drill task.

### S3 Interview kit · M
Greedy weighted set cover over confirmed links (ADR for weights), max 6 stories,
deterministic tie-break by StoryId; `/applications/:id/kit` page, 10-minute warm-up drill,
print stylesheet labelled as preparation. Tests per `S_TIER_PLAN.md`.

---

## 8. M5: grounded mock interview studio

### M5-F1 Session persistence · L
`MockSession` and `MockTurn` per `PRECEPT_PLAN.md`; refactor `MockInterviewController` from
two stateless endpoints to session endpoints (start, next, answer, evaluate, end, list, get);
each AI call already goes through the metered client, so token totals come from the ledger
(join by session ID: add nullable `SessionId` to `UsageLedgerEntry`).

### M5-F6 Prompt injection hygiene · S
Shared `PromptBuilder` that wraps user text in delimiters, caps lengths, and states that
delimited text is data; every output schema-validated. Injection corpus test file.

### M5-F2 Grounded questions and follow-ups · M
Prompts from the opportunity's requirements and, with opt-in, confirmed linked stories;
at most N follow-up probes per answer, using S1 probe types as the categories.

### M5-F3 Rubric with citations, plus S5 drift check · L
Fixed dimensions and levels (D10); each with a quote from the transcript; consistency
dimension only when grounded. Shared number extraction (`40%`, `3x`, `200 ms`, `1.2k`, written
numbers) powers both the fabricated-number guard and the S5 drift check. Remove the current
0-100 `Score` from the UI.

### M5-F7 Offline evaluation harness (required) · M
Console project `Precept.Evals`: at least 30 fixture transcripts with expected levels, run
per prompt version, CSV agreement report. Schema and guard tests run in CI; live-model runs
on demand only.

### M5-F4 Session history and weakness tally · M
Session list and detail pages; tally of dimensions rated Weak or Missing over the last N
sessions.

### M5-F5 Save practice to the story bank · S
Already partly done in the redesign (saves the user's own answer). Add "attach transcript to
an existing story as a practice note".

### M5-F8 Voice stays local, with S4 replay and metrics · M
Keep browser speech recognition and `MediaRecorder`; **Verify** current browser support and
show a typed-only state where missing. Timestamped transcript, words per minute, filler
count, length against target, longest pause; rubric quotes jump to the moment in the replay.
Frontend test asserts no request body carries audio.

### S1 AI probes · S
AI-generated probes behind the metered client (`defend_probe`), opt-in, falling back to the
deterministic library.

---

## 9. M6: interview and debrief loop, closed beta

- **M6-F1 Interview entity · S.** CRUD under the opportunity; tenancy tests.
- **M6-F2 Prep plan · M.** Computed checklist from links, gaps, round type; `InterviewPrepItem` for check state.
- **M6-F3 Debrief · M.** On save: weak stories set due now, weak topics become prep items for the next round, timeline entry.
- **S6 What this changed · S.** The debrief response lists its side effects; idempotent on re-save.
- **M6-F4 Dashboard v2 · M.** Readiness per opportunity with a visible formula (S7).
- **M6-F5 Interviews page · M.** Upcoming with prep plan; past with debrief.
- **M6-F6 Product usage events · S.** `ActivityEvent` rows for key actions; admin-only aggregates; no third-party analytics.

---

## 10. M7 and M8: billing and launch (outline; detail when D3 and D4 are decided)

- **M7-F1 Entitlements.** `Entitlement` table and `IEntitlementService`; `UsageGuard` reads limits from the active entitlement instead of flat config.
- **M7-F2 Checkout and webhooks.** **Verify** the chosen provider's one-time payment support and webhook signing before coding; idempotent webhook processing table; demo users rejected.
- **M7-F3 to F5.** 402 handling becomes an upgrade dialog (the `api.ts` hook from M1-F3 is the starting point); billing settings; pricing page.
- **M8-F1 Landing rewrite.** Narrow promise, real screenshots (the capture scripts exist), pricing link; every claim checked against the app.
- **M8-F2 No-signup demo.** Already built in M1-F2; add Defend mode to it as the launch hook.
- **M8-F3 Free tools.** Incident story checker reuses the S1 probe library; dictionary requirement extractor; IP rate limits.
- **M8-F4 Onboarding, M8-F5 Admin console, M8-F6 Launch checklist** as in `PRECEPT_PLAN.md`.

---

## 11. Engineering quality bars (S-Q)

- **S-Q5 ADRs · S.** `docs/adr/0001-...md` onward: cookie auth, query-filter tenancy, demo accounts, metered AI, local-only audio. Then one per new decision (FSRS, probe storage, kit weights, key encryption, type generator).
- **S-Q1 Accessibility · M.** **Verify** the axe package for Playwright; baseline on core pages; fix to zero on journeys 1 to 3; keyboard-only run of each journey.
- **S-Q2 Performance · S.** Lighthouse baseline for `/` and `/dashboard`; GSAP and Lenis are already only imported by `Landing.tsx` (checked); budgets in CI after the baseline. **Verify** Lighthouse CI setup.
- **S-Q3 Generated API types · M.** The API serves `/openapi/v1.json` in Development; choose a generator after reading its docs; replace `Precept.Web/src/types.ts` area by area; CI fails on drift.
- **S-Q4 Security headers and threat model · S.** Headers and CSP already exist in `Program.cs` for API responses; with Vercel serving the HTML, the web app's headers must be set in `vercel.json` (**Verify** header syntax). `docs/security/THREAT_MODEL.md`.

---

## 12. M9 and M10

Post-revenue and retention items stay as described in `PRECEPT_PLAN.md` and `S_TIER_PLAN.md`.
Each gets a section in this guide, written against the code of the day, when the founder picks
it.
