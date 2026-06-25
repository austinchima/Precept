import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { api } from '../api';
import { Application, Story, Skill, BehavioralStory } from '../types';
import { useAuth } from '../AuthContext';
import { getSkillIcon, getCompanyIcon } from '../lib/utils';

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

  // View & Filtering States
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
          api.get<BehavioralStory[]>('/api/behavioralstory')
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

  // Helpers
  const formatNumber = (num: number): string => String(num).padStart(2, '0');

  const activeApps = applications.filter(a => ['Applied', 'PhoneScreen', 'Interviewing'].includes(a.status));
  const interviewApps = applications.filter(a => ['PhoneScreen', 'Interviewing'].includes(a.status));
  const offerApps = applications.filter(a => a.status === 'Offer');

  // Filter applications shown in table based on the active top tab
  const getFilteredApps = () => {
    switch (activeAppTab) {
      case 'Active':
        return activeApps;
      case 'Interviews':
        return interviewApps;
      case 'Offers':
        return offerApps;
      case 'Total':
      default:
        return applications;
    }
  };

  const recentApps = getFilteredApps()
    .sort((a, b) => new Date(b.dateApplied || b.followUpDate).getTime() - new Date(a.dateApplied || a.followUpDate).getTime())
    .slice(0, 3);

  // Extract unique tags for STAR stories
  const storyTags: string[] = Array.from(
    new Set<string>(
      behavioralStories.flatMap(s => 
        s.tags ? s.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      )
    )
  ).slice(0, 4);

  const filteredBehavioralStories = activeStoryTag
    ? behavioralStories.filter(s => s.tags?.toLowerCase().includes(activeStoryTag.toLowerCase()))
    : behavioralStories;

  const recentBehavioralStories = filteredBehavioralStories.slice(0, 3);

  const topSkills = [...skills].sort((a, b) => {
    const pA = a.proficiencyLevel === 'Expert' ? 4 : a.proficiencyLevel === 'Advanced' ? 3 : a.proficiencyLevel === 'Intermediate' ? 2 : 1;
    const pB = b.proficiencyLevel === 'Expert' ? 4 : b.proficiencyLevel === 'Advanced' ? 3 : b.proficiencyLevel === 'Intermediate' ? 2 : 1;
    return pB - pA;
  }).slice(0, 6);

  const getStatusColor = (status: string) => {
    if (status === 'Applied') return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
    if (status === 'PhoneScreen' || status === 'Interviewing' || status === 'Tech Interview') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (status === 'Offer') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (status === 'Rejected') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    return 'bg-white/10 text-brand-text-muted border-white/20';
  };

  const getSkillColor = (index: number) => {
    const colors = [
      { text: 'text-teal-400', bg: 'bg-teal-500/5', hover: 'glow-border-teal hover:bg-teal-500/10', border: 'border-teal-500/20', fill: 'bg-teal-400', shadow: 'shadow-[0_0_8px_rgba(45,212,191,0.6)]' },
      { text: 'text-yellow-400', bg: 'bg-yellow-500/5', hover: 'glow-border-yellow hover:bg-yellow-500/10', border: 'border-yellow-500/20', fill: 'bg-yellow-400', shadow: 'shadow-[0_0_8px_rgba(250,204,21,0.6)]' },
      { text: 'text-orange-400', bg: 'bg-orange-500/5', hover: 'glow-border-orange hover:bg-orange-500/10', border: 'border-orange-500/20', fill: 'bg-orange-400', shadow: 'shadow-[0_0_8px_rgba(251,146,60,0.6)]' },
      { text: 'text-cyan-400', bg: 'bg-cyan-500/5', hover: 'glow-border-blue hover:bg-cyan-500/10', border: 'border-cyan-500/20', fill: 'bg-cyan-400', shadow: 'shadow-[0_0_8px_rgba(34,211,238,0.6)]' },
      { text: 'text-blue-400', bg: 'bg-blue-500/5', hover: 'glow-border-blue hover:bg-blue-500/10', border: 'border-blue-500/20', fill: 'bg-blue-400', shadow: 'shadow-[0_0_8px_rgba(96,165,250,0.6)]' },
      { text: 'text-indigo-400', bg: 'bg-indigo-500/5', hover: 'glow-border-purple hover:bg-indigo-500/10', border: 'border-indigo-500/20', fill: 'bg-indigo-400', shadow: 'shadow-[0_0_8px_rgba(129,140,248,0.6)]' },
    ];
    return colors[index % colors.length];
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

  const getCompanyLogo = (name: string) => {
    const { icon, color, isText, initials } = getCompanyIcon(name);
    
    if (isText) {
      return (
        <div 
          className="h-8 w-8 rounded-lg flex items-center justify-center shadow-sm p-1.5 transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: color, color: '#ffffff' }}
        >
          <span className="font-bold text-lg leading-none">{initials}</span>
        </div>
      );
    }

    return (
      <div 
        className="h-8 w-8 rounded-lg flex items-center justify-center shadow-sm p-1.5 transition-transform duration-300 group-hover:scale-110"
        style={{ backgroundColor: `${color}15`, color: color, border: `1px solid ${color}30` }}
      >
        <i className={`${icon} text-lg`}></i>
      </div>
    );
  };

  // Radar chart dynamic calculations (6 axes)
  const categoriesList = ['Frontend', 'Backend', 'DevOps', 'Cloud', 'Tools', 'Languages'];
  const radarPoints = categoriesList.map((cat, idx) => {
    const catSkills = skills.filter(s => s.category?.toLowerCase() === cat.toLowerCase());
    const avgProf = catSkills.length > 0
      ? catSkills.reduce((acc, s) => acc + getProficiencyPercentage(s.proficiencyLevel), 0) / catSkills.length
      : 40; // Default fallback to populate visual grid
    
    // Compute SVG point (center is 100,100, max radius is 80)
    const angle = (idx * 2 * Math.PI) / 6 - Math.PI / 2;
    const r = (avgProf / 100) * 80;
    const x = 100 + r * Math.cos(angle);
    const y = 100 + r * Math.sin(angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-text-secondary font-mono gap-3">
        <div className="w-12 h-12 rounded-full border-4 border-accent-teal/10 border-t-accent-teal animate-spin" />
        <span>Initializing Main Console...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pt-4 md:pt-6 max-w-[1400px] mx-auto space-y-6">
      
      {/* BEGIN: Hero Welcome */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-2 opacity-0 animate-fade-in-up delay-200">
        <div>
          <h1 className="text-2xl md:text-[28px] font-medium text-white flex flex-wrap items-center tracking-tight gap-x-2">
            Welcome, <span className="font-bold hover:text-accent-teal transition-colors duration-300 cursor-default">{user?.firstName || 'Developer'}</span>
            <span className="hidden md:inline-block mx-1 text-text-secondary/30 text-3xl font-light">|</span>
            <span className="text-base md:text-lg text-text-secondary font-normal w-full md:w-auto mt-1 md:mt-0">Developer Dashboard</span>
          </h1>
        </div>
        <button 
          onClick={() => navigate('/applications')}
          className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent-teal text-dashboard-bg shadow-[0_0_15px_rgba(45,212,191,0.2)] animate-pulse-glow-teal hover:scale-105 transition-all duration-300 cursor-pointer"
        >
          <i className="fa-regular fa-envelope mr-2"></i> Applied
        </button>
      </div>

      {/* BEGIN: Active Applications & Stats Section */}
      <section className="glass-panel rounded-2xl overflow-hidden shadow-2xl flex flex-col mb-6 opacity-0 animate-fade-in-up delay-300">
        <div className="p-4 md:p-6 pb-2 md:pb-4 border-b border-panel-border/30 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex flex-col md:flex-row md:items-center">
            <div className="flex flex-col mr-8 mb-4 md:mb-0">
              <h2 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">ACTIVE APPLICATIONS</h2>
              <div className="text-3xl font-bold text-white transition-transform duration-300 hover:scale-105 origin-left">
                {activeAppTab === 'Total' && applications.length}
                {activeAppTab === 'Active' && activeApps.length}
                {activeAppTab === 'Interviews' && (stats?.applicationStats.interviewingCount || 0)}
                {activeAppTab === 'Offers' && (stats?.applicationStats.offersCount || 0)}
              </div>
            </div>
            {/* Tab-like filters */}
            <div className="w-full md:w-auto mt-4 md:mt-0">
              <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium self-end justify-start md:justify-end">
                <div className="flex flex-col items-center group cursor-pointer" onClick={() => setActiveAppTab('Total')}>
                <span className={`pb-2 transition-colors duration-300 ${activeAppTab === 'Total' ? 'text-white' : 'text-text-secondary group-hover:text-white'}`}>Total</span>
                <div className={`h-1 w-full rounded-t-sm transition-all duration-300 ${activeAppTab === 'Total' ? 'bg-accent-teal shadow-[0_0_8px_rgba(45,212,191,0.8)]' : 'bg-transparent group-hover:bg-accent-teal/50'}`}></div>
              </div>
              <div className="flex flex-col items-center group cursor-pointer" onClick={() => setActiveAppTab('Active')}>
                <span className={`pb-2 transition-colors duration-300 ${activeAppTab === 'Active' ? 'text-white' : 'text-text-secondary group-hover:text-white'}`}>Active</span>
                <div className={`h-1 w-full rounded-t-sm transition-all duration-300 ${activeAppTab === 'Active' ? 'bg-accent-blue shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-transparent group-hover:bg-accent-blue/50'}`}></div>
              </div>
              <div className="flex flex-col items-center group cursor-pointer" onClick={() => setActiveAppTab('Interviews')}>
                <span className={`pb-2 transition-colors duration-300 ${activeAppTab === 'Interviews' ? 'text-white' : 'text-text-secondary group-hover:text-white'}`}>Interviews</span>
                <div className={`h-1 w-full rounded-t-sm transition-all duration-300 ${activeAppTab === 'Interviews' ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'bg-transparent group-hover:bg-blue-400/50'}`}></div>
              </div>
              <div className="flex flex-col items-center group cursor-pointer" onClick={() => setActiveAppTab('Offers')}>
                <span className={`pb-2 transition-colors duration-300 ${activeAppTab === 'Offers' ? 'text-white' : 'text-text-secondary group-hover:text-white'}`}>Offers</span>
                <div className={`h-1 w-full rounded-t-sm transition-all duration-300 ${activeAppTab === 'Offers' ? 'bg-accent-purple shadow-[0_0_8px_rgba(139,92,246,0.8)]' : 'bg-transparent group-hover:bg-accent-purple/50'}`}></div>
              </div>
            </nav>
            </div>
          </div>
          <button onClick={() => navigate('/applications', { state: { openNewForm: true } })} className="bg-white/5 hover:bg-white/10 hover:scale-105 hover:shadow-lg text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 border border-white/10 hover:border-white/20 flex items-center justify-center w-full md:w-auto group cursor-pointer mt-4 md:mt-0">
            <i className="fa-solid fa-plus mr-2 text-text-secondary group-hover:text-white transition-colors duration-300 group-hover:rotate-90"></i> New App
          </button>
        </div>
        
        {/* Desktop Applications Table */}
        <div className="hidden md:block flex-1 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-panel-border/30 bg-black/20">
                <th className="px-6 py-4 text-left text-[11px] font-medium text-text-secondary uppercase tracking-wider w-1/4">Company</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-text-secondary uppercase tracking-wider w-1/4">Role</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-text-secondary uppercase tracking-wider w-1/4">Status</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-text-secondary uppercase tracking-wider w-1/6">Date Applied</th>
                <th className="px-6 py-4 text-right text-[11px] font-medium text-text-secondary uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-panel-border/30">
              {recentApps.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-text-secondary text-sm font-mono">
                    No active records in this category. Apply to expand your pipeline.
                  </td>
                </tr>
              )}
              {recentApps.map(app => (
                <tr key={app.id} onClick={() => navigate('/applications')} className="hover:bg-white/10 transition-all duration-300 group hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-lg cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getCompanyLogo(app.companyName)}
                      <div className="text-sm font-medium text-white group-hover:text-accent-teal transition-colors duration-300 ml-4">{app.companyName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-text-primary truncate max-w-[200px]" title={app.roleTitle}>{app.roleTitle}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${app.status === 'Applied' ? 'bg-accent-teal/10 text-accent-teal border-accent-teal/30 animate-pulse-glow-teal' : app.status === 'Offer' ? 'bg-green-500/10 text-green-400 border-green-500/30 animate-pulse-glow-green' : app.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-accent-blue/10 text-accent-blue border-accent-blue/30 animate-pulse-glow-blue'}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                    {app.dateApplied ? new Date(app.dateApplied).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-text-secondary hover:text-white mr-4 transition-all duration-300 hover:scale-110 cursor-pointer"><i className="fa-solid fa-pen text-[13px]"></i></button>
                    <button className="text-text-secondary hover:text-white transition-all duration-300 hover:scale-110 cursor-pointer"><i className="fa-solid fa-ellipsis-vertical text-[13px]"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Applications List */}
        <div className="md:hidden flex-1 overflow-y-auto p-4 space-y-4">
          {recentApps.length === 0 && (
            <div className="py-8 text-center text-text-secondary text-sm font-mono">
              No active records in this category.
            </div>
          )}
          {recentApps.map(app => (
            <div key={app.id} onClick={() => navigate('/applications')} className="glass-panel p-4 rounded-xl flex flex-col gap-3 cursor-pointer">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  {getCompanyLogo(app.companyName)}
                  <div>
                    <div className="text-sm font-medium text-white">{app.companyName}</div>
                    <div className="text-xs text-text-secondary truncate max-w-[200px]">{app.roleTitle}</div>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${app.status === 'Applied' ? 'bg-accent-teal/10 text-accent-teal border-accent-teal/30' : app.status === 'Offer' ? 'bg-green-500/10 text-green-400 border-green-500/30' : app.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-accent-blue/10 text-accent-blue border-accent-blue/30'}`}>
                  {app.status}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-text-secondary mt-1">
                <span><i className="fa-regular fa-calendar mr-1"></i> {app.dateApplied ? new Date(app.dateApplied).toLocaleDateString() : 'N/A'}</span>
                <i className="fa-solid fa-chevron-right text-[10px]"></i>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats Footer */}
        <div className="p-4 md:p-6 border-t border-panel-border/30 grid grid-cols-2 md:grid-cols-4 gap-4 items-end bg-black/10">
          <div className="transition-transform duration-300 hover:-translate-y-1">
            <div className="text-xs text-text-secondary mb-1 font-medium">Total</div>
            <div className="text-[22px] font-bold text-white">{applications.length}</div>
          </div>
          <div className="transition-transform duration-300 hover:-translate-y-1">
            <div className="text-xs text-text-secondary mb-1 font-medium">Active</div>
            <div className="text-[22px] font-bold text-white flex items-center">{activeApps.length} <span className="w-1.5 h-1.5 rounded-full bg-accent-teal ml-2 shadow-[0_0_8px_rgba(45,212,191,0.8)] animate-pulse"></span></div>
          </div>
          <div className="transition-transform duration-300 hover:-translate-y-1">
            <div className="text-xs text-text-secondary mb-1 font-medium">Interviews</div>
            <div className="text-[22px] font-bold text-white">{stats?.applicationStats.interviewingCount || 0}</div>
          </div>
          <div className="transition-transform duration-300 hover:-translate-y-1">
            <div className="text-xs text-text-secondary mb-1 font-medium">Offers</div>
            <div className="text-[22px] font-bold text-white flex items-center">{stats?.applicationStats.offersCount || 0} <span className="w-1.5 h-1.5 rounded-full bg-accent-purple ml-2 shadow-[0_0_8px_rgba(139,92,246,0.8)]"></span></div>
          </div>

        </div>
      </section>

      {/* BEGIN: Lower Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BEGIN: STAR Story Bank */}
        <section className="lg:col-span-2 glass-panel rounded-2xl p-6 flex flex-col h-[600px] opacity-0 animate-fade-in-up delay-400">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">STAR STORY BANK</h2>
              <div className="text-3xl font-bold text-white transition-transform duration-300 hover:translate-x-1">{behavioralStories.length} Stories</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => navigate('/story-bank')} className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 border border-white/10 hover:border-white/20 cursor-pointer flex items-center group">
                <i className="fa-solid fa-book-open mr-2 text-text-secondary group-hover:text-white transition-colors"></i>
                Story Bank
              </button>
              <button onClick={() => navigate('/story-bank', { state: { openNewForm: true } })} className="bg-accent-teal hover:bg-accent-teal/90 text-dashboard-bg px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(45,212,191,0.4)] shadow-[0_0_15px_rgba(45,212,191,0.2)] cursor-pointer flex items-center">
                <i className="fa-solid fa-plus mr-2"></i>
                New Story
              </button>
            </div>
          </div>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-3 mb-8">
            <span 
              onClick={() => setActiveStoryTag(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all duration-300 hover:-translate-y-0.5 ${!activeStoryTag ? 'bg-accent-teal/10 text-accent-teal border border-accent-teal/30 hover:bg-accent-teal/20' : 'bg-white/5 text-text-primary border border-white/10 hover:border-text-secondary hover:bg-white/10'}`}
            >
              All Stories
            </span>
            {storyTags.length === 0 && ['Problem Solving', 'Leadership', 'System Design'].map(tag => (
              <span 
                key={tag}
                onClick={() => setActiveStoryTag(tag)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all duration-300 hover:-translate-y-0.5 ${activeStoryTag === tag ? 'bg-accent-teal/10 text-accent-teal border border-accent-teal/30 hover:bg-accent-teal/20' : 'bg-white/5 text-text-primary border border-white/10 hover:border-text-secondary hover:bg-white/10'}`}
              >
                {tag}
              </span>
            ))}
            {storyTags.map(tag => (
              <span 
                key={tag}
                onClick={() => setActiveStoryTag(tag)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all duration-300 hover:-translate-y-0.5 ${activeStoryTag === tag ? 'bg-accent-teal/10 text-accent-teal border border-accent-teal/30 hover:bg-accent-teal/20' : 'bg-white/5 text-text-primary border border-white/10 hover:border-text-secondary hover:bg-white/10'}`}
              >
                {tag}
              </span>
            ))}
          </div>
          
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Left Nav Menu */}
            <nav className="w-full md:w-32 md:mr-8 flex md:block flex-row space-x-2 md:space-x-0 md:space-y-2 mb-4 md:mb-0 overflow-x-auto pb-2 md:pb-0 custom-scrollbar shrink-0">
              {(['situation', 'task', 'action', 'result'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveStarTab(tab)}
                  className={`block whitespace-nowrap md:w-full text-center md:text-left px-4 py-2.5 min-h-[44px] md:min-h-0 rounded-xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 md:hover:translate-x-1 md:hover:translate-y-0 cursor-pointer capitalize ${
                    activeStarTab === tab 
                      ? 'bg-white/10 text-white border border-white/5' 
                      : 'text-text-secondary hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
            
            {/* Story Cards List */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {recentBehavioralStories.length === 0 && (
                <div className="text-center text-text-secondary text-sm italic pt-10">
                  No stories found. Create a STAR narrative to populate!
                </div>
              )}
              {recentBehavioralStories.map(story => {
                const previewText = 
                  activeStarTab === 'situation' ? story.situation :
                  activeStarTab === 'task' ? story.task :
                  activeStarTab === 'action' ? story.action :
                  story.result;

                return (
                  <div key={story.id} onClick={() => navigate('/story-bank')} className="bg-black/20 border border-panel-border/50 rounded-2xl p-5 hover:border-white/30 hover:bg-black/40 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group cursor-pointer">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-[11px] text-text-secondary mb-1">Title</div>
                        <h3 className="text-lg font-semibold text-white group-hover:text-accent-teal transition-colors duration-300">{story.title}</h3>
                      </div>
                      <div className="flex space-x-3 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button className="hover:text-white hover:scale-110 transition-all duration-300"><i className="fa-solid fa-pen text-sm"></i></button>
                        <button className="hover:text-white hover:scale-110 transition-all duration-300"><i className="fa-solid fa-share-nodes text-sm"></i></button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {story.tags ? story.tags.split(',').map((t, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-white/5 border border-white/5 text-text-primary transition-colors duration-300 group-hover:bg-white/10">
                          {t.trim()}
                        </span>
                      )) : (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-white/5 border border-white/5 text-text-primary transition-colors duration-300 group-hover:bg-white/10">Behavioral</span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors duration-300 line-clamp-2">
                      <strong className="text-white uppercase text-[10px] mr-1">{activeStarTab}:</strong>
                      {previewText || "No context recorded."}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* BEGIN: Skills & Matrix Side */}
        <div className="flex flex-col space-y-6 h-[600px] opacity-0 animate-fade-in-up delay-500">
          
          {/* Skills Matrix Radar Chart Container */}
          <section className="glass-panel rounded-2xl p-6 flex-1 flex flex-col relative overflow-hidden group">
            <h2 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-4 transition-colors duration-300 group-hover:text-white">SKILLS MATRIX</h2>
            <div className="flex-1 flex items-center justify-center relative w-full h-full min-h-[200px] mt-2 animate-radar-pulse">
              <svg className="w-full max-w-[220px] max-h-[220px] overflow-visible transition-transform duration-500 group-hover:scale-105" viewBox="0 0 200 200">
                {/* Background Grid */}
                <polygon fill="none" points="100,20 180,75 150,165 50,165 20,75" stroke="#2d3748" strokeWidth="1"></polygon>
                <polygon fill="none" points="100,40 160,85 135,150 65,150 40,85" stroke="#2d3748" strokeWidth="1"></polygon>
                <polygon fill="none" points="100,60 140,95 120,135 80,135 60,95" stroke="#2d3748" strokeWidth="1"></polygon>
                <polygon fill="none" points="100,80 120,105 105,120 95,120 80,105" stroke="#2d3748" strokeWidth="1"></polygon>
                {/* Axes */}
                <line x1="100" y1="100" x2="100" y2="20" stroke="#2d3748" strokeWidth="1"></line>
                <line x1="100" y1="100" x2="180" y2="75" stroke="#2d3748" strokeWidth="1"></line>
                <line x1="100" y1="100" x2="150" y2="165" stroke="#2d3748" strokeWidth="1"></line>
                <line x1="100" y1="100" x2="50" y2="165" stroke="#2d3748" strokeWidth="1"></line>
                <line x1="100" y1="100" x2="20" y2="75" stroke="#2d3748" strokeWidth="1"></line>
                {/* Gradient Def */}
                <defs>
                  <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)"></stop>
                    <stop offset="100%" stopColor="rgba(45, 212, 191, 0.1)"></stop>
                  </radialGradient>
                </defs>
                {/* Data Polygon */}
                <polygon fill="url(#radarGlow)" points={radarPoints} stroke="#2dd4bf" strokeWidth="2"></polygon>
                {/* Data Points */}
                {radarPoints.split(' ').map((point, i) => {
                  if (!point) return null;
                  const [px, py] = point.split(',');
                  return <circle key={i} cx={px} cy={py} r="3" fill="#2dd4bf" className="transition-all duration-300 hover:r-5 cursor-pointer"></circle>;
                })}
              </svg>
              {/* Labels positioned absolutely around svg */}
              <span className="absolute top-0 text-[11px] text-text-primary left-1/2 -translate-x-1/2 mt-1 transition-transform duration-300 group-hover:-translate-y-1">Frontend</span>
              <span className="absolute top-1/2 right-0 text-[11px] text-text-primary -translate-y-1/2 transition-transform duration-300 group-hover:translate-x-1">Backend</span>
              <span className="absolute bottom-0 right-10 text-[11px] text-text-primary mb-4 transition-transform duration-300 group-hover:translate-y-1">Tools</span>
              <span className="absolute bottom-0 left-8 text-[11px] text-text-primary mb-4 transition-transform duration-300 group-hover:translate-y-1">Languages</span>
              <span className="absolute top-1/2 left-0 text-[11px] text-text-primary -translate-y-1/2 transition-transform duration-300 group-hover:-translate-x-1">DevOps</span>
            </div>
          </section>

          {/* Skills Grid */}
          <section className="glass-panel rounded-2xl p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {topSkills.length === 0 && (
                <div className="col-span-3 text-center text-text-secondary text-sm italic py-4">No skills documented.</div>
              )}
              {topSkills.map((skill, idx) => {
                const details = getSkillIcon(skill.name);
                const percentage = getProficiencyPercentage(skill.proficiencyLevel);
                // Cycle heights for a dynamic look
                const hClass = idx % 3 === 0 ? "h-[104px]" : "h-[84px]";
                
                return (
                  <div 
                    key={skill.id} 
                    className={`bg-black/20 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between ${hClass} hover:bg-black/40 hover:-translate-y-1 transition-all duration-300 shadow-sm relative overflow-hidden group cursor-pointer`}
                    style={{ borderLeftColor: `${details.color}50`, borderLeftWidth: '2px' }}
                  >
                    <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-50" style={{ backgroundColor: `${details.color}15` }}></div>
                    <div className="relative z-10 flex items-center space-x-2 mb-1">
                      <i className={`${details.icon} transition-transform duration-300 group-hover:scale-110`} style={{ color: details.color }}></i>
                      <span className="text-[13px] font-semibold text-white truncate max-w-[60px]" title={skill.name}>{skill.name}</span>
                    </div>
                    <div className="relative z-10 mt-auto pt-2">
                      <div className="flex justify-between text-[10px] text-text-secondary mb-1">
                        <span>Level</span>
                        <span className="text-white font-medium">{percentage}%</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                        <div className="h-1 rounded-full transition-all duration-1000 ease-out" style={{ width: `${percentage}%`, backgroundColor: details.color }}></div>
                      </div>
                      {hClass === "h-[104px]" && (
                        <div className="text-[10px] text-text-secondary mt-1 group-hover:text-text-primary transition-colors duration-300">Experience</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* BEGIN: Analytics & Insights */}
      <section className="mt-6 mb-12 glass-panel rounded-2xl p-6 opacity-0 animate-fade-in-up delay-500">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center">
          <i className="fa-solid fa-chart-pie mr-2 text-accent-purple"></i>
          Analytics & Insights
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Pipeline Conversion (Funnel metrics) */}
          <div className="lg:col-span-2 bg-black/20 rounded-xl p-5 border border-white/5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-1">Application Pipeline</h3>
              <div className="text-2xl font-bold text-white mb-6">
                {stats?.applicationStats.totalApplications || 0} Total
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary">Response Rate (Interviews / Total)</span>
                  <span className="text-white font-medium">
                    {stats?.applicationStats.responseRate ? stats.applicationStats.responseRate.toFixed(1) : 0}%
                  </span>
                </div>
                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent-blue rounded-full transition-all duration-1000"
                    style={{ width: `${stats?.applicationStats.responseRate || 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary">Conversion Rate (Offers / Interviews)</span>
                  <span className="text-white font-medium">
                    {stats?.applicationStats.interviewingCount 
                      ? ((stats.applicationStats.offersCount / stats.applicationStats.interviewingCount) * 100).toFixed(1) 
                      : 0}%
                  </span>
                </div>
                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent-teal rounded-full transition-all duration-1000"
                    style={{ width: `${stats?.applicationStats.interviewingCount ? (stats.applicationStats.offersCount / stats.applicationStats.interviewingCount) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary">Rejection Rate</span>
                  <span className="text-white font-medium">
                    {stats?.applicationStats.rejectionRate ? stats.applicationStats.rejectionRate.toFixed(1) : 0}%
                  </span>
                </div>
                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full transition-all duration-1000"
                    style={{ width: `${stats?.applicationStats.rejectionRate || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Average Match Score Gauge */}
          <div className="bg-black/20 rounded-xl p-5 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-linear-to-br from-accent-purple/5 to-accent-teal/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <h3 className="text-sm font-medium text-text-secondary mb-4 z-10 w-full text-center">Avg. JD Match Score</h3>
            
            <div className="relative w-32 h-32 flex items-center justify-center z-10">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-black/40" />
                <circle 
                  cx="64" 
                  cy="64" 
                  r="56" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  fill="transparent"
                  strokeDasharray={351.86} 
                  strokeDashoffset={351.86 - (351.86 * (stats?.jobDescriptionStats.averageMatchScore || 0)) / 100}
                  strokeLinecap="round"
                  className="text-accent-teal transition-all duration-1500 ease-out drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {stats?.jobDescriptionStats.averageMatchScore ? stats.jobDescriptionStats.averageMatchScore.toFixed(0) : 0}
                </span>
                <span className="text-[10px] text-text-secondary font-medium">%</span>
              </div>
            </div>
          </div>

          {/* Story Confidence Breakdown */}
          <div className="bg-black/20 rounded-xl p-5 border border-white/5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-1">Story Readiness</h3>
              <div className="text-xs text-text-secondary mb-4">
                <span className="text-white font-medium">{stats?.storyStats.totalReviewed || 0}</span> reviewed out of {stats?.storyStats.totalStories || 0}
              </div>
            </div>

            <div className="h-40 w-full">
              {stats?.storyStats.confidenceBreakdown && Object.keys(stats.storyStats.confidenceBreakdown).length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Object.entries(stats.storyStats.confidenceBreakdown).map(([key, value]) => ({ name: key, count: value }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                      {Object.entries(stats.storyStats.confidenceBreakdown).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry[0].toLowerCase() === 'high' ? '#2dd4bf' : entry[0].toLowerCase() === 'medium' ? '#f59e0b' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-text-secondary italic">
                  No confidence data yet
                </div>
              )}
            </div>
          </div>
          
        </div>
      </section>
      {/* END: Analytics & Insights */}

    </div>
  );
}
