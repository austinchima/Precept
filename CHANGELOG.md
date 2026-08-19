# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-08-19

_R1.5 / AI Intelligence & Active Recall Milestone._

### Added
- **AI-Agnostic Mock Interview Engine**: Provider-agnostic LLM architecture (`ILlmClient`, `ILlmClientFactory`) supporting OpenAI (GPT-4o/mini), Anthropic (Claude 3.5 Haiku/Sonnet), Google Gemini (1.5/2.0 Flash), DeepSeek, Groq, OpenRouter, and local Ollama/vLLM with heuristic offline fallback.
- **AI Mock Interview Studio (`/mock-interview`)**: Real-time browser Speech-to-Text (STT), dynamic STAR evaluation across Situation, Task, Action, and Quantified Result, delivery coaching, and model answer generation.
- **SuperMemo-2 (SM-2) Spaced Repetition Engine**: Mathematical cognitive decay model computing per-story Ease Factors ($EF$), compounding review intervals ($I_{n+1} = I_n \times EF$), streak tracking, and anti-clumping jitter to eliminate review bunching.
- **Pluggable Spaced Repetition Architecture**: Abstracted `ISpacedRepetitionAlgorithm` with `Sm2Algorithm` active default and `FsrsAlgorithm` machine learning architecture stub deferred to subsequent release.
- **1-Click Hosted Live Demo**: Passwordless instant interactive sandbox (`POST /api/auth/demo-login`) with pre-seeded technical stories, behavioral STAR narratives, tracked jobs, and metrics.
- **Google OAuth / Social Sign-In**: Added Google sign-in support in authentication pipelines and UI.
- **Interactive Visual Analytics**: Added confidence trajectory over time, application velocity conversion funnel, and domain readiness progress.
- **Transaction Follow-Up & Digest Engine**: Resend and SMTP email dispatch with automated follow-up reminders.

### Security & Infrastructure
- **Dependency Hardening**: Upgraded `Testcontainers.PostgreSql` to 4.14.0, resolving transitive `SSH.NET` advisory (`GHSA-q939-rpr3-3284`) with 0 vulnerabilities across all dependencies.
- **Authentication UX**: Extended JWT access token lifetime to 120 minutes and hardened Refresh Token Rotation (RTR) to gracefully handle multi-tab concurrent refreshes.
- **CI/CD Hardening**: Added frontend TypeScript lint gate (`npm run lint`) and automated dependency vulnerability scanning in GitHub Actions.
- **Test Suite**: Expanded test coverage to 154 unit and integration tests covering SM-2 mathematics, mock interview services, LLM factory resolution, and social auth.

### Changed
- **Database Schema**: Added EF Core migration `20260819185208_AddSm2SpacedRepetitionFields` backfilling `Repetitions`, `EaseFactor`, and `IntervalDays` on technical and behavioral stories.
- **Landing Page**: Added Module 03 (AI Mock Interview Studio), highlighted SM-2 algorithms and live demo access, and tightened primary hero CTA layout.

## [1.1.0] - 2026-07-31

_R1 Finalization: Platform maturity and operational hardening._

### Added
- **Global Search**: Cross-entity search (Stories, Skills, Applications, Job Descriptions) powered by PostgreSQL Full-Text Search.
- **Active Session Management**: View all active devices/sessions from the Settings page and remotely revoke access to individual sessions.
- **Soft-Delete & Trash Recovery**: Deleted items (Stories, Skills, Applications) are now soft-deleted. Added a 30-day "Trash" tab in Settings to view or recover items.
- **Pagination (`PagedResponse<T>`)**: Added consistent cursor/offset pagination to all list endpoints in the API (Dashboard, Stories, JDs, Skills) to optimize load times and memory usage for large accounts.
- **Public Routes Guarding**: Migrated public routes like `/login` and `/capture/index.html` to `PublicOnlyRoute`, which intercepts logged-in users and redirects them to the dashboard automatically.

### Changed
- **JWT / Auth Modernization**: Updated refresh token hashing to use standard `Convert.ToBase64String` rather than hex, syncing the frontend/backend payload expectations.
- **Environment Bootstrapping**: Added `RunMigrationsOnStartup` environment variable mapping and updated `AllowedHosts` to gracefully support Docker Compose zero-config boots.

