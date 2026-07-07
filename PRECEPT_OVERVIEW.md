# Precept

**A career command center for software engineers — story bank, drill engine, and job pipeline tracker.**

Precept is a self-hostable web application that helps software engineers prepare for interviews and run their job hunt as a structured project rather than a graveyard of browser tabs. It is developer-first: dark-mode, monospace-leaning, keyboard-shoppable, with a real security posture and no telemetry.

> **Current status:** R1 is shipped — full-stack, secure, containerized, and CI-green. R2 (AI-powered interview intelligence) is in design.

---

## What Precept Does

Interview prep for engineers is usually fragmented across a Google Doc of STAR stories, a spreadsheet of applications, twenty open JD tabs, and a vague mental model of "things I have built." Precept collapses that into one application with three explicit jobs:

### 1. Bank Your Stories
Capture both technical and behavioral interview material so you walk into every round with a written corpus to draw from.

- **Technical Story Bank** — Code snippets + written explanations, tagged across 12 engineering domains: `Auth`, `Database`, `AI`, `ML`, `DevOps`, `Frontend`, `Backend`, `SystemDesign`, `Security`, `Testing`, `Cloud`, `Architecture`. Each story carries a `ConfidenceLevel`.
- **Behavioral Story Bank** — STAR-method (Situation / Task / Action / Result) narratives with free-text tags.

### 2. Drill Until Recall Is Automatic
A Quiz Mode resurfaces the right story next using a spaced-repetition-style priority:

- Never-reviewed stories first
- Then lowest-confidence stories (`Panic` → `Shaky`)
- Then oldest-reviewed stories

Each story is rated on a 5-rung **Confidence Ladder**:

```
Panic → Shaky → Okay → Solid → Can Teach
```

Rating a story updates its `ConfidenceLevel` and `LastReviewedAt` atomically.

### 3. Run the Pipeline Like a Project
Track every application through a five-stage status machine with automatic event history, so nothing goes stale and you always know what to chase.

```
Applied → Phone Screen → Interviewing → Offer / Rejected / Ghosted
```

Every status change writes an `ApplicationEvent`, creating an auditable trajectory for each opportunity.

---

## R1 Feature Set (Live)

| Feature | Description |
|---------|-------------|
| **Technical Story Bank** | Catalog snippets and explanations across 12 engineering domains with confidence tracking. |
| **Behavioral Story Bank** | STAR-structured narratives with tags. |
| **Quiz Mode** | Spaced-repetition resurfacing with confidence-ladder rating. |
| **JD Skill Mapper** | Persist a job description with a user-supplied keyword list; Precept computes a match score against your Skills inventory and surfaces missing keywords. |
| **Pipeline Tracker** | Five-stage application status machine with automatic event history. |
| **Skills Matrix** | Inventory skills with name, category, proficiency level, and notes; feeds the JD match. |
| **Technical Readiness** | Radar visualization of proficiency per skill category, plotted against an interview-ready threshold, plus gap analysis from saved job descriptions. |
| **Analytics Dashboard** | Story confidence breakdowns, applications by status, response/rejection rates, and average JD match score. |
| **Search** | Cross-entity search over stories, applications, job descriptions, and skills. |
| **Data Export** | `GET /api/dashboard/export` returns your entire dataset as JSON — no lock-in. |
| **Testimonials** | Authenticated users can submit public testimonials for the landing page. |

All endpoints are user-scoped (`[Authorize]` + `WHERE UserId = current_user`) and rate-limited.

---

## Architecture at a Glance

