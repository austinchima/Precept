# R1 Implementation Plan

This file is an ordered, session-safe task list for implementing Precept R1.
Each task includes why it is needed, the files involved, and acceptance criteria.
Work through them in order; do not skip ahead unless a task is explicitly marked as optional.

---

## Phase 1: Production Readiness

### Task 1: Harden auth for production

**Why:** The current frontend stores the JWT access token in `localStorage`, which is vulnerable to XSS. Before any public launch, auth must be production-safe.

**Files to change:**
- `Precept.Web/src/api.ts`: remove localStorage token storage; read access token from HTTP-only cookie or use a secure in-memory strategy.
- `Precept.Web/src/AuthContext.tsx`: update login/register/logout/refresh flows to match the new token transport.
- `Precept.Api/Controllers/AuthController.cs`: return the access token in a secure cookie alongside the refresh cookie, or return both tokens via cookies.
- `Precept.Api/Services/CookieOptionsFactory.cs`: ensure cookie options are correct for production (`Secure`, `SameSite=Strict`, `HttpOnly`).
- `Precept.Api/Program.cs`: confirm HTTPS redirection, CORS, and security headers are active in production.
- `Precept.Api/appsettings.Production.json` and `.env.example`: document required production secrets (`JWT_SECRET_KEY`, `AllowedHosts`, `CORS_ORIGINS`).

**Acceptance criteria:**
- [ ] Access token is no longer stored in `localStorage` after login/refresh.
- [ ] Registration and login return tokens via secure HTTP-only cookies.
- [ ] The refresh cookie remains scoped to `/api/auth`.
- [ ] HTTPS redirection and security headers are active in the Production environment.
- [ ] Existing auth integration tests still pass.

---

### Task 2: Fix the `PUT /api/application` status-change bug

**Why:** A full edit of an application never records a status-change event because `app.Status` is overwritten before the comparison.

**Files to change:**
- `Precept.Api/Services/ApplicationService.cs` (around lines 148–183)

**Required change:**
1. Capture the original status before applying the request.
2. Compare the original status to `request.Status`.
3. Only create an `ApplicationEvent` when they differ.

**Acceptance criteria:**
- [ ] Updating an application with a changed status via `PUT /api/application/{id}` creates an `ApplicationEvent`.
- [ ] Updating an application without changing the status does not create a duplicate event.
- [ ] Existing `ApplicationServiceTests` and `ApplicationEndpointTests` still pass.

---

## Phase 2: Core Value Loop

### Task 3: Replace manual JD keyword entry with auto-extraction

**Why:** Typing comma-separated keywords is friction. Auto-extraction makes the JD matcher useful and differentiates Precept from a spreadsheet.

**Files to change:**
- `Precept.Api/Services/JobDescriptionService.cs`: add keyword extraction before match-score computation.
- `Precept.Api/DTOs/CreateJobDescriptionRequest.cs` / `UpdateJobDescriptionRequest.cs`: make `ExtractedKeyWords` optional or computed; keep `Description` required.
- `Precept.Web/src/pages/JDMatcher.tsx`: remove the manual keyword input; show auto-extracted keywords and missing keywords.
- `Precept.Web/src/types.ts`: update types if needed.

**Implementation notes:**
- Start with a cheap, deterministic extractor: a curated tech-skills dictionary + simple text matching against the JD description.
- Optionally add a cheap LLM fallback, but only if it is cost-gated.
- Reuse the existing `ComputeMatchScore` logic.

**Acceptance criteria:**
- [ ] Pasting a job description auto-fills `ExtractedKeyWords` and `MissingKeyWords`.
- [ ] `YourMatchScore` is still computed from extracted keywords vs. user skills.
- [ ] The manual keyword input is removed from the UI.
- [ ] Existing JD tests still pass or are updated to reflect auto-extraction.

---

### Task 4: One-click job capture

**Why:** The biggest reason job-tracker apps die is manual data entry. A bookmarklet or Chrome extension that creates an application from the current job posting removes that friction.

**Files to change / create:**
- `Precept.Api/Controllers/ApplicationController.cs`: add `POST /api/application/capture`.
- `Precept.Api/Services/ApplicationService.cs` or new `JobCaptureService.cs`: fetch the URL, extract company, role, location, remote flag, salary, and description.
- `Precept.Api/DTOs/CaptureApplicationRequest.cs`: accept URL + optional notes.
- New folder: `Precept.Capture/` or `Precept.Web/public/capture/`: Chrome extension or bookmarklet.

**Implementation notes:**
- Reuse the JD extraction from Task 3.
- Start with a bookmarklet; upgrade to a Chrome extension later.
- Store the raw URL and description so the user can edit the draft.

**Acceptance criteria:**
- [ ] Clicking the bookmarklet/extension creates a draft application.
- [ ] The draft includes company, role, location, remote flag, source URL, and description.
- [ ] The draft appears in the application tracker for editing.
- [ ] Cross-user isolation still applies.

---

### Task 5: Follow-up email reminders

**Why:** The backend already computes `FollowUpDate`, but users will forget to return unless they are reminded.

