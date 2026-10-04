import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Gauge, Layers } from 'lucide-react';
import { api } from '../api';
import { Skill, Story } from '../types';
import { computeSkillAxes, computeStoryAxes, formatCategoryName, READINESS_TARGET, SkillAxis } from '../lib/skills';
import SkillRadar from '../components/SkillRadar';
import PageShell from '../components/PageShell';
import { Button, Chip, EmptyState, Panel, PanelHeader, Reveal, Segmented, Skeleton } from '../components/ui/kit';
import { cn } from '../lib/utils';

interface JobDescriptionResponse {
  id: string; companyName: string; roleTitle: string;
  extractedKeyWords: string[]; missingKeyWords: string[]; yourMatchScore: number | null;
}
interface RoleAgg {
  role: string; displayRole: string; jdCount: number; matchScore: number | null;
  missing: { kw: string; count: number }[]; emphasized: Set<string>;
}

type ReadinessSource = 'story' | 'skill';

const SENIORITY_TOKENS = new Set([
  'senior', 'sr', 'sr.', 'junior', 'jr', 'jr.', 'staff', 'lead', 'principal',
  'i', 'ii', 'iii', 'iv', 'v', 'entry', 'mid', 'level',
]);

function normalizeRoleTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !SENIORITY_TOKENS.has(w))
    .sort()
    .join(' ');
}

