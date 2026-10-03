import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Bookmark, Download, Github, Menu, Mic, Moon, ShieldCheck, Sun, X } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import type { ConfidenceLevel, Testimonial } from '../types';
import { SmoothScroll } from '../components/animation/SmoothScroll';
import { gsap, MOTION_OK, ScrollTrigger, SplitText, useGSAP } from '../lib/animations';
import { useTheme } from '../lib/theme';
import { Button, Chip, Kbd, Logo } from '../components/ui/kit';
import { ConfidencePicker } from '../components/domain';
import { useToast } from '../components/ui/Toast';
import { cn } from '../lib/utils';

const GITHUB_URL = 'https://github.com/austinchima/Precept';

/** Real screenshots of the app (fictional sample data), one per theme. */
function ProductShot({ name, alt, className, priority }: { name: string; alt: string; className?: string; priority?: boolean }) {
  const { resolved } = useTheme();
  return (
    <img
      src={`/product/${resolved}-${name}.webp`}
      alt={alt}
      width={2400}
      height={1500}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={cn('block h-auto w-full select-none', className)}
      draggable={false}
    />
  );
}

function useDemo() {
  const { demoLogin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const start = async () => {
    setLoading(true);
    try {
      await demoLogin();
      navigate('/dashboard');
    } catch (err) {
      toast.error((err as Error).message || 'The demo could not start. Try again in a minute.');
    } finally {
      setLoading(false);
    }
  };
  return { start, loading };
}

/* ───────────────────────── Navigation ───────────────────────── */

function Nav() {
  const navRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const { resolved, setPreference } = useTheme();
  const demo = useDemo();

  useGSAP(() => {
    const nav = navRef.current!;
    // toggleClass drops the class once progress hits 'max', so derive it from the scroll position instead.
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => nav.classList.toggle('nav-scrolled', self.scroll() > 8) });
  });

  const links = [
    { href: '#product', label: 'Product' },
    { href: '#features', label: 'Features' },
    { href: '#privacy', label: 'Privacy' },
  ];

  return (
    <header
      ref={navRef}
      data-testid="landing-nav"
      className="group/nav fixed inset-x-0 top-0 z-50 border-b border-transparent transition-[background-color,border-color,backdrop-filter] duration-300 [&.nav-scrolled]:border-line [&.nav-scrolled]:bg-bg/80 [&.nav-scrolled]:backdrop-blur-md"
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-6 px-5 md:px-8">
        <a href="#top" aria-label="Precept home" data-testid="landing-logo">
          <Logo />
        </a>
        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="rounded-md px-3 py-2 text-[14px] text-fg-2 transition-colors hover:text-fg">{l.label}</a>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" icon={resolved === 'dark' ? <Sun size={16} /> : <Moon size={16} />} onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme" />
          <Button variant="ghost" size="sm" to="/login" data-testid="nav-signin">Sign in</Button>
          <Button variant="secondary" size="sm" loading={demo.loading} onClick={demo.start} data-testid="nav-demo-btn">Try the demo</Button>
          <Button variant="primary" size="sm" to="/login?mode=signup" data-testid="nav-cta-btn">Create account</Button>
        </div>
        <Button variant="ghost" size="sm" className="md:hidden" icon={open ? <X size={18} /> : <Menu size={18} />} onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open} data-testid="mobile-menu-toggle" />
      </nav>
      {open && (
        <div className="border-t border-line bg-bg px-5 pb-6 pt-2 md:hidden" data-testid="mobile-menu">
          <ul className="flex flex-col">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className="block py-3 text-[16px] text-fg">{l.label}</a>
              </li>
            ))}
            <li><Link to="/login" className="block py-3 text-[16px] text-fg">Sign in</Link></li>
          </ul>
          <div className="mt-4 grid gap-2">
            <Button variant="primary" size="lg" to="/login?mode=signup">Create account</Button>
            <Button variant="secondary" size="lg" loading={demo.loading} onClick={demo.start}>Try the demo</Button>
          </div>
        </div>
      )}
    </header>
  );
}

