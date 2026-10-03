import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, ChevronRight, Layers, Plus } from 'lucide-react';
import { api } from '../api';
import { Application, ApplicationStatus, BehavioralStory, ConfidenceLevel, DashboardStats, PagedResponse, Skill, Story } from '../types';
import { useAuth } from '../AuthContext';
import { useToast } from '../components/ui/Toast';
import SkillRadar from '../components/SkillRadar';
import { computeSkillAxes, formatCategoryName, READINESS_TARGET } from '../lib/skills';
import PageShell from '../components/PageShell';
import { Button, EmptyState, Monogram, Panel, PanelHeader, Reveal, Segmented, Select, Skeleton } from '../components/ui/kit';
import { ConfidenceMeter, ConfidencePicker, STATUS_META, STATUS_ORDER, confidenceMeta, isDue, overdueLabel } from '../components/domain';
import { cn } from '../lib/utils';

type QueueItem = { id: string; title: string; kind: 'Technical' | 'Behavioral'; confidence: ConfidenceLevel; nextReviewAt: string | null };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function DashboardSkeleton() {
  return (
    <PageShell dataTestId="dashboard-page">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-24" />
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </PageShell>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [behavioralStories, setBehavioralStories] = useState<BehavioralStory[]>([]);
  const [followUpsDue, setFollowUpsDue] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [spotlightType, setSpotlightType] = useState<'technical' | 'behavioral'>('technical');
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [selectedBehavioralIndex, setSelectedBehavioralIndex] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [statsData, appsRes, storiesRes, skillsRes, behavioralStoriesRes, followUpsRes] = await Promise.all([
        api.get<DashboardStats>('/api/dashboard'),
        api.get<PagedResponse<Application>>('/api/application'),
        api.get<PagedResponse<Story>>('/api/story'),
        api.get<PagedResponse<Skill>>('/api/skill'),
        api.get<PagedResponse<BehavioralStory>>('/api/behavioralstory'),
        api.get<{ items: Application[]; count: number }>('/api/application/followups-due'),
      ]);
      setStats(statsData);
      setApplications(appsRes.items ?? []);
      setStories(storiesRes.items ?? []);
      setSkills(skillsRes.items ?? []);
      setBehavioralStories(behavioralStoriesRes.items ?? []);
      setFollowUpsDue(followUpsRes.items ?? []);
      if (statsData.applicationStats.totalApplications === 0 && statsData.storyStats.totalReviewed === 0) {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const activeApps = applications.filter((a) => ['Applied', 'PhoneScreen', 'Interviewing'].includes(a.status));
  const recentApps = [...applications]
    .sort((a, b) => new Date(b.dateApplied || b.followUpDate).getTime() - new Date(a.dateApplied || a.followUpDate).getTime())
    .slice(0, 5);
  const skillAxes = computeSkillAxes(skills);

  const queue: QueueItem[] = useMemo(() => {
    const now = new Date();
    const items: QueueItem[] = [
      ...stories.filter((s) => isDue(s.nextReviewAt, now)).map((s) => ({ id: s.id, title: s.title, kind: 'Technical' as const, confidence: s.confidenceLevel, nextReviewAt: s.nextReviewAt })),
      ...behavioralStories.filter((s) => isDue(s.nextReviewAt, now)).map((s) => ({ id: s.id, title: s.title, kind: 'Behavioral' as const, confidence: s.confidenceLevel, nextReviewAt: s.nextReviewAt })),
    ];
    return items.sort((a, b) => confidenceMeta(a.confidence).step - confidenceMeta(b.confidence).step);
  }, [stories, behavioralStories]);

  const statusCounts = useMemo(() => {
    const counts = new Map<ApplicationStatus, number>();
    applications.forEach((a) => counts.set(a.status, (counts.get(a.status) ?? 0) + 1));
    return STATUS_ORDER.map((s) => ({ status: s, count: counts.get(s) ?? 0 })).filter((x) => x.count > 0);
  }, [applications]);

  const handleUpdateConfidence = async (newRung: ConfidenceLevel) => {
    if (spotlightType === 'behavioral') return;
    const currentStory = stories[selectedStoryIndex % stories.length];
    if (!currentStory) return;
    try {
      const updated = await api.put<Story>(`/api/story/${currentStory.id}`, { ...currentStory, confidenceLevel: newRung });
      setStories((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast.success(`Confidence set to ${confidenceMeta(newRung).label}.`);
    } catch (err) {
      console.error(err);
      toast.error('Could not update confidence. Try again.');
    }
  };

  const handleUpdateAppStatus = async (appId: string, newStatus: ApplicationStatus) => {
    try {
      await api.patch(`/api/application/${appId}/status`, { status: newStatus });
      setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)));
      setFollowUpsDue((prev) => prev.filter((a) => a.id !== appId));
      toast.success(`Moved to ${STATUS_META[newStatus].label}.`);
    } catch (err) {
      console.error(err);
      toast.error('Could not update the status. Try again.');
    }
  };

  const handleMarkContacted = async (appId: string) => {
    try {
      const appToUpdate = applications.find((a) => a.id === appId) || followUpsDue.find((a) => a.id === appId);
      if (!appToUpdate) return;
      const nextFollowUp = new Date();
      nextFollowUp.setDate(nextFollowUp.getDate() + 7);
      const updated = { ...appToUpdate, dateLastContact: new Date().toISOString(), followUpDate: nextFollowUp.toISOString() };
      await api.put(`/api/application/${appId}`, updated);
      setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, ...updated } : a)));
      setFollowUpsDue((prev) => prev.filter((a) => a.id !== appId));
      toast.success('Marked as contacted. Next follow-up in 7 days.');
    } catch (err) {
      console.error(err);
      toast.error('Could not mark as contacted. Try again.');
    }
  };

  if (isLoading) return <DashboardSkeleton />;

  if (loadFailed) {
    return (
      <PageShell dataTestId="dashboard-page" title="Dashboard">
        <Panel>
          <EmptyState
            title="The dashboard could not load."
            description="Check your connection and try again."
            action={<Button variant="secondary" onClick={() => { setIsLoading(true); setLoadFailed(false); loadDashboardData(); }}>Retry</Button>}
          />
        </Panel>
      </PageShell>
    );
  }

  const activeTechStory = stories.length > 0 ? stories[selectedStoryIndex % stories.length] : null;
  const activeSTARStory = behavioralStories.length > 0 ? behavioralStories[selectedBehavioralIndex % behavioralStories.length] : null;
  const spotlightCount = spotlightType === 'technical' ? stories.length : behavioralStories.length;

  const summary = [
    { label: 'Reviews due', value: queue.length, to: '/story-bank/quiz' },
    { label: 'Follow-ups due', value: followUpsDue.length, to: '/applications' },
    { label: 'Active applications', value: activeApps.length, to: '/applications' },
    { label: 'Stories banked', value: stories.length + behavioralStories.length, to: '/story-bank' },
  ];

  const subtitleParts = [
    queue.length ? `${queue.length} ${queue.length === 1 ? 'story is' : 'stories are'} due for review` : 'No stories are due for review',
    followUpsDue.length ? `${followUpsDue.length} ${followUpsDue.length === 1 ? 'follow-up' : 'follow-ups'} waiting` : null,
  ].filter(Boolean);

  return (
    <PageShell
      dataTestId="dashboard-page"
      title={`${greeting()}, ${user?.firstName || 'there'}`}
      subtitle={`${subtitleParts.join(' and ')}.`}
      actions={
        <>
          <Button variant="secondary" icon={<Plus size={16} />} onClick={() => navigate('/story-bank', { state: { openNewForm: true } })}>
            New story
          </Button>
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/applications', { state: { openNewForm: true } })} data-testid="dash-applied-btn">
            New application
          </Button>
        </>
      }
    >
      {showOnboarding && (
        <Reveal>
          <Panel className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-medium text-fg">Set up your workspace</h2>
                <p className="mt-1 text-[13px] text-fg-3">Example stories are already in your bank. Three steps get everything else working.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowOnboarding(false)}>Dismiss</Button>
            </div>
            <ol className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                { done: (stats?.storyStats.totalReviewed ?? 0) > 0, title: 'Drill a story', body: 'Rate how well you recall one of the example stories.', cta: 'Start drill', to: '/story-bank/quiz' },
                { done: (stats?.applicationStats.totalApplications ?? 0) > 0, title: 'Log an application', body: 'Add a role you applied to so follow-ups get scheduled.', cta: 'Add application', to: '/applications', state: { openNewForm: true } },
                { done: (stats?.jobDescriptionStats.totalJobDescriptions ?? 0) > 0, title: 'Check a job description', body: 'Paste a posting to see which skills it asks for.', cta: 'Open JD Matcher', to: '/jd-matcher' },
              ].map((step) => (
                <li key={step.title} className="flex gap-3 rounded-lg border border-line bg-surface-2 p-4">
                  <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border', step.done ? 'border-transparent bg-accent text-accent-ink' : 'border-line-strong')}>
                    {step.done && <Check size={12} strokeWidth={3} />}
                  </span>
                  <div>
                    <p className="text-[13.5px] font-medium text-fg">{step.title}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-fg-3">{step.body}</p>
                    <Link to={step.to} state={step.state} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-text hover:underline">
                      {step.cta} <ArrowRight size={13} />
                    </Link>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </Reveal>
      )}

      <Reveal delay={0.04}>
        <Panel className="grid grid-cols-2 gap-px overflow-hidden bg-line md:grid-cols-4">
          {summary.map((s) => (
            <Link
              key={s.label}
              to={s.to}
              className="group flex flex-col gap-1 bg-surface-1 p-5 transition-colors hover:bg-surface-2"
            >
              <span className="flex items-center justify-between text-[13px] text-fg-3">
                {s.label}
                <ChevronRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
              <span className="num text-[30px] font-semibold leading-none tracking-tight text-fg">{s.value}</span>
            </Link>
          ))}
        </Panel>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Reveal delay={0.08}>
            <Panel>
              <PanelHeader
                title="Review queue"
                description="Stories due today, weakest first."
                actions={queue.length > 0 && <Button variant="primary" size="sm" icon={<Layers size={14} />} to="/story-bank/quiz">Start drill</Button>}
              />
              {queue.length === 0 ? (
                <EmptyState icon={<Check size={18} />} title="Nothing due today." description="Stories come back here when their next review date arrives." />
              ) : (
                <ul className="mt-3 divide-y divide-line border-t border-line">
                  {queue.slice(0, 6).map((q) => (
                    <li key={`${q.kind}-${q.id}`}>
                      <Link to="/story-bank/quiz" className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-surface-2/60">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-medium text-fg">{q.title}</p>
                          <p className="text-[12.5px] text-fg-3">{q.kind}</p>
                        </div>
                        <ConfidenceMeter level={q.confidence} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {queue.length > 6 && (
                <p className="border-t border-line px-5 py-3 text-[12.5px] text-fg-3">and {queue.length - 6} more in the drill.</p>
              )}
            </Panel>
          </Reveal>

          <Reveal delay={0.12}>
            <Panel>
              <PanelHeader
                title="Practise one story"
                description="Read it, say it out loud, then rate how it went."
                actions={
                  <>
                    <Segmented
                      size="sm"
                      ariaLabel="Story type"
                      value={spotlightType}
                      onChange={setSpotlightType}
                      options={[
                        { value: 'technical', label: 'Technical', count: stories.length },
                        { value: 'behavioral', label: 'STAR', count: behavioralStories.length },
                      ]}
                    />
                    {spotlightCount > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        iconRight={<ArrowRight size={14} />}
                        onClick={() => (spotlightType === 'technical' ? setSelectedStoryIndex((i) => i + 1) : setSelectedBehavioralIndex((i) => i + 1))}
                      >
                        Next
                      </Button>
                    )}
                  </>
                }
              />
              <div className="p-5">
                {spotlightType === 'technical' ? (
                  activeTechStory ? (
                    <article>
                      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-fg-3">
                        <span className="chip">{formatCategoryName(activeTechStory.category)}</span>
                        {activeTechStory.sourceProject && <span>{activeTechStory.sourceProject}</span>}
                      </div>
                      <h3 className="mt-3 text-[18px] font-semibold leading-snug tracking-tight text-fg">{activeTechStory.title}</h3>
                      <p className="mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-fg-2">{activeTechStory.explanation}</p>
                      {activeTechStory.codeSnippet && (
                        <pre className="mt-4 max-h-44 overflow-auto rounded-lg border border-line bg-bg p-4 font-mono text-[12px] leading-relaxed text-fg-2">
                          <code>{activeTechStory.codeSnippet}</code>
                        </pre>
                      )}
                      <div className="mt-5">
                        <p className="mb-2 text-[12.5px] text-fg-3">How confident are you telling this one?</p>
                        <ConfidencePicker value={activeTechStory.confidenceLevel} onChange={handleUpdateConfidence} size="sm" />
                      </div>
                    </article>
                  ) : (
                    <EmptyState className="px-0 py-6" title="No technical stories yet." action={<Button variant="secondary" size="sm" to="/story-bank">Add a story</Button>} />
                  )
                ) : activeSTARStory ? (
                  <article>
                    {activeSTARStory.tags && <span className="chip">{activeSTARStory.tags.split(',')[0]}</span>}
                    <h3 className="mt-3 text-[18px] font-semibold leading-snug tracking-tight text-fg">{activeSTARStory.title}</h3>
                    <dl className="mt-4 grid gap-3 text-[13px] leading-relaxed sm:grid-cols-2">
                      {(['situation', 'task', 'action', 'result'] as const).map((k) => (
                        <div key={k}>
                          <dt className="text-[12px] font-medium capitalize text-fg-3">{k}</dt>
                          <dd className="mt-0.5 line-clamp-3 text-fg-2">{activeSTARStory[k]}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-4">
                      <ConfidenceMeter level={activeSTARStory.confidenceLevel} />
                    </div>
                  </article>
                ) : (
                  <EmptyState className="px-0 py-6" title="No STAR stories yet." action={<Button variant="secondary" size="sm" to="/story-bank">Add a story</Button>} />
                )}
              </div>
            </Panel>
          </Reveal>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Reveal delay={0.1}>
            <Panel data-testid="followups-due-widget">
              <PanelHeader title="Follow-ups" description="Applications waiting on a nudge from you." />
              {followUpsDue.length === 0 ? (
                <EmptyState icon={<Check size={18} />} title="No follow-ups pending." />
              ) : (
                <ul className="mt-3 divide-y divide-line border-t border-line">
                  {followUpsDue.slice(0, 4).map((app) => {
                    const due = overdueLabel(app.followUpDate);
                    return (
                      <li key={app.id} data-testid={`followup-row-${app.id}`} className="flex items-center gap-3 px-5 py-3">
                        <Monogram name={app.companyName} size={32} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-medium text-fg">{app.companyName}</p>
                          <p className={cn('text-[12.5px]', due.overdue ? 'text-danger' : 'text-warning')}>{due.text}</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => handleMarkContacted(app.id)} data-testid={`mark-contacted-btn-${app.id}`}>
                          Mark contacted
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </Reveal>

          <Reveal delay={0.14}>
            <Panel>
              <PanelHeader
                title="Pipeline"
                description={`${applications.length} ${applications.length === 1 ? 'application' : 'applications'} tracked.`}
                actions={<Button variant="ghost" size="sm" to="/applications" iconRight={<ArrowRight size={14} />}>Open</Button>}
              />
              {applications.length === 0 ? (
                <EmptyState title="No applications yet." action={<Button variant="secondary" size="sm" onClick={() => navigate('/applications', { state: { openNewForm: true } })}>Add application</Button>} />
              ) : (
                <>
                  <div className="px-5 pt-4">
                    <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
                      {statusCounts.map(({ status, count }) => (
                        <span
                          key={status}
                          style={{ flexGrow: count }}
                          className={cn(
                            'h-full',
                            STATUS_META[status].tone === 'accent' && 'bg-accent',
                            STATUS_META[status].tone === 'warning' && 'bg-warning',
                            STATUS_META[status].tone === 'danger' && 'bg-danger',
                            STATUS_META[status].tone === 'neutral' && 'bg-fg-2',
                            STATUS_META[status].tone === 'muted' && 'bg-fg-3'
                          )}
                        />
                      ))}
                    </div>
                    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-fg-3">
                      {statusCounts.map(({ status, count }) => (
                        <li key={status}>
                          {STATUS_META[status].label} <span className="num font-medium text-fg">{count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <ul className="mt-4 divide-y divide-line border-t border-line">
                    {recentApps.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                        <Monogram name={a.companyName} size={32} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-medium text-fg">{a.companyName}</p>
                          <p className="truncate text-[12.5px] text-fg-3">{a.roleTitle}</p>
                        </div>
                        <Select
                          aria-label={`Status for ${a.companyName}`}
                          value={a.status}
                          onChange={(e) => handleUpdateAppStatus(a.id, e.target.value as ApplicationStatus)}
                          className="h-8 min-h-0 w-[136px] py-0 text-[12.5px]"
                        >
                          {STATUS_ORDER.filter((s) => s !== 'Ghosted' || a.status === 'Ghosted').map((s) => (
                            <option key={s} value={s}>{STATUS_META[s].label}</option>
                          ))}
                        </Select>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>
          </Reveal>

          <Reveal delay={0.18}>
            <Panel>
              <PanelHeader
                title="Skill coverage"
                description={`Dashed line marks interview-ready (${READINESS_TARGET}%).`}
                actions={<Button variant="ghost" size="sm" to="/readiness" iconRight={<ArrowRight size={14} />}>Details</Button>}
              />
              <div className="grid place-items-center px-5 pb-5 pt-2">
                {skillAxes.length >= 3 ? (
                  <SkillRadar axes={skillAxes} size={260} target={READINESS_TARGET} className="w-full max-w-[280px]" />
                ) : (
                  <EmptyState className="px-0" title="Add skills in at least three categories to see coverage." action={<Button variant="secondary" size="sm" to="/settings">Add skills</Button>} />
                )}
              </div>
            </Panel>
          </Reveal>
        </div>
      </div>

    </PageShell>
  );
}
