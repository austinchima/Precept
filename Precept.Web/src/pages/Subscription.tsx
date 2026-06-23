import React from 'react';

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

export default function Subscription() {
  const plans: Plan[] = [
    {
      name: "Free Protocol",
      price: "$0",
      period: "forever",
      tagline: "Basic telemetry for manual applications.",
      features: [
        "Track up to 15 Applications",
        "5 Manual Job Description Matches",
        "Standard Story Bank Storage (10 items)",
        "Basic Quiz Retrieval Mode"
      ],
      cta: "Current Active Plan",
      active: true
    },
    {
      name: "Pro Protocol",
      price: "$15",
      period: "per month",
      tagline: "Automated analysis and unlimited tracking.",
      features: [
        "Unlimited Active Application Tracking",
        "Unlimited Gemini-Powered JD Scanning",
        "Advanced Story Bank (Unlimited items)",
        "Speech-to-Text Voice Quiz Integration",
        "Automated Resume Bullet Optimizer",
        "Priority AI Agent API Queue access"
      ],
      cta: "Upgrade Protocol",
      popular: true
    },
    {
      name: "Enterprise Core",
      price: "Custom",
      period: "tailored billing",
      tagline: "High-scale search optimization for teams.",
      features: [
        "Multiple User Workspace Syncing",
        "Custom API Heuristics & Weights",
        "Shared Team Story Banks & Assets",
        "Dedicated Mock Interview Agent",
        "Unlimited Telemetry & Logs Export",
        "24/7 Priority Support Core"
      ],
      cta: "Establish Connection"
    }
  ];

  return (
    <div className="flex flex-col gap-8 fade-in">
      {/* Header */}
      <div className="border-b border-brand-border pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-brand-primary tracking-widest uppercase">System Licenses</span>
          <div className="h-px w-12 bg-brand-primary/30"></div>
        </div>
        <h1 className="text-3xl font-heading font-bold text-brand-text tracking-tight">Subscription Protocol</h1>
        <p className="font-mono text-brand-text-muted text-sm mt-1 max-w-2xl">
          Upgrade your authorization levels to unlock advanced semantic search matrices, unlimited JD matching, and automated career pipeline telemetry.
        </p>
      </div>

      {/* Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {plans.map((plan) => (
          <div 
            key={plan.name}
            className={`glass-card flex flex-col p-6 rounded-xl relative overflow-hidden group transition-all duration-300 bg-[#151c26]/60 backdrop-blur-xl border ${
              plan.popular 
                ? 'border-brand-primary/50 shadow-[0_0_30px_rgba(90,215,231,0.15)]' 
                : 'border-white/5 hover:border-brand-primary/30'
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 right-0 bg-brand-primary text-[#050b14] font-mono text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                Recommended
              </div>
            )}
            
            <div className="mb-6">
              <span className="text-xs font-mono text-brand-text-muted uppercase tracking-widest block mb-2">
                {plan.name}
              </span>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-heading font-bold text-brand-text leading-none">
                  {plan.price}
                </span>
                <span className="font-mono text-xs text-brand-text-muted">
                  / {plan.period}
                </span>
              </div>
              <p className="text-sm text-brand-text-muted font-sans leading-relaxed mt-2 min-h-[40px]">
                {plan.tagline}
              </p>
            </div>

            <hr className="border-brand-border/40 my-4 w-full" />

            <div className="flex-1 flex flex-col gap-4 my-6">
              <span className="text-[11px] font-mono text-brand-text-muted uppercase tracking-wider block mb-1">
                Authorization Specs
              </span>
              <ul className="flex flex-col gap-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-brand-text">
                    <span className="material-symbols-outlined text-brand-primary text-[16px] shrink-0 mt-0.5">check_circle</span>
                    <span className="font-sans leading-normal">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              disabled={plan.active}
              className={`w-full font-mono text-xs py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 mt-auto border cursor-pointer uppercase tracking-wider font-bold ${
                plan.active
                  ? 'bg-brand-surface-high border-brand-border/50 text-brand-text-muted/60 cursor-default'
                  : plan.popular
                    ? 'bg-brand-primary border-brand-primary text-[#050b14] hover:bg-brand-primary-container'
                    : 'bg-transparent border-brand-border text-brand-text hover:border-brand-primary hover:text-brand-primary'
              }`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
