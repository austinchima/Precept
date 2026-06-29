import React from 'react';
import { Check, ArrowUpRight, ShieldCheck } from 'lucide-react';

const C = {
  bg0: '#02050A', bg1: '#06090F', bg2: '#0B0F17', bg3: '#11161F',
  ink: '#E6EBF2', inkDim: '#9CA8B8', inkMute: '#5A6678',
  hair: 'rgba(255,255,255,0.07)', hair2: 'rgba(255,255,255,0.12)',
  teal: '#2dd4bf', tealDim: 'rgba(45,212,191,0.14)',
  violet: '#8b5cf6', rose: '#f43f5e', amber: '#f59e0b', sky: '#38bdf8', emerald: '#10b981',
} as const;

interface Plan {
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  cta: string;
  popular?: boolean;
  active?: boolean;
}

const Eyebrow = ({ children, color = C.teal }: { children: React.ReactNode; color?: string }) => (
  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em]"
    style={{ background: `${color}14`, border: `1px solid ${color}33`, color }}>
    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
    {children}
  </span>
);

export default function Subscription() {
  const plans: Plan[] = [
    {
      name: 'Free Protocol',
      price: '$0',
      period: 'forever',
      tagline: 'Basic telemetry for manual applications.',
      features: [
        'Track up to 15 Applications',
        '5 Manual Job Description Matches',
        'Standard Story Bank Storage (10 items)',
        'Basic Quiz Retrieval Mode',
      ],
      cta: 'Current active plan',
      active: true,
    },
    {
      name: 'Pro Protocol',
      price: '$15',
      period: 'per month',
      tagline: 'Automated analysis and unlimited tracking.',
      features: [
        'Unlimited Active Application Tracking',
        'Unlimited Gemini-Powered JD Scanning',
        'Advanced Story Bank (Unlimited items)',
        'Speech-to-Text Voice Quiz Integration',
        'Automated Resume Bullet Optimizer',
        'Priority AI Agent API Queue access',
      ],
      cta: 'Upgrade protocol',
      popular: true,
    },
    {
      name: 'Enterprise Core',
      price: 'Custom',
      period: 'tailored billing',
      tagline: 'High-scale search optimization for teams.',
      features: [
        'Multiple User Workspace Syncing',
        'Custom API Heuristics & Weights',
        'Shared Team Story Banks & Assets',
        'Dedicated Mock Interview Agent',
        'Unlimited Telemetry & Logs Export',
        '24/7 Priority Support Core',
      ],
      cta: 'Establish connection',
    },
  ];

  return (
    <div className="font-body p-4 md:p-8 pt-4 md:pt-6 max-w-[1200px] mx-auto space-y-8" data-testid="subscription-page" style={{ color: C.ink }}>
      <div className="opacity-0 animate-fade-in-up">
        <Eyebrow color={C.violet}>System licenses</Eyebrow>
        <h1 className="mt-4 font-display font-bold leading-[1.05]" style={{ color: C.ink, fontSize: 'clamp(28px,4vw,40px)' }}>
          Subscription <span className="font-editorial" style={{ color: C.violet, fontWeight: 400 }}>protocol.</span>
        </h1>
        <p className="mt-2 font-body text-[14.5px] max-w-2xl" style={{ color: C.inkDim }}>
          Upgrade authorization levels to unlock semantic search matrices, unlimited JD matching, and automated pipeline telemetry.
        </p>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch opacity-0 animate-fade-in-up delay-200">
        {plans.map((plan, i) => (
          <div
            key={plan.name}
            className="relative flex flex-col p-7 overflow-hidden transition-all duration-300 group"
            style={{
              background: plan.popular
                ? `linear-gradient(180deg, ${C.bg2} 0%, ${C.bg1} 100%)`
                : `linear-gradient(180deg, ${C.bg1} 0%, ${C.bg0} 100%)`,
              border: `1px solid ${plan.popular ? `${C.teal}55` : C.hair}`,
              borderRadius: 22,
              boxShadow: plan.popular ? `0 30px 60px -20px ${C.tealDim}, inset 0 1px 0 rgba(255,255,255,0.05)` : '0 1px 0 rgba(255,255,255,0.04) inset',
              animationDelay: `${i * 0.1}s`,
            }}
          >
            {plan.popular && (
              <>
                <div className="pointer-events-none absolute -top-24 -right-20 h-44 w-44 rounded-full"
                  style={{ background: `radial-gradient(circle, ${C.tealDim}, transparent 70%)`, filter: 'blur(4px)' }} />
                <span
                  className="absolute top-5 right-5 font-mono text-[9.5px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full"
                  style={{ background: C.teal, color: C.bg0, boxShadow: `0 0 12px ${C.teal}55` }}
                >
                  Recommended
                </span>
              </>
            )}

            <div className="mb-5 relative">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] block mb-2.5" style={{ color: C.inkMute }}>
                {plan.name}
              </span>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="font-display font-bold leading-none" style={{ color: C.ink, fontSize: 'clamp(36px,4vw,44px)' }}>
                  {plan.price}
                </span>
                <span className="font-mono text-[11px]" style={{ color: C.inkMute }}>/ {plan.period}</span>
              </div>
              <p className="font-body text-[13px] leading-relaxed mt-1.5 min-h-[40px]" style={{ color: C.inkDim }}>
                {plan.tagline}
              </p>
            </div>

            <hr className="w-full my-3" style={{ borderColor: C.hair }} />

            <div className="flex-1 flex flex-col gap-4 my-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] block" style={{ color: C.inkMute }}>
                Authorization specs
              </span>
              <ul className="flex flex-col gap-2.5">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 font-body text-[13px]" style={{ color: C.ink }}>
                    <Check size={14} strokeWidth={2.5} style={{ color: plan.popular ? C.teal : C.inkDim }} className="shrink-0 mt-0.5" />
                    <span className="leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              disabled={plan.active}
              data-testid={`subscription-cta-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full py-3 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] transition-all cursor-pointer disabled:cursor-default disabled:opacity-70"
              style={
                plan.active
                  ? { background: 'rgba(255,255,255,0.025)', color: C.inkDim, border: `1px solid ${C.hair2}` }
                  : plan.popular
                    ? { background: C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${C.ink}, 0 18px 60px -20px rgba(45,212,191,0.45)` }
                    : { background: 'transparent', color: C.ink, border: `1px solid ${C.hair2}` }
              }
            >
              {plan.active ? <ShieldCheck size={12} /> : null}
              {plan.cta}
              {!plan.active && <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5" />}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
