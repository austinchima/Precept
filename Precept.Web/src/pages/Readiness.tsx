import { useState, useEffect, useMemo } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Skill } from '../types';
import { computeSkillAxes, READINESS_TARGET, SkillAxis } from '../lib/skills';
import SkillRadar from '../components/SkillRadar';
import { CountUp } from '../components/animation/CountUp';
import { AnimatedSection } from '../components/animation/AnimatedSection';
import { Target, Layers, AlertTriangle, CircleDot, Circle, Loader2, Terminal } from 'lucide-react';

const C = {
  bg0: '#02050A', bg1: '#06090F', bg2: '#0B0F17', bg3: '#11161F',
  ink: '#E6EBF2', inkDim: '#9CA8B8', inkMute: '#5A6678',
  hair: 'rgba(255,255,255,0.07)', hair2: 'rgba(255,255,255,0.12)',
  teal: '#2dd4bf', tealDim: 'rgba(45,212,191,0.14)',
  violet: '#8b5cf6', rose: '#f43f5e', amber: '#f59e0b', sky: '#38bdf8', emerald: '#10b981',
} as const;

const cardStyle = (): React.CSSProperties => ({
  background: `linear-gradient(180deg, ${C.bg1} 0%, ${C.bg0} 100%)`,
  border: `1px solid ${C.hair}`,
  borderRadius: 18,
  boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
});

const Eyebrow = ({ children, color = C.teal }: { children: React.ReactNode; color?: string }) => (
  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em]"
    style={{ background: `${color}14`, border: `1px solid ${color}33`, color }}>
    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
    {children}
  </span>
);

interface JobDescriptionResponse {
  id: string; companyName: string; roleTitle: string;
  extractedKeyWords: string[]; missingKeyWords: string[]; yourMatchScore: number | null;
}
interface RoleAgg {
  role: string; jdCount: number; matchScore: number | null;
  missing: { kw: string; count: number }[]; emphasized: Set<string>;
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

