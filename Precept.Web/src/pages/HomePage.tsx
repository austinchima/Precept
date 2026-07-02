import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/ui/PageTransition';
import { useAuth } from '../AuthContext';
import { motion, useScroll, useTransform, useInView, Variants } from 'framer-motion';
import {
  LayoutDashboard, Lock, Database, Zap, Building2, Cloud, Target, Code2,
  BrainCircuit, Sparkles, LineChart, GitBranch, FlaskConical, Bot, Mic,
  FileText, Github, Linkedin, Terminal, ChevronRight, Activity, Code, ArrowUpRight,
} from 'lucide-react';

const C = {
  bg0: '#02050A', bg1: '#06090F', bg2: '#0B0F17', bg3: '#11161F',
  ink: '#E6EBF2', inkDim: '#9CA8B8', inkMute: '#5A6678',
  hair: 'rgba(255,255,255,0.07)', hair2: 'rgba(255,255,255,0.12)',
  teal: '#2dd4bf', tealDim: 'rgba(45,212,191,0.14)',
  violet: '#8b5cf6', rose: '#f43f5e', amber: '#f59e0b', sky: '#38bdf8', emerald: '#10b981',
} as const;

const Eyebrow = ({ children, color = C.teal }: { children: React.ReactNode; color?: string }) => (
  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em]"
    style={{ background: `${color}14`, border: `1px solid ${color}33`, color }}>
    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
    {children}
  </span>
);

const cardSurface = (): React.CSSProperties => ({
  background: `linear-gradient(180deg, ${C.bg1} 0%, ${C.bg0} 100%)`,
  border: `1px solid ${C.hair}`,
  borderRadius: 22,
  boxShadow: '0 30px 60px -30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
});

const Spotlight = () => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    const move = (e: MouseEvent) => { setPos({ x: e.clientX, y: e.clientY }); if (!opacity) setOpacity(1); };
    const leave = () => setOpacity(0);
    window.addEventListener('mousemove', move);
    document.body.addEventListener('mouseleave', leave);
    return () => { window.removeEventListener('mousemove', move); document.body.removeEventListener('mouseleave', leave); };
  }, [opacity]);
  return (
    <div className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-500 ease-in-out"
      style={{ opacity, background: `radial-gradient(700px circle at ${pos.x}px ${pos.y}px, rgba(45,212,191,0.08), transparent 40%)` }} />
  );
};

const FadeIn = ({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string; key?: React.Key }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.8, delay, ease: [0.21, 1.02, 0.73, 1] }}
      className={`w-full ${className}`}>
      {children}
    </motion.div>
  );
};

