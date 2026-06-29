import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Application, ApplicationStatus } from '../types';
import { api } from '../api';
import { useToast } from '../components/ui/Toast';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import confetti from 'canvas-confetti';
import { getCompanyIcon } from '../lib/utils';
import { AnimatedSection } from '../components/animation/AnimatedSection';
import { CountUp } from '../components/animation/CountUp';
import { Plus, LayoutGrid, List, X, Trash2, Loader2 } from 'lucide-react';

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

const COLUMNS: ApplicationStatus[] = ['Applied', 'PhoneScreen', 'Interviewing', 'Offer', 'Rejected', 'Ghosted'];

const COLUMN_LABELS: Record<ApplicationStatus, string> = {
  Applied: 'Applied', PhoneScreen: 'Phone Screen', Interviewing: 'Interviewing',
  Offer: 'Offer', Rejected: 'Rejected', Ghosted: 'Ghosted',
};

const statusColor = (status: ApplicationStatus): string => {
  switch (status) {
    case 'Offer': return C.emerald;
    case 'Rejected': return C.rose;
    case 'Ghosted': return C.inkMute;
    case 'Interviewing': return C.sky;
    case 'PhoneScreen': return '#06b6d4';
    default: return C.teal;
  }
};

const getStatusIcon = (status: ApplicationStatus) => {
  switch (status) {
    case 'Offer': return 'fa-solid fa-trophy';
    case 'Rejected': return 'fa-solid fa-xmark';
    case 'Ghosted': return 'fa-solid fa-ghost';
    case 'Interviewing': return 'fa-solid fa-comments';
    case 'PhoneScreen': return 'fa-solid fa-phone';
    default: return 'fa-regular fa-paper-plane';
  }
};

