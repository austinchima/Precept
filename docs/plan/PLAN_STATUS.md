# Precept plan status

Single source of truth for progress on `docs/plan/PRECEPT_PLAN.md`. The orchestrator agent updates this file after every feature. The founder fills in decision gates.

Status values: `todo`, `in progress`, `review`, `blocked`, `done`, `skipped`.

## Baseline (filled by M0-F2)

| Item | Value |
|---|---|
| Date | |
| Default branch | |
| Backend build | |
| Backend tests (passed / failed / skipped) | |
| Frontend lint | |
| Frontend build | |
| Notes | |

## Decision gates

| ID | Decision | Founder answer | Date |
|---|---|---|---|
| D1 | Google sign-in: remove or implement | | |
| D2 | Hosting: VPS with Compose or Cloud Run | | |
| D3 | Payments: Stripe Managed Payments, Paddle, Lemon Squeezy | | |
| D4 | Price points | | |
| D5 | Repo visibility and license | | |
| D6 | Production LLM provider and model | | |
| D7 | Demo approach | | |
| D8 | Email provider | | |
| D9 | AI may read stories (per-user opt-in) | | |
| D10 | Mock rubric format | | |
| D11 | Closed beta size and source | | |
| D12 | Annual keep-ready plan | | |

## Features

| ID | Feature | Status | Branch | Commit | Tests added | Notes |
|---|---|---|---|---|---|---|
| M0-F1 | Git state reconciliation | todo | | | | Founder confirms all git ops |
| M0-F2 | Baseline build and test record | todo | | | | |
| M0-F3 | Repository hygiene | todo | | | | |
| M0-F4 | Documentation truth pass | todo | | | | |
| M1-F1 | Google sign-in (D1) | todo | | | | Critical |
| M1-F2 | Demo isolation (D7) | todo | | | | Critical |
| M1-F3 | AI usage guard and spend caps (D6) | todo | | | | Migration |
| M1-F4 | Data Protection keys and forwarded headers | todo | | | | Migration |
| M1-F5 | Email verification and password reset (D8) | todo | | | | |
| M1-F6 | Partitioned rate limiting | todo | | | | |
| M1-F7 | SSRF hardening | todo | | | | |
| M1-F8 | Integrity fixes | todo | | | | |
| M1-F9 | Frontend test runner | todo | | | | |
| M1-F10 | Health checks, logging, migrations | todo | | | | |
| M2-F1 | Production stack (D2) | todo | | | | Founder runs deploy |
| M2-F2 | Backups | todo | | | | Restore drill required |
| M2-F3 | Monitoring and alerts | todo | | | | |
| M2-F4 | Background jobs single-runner | todo | | | | |
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
| M7-F2 | Checkout and webhooks (D3) | todo | | | | Migration |
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

## Milestone reviews

| Milestone | Review date | Reviewer findings | Open blockers | Founder sign-off |
|---|---|---|---|---|
| M0 | | | | |
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