### Fixed
- **Testing Stability**: Addressed PostgreSQL connection pool exhaustion (Error 53300) in xUnit by disabling test parallelization and pooling. Added transient `AspNetUsers` Identity seeders to `InitializeAsync` for integration tests to satisfy strict foreign-key constraints on insert.

## [1.0.0] - 2026-07-08

_R1 release: full-stack career command center._

### Added
- **One-click job capture** via a zero-install bookmarklet. `JobPostingContentExtractor` fetches the posting URL, extracts company/role/location/salary/remote/description, and seeds a draft `Application`.
- **Behavioral story bank** with STAR-method (Situation / Task / Action / Result) narratives, free-text tags, templates, and quiz integration.
- **JD Skill Mapper** now auto-extracts a curated tech-skills keyword list server-side and computes a match score by case-insensitive set-intersection against the user's skills inventory, with an optional user override.
- **PageShell** shared authenticated-app layout with adaptive top actions, consistent dark theme, and sidebar navigation.
- **Capture instruction page** at `/capture/index.html` and `public/capture/bookmarklet.js`.

### Changed
- **Authenticated app UI redesigned** to match the landing page visual language end-to-end across dashboard, applications tracker, story bank, quiz mode, JD matcher, readiness, settings, login, and layout shell. Adopts the landing palette (`#02050A`/`#06090F` base, teal/violet/rose accents), typography stack, pill CTAs, IDE-style code mockups, dot-grid + radial-halo backgrounds, eyebrow status pills, and glass/gradient card treatments. No business-logic changes.
- **Quiz Mode** now presents behavioral prompts interview-style and reveals the full STAR breakdown on demand.

### Fixed
- **README accuracy**: corrected controller/service counts, updated JD Skill Mapper description, and aligned R1 status with the codebase.

### Security
- Hardened auth cookie factory, refresh-token rotation sync, and cascade-revocation support.
- Job capture endpoint validates URL scheme, rejects private/loopback hosts, and caps fetched pages at 2 MB.

### Documentation
- Rewrote `README.md` for accuracy and added `R1_Implementation_Plan.md`.

## [0.2.0] - 2026-06-28

_R1 candidate: Technical Readiness (Skills Matrix Visualizer)._

### Added
- **Technical Readiness page** (`/readiness`): a full-page Skills Matrix radar of current proficiency per skill category, plotted against a labeled interview-ready threshold (75%). All values derive from persisted Skill entities; sparse data (<3 categories) shows an honest empty state instead of placeholder shapes.
- **Role readiness (JD-derived)**: "target roles" are the user's own saved job descriptions, each surfacing its real `yourMatchScore` and aggregated `missingKeyWords`. Selecting a role drives a data-generated gap-analysis callout and highlights the skill categories that role actually touches — no fabricated benchmark polygons.
- **Gaps To Close**: aggregated missing keywords across saved JDs, plus per-category coverage bars with an interview-ready marker.
- Dashboard "Skills Matrix" tile now links through to the full Readiness view; added a **Readiness** sidebar nav item.

- **Skill categories are now a controlled vocabulary**: the Settings skill form uses a dropdown (Language, Framework, Library, Database, Tool, Cloud, DevOps, Testing, Mobile, Concept) instead of free text. The set is enforced server-side via a `[SkillCategory]` allow-list validation attribute (out-of-set values are rejected with 400) and normalised to canonical casing on save — so the readiness radar groups consistently. Single source of truth: `Precept.Api/Models/SkillCategories.cs` ↔ `SKILL_CATEGORIES` in the frontend.

### Fixed
- **Mouse-wheel scrolling on app pages**: Lenis smooth-scroll was initialized on `window` at the app root, but authenticated pages scroll an inner container (`#main-scroller`) while `body` is fixed — so the wheel was captured but nothing moved (only dragging the scrollbar worked). Lenis is now scoped to the landing page; app pages use native scrolling.
- **Dashboard skills radar axes** realigned to the canonical categories (fixing a prior 6-categories-on-a-5-axis-grid mismatch).

