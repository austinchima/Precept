import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { api } from '../api';
import { Application, Story, Skill, BehavioralStory } from '../types';
import { useAuth } from '../AuthContext';
import { getSkillIcon, getCompanyIcon } from '../lib/utils';
import { CountUp } from '../components/animation/CountUp';
import { AnimatedSection } from '../components/animation/AnimatedSection';
import SkillRadar from '../components/SkillRadar';
import { computeSkillAxes, READINESS_TARGET } from '../lib/skills';
import { ArrowRight, ArrowUpRight, Plus, Hash } from 'lucide-react';

/* ─────── DESIGN TOKENS (Landing.tsx) ─────── */
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
  <span
    className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em]"
    style={{ background: `${color}14`, border: `1px solid ${color}33`, color }}
  >
    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
    {children}
  </span>
);

interface DashboardStats {
  storyStats: {
    totalStories: number;
    confidenceBreakdown: Record<string, number>;
    categoryBreakdown: Record<string, number>;
    totalReviewed: number;
    needsReview: number;
  };
  applicationStats: {
    totalApplications: number;
    statusBreakdown: Record<string, number>;
    interviewingCount: number;
    offersCount: number;
    rejectionRate: number;
    responseRate: number;
  };
  jobDescriptionStats: {
    totalJobDescriptions: number;
    averageMatchScore: number;
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [behavioralStories, setBehavioralStories] = useState<BehavioralStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeAppTab, setActiveAppTab] = useState<'Total' | 'Active' | 'Interviews' | 'Offers'>('Total');
  const [activeStoryTag, setActiveStoryTag] = useState<string | null>(null);
  const [activeStarTab, setActiveStarTab] = useState<'situation' | 'task' | 'action' | 'result'>('situation');

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [statsData, appsData, storiesData, skillsData, behavioralStoriesData] = await Promise.all([
          api.get<DashboardStats>('/api/dashboard'),
          api.get<Application[]>('/api/application'),
          api.get<Story[]>('/api/story'),
          api.get<Skill[]>('/api/skill'),
          api.get<BehavioralStory[]>('/api/behavioralstory'),
        ]);
        setStats(statsData);
        setApplications(appsData);
        setStories(storiesData);
        setSkills(skillsData);
        setBehavioralStories(behavioralStoriesData);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const activeApps = applications.filter((a) => ['Applied', 'PhoneScreen', 'Interviewing'].includes(a.status));
  const interviewApps = applications.filter((a) => ['PhoneScreen', 'Interviewing'].includes(a.status));
  const offerApps = applications.filter((a) => a.status === 'Offer');

  const getFilteredApps = () => {
    switch (activeAppTab) {
      case 'Active': return activeApps;
      case 'Interviews': return interviewApps;
      case 'Offers': return offerApps;
      default: return applications;
    }
  };

  const recentApps = getFilteredApps()
    .sort((a, b) => new Date(b.dateApplied || b.followUpDate).getTime() - new Date(a.dateApplied || a.followUpDate).getTime())
    .slice(0, 3);

  const storyTags: string[] = Array.from(
    new Set<string>(
      behavioralStories.flatMap((s) =>
        s.tags ? s.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      ),
    ),
  ).slice(0, 4);

  const filteredBehavioralStories = activeStoryTag
    ? behavioralStories.filter((s) => s.tags?.toLowerCase().includes(activeStoryTag.toLowerCase()))
    : behavioralStories;

  const recentBehavioralStories = filteredBehavioralStories.slice(0, 3);

  const topSkills = [...skills]
    .sort((a, b) => {
      const pA = a.proficiencyLevel === 'Expert' ? 4 : a.proficiencyLevel === 'Advanced' ? 3 : a.proficiencyLevel === 'Intermediate' ? 2 : 1;
      const pB = b.proficiencyLevel === 'Expert' ? 4 : b.proficiencyLevel === 'Advanced' ? 3 : b.proficiencyLevel === 'Intermediate' ? 2 : 1;
      return pB - pA;
    })
    .slice(0, 6);