const renderCompanyLogo = (name: string, sizeClass = 'h-6 w-6 text-[11px]') => {
  const { icon, color, isText, initials } = getCompanyIcon(name);
  if (isText) {
    return (
      <div className={`${sizeClass} rounded-md grid place-items-center shrink-0 font-display font-bold`} style={{ background: color, color: '#fff' }}>
        {initials}
      </div>
    );
  }
  return (
    <div className={`${sizeClass} rounded-md grid place-items-center shrink-0`} style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
      <i className={icon} />
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.025)',
  border: `1px solid ${C.hair}`,
  borderRadius: 10,
  color: C.ink,
  padding: '10px 12px',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 13,
  width: '100%',
  outline: 'none',
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

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
      const jdData = await api.get<{ id: string; companyName: string; roleTitle: string }[]>('/api/jobdescription');
      setJds(jdData);
    } catch (err) {
      console.error('Failed to load application pipeline:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadApplications(); }, []);

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
    const targetApp = apps.find((a) => a.id === draggedAppId);
    if (targetApp && targetApp.status !== newStatus) {
      setApps((prev) => prev.map((a) => (a.id === draggedAppId ? { ...a, status: newStatus } : a)));
      if (newStatus === 'Offer') {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        const common = { particleCount: 40, spread: 40, scalar: 0.6, ticks: 60, gravity: 2, startVelocity: 55, colors: ['#2dd4bf', '#10b981', '#fcd34d', '#ffffff'], zIndex: 0 };
        confetti({ ...common, origin: { x: Math.max(0, x - 0.05), y }, angle: 135 });
        confetti({ ...common, origin: { x: Math.min(1, x + 0.05), y }, angle: 45 });
      }
      try {
        await api.patch(`/api/application/${draggedAppId}/status`, { status: newStatus });
      } catch (err) {
        console.error('Failed to sync status drop:', err);
        setApps((prev) => prev.map((a) => (a.id === draggedAppId ? { ...a, status: targetApp.status } : a)));
        toast.error('Status update failed. The change has been rolled back.');
      }
    }
    setDraggedAppId(null);
  };

  const handleOpenCreateModal = () => {
    setSelectedApp(null);
    setCompanyName(''); setRoleTitle(''); setLocation('Remote'); setSalaryRange('');
    setStatus('Applied');
    const today = new Date().toISOString().split('T')[0];
    setDateApplied(today); setDateLastContact(today);
    setResumeVersion('v1'); setSource('LinkedIn'); setIsRemote(true); setNotes(''); setJobDescriptionId('');
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      handleOpenCreateModal();
      setSearchParams({});
    }
  }, [searchParams]); // eslint-disable-line

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
        jobDescriptionId: jobDescriptionId || null,
      };
      if (selectedApp) {
        const updated = await api.put<Application>(`/api/application/${selectedApp.id}`, { ...payload, id: selectedApp.id });
        setApps((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        if (selectedApp.status !== 'Offer' && status === 'Offer') {
          const common = { particleCount: 40, spread: 40, scalar: 0.6, ticks: 60, gravity: 2, startVelocity: 55, colors: ['#2dd4bf', '#10b981', '#fcd34d', '#ffffff'], zIndex: 40 };
          confetti({ ...common, origin: { x: 0.35, y: 0.5 }, angle: 135 });
          confetti({ ...common, origin: { x: 0.65, y: 0.5 }, angle: 45 });
        }
      } else {
        const created = await api.post<Application>('/api/application', payload);
        setApps((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || 'Failed to save pipeline record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (id: string) => setAppToDelete(id);
  const executeDelete = async () => {
    if (!appToDelete) return;
    try {
      await api.delete(`/api/application/${appToDelete}`);
      setApps((prev) => prev.filter((a) => a.id !== appToDelete));
      setIsModalOpen(false);
      setAppToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || 'Failed to delete application.');
      setAppToDelete(null);
    }
  };

  return (
    <div className="font-body p-4 md:p-8 pt-4 md:pt-6 max-w-[1400px] mx-auto space-y-6 h-full flex flex-col" data-testid="app-tracker-page" style={{ color: C.ink }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 opacity-0 animate-fade-in-up">
        <div>
          <Eyebrow color={C.violet}>Pipeline tracker</Eyebrow>
          <h1 className="mt-4 font-display font-bold leading-[1.05]" style={{ color: C.ink, fontSize: 'clamp(28px,4vw,40px)' }}>
            Active <span className="font-editorial" style={{ color: C.violet, fontWeight: 400 }}>pipelines.</span>
          </h1>
          <p className="mt-2 font-body text-[14px]" style={{ color: C.inkDim }}>
            <CountUp end={apps.length} duration={1.2} /> tracked · drag cards between stages, no graveyards.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex p-1 gap-1" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.hair}`, borderRadius: 12 }}>
            {[
              { v: 'board' as const, i: <LayoutGrid size={14} /> },
              { v: 'table' as const, i: <List size={14} /> },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setView(opt.v)}
                data-testid={`view-${opt.v}`}
                className="min-h-[36px] min-w-[40px] rounded-lg flex items-center justify-center transition-all cursor-pointer"
                style={{
                  background: view === opt.v ? C.tealDim : 'transparent',
                  color: view === opt.v ? C.teal : C.inkDim,
                }}
              >
                {opt.i}
              </button>
            ))}
          </div>
          <button
            onClick={handleOpenCreateModal}
            data-testid="apptracker-new-btn"
            className="group inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] cursor-pointer"
            style={{ background: C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${C.ink}, 0 18px 60px -20px rgba(45,212,191,0.45)` }}
          >
            <Plus size={13} /> New application
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3" style={{ color: C.inkDim }}>
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: C.teal }} />
          <span className="font-mono text-sm">Loading pipeline…</span>
        </div>
      ) : (
        <div className="flex-1 overflow-auto opacity-0 animate-fade-in-up delay-200">
          {view === 'board' ? (
            <div className="flex flex-col lg:flex-row gap-4 h-full pb-4">
              {COLUMNS.map((col) => {
                const color = statusColor(col);
                return (
                  <div
                    key={col}
                    className="w-full lg:w-[290px] flex flex-col"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col)}
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <i className={`${getStatusIcon(col)} text-[10px]`} style={{ color }} />
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: C.inkDim }}>{COLUMN_LABELS[col]}</span>
                      </div>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${color}1c`, color, border: `1px solid ${color}44` }}>
                        {apps.filter((a) => a.status === col).length}
                      </span>
                    </div>
                    <div
                      className="flex-1 min-h-[300px] p-3 rounded-[14px]"
                      style={{ background: 'rgba(255,255,255,0.015)', border: `1px dashed ${C.hair}` }}
                    >
                    <AnimatedSection
                      animation="staggerFadeUp"
                      stagger={0.05}
                      childSelector="> div"
                      className="space-y-2.5 overflow-y-auto custom-scrollbar"
                    >
                      {apps.filter((a) => a.status === col).map((app) => (
                        <div
                          key={app.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, app.id)}
                          onClick={() => handleOpenEditModal(app)}
                          data-testid={`app-card-${app.id}`}
                          className={`p-3.5 transition-all duration-300 cursor-move group ${draggedAppId === app.id ? 'opacity-40' : ''}`}
                          style={{
                            background: C.bg2,
                            border: `1px solid ${C.hair}`,
                            borderRadius: 12,
                            boxShadow: `0 1px 0 ${color}22 inset`,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${color}66`; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.hair; }}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            {renderCompanyLogo(app.companyName, 'h-7 w-7 text-[11px]')}
                            <h4 className="font-display font-semibold text-[13px] truncate" style={{ color: C.ink }}>{app.companyName}</h4>
                          </div>
                          <p className="font-body text-[11.5px] mb-2.5 truncate" style={{ color: C.inkDim }}>{app.roleTitle}</p>
                          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: C.inkMute }}>
                            <i className="fa-regular fa-calendar text-[10px]" style={{ color }} />
                            {app.dateApplied ? new Date(app.dateApplied).toLocaleDateString() : 'No date'}
                          </div>
                        </div>
                      ))}
                    </AnimatedSection>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <section className="overflow-hidden" style={cardStyle()}>
              <AnimatedSection animation="staggerFadeUp" stagger={0.04} childSelector="tbody tr" className="hidden md:block overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.hair}` }}>
                      <th className="px-6 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.16em]" style={{ color: C.inkMute }}>Company</th>
                      <th className="px-6 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.16em]" style={{ color: C.inkMute }}>Role</th>
                      <th className="px-6 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.16em]" style={{ color: C.inkMute }}>Status</th>
                      <th className="px-6 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.16em]" style={{ color: C.inkMute }}>Applied</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apps.map((app) => {
                      const color = statusColor(app.status);
                      return (
                        <tr
                          key={app.id}
                          onClick={() => handleOpenEditModal(app)}
                          className="cursor-pointer transition-colors"
                          style={{ borderBottom: `1px solid ${C.hair}` }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              {renderCompanyLogo(app.companyName, 'h-8 w-8 text-sm')}
                              <span className="font-display font-semibold" style={{ color: C.ink }}>{app.companyName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-body text-[13px]" style={{ color: C.inkDim }}>{app.roleTitle}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-widest"
                              style={{ background: `${color}1c`, color, border: `1px solid ${color}44` }}>
                              <i className={`${getStatusIcon(app.status)} text-[9px]`} />
                              {COLUMN_LABELS[app.status]}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-[11.5px]" style={{ color: C.inkDim }}>
                            {app.dateApplied ? new Date(app.dateApplied).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
                    {apps.length === 0 && (
                      <tr><td colSpan={4} className="py-14 text-center font-mono text-sm italic" style={{ color: C.inkMute }}>No pipelines tracked yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </AnimatedSection>

              <div className="md:hidden p-4 space-y-3">
                {apps.length === 0 && <div className="py-10 text-center font-mono text-sm italic" style={{ color: C.inkMute }}>No pipelines tracked yet.</div>}
                {apps.map((app) => {
                  const color = statusColor(app.status);
                  return (
                    <div key={app.id} onClick={() => handleOpenEditModal(app)} className="p-4 cursor-pointer" style={{ background: C.bg2, border: `1px solid ${C.hair}`, borderRadius: 12 }}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {renderCompanyLogo(app.companyName, 'h-6 w-6 text-[10px]')}
                          <div className="min-w-0">
                            <div className="font-display font-semibold truncate" style={{ color: C.ink }}>{app.companyName}</div>
                            <div className="font-mono text-[11px] truncate" style={{ color: C.inkMute }}>{app.roleTitle}</div>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-widest"
                          style={{ background: `${color}1c`, color, border: `1px solid ${color}44` }}>
                          {COLUMN_LABELS[app.status]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(2,5,10,0.7)', backdropFilter: 'blur(10px)' }}>
          <div className="w-full max-w-[680px] max-h-[92vh] flex flex-col relative opacity-0 animate-fade-in-up" style={{ ...cardStyle(), borderRadius: 22 }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${C.hair}` }}>
              <div className="flex items-center gap-3">
                <Eyebrow color={selectedApp ? C.amber : C.teal}>{selectedApp ? 'Edit pipeline' : 'New pipeline'}</Eyebrow>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="min-h-[40px] min-w-[40px] rounded-lg grid place-items-center transition-colors cursor-pointer"
                style={{ color: C.inkDim }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.ink; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.inkDim; e.currentTarget.style.background = 'transparent'; }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Company">
                    <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Stripe" required style={inputStyle} />
                  </Field>
                  <Field label="Role">
                    <input type="text" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="e.g. Senior Backend Engineer" required style={inputStyle} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Status">
                    <select value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus)} style={inputStyle}>
                      {COLUMNS.map((c) => <option key={c} value={c} style={{ background: C.bg1, color: C.ink }}>{COLUMN_LABELS[c]}</option>)}
                    </select>
                  </Field>
                  <Field label="Salary (optional)">
                    <input type="text" value={salaryRange} onChange={(e) => setSalaryRange(e.target.value)} placeholder="$120k – $140k" style={inputStyle} />
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Location">
                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Remote" style={inputStyle} />
                  </Field>
                  <Field label="Source">
                    <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="LinkedIn" style={inputStyle} />
                  </Field>
                  <Field label="Resume">
                    <input type="text" value={resumeVersion} onChange={(e) => setResumeVersion(e.target.value)} placeholder="v2-backend" style={inputStyle} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Date applied"><input type="date" value={dateApplied} onChange={(e) => setDateApplied(e.target.value)} style={inputStyle} /></Field>
                  <Field label="Last contact"><input type="date" value={dateLastContact} onChange={(e) => setDateLastContact(e.target.value)} style={inputStyle} /></Field>
                </div>
                <Field label="Linked JD">
                  <select value={jobDescriptionId} onChange={(e) => setJobDescriptionId(e.target.value)} style={inputStyle}>
                    <option value="" style={{ background: C.bg1 }}>— No linked spec —</option>
                    {jds.map((jd) => (
                      <option key={jd.id} value={jd.id} style={{ background: C.bg1 }}>{jd.companyName} — {jd.roleTitle}</option>
                    ))}
                  </select>
                </Field>
                <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] cursor-pointer pt-1" style={{ color: C.inkDim }}>
                  <input type="checkbox" checked={isRemote} onChange={(e) => setIsRemote(e.target.checked)} style={{ accentColor: C.teal }} />
                  Remote position
                </label>
                <Field label="Notes">
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Recruiter: Sam · Tech screen covers EF Core…" style={{ ...inputStyle, fontFamily: 'Geist, Inter, sans-serif', resize: 'vertical' }} />
                </Field>
              </div>

              <div className="p-4 flex justify-between gap-3 shrink-0" style={{ borderTop: `1px solid ${C.hair}` }}>
                {selectedApp ? (
                  <button type="button" onClick={() => confirmDelete(selectedApp.id)}
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] cursor-pointer"
                    style={{ background: 'transparent', color: C.rose, border: `1px solid ${C.rose}44` }}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                ) : <div />}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] cursor-pointer"
                    style={{ background: 'transparent', color: C.inkDim, border: `1px solid ${C.hair2}` }}
                  >Cancel</button>
                  <button type="submit" disabled={isSubmitting || !companyName.trim() || !roleTitle.trim()}
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] cursor-pointer disabled:opacity-60"
                    style={{ background: C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${C.ink}` }}
                  >
                    {isSubmitting && <Loader2 size={12} className="animate-spin" />}
                    {selectedApp ? 'Save changes' : 'Create pipeline'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!appToDelete}
        title="Delete pipeline"
        message="Are you sure you want to permanently delete this application pipeline? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={executeDelete}
        onCancel={() => setAppToDelete(null)}
        danger={true}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-[10px] uppercase tracking-[0.18em] block" style={{ color: C.inkMute }}>{label}</label>
      {children}
    </div>
  );
}
