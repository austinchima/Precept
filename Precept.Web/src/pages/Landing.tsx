import { useState, useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, Check, Menu, X, Quote, Sparkles,
  Mic, RefreshCw, FileCode2, GitBranch, FileSearch, Layers,
  Terminal, Activity, Hash, Star, ChevronDown,
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import type { Testimonial } from "../types";
import PageTransition from "../components/ui/PageTransition";
import { gsap, useGSAP, prefersReducedMotion } from "../lib/animations";
import { AnimatedSection } from "../components/animation/AnimatedSection";
import { SmoothScroll } from "../components/animation/SmoothScroll";

/* ─────────────────────────── DESIGN TOKENS ─────────────────────────── */

const c = {
  bg0:    "#02050A",          // deep slate-black
  bg1:    "#06090F",
  bg2:    "#0B0F17",
  bg3:    "#11161F",
  ink:    "#E6EBF2",
  inkDim: "#9CA8B8",
  inkMute:"#5A6678",
  hair:   "rgba(255,255,255,0.07)",
  hair2:  "rgba(255,255,255,0.12)",
  teal:   "#2dd4bf",
  tealDim:"rgba(45,212,191,0.14)",
  violet: "#8b5cf6",
  // Confidence ladder
  rose:   "#f43f5e",
  amber:  "#f59e0b",
  sky:    "#38bdf8",
  emerald:"#10b981",
} as const;

/* ─────────────────────────── PRIMITIVE: PILL ─────────────────────────── */

function Eyebrow({ children, color = c.teal }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em]"
      style={{
        background: `${color}14`,
        border: `1px solid ${color}33`,
        color,
      }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      {children}
    </span>
  );
}

/* ─────────────────────────── NAVBAR ─────────────────────────── */

