# Precept — Landing Page Redesign PRD

## Original problem statement
Redesign the landing page for github.com/austinchima/Precept as if it were a $20k client engagement marketing a SaaS. The redesign must be grounded in what the product actually does — "Precept is the Career OS for software engineers."

## Repo & stack (existing)
- Repo: github.com/austinchima/Precept
- Frontend: `Precept.Web/` — React 19 + TypeScript + Vite + TailwindCSS v4 + GSAP + Framer Motion + Recharts
- Backend: `Precept.Api/` — ASP.NET Core 10 / EF Core / PostgreSQL (untouched)
- Landing entrypoint: `Precept.Web/src/pages/Landing.tsx`

## Brand & voice (from client brief)
- Tagline: "Your Job Hunt, Reimagined"
- Voice: precise, calm-under-pressure, confident, not hypey. "Built by developers, for developers."
- Visual: dark-mode IDE/command-center, teal primary `#2dd4bf`, violet secondary `#8b5cf6`
- Audience: software engineers (new grads + working) job-hunting
- The wedge: not just a tracker — also makes you interview-ready via story banks + Quiz Mode drilling
- Signature concept: **Confidence Ladder** — Panic → Shaky → Okay → Solid → Can Teach

## Personas
1. **New grad SWE** with no internship experience — needs structure
2. **Working engineer** juggling 20+ applications — drowning in tabs/spreadsheets

## What's been implemented (Jun 28, 2026)
- **Total rewrite** of `Precept.Web/src/pages/Landing.tsx` (~1100 lines) grounded in client brief
- **New editorial typography**: added Bricolage Grotesque (display, tight-tracked) + Instrument Serif italic (emphasis) — fonts loaded in `index.html`, utilities (`.font-display`, `.font-editorial`) wired in `index.css`
- **Custom CSS utilities**: dot grid background, film grain overlay, marquee animation, IDE blinking caret, ladder shadow cycle (`/src/index.css`)
- **Sections shipped** (in order):
  1. Sticky **Navbar** with scroll-aware glass, mobile sheet
  2. **Hero** — editorial headline ("Turn interview *panic* into *confidence*") + live component-built command-center mockup (story card with confidence ladder + pipeline + due-for-review)
  3. **Marquee** ticker (proof + value props)
  4. **Wedge** — 3-column comparison: Spreadsheets vs Trackers (Teal/Huntr) vs Precept
  5. **Modules** — asymmetric bento with real UI fragments: Story Bank, STAR Bank, JD Analyzer (gap list), Pipeline (5-stage stats), Analytics (bar chart), Skills Matrix, Trajectory Scanner
  6. **Confidence Ladder** signature section — interactive 5-rung visualization with hover-driven copy swap
  7. **How It Works** — Capture → Analyze → Convert with connector arrows
  8. **Testimonials** — pulls from `/api/testimonial/public` with graceful fallback
  9. **R2 AI Teaser** — chat mockup + score panel
  10. **Final CTA** — pill button + GitHub secondary + trust strip
  11. **Footer** — 4-col layout with status indicators

## What was preserved
- Routing in `App.tsx` (untouched)
- AuthContext / `api` helper (untouched)
- All other pages (Dashboard, StoryBank, QuizMode, etc.) untouched
- Testimonial API endpoint (`/api/testimonial/public`) — backwards compatible

## Dependencies
- Added `react-is@^19` — required peer dep for `recharts` to enable Vite dev server boot (was failing on resolve)

## Verification
- ✅ `npx tsc --noEmit` exit 0 (clean TS compilation)
- ✅ Visual screenshots across 9 sections (hero, wedge, modules, ladder, how, R2, testimonials, marquee, footer)
- ✅ Hot reload working on Vite dev server
- ⚠️ ESLint advisory warnings on `react/no-unescaped-entities` (apostrophes/quotes) — render fine, project has no enforcing ESLint config

## Backlog / next iterations
- **P1**: Test all CTAs link correctly to `/login?mode=signup` end-to-end via auth flow
- **P1**: Optimize loading — preload critical fonts, consider extracting hero mockup
- **P2**: Add light theme toggle for the landing (brief mentions varying themes is good design hygiene)
- **P2**: Replace static testimonials with carousel if more than 3 approved
- **P2**: Wire the magnetic-button effect on more CTAs (already on primary)
- **P3**: A/B test the "Turn panic into confidence" hero vs the previous "Your Job Hunt, Reimagined"
- **P3**: Add OG/social meta tags + structured data for SEO

## Smart enhancement (conversion lever)
The hero's tech-credibility bar surfaces .NET/React/Postgres/Docker stack. **Consider adding a one-click "Run in Docker" snippet directly under the GitHub CTA in the hero** — for a developer audience, the friction-free "git clone && docker compose up" path is a stronger conversion signal than any marketing copy. The `docker-compose.yml` is already in the repo; a single-line `curl | bash` quickstart would do real work for new-grad self-hosters who want to see Precept before signing up.
