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
    <div className="flex flex-col gap-xl fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-sm mb-xs">
          <span className="font-label-caps text-label-caps text-primary tracking-widest uppercase">System Licenses</span>
          <div className="h-[1px] w-12 bg-primary/30"></div>
        </div>
        <h2 className="font-h2 text-h2 text-on-surface">Subscription Protocol</h2>
        <p className="font-code text-code text-on-surface-variant mt-sm max-w-2xl">
          Upgrade your authorization levels to unlock advanced semantic search matrices, unlimited JD matching, and automated career pipeline telemetry.
        </p>
      </div>

      {/* Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter items-stretch">
        {plans.map((plan) => (
          <div 
            key={plan.name}
            className={`flex flex-col bg-surface-container border p-md md:p-lg rounded-xl relative overflow-hidden group transition-all duration-300 ${
              plan.popular 
                ? 'border-primary shadow-[0_0_30px_rgba(90,215,231,0.1)]' 
                : 'border-outline-variant hover:border-primary/40'
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 right-0 bg-primary text-on-primary-fixed font-label-caps text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                Recommended
              </div>
            )}
            
            <div className="mb-md">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest block mb-2">
                {plan.name}
              </span>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="font-h1 text-[40px] font-bold text-on-surface leading-none">
                  {plan.price}
                </span>
                <span className="font-code text-[12px] text-on-surface-variant">
                  / {plan.period}
                </span>
              </div>
              <p className="text-sm text-on-surface-variant font-sans leading-relaxed mt-2 min-h-[40px]">
                {plan.tagline}
              </p>
            </div>

            <hr className="border-outline-variant/30 my-sm w-full" />

            <div className="flex-1 flex flex-col gap-sm my-md">
              <span className="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-wider block mb-1">
                Authorization Specs
              </span>
              <ul className="flex flex-col gap-sm">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-sm text-sm text-on-surface">
                    <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">check_circle</span>
                    <span className="font-sans leading-normal">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              disabled={plan.active}
              className={`w-full font-code text-code py-sm px-md rounded-lg transition-all flex items-center justify-center gap-sm mt-md border cursor-pointer ${
                plan.active
                  ? 'bg-surface-bright/50 border-outline-variant/50 text-on-surface-variant/60 cursor-default'
                  : plan.popular
                    ? 'bg-primary-container border-primary-container text-on-primary-fixed hover:bg-primary'
                    : 'bg-transparent border-outline-variant text-on-surface hover:border-primary hover:text-primary'
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
