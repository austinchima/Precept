import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Application, ApplicationStatus } from '../types';
import { api } from '../api';
import { useToast } from '../components/ui/Toast';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import confetti from 'canvas-confetti';
import { getCompanyIcon } from '../lib/utils';

const COLUMNS: ApplicationStatus[] = ['Applied', 'PhoneScreen', 'Interviewing', 'Offer', 'Rejected', 'Ghosted'];

const COLUMN_LABELS: Record<ApplicationStatus, string> = {
  'Applied': 'Applied',
  'PhoneScreen': 'Phone Screen',
  'Interviewing': 'Interviewing',
  'Offer': 'Offer',
  'Rejected': 'Rejected',
  'Ghosted': 'Ghosted'
};

const getStatusColor = (status: ApplicationStatus) => {
  switch(status) {
    case 'Offer': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'Rejected': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    case 'Ghosted': return 'bg-white/5 text-text-secondary border-white/10';
    case 'Interviewing': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'PhoneScreen': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    default: return 'bg-accent-teal/10 text-accent-teal border-accent-teal/20';
  }
};

const getStatusIcon = (status: ApplicationStatus) => {
  switch(status) {
    case 'Offer': return 'fa-solid fa-trophy';
    case 'Rejected': return 'fa-solid fa-xmark';
    case 'Ghosted': return 'fa-solid fa-ghost';
    case 'Interviewing': return 'fa-solid fa-comments';
    case 'PhoneScreen': return 'fa-solid fa-phone';
    default: return 'fa-regular fa-paper-plane';
  }
};

const getStatusGlow = (status: ApplicationStatus) => {
  switch(status) {
    case 'Offer': return 'shadow-[0_0_15px_rgba(16,185,129,0.15)]';
    case 'Rejected': return 'shadow-[0_0_15px_rgba(244,63,94,0.1)]';
    case 'Interviewing': return 'shadow-[0_0_15px_rgba(59,130,246,0.15)]';
    case 'PhoneScreen': return 'shadow-[0_0_15px_rgba(6,182,212,0.15)]';
    default: return '';
  }
};

const renderCompanyLogo = (name: string, sizeClass = 'h-6 w-6 text-xs') => {
  const { icon, color, isText, initials } = getCompanyIcon(name);
  if (isText) {
    return (
      <div 
        className={`${sizeClass} rounded-md flex items-center justify-center shrink-0 shadow-sm`}
        style={{ backgroundColor: color, color: '#ffffff' }}
      >
        <span className="font-bold leading-none">{initials}</span>
      </div>
    );
  }
  return (
    <div 
      className={`${sizeClass} rounded-md flex items-center justify-center shrink-0 shadow-sm`}
      style={{ backgroundColor: `${color}15`, color: color, border: `1px solid ${color}30` }}
    >
      <i className={icon}></i>
    </div>
  );
};