/* ───────────────────────── Hero ───────────────────────── */

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const demo = useDemo();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        // Headline rises line by line from behind a mask; re-splits on resize and font load.
        SplitText.create('.hero-title', {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) => gsap.from(self.lines, { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.09, delay: 0.1 }),
        });
        gsap.from('.hero-fade', { opacity: 0, y: 14, duration: 0.9, ease: 'expo.out', stagger: 0.08, delay: 0.45 });
        gsap.from('.hero-shot', { opacity: 0, y: 60, duration: 1.4, ease: 'expo.out', delay: 0.35 });
        // The product frame settles from a tilt to flat as you scroll into it.
        gsap.fromTo(
          '.hero-shot-inner',
          { rotateX: 16, scale: 0.94 },
          { rotateX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.hero-shot', start: 'top 92%', end: 'top 18%', scrub: 0.6 } }
        );
      });
      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <section ref={ref} id="top" className="relative overflow-hidden pt-28 md:pt-32" data-testid="hero-section">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(60%_50%_at_70%_0%,var(--accent-soft),transparent_70%)]" />
      <div className="mx-auto grid max-w-[1240px] items-end gap-10 px-5 md:px-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h1 className="hero-title display-xl max-w-[13ch] text-fg">Know your engineering stories cold.</h1>
        </div>
        <div className="lg:col-span-5 lg:pb-2">
          <p className="hero-fade max-w-[44ch] text-[17px] leading-relaxed text-fg-2">
            Bank the work you have shipped, drill it on a spaced schedule, and practise answering out loud before every interview.
          </p>
          <div className="hero-fade mt-7 flex flex-wrap gap-2">
            <Button variant="primary" size="lg" to="/login?mode=signup" iconRight={<ArrowRight size={16} />} data-testid="hero-primary-cta">Create account</Button>
            <Button variant="secondary" size="lg" loading={demo.loading} onClick={demo.start} data-testid="hero-demo-cta">Try the demo</Button>
          </div>
          <p className="hero-fade mt-4 text-[13px] text-fg-3">The demo needs no sign-up and deletes itself after 24 hours.</p>
        </div>
      </div>

      <div className="hero-shot mx-auto mt-14 max-w-[1240px] px-5 md:mt-20 md:px-8 [perspective:1600px]">
        <div className="hero-shot-inner origin-top overflow-hidden rounded-2xl border border-line-strong bg-surface-1 shadow-[0_40px_120px_-40px_rgb(0_0_0/0.55)] [transform-style:preserve-3d]">
          <ProductShot name="dashboard" priority alt="The Precept dashboard showing stories due for review, follow-ups and the application pipeline." />
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Manifesto ───────────────────────── */

function Manifesto() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        // Words light up as you read down the paragraph.
        const split = SplitText.create('.manifesto-text', { type: 'words', aria: 'auto' });
        gsap.fromTo(
          split.words,
          { opacity: 0.16 },
          { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: ref.current, start: 'top 70%', end: 'bottom 55%', scrub: true } }
        );
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <section ref={ref} className="mx-auto max-w-[1240px] px-5 py-28 md:px-8 md:py-40">
      <p className="manifesto-text display-md max-w-[30ch] text-fg">
        Interviewers rarely ask what a hash map is. They ask about the outage you fixed, the trade-off you chose and the migration you led. Precept keeps those stories in one place and gets you to tell them without notes.
      </p>
    </section>
  );
}

/* ───────────────────────── Product loop (pinned) ───────────────────────── */

