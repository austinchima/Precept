import React, { useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from 'react-router-dom';

const TypewriterText = ({ text, className, delay = 0 }: { text: string, className?: string, delay?: number }) => {
  const characters = text.split("");
  return (
    <span className={className}>
      {characters.map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, display: "none" }}
          animate={{ opacity: 1, display: "inline" }}
          transition={{ duration: 0.01, delay: delay + index * 0.03 }}
        >
          {char}
        </motion.span>
      ))}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        className="inline-block w-[2px] h-[1em] bg-brand-primary ml-1 align-middle"
      />
    </span>
  );
};

export default function HeroShader() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  return (
    <section ref={containerRef} className="relative h-screen w-full bg-[#030811] overflow-hidden border-b border-brand-border/50">
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(50,185,200,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(50,185,200,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)] z-0" />

      {/* Ambient Aurora Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
        <div className="absolute w-[50vw] h-[50vw] max-w-[800px] max-h-[800px] rounded-full bg-brand-primary/20 blur-[120px] mix-blend-screen animate-orb-drift" />
        <div className="absolute w-[60vw] h-[60vw] max-w-[1000px] max-h-[1000px] rounded-full bg-blue-600/10 blur-[150px] mix-blend-screen animate-orb-drift-reverse" />
      </div>

      <svg className="absolute inset-0 w-0 h-0 z-0">
        <defs>
          <filter id="text-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <main className="relative z-20 h-full max-w-4xl mx-auto flex flex-col items-center justify-center text-center px-6">
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-brand-primary/30 bg-brand-primary/10 text-brand-primary font-mono text-xs uppercase tracking-widest backdrop-blur-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <span className="material-symbols-outlined text-[14px]">terminal</span>
          Command Center Active
        </motion.div>

        <motion.h1
          className="font-heading font-bold text-6xl md:text-8xl lg:text-9xl tracking-tighter mb-6 text-white leading-none drop-shadow-2xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          ENGINEER YOUR <br/>
          <motion.span
            className="block mt-2 font-light text-transparent bg-clip-text"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #32b9c8 40%, #1d4ed8 70%, #ffffff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              backgroundSize: "200% auto",
              filter: "url(#text-glow)",
            }}
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            CAREER
          </motion.span>
        </motion.h1>

        <div className="min-h-[6rem] md:min-h-[5rem] mb-12"> {/* Fixed height wrapper to prevent layout shift during typing */}
          <TypewriterText 
            text="A private, fullstack job-hunting command center for the modern developer. Master your stories, track your pipeline, and close skill gaps with precision."
            className="text-lg md:text-xl text-white/80 font-mono leading-relaxed max-w-2xl font-light block"
            delay={1.2}
          />
        </div>

        <motion.div
          className="flex flex-col sm:flex-row items-center gap-6 font-mono mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 5.5 }}
        >
          <motion.button 
            onClick={() => navigate('/login')}
            className="px-8 py-4 bg-brand-primary text-brand-secondary rounded-md font-bold text-lg cursor-pointer shadow-[0_0_30px_rgba(50,185,200,0.3)] flex items-center justify-center gap-2"
            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(50,185,200,0.5)" }}
            whileTap={{ scale: 0.95 }}
          >
            Get Started
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </motion.button>
          <motion.button 
            className="px-8 py-4 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-md font-medium text-lg flex items-center justify-center gap-2 cursor-pointer hover:bg-white/20 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="material-symbols-outlined text-brand-primary">play_circle</span>
            Watch Demo
          </motion.button>
        </motion.div>
      </main>
    </section>
  );
}
