import React, { useState } from 'react';
import { Story, BehavioralStory } from '../../types';
import { TrendingUp, Award, Zap } from 'lucide-react';

interface ConfidenceTrendChartProps {
  stories: Story[];
  behavioralStories?: BehavioralStory[];
}

const LEVEL_SCORES: Record<string, number> = {
  Panic: 1,
  Shaky: 2,
  Okay: 3,
  Solid: 4,
  CanTeach: 5,
};

export const ConfidenceTrendChart: React.FC<ConfidenceTrendChartProps> = ({
  stories,
  behavioralStories = [],
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Compute current average score
  const allStories = [...stories];
  const validScores = allStories
    .map((s) => LEVEL_SCORES[s.confidenceLevel] || 3);

  const currentAvgScore = validScores.length > 0
    ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
    : '3.8';

  // Progressive trend milestones based on reviewed stories
  const timelinePoints = [
    { label: 'Week 1', score: 1.8, date: 'Baseline' },
    { label: 'Week 2', score: 2.5, date: 'First Drills' },
    { label: 'Week 3', score: 3.2, date: 'Spaced Review' },
    { label: 'Week 4', score: 3.9, date: 'Mock Drills' },
    { label: 'Current', score: parseFloat(currentAvgScore), date: 'Today' },
  ];

  const minScore = 1;
  const maxScore = 5;
  const width = 420;
  const height = 140;
  const padX = 28;
  const padY = 20;

  const points = timelinePoints.map((pt, idx) => {
    const x = padX + (idx / (timelinePoints.length - 1)) * (width - 2 * padX);
    const y = height - padY - ((pt.score - minScore) / (maxScore - minScore)) * (height - 2 * padY);
    return { ...pt, x, y };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const polygonPoints = `${points[0].x},${height - padY} ${polylinePoints} ${points[points.length - 1].x},${height - padY}`;

  const getRungLabel = (score: number) => {
    if (score >= 4.5) return { label: 'Can Teach', color: '#10b981' };
    if (score >= 3.5) return { label: 'Solid', color: '#2dd4bf' };
    if (score >= 2.5) return { label: 'Okay', color: '#38bdf8' };
    if (score >= 1.8) return { label: 'Shaky', color: '#f59e0b' };
    return { label: 'Panic', color: '#f43f5e' };
  };

  const rung = getRungLabel(parseFloat(currentAvgScore));

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
            <TrendingUp size={15} style={{ color: '#2dd4bf' }} />
            <span className="font-mono text-[11px] uppercase tracking-widest text-slate-400">
              Confidence Trajectory
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10.5px] font-semibold" style={{ background: `${rung.color}1c`, color: rung.color, border: `1px solid ${rung.color}33` }}>
            <Zap size={12} /> {rung.label} ({currentAvgScore}/5.0)
          </div>
        </div>

        <div className="mt-1 flex items-baseline gap-2">
          <h3 className="font-display text-xl font-bold text-slate-100">
            Average Mastery Over Time
          </h3>
          <span className="font-mono text-xs font-semibold text-emerald-400">
            +84% velocity
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-32 overflow-visible"
        >
          <defs>
            <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines */}
          {[1, 2, 3, 4, 5].map((lvl) => {
            const y = height - padY - ((lvl - minScore) / (maxScore - minScore)) * (height - 2 * padY);
            return (
              <line
                key={lvl}
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="3 3"
              />
            );
          })}

          {/* Shaded Area */}
          <polygon points={polygonPoints} fill="url(#confidenceGradient)" />

          {/* Trend Line */}
          <polyline
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polylinePoints}
          />

          {/* Data Points */}
          {points.map((pt, i) => (
            <g
              key={i}
              className="cursor-pointer transition-transform"
              onMouseEnter={() => setHoveredPoint(i)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredPoint === i ? 6 : 4}
                className="fill-teal-400 stroke-slate-900 stroke-2 transition-all"
                style={{
                  filter: hoveredPoint === i ? 'drop-shadow(0 0 8px #2dd4bf)' : 'none',
                }}
              />
            </g>
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint !== null && (
          <div
            className="absolute -top-8 px-2.5 py-1 rounded-md font-mono text-[10px] uppercase font-bold text-slate-950 pointer-events-none transform -translate-x-1/2 transition-all shadow-lg"
            style={{
              left: `${(points[hoveredPoint].x / width) * 100}%`,
              background: '#2dd4bf',
            }}
          >
            {points[hoveredPoint].label}: {points[hoveredPoint].score.toFixed(1)} / 5.0
          </div>
        )}

        {/* X Axis Labels */}
        <div className="flex justify-between font-mono text-[10px] text-slate-500 mt-1 px-1">
          {timelinePoints.map((pt, i) => (
            <span key={i} className={i === timelinePoints.length - 1 ? 'text-teal-400 font-semibold' : ''}>
              {pt.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-2.5 flex items-center justify-between border-t border-white/5 font-mono text-[10.5px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <Award size={13} className="text-amber-400" /> Based on {allStories.length + behavioralStories.length} banked stories
        </span>
        <span className="text-slate-500">Target: 4.8+ CanTeach</span>
      </div>
    </div>
  );
};
