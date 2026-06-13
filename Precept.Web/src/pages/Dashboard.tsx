import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Application } from '../types';

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [followUps, setFollowUps] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      const statsData = await api.get<DashboardStats>('/api/dashboard');
      setStats(statsData);

      const apps = await api.get<Application[]>('/api/application');
      
      const todayStr = new Date().toISOString().split('T')[0];
      const items = apps.filter(app => {
        if (app.status !== 'Applied' && app.status !== 'PhoneScreen' && app.status !== 'Interviewing') {
          return false;
        }
        const fuDate = app.followUpDate.split('T')[0];
        return fuDate <= todayStr;
      });

      setFollowUps(items);
    } catch (err) {
      console.error('Failed to load dashboard parameters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleMarkFollowedUp = async (app: Application) => {
    setProcessingId(app.id);
    try {
      const today = new Date().toISOString();
      const updated = {
        ...app,
        dateLastContact: today,
      };
      await api.put(`/api/application/${app.id}`, updated);
      
      setFollowUps(prev => prev.filter(item => item.id !== app.id));
      
      const statsData = await api.get<DashboardStats>('/api/dashboard');
      setStats(statsData);
    } catch (err) {
      console.error('Failed to mark followed up:', err);
      alert('Failed to update follow up status.');
    } finally {
      setProcessingId(null);
    }
  };

  const getStoriesMastered = () => {
    if (!stats) return 0;
    const bd = stats.storyStats.confidenceBreakdown;
    return (bd['Solid'] || 0) + (bd['CanTeach'] || 0);
  };

  const getStoriesNeedWork = () => {
    if (!stats) return 0;
    const bd = stats.storyStats.confidenceBreakdown;
    return (bd['Panic'] || 0) + (bd['Shaky'] || 0);
  };

  const getDaysSinceContact = (dateStr?: string) => {
    if (!dateStr) return '0 Days';
    const contactDate = new Date(dateStr.split('T')[0]);
    const today = new Date(new Date().toISOString().split('T')[0]);
    const diffTime = Math.abs(today.getTime() - contactDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} Day${diffDays !== 1 ? 's' : ''}`;
  };

  const getDaysStyle = (dateStr?: string) => {
    if (!dateStr) return 'text-on-surface-variant';
    const contactDate = new Date(dateStr.split('T')[0]);
    const today = new Date(new Date().toISOString().split('T')[0]);
    const diffTime = Math.abs(today.getTime() - contactDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 5) return 'text-error';
    if (diffDays >= 2) return 'text-primary';
    return 'text-on-surface-variant';
  };

  const formatNumber = (num: number): string => {
    return String(num).padStart(2, '0');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-on-surface-variant font-code gap-3">
        <div className="w-12 h-12 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
        <span>Initializing Main Console...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-xl fade-in">
      {/* Quick Actions Bento Header */}
      <section className="grid grid-cols-12 gap-gutter">
        <div className="col-span-12 md:col-span-8 flex flex-col justify-end pb-sm">
          <h2 className="font-h2 text-h2 text-on-surface mb-2">Overview</h2>
          <p className="font-code text-code text-on-surface-variant">
            System status: Normal. {followUps.length} pending task{followUps.length !== 1 ? 's require' : ' requires'} attention.
          </p>
        </div>
        <div className="col-span-12 md:col-span-4 flex flex-col gap-sm justify-end">
          <button 
            onClick={() => navigate('/story-bank/quiz')}
            className="w-full bg-surface-container border border-outline-variant text-on-surface font-code text-code py-sm px-md rounded hover:bg-surface-bright hover:border-primary transition-all flex items-center justify-between group cursor-pointer"
          >
            <span>Quiz Me</span>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary transition-colors">school</span>
          </button>
          <button 
            onClick={() => navigate('/jd-matcher')}
            className="w-full bg-surface-container border border-outline-variant text-on-surface font-code text-code py-sm px-md rounded hover:bg-surface-bright hover:border-primary transition-all flex items-center justify-between group cursor-pointer"
          >
            <span>Paste Job Description</span>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary transition-colors">content_paste</span>
          </button>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {/* Applications Sent */}
        <div className="bg-surface-container border border-outline-variant rounded p-md flex flex-col gap-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full group-hover:bg-primary/10 transition-colors"></div>
          <span className="font-label-caps text-label-caps text-on-surface-variant">Applications Sent</span>
          <div className="flex items-end justify-between">
            <span className="font-h1 text-[48px] leading-none text-on-surface">
              {formatNumber(stats?.applicationStats.totalApplications || 0)}
            </span>
            <span className="material-symbols-outlined text-primary text-[24px]">send</span>
          </div>
        </div>

        {/* Active Interviews */}
        <div className="bg-surface-container border border-outline-variant rounded p-md flex flex-col gap-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full group-hover:bg-primary/10 transition-colors"></div>
          <span className="font-label-caps text-label-caps text-on-surface-variant">Active Interviews</span>
          <div className="flex items-end justify-between">
            <span className="font-h1 text-[48px] leading-none text-on-surface">
              {formatNumber(stats?.applicationStats.interviewingCount || 0)}
            </span>
            <span className="material-symbols-outlined text-primary text-[24px]">forum</span>
          </div>
        </div>

        {/* Stories Mastered */}
        <div className="bg-surface-container border border-outline-variant rounded p-md flex flex-col gap-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full group-hover:bg-primary/10 transition-colors"></div>
          <span className="font-label-caps text-label-caps text-on-surface-variant">Stories Mastered</span>
          <div className="flex items-end justify-between">
            <span className="font-h1 text-[48px] leading-none text-on-surface">
              {formatNumber(getStoriesMastered())}
            </span>
            <span className="material-symbols-outlined text-primary text-[24px]">task_alt</span>
          </div>
        </div>

        {/* Stories Need Work */}
        <div className="bg-surface-container border border-outline-variant rounded p-md flex flex-col gap-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-error-container/10 rounded-bl-full group-hover:bg-error-container/20 transition-colors"></div>
          <span className="font-label-caps text-label-caps text-on-surface-variant">Stories Need Work</span>
          <div className="flex items-end justify-between">
            <span className="font-h1 text-[48px] leading-none text-error">
              {formatNumber(getStoriesNeedWork())}
            </span>
            <span className="material-symbols-outlined text-error text-[24px]">build</span>
          </div>
        </div>
      </section>

      {/* Upcoming Follow-ups Table */}
      <section className="flex flex-col gap-md">
        <div className="flex items-center justify-between border-b border-outline-variant pb-sm">
          <h3 className="font-h3 text-h3 text-on-surface">Upcoming Follow-ups</h3>
          <button 
            onClick={() => navigate('/applications')}
            className="font-code text-code text-primary hover:underline bg-transparent border-none cursor-pointer"
          >
            View All Pipeline
          </button>
        </div>
        <div className="bg-surface-container border border-outline-variant rounded overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-bright/50">
                <th className="py-sm px-md font-label-caps text-label-caps text-on-surface-variant font-medium">Company</th>
                <th className="py-sm px-md font-label-caps text-label-caps text-on-surface-variant font-medium">Role</th>
                <th className="py-sm px-md font-label-caps text-label-caps text-on-surface-variant font-medium">Days Since Contact</th>
                <th className="py-sm px-md font-label-caps text-label-caps text-on-surface-variant font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-body-md text-on-surface">
              {followUps.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 px-md font-code text-center text-on-surface-variant italic">
                    Zero pending follow-up directives. All connections synchronized.
                  </td>
                </tr>
              ) : (
                followUps.map((item) => (
                  <tr key={item.id} className="border-b border-outline-variant/50 hover:bg-surface-bright/30 transition-colors">
                    <td className="py-md px-md font-medium">{item.companyName}</td>
                    <td className="py-md px-md text-on-surface-variant">{item.roleTitle}</td>
                    <td className={`py-md px-md font-code ${getDaysStyle(item.dateLastContact || item.dateApplied)}`}>
                      {getDaysSinceContact(item.dateLastContact || item.dateApplied)}
                    </td>
                    <td className="py-md px-md text-right">
                      <button 
                        onClick={() => handleMarkFollowedUp(item)}
                        disabled={processingId === item.id}
                        className="font-code text-code px-sm py-1 border border-outline-variant rounded text-on-surface hover:border-primary hover:text-primary transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {processingId === item.id ? 'Processing...' : (
                          item.status === 'Applied' ? 'Draft Email' : 
                          item.status === 'PhoneScreen' ? 'Review Notes' : 'Prepare Demo'
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