### Documentation
- **README rewrite.** Audited the README against the live codebase and corrected every
  inconsistency I could find. Notable fixes:
  - **Fixed:** architecture diagram and tech-stack listing referenced "Axios HTTP Client"; the
    project actually uses the native `fetch` API in `Precept.Web/src/api.ts`.
  - **Fixed:** local-setup instructions claimed the frontend would be available at
    `http://localhost:3000` after `docker compose up`. The compose `web` service serves the
    production nginx build on host port **80**; port 3000 is only the Vite dev-server port.
  - **Fixed:** removed the "encryption at rest" claim from Security. That is an infrastructure
    concern of the chosen Postgres host, not an application-level feature, and the README is now
    explicit about that limitation.
  - **Fixed:** clarified JD Analyzer behavior. The README previously implied automatic keyword
    extraction; in reality, the `CreateJobDescriptionRequest` accepts a **user-supplied**
    `ExtractedKeyWords` list and `JobDescriptionService.ComputeMatchScore` performs a
    case-insensitive set-intersection against the user's `Skills`. Renamed the module to
    "JD Skill Mapper" in feature copy and flagged NLP-based extraction as an R2 candidate.
  - **Added:** an "Environment variables" section documenting `POSTGRES_USER`,
    `POSTGRES_PASSWORD`, `POSTGRES_DB`, `JWT_SECRET_KEY` (with the 32-byte minimum and a
    generation recipe), and the optional `CORS_ORIGINS` / `ALLOWED_HOSTS`. `docker compose up`
    fails without these because `Program.cs` now fail-fasts on a missing JWT key (per
    `0.1.3`); the prior README did not warn users.
  - **Added:** a "Testing" section documenting the xUnit + Testcontainers setup, the
    `PostgresContainerFixture` CI fallback, and the CI workflow's three security scans.
  - **Added:** an "API documentation" pointer noting that **Scalar** is mounted at `/scalar`
    in development (configured in `Program.cs`, omitted from the prior README).
  - **Added:** a project-layout tree covering `Precept.Api/`, `Precept.Web/`, `Precept.Tests/`,
    `design-system/`, and the top-level docs.
  - **Expanded:** Security section now documents the full surface that is actually shipped —
    PBKDF2 password hashing, the 5-attempt / 15-minute Identity lockout, tiered
    `System.Threading.RateLimiting` policies (10/min auth, 100/min general), the
    environment-gated CORS split (`AllowViteDev` vs `Production` reading `CORS_ORIGINS`),
    the security-headers middleware, the production-only error-message redaction, the
    fail-fast JWT key length check, the `Database.Migrate()` startup gating, and the
    per-request `[Authorize]` + global tenant `HasQueryFilter` defense-in-depth.
  - **Expanded:** tech-stack listing now reflects the libraries actually in
    `Precept.Web/package.json` (GSAP + `@gsap/react`, Framer Motion + `motion`, Tailwind v4,
    Recharts, lenis, `@paper-design/shaders-react`, lucide-react, React Router 7) and the
    backend's Serilog + Scalar additions.
  - **Updated:** the ER diagram now includes `RefreshToken` and `Testimonial` (both have
    controllers, migrations, and live endpoints) and the full field sets on `Application`
    (Location, SalaryRange, FollowUpDate, IsRemote, Source, JobDescriptionId, ResumeVersion,
    Notes, DateLastContact), `JobDescription` (ExtractedKeyWords, MissingKeyWords,
    YourMatchScore, Url, SalaryRange, Location, IsRemote, Source, DatePosted), and `Skill`
    (Category, ProficiencyLevel enum, Notes, timestamps).
  - **Added:** an honest R2 scope section that commits to per-session cost ceilings
    (≤ $0.005), prompt caching, browser-native STT/TTS in the free tier, a credit-ledger
    model with atomic decrement for paid extensions, and an `AI_FEATURES_ENABLED` kill switch.
  - **Added:** a "Disclaimer & origin" section that is honest about Precept being a personal
    portfolio project (not a funded SaaS, no hosted commercial offering yet) and explains why
    the codebase deliberately over-invests in auth/testing/OWASP coverage.
  - **Reframed:** product positioning replaced the "Secure, Hosted Job-Hunting Command Center"
    tagline with a more accurate "career command center for software engineers" framing, and
    moved the wedge-vs-trackers point (Teal / Huntr / Simplify) into the explicit "Why this
    exists" section.
  - **Removed:** the unsubstantiated "Secure Cloud Architecture" / "isolated cloud
    infrastructure" claim, since the repo only ships docker-compose; replaced with a Known
    Limitations subsection.

