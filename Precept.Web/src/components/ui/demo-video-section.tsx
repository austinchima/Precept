import React, { useRef, useEffect, useState } from 'react';

export default function DemoVideoSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLImageElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.15 }
    );
    const { current } = sectionRef;
    if (current) observer.observe(current);
    return () => {
      if (current) observer.unobserve(current);
    };
  }, []);

  return (
    <section
      id="demo"
      ref={sectionRef}
      className={`relative py-24 px-6 transition-all duration-1000 transform ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
      }`}
    >
      {/* Subtle radial glow behind the browser frame */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[80%] h-[80%] bg-brand-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Section Label */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-5 rounded-full border border-brand-primary/30 bg-brand-primary/10 text-brand-primary font-mono text-xs uppercase tracking-widest">
            <span className="material-symbols-outlined text-[14px]">play_circle</span>
            Live Demo
          </div>
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-white mb-3">
            See It in Action
          </h2>
          <p className="font-mono text-brand-text-muted text-sm w-full max-w-2xl mx-auto">
            A full walkthrough of account creation, story cataloging, and pipeline tracking.
          </p>
        </div>

        {/* Browser Chrome Mockup */}
        <div className="rounded-xl overflow-hidden border border-brand-border/60 bg-[#0a1929] shadow-2xl shadow-brand-primary/10">
          {/* Title Bar */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#0d1f35] border-b border-brand-border/40">
            {/* Traffic Light Dots */}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <span className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            {/* URL Bar */}
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-2 px-4 py-1 rounded-md bg-brand-surface/50 border border-brand-border/30 max-w-sm w-full">
                <span className="material-symbols-outlined text-[14px] text-green-500">lock</span>
                <span className="font-mono text-xs text-brand-text-muted truncate">
                  precept.local
                </span>
              </div>
            </div>
            {/* Spacer to balance the dots */}
            <div className="w-[52px]" />
          </div>

          {/* Video Content */}
          <div className="relative bg-[#030811]">
            <img
              ref={videoRef}
              src="/precept_end_to_end_demo_1781291141131.webp"
              alt="Precept application demo showing account creation, story bank, and pipeline tracking"
              className="w-full h-auto block"
              width={1920}
              height={1080}
              style={{ aspectRatio: '16/9' }}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
