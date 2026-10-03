# Precept plan status

Single source of truth for progress on `docs/plan/PRECEPT_PLAN.md`. The orchestrator agent updates this file after every feature. The founder fills in decision gates.

Status values: `todo`, `in progress`, `review`, `blocked`, `done`, `skipped`.

## Baseline (filled by M0-F2)

| Item | Value |
|---|---|
| Date | 2026-10-03 |
| Default branch | `master` (commit `d468ef6`, after PR #15 cookie-auth merge) |
| Backend build | Pass. 0 errors, 4 warnings (all CS8602 in tests: `ApplicationServiceTests.cs` lines 237 and 247, `JobDescriptionServiceTests.cs` line 151, `StoryServiceTests.cs` line 217). About 19 s |
| Backend tests (passed / failed / skipped) | 136 / 0 / 0. About 40 s (Testcontainers PostgreSQL) |
| Frontend lint | Pass. Note: `npm run lint` is `tsc --noEmit` (type check only); there is no ESLint |
| Frontend build | Pass (`vite build`, about 4 s) |
| Notes | Run in a Linux cloud container with .NET SDK 10.0.112 and Node 22. No frontend `test` script yet (M1-F9). The plan's audit read a local working copy that was 49 commits behind `origin/master`; several M0 audit findings do not apply to the remote branch (see M0-F1 notes) |

## Decision gates

| ID | Decision | Founder answer | Date |
|---|---|---|---|
| D1 | Google sign-in: remove or implement | Default: remove Google sign-in for launch; revisit after M8 | 2026-10-03 |
| D2 | Hosting: VPS with Compose or Cloud Run | GCP (founder). Existing `deploy-api.yml` targets Cloud Run; Cloud Run vs a Compute Engine VM running Compose still to confirm. If Cloud Run, M1-F4 DB key storage is mandatory and the digest job must move to a scheduled trigger (plan M2-F1) | 2026-10-03 |
| D3 | Payments: Stripe Managed Payments, Paddle, Lemon Squeezy | Default: Stripe Managed Payments with hosted Checkout (verify one-time payment support first) | 2026-10-03 |
| D4 | Price points | Default: test about US$19 to $29 per 30 days, $39 to $49 per 90 days; credit packs $10 or more | 2026-10-03 |
| D5 | Repo visibility and license | Default: stay private until after M8 | 2026-10-03 |
| D6 | Production LLM provider and model | Default: mid-tier model with prompt caching, kept in config only | 2026-10-03 |
| D7 | Demo approach | Default: ephemeral per-visitor demo account with canned AI responses | 2026-10-03 |
| D8 | Email provider | Default: keep Resend | 2026-10-03 |
| D9 | AI may read stories (per-user opt-in) | Default: per-user opt-in toggle, off by default | 2026-10-03 |
| D10 | Mock rubric format | Default: per-dimension levels (Missing, Weak, Adequate, Strong) with quotes; no overall percentage | 2026-10-03 |
| D11 | Closed beta size and source | Default: 15 to 30 engineers with interviews scheduled, from personal network and communities | 2026-10-03 |
| D12 | Annual keep-ready plan | Default: decide after beta interviews | 2026-10-03 |

## Features

| ID | Feature | Status | Branch | Commit | Tests added | Notes |
|---|---|---|---|---|---|---|
| M0-F1 | Git state reconciliation | done | claude/docs-folder-review-9ghmg4 | see log | 0 | Remote `master` already had `Precept.Web/package.json`, and the auth files listed for deletion were gone (PR #15). Default branch is `master`; `ci.yml` and now `deploy-api.yml` trigger on it (founder approved 2026-10-03). Merging a change to `deploy-api.yml` or `Precept.Api/**` into `master` deploys to Cloud Run. Founder's local clone was behind remote; run `git pull origin master` locally |
| M0-F2 | Baseline build and test record | done | claude/docs-folder-review-9ghmg4 | see log | 0 | Baseline recorded above. Nothing blocked the build, so no fixes made |
| M0-F3 | Repository hygiene | done | claude/docs-folder-review-9ghmg4 | see log | 0 | Moved 4 superseded docs to `docs/archive/`, deleted unrouted `HomePage.tsx`, removed unused `express`, `dotenv`, `tsx`, `@types/express`. Other files the plan listed (`precept.md`, `graphify-out/`, etc.) are not in the repository. Follow-up (founder approved): removed stray root `package.json` and `package-lock.json` (only `canvas-confetti`, already in `Precept.Web`), the `.gitignore` line for the archived testing strategy, and `server.js` from the `clean` script |
| M0-F4 | Documentation truth pass | done | claude/docs-folder-review-9ghmg4 | see log | 0 | Rewrote `PRECEPT_OVERVIEW.md` for cookie auth and current features; corrected `README.md` (trash UI, search, BYOK wording, OWASP link, rate limiting, SSRF, test layout, roadmap). README Postgres 16 already matched `docker-compose.yml`; `docker-compose.gcp.yml` uses 18 (now noted). CHANGELOG "Documentation corrections" added. 1.2.0 "154 tests" could not be reproduced (about 130 test methods at the nearest commit) |
| M1-F1 | Google sign-in (D1) | done | claude/docs-folder-review-9ghmg4 | see log | 1 (replaced 1) | D1 default: removed endpoint, `GoogleAuthRequest`, frontend button, `googleLogin`, and the test that asserted the insecure path. New test `GoogleLogin_RouteRemoved_Returns404_AndDoesNotSignIn` verified to fail (200) against the old code. Not reviewed by a separate agent; include in the M1 milestone review. Out of scope, noted: unused `GithubIcon` in `sign-in.tsx`; hard-coded sample testimonial in `Landing.tsx` (M1-F8) |
| M1-F2 | Demo isolation (D7) | done | claude/docs-folder-review-9ghmg4 | see log | 10 | Migration `M1F2_DemoIsolation`. Deviation: demo accounts have no password (spec said random password); password login is refused for all demo accounts. Billing and email-sending endpoints do not exist yet, so "blocked" is satisfied by exclusion from the digest only. Reviewer (separate agent) found 1 blocking issue: per-IP limit is one shared bucket behind Cloud Run. Fixed with opt-in `ForwardedHeaders:TrustAllProxies` (right-most `X-Forwarded-For`, `ForwardLimit = 1`, verified against Microsoft Learn ASP.NET Core 10 docs) plus per-IP tests. **Merge gate:** before or with deploying to Cloud Run, set `ForwardedHeaders__TrustAllProxies=true` on the service and confirm in logs that Cloud Run appends the client IP as the right-most `X-Forwarded-For` entry (could not verify; Google docs blocked from the agent environment). Apply the migration before the new image serves traffic (`RunMigrationsOnStartup` is not set by `deploy-api.yml`); without it every login fails. Non-blocking review items fixed: legacy account password and security stamp cleared, opportunistic cleanup, testimonials blocked, demo banner, sample labels, wider cleanup test, Warning-level log |
| M1-F3 | AI usage guard and spend caps (D6) | todo | | | | Migration. From M1-F2 review: the decorator over `ILlmClientFactory` must refuse demo users centrally (today only `MockInterviewService` checks), with a test |
| M1-F4 | Data Protection keys and forwarded headers | todo | | | | Migration |
| M1-F5 | Email verification and password reset (D8) | todo | | | | From M1-F2 review: demo accounts are created with `EmailConfirmed = true`; block demo users from every email send (verify, reset, resend) and from the confirmed-email gate |
| M1-F6 | Partitioned rate limiting | todo | | | | |
| M1-F7 | SSRF hardening | todo | | | | |
| M1-F8 | Integrity fixes | todo | | | | |
| M1-F9 | Frontend test runner | todo | | | | |
| M1-F10 | Health checks, logging, migrations | todo | | | | |
| M2-F1 | Production stack (D2) | todo | | | | Founder runs deploy. First `deploy-api.yml` run (2026-10-03, PR #16 merge) failed at Google auth: secrets `GCP_PROJECT_ID`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT` are not set, so nothing was deployed |
| M2-F2 | Backups | todo | | | | Restore drill required |
| M2-F3 | Monitoring and alerts | todo | | | | |
| M2-F4 | Background jobs single-runner | todo | | | | Include `DemoCleanupService`. From M1-F2 review: expired demo sessions are not rejected at request time; Cloud Run may rarely run background jobs |
| M2-F5 | Privacy policy, terms, AI disclosure | todo | | | | Founder reviews copy |
| M2-F6 | Export and deletion completeness | todo | | | | |
| M2-F7 | Invite-only access | todo | | | | Migration |
| M3-F1 | Structured technical story fields | todo | | | | Migration |
| M3-F2 | Behavioral story parity and trash UI | todo | | | | Migration |
| M3-F3 | Tags | todo | | | | Migration |
| M3-F4 | Review log and real confidence trend | todo | | | | Migration |
| M3-F5 | Story detail page | todo | | | | |
| M3-F6 | Search coverage | todo | | | | |
| M3-F7 | Story draft from pasted text (stretch) | todo | | | | |
| M4-F1 | Stage model and history | todo | | | | Migration |
| M4-F2 | Requirement entity on generic target | todo | | | | Migration |
| M4-F3 | Requirement extraction | todo | | | | |
| M4-F4 | Evidence links (D9) | todo | | | | Migration |
| M4-F5 | Opportunity detail page | todo | | | | Migration (tasks) |
| M4-F6 | Merge JD matcher into opportunities | todo | | | | |
| M4-F7 | Gap to action | todo | | | | |
| M5-F1 | Session persistence | todo | | | | Migration |
| M5-F2 | Grounded question and follow-up generation | todo | | | | |
| M5-F3 | Rubric evaluation with citations (D10) | todo | | | | |
| M5-F4 | Session history and weakness tally | todo | | | | |
| M5-F5 | Save practice to story bank | todo | | | | |
| M5-F6 | Prompt injection hygiene | todo | | | | |
| M5-F7 | Offline evaluation harness (optional) | todo | | | | |
| M5-F8 | Voice stays local | todo | | | | |
| M6-F1 | Interview entity | todo | | | | Migration |
| M6-F2 | Prep plan per interview | todo | | | | Migration |
| M6-F3 | Debrief | todo | | | | Migration |
| M6-F4 | Dashboard v2 and readiness | todo | | | | |
| M6-F5 | Interviews page | todo | | | | |
| M6-F6 | Product usage events | todo | | | | Migration |
| M7-F1 | Plans and entitlements (D4) | todo | | | | Migration |
| M7-F2 | Checkout and webhooks (D3) | todo | | | | Migration. From M1-F2 review: reject `IsDemo` users explicitly |
| M7-F3 | Gating in the UI | todo | | | | |
| M7-F4 | Billing settings | todo | | | | |
| M7-F5 | Pricing page | todo | | | | |
| M7-F6 | Tax and accounting gate | todo | | | | Founder only |
| M8-F1 | Landing page rewrite | todo | | | | Founder reviews copy |
| M8-F2 | No-signup demo | todo | | | | |
| M8-F3 | Free tools and long-tail pages | todo | | | | |
| M8-F4 | Onboarding | todo | | | | |
| M8-F5 | Admin console | todo | | | | |
| M8-F6 | Launch checklist | todo | | | | Founder only |
| M10-F1 | Career targets | todo | | | | After M8, D12 |
| M10-F2 | Evidence inbox | todo | | | | Migration |
| M10-F3 | Evidence agent | todo | | | | |
| M10-F4 | Review and promotion drafts | todo | | | | |
| M10-F5 | Readiness nudges | todo | | | | |
| M10-F6 | Measure retention | todo | | | | |

M9 items get a row here when the founder picks them.

S-tier layer (`docs/plan/S_TIER_PLAN.md`):

| ID | Feature | Status | Branch | Commit | Tests added | Notes |
|---|---|---|---|---|---|---|
| S1 | Defend mode: follow-up probe drills | todo | | | | Deterministic version with M3-F5 (needs M3-F1); AI probes with M5 (needs M1-F3, D9). ADR for probe storage |
| S2 | Recall forecast: real FSRS | todo | | | | After M3-F4. Formulas and default weights from official FSRS sources only, cited in ADR. Replaces M9 item 10 |
| S3 | Interview kit (set cover) | todo | | | | After M4-F4. ADR for Strong/Partial weights |
| S4 | Answer replay and delivery metrics | todo | | | | With M5 (needs M5-F1). Check browser speech recognition support first |
| S5 | Story drift check | todo | | | | With M5-F3; shares number extraction with the fabricated-number guard |
| S6 | Visible loop: debrief, what changed | todo | | | | After M6-F3 |
| S7 | Proof on every number | todo | | | | Starts with M3; needs M1-F9 for the enforcing test |
| S-Q1 | Accessibility (WCAG 2.2 AA, axe in E2E) | todo | | | | Record baseline first |
| S-Q2 | Performance budgets (Lighthouse CI) | todo | | | | Record baseline first |
| S-Q3 | API contract: generated TS types | todo | | | | Record baseline first; ADR for generator |
| S-Q4 | Security headers and threat model | todo | | | | Headers depend on M2-F1 |
| S-Q5 | Architecture decision records | todo | | | | Backfill alongside M1 |


## Milestone reviews

| Milestone | Review date | Reviewer findings | Open blockers | Founder sign-off |
|---|---|---|---|---|
| M0 | 2026-10-03 | Self-reviewed (docs and config only) | None | Pending |
| M1 | | | | |
| M2 | | | | |
| M3 | | | | |
| M4 | | | | |
| M5 | | | | |
| M6 | | | | |
| M7 | | | | |
| M8 | | | | |

## Beta findings (M6 exit onward)

| Date | Participant (anonymized) | Seniority | Interviews scheduled | Would pay? At what price? | Notes |
|---|---|---|---|---|---|

## Log

Newest first. One line per orchestrator run: date, target, result, next step.

- 2026-10-03, target `M1-F2`: done after one review round; build, 145/145 backend tests, frontend type check and build pass. Founder actions before merge: Cloud Run forwarded-headers setting and migration (see M1-F2 notes). Next: M1-F3 AI usage guard.
- 2026-10-03, target `M1-F1`: done; build, 136/136 backend tests, frontend type check and build pass. Next: M1-F2 demo isolation (D7 default).
- 2026-10-03, target `M0`: M0-F1 done (deploy trigger on `master`, founder approved), M0-F4 done. Repository is public, so M1-F1 (Google sign-in removal) runs next as the most urgent item.
- 2026-10-03, target `next`: gates D1 to D12 recorded (defaults, D2 = GCP). M0-F3 done; build, 136/136 backend tests, frontend type check and build pass. M0-F1 waits on the founder's `deploy-api.yml` edit. Next: M0-F4 documentation truth pass.
- 2026-10-03, target `next`: M0-F2 done (baseline green: build, 136/136 backend tests, frontend type check and build). M0-F1 blocked on the founder decision about the `deploy-api.yml` trigger. Next: M0-F3 repository hygiene (needs founder answers on which root files to delete or ignore).