export default function Readiness() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [jds, setJds] = useState<JobDescriptionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [source, setSource] = useState<ReadinessSource>('story');

  useEffect(() => {
    const load = async () => {
      try {
        // Every page, so readiness percentages are not computed from the first 25 rows only.
        const [allSkills, allStories, allJds] = await Promise.all([
          api.getAll<Skill>('/api/skill'),
          api.getAll<Story>('/api/story'),
          api.getAll<JobDescriptionResponse>('/api/jobdescription'),
        ]);
        setSkills(allSkills);
        setStories(allStories);
        setJds(allJds);
      } catch (err) {
        console.error('Failed to load readiness data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const skillAxes = useMemo(() => computeSkillAxes(skills), [skills]);
  const storyAxes = useMemo(() => computeStoryAxes(stories), [stories]);
  const axes: SkillAxis[] = source === 'story' ? storyAxes : skillAxes;
  const hasRadar = axes.length >= 3;
  const uncategorised = skills.filter((s) => !s.category?.trim()).length;

  const roles: RoleAgg[] = useMemo(() => {
    const skillNames = new Set<string>(skills.map((s) => s.name.toLowerCase()));
    const catBySkill = new Map<string, string>();
    for (const s of skills) {
      const c = s.category?.trim();
      if (c) catBySkill.set(s.name.toLowerCase(), c);
    }

    const grouped = new Map<string, { jds: JobDescriptionResponse[]; displayRole: string }>();
    for (const jd of jds) {
      const raw = jd.roleTitle?.trim() || 'Untitled role';
      const key = normalizeRoleTitle(raw) || raw.toLowerCase();
      const existing = grouped.get(key);
      if (existing) {
        existing.jds.push(jd);
      } else {
        grouped.set(key, { jds: [jd], displayRole: raw });
      }
    }

    return [...grouped.entries()]
      .map(([role, group]) => {
        const scores = group.jds.map((g) => g.yourMatchScore).filter((v): v is number => v != null);
        const matchScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
        const missingFreq = new Map<string, number>();
        const emphasized = new Set<string>();
        for (const jd of group.jds) {
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
        return { role, displayRole: group.displayRole, jdCount: group.jds.length, matchScore, missing, emphasized };
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
  const storyGaps = source === 'story' ? belowTarget : storyAxes.filter((a) => a.value < READINESS_TARGET).sort((a, b) => a.value - b.value);

  if (isLoading) {
    return (
      <PageShell dataTestId="readiness-page" title="Readiness">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Skeleton className="h-[440px]" />
          <Skeleton className="h-[440px]" />
        </div>
      </PageShell>
    );
  }

  const gapList = activeRole ? activeRole.missing : overallGaps;
  const summary = [
    { label: 'Categories charted', value: axes.length },
    { label: 'At or above target', value: axes.filter((a) => a.value >= READINESS_TARGET).length },
    { label: 'Target roles', value: roles.length },
    { label: 'Open gaps', value: jds.length === 0 ? storyGaps.length : overallGaps.length },
  ];

  return (
    <PageShell
      dataTestId="readiness-page"
      title="Readiness"
      subtitle={`How your stories and skills compare with the interview-ready bar of ${READINESS_TARGET}%, and which gaps your target roles share.`}
      actions={
        <Segmented
          ariaLabel="Readiness source"
          value={source}
          onChange={setSource}
          options={[
            { value: 'story', label: 'Story recall' },
            { value: 'skill', label: 'Skills' },
          ]}
        />
      }
    >
      <Reveal>
        <Panel className="grid grid-cols-2 gap-px overflow-hidden bg-line md:grid-cols-4">
          {summary.map((s) => (
            <div key={s.label} className="flex flex-col gap-1 bg-surface-1 p-5">
              <span className="text-[13px] text-fg-3">{s.label}</span>
              <span className="num text-[28px] font-semibold leading-none tracking-tight text-fg">{s.value}</span>
            </div>
          ))}
        </Panel>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Reveal delay={0.05}>
          <Panel className="flex h-full flex-col">
            <PanelHeader
              title={source === 'story' ? 'Recall by category' : 'Self-rated skills by category'}
              description="Solid line is you. Dashed line is interview-ready."
            />
            <div className="grid flex-1 place-items-center p-6">
              {hasRadar ? (
                <SkillRadar axes={axes} size={400} target={READINESS_TARGET} emphasized={source === 'skill' ? activeRole?.emphasized : undefined} className="w-full max-w-[420px]" />
              ) : (
                <EmptyState
                  icon={<Gauge size={18} />}
                  title={source === 'story' ? 'Add stories in at least three categories.' : 'Add categorised skills in at least three categories.'}
                  description={source === 'skill' && uncategorised > 0 ? `${uncategorised} of your skills have no category yet.` : 'The chart appears once there is enough to compare.'}
                  action={<Button variant="secondary" size="sm" to={source === 'story' ? '/story-bank' : '/settings'}>{source === 'story' ? 'Open STAR Bank' : 'Manage skills'}</Button>}
                />
              )}
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.1}>
          <Panel className="flex h-full flex-col">
            <PanelHeader title="Target roles" description="Grouped from the job descriptions you saved." />
            {roles.length === 0 ? (
              <EmptyState
                title="No saved job descriptions."
                description="Analyse postings in the JD Matcher to see readiness per role."
                action={<Button variant="secondary" size="sm" to="/jd-matcher">Open JD Matcher</Button>}
              />
            ) : (
              <ul className="mt-3 border-t border-line" role="listbox" aria-label="Target roles">
                {[{ role: null as string | null, displayRole: 'All roles', matchScore: null as number | null, jdCount: jds.length }, ...roles].map((r) => {
                  const active = selectedRole === r.role;
                  return (
                    <li key={r.role ?? 'all'}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => setSelectedRole(r.role)}
                        className={cn('flex w-full items-center gap-3 border-b border-line px-5 py-3 text-left transition-colors hover:bg-surface-2/60', active && 'bg-surface-2')}
                      >
                        <span className={cn('h-4 w-[3px] rounded-full', active ? 'bg-accent' : 'bg-transparent')} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium text-fg">{r.displayRole}</span>
                          <span className="text-[12.5px] text-fg-3">{r.jdCount} {r.jdCount === 1 ? 'posting' : 'postings'}</span>
                        </span>
                        {r.role && <span className="num text-[13.5px] font-medium text-fg">{r.matchScore == null ? 'n/a' : `${r.matchScore}%`}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-auto p-5">
              <p className="rounded-lg bg-surface-2 p-4 text-[13px] leading-relaxed text-fg-2">
                {activeRole ? (
                  activeRole.matchScore == null ? (
                    <>No keyword match yet for {activeRole.displayRole}.</>
                  ) : (
                    <>
                      <span className="font-medium text-fg">{activeRole.displayRole}</span>: {activeRole.matchScore}% keyword match across {activeRole.jdCount} {activeRole.jdCount === 1 ? 'posting' : 'postings'}.
                      {activeRole.missing.length > 0 ? <> Close these first: {activeRole.missing.slice(0, 4).map((m) => m.kw).join(', ')}.</> : <> No missing keywords recorded.</>}
                    </>
                  )
                ) : jds.length === 0 ? (
                  storyGaps.length ? (
                    <>Weakest story categories: {storyGaps.slice(0, 3).map((a) => `${formatCategoryName(a.name)} (${a.value}%)`).join(', ')}.</>
                  ) : (
                    <>No story category is below the bar.</>
                  )
                ) : belowTarget.length > 0 ? (
                  <>
                    Below the bar in {belowTarget.slice(0, 3).map((a) => `${formatCategoryName(a.name)} (${a.value}%)`).join(', ')}.
                    {overallGaps.length > 0 && <> Most common missing skill: {overallGaps[0].kw}.</>}
                  </>
                ) : axes.length > 0 ? (
                  <>Every charted category is at or above the bar.</>
                ) : (
                  <>Add stories or skills to build the chart.</>
                )}
              </p>
            </div>
          </Panel>
        </Reveal>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal delay={0.12}>
          <Panel className="h-full">
            <PanelHeader title="Category coverage" description={source === 'story' ? 'Average recall per category.' : 'Average proficiency per category.'} />
            {axes.length === 0 ? (
              <EmptyState title={source === 'story' ? 'No stories yet.' : 'No categorised skills yet.'} />
            ) : (
              <ul className="flex flex-col gap-4 p-5">
                {axes.map((ax) => {
                  const below = ax.value < READINESS_TARGET;
                  return (
                    <li key={ax.name}>
                      <div className="mb-1.5 flex justify-between text-[13px]">
                        <span className="text-fg-2">
                          {formatCategoryName(ax.name)} <span className="text-fg-3">({ax.count})</span>
                        </span>
                        <span className={cn('num font-medium', below ? 'text-warning' : 'text-fg')}>{ax.value}%</span>
                      </div>
                      <div className="relative h-1.5 rounded-full bg-surface-3">
                        <div className={cn('h-full rounded-full transition-[width] duration-700', below ? 'bg-warning' : 'bg-accent')} style={{ width: `${ax.value}%` }} />
                        <span className="absolute -top-1 h-3.5 w-px bg-fg-3" style={{ left: `${READINESS_TARGET}%` }} title={`Interview-ready: ${READINESS_TARGET}%`} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </Reveal>

        <Reveal delay={0.16}>
          <Panel className="h-full">
            <PanelHeader
              title="Gaps to close"
              description={activeRole ? `Missing skills for ${activeRole.displayRole}.` : jds.length === 0 ? 'Weakest categories by story recall.' : 'Skills your saved postings ask for most often.'}
            />
            <div className="p-5">
              {jds.length === 0 && !activeRole ? (
                storyGaps.length === 0 ? (
                  <p className="text-[13.5px] text-fg-3">Nothing below the bar.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {storyGaps.slice(0, 8).map((g) => (
                      <Button key={g.name} variant="secondary" size="sm" icon={<Layers size={14} />} to={`/story-bank/quiz?category=${g.name}`}>
                        Drill {formatCategoryName(g.name)}
                      </Button>
                    ))}
                  </div>
                )
              ) : gapList.length === 0 ? (
                <p className="text-[13.5px] text-fg-3">No missing skills recorded.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {gapList.slice(0, 18).map((g) => (
                    <Chip key={g.kw}>
                      {g.kw}
                      {g.count > 1 && <span className="num text-fg-3">x{g.count}</span>}
                    </Chip>
                  ))}
                </div>
              )}
            </div>
            {source === 'story' && storyGaps.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-line p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[13px] text-fg-2">
                  Weakest category: <span className="font-medium text-fg">{formatCategoryName(storyGaps[0].name)}</span> ({storyGaps[0].value}% recall).
                </p>
                <Button variant="primary" size="sm" iconRight={<ArrowRight size={14} />} to={`/story-bank/quiz?category=${storyGaps[0].name}`}>
                  Drill it
                </Button>
              </div>
            )}
          </Panel>
        </Reveal>
      </div>
    </PageShell>
  );
}