const STEPS = [
  { title: 'Bank the work', body: 'Write each story once: the problem, what you chose and what happened. Technical snippets and STAR answers sit side by side.', shot: 'stories', alt: 'The STAR Bank with technical stories, categories and confidence levels.' },
  { title: 'Drill it on a schedule', body: 'Spaced repetition brings each story back just before you would forget it. Say it, reveal your notes, rate yourself, and the next review moves.', shot: 'quiz', alt: 'A drill card with a code snippet, a typed answer and the saved explanation.' },
  { title: 'Track every application', body: 'A board for each stage, follow-up reminders when a lead goes quiet, and an optional daily email with what is due.', shot: 'applications', alt: 'The applications board with columns for each stage.' },
  { title: 'See where you are thin', body: 'Compare your stories and skills with the interview-ready bar, and with the job descriptions you save.', shot: 'readiness', alt: 'The readiness view with a radar chart of recall by category.' },
] as const;

function ProductLoop() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`${MOTION_OK} and (min-width: 1024px)`, () => {
        const shots = gsap.utils.toArray<HTMLElement>('.loop-shot');
        gsap.set(shots.slice(1), { autoAlpha: 0, y: 24 });
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: '.loop-pin',
            start: 'top top',
            end: () => `+=${window.innerHeight * (STEPS.length - 1)}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
            snap: { snapTo: 1 / (STEPS.length - 1), duration: { min: 0.2, max: 0.6 }, ease: 'power2.inOut' },
            onUpdate: (self) => setActive(Math.round(self.progress * (STEPS.length - 1))),
          },
        });
        shots.forEach((shot, i) => {
          if (i === 0) return;
          tl.to(shots[i - 1], { autoAlpha: 0, y: -24, duration: 0.5 }, i - 1 + 0.25).to(shot, { autoAlpha: 1, y: 0, duration: 0.5 }, i - 1 + 0.35);
        });
        tl.to('.loop-progress', { scaleY: 1, ease: 'none', duration: STEPS.length - 1 }, 0);
      });
      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <section ref={ref} id="product" aria-labelledby="loop-heading" className="relative">
      <div className="loop-pin mx-auto max-w-[1240px] px-5 md:px-8 lg:flex lg:h-[100dvh] lg:items-center">
        <div className="grid w-full gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-4">
            <p className="text-[13px] font-medium text-accent-text">How it works</p>
            <h2 id="loop-heading" className="display-lg mt-3 text-fg">One loop, four screens.</h2>
            <ol className="relative mt-10 hidden flex-col gap-7 pl-6 lg:flex">
              <span aria-hidden="true" className="absolute left-0 top-1 h-[calc(100%-8px)] w-px bg-line" />
              <span aria-hidden="true" className="loop-progress absolute left-0 top-1 h-[calc(100%-8px)] w-px origin-top scale-y-0 bg-accent-text" />
              {STEPS.map((s, i) => (
                <li key={s.title} className={cn('transition-opacity duration-500', active === i ? 'opacity-100' : 'opacity-40')}>
                  <h3 className="text-[17px] font-semibold tracking-tight text-fg">{s.title}</h3>
                  <p className="mt-1.5 max-w-[38ch] text-[14.5px] leading-relaxed text-fg-2">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="relative hidden lg:col-span-8 lg:block">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-line-strong bg-surface-1">
              {STEPS.map((s) => (
                <div key={s.shot} className="loop-shot absolute inset-0">
                  <ProductShot name={s.shot} alt={s.alt} />
                </div>
              ))}
            </div>
          </div>
          {/* Small screens and reduced motion: a plain stacked list */}
          <ol className="flex flex-col gap-14 lg:hidden">
            {STEPS.map((s) => (
              <li key={s.title}>
                <h3 className="text-[19px] font-semibold tracking-tight text-fg">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-fg-2">{s.body}</p>
                <div className="mt-5 overflow-hidden rounded-xl border border-line-strong">
                  <ProductShot name={s.shot} alt={s.alt} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Features (bento) ───────────────────────── */

function VoiceBars() {
  return (
    <div aria-hidden="true" className="flex h-14 items-center gap-[3px]">
      {Array.from({ length: 36 }).map((_, i) => (
        <span
          key={i}
          className="w-[3px] origin-center rounded-full bg-fg-3 motion-safe:animate-[voice_1.4s_ease-in-out_infinite]"
          style={{ height: `${18 + ((i * 37) % 70)}%`, animationDelay: `${(i % 9) * 0.11}s` }}
        />
      ))}
    </div>
  );
}

function Features() {
  const [level, setLevel] = useState<ConfidenceLevel>('Shaky');
  return (
    <section id="features" aria-labelledby="features-heading" className="mx-auto max-w-[1240px] px-5 py-28 md:px-8 md:py-36">
      <h2 id="features-heading" className="reveal display-lg max-w-[18ch] text-fg">The rest of the search, in the same place.</h2>
      <div className="mt-14 grid gap-4 md:grid-cols-6">
        <article className="reveal panel flex flex-col justify-between gap-10 p-7 md:col-span-4">
          <div>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-3 text-fg"><Mic size={18} /></span>
            <h3 className="mt-5 text-[20px] font-semibold tracking-tight text-fg">Mock interviews, out loud</h3>
            <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-fg-2">
              Get a question for your role, a job post or one of your stories. Answer by voice or keyboard, then read feedback on situation, task, action and result.
            </p>
          </div>
          <VoiceBars />
        </article>

        <article className="reveal panel flex flex-col gap-6 bg-accent-soft p-7 md:col-span-2">
          <div>
            <h3 className="text-[20px] font-semibold tracking-tight text-fg">Rate it honestly</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-fg-2">Five steps from panic to can-teach. Try it.</p>
          </div>
          <div className="mt-auto">
            <ConfidencePicker value={level} onChange={setLevel} size="sm" />
          </div>
        </article>

        <article className="reveal panel p-7 md:col-span-2">
          <h3 className="text-[20px] font-semibold tracking-tight text-fg">Check a job post</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-fg-2">Paste a posting to see which skills it names that are on your list, and which are not.</p>
          <div className="mt-6 flex flex-wrap gap-1.5" aria-label="Example result">
            <Chip tone="accent">PostgreSQL</Chip>
            <Chip tone="accent">TypeScript</Chip>
            <Chip tone="accent">Docker</Chip>
            <Chip>Kafka</Chip>
            <Chip>Terraform</Chip>
          </div>
          <p className="mt-2 text-[12px] text-fg-3">Example result</p>
        </article>

        <article className="reveal panel flex flex-col p-7 md:col-span-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-3 text-fg"><Bookmark size={18} /></span>
          <h3 className="mt-5 text-[20px] font-semibold tracking-tight text-fg">Save postings in one click</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-fg-2">A bookmarklet turns the posting you are reading into a draft application.</p>
        </article>

        <article className="reveal panel-quiet flex flex-col p-7 md:col-span-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-3 text-fg"><Download size={18} /></span>
          <h3 className="mt-5 text-[20px] font-semibold tracking-tight text-fg">Search everything</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-fg-2">
            Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> to find a story, an application or a skill, or jump to any screen.
          </p>
        </article>
      </div>
    </section>
  );
}

/* ───────────────────────── Privacy ───────────────────────── */

const PRIVACY = [
  { title: 'Export any time', body: 'Download everything in your account as JSON from Settings.' },
  { title: 'Delete for good', body: 'Deleting your account removes your stories, applications and skills.' },
  { title: 'Recordings stay with you', body: 'Mock interview audio is kept in your browser and never sent to Precept.' },
  { title: 'AI only when you ask', body: 'Only the text you submit for feedback goes to the configured AI provider. The demo never calls one.' },
  { title: 'Open source', body: 'MIT licensed. Run it yourself with Docker Compose if you prefer.' },
];

function Privacy() {
  return (
    <section id="privacy" aria-labelledby="privacy-heading" className="border-y border-line bg-surface-1/40">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-24 md:px-8 md:py-32 lg:grid-cols-12">
        <div className="reveal lg:col-span-4">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-ink"><ShieldCheck size={20} /></span>
          <h2 id="privacy-heading" className="display-md mt-6 max-w-[16ch] text-fg">Your prep is personal. It stays yours.</h2>
        </div>
        <dl className="grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:col-span-8">
          {PRIVACY.map((p) => (
            <div key={p.title} className="reveal border-t border-line pt-5">
              <dt className="text-[16px] font-semibold tracking-tight text-fg">{p.title}</dt>
              <dd className="mt-1.5 text-[14.5px] leading-relaxed text-fg-2">{p.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ───────────────────────── Testimonials (real, approved only) ───────────────────────── */

function Testimonials() {
  const [items, setItems] = useState<Testimonial[]>([]);
  useEffect(() => {
    api
      .get<Testimonial[]>('/api/testimonial/public', { skipAuth: true })
      .then((data) => setItems((data ?? []).slice(0, 3)))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (items.length) ScrollTrigger.refresh();
  }, [items.length]);

  if (items.length === 0) return null;
  return (
    <section aria-labelledby="testimonials-heading" className="mx-auto max-w-[1240px] px-5 py-24 md:px-8" data-testid="testimonials-section">
      <h2 id="testimonials-heading" className="display-md text-fg">From people using it</h2>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {items.map((t, i) => (
          <figure key={t.id} className="panel flex flex-col justify-between gap-6 p-6" data-testid={`testimonial-${i}`}>
            <blockquote className="line-clamp-3 text-[15.5px] leading-relaxed text-fg">“{t.text}”</blockquote>
            <figcaption className="text-[13px]">
              <span className="font-medium text-fg">{t.name}</span>
              <span className="text-fg-3"> - {t.handle}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── Closing CTA and footer ───────────────────────── */

function FinalCta() {
  const demo = useDemo();
  return (
    <section className="mx-auto max-w-[1240px] px-5 py-28 md:px-8 md:py-40">
      <div className="reveal grid gap-10 lg:grid-cols-12 lg:items-end">
        <h2 className="display-lg max-w-[16ch] text-fg lg:col-span-8">Your next interview will ask about your work.</h2>
        <div className="flex flex-wrap gap-2 lg:col-span-4 lg:justify-end">
          <Button variant="primary" size="lg" to="/login?mode=signup" iconRight={<ArrowRight size={16} />}>Create account</Button>
          <Button variant="secondary" size="lg" loading={demo.loading} onClick={demo.start}>Try the demo</Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-5 py-10 text-[13.5px] md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-4">
          <Logo />
          <span className="text-fg-3">Interview prep for software engineers.</span>
        </div>
        <ul className="flex flex-wrap items-center gap-5 text-fg-2">
          <li><Link to="/login" className="hover:text-fg">Sign in</Link></li>
          <li><Link to="/terms" className="hover:text-fg">Terms</Link></li>
          <li>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-fg">
              <Github size={15} /> GitHub
            </a>
          </li>
          <li className="text-fg-3">© {new Date().getFullYear()} Precept. MIT licence.</li>
        </ul>
      </div>
    </footer>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function Landing() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        // Sections below the fold rise in once as they enter.
        gsap.set('.reveal', { opacity: 0, y: 28 });
        ScrollTrigger.batch('.reveal', {
          start: 'top 88%',
          once: true,
          onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07, overwrite: true }),
        });
      });
      return () => mm.revert();
    },
    { scope: ref }
  );

  useEffect(() => {
    document.title = 'Precept - interview prep for software engineers';
  }, []);

  return (
    <SmoothScroll>
      <div ref={ref} className="grain min-h-[100dvh] bg-bg text-fg">
        <Nav />
        <main id="main">
          <Hero />
          <Manifesto />
          <ProductLoop />
          <Features />
          <Privacy />
          <Testimonials />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </SmoothScroll>
  );
}