  const axes: SkillAxis[] = useMemo(() => computeSkillAxes(skills), [skills]);
  const hasRadar = axes.length >= 3;
  const uncategorised = skills.filter((s) => !s.category?.trim()).length;

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
        const matchScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
        const missingFreq = new Map<string, number>();
        const emphasized = new Set<string>();
        for (const jd of group) {
          for (const kw of jd.missingKeyWords ?? []) {
            const k = kw.trim();
            if (!k) continue;
            missingFreq.set(k, (missingFreq.get(k) ?? 0) + 1);
          }
          for (const kw of jd.extractedKeyWords ?? []) {
            const lk = kw.trim().toLowerCase();
            if (skillNames.has(lk) && catBySkill.has(lk)) emphasized.add(catBySkill.get(lk)!);
          }
        }
        const missing = [...missingFreq.entries()].map(([kw, count]) => ({ kw, count })).sort((a, b) => b.count - a.count);
        return { role, jdCount: group.length, matchScore, missing, emphasized };
      })
      .sort((a, b) => (a.matchScore ?? Number.POSITIVE_INFINITY) - (b.matchScore ?? Number.POSITIVE_INFINITY));
  }, [jds, skills]);

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
  const belowTarget = axes.filter((a) => a.value < READINESS_TARGET).sort((a, b) => a.value - b.value);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3 font-mono text-sm" style={{ color: C.inkDim }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: C.teal }} />
        <span>Mapping technical readiness…</span>
      </div>
    );
  }

  return (
    <div className="font-body p-4 md:p-8 pt-4 md:pt-6 max-w-[1200px] mx-auto space-y-8" data-testid="readiness-page" style={{ color: C.ink }}>
      <div className="text-center flex flex-col items-center gap-3 opacity-0 animate-fade-in-up delay-200">
        <Eyebrow color={C.teal}>Readiness matrix</Eyebrow>
        <h1 className="font-display font-bold leading-[1.05] mt-2" style={{ color: C.ink, fontSize: 'clamp(28px,4vw,40px)' }}>
          Technical <span className="font-editorial" style={{ color: C.teal, fontWeight: 400 }}>readiness.</span>
        </h1>
        <p className="font-body text-[14.5px] max-w-2xl" style={{ color: C.inkDim }}>
          Plot proficiencies against the interview-ready bar. Surface gaps before the technical screen.
        </p>
      </div>

      <div
        className="rounded-2xl overflow-hidden flex flex-col opacity-0 animate-fade-in-up delay-200"
        style={{
          background: `linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)`,
          border: `1px solid ${C.hair2}`,
          boxShadow: `0 40px 100px -30px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.06)`,
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Window Chrome Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: `1px solid ${C.hair}`, background: C.bg1 }}>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#febc2e" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28c840" }} />
          </div>
          <div
            className="hidden sm:flex items-center gap-2 rounded-md px-3 py-1 font-mono text-[11px]"
            style={{ background: C.bg2, color: C.inkDim, border: `1px solid ${C.hair}` }}
          >
            <Terminal size={12} style={{ color: C.teal }} /> precept · ~/career/readiness
          </div>
          <div className="font-mono text-[11px] flex items-center gap-1.5" style={{ color: C.inkDim }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full animate-ping" style={{ background: C.emerald }} />
            <span style={{ color: C.emerald }}>{axes.length} axes active</span>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-6" style={{ background: C.bg1 }}>
          <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        {/* Radar */}
        <section className="flex-1 p-6 md:p-8 relative flex items-center justify-center overflow-hidden min-h-[420px] opacity-0 animate-fade-in-up delay-300" style={cardStyle()}>
          <div className="pointer-events-none absolute w-[400px] h-[400px] rounded-full"
            style={{ background: `radial-gradient(circle, rgba(45,212,191,0.10), transparent 70%)`, filter: 'blur(4px)' }} />
          {hasRadar ? (
            <div className="relative z-10 w-full max-w-[420px] aspect-square">
              <SkillRadar axes={axes} size={400} target={READINESS_TARGET} emphasized={activeRole?.emphasized} className="w-full h-full" />
              <div className="absolute bottom-0 left-0 flex flex-col gap-1.5 font-mono text-[10.5px]">
                <span className="flex items-center gap-2" style={{ color: C.inkDim }}>
                  <span className="inline-block w-3 h-0.5" style={{ background: C.teal }} /> Current profile
                </span>
                <span className="flex items-center gap-2" style={{ color: C.inkDim }}>
                  <span className="inline-block w-3 border-t border-dashed" style={{ borderColor: C.violet }} /> Interview-ready ({READINESS_TARGET}%)
                </span>
              </div>
            </div>
          ) : (
            <div className="relative z-10 text-center max-w-sm flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-xl grid place-items-center" style={{ background: `${C.inkMute}14`, border: `1px solid ${C.hair2}` }}>
                <Target size={20} style={{ color: C.inkMute }} />
              </div>
              <p className="font-body text-[13.5px]" style={{ color: C.inkDim }}>
                Add skills with categories to at least <span style={{ color: C.ink, fontWeight: 500 }}>3 categories</span> to chart your readiness map.
                {uncategorised > 0 && (
                  <span className="block mt-1 font-mono text-[11px]" style={{ color: C.inkMute }}>
                    {uncategorised} skill{uncategorised === 1 ? '' : 's'} have no category yet.
                  </span>
                )}
              </p>
              <button onClick={() => navigate('/settings')}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] cursor-pointer"
                style={{ background: C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${C.ink}` }}>
                Manage skills
              </button>
            </div>
          )}
        </section>

        {/* Right: Controls */}
        <aside className="w-full lg:w-80 flex flex-col gap-4 opacity-0 animate-fade-in-up delay-400">
          <div className="p-6 flex-1 flex flex-col" style={cardStyle()}>
            <h3 className="font-mono text-[10.5px] uppercase tracking-[0.18em] mb-5 flex items-center gap-2" style={{ color: C.teal }}>
              <Target size={11} /> Target roles
            </h3>

            {roles.length === 0 ? (
              <div className="font-body text-[13px] leading-relaxed flex flex-col gap-3" style={{ color: C.inkDim }}>
                <p>No saved job descriptions yet. Save JDs in the JD Matcher to surface real role readiness.</p>
                <button onClick={() => navigate('/jd-matcher')}
                  className="self-start inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.025)', color: C.ink, border: `1px solid ${C.hair2}` }}>
                  Open JD Matcher
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <RoleBtn active={!selectedRole} onClick={() => setSelectedRole(null)}>
                  <span>All roles (overview)</span>
                  {!selectedRole ? <CircleDot size={12} className="opacity-70" /> : <Circle size={12} className="opacity-50" />}
                </RoleBtn>
                {roles.map((r) => (
                  <RoleBtn key={r.role} active={selectedRole === r.role} onClick={() => setSelectedRole(r.role)}>
                    <span className="truncate" title={r.role}>{r.role}</span>
                    <span className="shrink-0 text-[11px]" style={{ color: r.matchScore == null ? C.inkMute : C.ink }}>
                      {r.matchScore == null ? '—' : `${r.matchScore}%`}
                    </span>
                  </RoleBtn>
                ))}
              </div>
            )}

            {/* Gap analysis */}
            <div className="mt-auto pt-6">
              <div className="p-4 rounded-xl" style={{ background: C.bg2, border: `1px solid ${C.hair}`, borderLeft: `2px solid ${C.teal}` }}>
                <p className="font-mono text-[11.5px] leading-relaxed" style={{ color: C.inkDim }}>
                  <span className="block mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: C.ink }}>Gap analysis</span>
                  {activeRole ? (
                    activeRole.matchScore == null ? (
                      <>No match score yet for <span style={{ color: C.ink }}>{activeRole.role}</span> — add keywords in the JD Matcher.</>
                    ) : (
                      <>
                        <span style={{ color: C.ink }}>{activeRole.role}</span>: {activeRole.matchScore}% match across {activeRole.jdCount} JD{activeRole.jdCount === 1 ? '' : 's'}.{' '}
                        {activeRole.missing.length > 0 ? (
                          <>Close these first: <span style={{ color: C.teal }}>{activeRole.missing.slice(0, 4).map((m) => m.kw).join(', ')}</span>.</>
                        ) : (
                          <>No missing keywords recorded for this role.</>
                        )}
                      </>
                    )
                  ) : belowTarget.length > 0 ? (
                    <>
                      Below the interview-ready bar in <span style={{ color: C.rose }}>{belowTarget.slice(0, 3).map((a) => `${a.name} (${a.value}%)`).join(', ')}</span>.
                      {overallGaps.length > 0 && <> Most common gap across roles: <span style={{ color: C.teal }}>{overallGaps[0].kw}</span>.</>}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="p-6 opacity-0 animate-fade-in-up delay-500" style={cardStyle()}>
          <h3 className="font-mono text-[10.5px] uppercase tracking-[0.18em] mb-5 flex items-center gap-2" style={{ color: C.violet }}>
            <Layers size={11} /> Category coverage
          </h3>
          {axes.length === 0 ? (
            <p className="font-body text-[13px] italic" style={{ color: C.inkDim }}>No categorised skills yet.</p>
          ) : (
            <div className="space-y-4">
              {axes.map((ax) => {
                const below = ax.value < READINESS_TARGET;
                return (
                  <div key={ax.name}>
                    <div className="flex justify-between font-mono text-[11px] mb-1.5">
                      <span style={{ color: C.inkDim }}>
                        {ax.name} <span style={{ color: C.inkMute }}>· {ax.count}</span>
                      </span>
                      <span style={{ color: below ? C.rose : C.ink, fontWeight: 500 }}>{ax.value}%</span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ background: C.hair }}>
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${ax.value}%`, background: below ? C.rose : C.teal, boxShadow: `0 0 6px ${below ? C.rose : C.teal}55` }} />
                      <div className="absolute top-0 h-full w-0.5" style={{ background: C.violet, left: `${READINESS_TARGET}%` }} title={`Interview-ready: ${READINESS_TARGET}%`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="p-6 opacity-0 animate-fade-in-up delay-500" style={cardStyle()}>
          <h3 className="font-mono text-[10.5px] uppercase tracking-[0.18em] mb-1 flex items-center gap-2" style={{ color: C.teal }}>
            <AlertTriangle size={11} /> Gaps to close
          </h3>
          <p className="font-mono text-[11px] mb-5" style={{ color: C.inkMute }}>
            {activeRole ? `Missing keywords for ${activeRole.role}` : 'Most-requested skills missing across your saved JDs'}
          </p>
          {(() => {
            const list = activeRole ? activeRole.missing : overallGaps;
            if (jds.length === 0) return <p className="font-body text-[13px] italic" style={{ color: C.inkDim }}>Save job descriptions in the JD Matcher to surface real skill gaps.</p>;
            if (list.length === 0) return <p className="font-body text-[13px] italic" style={{ color: C.inkDim }}>No missing keywords — nice coverage.</p>;
            return (
              <AnimatedSection animation="staggerFadeUp" stagger={0.04} childSelector="> span" className="flex flex-wrap gap-2">
                {list.slice(0, 18).map((g) => (
                  <span key={g.kw} className="px-3 py-1.5 rounded-full font-mono text-[11px] uppercase tracking-widest flex items-center gap-2"
                    style={{ background: C.bg2, color: C.ink, border: `1px solid ${C.hair2}` }}>
                    {g.kw}
                    {g.count > 1 && <span className="text-[10px]" style={{ color: C.teal }}>×{g.count}</span>}
                  </span>
                ))}
              </AnimatedSection>
            );
          })()}
        </section>
      </div>

      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 opacity-0 animate-fade-in-up delay-500" style={cardStyle()}>
        {[
          { label: 'Categories charted', value: axes.length },
          { label: 'At / above target', value: axes.filter((a) => a.value >= READINESS_TARGET).length },
          { label: 'Target roles', value: roles.length },
          { label: 'Distinct gaps', value: overallGaps.length },
        ].map((s) => (
          <div key={s.label}>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] mb-1" style={{ color: C.inkMute }}>{s.label}</div>
            <div className="font-display text-[26px] font-bold" style={{ color: C.ink }}>
              <CountUp end={s.value} duration={1.2} />
            </div>
          </div>
        ))}
      </div>
        </div>
      </div>
    </div>
  );
}

function RoleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode; key?: React.Key }) {
  return (
    <button onClick={onClick}
      className="w-full text-left px-4 py-3 rounded-xl font-mono text-[12.5px] transition-all flex items-center justify-between gap-2 cursor-pointer"
      style={{
        background: active ? C.tealDim : 'transparent',
        color: active ? C.teal : C.inkDim,
        border: `1px solid ${active ? `${C.teal}55` : C.hair}`,
      }}>
      {children}
    </button>
  );
}
