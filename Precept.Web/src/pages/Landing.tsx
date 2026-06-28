import { useState, useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, MessageSquare, FileSearch, GitBranch, BarChart3, Grid3x3,
  Quote, Menu, X, ChevronDown, ArrowRight
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import type { Testimonial } from "../types";
import PageTransition from "../components/ui/PageTransition";
import { gsap, useGSAP, prefersReducedMotion } from "../lib/animations";
import { AnimatedSection } from "../components/animation/AnimatedSection";
import { TextReveal } from "../components/animation/TextReveal";

/* ─────────────────────────── DESIGN TOKENS ─────────────────────────── */

const c = {
  bgPrimary:   "#02050A",
  bgSecondary: "#090D14",
  bgTertiary:  "#1a2027",
  bgGlass:     "rgba(26, 32, 39, 0.55)",
  borderGlass: "rgba(255, 255, 255, 0.12)",
  txtPrimary:  "#e2e8f0",
  txtSecondary:"#a0aec0",
  txtMuted:    "#64748b",
  accent:      "#2dd4bf",
  accentDim:   "rgba(45,212,191,0.15)",
  purple:      "#8b5cf6",
} as const;

/* ─────────────────────────── SECTION WRAPPER ─────────────────────────── */

function Section({ id, bg, children, className = "" }: { id?: string; bg?: string; children: ReactNode; className?: string }) {
  return (
    <section
      id={id}
      className={`w-full ${className}`}
      style={{ background: bg || c.bgPrimary }}
    >
      <div className="mx-auto max-w-[1200px] px-6">
        {children}
      </div>
    </section>
  );
}

/* ─────────────────────────── NAVBAR ─────────────────────────── */

function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Docs", href: "https://github.com/austinchima/Precept/tree/master/design-system/pages", external: true },
  ];

  const goToLogin = (mode?: "signup") => {
    if (mode === "signup") {
      navigate("/login", { state: { mode: "signup" } });
    } else {
      navigate("/login");
    }
    setMobileOpen(false);
  };

  return (
    <>
      <nav
        className="sticky top-0 z-50 flex h-16 w-full items-center justify-between px-6 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(2, 5, 10, 0.65)" : "transparent",
          backdropFilter: scrolled ? "blur(16px) saturate(180%)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(16px) saturate(180%)" : "none",
          borderBottom: scrolled ? `1px solid ${c.borderGlass}` : "1px solid transparent",
          boxShadow: scrolled ? "0 4px 30px rgba(0, 0, 0, 0.25)" : "none",
        }}
      >
        {/* Logo */}
        <a href="/" className="flex items-baseline gap-1 no-underline">
          <span className="font-display text-xl font-bold tracking-tight" style={{ color: c.txtPrimary }}>
            Precept
          </span>
          <span className="text-[10px] font-mono" style={{ color: c.txtMuted }}>TM</span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="font-body text-sm font-medium transition-colors hover:text-[#e2e8f0]"
              style={{ color: c.txtSecondary }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-4 md:flex">
          <button
            onClick={() => goToLogin()}
            className="font-body text-sm font-medium transition-colors hover:text-[#e2e8f0]"
            style={{ color: c.txtSecondary }}
          >
            Sign In
          </button>
          <button
            onClick={() => goToLogin("signup")}
            className="gsap-magnetic rounded-lg px-5 py-2 font-mono text-[13px] font-medium uppercase tracking-wider transition-all hover:brightness-110"
            style={{ background: c.accent, color: c.bgPrimary }}
          >
            Get Started
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="flex items-center justify-center md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ color: c.txtPrimary }}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 md:hidden"
          style={{ background: "rgba(2, 5, 10, 0.88)", backdropFilter: "blur(24px) saturate(180%)" }}
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="font-display text-2xl font-bold transition-colors hover:text-[#2dd4bf]"
              style={{ color: c.txtPrimary }}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={() => goToLogin("signup")}
            className="mt-4 rounded-lg px-8 py-3 font-mono text-sm uppercase tracking-wider"
            style={{ background: c.accent, color: c.bgPrimary }}
          >
            Get Started
          </button>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────── HERO ─────────────────────────── */

function Hero() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !heroRef.current) return;
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(".hero-badge", { opacity: 0, y: 20, duration: 0.6 })
          .from(".hero-headline", { opacity: 0, y: 40, duration: 0.8 }, "-=0.3")
          .from(".hero-subheadline", { opacity: 0, y: 30, duration: 0.7 }, "-=0.5")
          .from(".hero-cta", { opacity: 0, y: 30, duration: 0.6, stagger: 0.1 }, "-=0.4")
          .from(".hero-mockup", { opacity: 0, y: 60, scale: 0.95, duration: 1 }, "-=0.3")
          .from(".hero-scroll", { opacity: 0, duration: 0.5 }, "-=0.5");

        gsap.to(".hero-glow", {
          scale: 1.1,
          opacity: 0.6,
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }, heroRef);

      return () => ctx.revert();
    },
    { scope: heroRef }
  );

  const scrollToFeatures = () => {
    const el = document.getElementById("features");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-28"
      style={{
        background: `radial-gradient(ellipse 80% 60% at 50% 20%, ${c.accentDim} 0%, transparent 60%), ${c.bgPrimary}`,
      }}
    >
      {/* Floating Glow */}
      <div
        className="hero-glow pointer-events-none absolute left-1/2 top-[15%] -translate-x-1/2"
        style={{
          width: 400,
          height: 400,
          background: `radial-gradient(circle, ${c.accentDim} 0%, transparent 70%)`,
          animation: "float 6s ease-in-out infinite",
        }}
      />

      {/* Badge */}
      <div
        className="hero-badge relative z-10 mb-6 inline-block rounded-md px-3 py-1 font-mono text-[11px] uppercase tracking-widest"
        style={{ background: "rgba(45,212,191,0.1)", border: "1px solid rgba(45,212,191,0.2)", color: c.accent }}
      >
        v1.0 — R2 Coming Soon
      </div>

      {/* Headline */}
      <TextReveal
        className="hero-headline relative z-10 max-w-[800px] text-center font-display font-bold leading-[1.1]"
        style={{ fontSize: "clamp(40px, 6vw, 72px)", color: c.txtPrimary } as CSSProperties}
      >
        Your Job Hunt, <span style={{ color: c.accent }}>Reimagined</span>
      </TextReveal>

      {/* Subheadline */}
      <p
        className="hero-subheadline relative z-10 mt-6 max-w-[560px] text-center font-body text-lg leading-relaxed"
        style={{ color: c.txtSecondary }}
      >
        Precept is the Career OS for software engineers. Organize STAR stories, track applications, and ace interviews — all in one command center.
      </p>

      {/* CTAs */}
      <div className="relative z-10 mt-10 flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={() => navigate("/login", { state: { mode: "signup" } })}
          className="hero-cta gsap-magnetic rounded-lg px-7 py-3 font-mono text-[13px] font-medium uppercase tracking-wider transition-all hover:brightness-110"
          style={{ background: c.accent, color: c.bgPrimary }}
        >
          Get Started Free
        </button>
        <button
          onClick={scrollToFeatures}
          className="hero-cta gsap-magnetic rounded-lg border px-7 py-3 font-mono text-[13px] font-medium uppercase tracking-wider transition-all hover:border-white/30"
          style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderColor: "rgba(255,255,255,0.15)",
            color: c.txtPrimary,
          }}
        >
          See How It Works
        </button>
      </div>

      {/* Dashboard Mockup */}
      <div
        className="hero-mockup relative z-10 mx-auto mt-16 w-full max-w-[1000px] overflow-hidden rounded-xl"
        style={{
          background: c.bgGlass,
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          border: `1px solid ${c.borderGlass}`,
          boxShadow: `0 0 80px ${c.accentDim}, inset 0 1px 0 rgba(255,255,255,0.05)`,
        }}
      >
        {/* Browser Chrome */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: c.bgTertiary }}>
          <div className="h-2 w-2 rounded-full" style={{ background: "#ff5f57" }} />
          <div className="h-2 w-2 rounded-full" style={{ background: "#febc2e" }} />
          <div className="h-2 w-2 rounded-full" style={{ background: "#28c840" }} />
          <div
            className="ml-3 flex-1 rounded-md px-3 py-1 font-mono text-xs"
            style={{ background: c.bgSecondary, color: c.txtMuted }}
          >
            app.precept.dev
          </div>
        </div>
        {/* Screenshot */}
        <img
          src="/dashboard-mockup.jpg"
          alt="Precept Dashboard showing Story Bank with application tracking, confidence metrics, and pipeline overview"
          className="w-full"
          loading="eager"
        />
      </div>

      {/* Scroll Indicator */}
      <div className="hero-scroll relative z-10 mt-12" style={{ color: c.txtMuted, opacity: 0.4 }}>
        <ChevronDown size={24} className="animate-bounce" />
      </div>
    </section>
  );
}