  const statusPill = (status: string): React.CSSProperties => {
    let color: string = C.teal;
    if (status === 'Applied') color = C.teal;
    else if (status === 'PhoneScreen' || status === 'Interviewing' || status === 'Tech Interview') color = C.sky;
    else if (status === 'Offer') color = C.emerald;
    else if (status === 'Rejected') color = C.rose;
    else color = C.inkDim;
    return { background: `${color}1c`, color, border: `1px solid ${color}44` };
  };

  const getProficiencyPercentage = (level: string) => {
    switch (level) {
      case 'Expert': return 95;
      case 'Advanced': return 80;
      case 'Intermediate': return 60;
      case 'Beginner': return 30;
      default: return 50;
    }
  };

  const getConfidenceColor = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'panic': return C.rose;
      case 'shaky': return '#fb923c';
      case 'okay': return C.amber;
      case 'solid': return C.teal;
      case 'canteach': return C.emerald;
      default: return C.violet;
    }
  };

  const getCompanyLogo = (name: string) => {
    const { icon, color, isText, initials } = getCompanyIcon(name);
    if (isText) {
      return (
        <div className="h-8 w-8 rounded-lg grid place-items-center shrink-0 font-display font-bold text-[12px]" style={{ background: color, color: '#fff' }}>
          {initials}
        </div>
      );
    }
    return (
      <div className="h-8 w-8 rounded-lg grid place-items-center shrink-0" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
        <i className={`${icon} text-base`} />
      </div>
    );
  };

  const skillAxes = computeSkillAxes(skills);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3 font-mono text-sm" style={{ color: C.inkDim }}>
        <div className="w-12 h-12 rounded-full border-4 animate-spin" style={{ borderColor: `${C.teal}1c`, borderTopColor: C.teal }} />
        <span>Booting command center…</span>
      </div>
    );
  }

  const appCount = activeAppTab === 'Total' ? applications.length :
    activeAppTab === 'Active' ? activeApps.length :
    activeAppTab === 'Interviews' ? (stats?.applicationStats.interviewingCount || 0) :
    (stats?.applicationStats.offersCount || 0);

  return (
    <div className="font-body p-4 md:p-8 pt-4 md:pt-6 max-w-[1400px] mx-auto space-y-6" data-testid="dashboard-page" style={{ color: C.ink }}>

      {/* HERO WELCOME */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 opacity-0 animate-fade-in-up delay-200">
        <div>
          <Eyebrow color={C.teal}>Command center</Eyebrow>
          <h1 className="mt-4 font-display font-bold leading-[1.05]" style={{ color: C.ink, fontSize: 'clamp(28px,4vw,40px)' }}>
            Welcome back,{' '}
            <span className="font-editorial" style={{ color: C.teal, fontWeight: 400 }}>
              {user?.firstName || 'developer'}.
            </span>
          </h1>
          <p className="mt-2 font-body text-[14.5px]" style={{ color: C.inkDim }}>
            Your pipeline, stories and skills — in one cockpit.
          </p>
        </div>
        <button
          onClick={() => navigate('/applications')}
          data-testid="dash-applied-btn"
          className="group inline-flex items-center gap-2 rounded-full px-5 py-3 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] transition-all cursor-pointer"
          style={{ background: C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${C.ink}, 0 18px 60px -20px rgba(45,212,191,0.45)` }}
        >
          New application <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* ACTIVE APPS + STATS */}
      <section className="overflow-hidden opacity-0 animate-fade-in-up delay-300" style={cardStyle()}>
        <div className="p-5 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" style={{ borderBottom: `1px solid ${C.hair}` }}>
          <div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: C.inkMute }}>
              Active applications · {activeAppTab.toLowerCase()}
            </div>
            <div className="mt-1 font-display text-[34px] font-bold leading-none" style={{ color: C.ink }}>
              <CountUp end={appCount} duration={1.2} />
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {(['Total', 'Active', 'Interviews', 'Offers'] as const).map((t) => {
              const isActive = activeAppTab === t;
              const colorMap: Record<typeof t, string> = { Total: C.teal as string, Active: C.sky as string, Interviews: C.amber as string, Offers: C.emerald as string };
              const color = colorMap[t];
              return (
                <button
                  key={t}
                  onClick={() => setActiveAppTab(t)}
                  data-testid={`apps-tab-${t.toLowerCase()}`}
                  className="px-3.5 py-1.5 rounded-full font-mono text-[11px] uppercase tracking-[0.16em] transition-all cursor-pointer"
                  style={{
                    background: isActive ? `${color}1c` : 'transparent',
                    color: isActive ? color : C.inkDim,
                    border: `1px solid ${isActive ? `${color}55` : C.hair}`,
                    boxShadow: isActive ? `0 0 14px -2px ${color}66` : 'none',
                  }}
                >
                  {t}
                </button>
              );
            })}
          </nav>

          <button
            onClick={() => navigate('/applications', { state: { openNewForm: true } })}
            data-testid="dash-new-app-btn"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.hair2}`, color: C.ink }}
          >
            <Plus size={13} /> New
          </button>
        </div>

        {/* Desktop table */}
        <AnimatedSection animation="staggerFadeUp" stagger={0.05} childSelector="tbody tr" className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.hair}` }}>
                <th className="px-6 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.16em]" style={{ color: C.inkMute }}>Company</th>
                <th className="px-6 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.16em]" style={{ color: C.inkMute }}>Role</th>
                <th className="px-6 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.16em]" style={{ color: C.inkMute }}>Status</th>
                <th className="px-6 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.16em]" style={{ color: C.inkMute }}>Applied</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recentApps.length === 0 && (
                <tr><td colSpan={5} className="py-14 text-center font-mono text-sm" style={{ color: C.inkMute }}>No active records yet. Add one above.</td></tr>
              )}
              {recentApps.map((app) => (
                <tr
                  key={app.id}
                  onClick={() => navigate('/applications')}
                  className="transition-colors cursor-pointer group"
                  style={{ borderBottom: `1px solid ${C.hair}` }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {getCompanyLogo(app.companyName)}
                      <span className="font-body font-semibold transition-colors" style={{ color: C.ink }}>{app.companyName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-body text-[13.5px]" style={{ color: C.inkDim }}>{app.roleTitle}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-mono uppercase tracking-widest" style={statusPill(app.status)}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-[11.5px]" style={{ color: C.inkDim }}>
                    {app.dateApplied ? new Date(app.dateApplied).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ArrowRight size={14} style={{ color: C.inkMute }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AnimatedSection>

        {/* Mobile list */}
        <div className="md:hidden p-4 space-y-3">
          {recentApps.length === 0 && (
            <div className="py-8 text-center font-mono text-sm" style={{ color: C.inkMute }}>No active records yet.</div>
          )}
          {recentApps.map((app) => (
            <div key={app.id} onClick={() => navigate('/applications')} className="p-4 cursor-pointer transition-colors" style={{ ...cardStyle(), borderRadius: 14 }}>
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {getCompanyLogo(app.companyName)}
                  <div className="min-w-0">
                    <div className="font-body font-semibold truncate" style={{ color: C.ink }}>{app.companyName}</div>
                    <div className="font-mono text-[11px] truncate" style={{ color: C.inkMute }}>{app.roleTitle}</div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest" style={statusPill(app.status)}>{app.status}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick stats footer */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-5" style={{ borderTop: `1px solid ${C.hair}`, background: 'rgba(255,255,255,0.015)' }}>
          {[
            { l: 'Total', n: applications.length, c: C.teal },
            { l: 'Active', n: activeApps.length, c: C.sky },
            { l: 'Interviews', n: stats?.applicationStats.interviewingCount || 0, c: C.amber },
            { l: 'Offers', n: stats?.applicationStats.offersCount || 0, c: C.emerald },
          ].map((s) => (
            <div key={s.l} className="rounded-xl p-3" style={{ background: C.bg2, border: `1px solid ${C.hair}` }}>
              <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.inkMute }}>{s.l}</div>
              <div className="font-display text-[24px] font-bold leading-none mt-1.5" style={{ color: s.c }}>
                <CountUp end={s.n} duration={1.2} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* LOWER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* STAR Story Bank */}
        <section className="lg:col-span-2 p-6 flex flex-col h-[620px] opacity-0 animate-fade-in-up delay-400" style={cardStyle()}>
          <div className="flex justify-between items-start gap-3 mb-5">
            <div>
              <Eyebrow color={C.violet}>Story bank · STAR</Eyebrow>
              <div className="mt-3 font-display text-[28px] font-bold leading-none" style={{ color: C.ink }}>
                <CountUp end={behavioralStories.length} duration={1.2} /> <span className="text-[16px] font-normal" style={{ color: C.inkDim }}>narratives</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/story-bank')}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.hair2}`, color: C.ink }}
              >
                Browse <ArrowUpRight size={12} />
              </button>
              <button
                onClick={() => navigate('/story-bank', { state: { openNewForm: true } })}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] cursor-pointer"
                style={{ background: C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${C.ink}` }}
              >
                <Plus size={12} /> New
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-5">
            <button
              onClick={() => setActiveStoryTag(null)}
              className="px-3 py-1 rounded-full font-mono text-[11px] uppercase tracking-[0.16em] transition-colors cursor-pointer"
              style={{
                background: !activeStoryTag ? C.tealDim : 'transparent',
                color: !activeStoryTag ? C.teal : C.inkDim,
                border: `1px solid ${!activeStoryTag ? `${C.teal}44` : C.hair}`,
              }}
            >
              All
            </button>
            {(storyTags.length === 0 ? ['Problem Solving', 'Leadership', 'System Design'] : storyTags).map((tag) => {
              const isActive = activeStoryTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setActiveStoryTag(tag)}
                  className="px-3 py-1 rounded-full font-mono text-[11px] uppercase tracking-[0.16em] transition-colors cursor-pointer"
                  style={{
                    background: isActive ? C.tealDim : 'transparent',
                    color: isActive ? C.teal : C.inkDim,
                    border: `1px solid ${isActive ? `${C.teal}44` : C.hair}`,
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          {/* Body */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden gap-5">
            <nav className="md:w-32 flex md:flex-col gap-2 md:gap-1.5 overflow-x-auto md:overflow-visible">
              {(['situation', 'task', 'action', 'result'] as const).map((t) => {
                const active = activeStarTab === t;
                return (
                  <button
                    key={t}
                    onClick={() => setActiveStarTab(t)}
                    data-testid={`star-tab-${t}`}
                    className="whitespace-nowrap md:w-full text-center md:text-left px-3 py-2 rounded-lg font-mono text-[11px] uppercase tracking-[0.16em] cursor-pointer transition-colors"
                    style={{
                      background: active ? C.tealDim : 'transparent',
                      color: active ? C.teal : C.inkDim,
                      border: `1px solid ${active ? `${C.teal}44` : C.hair}`,
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </nav>

            <AnimatedSection animation="staggerFadeUp" stagger={0.08} childSelector="> div" className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {recentBehavioralStories.length === 0 && (
                <div className="text-center font-mono text-sm py-12" style={{ color: C.inkMute }}>
                  No narratives yet — bank one to start.
                </div>
              )}
              {recentBehavioralStories.map((story) => {
                const preview =
                  activeStarTab === 'situation' ? story.situation :
                  activeStarTab === 'task' ? story.task :
                  activeStarTab === 'action' ? story.action :
                  story.result;
                return (
                  <div
                    key={story.id}
                    onClick={() => navigate('/story-bank')}
                    className="p-4 cursor-pointer transition-all duration-300 group"
                    style={{ background: C.bg2, border: `1px solid ${C.hair}`, borderRadius: 14 }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.hair2)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.hair)}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Hash size={12} style={{ color: C.violet }} />
                        <h3 className="font-display text-[14.5px] font-semibold truncate" style={{ color: C.ink }}>{story.title}</h3>
                      </div>
                      <span className="font-mono text-[9.5px] uppercase tracking-widest" style={{ color: C.inkMute }}>{activeStarTab}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {story.tags ? story.tags.split(',').map((t, i) => (
                        <span key={i} className="px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-widest" style={{ background: C.bg1, color: C.inkDim, border: `1px solid ${C.hair}`, borderRadius: 6 }}>
                          {t.trim()}
                        </span>
                      )) : (
                        <span className="px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-widest" style={{ background: C.bg1, color: C.inkDim, border: `1px solid ${C.hair}`, borderRadius: 6 }}>behavioral</span>
                      )}
                    </div>
                    <p className="font-body text-[13px] leading-relaxed line-clamp-2" style={{ color: C.inkDim }}>
                      {preview || 'No context recorded.'}
                    </p>
                  </div>
                );
              })}
            </AnimatedSection>
          </div>
        </section>

        {/* SKILLS SIDE */}
        <div className="flex flex-col gap-5 h-[620px] opacity-0 animate-fade-in-up delay-500">
          <section
            onClick={() => navigate('/readiness')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('/readiness'); }}
            className="p-6 flex flex-col relative overflow-hidden cursor-pointer group"
            style={cardStyle()}
            data-testid="dash-skills-radar"
          >
            <div className="flex items-center justify-between mb-3">
              <Eyebrow color={C.sky}>Skills matrix</Eyebrow>
              <ArrowUpRight size={14} style={{ color: C.inkMute }} className="opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              {skillAxes.length >= 3 ? (
                <SkillRadar axes={skillAxes} size={220} target={READINESS_TARGET} className="w-full max-w-[240px] transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="text-center font-mono text-xs" style={{ color: C.inkMute }}>
                  Add skills in ≥3 categories<br />to chart your matrix.
                </div>
              )}
            </div>
          </section>

          <section className="p-5 flex-1 overflow-hidden" style={cardStyle()}>
            <Eyebrow color={C.amber}>Top skills</Eyebrow>
            <AnimatedSection animation="staggerFadeUp" stagger={0.06} childSelector="> div" className="grid grid-cols-2 gap-2.5 mt-4">
              {topSkills.length === 0 && (
                <div className="col-span-2 py-4 text-center font-mono text-sm" style={{ color: C.inkMute }}>No skills yet.</div>
              )}
              {topSkills.map((skill) => {
                const details = getSkillIcon(skill.name);
                const pct = getProficiencyPercentage(skill.proficiencyLevel);
                return (
                  <div key={skill.id} className="p-3 transition-all duration-300" style={{ background: C.bg2, border: `1px solid ${C.hair}`, borderLeft: `2px solid ${details.color}55`, borderRadius: 10 }}>
                    <div className="flex items-center gap-2 mb-1">
                      <i className={details.icon} style={{ color: details.color, fontSize: 14 }} />
                      <span className="font-body font-semibold text-[12.5px] truncate" style={{ color: C.ink }}>{skill.name}</span>
                    </div>
                    <div className="flex justify-between font-mono text-[9.5px] uppercase tracking-widest mt-1.5" style={{ color: C.inkMute }}>
                      <span>level</span><span style={{ color: C.ink }}>{pct}%</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full" style={{ background: C.hair }}>
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: details.color }} />
                    </div>
                  </div>
                );
              })}
            </AnimatedSection>
          </section>
        </div>
      </div>

      {/* ANALYTICS */}
      <section className="p-6 opacity-0 animate-fade-in-up delay-500" style={cardStyle()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <Eyebrow color={C.violet}>Analytics</Eyebrow>
            <h2 className="mt-3 font-display text-[22px] font-bold leading-tight" style={{ color: C.ink }}>
              Pipeline <span className="font-editorial" style={{ color: C.violet, fontWeight: 400 }}>insights.</span>
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pipeline funnel */}
          <div className="lg:col-span-2 p-5 flex flex-col gap-5" style={{ background: C.bg2, border: `1px solid ${C.hair}`, borderRadius: 14 }}>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: C.inkMute }}>Application pipeline</div>
              <div className="font-display text-[24px] font-bold mt-1" style={{ color: C.ink }}>
                <CountUp end={stats?.applicationStats.totalApplications || 0} duration={1.2} /> total
              </div>
            </div>
            {[
              { l: 'Response rate', v: stats?.applicationStats.responseRate || 0, c: C.sky },
              { l: 'Offer conversion', v: stats?.applicationStats.interviewingCount ? (stats.applicationStats.offersCount / stats.applicationStats.interviewingCount) * 100 : 0, c: C.teal },
              { l: 'Rejection rate', v: stats?.applicationStats.rejectionRate || 0, c: C.rose },
            ].map((m) => (
              <div key={m.l}>
                <div className="flex justify-between font-mono text-[10.5px] mb-1">
                  <span style={{ color: C.inkMute }}>{m.l}</span>
                  <span style={{ color: C.ink }}>{m.v.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: C.hair }}>
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, m.v)}%`, background: m.c, boxShadow: `0 0 10px ${m.c}55` }} />
                </div>
              </div>
            ))}
          </div>

          {/* JD match gauge */}
          <div className="p-5 flex flex-col items-center justify-center" style={{ background: C.bg2, border: `1px solid ${C.hair}`, borderRadius: 14 }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] mb-3" style={{ color: C.inkMute }}>JD match avg.</div>
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="56" stroke={C.hair} strokeWidth="8" fill="transparent" />
                <circle
                  cx="64" cy="64" r="56"
                  stroke={C.teal}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={351.86}
                  strokeDashoffset={351.86 - (351.86 * (stats?.jobDescriptionStats.averageMatchScore || 0)) / 100}
                  strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 0 8px ${C.teal}88)`, transition: 'stroke-dashoffset 1.5s ease-out' }}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div>
                  <div className="font-display text-[28px] font-bold leading-none text-center" style={{ color: C.ink }}>
                    <CountUp end={stats?.jobDescriptionStats.averageMatchScore ? parseInt(stats.jobDescriptionStats.averageMatchScore.toFixed(0)) : 0} duration={1.5} />
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-center mt-0.5" style={{ color: C.inkMute }}>percent</div>
                </div>
              </div>
            </div>
          </div>

          {/* Story confidence */}
          <div className="p-5" style={{ background: C.bg2, border: `1px solid ${C.hair}`, borderRadius: 14 }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: C.inkMute }}>Story readiness</div>
            <div className="font-display text-[16px] font-semibold mt-1" style={{ color: C.ink }}>
              <CountUp end={stats?.storyStats.totalReviewed || 0} duration={1.2} /> / <CountUp end={stats?.storyStats.totalStories || 0} duration={1.2} /> reviewed
            </div>
            <div className="font-mono text-[10.5px] mt-1" style={{ color: C.teal }}>
              <CountUp end={stats?.storyStats.needsReview || 0} duration={1.2} /> due for drill
            </div>
            <div className="h-32 mt-3">
              {stats?.storyStats.confidenceBreakdown && Object.keys(stats.storyStats.confidenceBreakdown).length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Object.entries(stats.storyStats.confidenceBreakdown).map(([k, v]) => ({ name: k, count: v }))} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: C.inkMute, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.inkMute, fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ background: C.bg0, border: `1px solid ${C.hair2}`, borderRadius: 10, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {Object.entries(stats.storyStats.confidenceBreakdown).map((entry, i) => (
                        <Cell key={i} fill={getConfidenceColor(entry[0])} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full grid place-items-center font-mono text-[11px] italic" style={{ color: C.inkMute }}>No confidence data yet</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