**Files to change / create:**
- New service: `Precept.Api/Services/ReminderService.cs`: queries applications whose `FollowUpDate` is today or past and whose status is not `Offer`/`Rejected`.
- New hosted service or scheduled trigger in `Program.cs`.
- New email abstraction: `Precept.Api/Services/EmailService.cs` (Resend/Mailgun/SendGrid).
- New template: plain-text/HTML reminder email.

**Implementation notes:**
- Use a lightweight scheduler: .NET `IHostedService` with a daily loop, or an external cron that hits a private endpoint.
- Do not send more than one reminder per application per day.
- Respect user notification preferences (add a simple `EmailNotificationsEnabled` flag).

**Acceptance criteria:**
- [x] A daily job finds applications with `FollowUpDate <= today` and active status.
- [x] A reminder email is sent to the owning user.
- [x] The email contains a link back to the application tracker.
- [x] Users can disable reminder emails in settings.

---

### Task 6: Onboarding empty states and templates

**Why:** First-time users have no stories and no applications. Empty screens feel dead. Example content proves value immediately.

**Files to change:**
- `Precept.Api/Controllers/AuthController.cs`: after successful registration, seed example stories for the new user.
- `Precept.Api/Services/StoryService.cs` / `BehavioralStoryService.cs`: add seeding helpers.
- `Precept.Web/src/pages/StoryBank.tsx`: improve empty states.
- `Precept.Web/src/pages/Dashboard.tsx`: show a “get started” checklist for new users.
- `Precept.Web/src/pages/Landing.tsx`: add a live demo or screenshot of the story/quiz flow.

**Acceptance criteria:**
- [ ] New accounts start with 3–5 example technical stories and 2 example STAR stories.
- [ ] Empty application tracker shows a “Add your first application” CTA.
- [ ] Landing page clearly demonstrates the story-bank + quiz loop.

---

## Phase 3: Monetization Foundation

### Task 7: Design the AI mock interview paywall

**Why:** AI mock interviews will use paid LLM inference. They must be behind a hard paywall/credit gate from day one, or free users will drain your budget.

