import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/ui/PageTransition';
import { useAuth } from '../AuthContext';
import { motion, useScroll, useTransform, useSpring, useInView, Variants } from 'framer-motion';
import {
  Rocket, LayoutDashboard, Lock, Database, Zap,
  Building2, Cloud, Target, Code2, Star, BrainCircuit,
  Sparkles, LineChart, GitBranch, FlaskConical, Bot,
  Mic, FileText, Github, Linkedin, Terminal, ChevronRight, Activity, Code
} from 'lucide-react';

// Spotlight effect for the background
const Spotlight = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (opacity === 0) setOpacity(1);
    };
    
    const handleMouseLeave = () => setOpacity(0);

    window.addEventListener('mousemove', handleMouseMove);
    document.body.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [opacity]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-500 ease-in-out"
      style={{
        opacity,
        background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(20, 184, 166, 0.07), transparent 40%)`,
      }}
    />
  );
};

const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string, key?: React.Key }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.8, delay, ease: [0.21, 1.02, 0.73, 1] }}
      className={`w-full ${className}`}
    >
      {children}
    </motion.div>
  );
};

const TypewriterText = ({ text, delay = 0, className = "" }: { text: string, delay?: number, className?: string }) => {
  const characters = Array.from(text);
  
  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.015, delayChildren: delay }
    }
  };
  
  const child: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };
  
  return (
    <motion.span variants={container} initial="hidden" animate="visible" className={className}>
      {characters.map((char, index) => (
        <motion.span key={index} variants={child}>
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
};

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [systemStatus, setSystemStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 1000], [0, 200]);
  const opacityHero = useTransform(scrollY, [0, 400], [1, 0]);

  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok && isMounted) {
          setSystemStatus('online');
        } else if (isMounted) {
          setSystemStatus('offline');
        }
      } catch (err) {
        if (isMounted) setSystemStatus('offline');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    
    // Preload landing component for login
    setTimeout(() => {
      import('./Landing').catch(() => {});
    }, 1000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleGetStarted = () => {
    if (isAuthenticated) navigate('/dashboard');
    else navigate('/login');
  };

  const StatusBadge = ({ className = '' }: { className?: string }) => {
    if (systemStatus === 'checking') {
      return (
        <div className={`flex items-center gap-2 px-3 py-1 bg-brand-surface-high/50 rounded-full border border-brand-border/50 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-[pulse_2s_infinite]"></span>
          <span className="text-xs font-mono text-brand-text-muted">Checking System...</span>
        </div>
      );
    }
    if (systemStatus === 'offline') {
      return (
        <div className={`flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded-full border border-red-500/30 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-[pulse_1s_infinite]"></span>
          <span className="text-xs font-mono text-red-400 font-bold">API Offline</span>
        </div>
      );
    }
    return (
      <div className={`flex items-center gap-2 px-3 py-1 bg-[#06101c] rounded-full border border-brand-primary/20 hover:border-brand-primary/50 transition-colors cursor-pointer ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(20,184,166,0.8)] animate-[pulse_2s_infinite]"></span>
        <span className="text-xs font-mono text-brand-primary/80">Systems Operational</span>
      </div>
    );
  };

  return (
    <PageTransition>
      <div className="bg-[#02050A] text-brand-text min-h-screen relative overflow-x-hidden antialiased selection:bg-brand-primary/30">
        
        <Spotlight />
        
        {/* Subtle grid background */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-[0.15]" 
             style={{ backgroundImage: 'linear-gradient(to right, rgba(20,184,166,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,184,166,0.15) 1px, transparent 1px)', backgroundSize: '60px 60px', maskImage: 'radial-gradient(circle at center, black, transparent 80%)', WebkitMaskImage: 'radial-gradient(circle at center, black, transparent 80%)' }}>
        </div>
        
        {/* TopNavBar */}
        <nav className="sticky top-0 w-full z-50 transition-all duration-300 bg-[#02050A]/70 backdrop-blur-xl border-b border-white/[0.05]">
          <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md overflow-hidden flex items-center justify-center bg-brand-surface border border-white/10 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
                <img src="/logo.png" alt="Precept Logo" className="w-full h-full object-cover" width={36} height={36} fetchpriority="high" />
              </div>
              <div>
                <span className="font-heading font-semibold text-lg tracking-tight text-white">Precept</span>
              </div>
            </div>
            {/* Links */}
            <div className="hidden md:flex items-center gap-8">
              <a className="text-brand-text-muted hover:text-white font-mono text-[13px] transition-colors duration-200" href="#features">Features</a>
              <a className="text-brand-text-muted hover:text-white font-mono text-[13px] transition-colors duration-200" href="#roadmap">Roadmap</a>
              <StatusBadge />
            </div>
            {/* Action */}
            <div className="flex items-center gap-5">
              <button 
                onClick={() => navigate('/login')}
                className="text-brand-text-muted font-mono text-[13px] hover:text-white transition-colors cursor-pointer hidden sm:block"
              >
                Sign In
              </button>
              <button 
                onClick={handleGetStarted}
                className="group relative px-5 py-2 rounded-md bg-brand-primary text-[#02050A] font-mono text-[13px] font-bold overflow-hidden transition-transform active:scale-95 cursor-pointer"
              >
                <span className="relative z-10 flex items-center gap-2">Initialize <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              </button>
            </div>
          </div>
        </nav>
        
        <main className="relative z-10 pb-24 px-6 max-w-7xl mx-auto flex flex-col gap-32">
          
          {/* Hero Section */}
          <motion.section 
            style={{ y: yHero, opacity: opacityHero }}
            className="flex flex-col items-center text-center gap-8 max-w-4xl mx-auto mt-20"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-mono shadow-[0_0_20px_rgba(20,184,166,0.15)]"
            >
              <Activity size={14} />
              <span>JobHunt OS is Live</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.21, 1.02, 0.73, 1] }}
              className="text-5xl md:text-[80px] md:leading-[1.05] font-heading font-bold text-white tracking-tight"
            >
              Engineer Your Next <br/>
              <span className="relative inline-block">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-emerald-300">Career Move</span>
                <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-50"></div>
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.21, 1.02, 0.73, 1] }}
              className="text-brand-text-muted font-sans text-lg md:text-xl max-w-2xl mt-4 leading-relaxed font-light"
            >
              <TypewriterText 
                text="The career management platform built specifically for developers. Catalog your technical stories, orchestrate your interview prep, and track your entire job hunt pipeline from a single command center."
                delay={1.0}
              />
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.21, 1.02, 0.73, 1] }}
              className="flex flex-col sm:flex-row items-center gap-4 mt-8"
            >
              <button 
                onClick={handleGetStarted}
                className="w-full sm:w-auto bg-brand-primary text-[#02050A] font-mono text-sm px-8 py-3.5 rounded-md hover:bg-[#109a8a] transition-all font-bold shadow-[0_0_30px_rgba(20,184,166,0.3)] hover:shadow-[0_0_40px_rgba(20,184,166,0.5)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Terminal size={16} /> Deploy Strategy
              </button>
              <a href="#features" className="w-full sm:w-auto bg-white/[0.03] border border-white/10 text-white font-mono text-sm px-8 py-3.5 rounded-md hover:bg-white/[0.08] transition-colors flex items-center justify-center gap-2 cursor-pointer backdrop-blur-md">
                <LayoutDashboard size={16} /> Explore Architecture
              </a>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="mt-16 flex items-center gap-8 font-mono text-[11px] text-brand-text-muted/70 uppercase tracking-widest"
            >
              <div className="flex items-center gap-2"><Lock size={14} className="text-brand-primary" /> JWT Secured</div>
              <div className="w-1 h-1 rounded-full bg-white/20"></div>
              <div className="flex items-center gap-2"><Database size={14} className="text-emerald-400" /> PostgreSQL</div>
              <div className="w-1 h-1 rounded-full bg-white/20"></div>
              <div className="flex items-center gap-2"><Zap size={14} className="text-teal-400" /> .NET + React</div>
            </motion.div>
          </motion.section>
          
          {/* Asymmetrical Showcase Section */}
          <section id="features" className="flex flex-col gap-8">
            <FadeIn>
              <div className="flex flex-col md:flex-row gap-8 items-stretch">
                {/* Application Tracker - Large Panel */}
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="flex-1 rounded-2xl bg-[#090D14] border border-white/[0.06] p-8 relative overflow-hidden group shadow-2xl"
                >
                  <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/5 rounded-full blur-[100px] -mr-20 -mt-20 transition-opacity group-hover:opacity-100 opacity-50 pointer-events-none"></div>
                  
                  <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#121A26] border border-white/10 flex items-center justify-center">
                        <LayoutDashboard className="text-brand-primary" size={24} />
                      </div>
                      <div>
                        <h3 className="font-heading text-2xl font-bold text-white">Application Tracker</h3>
                        <p className="text-brand-text-muted text-sm mt-1">Live pipeline metrics.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4 relative z-10">
                    <div className="group/item flex items-center justify-between p-5 bg-[#121A26]/80 hover:bg-[#1A2332] transition-colors rounded-xl border border-white/[0.04]">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-lg bg-[#090D14] flex items-center justify-center border border-white/5 group-hover/item:border-brand-primary/30 transition-colors">
                          <Building2 size={20} className="text-brand-text-muted group-hover/item:text-brand-primary transition-colors" />
                        </div>
                        <div>
                          <h4 className="font-heading font-semibold text-white text-lg">Senior Frontend Engineer</h4>
                          <p className="text-brand-text-muted text-sm font-sans mt-0.5">Stripe • San Francisco</p>
                        </div>
                      </div>
                      <span className="bg-[#121A26] text-white px-4 py-2 rounded-lg text-xs font-mono font-medium border border-white/10 hidden sm:block shadow-inner">Technical Screen</span>
                    </div>
                    
                    <div className="group/item flex items-center justify-between p-5 bg-[#121A26]/80 hover:bg-[#1A2332] transition-colors rounded-xl border border-white/[0.04]">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-lg bg-[#090D14] flex items-center justify-center border border-white/5 group-hover/item:border-brand-primary/30 transition-colors">
                          <Cloud size={20} className="text-brand-text-muted group-hover/item:text-brand-primary transition-colors" />
                        </div>
                        <div>
                          <h4 className="font-heading font-semibold text-white text-lg">Staff Cloud Architect</h4>
                          <p className="text-brand-text-muted text-sm font-sans mt-0.5">Vercel • Remote</p>
                        </div>
                      </div>
                      <span className="bg-brand-primary/10 text-brand-primary px-4 py-2 rounded-lg text-xs font-mono font-medium border border-brand-primary/20 hidden sm:block shadow-[0_0_15px_rgba(20,184,166,0.1)]">Offer Extended</span>
                    </div>
                  </div>
                </motion.div>

                {/* Skill Matrix - Tall Side Panel */}
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="w-full md:w-[350px] rounded-2xl bg-[#090D14] border border-white/[0.06] p-8 flex flex-col relative overflow-hidden group shadow-2xl"
                >
                  <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-emerald-900/10 to-transparent pointer-events-none"></div>
                  
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-[#121A26] border border-white/10 flex items-center justify-center">
                      <Target className="text-emerald-400" size={24} />
                    </div>
                    <div>
                      <h3 className="font-heading text-2xl font-bold text-white">Skill Matrix</h3>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-6 flex-1 justify-center">
                    {[
                      { name: 'React / Next.js', level: 'Expert', val: '90%', color: 'bg-emerald-400' },
                      { name: 'TypeScript', level: 'Advanced', val: '80%', color: 'bg-emerald-400' },
                      { name: 'System Design', level: 'Intermediate', val: '60%', color: 'bg-brand-text-muted' }
                    ].map((skill, i) => (
                      <div key={i} className="flex flex-col gap-2">
                        <div className="flex justify-between text-[13px] font-mono">
                          <span className="text-white">{skill.name}</span>
                          <span className="text-brand-text-muted">{skill.level}</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#1A2332] rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            whileInView={{ width: skill.val }}
                            transition={{ duration: 1, delay: i * 0.2 }}
                            className={`h-full ${skill.color} rounded-full`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="flex flex-col md:flex-row gap-8 items-stretch">
                {/* Tech Story Bank - Focus Panel */}
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="flex-[3] rounded-2xl bg-gradient-to-br from-[#090D14] to-[#0A0F18] border border-white/[0.06] p-8 relative overflow-hidden shadow-2xl"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                      <Code2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-heading text-2xl font-bold text-white">Technical Story Bank</h3>
                      <p className="text-brand-text-muted text-sm mt-1">Catalog runnable code and patterns.</p>
                    </div>
                  </div>
                  
                  <div className="bg-[#05080C] rounded-xl border border-white/[0.05] overflow-hidden shadow-inner">
                    <div className="flex items-center px-4 py-3 border-b border-white/[0.05] bg-[#0A0F18]">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                      </div>
                      <div className="ml-4 font-mono text-xs text-brand-text-muted/70 flex items-center gap-2">
                        <Code size={12} /> RedisCache.cs
                      </div>
                    </div>
                    <div className="p-5 font-mono text-[13px] leading-relaxed text-brand-text-muted overflow-x-auto">
                      <span className="text-brand-primary">await</span> _cache.SetAsync(key, data, <br/>
                      &nbsp;&nbsp;<span className="text-emerald-300">TimeSpan</span>.FromMinutes(<span className="text-yellow-200">15</span>)); <br/>
                      <span className="text-brand-primary">await</span> _bus.PublishAsync(<span className="text-teal-200">"cache:invalidate"</span>, key);
                    </div>
                  </div>
                  
                  <button onClick={() => navigate('/story-bank')} className="mt-6 bg-[#121A26] border border-white/10 text-white font-mono text-sm px-6 py-3 rounded-lg hover:bg-[#1A2332] transition-colors cursor-pointer flex items-center gap-2 hover:border-brand-primary/30">
                    <Terminal size={16} className="text-brand-primary" /> Open Technical Bank
                  </button>
                </motion.div>

                {/* Behavioral Story - Focus Panel */}
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="flex-[2] rounded-2xl bg-[#090D14] border border-white/[0.06] p-8 relative overflow-hidden shadow-2xl"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <BrainCircuit size={24} />
                    </div>
                    <div>
                      <h3 className="font-heading text-2xl font-bold text-white">Behavioral Bank</h3>
                      <p className="text-brand-text-muted text-sm mt-1">STAR method narratives.</p>
                    </div>
                  </div>
                  
                  <div className="bg-[#121A26] rounded-xl border border-white/[0.05] p-5 space-y-4">
                    <div className="font-heading font-semibold text-white">Navigating a Critical Outage</div>
                    <div className="grid grid-cols-4 gap-2 text-[11px] font-mono">
                      {['Situation', 'Task', 'Action', 'Result'].map((label, i) => (
                        <div key={label} className="flex flex-col items-center gap-2">
                          <div className={`w-full h-1 rounded-full ${i <= 2 ? 'bg-purple-500/40' : 'bg-[#2A3342]'}`}></div>
                          <span className="text-brand-text-muted">{label[0]}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-brand-text-muted text-xs leading-relaxed">Map experiences to core leadership principles. Never freeze during a behavioral round.</p>
                  </div>
                </motion.div>
              </div>
            </FadeIn>
          </section>
          
          {/* Engine Section */}
          <section className="flex flex-col gap-12 mt-16">
            <FadeIn>
              <div className="text-center max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-white/70 text-xs font-mono mb-6 backdrop-blur-md">
                  <Sparkles size={14} className="text-brand-primary" /> Core Engine
                </div>
                <h2 className="font-heading text-4xl font-bold mb-4 text-white">Data-Driven Preparation</h2>
                <p className="text-brand-text-muted font-sans text-lg font-light">Centralize your career progression. Match your capabilities against job descriptions instantly.</p>
              </div>
            </FadeIn>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: <LineChart size={24} className="text-brand-primary" />, title: "Dynamic Skill Matrix", desc: "Visualize your tech stack proficiencies. Identify gaps in your knowledge and track progression." },
                { icon: <Sparkles size={24} className="text-emerald-400" />, title: "JD Matcher", desc: "Paste a job description and instantly align your skills, identify missing keywords, and verify match score." },
                { icon: <GitBranch size={24} className="text-teal-400" />, title: "Funnel Tracking", desc: "Treat your job hunt like a sales pipeline. Track conversion rates from application to offer." }
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="bg-[#090D14] border border-white/[0.06] p-8 rounded-2xl flex flex-col gap-5 hover:border-white/10 transition-colors h-full">
                    <div className="w-12 h-12 rounded-xl bg-[#121A26] border border-white/5 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <h3 className="font-heading text-xl font-bold text-white">{item.title}</h3>
                    <p className="text-brand-text-muted text-sm font-sans leading-relaxed font-light">
                      {item.desc}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </section>
          
          {/* Roadmap */}
          <section id="roadmap" className="flex flex-col gap-12 pt-16 border-t border-white/[0.05]">
            <FadeIn>
              <div className="text-center max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono mb-6">
                  <FlaskConical size={14} /> Coming in R2
                </div>
                <h2 className="font-heading text-4xl font-bold mb-4 text-white">AI-Powered Intelligence</h2>
                <p className="text-brand-text-muted font-sans text-lg font-light">The next evolution of Precept. Intelligent automation that transforms how you prepare.</p>
              </div>
            </FadeIn>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: <Bot size={24} />, title: "Mock Interviewer", color: "text-brand-primary" },
                { icon: <Mic size={24} />, title: "Voice Simulation", color: "text-emerald-400" },
                { icon: <FileText size={24} />, title: "Resume Analyzer", color: "text-purple-400" }
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="bg-gradient-to-b from-[#090D14] to-[#05080C] border border-white/[0.06] p-8 rounded-2xl flex flex-col gap-5 h-full relative overflow-hidden group">
                    <div className={`absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                    <div className="w-12 h-12 rounded-xl bg-[#121A26] border border-white/5 flex items-center justify-center">
                      <div className={item.color}>{item.icon}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading text-xl font-bold text-white">{item.title}</h3>
                      <span className="text-[10px] font-mono text-white/30 border border-white/10 px-2 py-0.5 rounded">R2</span>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </section>

          {/* Final CTA */}
          <FadeIn>
            <section className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#090D14] to-[#02050A] border border-white/[0.08] p-16 text-center shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-primary/10 via-transparent to-transparent pointer-events-none"></div>
              <h2 className="font-heading text-4xl md:text-5xl font-bold z-10 relative text-white tracking-tight">Ready to Initialize?</h2>
              <p className="text-brand-text-muted font-sans text-lg max-w-2xl w-full mx-auto z-10 relative font-light mt-8">Start using Precept today and manage your career progression with the precision of a senior engineer.</p>
              <button 
                onClick={handleGetStarted}
                className="bg-brand-primary text-[#02050A] font-mono font-bold text-sm px-10 py-4 rounded-md hover:bg-[#109a8a] transition-all shadow-[0_0_30px_rgba(20,184,166,0.3)] z-10 relative cursor-pointer mt-8"
              >
                Start Operating System
              </button>
            </section>
          </FadeIn>
        </main>
        
        {/* Footer */}
        <footer className="bg-[#02050A] w-full border-t border-white/[0.05] relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 px-6 py-20 max-w-7xl mx-auto">
            <div className="flex flex-col gap-5 col-span-1 md:col-span-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md overflow-hidden flex items-center justify-center bg-[#121A26] border border-white/10">
                  <img src="/logo.png" alt="Precept Logo" className="w-full h-full object-cover" width={32} height={32} />
                </div>
                <span className="font-heading font-semibold text-lg text-white">Precept</span>
              </div>
              <p className="text-brand-text-muted font-sans text-sm font-light">
                A full-stack career platform for developers who treat their job hunt like an engineering problem.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="font-mono text-[11px] text-white/50 uppercase tracking-widest">Product</h4>
              <a className="text-brand-text-muted hover:text-white font-sans text-sm transition-colors" href="#">Documentation</a>
              <a className="text-brand-text-muted hover:text-white font-sans text-sm transition-colors" href="#">API Reference</a>
              <a className="text-brand-text-muted hover:text-white font-sans text-sm transition-colors" href="#">Changelog</a>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="font-mono text-[11px] text-white/50 uppercase tracking-widest">Connect</h4>
              <a href="https://github.com/austinchima/Precept" className="text-brand-text-muted hover:text-white font-sans text-sm transition-colors flex items-center gap-2">
                <Github size={16} /> GitHub
              </a>
              <a href="https://www.linkedin.com/in/austin-chima" className="text-brand-text-muted hover:text-white font-sans text-sm transition-colors flex items-center gap-2">
                <Linkedin size={16} /> LinkedIn
              </a>
            </div>
          </div>
          <div className="border-t border-white/[0.05] px-6 py-6 max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
             <p className="text-brand-text-muted/50 font-mono text-xs">© 2026 Precept. MIT License.</p>
             <StatusBadge />
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
