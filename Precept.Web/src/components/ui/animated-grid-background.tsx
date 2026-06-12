import React, { useEffect, useRef } from 'react';

export const AnimatedGridBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      container.style.setProperty('--mouse-x', `${x}px`);
      container.style.setProperty('--mouse-y', `${y}px`);
    };

    container.addEventListener('mousemove', handleMouseMove);
    return () => container.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full min-h-screen overflow-hidden bg-brand-secondary text-brand-text selection:bg-brand-primary/30"
    >
      {/* Ambient Floating Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-brand-primary/10 rounded-full blur-[120px] animate-orb-drift mix-blend-screen opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-500/10 rounded-full blur-[100px] animate-orb-drift-reverse mix-blend-screen opacity-30" />
      </div>

      {/* Base Subtle Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20 z-0"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--color-brand-border) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Interactive Spotlight Grid */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-300"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--color-brand-primary) 1.5px, transparent 0)`,
          backgroundSize: '40px 40px',
          WebkitMaskImage: `radial-gradient(400px circle at var(--mouse-x, -500px) var(--mouse-y, -500px), black, transparent)`,
          maskImage: `radial-gradient(400px circle at var(--mouse-x, -500px) var(--mouse-y, -500px), black, transparent)`,
        }}
      />
      
      {/* Foreground Content */}
      <div className="relative z-10 w-full min-h-screen flex flex-col lg:flex-row">
        {children}
      </div>
    </div>
  );
};
