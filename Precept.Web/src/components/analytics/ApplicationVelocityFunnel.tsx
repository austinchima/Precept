import React from 'react';
import { Application } from '../../types';
import { GitBranch, Target, CheckCircle2, ArrowRight } from 'lucide-react';

interface ApplicationVelocityFunnelProps {
  applications: Application[];
}

export const ApplicationVelocityFunnel: React.FC<ApplicationVelocityFunnelProps> = ({
  applications,
}) => {
  const total = applications.length;

  const appliedCount = total;
  const screenCount = applications.filter((a) =>
    ['PhoneScreen', 'Interviewing', 'Offer'].includes(a.status)
  ).length;
  const interviewCount = applications.filter((a) =>
    ['Interviewing', 'Offer'].includes(a.status)
  ).length;
  const offerCount = applications.filter((a) => a.status === 'Offer').length;

  const screenRate = total > 0 ? ((screenCount / total) * 100).toFixed(0) : '0';
  const interviewRate = total > 0 ? ((interviewCount / total) * 100).toFixed(0) : '0';
  const offerRate = total > 0 ? ((offerCount / total) * 100).toFixed(0) : '0';

  const stages = [
    {
      label: 'Applications Sent',
      count: appliedCount,
      rate: '100%',
      color: '#38bdf8',
      desc: 'Top of funnel',
    },
    {
      label: 'Recruiter Screenings',
      count: screenCount,
      rate: `${screenRate}%`,
      color: '#818cf8',
      desc: `${screenRate}% conversion`,
    },
    {
      label: 'Technical & Rounds',
      count: interviewCount,
      rate: `${interviewRate}%`,
      color: '#2dd4bf',
      desc: `${interviewRate}% throughput`,
    },
    {
      label: 'Offers Extended',
      count: offerCount,
      rate: `${offerRate}%`,
      color: '#10b981',
      desc: `${offerRate}% win rate`,
    },
  ];

  return (
    <div
      className="p-5 rounded-2xl flex flex-col justify-between"
      style={{
        background: 'linear-gradient(180deg, #0B0F17 0%, #06090F 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch size={15} style={{ color: '#38bdf8' }} />
            <span className="font-mono text-[11px] uppercase tracking-widest text-slate-400">
              Pipeline Velocity
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-full font-mono text-[10.5px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
            {total} Applications Tracked
          </span>
        </div>

        <div className="mt-1 flex items-baseline gap-2">
          <h3 className="font-display text-xl font-bold text-slate-100">
            Application Conversion Funnel
          </h3>
          <span className="font-mono text-xs font-semibold text-sky-400">
            {offerRate}% Offer Velocity
          </span>
        </div>
      </div>

      {/* Conversion Stages */}
      <div className="mt-4 space-y-3">
        {stages.map((stage, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold">{stage.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px]">{stage.desc}</span>
                <span
                  className="font-bold px-1.5 py-0.5 rounded text-[10px]"
                  style={{
                    color: stage.color,
                    background: `${stage.color}18`,
                    border: `1px solid ${stage.color}33`,
                  }}
                >
                  {stage.count} ({stage.rate})
                </span>
              </div>
            </div>
            {/* Progress Track */}
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: total > 0 ? `${(stage.count / total) * 100}%` : '0%',
                  background: `linear-gradient(90deg, ${stage.color}88, ${stage.color})`,
                  boxShadow: `0 0 10px ${stage.color}44`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-2.5 flex items-center justify-between border-t border-white/5 font-mono text-[10.5px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <Target size={13} className="text-emerald-400" /> Response Target: ≥ 30%
        </span>
        <span className="text-emerald-400 font-semibold flex items-center gap-1">
          <CheckCircle2 size={12} /> {screenCount >= 1 ? 'Pipeline Active' : 'Ramp Up Applications'}
        </span>
      </div>
    </div>
  );
};
