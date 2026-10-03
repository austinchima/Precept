# Precept

**A career command center for software engineers: story bank, drill engine and job pipeline tracker.**

Precept is a self-hostable web application that helps software engineers prepare for interviews and run their job hunt as a structured project. It stores your technical and behavioral stories, schedules them for review, tracks applications, and runs AI mock interviews against an LLM provider you configure.

> **Current status:** version 1.3.0. The plan for what comes next lives in [`docs/plan/PRECEPT_PLAN.md`](docs/plan/PRECEPT_PLAN.md), with progress in [`docs/plan/PLAN_STATUS.md`](docs/plan/PLAN_STATUS.md).

---

## What Precept does

### 1. Bank your stories

- **Technical story bank**: code snippets and written explanations, each in one of 12 categories (`Auth`, `Database`, `Ai`, `Ml`, `DevOps`, `Frontend`, `Backend`, `SystemDesign`, `Security`, `Testing`, `Cloud`, `Architecture`) with a confidence level.
- **Behavioral story bank**: STAR (Situation, Task, Action, Result) stories with free-text tags and starter templates.

### 2. Drill until recall is automatic

Both story types are scheduled with the SM-2 spaced-repetition algorithm, which sets each story's next review date from your ratings. Quiz mode serves stories with the lowest confidence first, then stories that have never been scheduled, then the earliest due.

Ratings use a five-step confidence ladder:

```
Panic → Shaky → Okay → Solid → Can Teach
```

### 3. Run the pipeline like a project

Applications move through six statuses, and every status change writes an `ApplicationEvent`:

```
Applied → PhoneScreen → Interviewing → Offer / Rejected / Ghosted
```

---

## Feature set (1.3.0)

| Feature | Description |
|---------|-------------|
| **Technical story bank** | Snippets and explanations across 12 categories with confidence tracking. Deleted stories are soft-deleted (API endpoints for trash and restore; no trash screen yet). |
| **Behavioral story bank** | STAR stories with tags and templates. |
| **Quiz mode** | SM-2 scheduling with confidence-ladder ratings. |
| **JD skill mapper** | Paste a job description; a dictionary-based keyword extractor pulls known skill keywords and Precept scores them against your skills inventory by exact name match. |
| **Pipeline tracker** | Kanban and list views, six statuses with event history, follow-up dates, resume version label and notes per application. Soft delete with API restore. |
| **Skills matrix** | Skills with name, category, proficiency and notes; feeds the JD match. |
| **Technical readiness** | Radar chart of proficiency per skill category plus gaps from saved job descriptions. |
| **Dashboard** | Story confidence breakdown, applications by status, response and rejection rates, average JD match score. |
| **AI mock interviews** | Question generation and answer feedback through a provider-agnostic LLM client (OpenAI, Anthropic and Gemini clients, plus OpenAI-compatible endpoints such as Groq, DeepSeek and Ollama). Speech-to-text runs in the browser; audio is not uploaded. |
| **Daily digest email** | Due reviews and follow-ups by email through Resend, with SMTP as a fallback. |
| **Job capture** | Bookmarklet that sends a posting URL to the API, which fetches the page and drafts an application. |
| **Search** | Text search (case-insensitive `ILIKE`) over applications, technical stories and skills. |
| **Data export** | `GET /api/dashboard/export` returns your data as JSON. |
| **Demo mode** | Each visitor gets their own seeded demo account that is deleted after 24 hours. Mock interviews in the demo return labelled sample responses; no AI provider is called. |
| **Testimonials** | Signed-in users can submit testimonials; an admin approves them for the landing page. |

Endpoints require authentication and are scoped to the signed-in user through EF Core global query filters.

---

## Architecture at a glance

```
Precept.Web  →  Vite + React 19 + TypeScript + Tailwind v4
      ↓
   nginx (production) / Vite dev server (development)
      ↓
Precept.Api  →  ASP.NET Core 10 + EF Core 10 + PostgreSQL
```

### Tech stack

| Layer | Technology |
|-------|------------|
| **Backend** | ASP.NET Core 10, EF Core 10, Npgsql, ASP.NET Core Identity cookie authentication, `System.Threading.RateLimiting`, Serilog, Scalar |
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind v4, GSAP, Framer Motion, Recharts, lenis, lucide-react, React Router 7 |
| **Database** | PostgreSQL 16 in `docker-compose.yml` (`docker-compose.gcp.yml` uses 18), EF Core migrations in source control |
| **Tests** | xUnit, FluentAssertions, NSubstitute, Testcontainers PostgreSQL (136 backend test cases as of 2026-10-03; no frontend tests yet) |
| **CI** | GitHub Actions: build, test, vulnerable-package scan, `npm audit`, frontend type check |
| **Deployment** | Multi-stage Dockerfiles and Docker Compose; a GitHub Actions workflow deploys the API to Google Cloud Run |

---

## Security posture

- **Sessions**: ASP.NET Core Identity cookie authentication. The `precept_auth` cookie is `HttpOnly`, `Secure` and `SameSite=Strict` in production, with a 14-day sliding expiration.
- **Sign out everywhere**: rotating the Identity security stamp invalidates every existing cookie for the user.
- **CSRF**: `SameSite=Strict`, plus a required `X-Requested-With` header on mutating `/api` requests.
- **Passwords**: ASP.NET Core Identity hashing; 5 failed attempts lock the account for 15 minutes.
- **Rate limiting**: an `auth` policy (10 requests per minute) and a `general` policy (100 per minute). Both are currently single global buckets, not per user or per IP.
- **Tenant isolation**: global EF Core query filters limit every query to the signed-in user's rows.
- **CORS and headers**: environment-gated CORS and security headers on every response.

Known gaps are tracked as milestone M1 in [`docs/plan/PRECEPT_PLAN.md`](docs/plan/PRECEPT_PLAN.md). The earlier JWT and refresh-token design is kept for history in [`docs/archive/auth_reuse_detection_cascade_revocation.md`](docs/archive/auth_reuse_detection_cascade_revocation.md).

---

## Roadmap

See [`docs/plan/PRECEPT_PLAN.md`](docs/plan/PRECEPT_PLAN.md). In short: fix security and integrity issues, deploy privately, then build structured stories with review history, a requirements-to-evidence opportunity workspace, grounded mock interviews and an interview debrief loop, followed by billing and a public launch.

---

## Get started

```bash
git clone https://github.com/austinchima/Precept.git
cd Precept
cp .env.example .env
docker compose up -d --build
```

- Web: http://localhost
- API: http://localhost:8080
- API health: http://localhost:8080/api/health

For local development with hot reload, see `README.md`.

---

## License

MIT. See [LICENSE](LICENSE).