/* ─────────────────────────── TRUST BAR ─────────────────────────── */

function TrustBar() {
  const badges = [".NET 10", "React 19", "PostgreSQL", "Docker", "TypeScript"];
  return (
    <Section
      bg={`radial-gradient(ellipse 80% 50% at 50% 100%, rgba(45,212,191,0.05) 0%, transparent 55%), ${c.bgSecondary}`}
      className="border-b border-white/5 py-10"
    >
      <AnimatedSection animation="fadeUp">
        <div className="flex flex-wrap items-center justify-center gap-6">
          {badges.map((b, i) => (
            <div key={b} className="flex items-center gap-6">
              <span className="font-mono text-sm tracking-wide" style={{ color: c.txtMuted }}>{b}</span>
              {i < badges.length - 1 && (
                <span className="hidden font-mono text-sm sm:inline" style={{ color: c.txtMuted, opacity: 0.3 }}>|</span>
              )}
            </div>
          ))}
        </div>
      </AnimatedSection>
    </Section>
  );
}

/* ─────────────────────────── FEATURES ─────────────────────────── */

function Features() {
  const features = [
    { icon: BookOpen, title: "Technical Story Bank", desc: "Catalog code snippets, explanations, and projects by category with confidence tracking." },
    { icon: MessageSquare, title: "Behavioral Story Bank", desc: "Curate STAR-method narratives so you never freeze in behavioral rounds." },
    { icon: FileSearch, title: "JD Analyzer", desc: "Paste job descriptions and map requirements against your skills to find gaps." },
    { icon: GitBranch, title: "Pipeline Tracker", desc: "Track applications with automatic status history and trajectory insights." },
    { icon: BarChart3, title: "Analytics Dashboard", desc: "Visualize your job search progress with dynamic charts and conversion rates." },
    { icon: Grid3x3, title: "Skills Matrix", desc: "Keep an up-to-date inventory of your technical capabilities." },
  ];

  return (
    <Section
      id="features"
      bg={`radial-gradient(ellipse 70% 60% at 20% 30%, rgba(45,212,191,0.10) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(139,92,246,0.08) 0%, transparent 50%), ${c.bgPrimary}`}
      className="relative overflow-hidden py-[120px]"
    >
      <AnimatedSection animation="fadeUp" className="text-center">
        <div className="font-mono text-[11px] uppercase tracking-widest" style={{ color: c.accent }}>
          Features
        </div>
        <h2
          className="mt-4 font-display font-bold"
          style={{ fontSize: "clamp(28px, 4vw, 40px)", color: c.txtPrimary }}
        >
          Everything You Need to Land the Role
        </h2>
      </AnimatedSection>

      <AnimatedSection
        animation="staggerFadeUp"
        childSelector=".feature-card"
        stagger={0.1}
        className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="feature-card group rounded-xl p-8 transition-all duration-300 hover:border-[#2dd4bf]/30 hover:-translate-y-1"
              style={{
                background: c.bgGlass,
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: `1px solid ${c.borderGlass}`,
                boxShadow: "0 4px 30px rgba(0,0,0,0.1)",
              }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-[10px] transition-colors duration-300 group-hover:bg-[rgba(45,212,191,0.12)]"
                style={{ background: "rgba(45,212,191,0.08)" }}
              >
                <Icon size={22} style={{ color: c.accent }} />
              </div>
              <h3 className="mt-5 font-body text-base font-semibold" style={{ color: c.txtPrimary }}>
                {f.title}
              </h3>
              <p className="mt-2 font-body text-sm leading-relaxed" style={{ color: c.txtSecondary }}>
                {f.desc}
              </p>
            </div>
          );
        })}
      </AnimatedSection>
    </Section>
  );
}