## [0.1.4] - 2026-06-28

_R1 release candidate — dashboard accuracy fixes._

### Fixed
- **Skills Matrix radar**: empty skill categories no longer render at a fabricated 40% placeholder; they now collapse to 0 so the radar reflects actual coverage (`Dashboard.tsx`).
- **Story confidence chart**: bars are now colored by the real confidence levels (Panic → CanTeach, worst → best) instead of dead `high`/`medium` branches that left every bar the same rose color.

### Added
- **Story Readiness "due for review" count**: the dashboard now surfaces the existing server-side `needsReview` metric as "_N_ due for review", reinforcing the review-health view.

## [0.1.3] - 2026-06-28

_R1 release candidate. Green CI and production-secret hardening on top of the 0.1.2 OWASP audit._

### Security
- **JWT key fail-fast**: The API now validates `JwtSettings:SecretKey` at startup and refuses to boot if it is missing or under 32 bytes (the HMAC-SHA256 minimum), instead of failing obscurely on the first token-signing request (`Program.cs`).
- **Production hardening**: Removed hardcoded secrets and insecure development defaults from committed configuration; required secrets (e.g. `JWT_SECRET_KEY`) are now supplied exclusively via environment variables.

### Fixed
- **CI test suite (all 52 DB-backed tests)**: A `Migrations/` entry in `.gitignore` kept the EF Core migrations out of source control, so CI checkouts built `Precept.Api` with no migration classes. `MigrateAsync()` then no-op'd and left every per-test database schemaless, failing with `42P01: relation "AspNetUsers"/"RefreshTokens" does not exist` (unit) and `503 Service Unavailable` (integration). Migrations are now committed.

### Changed
- **Test database provisioning**: The shared `PostgresContainerFixture` now honors `ConnectionStrings__PreceptDb`, using the CI runner's PostgreSQL service (`ikalnytskyi/action-setup-postgres`) when present and falling back to Testcontainers locally.
- **CI triggers**: Continuous integration now runs on `master` for both pushes and pull requests.

## [0.1.2] - 2026-06-26

### Security (OWASP Top 10 Full Compliance Audit)
Full OWASP Top 10 security review completed and all findings remediated. See `OWASP-SECURITY-AUDIT.md` for details.

- **A01: Broken Access Control**: Already compliant. `[Authorize]` on all controllers, user-scoped queries, and global `HasQueryFilter` on `PreceptDbContext`.
- **A02: Cryptographic Failures**: Already compliant. PBKDF2 password hashing, HMAC-SHA256 JWT, SHA-256 hashed refresh tokens.
- **A03: Injection**: Already compliant. All EF Core LINQ queries (no raw SQL), React auto-escapes frontend output.
- **A04: Insecure Design**: Fixed.
  - Added rate limiting (`AddRateLimiter` with `auth` 10 req/min and `general` 100 req/min policies).
  - `[EnableRateLimiting]` applied to all controllers (`Auth`, `Application`, `Story`, `Dashboard`, `Search`, `Skill`, `JobDescription`, `BehavioralStory`, `Testimonial`).
  - Added `ForgotPassword` / `ResetPassword` endpoints (`POST /api/auth/forgot-password`, `POST /api/auth/reset-password`).
  - Added `[StringLength]` validation on `TestimonialDto` (Name 100, Handle 50, Text 2000, AvatarSrc 500).
- **A05: Security Misconfiguration**: Fixed.
  - Error middleware: `exception.Message` only returned in **Development**; production gets generic `"An unexpected error occurred."`.
  - CORS split: `AllowViteDev` policy for Development only; `Production` policy with restricted origins/headers/methods for non-dev.
  - Added security headers middleware (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `CSP`, `X-XSS-Protection`, `Permissions-Policy`).
  - `AllowedHosts`: `localhost;127.0.0.1` in dev; production config uses `your-production-domain.com`.
  - Gated migrations: `Database.Migrate()` only runs when `IsDevelopment()` OR `RunMigrationsOnStartup: true`.
  - Docker Compose: credentials now use `${VAR:-default}` env syntax; exposed port 5432 marked DEV ONLY.
