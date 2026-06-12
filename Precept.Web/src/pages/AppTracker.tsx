import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, Plus, MoreHorizontal, Calendar, X, Trash2, Edit, Loader2, Radar, FileText, User, Code, Trophy } from 'lucide-react';
import { Application, ApplicationStatus } from '../types';
import { api } from '../api';
import RadialOrbitalTimeline, { TimelineItem } from '../components/ui/radial-orbital-timeline';

const COLUMNS: ApplicationStatus[] = ['Applied', 'PhoneScreen', 'Interviewing', 'Offer', 'Rejected', 'Ghosted'];

const DISPLAY_STATUS: Record<ApplicationStatus, string> = {
  Applied: 'Applied',
  PhoneScreen: 'Phone Screen',
  Interviewing: 'Interviewing',
  Offer: 'Offer',
  Rejected: 'Rejected',
  Ghosted: 'Ghosted'
};

const getStatusColor = (status: ApplicationStatus) => {
  switch(status) {
    case 'Offer': return 'bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/30';
    case 'Rejected': 
    case 'Ghosted': return 'bg-brand-surface-high text-brand-text-muted border-brand-border';
    case 'Interviewing': return 'bg-brand-primary/10 text-brand-primary border-brand-primary/30';
    default: return 'bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/30';
  }
};

const generateTrajectory = (app: Application): TimelineItem[] => {
  const isRejected = app.status === 'Rejected' || app.status === 'Ghosted';
  
  return [
    {
      id: 1,
      title: "Application Submitted",
      date: app.dateApplied ? new Date(app.dateApplied).toLocaleDateString() : 'N/A',
      content: `Submitted application for ${app.roleTitle} at ${app.companyName}.`,
      category: "Screening",
      icon: FileText,
      relatedIds: [2],
      status: "completed",
      energy: 100,
    },
    {
      id: 2,
      title: "Recruiter Screen",
      date: "Pending",
      content: "Initial cultural fit and background check.",
      category: "Screening",
      icon: User,
      relatedIds: [1, 3],
      status: app.status === 'Applied' ? (isRejected ? 'pending' : 'pending') : "completed",
      energy: app.status === 'Applied' ? 20 : 80,
    },
    {
      id: 3,
      title: "Technical Assessment",
      date: "Pending",
      content: "Core engineering competencies and algorithms.",
      category: "Technical",
      icon: Code,
      relatedIds: [2, 4],
      status: (app.status === 'Interviewing' || app.status === 'Offer') ? "completed" : (app.status === 'PhoneScreen' && !isRejected ? 'in-progress' : 'pending'),
      energy: (app.status === 'Interviewing' || app.status === 'Offer') ? 90 : (app.status === 'PhoneScreen' ? 50 : 10),
    },
    {
      id: 4,
      title: "Behavioral Onsite",
      date: "Pending",
      content: "Leadership principles and system design.",
      category: "Technical",
      icon: Calendar,
      relatedIds: [3, 5],
      status: app.status === 'Offer' ? 'completed' : (app.status === 'Interviewing' && !isRejected ? 'in-progress' : 'pending'),
      energy: app.status === 'Offer' ? 95 : (app.status === 'Interviewing' ? 60 : 5),
    },
    {
      id: 5,
      title: "Final Offer",
      date: "Pending",
      content: "Compensation negotiation and signing.",
      category: "Offer",
      icon: Trophy,
      relatedIds: [4],
      status: app.status === 'Offer' ? 'completed' : 'pending',
      energy: app.status === 'Offer' ? 100 : 0,
    }
  ];
};