/* ─────────────────────────── HOW IT WORKS ─────────────────────────── */

function HowItWorks() {
  const steps = [
    { num: "01", title: "Capture", desc: "Add your stories, skills, and job applications. Build your personal knowledge base with structured STAR narratives and technical deep-dives." },
    { num: "02", title: "Analyze", desc: "The dashboard reveals gaps between your profile and target roles. Track pipeline health, conversion rates, and trajectory trends in real-time." },
    { num: "03", title: "Convert", desc: "Walk into every interview prepared. Know your stories, understand your gaps, and present your experience with confidence and clarity." },
  ];

  return (
    <Section
      id="how-it-works"
      bg={`radial-gradient(ellipse 80% 50% at 50% 0%, rgba(45,212,191,0.06) 0%, transparent 55%), ${c.bgSecondary}`}
      className="py-[120px]"
    >
      <AnimatedSection animation="fadeUp" className="text-center">
        <div className="font-mono text-[11px] uppercase tracking-widest" style={{ color: c.accent }}>
          How It Works
        </div>
        <h2
          className="mt-4 font-display font-bold"
          style={{ fontSize: "clamp(28px, 4vw, 40px)", color: c.txtPrimary }}
        >
          Three Steps to Interview Confidence
        </h2>
      </AnimatedSection>

      <AnimatedSection
        animation="staggerFadeUp"
        childSelector=".step-card"
        stagger={0.15}
        className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3"
      >
        {steps.map((s) => (
          <div
            key={s.num}
            className="step-card relative pl-8 transition-all duration-300 hover:pl-10"
            style={{ borderLeft: "2px solid rgba(45,212,191,0.3)" }}
          >
            <span
              className="absolute -left-4 -top-2 font-mono text-5xl font-bold"
              style={{ color: c.txtMuted, opacity: 0.15 }}
            >
              {s.num}
            </span>
            <h3 className="font-body text-lg font-semibold" style={{ color: c.txtPrimary }}>{s.title}</h3>
            <p className="mt-3 font-body text-sm leading-relaxed" style={{ color: c.txtSecondary }}>{s.desc}</p>
          </div>
        ))}
      </AnimatedSection>
    </Section>
  );
}