- **A06: Vulnerable Components**: Fixed.
  - Added `dotnet list package --vulnerable --include-transitive` to CI.
  - Added `npm-audit` CI job (`npm audit --audit-level=moderate`) for `Precept.Web`.
- **A07: Auth Failures**: Fixed.
  - Added `POST /api/auth/verify-email` endpoint with token generation (logged in dev for testing).
  - Added `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` endpoints.
  - All auth endpoints (`register`, `login`, `refresh`, `revoke`, `forgot-password`, `reset-password`, `verify-email`, `me`, `profile`) now have `[EnableRateLimiting("auth")]`.
  - Added `lockout` policy (5 failed attempts, 15-minute lockout) and `RequireUniqueEmail` in `AddIdentity`.
- **A08: Data Integrity**: Already compliant. No unsafe deserialization, no CDN scripts requiring SRI (Vite-bundled), no artifact signing (low-priority defense-in-depth gap).
- **A09: Logging & Monitoring**: Already compliant. Serilog structured logging with auth events (login, register, token rotation, reuse detection). No centralized audit logging or SIEM alerting (low-priority defense-in-depth gaps).
- **A10: SSRF**: Already compliant. No server-side URL fetching, webhooks, or proxies.

### Changed
- **Authentication**: Registration now sets `EmailConfirmed = false` and generates a confirmation token (dev-friendly: token logged to console).
- **Error Handling**: Exception middleware logs full stack traces to structured logs while returning generic messages to clients in production.
- **Configuration**: `appsettings.json` updated with `AllowedHosts: localhost;127.0.0.1` and `RunMigrationsOnStartup: true`. `appsettings.Production.json` has empty connection string, `AllowedHosts: your-production-domain.com`, and `RunMigrationsOnStartup: false`.
- **Frontend**: `api.ts` now includes an OWASP comment documenting the `localStorage` XSS risk and a migration path to http-only cookies for production.

### Added
- **New DTOs**: `ForgotPasswordRequest`, `ResetPasswordRequest`, `VerifyEmailRequest` in `AuthDtos.cs`.
- **Security Audit Report**: Published `OWASP-SECURITY-AUDIT.md` with full findings, remediation, and production checklist.

---

## [0.1.1] - 2026-06-25

### Security
- **Authentication (Crown Jewel)**: Codified database-backed Refresh Token Rotation (RTR) with Lineage-Aware Replay Detection and Fail-Safe Identity-Wide Cascade Revocation (`RevokeAllUserTokens`).

### Changed
- **Frontend HTTP Client**: Implemented a benign retry interceptor in `api.ts` to silently recover from concurrent multi-tab token rotations (`"Token just refreshed"` 401 response) by polling `localStorage`.
- **Codebase Documentation**: Added architectural commentary across `RefreshToken` and `AuthController` detailing Optimistic Concurrency (`[ConcurrencyCheck]`) and Lineage tracking.

### Added
- **Architecture Handbook**: Published `auth_reuse_detection_cascade_revocation.md` detailing the threat model, race condition defenses (Three Pillars), and test verification invariants.

## [0.1.0] - 2026-06-23

### Added
- **Analytics Dashboard**: Implemented data visualization using Recharts and added liquid glass confirmation modals.
- **True Trajectory Scanner**: Overhauled scanner logic and migrated to containerized PostgreSQL.
- **Story Bank**: Expanded story tracking capabilities and refined system diagnostics.
- **Web Application**: Scaffolded React frontend alongside ASP.NET Core API for the complete project architecture.
- **Authentication**: Implemented core identity infrastructure with JWT authentication and secure refresh token rotation.
- **Database**: Added EF Core identity support and initialized project with the domain models and production settings.
- **Documentation**: Added MIT license and updated the architectural schema and roadmap in the project documentation.

### Changed
- **AI Architecture**: Removed the frontend Gemini SDK to securely defer AI analysis entirely to the server-side.
- **Authentication Security**: Engineered dead-heat concurrency guards for the RefreshToken mechanism and streamlined the auth flow.
- **User Identity**: Updated authentication models to utilize email addresses as the primary username identifier.
- **Documentation**: Updated the README to reflect hosted SaaS framing and accurately portray current features.

### Fixed
- **Testing**: Updated the test suite to ensure coverage for the new auth concurrency guards.

### Chore
- Updated `.gitignore` to entirely exclude the `.vscode` directory rather than just its contents.
