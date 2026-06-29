import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Application, Story, Skill, BehavioralStory, ConfidenceLevel } from '../types';
import { useAuth } from '../AuthContext';
import { useToast } from '../components/ui/Toast';
import { getSkillIcon, getCompanyIcon } from '../lib/utils';
import { CountUp } from '../components/animation/CountUp';
import SkillRadar from '../components/SkillRadar';
import { computeSkillAxes, READINESS_TARGET } from '../lib/skills';
import { 
  Layers, 
  FileCode2, 
  RefreshCw, 
  GitBranch, 
  Activity, 
  Terminal, 
  Hash, 
  ArrowUpRight, 
  Plus, 
  Sparkles,
  ArrowRight,
  Zap,
  Check,
  ChevronDown
} from 'lucide-react';

/* ─────── DESIGN TOKENS (Matching Landing.tsx) ─────── */
const C = {
  bg0: '#02050A', bg1: '#06090F', bg2: '#0B0F17', bg3: '#11161F',
  ink: '#E6EBF2', inkDim: '#9CA8B8', inkMute: '#5A6678',
  hair: 'rgba(255,255,255,0.07)', hair2: 'rgba(255,255,255,0.12)',
  teal: '#2dd4bf', tealDim: 'rgba(45,212,191,0.14)',
  violet: '#8b5cf6', rose: '#f43f5e', amber: '#f59e0b', sky: '#38bdf8', emerald: '#10b981',
} as const;