export default function AppTracker() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [apps, setApps] = useState<Application[]>([]);
  const [jds, setJds] = useState<{ id: string; companyName: string; roleTitle: string }[]>([]);
  const [view, setView] = useState<'board' | 'table'>('board');
  const [isLoading, setIsLoading] = useState(true);
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [scannerApp, setScannerApp] = useState<Application | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [location, setLocation] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('Applied');
  const [dateApplied, setDateApplied] = useState('');
  const [dateLastContact, setDateLastContact] = useState('');
  const [resumeVersion, setResumeVersion] = useState('');
  const [source, setSource] = useState('LinkedIn');
  const [isRemote, setIsRemote] = useState(true);
  const [notes, setNotes] = useState('');
  const [jobDescriptionId, setJobDescriptionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadApplications = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Application[]>('/api/application');
      setApps(data);
      
      // Load JDs for the link dropdown
      const jdData = await api.get<{ id: string; companyName: string; roleTitle: string }[]>('/api/jobdescription');
      setJds(jdData);
    } catch (err) {
      console.error('Failed to load application pipeline:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedAppId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: ApplicationStatus) => {
    e.preventDefault();
    if (!draggedAppId) return;

    const targetApp = apps.find(a => a.id === draggedAppId);
    if (targetApp && targetApp.status !== newStatus) {
      // Optimistic UI update
      setApps(prev => prev.map(a => a.id === draggedAppId ? { ...a, status: newStatus } : a));

      try {
        await api.patch(`/api/application/${draggedAppId}/status`, { status: newStatus });
      } catch (err) {
        console.error('Failed to sync status drop to server:', err);
        // Rollback on error
        setApps(prev => prev.map(a => a.id === draggedAppId ? { ...a, status: targetApp.status } : a));
        alert('Failed to update pipeline status.');
      }
    }
    setDraggedAppId(null);
  };

  const handleOpenCreateModal = () => {
    setSelectedApp(null);
    setCompanyName('');
    setRoleTitle('');
    setLocation('Remote');
    setSalaryRange('');
    setStatus('Applied');
    const today = new Date().toISOString().split('T')[0];
    setDateApplied(today);
    setDateLastContact(today);
    setResumeVersion('v1');
    setSource('LinkedIn');
    setIsRemote(true);
    setNotes('');
    setJobDescriptionId('');
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      handleOpenCreateModal();
      setSearchParams({});
    }
  }, [searchParams]);

  const handleOpenEditModal = (app: Application) => {
    setSelectedApp(app);
    setCompanyName(app.companyName);
    setRoleTitle(app.roleTitle);
    setLocation(app.location);
    setSalaryRange(app.salaryRange || '');
    setStatus(app.status);
    setDateApplied(app.dateApplied ? app.dateApplied.split('T')[0] : '');
    setDateLastContact(app.dateLastContact ? app.dateLastContact.split('T')[0] : '');
    setResumeVersion(app.resumeVersion);
    setSource(app.source);
    setIsRemote(app.isRemote);
    setNotes(app.notes);
    setJobDescriptionId(app.jobDescriptionId || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !roleTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        companyName: companyName.trim(),
        roleTitle: roleTitle.trim(),
        location: location.trim(),
        salaryRange: salaryRange.trim() || null,
        status,
        dateApplied: dateApplied ? new Date(dateApplied).toISOString() : null,
        dateLastContact: dateLastContact ? new Date(dateLastContact).toISOString() : null,
        resumeVersion: resumeVersion.trim(),
        notes: notes.trim(),
        isRemote,
        source: source.trim(),
        jobDescriptionId: jobDescriptionId || null
      };

      if (selectedApp) {
        const updated = await api.put<Application>(`/api/application/${selectedApp.id}`, {
          ...payload,
          id: selectedApp.id
        });
        setApps(prev => prev.map(a => a.id === updated.id ? updated : a));
      } else {
        const created = await api.post<Application>('/api/application', payload);
        setApps(prev => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save pipeline record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('DANGER: Are you sure you want to permanently delete this application pipeline?')) {
      return;
    }

    try {
      await api.delete(`/api/application/${id}`);
      setApps(prev => prev.filter(a => a.id !== id));
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to delete application.');
    }
  };

  return (
    <div className="space-y-6 fade-in h-full flex flex-col">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-brand-text tracking-tight">Active Pipelines</h1>
          <p className="text-brand-text-muted font-mono text-sm mt-1">Status tracking for outbound connections.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex p-1 bg-brand-surface-high/50 rounded-lg border border-brand-border">
            <button 
              onClick={() => setView('board')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${view === 'board' ? 'bg-brand-surface text-brand-primary shadow-sm' : 'text-brand-text-muted hover:text-brand-text'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => setView('table')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${view === 'table' ? 'bg-brand-surface text-brand-primary shadow-sm' : 'text-brand-text-muted hover:text-brand-text'}`}
            >
              <List size={16} />
            </button>
          </div>
          
          <button onClick={handleOpenCreateModal} className="btn-primary flex items-center gap-2 text-sm cursor-pointer">
            <Plus size={16} /> Init Pipeline
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-brand-text-muted font-mono gap-3">
          <Loader2 className="animate-spin text-brand-primary" size={40} />
          <span>Ingesting Connection Data...</span>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {view === 'board' ? (
            <div className="flex gap-6 h-full min-w-max pb-4">
              {COLUMNS.map(col => (
                <div 
                  key={col} 
                  className="w-[300px] flex flex-col pt-2"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col)}
                >
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="font-mono text-sm uppercase text-brand-text-muted">{DISPLAY_STATUS[col]}</h3>
                    <span className="text-xs font-mono bg-brand-surface-high px-2 py-0.5 rounded-full text-brand-text-muted">
                      {apps.filter(a => a.status === col).length}
                    </span>
                  </div>
                  
                  <div className="flex-1 space-y-3 bg-brand-surface/30 rounded-lg p-2 border border-brand-border border-dashed overflow-y-auto min-h-[300px]">
                    {apps.filter(a => a.status === col).map(app => (
                      <div 
                        key={app.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, app.id)}
                        onClick={() => handleOpenEditModal(app)}
                        className={`card-container p-4 hover:border-brand-primary/45 bg-brand-surface transition-colors cursor-move group relative ${draggedAppId === app.id ? 'opacity-50 border-brand-primary' : ''}`}
                      >
                         <button className="absolute top-3 right-3 text-brand-text-muted opacity-0 group-hover:opacity-100 transition-opacity hover:text-brand-primary">
                           <MoreHorizontal size={16} />
                         </button>
                         <h4 className="font-heading font-semibold text-brand-text text-lg mb-1">{app.companyName}</h4>
                         <p className="text-sm font-sans text-brand-text-muted mb-3">{app.roleTitle}</p>
                         <div className="flex items-center text-xs font-mono text-brand-text-muted gap-1.5">
                           <Calendar size={12} /> {app.dateApplied ? new Date(app.dateApplied).toLocaleDateString() : 'No date'}
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-container overflow-hidden bg-brand-surface">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-surface-high border-b border-brand-border text-xs font-mono text-brand-text-muted uppercase tracking-wider">
                    <th className="px-6 py-4 font-medium">Target Entity (Company)</th>
                    <th className="px-6 py-4 font-medium">Protocol (Role)</th>
                    <th className="px-6 py-4 font-medium">Pipeline Status</th>
                    <th className="px-6 py-4 font-medium">Init Date</th>
                    <th className="px-6 py-4 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {apps.map((app) => (
                    <tr 
                      key={app.id} 
                      onClick={() => handleOpenEditModal(app)}
                      className="hover:bg-brand-surface-high/30 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-heading font-semibold text-brand-text">{app.companyName}</td>
                      <td className="px-6 py-4 text-brand-text-muted text-sm">{app.roleTitle}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-mono font-medium border ${getStatusColor(app.status)}`}>
                          {DISPLAY_STATUS[app.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-brand-text-muted">
                        {app.dateApplied ? new Date(app.dateApplied).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleOpenEditModal(app)} className="text-brand-text-muted hover:text-brand-primary transition-colors cursor-pointer">
                           <MoreHorizontal size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {apps.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-brand-text-muted font-mono text-sm italic">
                        No pipelines tracked yet. Initialise outbound connections above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-secondary/80 backdrop-blur-sm">
          <div className="card-container w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 bg-brand-surface">
            <div className="flex items-center justify-between p-4 border-b border-brand-border bg-brand-surface-high/30">
              <h2 className="text-lg font-heading font-bold">{selectedApp ? 'Update Outbound Connection' : 'Initialize Outbound Connection'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-brand-text-muted hover:text-brand-text p-1 rounded hover:bg-brand-surface-high transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-brand-text-muted uppercase">Company Name</label>
                    <input 
                      type="text" 
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="input-base w-full text-sm font-sans" 
                      placeholder="e.g. Stripe, Discord"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-brand-text-muted uppercase">Role Title</label>
                    <input 
                      type="text" 
                      value={roleTitle}
                      onChange={(e) => setRoleTitle(e.target.value)}
                      className="input-base w-full text-sm font-sans" 
                      placeholder="e.g. Senior Backend Engineer" 
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-brand-text-muted uppercase">Status</label>
                    <select 
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                      className="input-base w-full text-sm"
                    >
                      {COLUMNS.map(col => <option key={col} value={col}>{DISPLAY_STATUS[col]}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-brand-text-muted uppercase">Salary Range (Optional)</label>
                    <input 
                      type="text" 
                      value={salaryRange}
                      onChange={(e) => setSalaryRange(e.target.value)}
                      className="input-base w-full text-sm" 
                      placeholder="e.g. $120,000 - $140,000" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-brand-text-muted uppercase">Location</label>
                    <input 
                      type="text" 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="input-base w-full text-sm" 
                      placeholder="e.g. Remote, Boston MA" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-brand-text-muted uppercase">Source</label>
                    <input 
                      type="text" 
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="input-base w-full text-sm font-mono" 
                      placeholder="LinkedIn, Referral" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-brand-text-muted uppercase">Resume Version</label>
                    <input 
                      type="text" 
                      value={resumeVersion}
                      onChange={(e) => setResumeVersion(e.target.value)}
                      className="input-base w-full text-sm font-mono" 
                      placeholder="v2-backend" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-brand-text-muted uppercase">Date Applied</label>
                    <input 
                      type="date" 
                      value={dateApplied}
                      onChange={(e) => setDateApplied(e.target.value)}
                      className="input-base w-full text-sm font-mono" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-brand-text-muted uppercase">Date Last Contact</label>
                    <input 
                      type="date" 
                      value={dateLastContact}
                      onChange={(e) => setDateLastContact(e.target.value)}
                      className="input-base w-full text-sm font-mono" 
                    />
                  </div>
                </div>

                {/* Job Description Relational Link */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-brand-text-muted uppercase">Linked Job Description (Keywords Matcher)</label>
                  <select 
                    value={jobDescriptionId}
                    onChange={(e) => setJobDescriptionId(e.target.value)}
                    className="input-base w-full text-sm"
                  >
                    <option value="">-- No Linked Specification --</option>
                    {jds.map(jd => (
                      <option key={jd.id} value={jd.id}>{jd.companyName} — {jd.roleTitle}</option>
                    ))}
                  </select>
                </div>

                {/* Remote Checkbox */}
                <label className="flex items-center gap-2 font-mono text-xs text-brand-text-muted cursor-pointer hover:text-brand-text select-none pt-1">
                  <input 
                    type="checkbox" 
                    checked={isRemote} 
                    onChange={(e) => setIsRemote(e.target.checked)}
                    className="accent-brand-primary"
                  />
                  This is a Remote position
                </label>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-brand-text-muted uppercase">Log Notes / Recruiter Directives</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input-base w-full h-24 text-sm font-sans" 
                    placeholder="e.g. Recruiter: Sam. Technical screen covers EF Core migrations..."
                  />
                </div>
              </div>

              <div className="p-4 border-t border-brand-border bg-brand-surface-high/40 flex justify-between gap-3 shrink-0">
                {selectedApp ? (
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setScannerApp(selectedApp)}
                      className="text-xs font-mono border border-brand-primary/40 text-brand-primary hover:bg-brand-primary/10 px-3 py-2 rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(50,185,200,0.1)] hover:shadow-[0_0_15px_rgba(50,185,200,0.3)]"
                    >
                      <Radar size={14} className="animate-pulse" /> Scanner
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleDelete(selectedApp.id)}
                      className="text-2xs font-mono border border-[#f87171]/40 text-[#f87171] hover:bg-[#f87171]/10 px-3 py-2 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                ) : <div />}
                
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-sm cursor-pointer">Cancel</button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting || !companyName.trim() || !roleTitle.trim()}
                    className="btn-primary text-sm flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : null}
                    {selectedApp ? 'Save Pipeline' : 'Initialize Connection'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trajectory Scanner Overlay */}
      {scannerApp && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-brand-secondary/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex items-center justify-between p-4 border-b border-brand-border bg-brand-surface-high/30 z-20">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg border border-brand-primary/20">
                <Radar size={20} className="animate-pulse" />
              </span>
              <div>
                <h2 className="text-xl font-heading font-bold text-brand-text">Trajectory Scanner Active</h2>
                <p className="text-xs font-mono text-brand-text-muted uppercase tracking-widest">Target: {scannerApp.companyName} — {scannerApp.roleTitle}</p>
              </div>
            </div>
            <button onClick={() => setScannerApp(null)} className="text-brand-text-muted hover:text-brand-primary p-2 border border-transparent hover:border-brand-primary/30 rounded-lg hover:bg-brand-primary/10 transition-colors cursor-pointer flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-widest hidden md:inline">Abort Scan</span>
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 relative overflow-hidden">
             <RadialOrbitalTimeline timelineData={generateTrajectory(scannerApp)} />
          </div>
        </div>
      )}
    </div>
  );
}
