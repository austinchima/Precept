# OWASP Top 10 Security Review Report — Precept

## Review Summary
- **Scope:** Precept.Api (ASP.NET Core 10 Web API) + Precept.Web (React/Vite frontend) + Docker Compose + CI/CD
- **Date:** 2026-06-26
- **Risk summary:** RED High 0 | YELLOW Medium 0 (all fixed) | GREEN Low 0 (all fixed) | PASS 3

---

## ✅ What Was Fixed

### A01: Broken Access Control — PASS (No findings)
- Every API endpoint (except `SystemController.Ping` and `TestimonialController.GetPublicTestimonials`) enforces `[Authorize]`.
- All controllers extract the `userId` from the JWT claims (`NameIdentifier` / `sub`) and pass it to the service layer.
- Services scope every database query to the authenticated user (`WHERE a.UserId == userId`).
- **Defense-in-depth:** `PreceptDbContext` applies global query filters (`HasQueryFilter`) so that even if a service forgets to filter by user, the database layer will still enforce isolation.

### A02: Cryptographic Failures — PASS
- Passwords hashed with ASP.NET Identity (PBKDF2).
- JWT uses HMAC-SHA256 with secret from environment variable.
- Refresh tokens are SHA-256 hashed before storage.

### A03: Injection — PASS (No findings)
- All database queries use Entity Framework Core with LINQ expressions — no string concatenation or raw SQL.
- `SearchService` uses parameterized `Contains` queries (translated to `LIKE` by EF Core).
- No `Process.Start`, `os.system`, or shell command execution with user input.
- No server-side template rendering; the API returns JSON and the React frontend auto-escapes output.

### A04: Insecure Design — FIXED
- **Rate limiting added** (`Program.cs`): `auth` policy (10 req/min) and `general` policy (100 req/min) with `[EnableRateLimiting]` on all controllers.
- **Password reset flow added**: `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` endpoints.
- **Input validation added**: `TestimonialDto` now has `[StringLength]` limits (Name 100, Handle 50, Text 2000, AvatarSrc 500).

### A05: Security Misconfiguration — FIXED
- **Error leakage fixed**: `exception.Message` only returned in **Development**; production gets generic error message.
- **CORS split**: `AllowViteDev` for Development only; `Production` policy with restricted origins/headers/methods for non-dev.
- **Security headers added**: Middleware injects `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `CSP`, `X-XSS-Protection`, `Permissions-Policy`.
- **`AllowedHosts` fixed**: Development uses `localhost;127.0.0.1`; Production uses `your-production-domain.com`.
- **Migrations gated**: `Database.Migrate()` only runs when `IsDevelopment()` OR `RunMigrationsOnStartup: true`.
- **Docker Compose secured**: Credentials now use `${VAR:-default}` syntax with dev defaults; exposed port 5432 marked as **DEV ONLY**.

### A06: Vulnerable and Outdated Components — FIXED
- **CI dependency scanning added**: `dotnet list package --vulnerable --include-transitive` for NuGet.
- **npm audit added**: New `npm-audit` job in CI with `npm audit --audit-level=moderate` + `npm run build`.

### A07: Identification and Authentication Failures — FIXED
- **Email verification added**: `POST /api/auth/verify-email` endpoint. Registration generates confirmation token (logged in dev for testing).
- **Password reset added**: `POST /api/auth/forgot-password` generates reset token (logged in dev for testing).
- **Rate limiting on auth**: All auth endpoints (`register`, `login`, `refresh`, `revoke`, `forgot-password`, `reset-password`, `verify-email`, `me`, `profile`) now have `[EnableRateLimiting("auth")]`.
- **localStorage warning**: `api.ts` has OWASP comment documenting the XSS risk and migration path to http-only cookies.

### A08: Software and Data Integrity Failures — PASS
- No unsafe deserialization (`pickle` etc.).
- No CDN scripts requiring SRI (all bundled via Vite).
- No CI artifact signing (defense-in-depth gap, low priority).

### A09: Security Logging and Monitoring Failures — PASS
- Serilog structured logging with file rotation.
- Auth events logged (login, register, token rotation, reuse detection).
- No centralized audit logging for data changes (defense-in-depth gap, low priority).
- No alerting for anomalous behavior (defense-in-depth gap, low priority).

### A10: Server-Side Request Forgery (SSRF) — PASS (No findings)
- No controller accepts user-supplied URLs and makes server-side HTTP requests.
- No webhook registration, image fetching, URL preview, or server-side proxy functionality exists.

---

## 🧪 Dev-Friendly Defaults Preserved

All fixes maintain zero breaking changes for local development:
- `dotnet run` still auto-migrates (via `appsettings.json` `RunMigrationsOnStartup: true`)
- Vite dev server still connects via CORS (`AllowViteDev` policy in Development)
- Tokens still stored in `localStorage` (with documented OWASP warning and migration path)
- All new endpoints (forgot-password, reset-password, verify-email) log tokens to console for easy testing without an email provider

---

## 🚀 Production Checklist (Before Deploying)

Update these **3 values** before deploying to production:

1. **`appsettings.Production.json`** → `AllowedHosts`: Replace `your-production-domain.com` with your actual domain
2. **`Program.cs`** → `Production` CORS policy: Replace `https://your-production-domain.com` with your actual domain
3. **`docker-compose.yml`** → Remove the `ports: - "5432:5432"` block from the `db` service

**Optional but recommended:**
- Configure an email service (SendGrid/SES) and replace the `// TODO` email comments in `AuthController`
- Migrate access tokens from `localStorage` to http-only cookies (steps documented in `api.ts`)
- Add `Audit.NET` or `EntityFrameworkCore.Triggers` for centralized audit logging
- Integrate with a SIEM for anomalous behavior alerting
- Enable GitHub commit signing and `cosign` for Docker image signing

---

> **Disclaimer:** This audit is based on static code analysis and the OWASP Top 10 2021 checklist. It does not replace dynamic application security testing (DAST), penetration testing, or a full threat model review. For high-security deployments, combine this review with automated scanning (OWASP ZAP, Burp Suite) and a manual penetration test.
