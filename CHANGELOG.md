# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

- **A01 — Broken Access Control**: Already compliant. `[Authorize]` on all controllers, user-scoped queries, and global `HasQueryFilter` on `PreceptDbContext`.
- **A02 — Cryptographic Failures**: Already compliant. PBKDF2 password hashing, HMAC-SHA256 JWT, SHA-256 hashed refresh tokens.
- **A03 — Injection**: Already compliant. All EF Core LINQ queries (no raw SQL), React auto-escapes frontend output.
- **A04 — Insecure Design**: Fixed.
  - Added rate limiting (`AddRateLimiter` with `auth` 10 req/min and `general` 100 req/min policies).
  - `[EnableRateLimiting]` applied to all controllers (`Auth`, `Application`, `Story`, `Dashboard`, `Search`, `Skill`, `JobDescription`, `BehavioralStory`, `Testimonial`).
  - Added `ForgotPassword` / `ResetPassword` endpoints (`POST /api/auth/forgot-password`, `POST /api/auth/reset-password`).
  - Added `[StringLength]` validation on `TestimonialDto` (Name 100, Handle 50, Text 2000, AvatarSrc 500).
- **A05 — Security Misconfiguration**: Fixed.
  - Error middleware: `exception.Message` only returned in **Development**; production gets generic `"An unexpected error occurred."`.
  - CORS split: `AllowViteDev` policy for Development only; `Production` policy with restricted origins/headers/methods for non-dev.
  - Added security headers middleware (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `CSP`, `X-XSS-Protection`, `Permissions-Policy`).
  - `AllowedHosts`: `localhost;127.0.0.1` in dev; production config uses `your-production-domain.com`.
  - Gated migrations: `Database.Migrate()` only runs when `IsDevelopment()` OR `RunMigrationsOnStartup: true`.
  - Docker Compose: credentials now use `${VAR:-default}` env syntax; exposed port 5432 marked DEV ONLY.
- **A06 — Vulnerable Components**: Fixed.
  - Added `dotnet list package --vulnerable --include-transitive` to CI.
  - Added `npm-audit` CI job (`npm audit --audit-level=moderate`) for `Precept.Web`.
- **A07 — Auth Failures**: Fixed.
  - Added `POST /api/auth/verify-email` endpoint with token generation (logged in dev for testing).
  - Added `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` endpoints.
  - All auth endpoints (`register`, `login`, `refresh`, `revoke`, `forgot-password`, `reset-password`, `verify-email`, `me`, `profile`) now have `[EnableRateLimiting("auth")]`.
  - Added `lockout` policy (5 failed attempts, 15-minute lockout) and `RequireUniqueEmail` in `AddIdentity`.
- **A08 — Data Integrity**: Already compliant. No unsafe deserialization, no CDN scripts requiring SRI (Vite-bundled), no artifact signing (low-priority defense-in-depth gap).
- **A09 — Logging & Monitoring**: Already compliant. Serilog structured logging with auth events (login, register, token rotation, reuse detection). No centralized audit logging or SIEM alerting (low-priority defense-in-depth gaps).
- **A10 — SSRF**: Already compliant. No server-side URL fetching, webhooks, or proxies.

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
- **Codebase Documentation**: Added comprehensive architectural commentary across `RefreshToken` and `AuthController` detailing Optimistic Concurrency (`[ConcurrencyCheck]`) and Lineage tracking.

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
- Updated `.gitignore` to comprehensively exclude the `.vscode` directory rather than just its contents.
