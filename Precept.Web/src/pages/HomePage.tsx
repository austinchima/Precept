import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroShader from '../components/ui/hero-shader';
import { useAuth } from '../AuthContext';

// Custom hook for scroll reveal animations
function useScrollReveal() {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setIsVisible(true);
        });
      },
      { threshold: 0.1 }
    );
    const { current } = domRef;
    if (current) observer.observe(current);
    return () => {
      if (current) observer.unobserve(current);
    };
  }, []);

  return { ref: domRef, isVisible };
}

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const featuresReveal = useScrollReveal();
  const securityReveal = useScrollReveal();
  
  const [systemStatus, setSystemStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const handleFeatureClick = (path: string) => {
    if (isAuthenticated) {
      navigate(path);
    } else {
      navigate('/login');
    }
  };

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
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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
      <div className={`flex items-center gap-2 px-3 py-1 bg-[#06101c] rounded-full border border-brand-border/50 hover:border-brand-primary/50 transition-colors ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-[pulse_2s_infinite]"></span>
        <span className="text-xs font-mono text-brand-text-muted">All Systems Operational</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#030811] text-brand-text font-sans overflow-hidden selection:bg-brand-primary/30 relative">

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-brand-secondary/80 backdrop-blur-md border-b border-brand-border/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded overflow-hidden flex items-center justify-center bg-brand-surface border border-brand-border/50">
              <img src="/logo.png" alt="Precept Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-heading font-bold text-xl tracking-tight text-brand-text">Precept</span>
              <span className="block font-mono text-[10px] text-brand-text-muted uppercase tracking-wider">JobHunt OS</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-sm font-mono text-brand-text-muted">
              <a href="#features" className="hover:text-brand-primary transition-colors duration-300">Features</a>
              <a href="#security" className="hover:text-brand-primary transition-colors duration-300">Security</a>
              <StatusBadge className="cursor-pointer" />
            </div>
            <button 
              onClick={() => navigate('/login')}
              className="text-brand-text font-mono font-medium hover:text-brand-primary transition-colors duration-300 cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="bg-brand-primary text-brand-secondary font-mono font-bold px-6 py-2.5 rounded-md hover:bg-brand-primary-container transition-all duration-300 hover:shadow-[0_0_20px_rgba(50,185,200,0.4)] hover:-translate-y-0.5 cursor-pointer"
            >
              Initialize
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <HeroShader />

      {/* Trust & Security */}
      <section id="security" ref={securityReveal.ref} className={`py-12 border-y border-brand-border/30 bg-[#06101c]/50 backdrop-blur-sm transition-all duration-1000 transform ease-out relative ${securityReveal.isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 via-transparent to-transparent pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-12 font-mono text-sm text-brand-text-muted relative z-10">
          <div className="flex items-center gap-3 hover:text-brand-text transition-colors duration-300 cursor-default">
            <span className="material-symbols-outlined text-brand-primary">lock</span>
            Secure & Encrypted
          </div>
          <div className="hidden md:block w-1 h-1 rounded-full bg-brand-border"></div>
          <div className="flex items-center gap-3 hover:text-brand-text transition-colors duration-300 cursor-default">
            <span className="material-symbols-outlined text-brand-primary">visibility_off</span>
            100% Private
          </div>
          <div className="hidden md:block w-1 h-1 rounded-full bg-brand-border"></div>
          <div className="flex items-center gap-3 hover:text-brand-text transition-colors duration-300 cursor-default">
            <span className="material-symbols-outlined text-brand-primary">dns</span>
            Local-First Architecture
          </div>
        </div>
      </section>

      {/* Features Bento Grid Showcase */}
      <section id="features" ref={featuresReveal.ref} className={`py-32 px-6 max-w-7xl mx-auto transition-all duration-1000 transform ease-out ${featuresReveal.isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'}`}>
        <div className="text-left mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 font-mono text-xs uppercase tracking-widest">
            <span className="material-symbols-outlined text-[14px]">grid_view</span>
            Core Modules
          </div>
          <h2 className="font-heading font-bold text-4xl md:text-5xl mb-4 text-white">Deploy Your Strategy</h2>
          <p className="font-mono text-brand-text-muted">Three powerful modules to orchestrate your job search.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Feature 1 - PRIMARY BENTO CARD (Spans 2 cols) */}
          <div 
            onClick={() => handleFeatureClick('/story-bank')}
            className="md:col-span-2 relative overflow-hidden p-8 bg-[#06101c]/80 backdrop-blur-md border border-brand-border/50 rounded-2xl shadow-sm hover:shadow-xl hover:border-brand-primary/50 transition-all duration-300 group cursor-pointer hover:-translate-y-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-8"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/10 rounded-bl-full -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-[1.5] ease-out"></div>
            
            <div className="flex-1 z-10 w-full">
              <div className="w-14 h-14 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mb-6 text-brand-primary shadow-[0_0_15px_rgba(50,185,200,0.1)] group-hover:shadow-[0_0_20px_rgba(50,185,200,0.3)] transition-shadow">
                <span className="material-symbols-outlined text-[28px]">auto_stories</span>
              </div>
              <h3 className="font-heading font-bold text-3xl mb-4 text-brand-text">Story Bank</h3>
              <p className="text-brand-text-muted font-sans text-lg mb-6 leading-relaxed max-w-2xl">
                Master your interview narratives with a dual-track system. Store complex <strong className="text-brand-primary font-normal">Technical Code Snippets</strong> to explain architecture decisions, and curate dedicated <strong className="text-brand-primary font-normal">Behavioral STAR Stories</strong> to ace culture-fit rounds with absolute confidence.
              </p>
              <div className="font-mono text-sm text-brand-primary flex items-center gap-2 uppercase tracking-wider font-bold mt-8 md:mt-0">
                Master Narratives <span className="material-symbols-outlined text-[18px] group-hover:translate-x-2 transition-transform duration-300">arrow_forward</span>
              </div>
            </div>
            
            {/* Subtle Watermark Graphic */}
            <div className="hidden md:flex flex-shrink-0 z-10 p-8 mr-8 items-center justify-center">
              <span className="material-symbols-outlined text-[140px] text-brand-primary/5 group-hover:text-brand-primary/20 transition-colors duration-500">auto_stories</span>
            </div>
          </div>

          {/* Feature 2 - STANDARD BENTO CARD */}
          <div 
            onClick={() => handleFeatureClick('/jd-matcher')}
            className="relative overflow-hidden p-8 bg-[#06101c]/80 backdrop-blur-md border border-brand-border/50 rounded-2xl shadow-sm hover:shadow-xl hover:border-blue-500/50 transition-all duration-300 group cursor-pointer hover:-translate-y-1 flex flex-col"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-[2.5] ease-out"></div>
            
            <div className="z-10 flex-1">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 text-blue-400 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-shadow">
                <span className="material-symbols-outlined text-[24px]">analytics</span>
              </div>
              <h3 className="font-heading font-bold text-2xl mb-3 text-brand-text">JD Matcher</h3>
              <p className="text-brand-text-muted font-sans mb-6">
                Stop applying blindly. Instantly parse job descriptions to identify exact skill gaps and align your profile with automated precision.
              </p>
            </div>
            <div className="font-mono text-xs text-blue-400 flex items-center gap-2 uppercase tracking-wider font-bold z-10 mt-auto">
              Analyze JDs <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform duration-300">arrow_forward</span>
            </div>
          </div>

          {/* Feature 3 - STANDARD BENTO CARD */}
          <div 
            onClick={() => handleFeatureClick('/applications')}
            className="relative overflow-hidden p-8 bg-[#06101c]/80 backdrop-blur-md border border-brand-border/50 rounded-2xl shadow-sm hover:shadow-xl hover:border-purple-500/50 transition-all duration-300 group cursor-pointer hover:-translate-y-1 flex flex-col"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-bl-full -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-[2.5] ease-out"></div>
            
            <div className="z-10 flex-1">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 text-purple-400 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-shadow">
                <span className="material-symbols-outlined text-[24px]">view_kanban</span>
              </div>
              <h3 className="font-heading font-bold text-2xl mb-3 text-brand-text">App Tracker</h3>
              <p className="text-brand-text-muted font-sans mb-6">
                Organize your pipeline with a tactical Kanban board designed specifically for the intricacies of multi-stage engineering interviews.
              </p>
            </div>
            <div className="font-mono text-xs text-purple-400 flex items-center gap-2 uppercase tracking-wider font-bold z-10 mt-auto">
              Track Pipeline <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform duration-300">arrow_forward</span>
            </div>
          </div>
        </div>
      </section>
      
      {/* Real Footer Implementation */}
      <footer className="border-t border-brand-border/30 bg-[#02050a] relative overflow-hidden">
        {/* Subtle top glow */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-primary/20 to-transparent"></div>
        
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 relative z-10">
          <div className="flex flex-col text-left max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded overflow-hidden flex items-center justify-center bg-brand-surface border border-brand-border/50">
                <img src="/logo.png" alt="Precept Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="font-heading font-bold text-xl tracking-tight text-white">Precept</span>
                <span className="block font-mono text-[10px] text-brand-text-muted uppercase tracking-wider">JobHunt OS</span>
              </div>
            </div>
            <p className="text-brand-text-muted font-sans text-sm leading-relaxed mb-8">
              A private, fullstack job-hunting command center for the modern developer. Master your stories, track your pipeline, and close skill gaps with precision.
            </p>
            <div className="flex items-center gap-4">
              {/* GitHub */}
              <a href="https://github.com/austinchima/Precept" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-brand-text-muted hover:text-white hover:bg-brand-primary/20 hover:border-brand-primary/30 transition-all">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              {/* LinkedIn */}
              <a href="https://www.linkedin.com/in/austin-chima" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-brand-text-muted hover:text-white hover:bg-[#0077B5]/20 hover:border-[#0077B5]/30 transition-all">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t border-brand-border/30 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs text-brand-text-muted">
            <p>© 2026 Precept JobHunt OS. All rights reserved.</p>
            <StatusBadge />
          </div>
        </div>
      </footer>
    </div>
  );
}