export default function AppTracker() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [apps, setApps] = useState<Application[]>([]);
  const [jds, setJds] = useState<{ id: string; companyName: string; roleTitle: string }[]>([]);
  const [view, setView] = useState<'board' | 'table'>('board');
  const [isLoading, setIsLoading] = useState(true);
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [appToDelete, setAppToDelete] = useState<string | null>(null);

  const toast = useToast();
  
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

      if (newStatus === 'Offer') {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        const commonOptions = {
          particleCount: 40,
          spread: 40,
          scalar: 0.6,
          ticks: 60, // Short duration
          gravity: 2, // Fall quickly
          startVelocity: 55, // Shoot out fast
          colors: ['#2dd4bf', '#10b981', '#fcd34d', '#ffffff'],
          zIndex: 0
        };

        // Shoot left
        confetti({
          ...commonOptions,
          origin: { x: Math.max(0, x - 0.05), y },
          angle: 135
        });

        // Shoot right
        confetti({
          ...commonOptions,
          origin: { x: Math.min(1, x + 0.05), y },
          angle: 45
        });
      }

      try {
        await api.patch(`/api/application/${draggedAppId}/status`, { status: newStatus });
      } catch (err) {
        console.error('Failed to sync status drop to server:', err);
        // Rollback on error
        setApps(prev => prev.map(a => a.id === draggedAppId ? { ...a, status: targetApp.status } : a));
        toast.error('Status update failed. The change has been rolled back.');
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
        
        if (selectedApp.status !== 'Offer' && status === 'Offer') {
          const commonOptions = {
            particleCount: 40,
            spread: 40,
            scalar: 0.6,
            ticks: 60,
            gravity: 2,
            startVelocity: 55,
            colors: ['#2dd4bf', '#10b981', '#fcd34d', '#ffffff'],
            zIndex: 40 // behind the z-50 modal
          };
          
          confetti({ ...commonOptions, origin: { x: 0.35, y: 0.5 }, angle: 135 });
          confetti({ ...commonOptions, origin: { x: 0.65, y: 0.5 }, angle: 45 });
        }
      } else {
        const created = await api.post<Application>('/api/application', payload);
        setApps(prev => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || 'Failed to save pipeline record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (id: string) => {
    setAppToDelete(id);
  };

  const executeDelete = async () => {
    if (!appToDelete) return;
    
    try {
      await api.delete(`/api/application/${appToDelete}`);
      setApps(prev => prev.filter(a => a.id !== appToDelete));
      setIsModalOpen(false);
      setAppToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || 'Failed to delete application.');
      setAppToDelete(null);
    }
  };

  return (
    <div className="p-8 pt-6 max-w-[1400px] mx-auto space-y-6 h-full flex flex-col">

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 opacity-0 animate-fade-in-up">
        <div>
          <h1 className="text-[28px] font-medium text-white flex items-center tracking-tight">
            Active <span className="font-bold ml-2 hover:text-accent-teal transition-colors duration-300 cursor-default">Pipelines</span>
            <span className="mx-3 text-text-secondary/30 text-3xl font-light">|</span>
            <span className="text-text-secondary font-normal text-lg">{apps.length} tracked</span>
          </h1>
          <p className="text-text-secondary text-sm mt-1">Status tracking for outbound connections.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* View Toggle */}
          <div className="flex glass-panel rounded-xl p-1 gap-1">
            <button 
              onClick={() => setView('board')}
              className={`p-2 rounded-lg transition-all duration-300 cursor-pointer flex items-center justify-center ${view === 'board' ? 'bg-accent-teal/10 text-accent-teal shadow-[0_0_10px_rgba(45,212,191,0.15)]' : 'text-text-secondary hover:text-white'}`}
            >
              <i className="fa-solid fa-table-columns text-sm"></i>
            </button>
            <button 
              onClick={() => setView('table')}
              className={`p-2 rounded-lg transition-all duration-300 cursor-pointer flex items-center justify-center ${view === 'table' ? 'bg-accent-teal/10 text-accent-teal shadow-[0_0_10px_rgba(45,212,191,0.15)]' : 'text-text-secondary hover:text-white'}`}
            >
              <i className="fa-solid fa-list text-sm"></i>
            </button>
          </div>

          <button onClick={handleOpenCreateModal} className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent-teal text-dashboard-bg shadow-[0_0_15px_rgba(45,212,191,0.2)] animate-pulse-glow-teal hover:scale-105 transition-all duration-300 cursor-pointer">
            <i className="fa-solid fa-plus mr-2"></i> Init Pipeline
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-text-secondary gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-accent-teal/10 border-t-accent-teal animate-spin"></div>
          <span className="font-mono text-sm">Ingesting Connection Data...</span>
        </div>
      ) : (
        <div className="flex-1 overflow-auto opacity-0 animate-fade-in-up delay-200">
          {view === 'board' ? (
            <div className="flex flex-col lg:flex-row gap-5 h-full pb-4">
              {COLUMNS.map(col => (
                <div 
                  key={col} 
                  className="w-full lg:w-[280px] flex flex-col pt-2"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col)}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2">
                      <i className={`${getStatusIcon(col)} text-xs ${getStatusColor(col).split(' ')[1]}`}></i>
                      <h3 className="text-xs font-semibold uppercase text-text-secondary tracking-wider">{COLUMN_LABELS[col]}</h3>
                    </div>
                    <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded-full text-text-secondary border border-white/5">
                      {apps.filter(a => a.status === col).length}
                    </span>
                  </div>
                  
                  {/* Column Body */}
                  <div className="flex-1 space-y-3 glass-panel rounded-xl p-3 border-dashed border-white/5! overflow-y-auto min-h-[300px] custom-scrollbar">
                    {apps.filter(a => a.status === col).map(app => (
                      <div 
                        key={app.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, app.id)}
                        onClick={() => handleOpenEditModal(app)}
                        className={`glass-panel rounded-xl p-4 hover:border-white/15 transition-all duration-300 cursor-move group relative ${getStatusGlow(app.status)} ${draggedAppId === app.id ? 'opacity-40 border-accent-teal!' : ''}`}
                      >
                         <button className="absolute top-3.5 right-3.5 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity hover:text-accent-teal cursor-pointer flex items-center justify-center">
                           <i className="fa-solid fa-ellipsis text-xs"></i>
                         </button>
                         <div className="flex items-center gap-2 mb-1 pr-6">
                           {renderCompanyLogo(app.companyName)}
                           <h4 className="font-semibold text-white text-sm truncate group-hover:text-accent-teal transition-colors duration-300">{app.companyName}</h4>
                         </div>
                         <p className="text-xs text-text-secondary mb-3 truncate">{app.roleTitle}</p>
                         <div className="flex items-center text-[10px] font-mono text-text-secondary gap-1.5">
                           <i className="fa-regular fa-calendar text-accent-teal text-[10px]"></i> {app.dateApplied ? new Date(app.dateApplied).toLocaleDateString() : 'No date'}
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <section className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                  <tr className="border-b border-panel-border/30">
                    <th className="px-6 py-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Company</th>
                    <th className="px-6 py-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-panel-border/20">
                  {apps.map((app) => (
                    <tr 
                      key={app.id} 
                      onClick={() => handleOpenEditModal(app)}
                      className="hover:bg-white/3 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {renderCompanyLogo(app.companyName, 'h-8 w-8 text-sm')}
                          <span className="font-semibold text-white group-hover:text-accent-teal transition-colors duration-300">{app.companyName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-text-secondary text-sm">{app.roleTitle}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${getStatusColor(app.status)}`}>
                          <i className={`${getStatusIcon(app.status)} text-[8px]`}></i>
                          {COLUMN_LABELS[app.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-text-secondary">
                        {app.dateApplied ? new Date(app.dateApplied).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleOpenEditModal(app)} className="text-text-secondary hover:text-accent-teal transition-colors cursor-pointer">
                           <i className="fa-solid fa-ellipsis text-sm"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {apps.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-text-secondary font-mono text-sm italic">
                        No pipelines tracked yet. Initialise outbound connections above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden flex-1 overflow-y-auto p-4 space-y-4">
                {apps.length === 0 && (
                  <div className="py-12 text-center text-text-secondary font-mono text-sm italic">
                    No pipelines tracked yet. Initialise outbound connections above.
                  </div>
                )}
                {apps.map(app => (
                  <div key={app.id} onClick={() => handleOpenEditModal(app)} className="glass-panel p-4 rounded-xl flex flex-col gap-3 cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          {renderCompanyLogo(app.companyName, 'h-5 w-5 text-[10px]')}
                          <div className="text-sm font-medium text-white">{app.companyName}</div>
                        </div>
                        <div className="text-xs text-text-secondary truncate max-w-[200px]">{app.roleTitle}</div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border ${getStatusColor(app.status)}`}>
                        <i className={`${getStatusIcon(app.status)} text-[8px]`}></i>
                        {COLUMN_LABELS[app.status]}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-text-secondary mt-1">
                      <span><i className="fa-regular fa-calendar mr-1"></i> {app.dateApplied ? new Date(app.dateApplied).toLocaleDateString() : 'N/A'}</span>
                      <i className="fa-solid fa-chevron-right text-[10px]"></i>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dashboard-bg/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-[672px] max-h-[90vh] flex flex-col shadow-2xl relative rounded-2xl overflow-hidden opacity-0 animate-fade-in-up">
            {/* Modal top accent */}
            <div className="absolute top-0 left-0 w-full h-0.5 bg-linear-to-r from-accent-teal/20 via-accent-teal to-accent-teal/20"></div>
            
            <div className="flex items-center justify-between p-5 border-b border-panel-border/30">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <i className={`${selectedApp ? 'fa-solid fa-pen-to-square' : 'fa-solid fa-plus'} text-accent-teal text-sm`}></i>
                {selectedApp ? 'Update Connection' : 'Initialize Connection'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-text-secondary uppercase">Company Name</label>
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
                    <label className="text-xs font-mono text-text-secondary uppercase">Role Title</label>
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
                    <label className="text-xs font-mono text-text-secondary uppercase">Status</label>
                    <select 
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                      className="input-base w-full text-sm"
                    >
                      {COLUMNS.map(col => <option key={col} value={col}>{COLUMN_LABELS[col]}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-text-secondary uppercase">Salary Range (Optional)</label>
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
                    <label className="text-xs font-mono text-text-secondary uppercase">Location</label>
                    <input 
                      type="text" 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="input-base w-full text-sm" 
                      placeholder="e.g. Remote, Boston MA" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-text-secondary uppercase">Source</label>
                    <input 
                      type="text" 
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="input-base w-full text-sm font-mono" 
                      placeholder="LinkedIn, Referral" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-text-secondary uppercase">Resume Version</label>
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
                    <label className="text-xs font-mono text-text-secondary uppercase">Date Applied</label>
                    <input 
                      type="date" 
                      value={dateApplied}
                      onChange={(e) => setDateApplied(e.target.value)}
                      className="input-base w-full text-sm font-mono" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-text-secondary uppercase">Date Last Contact</label>
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
                  <label className="text-xs font-mono text-text-secondary uppercase">Linked Job Description</label>
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
                <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer hover:text-white select-none pt-1">
                  <input 
                    type="checkbox" 
                    checked={isRemote} 
                    onChange={(e) => setIsRemote(e.target.checked)}
                    className="accent-accent-teal"
                  />
                  This is a Remote position
                </label>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-text-secondary uppercase">Notes</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input-base w-full h-24 text-sm font-sans" 
                    placeholder="e.g. Recruiter: Sam. Technical screen covers EF Core migrations..."
                  />
                </div>
              </div>

              <div className="p-4 border-t border-panel-border/30 flex justify-between gap-3 shrink-0">
                {selectedApp ? (
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => confirmDelete(selectedApp.id)}
                      className="text-[11px] font-mono border border-[#f87171]/40 text-[#f87171] hover:bg-[#f87171]/10 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <i className="fa-regular fa-trash-can text-xs"></i> Delete
                    </button>
                  </div>
                ) : <div />}
                
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl text-sm text-text-secondary hover:text-white border border-panel-border/30 hover:border-white/20 transition-all cursor-pointer">Cancel</button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting || !companyName.trim() || !roleTitle.trim()}
                    className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-accent-teal text-dashboard-bg shadow-[0_0_15px_rgba(45,212,191,0.2)] hover:scale-105 transition-all duration-300 cursor-pointer gap-2"
                  >
                    {isSubmitting ? <div className="w-4 h-4 rounded-full border-2 border-dashboard-bg/30 border-t-dashboard-bg animate-spin"></div> : null}
                    {selectedApp ? 'Save Pipeline' : 'Initialize Connection'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={!!appToDelete}
        title="Delete Pipeline"
        message="Are you sure you want to permanently delete this application pipeline? This action cannot be undone."
        confirmText="Erase Pipeline"
        cancelText="Cancel"
        onConfirm={executeDelete}
        onCancel={() => setAppToDelete(null)}
        danger={true}
      />
    </div>
  );
}
