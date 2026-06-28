import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Skill, SkillProficiency } from '../types';
import { CountUp } from '../components/animation/CountUp';
import { AnimatedSection } from '../components/animation/AnimatedSection';

/**
 * Technical Readiness — Skills Matrix Visualizer.
 *
 * Phase 1 (real): a radar of the user's CURRENT proficiency per skill category,
 * derived entirely from persisted Skill entities, plus an aggregated gap list
 * driven by the JD Analyzer's computed `missingKeyWords`.
 *
 * Phase 2 (real): target-role overlay driven by the user's OWN saved job
 * descriptions — each distinct role title with its real `yourMatchScore` and
 * `missingKeyWords`. The radar "target" is an explicit, labeled interview-ready
 * threshold (READINESS_TARGET) — NOT a fabricated per-role benchmark polygon.
 */

// Local shape for the JD list endpoint (mirrors JobDescriptionResponse).
interface JobDescriptionResponse {
  id: string;
  companyName: string;
  roleTitle: string;
  extractedKeyWords: string[];
  missingKeyWords: string[];
  yourMatchScore: number | null;
}

// Proficiency → percentage. Kept consistent with the dashboard radar scale.
const PROFICIENCY_PCT: Record<SkillProficiency, number> = {
  Beginner: 30,
  Intermediate: 60,
  Advanced: 80,
  Expert: 95,
};

// The single, explicitly-labeled "interview-ready" bar. Not role-specific —
// it's an honest goal line, not invented benchmark data.
const READINESS_TARGET = 75;

// Radar geometry (400x400 viewBox).
const CX = 200;
const CY = 200;
const MAXR = 150;

interface Axis {
  name: string;
  value: number;
  count: number;
}

interface RoleAgg {
  role: string;
  jdCount: number;
  matchScore: number | null;
  missing: { kw: string; count: number }[];
  emphasized: Set<string>;
}