function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Wedge", href: "#wedge" },
    { label: "Modules", href: "#modules" },
    { label: "Confidence", href: "#ladder" },
    { label: "How it works", href: "#how" },
    { label: "Roadmap", href: "#r2" },
  ];

  const goLogin = (mode?: "signup") => {
    navigate("/login", mode === "signup" ? { state: { mode: "signup" } } : undefined);
    setMobileOpen(false);
  };

  return (
    <>
      <nav
        data-testid="landing-nav"
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? "rgba(6,9,15,0.72)" : "transparent",
          backdropFilter: scrolled ? "blur(18px) saturate(160%)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(18px) saturate(160%)" : "none",
          borderBottom: scrolled ? `1px solid ${c.hair}` : "1px solid transparent",
        }}
      >
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
          {/* Wordmark */}
          <a href="/" className="flex items-center gap-2 no-underline" data-testid="landing-logo">
            <span
              className="grid h-7 w-7 place-items-center rounded-md"
              style={{
                background: `linear-gradient(135deg, ${c.teal} 0%, ${c.violet} 100%)`,
                boxShadow: `0 0 18px ${c.tealDim}`,
              }}
            >
              <span className="font-display text-[15px] font-bold leading-none" style={{ color: c.bg0 }}>P</span>
            </span>
            <span className="font-display text-[18px] font-bold tracking-tight" style={{ color: c.ink }}>
              Precept
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-widest sm:inline" style={{ color: c.inkMute }}>
              ─ Career&nbsp;OS
            </span>
          </a>

          {/* Center Links */}
          <div className="hidden items-center gap-7 md:flex">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="font-mono text-[12px] uppercase tracking-[0.14em] transition-colors"
                style={{ color: c.inkDim }}
                onMouseEnter={(e) => (e.currentTarget.style.color = c.ink)}
                onMouseLeave={(e) => (e.currentTarget.style.color = c.inkDim)}
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Right CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <a
              href="https://github.com/austinchima/Precept"
              target="_blank"
              rel="noreferrer"
              data-testid="nav-github-link"
              className="flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.14em] transition-colors"
              style={{ color: c.inkDim }}
              onMouseEnter={(e) => (e.currentTarget.style.color = c.ink)}
              onMouseLeave={(e) => (e.currentTarget.style.color = c.inkDim)}
            >
              <i className="fa-brands fa-github" /> GitHub
            </a>
            <button
              data-testid="nav-signin-btn"
              onClick={() => goLogin()}
              className="font-mono text-[12px] uppercase tracking-[0.14em] transition-colors"
              style={{ color: c.inkDim }}
            >
              Sign in
            </button>
            <button
              data-testid="nav-cta-btn"
              onClick={() => goLogin("signup")}
              className="gsap-magnetic group relative overflow-hidden rounded-full px-4 py-2 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] transition-all"
              style={{
                background: c.ink,
                color: c.bg0,
                boxShadow: `0 0 0 1px ${c.ink}, 0 8px 24px -8px rgba(255,255,255,0.18)`,
              }}
            >
              Get started <ArrowUpRight className="ml-1 inline -translate-y-px" size={12} />
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            data-testid="mobile-menu-toggle"
            className="flex h-9 w-9 items-center justify-center rounded-md md:hidden"
            style={{ color: c.ink, background: c.hair }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile sheet */}
      {mobileOpen && (
        <div
          data-testid="mobile-menu"
          className="fixed inset-0 z-40 flex flex-col items-start gap-8 px-8 pt-24 md:hidden"
          style={{ background: "rgba(2,5,10,0.96)", backdropFilter: "blur(24px)" }}
        >
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="font-display text-3xl font-bold"
              style={{ color: c.ink }}
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <button
            onClick={() => goLogin("signup")}
            className="mt-auto mb-12 w-full rounded-full px-6 py-3 font-mono text-sm uppercase tracking-widest"
            style={{ background: c.ink, color: c.bg0 }}
          >
            Get started free →
          </button>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────── HERO ─────────────────────────── */

const ConfidenceRungs = [
  { key: "Panic",    label: "Panic",    color: c.rose,    pct: 18 },
  { key: "Shaky",    label: "Shaky",    color: c.amber,   pct: 36 },
  { key: "Okay",     label: "Okay",     color: c.sky,     pct: 56 },
  { key: "Solid",    label: "Solid",    color: c.teal,    pct: 80 },
  { key: "CanTeach", label: "Can Teach",color: c.emerald, pct: 100 },
];

function Hero() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement>(null);
  const [activeRung, setActiveRung] = useState(3); // Solid by default

  // cycle the rung in the mockup
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const i = setInterval(() => setActiveRung((r) => (r + 1) % ConfidenceRungs.length), 1800);
    return () => clearInterval(i);
  }, []);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !heroRef.current) return;
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(".hero-eyebrow",   { opacity: 0, y: 16, duration: 0.6 })
          .from(".hero-headline",  { opacity: 0, y: 28, duration: 0.85 }, "-=0.3")
          .from(".hero-sub",       { opacity: 0, y: 22, duration: 0.7 },  "-=0.55")
          .from(".hero-ctas > *",  { opacity: 0, y: 16, duration: 0.55, stagger: 0.08 }, "-=0.45")
          .from(".hero-mock",      { opacity: 0, y: 40, scale: 0.97, duration: 1.0 }, "-=0.4")
          .from(".hero-techbar > *", { opacity: 0, y: 10, duration: 0.5, stagger: 0.05 }, "-=0.5");

        gsap.to(".hero-orb", { y: -22, duration: 5.5, ease: "sine.inOut", repeat: -1, yoyo: true });
      }, heroRef);
      return () => ctx.revert();
    },
    { scope: heroRef }
  );

  return (
    <section
      ref={heroRef}
      data-testid="hero-section"
      className="relative isolate overflow-hidden pt-32 pb-24"
      style={{
        background: c.bg0,
      }}
    >
      {/* dot-grid floor */}
      <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-60" />
      {/* horizon glow */}
      <div
        className="hero-orb pointer-events-none absolute left-1/2 top-[14%] h-[640px] w-[1100px] -translate-x-1/2 rounded-[50%]"
        style={{
          background: `radial-gradient(closest-side, rgba(45,212,191,0.18), rgba(139,92,246,0.10) 45%, transparent 75%)`,
          filter: "blur(4px)",
        }}
      />
      {/* corner accents (IDE-style) */}
      <div className="pointer-events-none absolute left-6 top-24 hidden font-mono text-[10px] uppercase tracking-[0.22em] md:block" style={{ color: c.inkMute }}>
        ~/precept&nbsp;<span className="caret-blink" />
      </div>
      <div className="pointer-events-none absolute right-6 top-24 hidden font-mono text-[10px] tracking-[0.18em] md:block" style={{ color: c.inkMute }}>
        v1.0 · R1 shipped · R2 incoming
      </div>

      <div className="relative mx-auto max-w-[1200px] px-6">
        {/* Eyebrow */}
        <div className="hero-eyebrow flex justify-center">
          <Eyebrow color={c.teal}>The Career OS for software engineers</Eyebrow>
        </div>

        {/* Headline */}
        <h1
          className="hero-headline mx-auto mt-7 max-w-[960px] text-center font-display font-bold leading-[1.02]"
          style={{ fontSize: "clamp(44px, 7.2vw, 88px)", color: c.ink, letterSpacing: "-0.03em" }}
        >
          Turn interview <span className="font-editorial" style={{ color: c.teal, fontWeight: 400 }}>panic</span>
          <br className="hidden sm:block" />
          {" "}into{" "}
          <span className="relative">
            <span className="font-editorial" style={{ color: c.emerald, fontWeight: 400 }}>confidence.</span>
            <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" preserveAspectRatio="none" aria-hidden="true">
              <path d="M2,7 Q75,1 150,5 T298,4" stroke={c.emerald} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.6" />
            </svg>
          </span>
        </h1>

        {/* Sub */}
        <p
          className="hero-sub mx-auto mt-7 max-w-[620px] text-center font-body text-[17px] leading-[1.55]"
          style={{ color: c.inkDim }}
        >
          Precept is the command center where engineers bank their interview stories, drill them with spaced repetition,
          and run the whole job pipeline like a project — not a graveyard of browser tabs.
        </p>

        {/* CTAs */}
        <div className="hero-ctas mt-9 flex flex-wrap items-center justify-center gap-3">
          <button
            data-testid="hero-primary-cta"
            onClick={() => navigate("/login", { state: { mode: "signup" } })}
            className="gsap-magnetic group inline-flex items-center gap-2 rounded-full px-6 py-3.5 font-mono text-[12.5px] font-semibold uppercase tracking-[0.16em] transition-transform"
            style={{
              background: c.ink,
              color: c.bg0,
              boxShadow: `0 0 0 1px ${c.ink}, 0 18px 60px -20px rgba(45,212,191,0.5)`,
            }}
          >
            Get started — free
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </button>
          <a
            data-testid="hero-github-cta"
            href="https://github.com/austinchima/Precept"
            target="_blank"
            rel="noreferrer"
            className="gsap-magnetic inline-flex items-center gap-2 rounded-full border px-6 py-3.5 font-mono text-[12.5px] font-semibold uppercase tracking-[0.16em] transition-colors"
            style={{
              background: "rgba(255,255,255,0.025)",
              borderColor: c.hair2,
              color: c.ink,
              backdropFilter: "blur(8px)",
            }}
          >
            <i className="fa-brands fa-github" /> View on GitHub
          </a>
        </div>

        {/* tech credibility */}
        <div className="hero-techbar mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: c.inkMute }}>
          <span>Open source · MIT</span>
          <span className="opacity-30">/</span>
          <span><i className="devicon-dot-net-plain colored mr-1" />.NET 10</span>
          <span className="opacity-30">/</span>
          <span><i className="devicon-react-original colored mr-1" />React 19</span>
          <span className="opacity-30">/</span>
          <span><i className="devicon-postgresql-plain colored mr-1" />PostgreSQL</span>
          <span className="opacity-30">/</span>
          <span><i className="devicon-typescript-plain colored mr-1" />TypeScript</span>
          <span className="opacity-30">/</span>
          <span><i className="devicon-docker-plain colored mr-1" />Docker</span>
        </div>

        {/* HERO MOCKUP — live command center */}
        <div
          className="hero-mock relative mx-auto mt-16 w-full max-w-[1080px] rounded-2xl"
          style={{
            background: `linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)`,
            border: `1px solid ${c.hair2}`,
            boxShadow: `0 60px 120px -40px rgba(45,212,191,0.25), inset 0 1px 0 rgba(255,255,255,0.06)`,
            backdropFilter: "blur(20px) saturate(140%)",
          }}
        >
          {/* window chrome */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${c.hair}` }}>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#febc2e" }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28c840" }} />
            </div>
            <div
              className="hidden items-center gap-2 rounded-md px-3 py-1 font-mono text-[10.5px] sm:flex"
              style={{ background: c.bg2, color: c.inkMute, border: `1px solid ${c.hair}` }}
            >
              <Terminal size={11} /> precept · ~/career
            </div>
            <div className="font-mono text-[10.5px]" style={{ color: c.inkMute }}>
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ background: c.emerald }} />
              live
            </div>
          </div>

          {/* mockup body grid */}
          <div className="grid grid-cols-12 gap-3 p-3 md:gap-4 md:p-5" style={{ background: c.bg1 }}>
            {/* sidebar */}
            <aside className="col-span-12 hidden flex-col gap-1 rounded-xl p-3 md:col-span-2 md:flex" style={{ background: c.bg2, border: `1px solid ${c.hair}` }}>
              {[
                { i: <Layers size={14} />, l: "Dashboard" },
                { i: <FileCode2 size={14} />, l: "Story Bank", active: true },
                { i: <RefreshCw size={14} />, l: "Quiz Mode" },
                { i: <FileSearch size={14} />, l: "JD Matcher" },
                { i: <GitBranch size={14} />, l: "Pipeline" },
                { i: <Activity size={14} />, l: "Analytics" },
              ].map((it) => (
                <div
                  key={it.l}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 font-mono text-[11px]"
                  style={{
                    background: it.active ? c.tealDim : "transparent",
                    color: it.active ? c.teal : c.inkDim,
                  }}
                >
                  {it.i} <span className="truncate">{it.l}</span>
                </div>
              ))}
              <div className="mt-2 pt-2 font-mono text-[10px] uppercase tracking-widest" style={{ color: c.inkMute, borderTop: `1px solid ${c.hair}` }}>
                Streak · 12d
              </div>
            </aside>

            {/* center: story card */}
            <div className="col-span-12 rounded-xl md:col-span-6" style={{ background: c.bg2, border: `1px solid ${c.hair}` }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${c.hair}` }}>
                <div className="flex items-center gap-2 font-mono text-[11px]" style={{ color: c.inkDim }}>
                  <Hash size={12} style={{ color: c.teal }} /> Story · <span style={{ color: c.ink }}>Auth/JWT-Rotation</span>
                </div>
                <div className="rounded-full px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider" style={{ background: `${c.violet}22`, color: c.violet, border: `1px solid ${c.violet}33` }}>
                  Security
                </div>
              </div>
              <div className="px-4 py-4">
                <h3 className="font-display text-[17px] font-semibold" style={{ color: c.ink }}>
                  Refresh-token reuse detection with cascade revocation
                </h3>
                <p className="mt-1.5 font-body text-[12.5px] leading-relaxed" style={{ color: c.inkDim }}>
                  SHA-256-hashed refresh tokens in HttpOnly cookies. On reuse of a revoked token, the entire lineage of
                  sessions is revoked atomically with an optimistic-concurrency guard.
                </p>
                {/* code snippet */}
                <pre
                  className="mt-3 overflow-hidden rounded-lg p-3 font-mono text-[11px] leading-[1.55]"
                  style={{ background: c.bg0, color: c.inkDim, border: `1px solid ${c.hair}` }}
                >