```
Precept.Web  →  Vite + React 19 + TypeScript + Tailwind v4
      ↓
   nginx (production) / Vite dev server (development)
      ↓
Precept.Api  →  ASP.NET Core 10 + EF Core 10 + PostgreSQL 18
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | ASP.NET Core 10, C# 13, EF Core 10, Npgsql, ASP.NET Core Identity, JWT bearer, `System.Threading.RateLimiting`, Serilog, Scalar |
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind v4, GSAP, Framer Motion, Recharts, lenis, lucide-react, React Router 7 |
| **Database** | PostgreSQL 18 with EF Core migrations committed to source control |
| **Tests** | xUnit + Testcontainers for .NET (52+ DB-backed integration and unit tests) |
| **CI** | GitHub Actions: build, test, vulnerable-package scan, `npm audit` |
| **Deployment** | Multi-stage Dockerfiles + `docker-compose.yml` for db → api → web |

---

## Security Posture

Precept handles personal career data, so the security model is intentionally overbuilt:

- **Passwords** — PBKDF2 via ASP.NET Core Identity (≥8 chars, upper/lower/digit/symbol)
- **Lockout** — 5 failed attempts → 15-minute lockout
- **Access tokens** — JWT bearer, HMAC-SHA256, 15-minute expiry, zero clock skew
- **Refresh tokens** — 64-byte CSPRNG, only SHA-256 hashes persisted, stored in `HttpOnly` + `Secure` + `SameSite=Strict` cookies
- **Refresh-token rotation (RTR)** — every refresh invalidates the spent token and issues a new one atomically
- **Replay detection** — benign concurrent retries get a soft 401; confirmed replays cascade-revoke every active session for the identity
- **Rate limiting** — `auth` policy 10 req/min, `general` policy 100 req/min
- **Tenant isolation** — global EF Core query filters ensure users can only see their own data
- **CORS & security headers** — environment-gated strict policies in production

A full OWASP Top 10 audit is documented in `OWASP-SECURITY-AUDIT.md`, and the auth architecture is detailed in `auth_reuse_detection_cascade_revocation.md`.

---

## Roadmap

### R2 — AI-Assisted Interview Intelligence

The goal is not to ship an LLM wrapper, but to ship LLM features that are **cheap, observable, and abuse-resistant** under a freemium model. The hard constraint is unit economics:

| Constraint | Target |
|------------|--------|
| Marginal LLM cost per mock-interview session | ≤ **$0.005** end-to-end |
| Free-tier sessions per user | Rate-limited to **2 / month** |
| Paid extension | Non-expiring credit packs, ledger-backed (atomic decrement, audit trail) |
| Free-tier STT | Browser-native Web Speech API (zero server cost) |
| Free-tier TTS | `SpeechSynthesisUtterance` (zero server cost) |
| Kill switch | `AI_FEATURES_ENABLED` env flag for one-config disable |

**Planned R2 features:**

- **AI Mock Interviewer** — Small-model question generation (Gemini Flash / Claude Haiku tier) tailored to the user's resume + a job description, with prompt caching for static context and a per-session server-side token budget.
- **Voice mock rounds** — Browser-native STT/TTS for free tier; optional `whisper-1` for paid users.
- **Scored feedback** — Structured rubric (Structure / Specificity / Conciseness) returned per response and persisted against the relevant Story for the spaced-repetition loop.
- **Resume parser** — Server-side PDF/DOCX → Skills inventory + JD match auto-fill.
- **Operational tooling** — Per-user spend ledger (`{user_id, session_id, input_tokens, output_tokens, model, cost_usd}`), admin `/spend` page, and a CI budget-regression check.

### R3 — Platform Expansion

Aspirational; not in active development.

- Native desktop client (Tauri)
- Companion mobile client
- **Team Mode** — shared story banks and peer mocks for engineering teams

---

## Why Precept Exists

The wedge against generic job trackers (Teal, Huntr, Simplify) is the second job: those tools track applications, but Precept also makes you interview-ready. It was built by a developer who needed it — a new grad with no internship experience trying to land a first SWE role — and realized a spreadsheet was not enough.

Precept is a personal project. It is not a funded startup or a hosted commercial service (yet), and it is not affiliated with any employer. It is MIT-licensed and self-hostable by anyone who finds it useful.

---

## Get Started

```bash
git clone https://github.com/austinchima/Precept.git
cd Precept
# Create a .env file with POSTGRES_*, JWT_SECRET_KEY, and optional CORS_ORIGINS
docker compose up -d --build
```

- Web: http://localhost
- API: http://localhost:8080
- API health: http://localhost:8080/api/health

For local development with hot reload, see `README.md`.

---

## License

MIT — fork it, run it, adapt it for your own job hunt.