export default function Readiness() {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [jds, setJds] = useState<JobDescriptionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [skillsData, jdData] = await Promise.all([
          api.get<Skill[]>('/api/skill'),
          api.get<JobDescriptionResponse[]>('/api/jobdescription'),
        ]);
        setSkills(skillsData);
        setJds(jdData);
      } catch (err) {
        console.error('Failed to load readiness data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // ── Current profile: average proficiency per skill category ──────────────
  const axes: Axis[] = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const s of skills) {
      const key = s.category?.trim();
      if (!key) continue; // uncategorised skills can't sit on an axis
      const arr = map.get(key) ?? [];
      arr.push(PROFICIENCY_PCT[s.proficiencyLevel]);
      map.set(key, arr);
    }
    return [...map.entries()]
      .map(([name, vals]) => ({
        name,
        value: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
        count: vals.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [skills]);

  const hasRadar = axes.length >= 3;
  const uncategorised = skills.filter((s) => !s.category?.trim()).length;

  // ── Roles: real target roles from saved JDs ──────────────────────────────
  const roles: RoleAgg[] = useMemo(() => {
    const skillNames = new Set<string>(skills.map((s) => s.name.toLowerCase()));
    const catBySkill = new Map<string, string>();
    for (const s of skills) {
      const c = s.category?.trim();
      if (c) catBySkill.set(s.name.toLowerCase(), c);
    }

    const grouped = new Map<string, JobDescriptionResponse[]>();
    for (const jd of jds) {
      const key = jd.roleTitle?.trim() || 'Untitled role';
      const arr = grouped.get(key) ?? [];
      arr.push(jd);
      grouped.set(key, arr);
    }

    return [...grouped.entries()]
      .map(([role, group]) => {
        const scores = group.map((g) => g.yourMatchScore).filter((v): v is number => v != null);
        const matchScore = scores.length
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null;

        const missingFreq = new Map<string, number>();
        const emphasized = new Set<string>();
        for (const jd of group) {
          for (const kw of jd.missingKeyWords ?? []) {
            const k = kw.trim();
            if (!k) continue;
            missingFreq.set(k, (missingFreq.get(k) ?? 0) + 1);
          }
          // Categories this role actually touches = categories of the user's
          // skills that the role's keywords matched (real, not inferred).
          for (const kw of jd.extractedKeyWords ?? []) {
            const lk = kw.trim().toLowerCase();
            if (skillNames.has(lk) && catBySkill.has(lk)) emphasized.add(catBySkill.get(lk)!);
          }
        }

        const missing = [...missingFreq.entries()]
          .map(([kw, count]) => ({ kw, count }))
          .sort((a, b) => b.count - a.count);

        return { role, jdCount: group.length, matchScore, missing, emphasized };
      })
      .sort((a, b) => (a.matchScore ?? Number.POSITIVE_INFINITY) - (b.matchScore ?? Number.POSITIVE_INFINITY)); // weakest match first; unknown last
  }, [jds, skills]);

  // Aggregated gaps across all saved JDs (Phase 1 gap list).
  const overallGaps = useMemo(() => {
    const freq = new Map<string, number>();
    for (const jd of jds) {
      for (const kw of jd.missingKeyWords ?? []) {
        const k = kw.trim();
        if (!k) continue;
        freq.set(k, (freq.get(k) ?? 0) + 1);
      }
    }
    return [...freq.entries()].map(([kw, count]) => ({ kw, count })).sort((a, b) => b.count - a.count);
  }, [jds]);

  const activeRole = roles.find((r) => r.role === selectedRole) ?? null;

  // ── Radar SVG math ───────────────────────────────────────────────────────
  const N = axes.length;
  const angleFor = (i: number) => (i / N) * 2 * Math.PI - Math.PI / 2;
  const pointAt = (i: number, v: number): [number, number] => {
    const a = angleFor(i);
    const r = (Math.max(0, Math.min(100, v)) / 100) * MAXR;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  };
  const toStr = (pts: [number, number][]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  const currentPoly = toStr(axes.map((ax, i) => pointAt(i, ax.value)));
  const targetPoly = toStr(axes.map((_, i) => pointAt(i, READINESS_TARGET)));
  const rings = [0.25, 0.5, 0.75, 1].map((f) =>
    toStr(axes.map((_, i) => {
      const a = angleFor(i);
      return [CX + f * MAXR * Math.cos(a), CY + f * MAXR * Math.sin(a)] as [number, number];
    })),
  );

  const belowTarget = axes.filter((a) => a.value < READINESS_TARGET).sort((a, b) => a.value - b.value);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-text-secondary font-mono gap-3">
        <div className="w-12 h-12 rounded-full border-4 border-accent-teal/10 border-t-accent-teal animate-spin" />
        <span>Mapping technical readiness...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pt-4 md:pt-6 max-w-[1200px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3 opacity-0 animate-fade-in-up delay-200">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Technical Readiness</h1>
        <p className="font-mono text-text-secondary text-sm max-w-2xl">
          Map your current proficiencies against the interview-ready bar. Identify critical gaps before the technical screen.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        {/* Left: Radar */}
        <section className="flex-1 glass-panel rounded-2xl p-6 md:p-8 relative flex items-center justify-center overflow-hidden min-h-[420px] opacity-0 animate-fade-in-up delay-300">
          <div
            className="pointer-events-none absolute w-[320px] h-[320px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(45,212,191,0.12) 0%, rgba(2,5,10,0) 70%)' }}
          />
          {hasRadar ? (
            <div className="relative z-10 w-full max-w-[420px] aspect-square">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 400 400">
                {/* Grid rings */}
                <g fill="none" stroke="#2d3748" strokeWidth="1">
                  {rings.map((r, i) => (
                    <polygon key={i} points={r} />
                  ))}
                  {axes.map((_, i) => {
                    const [x, y] = pointAt(i, 100);
                    return <line key={i} x1={CX} y1={CY} x2={x} y2={y} />;
                  })}
                </g>

                {/* Target threshold (honest goal line, dashed purple) */}
                <polygon
                  points={targetPoly}
                  fill="rgba(139,92,246,0.08)"
                  stroke="#8b5cf6"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* Current profile (real) */}
                <polygon points={currentPoly} fill="rgba(45,212,191,0.18)" stroke="#2dd4bf" strokeWidth="2" />
                {axes.map((ax, i) => {
                  const [x, y] = pointAt(i, ax.value);
                  const below = ax.value < READINESS_TARGET;
                  return <circle key={i} cx={x} cy={y} r="4" fill={below ? '#f43f5e' : '#2dd4bf'} />;
                })}

                {/* Axis labels */}
                <g className="font-mono" fontSize="11">
                  {axes.map((ax, i) => {
                    const a = angleFor(i);
                    const r = MAXR + 26;
                    const x = CX + r * Math.cos(a);
                    const y = CY + r * Math.sin(a);
                    const cos = Math.cos(a);
                    const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle';
                    const emphasized = activeRole?.emphasized.has(ax.name);
                    return (
                      <text
                        key={i}
                        x={x}
                        y={y}
                        textAnchor={anchor}
                        dominantBaseline="middle"
                        fill={emphasized ? '#2dd4bf' : '#94a3b8'}
                        fontWeight={emphasized ? 700 : 400}
                      >
                        {ax.name}
                      </text>
                    );
                  })}
                </g>
              </svg>

              {/* Legend */}
              <div className="absolute bottom-0 left-0 flex flex-col gap-1.5 font-mono text-[11px]">
                <span className="flex items-center gap-2 text-text-secondary">
                  <span className="inline-block w-3 h-0.5 bg-accent-teal" /> Current profile
                </span>
                <span className="flex items-center gap-2 text-text-secondary">
                  <span className="inline-block w-3 border-t border-dashed border-accent-purple" /> Interview-ready ({READINESS_TARGET}%)
                </span>
              </div>
            </div>
          ) : (
            <div className="relative z-10 text-center max-w-sm flex flex-col items-center gap-4">
              <i className="fa-solid fa-diagram-project text-4xl text-text-secondary/40" />
              <p className="text-text-secondary text-sm">
                Add skills with categories to at least <span className="text-white font-medium">3 categories</span> to chart your
                readiness map.
                {uncategorised > 0 && (
                  <span className="block mt-1 text-xs text-text-secondary/70">
                    {uncategorised} skill{uncategorised === 1 ? '' : 's'} have no category yet.
                  </span>
                )}
              </p>
              <button
                onClick={() => navigate('/settings')}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-accent-teal text-dashboard-bg hover:scale-105 transition-all"
              >
                Manage Skills
              </button>
            </div>
          )}
        </section>

        {/* Right: Controls */}
        <aside className="w-full lg:w-80 flex flex-col gap-4 opacity-0 animate-fade-in-up delay-400">
          <div className="glass-panel rounded-2xl p-6 flex-1 flex flex-col">
            <h3 className="font-semibold text-white mb-5 uppercase tracking-wider text-xs flex items-center gap-2">
              <i className="fa-solid fa-bullseye text-accent-teal" /> Target Roles
            </h3>

            {roles.length === 0 ? (
              <div className="text-sm text-text-secondary flex flex-col gap-3">
                <p>No saved job descriptions yet. Save JDs in the JD Matcher to see real role readiness and gaps.</p>
                <button
                  onClick={() => navigate('/jd-matcher')}
                  className="self-start px-4 py-2 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                >
                  Open JD Matcher
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => setSelectedRole(null)}
                  className={`w-full text-left px-4 py-3 rounded-xl border font-mono text-sm transition-all flex items-center justify-between ${
                    !selectedRole
                      ? 'bg-accent-teal/10 border-accent-teal text-accent-teal'
                      : 'border-white/10 text-text-secondary hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>All roles (overview)</span>
                  <i className={`fa-solid ${!selectedRole ? 'fa-circle-dot' : 'fa-circle'} text-xs opacity-70`} />
                </button>
                {roles.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => setSelectedRole(r.role)}
                    className={`w-full text-left px-4 py-3 rounded-xl border font-mono text-sm transition-all flex items-center justify-between gap-2 ${
                      selectedRole === r.role
                        ? 'bg-accent-teal/10 border-accent-teal text-accent-teal'
                        : 'border-white/10 text-text-secondary hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate" title={r.role}>{r.role}</span>
                    <span className={`shrink-0 text-xs ${r.matchScore == null ? 'text-text-secondary/60' : 'text-white'}`}>
                      {r.matchScore == null ? '—' : `${r.matchScore}%`}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Gap analysis — generated from real data */}
            <div className="mt-auto pt-6">
              <div className="p-4 bg-black/30 rounded-xl border border-white/10 border-l-4 border-l-accent-teal">
                <p className="font-mono text-xs text-text-secondary leading-relaxed">
                  <span className="text-white block mb-1.5 font-semibold">Gap Analysis</span>
                  {activeRole ? (
                    activeRole.matchScore == null ? (
                      <>No match score yet for <span className="text-white">{activeRole.role}</span> — add keywords in the JD Matcher.</>
                    ) : (
                      <>
                        <span className="text-white">{activeRole.role}</span>: {activeRole.matchScore}% match across {activeRole.jdCount} JD
                        {activeRole.jdCount === 1 ? '' : 's'}.{' '}
                        {activeRole.missing.length > 0 ? (
                          <>Close these first: <span className="text-accent-teal">{activeRole.missing.slice(0, 4).map((m) => m.kw).join(', ')}</span>.</>
                        ) : (
                          <>No missing keywords recorded for this role.</>
                        )}
                      </>
                    )
                  ) : belowTarget.length > 0 ? (
                    <>
                      Below the interview-ready bar in{' '}
                      <span className="text-accent-rose text-[#f43f5e]">
                        {belowTarget.slice(0, 3).map((a) => `${a.name} (${a.value}%)`).join(', ')}
                      </span>
                      .{overallGaps.length > 0 && <> Most common gap across roles: <span className="text-accent-teal">{overallGaps[0].kw}</span>.</>}
                    </>
                  ) : axes.length > 0 ? (
                    <>You're at or above the interview-ready bar across all charted categories. Keep stories fresh.</>
                  ) : (
                    <>Add categorised skills to generate your readiness map.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Lower: coverage bars + aggregated gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Per-category coverage vs target */}
        <section className="glass-panel rounded-2xl p-6 opacity-0 animate-fade-in-up delay-500">
          <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
            <i className="fa-solid fa-layer-group text-accent-purple" /> Category Coverage
          </h3>
          {axes.length === 0 ? (
            <p className="text-sm text-text-secondary italic">No categorised skills yet.</p>
          ) : (
            <div className="space-y-4">
              {axes.map((ax) => {
                const below = ax.value < READINESS_TARGET;
                return (
                  <div key={ax.name}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-text-secondary">
                        {ax.name} <span className="text-text-secondary/50">· {ax.count}</span>
                      </span>
                      <span className={below ? 'text-[#f43f5e] font-medium' : 'text-white font-medium'}>{ax.value}%</span>
                    </div>
                    <div className="relative h-2 w-full bg-black/40 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${ax.value}%`, backgroundColor: below ? '#f43f5e' : '#2dd4bf' }}
                      />
                      {/* interview-ready marker */}
                      <div
                        className="absolute top-0 h-full w-0.5 bg-accent-purple"
                        style={{ left: `${READINESS_TARGET}%` }}
                        title={`Interview-ready: ${READINESS_TARGET}%`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Aggregated gaps from JD analyzer */}
        <section className="glass-panel rounded-2xl p-6 opacity-0 animate-fade-in-up delay-500">
          <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation text-accent-teal" /> Gaps To Close
          </h3>
          <p className="text-xs text-text-secondary mb-5">
            {activeRole ? `Missing keywords for ${activeRole.role}` : 'Most-requested skills missing across your saved JDs'}
          </p>
          {(() => {
            const list = activeRole ? activeRole.missing : overallGaps;
            if (jds.length === 0) {
              return (
                <p className="text-sm text-text-secondary italic">
                  Save job descriptions in the JD Matcher to surface real skill gaps.
                </p>
              );
            }
            if (list.length === 0) {
              return <p className="text-sm text-text-secondary italic">No missing keywords — nice coverage.</p>;
            }
            return (
              <AnimatedSection
                animation="staggerFadeUp"
                stagger={0.04}
                childSelector="> span"
                className="flex flex-wrap gap-2"
              >
                {list.slice(0, 18).map((g) => (
                  <span
                    key={g.kw}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-black/30 border border-white/10 text-text-primary flex items-center gap-2"
                  >
                    {g.kw}
                    {g.count > 1 && <span className="text-[10px] text-accent-teal font-mono">×{g.count}</span>}
                  </span>
                ))}
              </AnimatedSection>
            );
          })()}
        </section>
      </div>

      {/* Summary footer */}
      <div className="glass-panel rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4 opacity-0 animate-fade-in-up delay-500">
        <div>
          <div className="text-xs text-text-secondary mb-1">Categories charted</div>
          <div className="text-2xl font-bold text-white"><CountUp end={axes.length} duration={1.2} /></div>
        </div>
        <div>
          <div className="text-xs text-text-secondary mb-1">At / above target</div>
          <div className="text-2xl font-bold text-white">
            <CountUp end={axes.filter((a) => a.value >= READINESS_TARGET).length} duration={1.2} />
          </div>
        </div>
        <div>
          <div className="text-xs text-text-secondary mb-1">Target roles</div>
          <div className="text-2xl font-bold text-white"><CountUp end={roles.length} duration={1.2} /></div>
        </div>
        <div>
          <div className="text-xs text-text-secondary mb-1">Distinct gaps</div>
          <div className="text-2xl font-bold text-white"><CountUp end={overallGaps.length} duration={1.2} /></div>
        </div>
      </div>
    </div>
  );
}