const ConfidenceRungs: { key: ConfidenceLevel; label: string; color: string; pct: number }[] = [
  { key: 'Panic',    label: 'Panic',    color: C.rose,    pct: 18 },
  { key: 'Shaky',    label: 'Shaky',    color: C.amber,   pct: 36 },
  { key: 'Okay',     label: 'Okay',     color: C.sky,     pct: 56 },
  { key: 'Solid',    label: 'Solid',    color: C.teal,    pct: 80 },
  { key: 'CanTeach', label: 'Can Teach',color: C.emerald, pct: 100 },
];

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
  const toast = useToast();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [behavioralStories, setBehavioralStories] = useState<BehavioralStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Spotlight controls
  const [spotlightType, setSpotlightType] = useState<'technical' | 'behavioral'>('technical');
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [selectedBehavioralIndex, setSelectedBehavioralIndex] = useState(0);

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
  const recentApps = [...applications]
    .sort((a, b) => new Date(b.dateApplied || b.followUpDate).getTime() - new Date(a.dateApplied || a.followUpDate).getTime())
    .slice(0, 6);

  const skillAxes = computeSkillAxes(skills);

  const statusPill = (status: string): { bg: string; color: string; border: string } => {
    let color: string = C.teal;
    if (status === 'Applied') color = C.teal;
    else if (status === 'PhoneScreen' || status === 'Interviewing' || status === 'Tech Interview') color = C.sky;
    else if (status === 'Offer') color = C.emerald;
    else if (status === 'Rejected') color = C.rose;
    else color = C.inkDim;
    return { bg: `${color}1c`, color, border: `1px solid ${color}44` };
  };

  const getCompanyLogo = (name: string) => {
    const { icon, color, isText, initials } = getCompanyIcon(name);
    if (isText) {
      return (
        <div className="h-7 w-7 rounded-md grid place-items-center shrink-0 font-display font-bold text-[11px]" style={{ background: color, color: '#fff' }}>
          {initials}
        </div>
      );
    }
    return (
      <div className="h-7 w-7 rounded-md grid place-items-center shrink-0" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
        <i className={`${icon} text-sm`} />
      </div>
    );
  };

  // Interactive handlers
  const handleUpdateConfidence = async (newRung: ConfidenceLevel) => {
    if (spotlightType === 'behavioral') return;
    const currentStory = stories[selectedStoryIndex % stories.length];
    if (!currentStory) return;

    try {
      const updated = await api.put<Story>(`/api/story/${currentStory.id}`, { ...currentStory, confidenceLevel: newRung });
      setStories((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast.success(`Updated confidence to ${newRung}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update story confidence.');
    }
  };

  const handleUpdateAppStatus = async (appId: string, newStatus: any) => {
    try {
      await api.patch(`/api/application/${appId}/status`, { status: newStatus });
      setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)));
      toast.success(`Moved application to ${newStatus}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3 font-mono text-sm" style={{ color: C.inkDim }}>
        <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: `${C.teal}22`, borderTopColor: C.teal }} />
        <span>Initializing Precept Command Center…</span>
      </div>
    );
  }

  // Active spotlight item
  const activeTechStory = stories.length > 0 ? stories[selectedStoryIndex % stories.length] : null;
  const activeSTARStory = behavioralStories.length > 0 ? behavioralStories[selectedBehavioralIndex % behavioralStories.length] : null;

  const currentConfidence = activeTechStory ? activeTechStory.confidenceLevel : 'Okay';
  const currentRungIndex = Math.max(0, ConfidenceRungs.findIndex(r => r.key.toLowerCase() === currentConfidence.toLowerCase()));

  // Stories due for review
  const dueForReview = stories.filter(s => s.confidenceLevel === 'Panic' || s.confidenceLevel === 'Shaky');

  return (
    <div className="font-body p-4 md:p-8 pt-4 md:pt-6 max-w-[1400px] mx-auto space-y-6" data-testid="dashboard-page" style={{ color: C.ink }}>
      
      {/* HEADER COCKPIT BAR */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 opacity-0 animate-fade-in-up">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em]" style={{ background: `${C.teal}14`, border: `1px solid ${C.teal}33`, color: C.teal }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: C.teal, boxShadow: `0 0 8px ${C.teal}` }} />
            Career OS Cockpit
          </div>
          <h1 className="mt-3 font-display font-bold leading-[1.05]" style={{ color: C.ink, fontSize: 'clamp(26px,3.5vw,36px)' }}>
            Welcome back,{' '}
            <span className="font-editorial" style={{ color: C.teal, fontWeight: 400 }}>
              {user?.firstName || 'developer'}.
            </span>
          </h1>
          <p className="mt-1 font-body text-[14px]" style={{ color: C.inkDim }}>
            All systems nominal. Track your pipeline, drill stories, and defend your readiness.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/story-bank', { state: { openNewForm: true } })}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors cursor-pointer hover:border-white/30"
            style={{ background: C.bg2, border: `1px solid ${C.hair2}`, color: C.ink }}
          >
            <Plus size={13} style={{ color: C.violet }} /> Bank Story
          </button>
          <button
            onClick={() => navigate('/applications', { state: { openNewForm: true } })}
            data-testid="dash-applied-btn"
            className="group inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] transition-all cursor-pointer"
            style={{ background: C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${C.ink}, 0 12px 40px -15px rgba(45,212,191,0.4)` }}
          >
            New Application <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* TOP METRICS RIBBON */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 opacity-0 animate-fade-in-up delay-100">
        {[
          { label: 'Active Pipeline', val: activeApps.length, sub: `${applications.length} total tracked`, color: C.teal, route: '/applications' },
          { label: 'Story Inventory', val: stories.length + behavioralStories.length, sub: `${stories.length} tech · ${behavioralStories.length} STAR`, color: C.violet, route: '/story-bank' },
          { label: 'Drill Readiness', val: stats?.storyStats.totalReviewed || 0, sub: `${dueForReview.length} items due for review`, color: C.amber, route: '/readiness' },
          { label: 'JD Match Score', val: stats?.jobDescriptionStats.averageMatchScore ? `${Math.round(stats.jobDescriptionStats.averageMatchScore)}%` : '—', sub: `${stats?.jobDescriptionStats.totalJobDescriptions || 0} analyses run`, color: C.sky, route: '/job-descriptions' },
        ].map((m, idx) => (
          <div 
            key={idx}
            onClick={() => navigate(m.route)}
            className="p-4 rounded-xl cursor-pointer transition-all duration-300 group hover:border-white/20"
            style={{ background: `linear-gradient(180deg, ${C.bg1} 0%, ${C.bg0} 100%)`, border: `1px solid ${C.hair}` }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] uppercase tracking-widest" style={{ color: C.inkMute }}>{m.label}</span>
              <ArrowUpRight size={13} style={{ color: C.inkMute }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="font-display text-[26px] font-bold mt-1.5 leading-none" style={{ color: m.color }}>
              {typeof m.val === 'number' ? <CountUp end={m.val} duration={1.2} /> : m.val}
            </div>
            <div className="font-mono text-[10.5px] mt-1.5 truncate" style={{ color: C.inkDim }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* FUNCTIONAL COMMAND CENTER WORKSPACE */}
      <div
        className="relative w-full rounded-2xl overflow-hidden opacity-0 animate-fade-in-up delay-200"
        style={{
          background: `linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)`,
          border: `1px solid ${C.hair2}`,
          boxShadow: `0 40px 100px -30px rgba(45,212,191,0.2), inset 0 1px 0 rgba(255,255,255,0.06)`,
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Window Chrome Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${C.hair}`, background: C.bg1 }}>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#febc2e" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28c840" }} />
          </div>
          <div
            className="hidden sm:flex items-center gap-2 rounded-md px-3 py-1 font-mono text-[11px]"
            style={{ background: C.bg2, color: C.inkDim, border: `1px solid ${C.hair}` }}
          >
            <Terminal size={12} style={{ color: C.teal }} /> precept · ~/career/cockpit
          </div>
          <div className="font-mono text-[11px] flex items-center gap-1.5" style={{ color: C.inkDim }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full animate-ping" style={{ background: C.emerald }} />
            <span style={{ color: C.emerald }}>live session</span>
          </div>
        </div>

        {/* Functional 3-Column Control Workspace Grid */}
        <div className="grid grid-cols-12 gap-4 p-4 md:p-6" style={{ background: C.bg1 }}>
          
          {/* Column 1: Interactive Story Drill & Spotlight (5 Cols) */}
          <div className="col-span-12 lg:col-span-5 rounded-xl flex flex-col justify-between" style={{ background: C.bg2, border: `1px solid ${C.hair}` }}>
            <div>
              {/* Top Bar with Mode Switcher */}
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${C.hair}` }}>
                <div className="flex items-center gap-1 p-0.5 rounded-lg font-mono text-[10px] uppercase tracking-wider" style={{ background: C.bg1, border: `1px solid ${C.hair}` }}>
                  <button
                    onClick={() => setSpotlightType('technical')}
                    className="px-2.5 py-1 rounded transition-colors cursor-pointer"
                    style={{ background: spotlightType === 'technical' ? C.tealDim : 'transparent', color: spotlightType === 'technical' ? C.teal : C.inkDim }}
                  >
                    Tech ({stories.length})
                  </button>
                  <button
                    onClick={() => setSpotlightType('behavioral')}
                    className="px-2.5 py-1 rounded transition-colors cursor-pointer"
                    style={{ background: spotlightType === 'behavioral' ? `${C.violet}22` : 'transparent', color: spotlightType === 'behavioral' ? C.violet : C.inkDim }}
                  >
                    STAR ({behavioralStories.length})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {(spotlightType === 'technical' ? stories.length : behavioralStories.length) > 1 && (
                    <button 
                      onClick={() => spotlightType === 'technical' ? setSelectedStoryIndex(i => i + 1) : setSelectedBehavioralIndex(i => i + 1)}
                      className="text-[10px] font-mono uppercase px-2 py-1 rounded cursor-pointer transition-colors hover:bg-white/10"
                      style={{ background: C.bg1, color: C.inkDim, border: `1px solid ${C.hair}` }}
                    >
                      Next Item →
                    </button>
                  )}
                </div>
              </div>

              {/* Story Content Card */}
              <div className="p-4 md:p-5">
                {spotlightType === 'technical' ? (
                  activeTechStory ? (
                    <>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="rounded-full px-2.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider" style={{ background: `${C.teal}22`, color: C.teal, border: `1px solid ${C.teal}33` }}>
                          {activeTechStory.category}
                        </span>
                        <span className="font-mono text-[10px]" style={{ color: C.inkMute }}>{activeTechStory.sourceProject || 'General'}</span>
                      </div>
                      <h3 className="font-display text-[18px] font-semibold leading-snug" style={{ color: C.ink }}>
                        {activeTechStory.title}
                      </h3>
                      <p className="mt-2 font-body text-[13px] leading-relaxed line-clamp-3" style={{ color: C.inkDim }}>
                        {activeTechStory.explanation}
                      </p>
                      {activeTechStory.codeSnippet && (
                        <pre className="mt-3.5 overflow-x-auto rounded-xl p-3.5 font-mono text-[11.5px] leading-[1.6] custom-scrollbar max-h-[160px]" style={{ background: C.bg0, color: C.inkDim, border: `1px solid ${C.hair}` }}>
                          <code>{activeTechStory.codeSnippet}</code>
                        </pre>
                      )}
                    </>
                  ) : (
                    <div className="py-12 text-center font-mono text-xs" style={{ color: C.inkMute }}>
                      No technical stories banked yet. Bank stories to enable instant recall drilling.
                    </div>
                  )
                ) : (
                  activeSTARStory ? (
                    <>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="rounded-full px-2.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider" style={{ background: `${C.violet}22`, color: C.violet, border: `1px solid ${C.violet}33` }}>
                          STAR Method
                        </span>
                        <span className="font-mono text-[10px]" style={{ color: C.inkMute }}>{activeSTARStory.company || 'General'}</span>
                      </div>
                      <h3 className="font-display text-[18px] font-semibold leading-snug" style={{ color: C.ink }}>
                        {activeSTARStory.title}
                      </h3>
                      <div className="mt-3 space-y-2 font-body text-[12.5px] leading-relaxed" style={{ color: C.inkDim }}>
                        <p><strong className="text-purple-400 font-mono text-[11px] uppercase">Situation:</strong> {activeSTARStory.situation}</p>
                        <p className="line-clamp-2"><strong className="text-teal-400 font-mono text-[11px] uppercase">Action:</strong> {activeSTARStory.action}</p>
                        <p className="line-clamp-2"><strong className="text-emerald-400 font-mono text-[11px] uppercase">Result:</strong> {activeSTARStory.result}</p>
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center font-mono text-xs" style={{ color: C.inkMute }}>
                      No STAR behavioral stories banked yet.
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Interactive Confidence Update Bar & Drill CTA */}
            <div className="p-4 md:p-5 pt-0 space-y-3">
              {spotlightType === 'technical' && activeTechStory && (
                <div className="p-3.5 rounded-xl space-y-2" style={{ background: C.bg1, border: `1px solid ${C.hair}` }}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.inkMute }}>
                      Click to Update Confidence
                    </span>
                    <span className="font-mono text-[11px] font-semibold" style={{ color: ConfidenceRungs[currentRungIndex]?.color || C.teal }}>
                      {activeTechStory.confidenceLevel}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {ConfidenceRungs.map((r) => {
                      const isCurrent = r.key.toLowerCase() === activeTechStory.confidenceLevel.toLowerCase();
                      return (
                        <button
                          key={r.key}
                          onClick={() => handleUpdateConfidence(r.key)}
                          title={`Set confidence to ${r.label}`}
                          className="py-1.5 rounded text-[9.5px] font-mono uppercase transition-all cursor-pointer truncate text-center"
                          style={{
                            background: isCurrent ? `${r.color}22` : C.bg0,
                            color: isCurrent ? r.color : C.inkMute,
                            border: `1px solid ${isCurrent ? r.color : C.hair}`,
                            boxShadow: isCurrent ? `0 0 10px ${r.color}33` : 'none'
                          }}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={() => navigate('/readiness')}
                className="w-full py-2.5 rounded-xl font-mono text-[11px] font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-white/30"
                style={{ background: C.tealDim, color: C.teal, border: `1px solid ${C.teal}44` }}
              >
                <Zap size={14} /> Launch Spaced Repetition Drill
              </button>
            </div>
          </div>

          {/* Column 2: Live Pipeline Action Center (4 Cols) */}
          <div className="col-span-12 lg:col-span-4 rounded-xl p-4 md:p-5 flex flex-col justify-between" style={{ background: C.bg2, border: `1px solid ${C.hair}` }}>
            <div>
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider mb-3 pb-2" style={{ color: C.inkDim, borderBottom: `1px solid ${C.hair}` }}>
                <span className="flex items-center gap-1.5"><GitBranch size={13} style={{ color: C.teal }} /> Active Pipeline</span>
                <span style={{ color: C.teal }}>{activeApps.length} active</span>
              </div>

              <div className="space-y-2">
                {recentApps.length === 0 && (
                  <div className="py-12 text-center font-mono text-xs" style={{ color: C.inkMute }}>No applications logged yet.</div>
                )}
                {recentApps.map((a) => {
                  const pill = statusPill(a.status);
                  return (
                    <div 
                      key={a.id} 
                      onClick={() => navigate('/applications')}
                      className="flex items-center justify-between rounded-xl p-3 cursor-pointer transition-colors hover:border-white/20" 
                      style={{ background: C.bg1, border: `1px solid ${C.hair}` }}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        {getCompanyLogo(a.companyName)}
                        <div className="min-w-0">
                          <div className="font-body text-[13px] font-semibold truncate" style={{ color: C.ink }}>{a.companyName}</div>
                          <div className="font-mono text-[10.5px] truncate" style={{ color: C.inkMute }}>{a.roleTitle}</div>
                        </div>
                      </div>

                      {/* Interactive Quick Status Changer */}
                      <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={a.status}
                          onChange={(e) => handleUpdateAppStatus(a.id, e.target.value)}
                          className="appearance-none rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider font-semibold cursor-pointer pr-6 focus:outline-none transition-all"
                          style={{ background: pill.bg, color: pill.color, border: pill.border }}
                        >
                          <option value="Applied" style={{ background: C.bg1, color: C.ink }}>Applied</option>
                          <option value="PhoneScreen" style={{ background: C.bg1, color: C.ink }}>Phone Screen</option>
                          <option value="Interviewing" style={{ background: C.bg1, color: C.ink }}>Interviewing</option>
                          <option value="Offer" style={{ background: C.bg1, color: C.emerald }}>Offer</option>
                          <option value="Rejected" style={{ background: C.bg1, color: C.rose }}>Rejected</option>
                        </select>
                        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: pill.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button 
              onClick={() => navigate('/applications')}
              className="mt-4 w-full text-center py-2.5 rounded-xl font-mono text-[11px] uppercase tracking-wider cursor-pointer transition-colors hover:border-white/20 flex items-center justify-center gap-1.5"
              style={{ background: 'rgba(255,255,255,0.02)', color: C.ink, border: `1px solid ${C.hair}` }}
            >
              Manage Full Kanban Board →
            </button>
          </div>

          {/* Column 3: Readiness Radar & Review Queue (3 Cols) */}
          <div className="col-span-12 lg:col-span-3 rounded-xl p-4 md:p-5 flex flex-col justify-between" style={{ background: C.bg2, border: `1px solid ${C.hair}` }}>
            <div>
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider mb-3 pb-2" style={{ color: C.inkDim, borderBottom: `1px solid ${C.hair}` }}>
                <span className="flex items-center gap-1.5"><Activity size={13} style={{ color: C.sky }} /> Readiness</span>
                <span style={{ color: C.amber }}>{dueForReview.length} due</span>
              </div>

              {/* Radar Preview */}
              <div 
                onClick={() => navigate('/readiness')}
                className="mb-4 flex items-center justify-center min-h-[150px] cursor-pointer rounded-xl p-2 transition-transform hover:scale-[1.02]"
                style={{ background: C.bg1, border: `1px solid ${C.hair}` }}
              >
                {skillAxes.length >= 3 ? (
                  <SkillRadar axes={skillAxes} size={150} target={READINESS_TARGET} className="w-full max-w-[170px]" />
                ) : (
                  <div className="text-center font-mono text-xs p-4" style={{ color: C.inkMute }}>
                    Add skills across ≥3 categories to generate your radar.
                  </div>
                )}
              </div>

              {/* Due For Review Quick Action List */}
              <div className="space-y-1.5">
                <div className="font-mono text-[10px] uppercase tracking-widest px-1 mb-1" style={{ color: C.inkMute }}>Immediate Review Queue</div>
                {dueForReview.slice(0, 3).map((s) => (
                  <div 
                    key={s.id} 
                    onClick={() => navigate('/readiness')}
                    className="flex items-center justify-between rounded-lg px-2.5 py-2 font-mono text-[11px] cursor-pointer transition-colors hover:border-white/20" 
                    style={{ background: C.bg1, color: C.inkDim, border: `1px solid ${C.hair}` }}
                  >
                    <span className="truncate flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0 animate-pulse" style={{ background: s.confidenceLevel === 'Panic' ? C.rose : C.amber }} />
                      <span className="truncate">{s.title}</span>
                    </span>
                    <span className="text-[9.5px] uppercase font-semibold shrink-0 ml-2 px-1.5 py-0.5 rounded" style={{ background: `${C.amber}1c`, color: C.amber }}>Drill</span>
                  </div>
                ))}
                {dueForReview.length === 0 && (
                  <div className="py-4 text-center font-mono text-xs rounded-lg" style={{ background: C.bg1, color: C.emerald }}>
                    ✓ All banked stories are solid!
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={() => navigate('/readiness')}
              className="mt-4 w-full text-center py-2.5 rounded-xl font-mono text-[11px] uppercase tracking-wider cursor-pointer transition-colors hover:border-white/20"
              style={{ background: 'rgba(255,255,255,0.02)', color: C.ink, border: `1px solid ${C.hair}` }}
            >
              Open Full Readiness Matrix →
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}