<span style={{ color: c.violet }}>if</span> (token.IsRevoked) {"{"}
{"  "}<span style={{ color: c.teal }}>await</span> _sessions.RevokeLineageAsync(token.LineageId);
{"  "}<span style={{ color: c.rose }}>throw new</span> SecurityException(<span style={{ color: c.amber }}>"reuse"</span>);
{"}"}
                </pre>

                {/* confidence ladder live */}
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: c.inkMute }}>
                      Confidence
                    </span>
                    <span
                      className="font-mono text-[11px]"
                      style={{ color: ConfidenceRungs[activeRung].color }}
                    >
                      {ConfidenceRungs[activeRung].label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    {ConfidenceRungs.map((r, i) => (
                      <div
                        key={r.key}
                        className="h-1.5 flex-1 rounded-full transition-all duration-500"
                        style={{
                          background: i <= activeRung ? r.color : c.hair,
                          boxShadow: i === activeRung ? `0 0 12px ${r.color}` : "none",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* right: pipeline kanban */}
            <div className="col-span-12 grid grid-cols-2 gap-3 md:col-span-4 md:grid-cols-1">
              <div className="rounded-xl p-3" style={{ background: c.bg2, border: `1px solid ${c.hair}` }}>
                <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-wider" style={{ color: c.inkDim }}>
                  <span>Pipeline</span>
                  <span style={{ color: c.teal }}>28 active</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {[
                    { co: "Stripe",   role: "Senior Backend",   st: "Phone Screen", color: c.sky },
                    { co: "Linear",   role: "Full-Stack Eng",   st: "Interviewing", color: c.amber },
                    { co: "Vercel",   role: "Platform Eng",     st: "Offer",        color: c.emerald },
                  ].map((a) => (
                    <div key={a.co} className="flex items-center justify-between rounded-md px-2 py-2" style={{ background: c.bg1, border: `1px solid ${c.hair}` }}>
                      <div>
                        <div className="font-body text-[12px] font-semibold" style={{ color: c.ink }}>{a.co}</div>
                        <div className="font-mono text-[10px]" style={{ color: c.inkMute }}>{a.role}</div>
                      </div>
                      <span
                        className="rounded-full px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider"
                        style={{ background: `${a.color}1c`, color: a.color, border: `1px solid ${a.color}33` }}
                      >
                        {a.st}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-3" style={{ background: c.bg2, border: `1px solid ${c.hair}` }}>
                <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-wider" style={{ color: c.inkDim }}>
                  <span>Due for review</span>
                  <span style={{ color: c.amber }}>3</span>
                </div>
                <div className="mt-2 space-y-1">
                  {["System Design / Sharding", "DevOps / K8s rollout", "Behavioral / Conflict"].map((t) => (
                    <div key={t} className="flex items-center gap-2 font-mono text-[10.5px]" style={{ color: c.inkDim }}>
                      <RefreshCw size={11} style={{ color: c.amber }} /> <span className="truncate">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* scroll hint */}
      <div className="relative mx-auto mt-10 flex justify-center" style={{ color: c.inkMute }}>
        <ChevronDown size={20} className="animate-bounce opacity-60" />
      </div>
    </section>
  );
}

/* ─────────────────────────── MARQUEE (logos / proof ticker) ─────────────────────────── */

function Marquee() {
  const items = [
    "“Replaced 3 spreadsheets + a Notion doc.”",
    "Spaced repetition for your career",
    "“I rehearsed STAR until I knew them cold.”",
    "Open source · MIT",
    "“Pipeline view killed my tab graveyard.”",
    "Built for engineers, by engineers",
    "“Walked into the round without freezing.”",
    "Self-host or hosted — your call",
  ];
  const loop = [...items, ...items];

  return (
    <section
      className="relative overflow-hidden border-y py-5"
      style={{
        background: c.bg1,
        borderColor: c.hair,
      }}
      data-testid="marquee-section"
    >
      <div className="marquee-track flex whitespace-nowrap gap-12">
        {loop.map((it, i) => (
          <span
            key={i}
            className="flex items-center gap-12 font-mono text-[12px] uppercase tracking-[0.18em]"
            style={{ color: i % 2 === 0 ? c.inkDim : c.inkMute }}
          >
            {it}
            <span style={{ color: c.teal, opacity: 0.55 }}>◇</span>
          </span>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────── WEDGE — vs trackers ─────────────────────────── */

function Wedge() {
  return (
    <section
      id="wedge"
      data-testid="wedge-section"
      className="relative overflow-hidden py-32"
      style={{ background: c.bg0 }}
    >
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="flex flex-col items-center text-center">
          <Eyebrow color={c.violet}>The wedge</Eyebrow>
          <h2
            className="mt-5 max-w-[860px] font-display font-bold leading-[1.05]"
            style={{ fontSize: "clamp(34px, 5.2vw, 60px)", color: c.ink }}
          >
            Other tools track applications. Precept also <span className="font-editorial" style={{ color: c.teal, fontWeight: 400 }}>makes you interview-ready.</span>
          </h2>
          <p className="mt-5 max-w-[640px] font-body text-[16px] leading-relaxed" style={{ color: c.inkDim }}>
            Trackers tell you <em>where</em> your applications are. Precept tells you <em>whether you're ready</em> for what comes next — by banking your stories and drilling them until recall is automatic.
          </p>
        </div>

        {/* comparison grid */}
        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Spreadsheet */}
          <div
            className="rounded-2xl p-7"
            style={{
              background: c.bg1,
              border: `1px solid ${c.hair}`,
              filter: "saturate(0.6)",
            }}
          >
            <div className="font-mono text-[10.5px] uppercase tracking-widest" style={{ color: c.inkMute }}>
              The spreadsheet
            </div>
            <div className="mt-1 font-display text-[22px] font-semibold" style={{ color: c.inkDim }}>
              Google Sheets &amp; tabs
            </div>
            <ul className="mt-6 space-y-3 font-body text-[13.5px]" style={{ color: c.inkMute }}>
              {["Status columns that go stale", "STAR stories in a side doc", "No drill, no recall, no rehearsal", "Tabs everywhere", "You freeze in the room"].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <X size={14} className="mt-0.5 flex-shrink-0" style={{ color: c.rose }} /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Trackers */}
          <div
            className="rounded-2xl p-7"
            style={{
              background: c.bg1,
              border: `1px solid ${c.hair}`,
            }}
          >
            <div className="font-mono text-[10.5px] uppercase tracking-widest" style={{ color: c.inkMute }}>
              Job trackers
            </div>
            <div className="mt-1 font-display text-[22px] font-semibold" style={{ color: c.inkDim }}>
              Teal · Huntr · Simplify
            </div>
            <ul className="mt-6 space-y-3 font-body text-[13.5px]" style={{ color: c.inkDim }}>
              <li className="flex items-start gap-2"><Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: c.emerald }} /> Pipeline tracking</li>
              <li className="flex items-start gap-2"><Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: c.emerald }} /> Application reminders</li>
              <li className="flex items-start gap-2"><X size={14} className="mt-0.5 flex-shrink-0" style={{ color: c.rose }} /> No technical story bank</li>
              <li className="flex items-start gap-2"><X size={14} className="mt-0.5 flex-shrink-0" style={{ color: c.rose }} /> No drilling / recall practice</li>
              <li className="flex items-start gap-2"><X size={14} className="mt-0.5 flex-shrink-0" style={{ color: c.rose }} /> Not built for engineers</li>
            </ul>
          </div>

          {/* Precept */}
          <div
            className="relative overflow-hidden rounded-2xl p-7"
            style={{
              background: `linear-gradient(160deg, ${c.bg1} 0%, ${c.bg2} 100%)`,
              border: `1px solid ${c.teal}66`,
              boxShadow: `0 0 0 1px ${c.tealDim}, 0 30px 80px -30px rgba(45,212,191,0.35)`,
            }}
          >
            <div
              className="absolute -right-12 -top-12 h-44 w-44 rounded-full"
              style={{ background: `radial-gradient(circle, ${c.tealDim}, transparent 70%)`, filter: "blur(4px)" }}
            />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10.5px] uppercase tracking-widest" style={{ color: c.teal }}>
                  Precept
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: c.emerald }}>
                  Career OS
                </span>
              </div>
              <div className="mt-1 font-display text-[22px] font-semibold" style={{ color: c.ink }}>
                Track + drill + close the loop
              </div>
              <ul className="mt-6 space-y-3 font-body text-[13.5px]" style={{ color: c.ink }}>
                {[
                  "Full pipeline tracker with event history",
                  "Technical & behavioral story banks",
                  "Spaced-repetition Quiz Mode (Panic → Can Teach)",
                  "JD Matcher: paste a JD, see your gaps",
                  "Voice practice + analytics + skills matrix",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: c.teal }} /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── MODULES — feature grid w/ real fragments ─────────────────────────── */

function Modules() {
  return (
    <section
      id="modules"
      data-testid="modules-section"
      className="relative overflow-hidden py-32"
      style={{
        background: `radial-gradient(ellipse 60% 50% at 80% 0%, rgba(139,92,246,0.10), transparent 55%), ${c.bg0}`,
      }}
    >
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="flex flex-col items-end text-right">
          <Eyebrow color={c.teal}>The modules</Eyebrow>
          <h2
            className="mt-5 max-w-[760px] font-display font-bold leading-[1.05]"
            style={{ fontSize: "clamp(32px, 4.6vw, 56px)", color: c.ink }}
          >
            Seven instruments, <span className="font-editorial" style={{ color: c.violet, fontWeight: 400 }}>one cockpit.</span>
          </h2>
          <p className="mt-4 max-w-[560px] font-body text-[15.5px] leading-relaxed" style={{ color: c.inkDim }}>
            Every module is wired into the next — your stories feed the quiz, the quiz updates your confidence, the JD analyzer pulls from both.
          </p>
        </div>

        <AnimatedSection
          animation="staggerFadeUp"
          childSelector=".mod-card"
          stagger={0.08}
          className="mt-14 grid grid-cols-12 gap-4"
        >
          {/* 1. Technical Story Bank (large) */}
          <div className="mod-card col-span-12 rounded-2xl p-6 lg:col-span-7" style={modCardStyle()}>
            <ModuleHeader index="01" title="Technical Story Bank" color={c.teal} />
            <p className="mt-3 max-w-[460px] font-body text-[14px]" style={{ color: c.inkDim }}>
              Catalog what you've actually built — title, snippet, explanation — tagged across 12 engineering domains, each with a live confidence rating.
            </p>
            {/* tag cloud */}
            <div className="mt-5 flex flex-wrap gap-1.5">
              {["Auth","Database","AI/ML","DevOps","Frontend","Backend","System Design","Security","Testing","Cloud","Architecture"].map((t) => (
                <span
                  key={t}
                  className="rounded-md px-2 py-1 font-mono text-[10.5px]"
                  style={{
                    background: c.bg2,
                    color: c.inkDim,
                    border: `1px solid ${c.hair}`,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
            {/* mini story rows */}
            <div className="mt-5 space-y-2">
              {[
                { title: "Postgres row-level security w/ tenant claims", cat: "Database", conf: "Solid", color: c.teal },
                { title: "Redis-backed rate limiter (sliding log)", cat: "Backend", conf: "Okay", color: c.sky },
                { title: "Vector embeddings for semantic JD match", cat: "AI/ML", conf: "Shaky", color: c.amber },
              ].map((s) => (
                <div key={s.title} className="flex items-center justify-between rounded-md px-3 py-2.5" style={{ background: c.bg2, border: `1px solid ${c.hair}` }}>
                  <div className="min-w-0">
                    <div className="truncate font-body text-[13px]" style={{ color: c.ink }}>{s.title}</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: c.inkMute }}>{s.cat}</div>
                  </div>
                  <span className="rounded-full px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-widest" style={{ background: `${s.color}1c`, color: s.color, border: `1px solid ${s.color}44` }}>
                    {s.conf}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Behavioral Story Bank */}
          <div className="mod-card col-span-12 rounded-2xl p-6 sm:col-span-6 lg:col-span-5" style={modCardStyle()}>
            <ModuleHeader index="02" title="Behavioral Story Bank" color={c.violet} />
            <p className="mt-3 font-body text-[14px]" style={{ color: c.inkDim }}>
              Structured STAR narratives so you never blank in a behavioral round.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 font-mono text-[10.5px]">
              {[
                { l: "Situation", v: "On-call rotation, prod down" },
                { l: "Task",      v: "Triage and restore SLA" },
                { l: "Action",    v: "Rolled back, paged team" },
                { l: "Result",    v: "MTTR cut 38%" },
              ].map((r) => (
                <div key={r.l} className="rounded-md p-2.5" style={{ background: c.bg2, border: `1px solid ${c.hair}` }}>
                  <div className="uppercase tracking-widest" style={{ color: c.violet }}>{r.l}</div>
                  <div className="mt-1 font-body text-[12.5px] leading-snug" style={{ color: c.ink }}>{r.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. JD Matcher */}
          <div className="mod-card col-span-12 rounded-2xl p-6 sm:col-span-6 lg:col-span-5" style={modCardStyle()}>
            <ModuleHeader index="03" title="JD Analyzer" color={c.sky} />
            <p className="mt-3 font-body text-[14px]" style={{ color: c.inkDim }}>
              Paste a job description. Precept maps requirements against your inventory and surfaces gaps.
            </p>
            <div className="mt-5 space-y-1.5 font-mono text-[11px]">
              {[
                { skill: "Go",                cov: true,  note: "3 stories" },
                { skill: "Kubernetes",        cov: true,  note: "2 stories" },
                { skill: "Distributed locks", cov: false, note: "no coverage" },
                { skill: "gRPC",              cov: false, note: "no coverage" },
                { skill: "SRE on-call",       cov: true,  note: "1 story" },
              ].map((g) => (
                <div key={g.skill} className="flex items-center justify-between rounded-md px-3 py-1.5" style={{ background: c.bg2, border: `1px solid ${c.hair}` }}>
                  <span style={{ color: c.ink }}>{g.skill}</span>
                  <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest" style={{ color: g.cov ? c.emerald : c.rose }}>
                    {g.note} {g.cov ? <Check size={11} /> : <X size={11} />}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 font-mono text-[10px] uppercase tracking-widest">
                <span style={{ color: c.inkMute }}>Coverage</span>
                <span style={{ color: c.teal }}>62%</span>
              </div>
            </div>
          </div>

          {/* 4. Pipeline */}
          <div className="mod-card col-span-12 rounded-2xl p-6 lg:col-span-7" style={modCardStyle()}>
            <ModuleHeader index="04" title="Pipeline Tracker" color={c.emerald} />
            <p className="mt-3 max-w-[480px] font-body text-[14px]" style={{ color: c.inkDim }}>
              Every application moves through five stages with automatic event history. No more "wait, did I hear back?"
            </p>
            <div className="mt-5 grid grid-cols-5 gap-1.5 font-mono text-[10px] uppercase tracking-widest">
              {[
                { l: "Applied",      n: 14, color: c.inkDim },
                { l: "Phone Screen", n: 6,  color: c.sky },
                { l: "Interviewing", n: 5,  color: c.amber },
                { l: "Offer",        n: 2,  color: c.emerald },
                { l: "Ghosted",      n: 3,  color: c.inkMute },
              ].map((s) => (
                <div key={s.l} className="rounded-md p-3 text-center" style={{ background: c.bg2, border: `1px solid ${c.hair}` }}>
                  <div className="font-display text-[26px] font-bold" style={{ color: s.color }}>{s.n}</div>
                  <div className="mt-0.5" style={{ color: c.inkMute }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Analytics */}
          <div className="mod-card col-span-12 rounded-2xl p-6 sm:col-span-6 lg:col-span-4" style={modCardStyle()}>
            <ModuleHeader index="05" title="Analytics" color={c.amber} />
            <p className="mt-3 font-body text-[14px]" style={{ color: c.inkDim }}>
              Conversion, pipeline health, and trajectory at a glance.
            </p>
            <div className="mt-5 flex items-end gap-2 h-24">
              {[40, 65, 52, 78, 90, 72, 88].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: i === 4 ? c.amber : c.tealDim, opacity: i === 4 ? 1 : 0.7 }} />
              ))}
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-widest" style={{ color: c.inkMute }}>
              <span>Wk1</span><span>Wk7</span>
            </div>
          </div>

          {/* 6. Skills matrix */}
          <div className="mod-card col-span-12 rounded-2xl p-6 sm:col-span-6 lg:col-span-4" style={modCardStyle()}>
            <ModuleHeader index="06" title="Skills Matrix" color={c.rose} />
            <p className="mt-3 font-body text-[14px]" style={{ color: c.inkDim }}>
              A living inventory of every technical capability you can credibly defend.
            </p>
            <div className="mt-5 space-y-2">
              {[
                { s: "TypeScript", lvl: 92 },
                { s: "PostgreSQL", lvl: 78 },
                { s: "Kubernetes", lvl: 58 },
                { s: "Distributed Systems", lvl: 44 },
              ].map((k) => (
                <div key={k.s}>
                  <div className="flex justify-between font-mono text-[11px]"><span style={{ color: c.ink }}>{k.s}</span><span style={{ color: c.inkMute }}>{k.lvl}%</span></div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full" style={{ background: c.hair }}>
                    <div className="h-full rounded-full" style={{ width: `${k.lvl}%`, background: `linear-gradient(90deg, ${c.teal}, ${c.sky})` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 7. Trajectory Scanner */}
          <div className="mod-card col-span-12 rounded-2xl p-6 sm:col-span-12 lg:col-span-4 overflow-hidden" style={modCardStyle()}>
            <ModuleHeader index="07" title="Trajectory Scanner" color={c.violet} />
            <p className="mt-3 font-body text-[14px]" style={{ color: c.inkDim }}>
              An exact, real-time timeline of every status change across your hunt.
            </p>
            <div className="mt-5 space-y-2">
              {[
                { t: "Today",      ev: "Vercel · Offer received",     color: c.emerald },
                { t: "2d ago",     ev: "Linear · Onsite scheduled",   color: c.amber },
                { t: "5d ago",     ev: "Stripe · Phone screen done",  color: c.sky },
                { t: "1w ago",     ev: "Replit · Applied",            color: c.inkDim },
              ].map((e) => (
                <div key={e.t} className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: e.color, boxShadow: `0 0 6px ${e.color}` }} />
                  <span style={{ color: c.inkMute, width: 56 }}>{e.t}</span>
                  <span style={{ color: c.ink }}>{e.ev}</span>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

function ModuleHeader({ index, title, color }: { index: string; title: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] tracking-[0.18em]" style={{ color: c.inkMute }}>{index}</span>
        <h3 className="font-display text-[18px] font-semibold" style={{ color: c.ink }}>{title}</h3>
      </div>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
    </div>
  );
}

function modCardStyle(): CSSProperties {
  return {
    background: `linear-gradient(180deg, ${c.bg1} 0%, ${c.bg0} 100%)`,
    border: `1px solid ${c.hair}`,
    boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset",
  };
}

/* ─────────────────────────── CONFIDENCE LADDER — signature section ─────────────────────────── */

function ConfidenceLadder() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section
      id="ladder"
      data-testid="ladder-section"
      className="relative overflow-hidden py-32"
      style={{
        background: `radial-gradient(ellipse 70% 50% at 50% 100%, rgba(45,212,191,0.10), transparent 60%), ${c.bg1}`,
      }}
    >
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="grid grid-cols-12 gap-10">
          {/* LEFT — copy */}
          <div className="col-span-12 lg:col-span-5">
            <Eyebrow color={c.emerald}>The hook</Eyebrow>
            <h2
              className="mt-5 font-display font-bold leading-[1.04]"
              style={{ fontSize: "clamp(34px, 5vw, 60px)", color: c.ink }}
            >
              The Confidence <span className="font-editorial" style={{ color: c.teal, fontWeight: 400 }}>Ladder.</span>
            </h2>
            <p className="mt-5 font-body text-[16px] leading-relaxed" style={{ color: c.inkDim }}>
              After every drill, you rate yourself on a 5-rung ladder. Precept's spaced-repetition engine resurfaces the
              right story next — unreviewed first, then your weakest, then whatever you reviewed longest ago.
            </p>
            <p className="mt-4 font-body text-[16px] leading-relaxed" style={{ color: c.inkDim }}>
              It's <span className="font-editorial" style={{ color: c.ink }}>Anki for your career.</span> You walk into the room having already
              rehearsed the answer — out loud, last Thursday.
            </p>

            <div className="mt-7 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: c.inkMute }}>
              <Mic size={13} style={{ color: c.teal }} /> Voice practice supported
            </div>
          </div>

          {/* RIGHT — ladder visual */}
          <div className="col-span-12 lg:col-span-7">
            <div
              className="relative rounded-2xl p-6 md:p-8"
              style={{
                background: `linear-gradient(180deg, ${c.bg2} 0%, ${c.bg1} 100%)`,
                border: `1px solid ${c.hair2}`,
                boxShadow: `0 40px 80px -30px rgba(45,212,191,0.18)`,
              }}
            >
              <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-widest" style={{ color: c.inkMute }}>
                <span>Recall rating</span>
                <span style={{ color: c.teal }}>5 rungs</span>
              </div>

              <div className="mt-6 space-y-3">
                {ConfidenceRungs.map((r, i) => {
                  const isHover = hovered === i;
                  return (
                    <div
                      key={r.key}
                      data-testid={`ladder-rung-${r.key.toLowerCase()}`}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                      className="group relative grid grid-cols-12 items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300 cursor-pointer"
                      style={{
                        background: isHover ? `${r.color}10` : c.bg0,
                        border: `1px solid ${isHover ? r.color + "55" : c.hair}`,
                        boxShadow: isHover ? `0 0 24px -4px ${r.color}88, inset 0 1px 0 ${r.color}22` : "none",
                        transform: isHover ? "translateX(4px)" : "translateX(0)",
                      }}
                    >
                      <div className="col-span-1 font-mono text-[11px]" style={{ color: c.inkMute }}>0{i + 1}</div>
                      <div className="col-span-3 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color, boxShadow: `0 0 10px ${r.color}` }} />
                        <span className="font-display text-[17px] font-semibold" style={{ color: c.ink }}>{r.label}</span>
                      </div>
                      <div className="col-span-6">
                        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: c.hair }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${r.pct}%`, background: r.color, boxShadow: `0 0 12px ${r.color}` }}
                          />
                        </div>
                      </div>
                      <div className="col-span-2 text-right font-mono text-[11px]" style={{ color: r.color }}>
                        {r.pct}%
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* description swap on hover */}
              <div className="mt-6 min-h-[58px] rounded-lg p-4 font-body text-[13.5px] leading-relaxed" style={{ background: c.bg0, border: `1px solid ${c.hair}`, color: c.inkDim }}>
                {hovered === null && (
                  <span><span className="font-mono text-[10.5px] uppercase tracking-widest" style={{ color: c.inkMute }}>Hover &nbsp;→&nbsp;</span> Hover a rung to see how Precept resurfaces stories at each level.</span>
                )}
                {hovered === 0 && <><b style={{ color: c.rose }}>Panic:</b> resurfaced first, every session. You haven't found the words yet.</>}
                {hovered === 1 && <><b style={{ color: c.amber }}>Shaky:</b> resurfaced second. Recall is there but flow breaks under pressure.</>}
                {hovered === 2 && <><b style={{ color: c.sky }}>Okay:</b> reviewed weekly. The structure holds — polish the delivery.</>}
                {hovered === 3 && <><b style={{ color: c.teal }}>Solid:</b> reviewed bi-weekly. You'd ace it tomorrow.</>}
                {hovered === 4 && <><b style={{ color: c.emerald }}>Can Teach:</b> reviewed monthly. You could explain it to a junior — and you have.</>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── HOW IT WORKS ─────────────────────────── */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Capture",
      copy: "Drop your code snippets, write the explanation, and tag the category. Capture STAR stories the same way. Build the bank once.",
      icon: <FileCode2 size={18} />,
      color: c.teal,
    },
    {
      n: "02",
      title: "Analyze",
      copy: "Paste a JD. Precept maps requirements against your inventory and surfaces gaps. Every status change is logged automatically.",
      icon: <FileSearch size={18} />,
      color: c.violet,
    },
    {
      n: "03",
      title: "Convert",
      copy: "Drill weak stories in Quiz Mode. Rate your recall. Walk into the round having already said the answer out loud — last Thursday.",
      icon: <Sparkles size={18} />,
      color: c.emerald,
    },
  ];

  return (
    <section
      id="how"
      data-testid="how-section"
      className="relative overflow-hidden py-32"
      style={{ background: c.bg0 }}
    >
      <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative mx-auto max-w-[1200px] px-6">
        <div className="flex flex-col items-start">
          <Eyebrow color={c.sky}>The loop</Eyebrow>
          <h2
            className="mt-5 max-w-[760px] font-display font-bold leading-[1.05]"
            style={{ fontSize: "clamp(34px, 5vw, 60px)", color: c.ink }}
          >
            Capture. Analyze. <span className="font-editorial" style={{ color: c.emerald, fontWeight: 400 }}>Convert.</span>
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              <div
                className="relative h-full rounded-2xl p-7 transition-transform hover:-translate-y-1"
                style={{
                  background: `linear-gradient(180deg, ${c.bg1}, ${c.bg0})`,
                  border: `1px solid ${c.hair}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="grid h-9 w-9 place-items-center rounded-lg"
                    style={{ background: `${s.color}1c`, color: s.color, border: `1px solid ${s.color}33` }}
                  >
                    {s.icon}
                  </span>
                  <span className="font-mono text-[40px] font-bold leading-none" style={{ color: c.bg3, opacity: 1 }}>
                    {s.n}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-[22px] font-semibold" style={{ color: c.ink }}>
                  {s.title}
                </h3>
                <p className="mt-2 font-body text-[14px] leading-relaxed" style={{ color: c.inkDim }}>
                  {s.copy}
                </p>
              </div>
              {/* connector arrow */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 font-mono" style={{ color: c.inkMute }}>
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── TESTIMONIALS ─────────────────────────── */

function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  const fallback: Testimonial[] = [
    { id: "1", userId: "x", name: "Alex Chen",   handle: "SWE → Shopify", text: "I had 30+ STAR stories rotting in a Google Doc. Precept made me actually drill them. Two FAANG offers later, I'm a believer.", isApproved: true, dateSubmitted: "" },
    { id: "2", userId: "x", name: "Jordan Smith", handle: "Full-Stack",   text: "The pipeline view alone is worth it. I went from 'wait, did Linear reply?' to a real-time trajectory in one weekend.", isApproved: true, dateSubmitted: "" },
    { id: "3", userId: "x", name: "Morgan Lee",   handle: "New grad · UToronto", text: "No internships, no clue where to start. The story bank gave me structure. Landed my first SWE role in 3 months.", isApproved: true, dateSubmitted: "" },
  ];
  const list = (testimonials.length > 0 ? testimonials.slice(0, 3) : fallback);

  return (
    <section
      data-testid="testimonials-section"
      className="relative overflow-hidden py-32"
      style={{
        background: `radial-gradient(ellipse 70% 50% at 20% 30%, rgba(139,92,246,0.10), transparent 55%), ${c.bg1}`,
      }}
    >
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="flex flex-col items-center text-center">
          <Eyebrow color={c.amber}>Receipts</Eyebrow>
          <h2
            className="mt-5 max-w-[720px] font-display font-bold leading-[1.05]"
            style={{ fontSize: "clamp(32px, 4.6vw, 54px)", color: c.ink }}
          >
            Engineers who stopped <span className="font-editorial" style={{ color: c.amber, fontWeight: 400 }}>winging it.</span>
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {list.map((t, i) => (
            <div
              key={t.id}
              data-testid={`testimonial-${i}`}
              className="relative rounded-2xl p-7 transition-transform hover:-translate-y-1"
              style={{
                background: `linear-gradient(180deg, ${c.bg2} 0%, ${c.bg0} 100%)`,
                border: `1px solid ${c.hair2}`,
                boxShadow: "0 30px 60px -30px rgba(0,0,0,0.6)",
              }}
            >
              <Quote size={22} style={{ color: c.teal, opacity: 0.7 }} />
              <p className="mt-4 font-body text-[15px] leading-[1.6]" style={{ color: c.ink }}>
                "{t.text}"
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div
                  className="grid h-9 w-9 place-items-center rounded-full font-mono text-[12px] font-semibold"
                  style={{
                    background: i === 0 ? `${c.teal}22` : i === 1 ? `${c.violet}22` : `${c.emerald}22`,
                    color: i === 0 ? c.teal : i === 1 ? c.violet : c.emerald,
                    border: `1px solid ${c.hair}`,
                  }}
                >
                  {t.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div className="font-body text-[13.5px] font-semibold" style={{ color: c.ink }}>{t.name}</div>
                  <div className="font-mono text-[11px]" style={{ color: c.inkMute }}>{t.handle}</div>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[0,1,2,3,4].map(s => <Star key={s} size={11} fill={c.amber} stroke={c.amber} />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── R2 — AI TEASER ─────────────────────────── */

function R2Teaser() {
  return (
    <section
      id="r2"
      data-testid="r2-section"
      className="relative overflow-hidden py-32"
      style={{
        background: c.bg0,
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-90" style={{
        background: `radial-gradient(ellipse 60% 60% at 80% 20%, rgba(139,92,246,0.18), transparent 50%), radial-gradient(ellipse 50% 50% at 10% 80%, rgba(45,212,191,0.12), transparent 50%)`,
      }} />

      <div className="relative mx-auto max-w-[1200px] px-6">
        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-5">
            <Eyebrow color={c.violet}>R2 · Shipping next</Eyebrow>
            <h2 className="mt-5 font-display font-bold leading-[1.04]" style={{ fontSize: "clamp(34px, 5vw, 58px)", color: c.ink }}>
              An AI interviewer that knows <span className="font-editorial" style={{ color: c.violet, fontWeight: 400 }}>your resume.</span>
            </h2>
            <p className="mt-5 font-body text-[16px] leading-relaxed" style={{ color: c.inkDim }}>
              Upload a resume + a JD URL. An LLM generates tailored behavioral and technical questions, scores your live
              voice responses, and tells you exactly where to drill next.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {["LLM-generated questions", "Voice simulation", "Scored feedback", "Resume parsing", "JD match scoring"].map((p) => (
                <span
                  key={p}
                  className="rounded-full px-3 py-1.5 font-mono text-[11px]"
                  style={{
                    background: `${c.violet}14`,
                    color: c.violet,
                    border: `1px solid ${c.violet}33`,
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7">
            {/* mock chat */}
            <div className="rounded-2xl p-5 md:p-6" style={{
              background: `linear-gradient(180deg, ${c.bg2} 0%, ${c.bg1} 100%)`,
              border: `1px solid ${c.hair2}`,
              boxShadow: `0 40px 80px -30px rgba(139,92,246,0.25)`,
            }}>
              <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-widest" style={{ color: c.inkMute }}>
                <span><Mic size={11} className="-mt-0.5 inline" /> Voice round · 12:34 elapsed</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c.rose, boxShadow: `0 0 8px ${c.rose}` }} /> REC</span>
              </div>
              <div className="mt-5 space-y-3">
                {/* AI */}
                <div className="flex items-start gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full font-mono text-[11px] font-bold" style={{ background: `${c.violet}22`, color: c.violet, border: `1px solid ${c.violet}33` }}>AI</span>
                  <div className="rounded-2xl rounded-tl-sm px-4 py-3 font-body text-[13.5px]" style={{ background: c.bg0, border: `1px solid ${c.hair}`, color: c.ink, maxWidth: 460 }}>
                    Walk me through a time you owned a production incident from page to postmortem.
                  </div>
                </div>
                {/* You */}
                <div className="flex items-start justify-end gap-3">
                  <div className="rounded-2xl rounded-tr-sm px-4 py-3 font-body text-[13.5px]" style={{ background: `${c.teal}1a`, border: `1px solid ${c.teal}44`, color: c.ink, maxWidth: 460 }}>
                    Sure — last December our checkout API started returning 503s. I was on-call, paged at 2:47am…
                    <span className="caret-blink" />
                  </div>
                  <span className="grid h-7 w-7 place-items-center rounded-full font-mono text-[10px] font-bold" style={{ background: `${c.teal}22`, color: c.teal, border: `1px solid ${c.teal}44` }}>You</span>
                </div>
              </div>

              {/* score panel */}
              <div className="mt-6 grid grid-cols-3 gap-2">
                {[
                  { l: "Structure",   v: 92, color: c.emerald },
                  { l: "Specificity", v: 78, color: c.teal },
                  { l: "Conciseness", v: 64, color: c.amber },
                ].map((s) => (
                  <div key={s.l} className="rounded-lg p-3" style={{ background: c.bg0, border: `1px solid ${c.hair}` }}>
                    <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: c.inkMute }}>{s.l}</div>
                    <div className="mt-1 font-display text-[24px] font-bold" style={{ color: s.color }}>{s.v}<span className="text-[12px]" style={{ color: c.inkMute }}>/100</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── FINAL CTA ─────────────────────────── */

function FinalCTA() {
  const navigate = useNavigate();

  return (
    <section
      data-testid="final-cta-section"
      className="relative overflow-hidden py-28"
      style={{ background: c.bg0 }}
    >
      <div className="mx-auto max-w-[1100px] px-6">
        <div
          className="relative overflow-hidden rounded-3xl px-8 py-20 text-center md:px-16"
          style={{
            background: `radial-gradient(ellipse 60% 100% at 50% 0%, rgba(45,212,191,0.18), transparent 60%), linear-gradient(180deg, ${c.bg2} 0%, ${c.bg0} 100%)`,
            border: `1px solid ${c.hair2}`,
            boxShadow: `0 60px 120px -40px rgba(45,212,191,0.3), inset 0 1px 0 rgba(255,255,255,0.06)`,
          }}
        >
          <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-50" />
          <div className="relative">
            <Eyebrow color={c.emerald}>Stop winging it</Eyebrow>
            <h2
              className="mx-auto mt-6 max-w-[820px] font-display font-bold leading-[1.04]"
              style={{ fontSize: "clamp(36px, 6vw, 72px)", color: c.ink }}
            >
              Ready to own your <span className="font-editorial" style={{ color: c.teal, fontWeight: 400 }}>job hunt?</span>
            </h2>
            <p className="mx-auto mt-5 max-w-[540px] font-body text-[16px] leading-relaxed" style={{ color: c.inkDim }}>
              Free to start. No card. Your data exports as raw JSON, anytime. Built by developers, for developers.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <button
                data-testid="final-cta-primary"
                onClick={() => navigate("/login", { state: { mode: "signup" } })}
                className="gsap-magnetic group inline-flex items-center gap-2 rounded-full px-7 py-4 font-mono text-[12.5px] font-semibold uppercase tracking-[0.16em]"
                style={{
                  background: c.ink,
                  color: c.bg0,
                  boxShadow: `0 0 0 1px ${c.ink}, 0 20px 60px -10px rgba(45,212,191,0.5)`,
                }}
              >
                Start banking your stories
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </button>
              <a
                href="https://github.com/austinchima/Precept"
                target="_blank"
                rel="noreferrer"
                data-testid="final-cta-github"
                className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.16em] transition-colors"
                style={{ color: c.inkDim }}
                onMouseEnter={(e) => (e.currentTarget.style.color = c.ink)}
                onMouseLeave={(e) => (e.currentTarget.style.color = c.inkDim)}
              >
                Star on GitHub <ArrowUpRight size={12} />
              </a>
            </div>

            {/* tiny trust strip */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: c.inkMute }}>
              <span><Check size={11} className="-mt-0.5 inline" style={{ color: c.emerald }} /> Open source · MIT</span>
              <span>·</span>
              <span><Check size={11} className="-mt-0.5 inline" style={{ color: c.emerald }} /> Self-host or hosted</span>
              <span>·</span>
              <span><Check size={11} className="-mt-0.5 inline" style={{ color: c.emerald }} /> JSON export, always</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── FOOTER ─────────────────────────── */

function Footer() {
  return (
    <footer
      data-testid="footer"
      className="relative overflow-hidden border-t px-6 pb-10 pt-16"
      style={{ background: c.bg0, borderColor: c.hair }}
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-5">
            <div className="flex items-center gap-2">
              <span
                className="grid h-7 w-7 place-items-center rounded-md"
                style={{ background: `linear-gradient(135deg, ${c.teal}, ${c.violet})` }}
              >
                <span className="font-display text-[15px] font-bold" style={{ color: c.bg0 }}>P</span>
              </span>
              <span className="font-display text-[18px] font-bold" style={{ color: c.ink }}>Precept</span>
            </div>
            <p className="mt-4 max-w-[360px] font-body text-[13.5px] leading-relaxed" style={{ color: c.inkDim }}>
              The Career OS for software engineers. Built by developers, for developers.
            </p>
            <p className="mt-6 font-editorial text-[15px]" style={{ color: c.inkMute }}>
              "Engineered for the modern developer."
            </p>
          </div>

          <div className="col-span-6 md:col-span-2">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: c.inkMute }}>Product</div>
            <ul className="mt-4 space-y-2 font-body text-[13px]">
              {[["#modules","Modules"],["#ladder","Confidence Ladder"],["#how","How it works"],["#r2","R2 Roadmap"]].map(([h, l]) => (
                <li key={l}><a href={h} className="transition-colors" style={{ color: c.inkDim }} onMouseEnter={e => e.currentTarget.style.color = c.ink} onMouseLeave={e => e.currentTarget.style.color = c.inkDim}>{l}</a></li>
              ))}
            </ul>
          </div>

          <div className="col-span-6 md:col-span-2">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: c.inkMute }}>Resources</div>
            <ul className="mt-4 space-y-2 font-body text-[13px]">
              {[
                ["https://github.com/austinchima/Precept", "GitHub"],
                ["https://github.com/austinchima/Precept/tree/master/design-system/pages", "Design system"],
                ["https://github.com/austinchima/Precept/blob/master/OWASP-SECURITY-AUDIT.md", "Security audit"],
                ["https://github.com/austinchima/Precept/blob/master/CHANGELOG.md", "Changelog"],
              ].map(([h, l]) => (
                <li key={l}>
                  <a href={h} target="_blank" rel="noreferrer" className="transition-colors" style={{ color: c.inkDim }} onMouseEnter={e => e.currentTarget.style.color = c.ink} onMouseLeave={e => e.currentTarget.style.color = c.inkDim}>{l}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: c.inkMute }}>Status</div>
            <div className="mt-4 space-y-2 font-body text-[13px]" style={{ color: c.inkDim }}>
              <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c.emerald, boxShadow: `0 0 8px ${c.emerald}` }}/> R1 shipped — production</div>
              <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c.amber, boxShadow: `0 0 8px ${c.amber}` }}/> R2 in development</div>
              <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c.violet }}/> R3 planning</div>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t pt-6 sm:flex-row sm:items-center" style={{ borderColor: c.hair }}>
          <div className="font-mono text-[11px]" style={{ color: c.inkMute }}>
            © {new Date().getFullYear()} Precept · MIT License
          </div>
          <div className="font-mono text-[11px]" style={{ color: c.inkMute }}>
            <span className="caret-blink" /> ready when you are
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────── MAGNETIC INITIALIZER ─────────────────────────── */

function MagneticInitializer() {
  useGSAP(() => {
    if (prefersReducedMotion()) return;

    const buttons = document.querySelectorAll(".gsap-magnetic");
    const cleaners: (() => void)[] = [];

    buttons.forEach((btn) => {
      const el = btn as HTMLElement;
      const strength = 0.22;

      const onMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(el, { x: x * strength, y: y * strength, duration: 0.3, ease: "power2.out" });
      };
      const onLeave = () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
      };

      el.addEventListener("mousemove", onMove as EventListener);
      el.addEventListener("mouseleave", onLeave);
      cleaners.push(() => {
        el.removeEventListener("mousemove", onMove as EventListener);
        el.removeEventListener("mouseleave", onLeave);
      });
    });

    return () => cleaners.forEach((c) => c());
  }, []);

  return null;
}

/* ─────────────────────────── LANDING PAGE ─────────────────────────── */

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    async function loadTestimonials() {
      try {
        const data = await api.get<Testimonial[]>("/api/testimonial/public", { skipAuth: true });
        setTestimonials(data);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to load testimonials:", err);
      }
    }
    loadTestimonials();
  }, []);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);

  return (
    <SmoothScroll>
    <PageTransition>
      <div data-testid="landing-page" className="min-h-screen w-full" style={{ background: c.bg0, color: c.ink }}>
        <MagneticInitializer />
        <Navbar />
        <Hero />
        <Marquee />
        <Wedge />
        <Modules />
        <ConfidenceLadder />
        <HowItWorks />
        <Testimonials testimonials={testimonials} />
        <R2Teaser />
        <FinalCTA />
        <Footer />
      </div>
    </PageTransition>
    </SmoothScroll>
  );
}