/* ─────────────────────────── TESTIMONIALS ─────────────────────────── */

function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  const display = testimonials.length > 0 ? testimonials.slice(0, 3) : [
    { id: 1, name: "Alex Chen", handle: "Software Engineer @ Shopify", text: "Precept helped me organize 30+ STAR stories before my interviews. I got offers from two FAANG companies." },
    { id: 2, name: "Jordan Smith", handle: "Full-Stack Developer", text: "The pipeline tracker alone is worth it. I went from scattered spreadsheets to a clear view of every application." },
    { id: 3, name: "Morgan Lee", handle: "New Grad, University of Toronto", text: "As a new grad with no internship experience, Precept gave me structure. Landed my first SWE job in 3 months." },
  ];

  return (
    <Section
      bg={`radial-gradient(ellipse 70% 60% at 80% 30%, rgba(139,92,246,0.10) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 20% 80%, rgba(45,212,191,0.08) 0%, transparent 50%), ${c.bgPrimary}`}
      className="relative overflow-hidden py-[120px]"
    >
      <AnimatedSection
        animation="staggerFadeUp"
        childSelector=".testimonial-card"
        stagger={0.1}
        className="grid grid-cols-1 gap-6 md:grid-cols-3"
      >
        {display.map((t) => (
          <div
            key={t.id}
            className="testimonial-card rounded-xl p-8 transition-all duration-300 hover:border-[#2dd4bf]/30 hover:-translate-y-1"
            style={{
              background: c.bgGlass,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: `1px solid ${c.borderGlass}`,
              boxShadow: "0 4px 30px rgba(0,0,0,0.1)",
            }}
          >
            <Quote size={24} style={{ color: c.accent, opacity: 0.6 }} />
            <p className="mt-4 font-body text-sm leading-relaxed italic" style={{ color: c.txtSecondary }}>
              "{t.text}"
            </p>
            <div className="mt-6">
              <div className="font-body text-sm font-semibold" style={{ color: c.txtPrimary }}>{t.name}</div>
              <div className="font-body text-xs" style={{ color: c.txtMuted }}>{t.handle}</div>
            </div>
          </div>
        ))}
      </AnimatedSection>
    </Section>
  );
}