const TypewriterText = ({ text, delay = 0, className = '' }: { text: string; delay?: number; className?: string }) => {
  const chars = Array.from(text);
  const container: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.012, delayChildren: delay } } };
  const child: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  return (
    <motion.span variants={container} initial="hidden" animate="visible" className={className}>
      {chars.map((c, i) => <motion.span key={i} variants={child}>{c}</motion.span>)}
    </motion.span>
  );
};

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [systemStatus, setSystemStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 1000], [0, 180]);
  const opacityHero = useTransform(scrollY, [0, 400], [1, 0]);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const r = await fetch('/api/health');
        if (mounted) setSystemStatus(r.ok ? 'online' : 'offline');
      } catch { if (mounted) setSystemStatus('offline'); }
    };
    check();
    const id = setInterval(check, 15000);
    setTimeout(() => { import('./Landing').catch(() => {}); }, 1000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const handleGetStarted = () => {
    if (isAuthenticated) navigate('/dashboard');
    else navigate('/login');
  };

  const StatusBadge = ({ className = '' }: { className?: string }) => {
    const tone =
      systemStatus === 'checking' ? { color: C.amber, label: 'Checking system…' } :
      systemStatus === 'offline'  ? { color: C.rose, label: 'API offline' } :
      { color: C.teal, label: 'Systems operational' };
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-[10.5px] uppercase tracking-[0.16em] ${className}`}
        style={{ background: `${tone.color}10`, border: `1px solid ${tone.color}33`, color: tone.color }}>
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: tone.color, boxShadow: `0 0 6px ${tone.color}` }} />
        {tone.label}
      </div>
    );
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-xl"
        style={{ background: 'rgba(2,5,10,0.7)', borderBottom: `1px solid ${C.hair}` }}>
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <a href="/" className="flex items-center gap-3 no-underline" data-testid="home-logo">
            <span className="grid h-9 w-9 place-items-center rounded-md"
              style={{ background: `linear-gradient(135deg, ${C.teal} 0%, ${C.violet} 100%)`, boxShadow: `0 0 18px ${C.tealDim}` }}>
              <span className="font-display text-[16px] font-bold leading-none" style={{ color: C.bg0 }}>P</span>
            </span>
            <div>
              <span className="font-display font-bold text-[19px] tracking-tight" style={{ color: C.ink }}>Precept</span>
              <span className="ml-2 font-mono text-[9.5px] uppercase tracking-[0.22em]" style={{ color: C.inkMute }}>Career&nbsp;OS</span>
            </div>
          </a>

          <div className="hidden md:flex items-center gap-7">
            <a href="#features" className="font-mono text-[12px] uppercase tracking-[0.14em] transition-colors" style={{ color: C.inkDim }}>Features</a>
            <a href="#roadmap" className="font-mono text-[12px] uppercase tracking-[0.14em] transition-colors" style={{ color: C.inkDim }}>Roadmap</a>
            <StatusBadge />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} data-testid="home-signin-btn"
              className="hidden sm:inline-flex cursor-pointer items-center rounded-full border border-transparent px-3.5 min-h-[36px] font-mono text-[11.5px] uppercase tracking-[0.16em] transition-all hover:border-teal-400/30 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(45,212,191,0.2)]"
              style={{ color: C.inkDim }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.ink)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.inkDim)}>
              Sign in
            </button>
            <button onClick={handleGetStarted} data-testid="home-cta-initialize"
              className="group inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] cursor-pointer min-h-[44px]"
              style={{ background: C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${C.ink}, 0 18px 60px -20px rgba(45,212,191,0.5)` }}>
              Initialize <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </nav>

      <PageTransition>
        <div className="font-body min-h-screen relative overflow-x-hidden antialiased" style={{ background: C.bg0, color: C.ink }}>
          <Spotlight />

          {/* dot grid */}
          <div className="fixed inset-0 pointer-events-none z-0 bg-dotgrid opacity-50" />
          {/* halos */}
          <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 h-[620px] w-[1200px] rounded-[50%] z-0"
            style={{ background: `radial-gradient(closest-side, rgba(45,212,191,0.14), rgba(139,92,246,0.08) 45%, transparent 75%)`, filter: 'blur(4px)' }} />

          <main className="relative z-10 pt-28 pb-24 px-6 max-w-7xl mx-auto flex flex-col gap-32">
            {/* HERO */}
            <motion.section style={{ y: yHero, opacity: opacityHero }} className="flex flex-col items-center text-center gap-7 max-w-4xl mx-auto mt-12">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
                <Eyebrow color={C.teal}><Activity size={11} /> Job hunt OS · live</Eyebrow>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease: [0.21, 1.02, 0.73, 1] }}
                className="font-display font-bold tracking-tight leading-[1.02]"
                style={{ color: C.ink, fontSize: 'clamp(46px, 9vw, 88px)' }}>
                Engineer your next<br />
                <span className="font-editorial" style={{ color: C.teal, fontWeight: 400 }}>career move.</span>
              </motion.h1>

              {/* squiggle */}
              <svg className="-mt-3" width="260" height="10" viewBox="0 0 300 10" preserveAspectRatio="none" aria-hidden="true">
                <path d="M2,7 Q75,1 150,5 T298,4" stroke={C.teal} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.6" />
              </svg>

              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3, ease: [0.21, 1.02, 0.73, 1] }}
                className="font-body text-[16.5px] md:text-[18px] max-w-[640px] mt-2 leading-relaxed" style={{ color: C.inkDim }}>
                <TypewriterText
                  text="Career management built for developers. Catalog your technical stories, drill behavioral narratives, and run your entire job hunt pipeline from one command center."
                  delay={1.0}
                />
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}
                className="flex flex-col sm:flex-row items-center gap-3 mt-2">
                <button onClick={handleGetStarted} data-testid="home-hero-cta"
                  className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-mono text-[12.5px] font-semibold uppercase tracking-[0.16em] cursor-pointer min-h-[44px]"
                  style={{ background: C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${C.ink}, 0 18px 60px -20px rgba(45,212,191,0.5)` }}>
                  <Terminal size={14} /> Deploy strategy <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </button>
                <a href="#features"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-mono text-[12.5px] font-semibold uppercase tracking-[0.16em] cursor-pointer backdrop-blur-md min-h-[44px]"
                  style={{ background: 'rgba(255,255,255,0.025)', color: C.ink, border: `1px solid ${C.hair2}` }}>
                  <LayoutDashboard size={14} /> Explore architecture
                </a>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.8 }}
                className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: C.inkMute }}>
                <div className="flex items-center gap-2"><Lock size={12} style={{ color: C.teal }} /> JWT secured</div>
                <div className="opacity-30">/</div>
                <div className="flex items-center gap-2"><Database size={12} style={{ color: C.emerald }} /> PostgreSQL</div>
                <div className="opacity-30">/</div>
                <div className="flex items-center gap-2"><Zap size={12} style={{ color: C.amber }} /> .NET 10 + React 19</div>
              </motion.div>
            </motion.section>

            {/* SHOWCASE */}
            <section id="features" className="flex flex-col gap-8">
              <FadeIn>
                <div className="flex flex-col md:flex-row gap-6 items-stretch">
                  {/* Application Tracker */}
                  <motion.div whileHover={{ y: -4 }} className="flex-1 p-8 relative overflow-hidden group" style={cardSurface()}>
                    <div className="absolute top-0 right-0 h-96 w-96 rounded-full -mr-20 -mt-20 pointer-events-none"
                      style={{ background: `radial-gradient(circle, ${C.tealDim}, transparent 70%)`, filter: 'blur(4px)' }} />
                    <div className="flex items-center justify-between mb-7 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl grid place-items-center" style={{ background: C.bg2, border: `1px solid ${C.hair2}`, color: C.teal }}>
                          <LayoutDashboard size={20} />
                        </div>
                        <div>
                          <h3 className="font-display text-[22px] font-bold leading-tight" style={{ color: C.ink }}>Application <span className="font-editorial" style={{ color: C.teal, fontWeight: 400 }}>tracker.</span></h3>
                          <p className="font-body text-[13px] mt-1" style={{ color: C.inkDim }}>Live pipeline metrics.</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 relative z-10">
                      {[
                        { icon: <Building2 size={18} />, role: 'Senior Frontend Engineer', meta: 'Stripe · San Francisco', tag: 'Technical screen', color: C.sky },
                        { icon: <Cloud size={18} />, role: 'Staff Cloud Architect', meta: 'Vercel · Remote', tag: 'Offer extended', color: C.emerald },
                      ].map((row, i) => (
                        <div key={i} className="flex items-center justify-between p-4 transition-colors group/item"
                          style={{ background: C.bg2, border: `1px solid ${C.hair}`, borderRadius: 14 }}>
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-lg grid place-items-center" style={{ background: C.bg0, border: `1px solid ${C.hair}`, color: C.inkDim }}>{row.icon}</div>
                            <div>
                              <h4 className="font-display font-semibold text-[15px]" style={{ color: C.ink }}>{row.role}</h4>
                              <p className="font-body text-[12.5px] mt-0.5" style={{ color: C.inkDim }}>{row.meta}</p>
                            </div>
                          </div>
                          <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-widest"
                            style={{ background: `${row.color}1c`, color: row.color, border: `1px solid ${row.color}44` }}>
                            {row.tag}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Skill Matrix */}
                  <motion.div whileHover={{ y: -4 }} className="w-full md:w-[340px] p-8 flex flex-col relative overflow-hidden" style={cardSurface()}>
                    <div className="pointer-events-none absolute bottom-0 left-0 w-full h-1/2"
                      style={{ background: `linear-gradient(0deg, ${C.tealDim}, transparent 100%)` }} />
                    <div className="flex items-center gap-4 mb-7 relative z-10">
                      <div className="w-12 h-12 rounded-xl grid place-items-center" style={{ background: C.bg2, border: `1px solid ${C.hair2}`, color: C.emerald }}>
                        <Target size={20} />
                      </div>
                      <h3 className="font-display text-[22px] font-bold leading-tight" style={{ color: C.ink }}>Skill <span className="font-editorial" style={{ color: C.emerald, fontWeight: 400 }}>matrix.</span></h3>
                    </div>
                    <div className="flex flex-col gap-5 flex-1 justify-center relative z-10">
                      {[
                        { name: 'React / Next.js', level: 'Expert', val: '90%', color: C.emerald },
                        { name: 'TypeScript', level: 'Advanced', val: '80%', color: C.teal },
                        { name: 'System Design', level: 'Intermediate', val: '60%', color: C.amber },
                      ].map((skill, i) => (
                        <div key={i} className="flex flex-col gap-1.5">
                          <div className="flex justify-between font-mono text-[11px]">
                            <span style={{ color: C.ink }}>{skill.name}</span>
                            <span style={{ color: C.inkMute }} className="uppercase tracking-widest">{skill.level}</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: C.hair }}>
                            <motion.div initial={{ width: 0 }} whileInView={{ width: skill.val }} transition={{ duration: 1, delay: i * 0.2 }}
                              className="h-full rounded-full"
                              style={{ background: skill.color, boxShadow: `0 0 6px ${skill.color}55` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </FadeIn>

              <FadeIn delay={0.2}>
                <div className="flex flex-col md:flex-row gap-6 items-stretch">
                  {/* Tech story bank */}
                  <motion.div whileHover={{ y: -4 }} className="md:flex-[3] p-8 relative overflow-hidden" style={cardSurface()}>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-xl grid place-items-center" style={{ background: `${C.teal}14`, border: `1px solid ${C.teal}33`, color: C.teal }}>
                        <Code2 size={20} />
                      </div>
                      <div>
                        <h3 className="font-display text-[22px] font-bold leading-tight" style={{ color: C.ink }}>Tech story <span className="font-editorial" style={{ color: C.teal, fontWeight: 400 }}>bank.</span></h3>
                        <p className="font-body text-[13px] mt-1" style={{ color: C.inkDim }}>Catalog runnable code and patterns.</p>
                      </div>
                    </div>

                    {/* IDE block */}
                    <div className="overflow-hidden" style={{ background: C.bg0, border: `1px solid ${C.hair}`, borderRadius: 14 }}>
                      <div className="flex items-center px-4 py-2.5" style={{ borderBottom: `1px solid ${C.hair}` }}>
                        <div className="flex gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
                        </div>
                        <div className="ml-4 font-mono text-[11px] flex items-center gap-2" style={{ color: C.inkMute }}>
                          <Code size={11} /> RedisCache.cs
                        </div>
                      </div>
                      <div className="p-5 font-mono text-[12.5px] leading-relaxed overflow-x-auto custom-scrollbar" style={{ color: C.inkDim }}>
                        <span style={{ color: C.violet }}>await</span> _cache.<span style={{ color: C.teal }}>SetAsync</span>(key, data,<br />
                        &nbsp;&nbsp;<span style={{ color: C.amber }}>TimeSpan</span>.FromMinutes(<span style={{ color: C.emerald }}>15</span>));<br />
                        <span style={{ color: C.violet }}>await</span> _bus.<span style={{ color: C.teal }}>PublishAsync</span>(<span style={{ color: C.amber }}>"cache:invalidate"</span>, key);
                      </div>
                    </div>

                    <button onClick={() => navigate('/story-bank')} data-testid="home-open-storybank"
                      className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.025)', color: C.ink, border: `1px solid ${C.hair2}` }}>
                      <Terminal size={12} style={{ color: C.teal }} /> Open technical bank
                    </button>
                  </motion.div>

                  {/* Behavioral */}
                  <motion.div whileHover={{ y: -4 }} className="md:flex-[2] p-8 relative overflow-hidden" style={cardSurface()}>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-xl grid place-items-center" style={{ background: `${C.violet}14`, border: `1px solid ${C.violet}33`, color: C.violet }}>
                        <BrainCircuit size={20} />
                      </div>
                      <div>
                        <h3 className="font-display text-[22px] font-bold leading-tight" style={{ color: C.ink }}>Behavioral <span className="font-editorial" style={{ color: C.violet, fontWeight: 400 }}>bank.</span></h3>
                        <p className="font-body text-[13px] mt-1" style={{ color: C.inkDim }}>STAR method narratives.</p>
                      </div>
                    </div>

                    <div className="p-5 space-y-4" style={{ background: C.bg2, border: `1px solid ${C.hair}`, borderRadius: 14 }}>
                      <div className="font-display font-semibold text-[15px]" style={{ color: C.ink }}>Navigating a critical outage</div>
                      <div className="grid grid-cols-4 gap-2 font-mono text-[10.5px]">
                        {['Situation', 'Task', 'Action', 'Result'].map((label, i) => (
                          <div key={label} className="flex flex-col items-center gap-2">
                            <div className="w-full h-1 rounded-full" style={{ background: i <= 2 ? C.violet : C.hair }} />
                            <span style={{ color: C.inkDim }} className="uppercase tracking-widest">{label[0]}</span>
                          </div>
                        ))}
                      </div>
                      <p className="font-body text-[12.5px] leading-relaxed" style={{ color: C.inkDim }}>
                        Map experiences to core leadership principles. Never freeze during a behavioral round.
                      </p>
                    </div>
                  </motion.div>
                </div>
              </FadeIn>
            </section>

            {/* ENGINE */}
            <section className="flex flex-col gap-10">
              <FadeIn>
                <div className="text-center max-w-2xl mx-auto">
                  <div className="inline-block mb-5"><Eyebrow color={C.teal}><Sparkles size={11} /> Core engine</Eyebrow></div>
                  <h2 className="font-display text-[40px] md:text-[44px] font-bold leading-[1.05]" style={{ color: C.ink }}>
                    Data-driven <span className="font-editorial" style={{ color: C.teal, fontWeight: 400 }}>preparation.</span>
                  </h2>
                  <p className="font-body text-[16px] mt-4 leading-relaxed" style={{ color: C.inkDim }}>
                    Centralize your career progression. Match capabilities against job descriptions instantly.
                  </p>
                </div>
              </FadeIn>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { icon: <LineChart size={20} />, title: 'Dynamic skill matrix', desc: 'Visualize your tech stack proficiencies. Identify knowledge gaps and track progression.', color: C.teal },
                  { icon: <Sparkles size={20} />, title: 'JD matcher', desc: 'Paste a JD and instantly align skills, identify missing keywords, and compute a real match score.', color: C.emerald },
                  { icon: <GitBranch size={20} />, title: 'Funnel tracking', desc: 'Treat your job hunt like a sales pipeline. Track conversion from application to offer.', color: C.amber },
                ].map((item, i) => (
                  <FadeIn key={i} delay={i * 0.1}>
                    <div className="p-7 flex flex-col gap-4 h-full transition-colors group" style={cardSurface()}>
                      <div className="w-11 h-11 rounded-xl grid place-items-center" style={{ background: `${item.color}14`, border: `1px solid ${item.color}33`, color: item.color }}>
                        {item.icon}
                      </div>
                      <h3 className="font-display text-[18px] font-bold" style={{ color: C.ink }}>{item.title}</h3>
                      <p className="font-body text-[13.5px] leading-relaxed" style={{ color: C.inkDim }}>{item.desc}</p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </section>

            {/* ROADMAP */}
            <section id="roadmap" className="flex flex-col gap-10 pt-12" style={{ borderTop: `1px solid ${C.hair}` }}>
              <FadeIn>
                <div className="text-center max-w-2xl mx-auto">
                  <div className="inline-block mb-5"><Eyebrow color={C.violet}><FlaskConical size={11} /> Coming in R2</Eyebrow></div>
                  <h2 className="font-display text-[40px] md:text-[44px] font-bold leading-[1.05]" style={{ color: C.ink }}>
                    AI-powered <span className="font-editorial" style={{ color: C.violet, fontWeight: 400 }}>intelligence.</span>
                  </h2>
                  <p className="font-body text-[16px] mt-4 leading-relaxed" style={{ color: C.inkDim }}>
                    The next evolution of Precept — automation that transforms how you prepare.
                  </p>
                </div>
              </FadeIn>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { icon: <Bot size={20} />, title: 'Mock interviewer', color: C.teal },
                  { icon: <Mic size={20} />, title: 'Voice simulation', color: C.emerald },
                  { icon: <FileText size={20} />, title: 'Resume analyzer', color: C.violet },
                ].map((item, i) => (
                  <FadeIn key={i} delay={i * 0.1}>
                    <div className="p-7 flex flex-col gap-4 h-full relative overflow-hidden group" style={cardSurface()}>
                      <div className="absolute top-0 left-0 w-full h-px opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: `linear-gradient(90deg, transparent 0%, ${item.color}55 50%, transparent 100%)` }} />
                      <div className="w-11 h-11 rounded-xl grid place-items-center" style={{ background: `${item.color}14`, border: `1px solid ${item.color}33`, color: item.color }}>
                        {item.icon}
                      </div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-[18px] font-bold" style={{ color: C.ink }}>{item.title}</h3>
                        <span className="font-mono text-[9.5px] uppercase tracking-widest px-2 py-0.5 rounded" style={{ color: C.inkMute, border: `1px solid ${C.hair2}` }}>R2</span>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </section>

            {/* FINAL CTA */}
            <FadeIn>
              <section className="relative overflow-hidden p-12 md:p-16 text-center" style={cardSurface()}>
                <div className="pointer-events-none absolute inset-0"
                  style={{ background: `radial-gradient(ellipse at top, ${C.tealDim} 0%, transparent 60%)` }} />
                <div className="relative z-10">
                  <div className="inline-block mb-5"><Eyebrow color={C.teal}>Ready to initialize?</Eyebrow></div>
                  <h2 className="font-display text-[40px] md:text-[52px] font-bold leading-[1.05] tracking-tight" style={{ color: C.ink }}>
                    Stop winging it. <span className="font-editorial" style={{ color: C.teal, fontWeight: 400 }}>Start operating.</span>
                  </h2>
                  <p className="font-body text-[16.5px] max-w-2xl mx-auto mt-6 leading-relaxed" style={{ color: C.inkDim }}>
                    Start using Precept today and manage your career with the precision of a senior engineer.
                  </p>
                  <button onClick={handleGetStarted} data-testid="home-final-cta"
                    className="group mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-mono text-[12.5px] font-semibold uppercase tracking-[0.16em] cursor-pointer min-h-[44px]"
                    style={{ background: C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${C.ink}, 0 18px 60px -20px rgba(45,212,191,0.5)` }}>
                    Start operating system <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </section>
            </FadeIn>
          </main>

          {/* FOOTER */}
          <footer className="w-full relative z-10" style={{ background: C.bg0, borderTop: `1px solid ${C.hair}` }}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 px-6 py-16 max-w-7xl mx-auto">
              <div className="flex flex-col gap-5 col-span-1 md:col-span-2">
                <a href="/" className="flex items-center gap-3 no-underline">
                  <span className="grid h-9 w-9 place-items-center rounded-md"
                    style={{ background: `linear-gradient(135deg, ${C.teal} 0%, ${C.violet} 100%)`, boxShadow: `0 0 18px ${C.tealDim}` }}>
                    <span className="font-display text-[16px] font-bold leading-none" style={{ color: C.bg0 }}>P</span>
                  </span>
                  <span className="font-display font-bold text-[19px]" style={{ color: C.ink }}>Precept</span>
                </a>
                <p className="font-body text-[13.5px] max-w-md leading-relaxed" style={{ color: C.inkDim }}>
                  A full-stack career platform for developers who treat their job hunt like an engineering problem.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <h4 className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.inkMute }}>Product</h4>
                <a className="font-body text-[13px] transition-colors" style={{ color: C.inkDim }} href="#">Documentation</a>
                <a className="font-body text-[13px] transition-colors" style={{ color: C.inkDim }} href="#">API reference</a>
                <a className="font-body text-[13px] transition-colors" style={{ color: C.inkDim }} href="#">Changelog</a>
              </div>
              <div className="flex flex-col gap-3">
                <h4 className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.inkMute }}>Connect</h4>
                <a href="https://github.com/austinchima/Precept" className="font-body text-[13px] transition-colors flex items-center gap-2" style={{ color: C.inkDim }}>
                  <Github size={14} /> GitHub
                </a>
                <a href="https://www.linkedin.com/in/austin-chima" className="font-body text-[13px] transition-colors flex items-center gap-2" style={{ color: C.inkDim }}>
                  <Linkedin size={14} /> LinkedIn
                </a>
              </div>
            </div>
            <div className="px-6 py-5 max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderTop: `1px solid ${C.hair}` }}>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.16em]" style={{ color: C.inkMute }}>© 2026 Precept · MIT License</p>
              <StatusBadge />
            </div>
          </footer>
        </div>
      </PageTransition>
    </>
  );
}