**Files to change / create:**
- `Precept.Api/Models/CreditBalance.cs` (or extend `ApplicationUser`): track available credits.
- `Precept.Api/Models/Transaction.cs`: record credit purchases and consumption.
- `Precept.Api/Services/PaymentService.cs`: Stripe (or Paddle/Lemon Squeezy) webhook handler to grant credits.
- `Precept.Api/Controllers/PaymentController.cs` or webhook endpoint.
- `Precept.Web/src/pages/Settings.tsx`: show credit balance and purchase options.
- Environment variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`.

**Implementation notes:**
- Free users get **zero** AI mock interview credits.
- The AI endpoint must check credits server-side before calling any LLM.
- Every AI call deducts exactly one credit.
- Add an admin alert when monthly AI spend crosses 50%, 80%, and 100% of a configured budget.

**Acceptance criteria:**
- [ ] Free users cannot invoke the AI mock interview endpoint.
- [ ] Purchasing credits via Stripe webhook increases the user’s balance.
- [ ] Each AI mock interview call decrements the balance atomically.
- [ ] When the balance is zero, the API returns a clear 402/403 response and the UI prompts to buy credits.

---

### Task 8: Build the AI mock interview feature (paid only)

**Why:** This is the planned paid feature. It should only exist after the paywall in Task 7 is solid.

**Files to change / create:**
- `Precept.Api/Services/AiInterviewService.cs`: build the prompt, call the LLM, parse feedback.
- `Precept.Api/Controllers/MockInterviewController.cs`: single endpoint, credit-guarded.
- `Precept.Api/Models/AiInterviewSession.cs`: store prompts, responses, feedback.
- `Precept.Web/src/pages/MockInterview.tsx`: UI for selecting a story/JD and running the interview.
- `Precept.Web/src/api.ts`: add the new endpoint client.

**Implementation notes:**
- Use a cheap model first: GPT-4o-mini, Gemini Flash, or Claude Haiku.
- Cap max tokens per call.
- Keep prompts short and reusable; cache system prompts.
- Always call the LLM server-side; never expose the API key to the frontend.
- Keep the existing self-assessment quiz mode free.

**Acceptance criteria:**
- [ ] Paid users can select a story or JD and run a mock interview.
- [ ] The response includes structured feedback (clarity, technical accuracy, structure).
- [ ] One credit is deducted per interview session.
- [ ] The session is saved and viewable in history.

---

## Phase 4: Launch

### Task 9: Launch the free tier publicly

**Why:** Everything before this was preparation. Now you validate whether real users stick around.

**Files / tasks:**
- `docker-compose.yml` / `Precept.Api/Dockerfile` / `Precept.Web/Dockerfile`: confirm production builds.
- Hosting: deploy API + DB + web (Render, Railway, Fly.io, Azure Container Apps, etc.).
- Add basic analytics: sign-ups, applications created, 7-day retention, story quiz completions.
- Set up error monitoring (e.g., Sentry free tier).
- Announce in new-grad communities, bootcamps, university CS Discords, LinkedIn.

**Acceptance criteria:**
- [ ] Live public URL with HTTPS.
- [ ] New user can register, add an application, add a story, and run the quiz without errors.
- [ ] AI mock interview is behind the paywall and cannot be used without credits.
- [ ] You can view a basic retention metric within one week of launch.

---

## Monetization guardrails (apply to Tasks 7–8)

| Rule | How to enforce |
|---|---|
| No free AI calls | AI endpoint checks `CreditBalance > 0` server-side. |
| Server-side LLM only | API keys are never sent to the browser. |
| Hard monthly budget cap | `MAX_MONTHLY_AI_SPEND_USD` env var; return `503` if exceeded. |
| Cheap models first | Default to GPT-4o-mini / Gemini Flash. |
| Token limits | Set `max_tokens` on every LLM call. |
| Webhook-safe billing | Use Stripe webhooks to credit accounts; never trust the client. |
| No open-ended trials | If you offer a trial, give exactly 1 session and require a card. |

---

## Suggested pricing model

- **Free:** unlimited applications, stories, self-assessment quiz mode, manual JD paste, follow-up reminders.
- **Pro / Credits:** AI mock interviews, advanced JD parsing, analytics.
- **Credit packs** are a good entry point: e.g., 5 mock interviews for $4, so hesitant users can try without a subscription.

---

## Summary order

1. Harden auth for production.
2. Fix the `PUT /api/application` status bug.
3. Replace manual JD keyword entry with auto-extraction.
4. Build one-click job capture.
5. Add follow-up email reminders.
6. Add onboarding templates and empty states.
7. Design the AI mock interview paywall.
8. Build the AI mock interview feature (paid only).
9. Launch publicly and measure retention.

---

## Implementation Session Notes: 2026-07-07

### Completed

- **Task 1: Harden auth for production**
  - Backend: `accessToken` is now transported as an HttpOnly cookie with `Path=/api`; refresh cookie stays scoped to `/api/auth`.
  - Frontend: `api.ts` and `AuthContext.tsx` no longer store or read the access token from `localStorage`; all API calls use `credentials: 'include'`.
  - JWT middleware falls back to the `accessToken` cookie when no `Authorization` header is present, preserving test compatibility.
  - Production cookie options and `.env.example` documented.

- **Task 2: Fix `PUT /api/application` status-change bug**
  - `ApplicationService.UpdateApplicationAsync` now captures `originalStatus` before applying request changes and only creates an `ApplicationEvent` when the status actually changes.

- **Task 3: Replace manual JD keyword entry with auto-extraction**
  - `Precept.Api/Services/Interfaces/IJobDescriptionKeywordExtractor.cs`: new extractor contract.
  - `Precept.Api/Services/JobDescriptionKeywordExtractor.cs`: deterministic, server-side extractor using a curated dictionary of languages, frameworks, databases, cloud tools, security/AI concepts, etc. Handles multi-word phrases, case-insensitive matching, punctuation, and slash-separated terms (e.g., `CI/CD`).
  - `Precept.Api/Services/JobDescriptionService.cs`: injects the extractor; keywords are auto-extracted from `Description` when the client does not supply an override.
  - `Precept.Api/DTOs/JobDescriptionDto.cs`: `ExtractedKeyWords` is now optional on create/update requests.
  - `Precept.Api/Program.cs`: registers `IJobDescriptionKeywordExtractor` as a singleton.
  - `Precept.Web/src/pages/JDMatcher.tsx`: removed the manual keyword fallback input; the UI now relies on server-side extraction.
  - Tests: added `JobDescriptionKeywordExtractorTests` and `JobDescriptionServiceTests` covering auto-extraction, override behavior, and score recomputation on update.

### Completed

- **Task 4: One-click job capture**
  - `POST /api/application/capture` endpoint, `JobPostingContentExtractor`, URL validation, private/loopback rejection, and a bookmarklet at `/capture/index.html` are all implemented.

- **Task 5 (Part 1): Follow-Ups Due Dashboard widget**
  - Added `GetFollowUpsDueAsync` to `ApplicationService` and `GET /api/application/followups-due` to `ApplicationController`.
  - Added a "Follow-Ups Due" section to `Dashboard.tsx` with a `Mark Contacted` button.
  - Added `GetFollowUpsDue_ReturnsOnlyOverdueNonTerminalApplications` integration test.

### Completed (Recent)

- **Task 5 (Part 2): Follow-up email reminders**
  - Added `EmailReminderService.cs` as a hosted service.
  - Generates a single digest for all follow-ups and due reviews via `DigestQueryService`.

- **Task 6: Onboarding empty states and templates**
  - Updated `AuthController` and `StoryService` / `BehavioralStoryService` to auto-seed starter stories for new users.
  - Added a "Getting Started Checklist" in `Dashboard.tsx` that replaces the previous API-based `OnboardingWizard`.
  - Verified `StoryBank` and `Landing` pages feature detailed empty states and mockups.

### Pending / Deferred

- **Task 7: AI mock interview paywall** (deferred to R2)
- **Task 8: Build AI mock interview feature** (deferred to R2)
- **Task 9: Launch publicly and measure retention** (deferred to user)