/* ─────────────────────────── R2 TEASER ─────────────────────────── */

function R2Teaser() {
  const pills = ["Mock Interviews", "Voice Simulation", "Resume Analysis", "Scored Feedback"];
  return (
    <Section
      bg="linear-gradient(135deg, rgba(45,212,191,0.08) 0%, rgba(139,92,246,0.08) 100%)"
      className="border-t border-b py-20"
    >
      <AnimatedSection animation="fadeUp" className="mx-auto max-w-[700px] text-center">
        <span
          className="inline-block rounded-md px-3 py-1 font-mono text-[11px] uppercase tracking-widest"
          style={{ background: "rgba(45,212,191,0.1)", border: "1px solid rgba(45,212,191,0.2)", color: c.accent }}
        >
          Coming in R2
        </span>
        <h2
          className="mt-5 font-display font-bold"
          style={{ fontSize: "clamp(24px, 3vw, 32px)", color: c.txtPrimary }}
        >
          AI-Powered Interview Intelligence
        </h2>
        <p className="mt-4 font-body text-base leading-relaxed" style={{ color: c.txtSecondary }}>
          R2 brings LLM-generated mock interviews tailored to your resume and target role. Practice behavioral and technical rounds with voice simulation, then get scored feedback to sharpen your edge.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {pills.map((p) => (
            <span
              key={p}
              className="rounded-full px-4 py-1.5 font-mono text-xs"
              style={{
                background: c.bgGlass,
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: `1px solid ${c.borderGlass}`,
                color: c.txtSecondary,
              }}
            >
              {p}
            </span>
          ))}
        </div>
      </AnimatedSection>
    </Section>
  );
}

/* ─────────────────────────── CTA SECTION ─────────────────────────── */

function CTASection() {
  const navigate = useNavigate();

  return (
    <Section
      bg={`radial-gradient(ellipse 80% 60% at 50% 100%, rgba(45,212,191,0.08) 0%, transparent 55%), ${c.bgPrimary}`}
      className="pb-10 pt-24"
    >
      <AnimatedSection animation="scaleIn" className="mx-auto max-w-[900px]">
        <div
          className="relative overflow-hidden rounded-2xl px-6 py-16 text-center md:px-12"
          style={{
            background: c.bgGlass,
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: `1px solid ${c.borderGlass}`,
            boxShadow: `0 0 60px rgba(45,212,191,0.08), inset 0 1px 0 rgba(255,255,255,0.05)`,
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background: `radial-gradient(circle at 20% 30%, rgba(45,212,191,0.12) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(139,92,246,0.10) 0%, transparent 40%)`,
            }}
          />
          <div className="relative z-10">
            <h2
              className="font-display font-bold"
              style={{ fontSize: "clamp(28px, 4vw, 40px)", color: c.txtPrimary }}
            >
              Ready to Own Your Job Hunt?
            </h2>
            <p className="mt-4 font-body text-base" style={{ color: c.txtSecondary }}>
              Join developers who use Precept to turn interviews into offers.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
              <button
                onClick={() => navigate("/login", { state: { mode: "signup" } })}
                className="gsap-magnetic inline-flex items-center gap-2 rounded-lg px-8 py-3.5 font-mono text-[13px] font-medium uppercase tracking-wider transition-all hover:brightness-110"
                style={{ background: c.accent, color: c.bgPrimary }}
              >
                Get Started Free
                <ArrowRight size={16} />
              </button>
              <a
                href="https://github.com/austinchima/Precept"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm transition-colors hover:text-[#a0aec0]"
                style={{ color: c.txtMuted }}
              >
                View on GitHub →
              </a>
            </div>
          </div>
        </div>
      </AnimatedSection>
    </Section>
  );
}

/* ─────────────────────────── FOOTER ─────────────────────────── */

function Footer() {
  return (
    <footer
      className="w-full border-t px-6 py-10"
      style={{ background: c.bgPrimary, borderColor: "rgba(255,255,255,0.06)" }}
    >
      <AnimatedSection animation="fadeUp">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-base font-bold" style={{ color: c.txtPrimary }}>Precept</span>
            <span className="font-mono text-xs" style={{ color: c.txtMuted }}>Job Hunt OS</span>
          </div>
          <div className="flex items-center gap-6">
            {["Docs", "Privacy", "GitHub"].map((link) => (
              <a
                key={link}
                href={link === "GitHub" ? "https://github.com/austinchima/Precept" : link === "Docs" ? "https://github.com/austinchima/Precept/tree/master/design-system/pages" : "#"}
                target={link === "GitHub" || link === "Docs" ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="font-mono text-xs transition-colors hover:text-[#a0aec0]"
                style={{ color: c.txtMuted }}
              >
                {link}
              </a>
            ))}
          </div>
          <div className="font-body text-xs" style={{ color: c.txtMuted }}>
            Built by developers, for developers.
          </div>
        </div>
      </AnimatedSection>
    </footer>
  );
}

/* ─────────────────────────── MAGNETIC BUTTON SETUP ─────────────────────────── */

function MagneticInitializer() {
  useGSAP(() => {
    if (prefersReducedMotion()) return;

    const buttons = document.querySelectorAll(".gsap-magnetic");
    const cleaners: (() => void)[] = [];

    buttons.forEach((btn) => {
      const el = btn as HTMLElement;
      const strength = 0.25;

      const onMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(el, {
          x: x * strength,
          y: y * strength,
          duration: 0.3,
          ease: "power2.out",
        });
      };

      const onLeave = () => {
        gsap.to(el, {
          x: 0,
          y: 0,
          duration: 0.5,
          ease: "elastic.out(1, 0.3)",
        });
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
        console.error("Failed to load testimonials:", err);
      }
    }
    loadTestimonials();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  return (
    <PageTransition>
      <div className="min-h-screen w-full" style={{ background: c.bgPrimary, color: c.txtPrimary }}>
        <MagneticInitializer />
        <Navbar />
        <Hero />
        <TrustBar />
        <Features />
        <HowItWorks />
        <Testimonials testimonials={testimonials} />
        <R2Teaser />
        <CTASection />
        <Footer />
      </div>
    </PageTransition>
  );
}
