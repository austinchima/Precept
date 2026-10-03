import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Calendar, Columns3, List, Plus, Trash2 } from 'lucide-react';
import { Application, ApplicationStatus, PagedResponse } from '../types';
import { api } from '../api';
import { useToast } from '../components/ui/Toast';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import PageShell from '../components/PageShell';
import { Button, Dialog, EmptyState, Field, Input, Monogram, Panel, Segmented, Select, Skeleton, Textarea } from '../components/ui/kit';
import { STATUS_META, STATUS_ORDER, StatusBadge, overdueLabel } from '../components/domain';
import { cn } from '../lib/utils';

function celebrate(x = 0.5, y = 0.5) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#c2e35d';
  const common = { particleCount: 36, spread: 42, scalar: 0.6, ticks: 70, gravity: 1.8, startVelocity: 48, colors: [accent, '#ffffff'], zIndex: 90 };
  confetti({ ...common, origin: { x: Math.max(0, x - 0.04), y }, angle: 125 });
  confetti({ ...common, origin: { x: Math.min(1, x + 0.04), y }, angle: 55 });
}

const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date');

function AppCard({ app, dragging, onOpen, onDragStart, onDragEnd }: { app: Application; dragging: boolean; onOpen: () => void; onDragStart: (e: React.DragEvent) => void; onDragEnd: () => void }) {
  const reduce = useReducedMotion();
  const due = ['Applied', 'PhoneScreen', 'Interviewing'].includes(app.status) && app.followUpDate && new Date(app.followUpDate) <= new Date() ? overdueLabel(app.followUpDate) : null;
  return (
    <motion.div layout={!reduce} layoutId={reduce ? undefined : app.id} transition={{ type: 'spring', stiffness: 500, damping: 40 }}>
      <div
        role="button"
        tabIndex={0}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen();
          }
        }}
        data-testid={`app-card-${app.id}`}
        className={cn(
          'cursor-grab rounded-lg border border-line bg-surface-1 p-3 transition-[border-color,opacity,transform] hover:border-line-strong active:cursor-grabbing',
          dragging && 'opacity-40'
        )}
      >
        <div className="flex items-center gap-2.5">
          <Monogram name={app.companyName} size={28} />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-medium text-fg">{app.companyName}</p>
            <p className="truncate text-[12.5px] text-fg-3">{app.roleTitle}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[12px] text-fg-3">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={12} /> {formatDate(app.dateApplied)}
          </span>
          {due && <span className={due.overdue ? 'text-danger' : 'text-warning'}>Follow up</span>}
        </div>
      </div>
    </motion.div>
  );
}

export default function AppTracker() {
  const [searchParams, setSearchParams] = useSearchParams();
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const [apps, setApps] = useState<Application[]>([]);
  const [jds, setJds] = useState<{ id: string; companyName: string; roleTitle: string }[]>([]);
  const [view, setView] = useState<'board' | 'table'>('board');
  const [isLoading, setIsLoading] = useState(true);
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<ApplicationStatus | null>(null);
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
      const data = await api.get<PagedResponse<Application>>('/api/application');
      setApps(data.items ?? []);
      const jdData = await api.get<PagedResponse<{ id: string; companyName: string; roleTitle: string }>>('/api/jobdescription');
      setJds(jdData.items ?? []);
    } catch (err) {
      console.error('Failed to load application pipeline:', err);
      toast.error('Could not load applications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

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

  // Open the form from ?new=true (bookmarks) or router state (dashboard button).
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      handleOpenCreateModal();
      setSearchParams({});
    }
  }, [searchParams]); // eslint-disable-line

  useEffect(() => {
    if ((routerLocation.state as { openNewForm?: boolean } | null)?.openNewForm) {
      handleOpenCreateModal();
      navigate(routerLocation.pathname, { replace: true, state: null });
    }
  }, [routerLocation.state]); // eslint-disable-line

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

  const handleDrop = async (e: React.DragEvent, newStatus: ApplicationStatus) => {
    e.preventDefault();
    setDropTarget(null);
    if (!draggedAppId) return;
    const id = draggedAppId;
    const targetApp = apps.find((a) => a.id === id);
    setDraggedAppId(null);
    if (!targetApp || targetApp.status === newStatus) return;
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)));
    if (newStatus === 'Offer') celebrate(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
    try {
      await api.patch(`/api/application/${id}/status`, { status: newStatus });
    } catch (err) {
      console.error('Failed to sync status drop:', err);
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: targetApp.status } : a)));
      toast.error('The status change did not save, so it was undone.');
    }
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
        if (selectedApp.status !== 'Offer' && status === 'Offer') celebrate();
        toast.success('Application updated.');
      } else {
        const created = await api.post<Application>('/api/application', payload);
        setApps((prev) => [created, ...prev]);
        toast.success(`${created.companyName} added.`);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || 'The application could not be saved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDelete = async () => {
    if (!appToDelete) return;
    const id = appToDelete;
    setAppToDelete(null);
    try {
      await api.delete(`/api/application/${id}`);
      setApps((prev) => prev.filter((a) => a.id !== id));
      setIsModalOpen(false);
      toast.success('Application moved to trash.');
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || 'Could not delete the application.');
    }
  };

  const byStatus = useMemo(() => {
    const map = new Map<ApplicationStatus, Application[]>();
    STATUS_ORDER.forEach((s) => map.set(s, []));
    apps.forEach((a) => map.get(a.status)?.push(a));
    return map;
  }, [apps]);

  return (
    <PageShell
      dataTestId="app-tracker-page"
      width="wide"
      title="Applications"
      subtitle={`${apps.length} tracked. Drag a card to change its stage, or open it to edit.`}
      actions={
        <>
          <Segmented
            ariaLabel="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'board', label: <span className="inline-flex items-center gap-1.5"><Columns3 size={14} /> Board</span>, testId: 'view-board' },
              { value: 'table', label: <span className="inline-flex items-center gap-1.5"><List size={14} /> List</span>, testId: 'view-table' },
            ]}
          />
          <Button variant="primary" icon={<Plus size={16} />} onClick={handleOpenCreateModal} data-testid="apptracker-new-btn">
            New application
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {STATUS_ORDER.map((s) => <Skeleton key={s} className="h-72" />)}
        </div>
      ) : apps.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Columns3 size={18} />}
            title="No applications yet."
            description="Add a role you applied to. Precept schedules a follow-up a week out and moves it through the stages with you."
            action={<Button variant="primary" icon={<Plus size={16} />} onClick={handleOpenCreateModal}>New application</Button>}
          />
        </Panel>
      ) : view === 'board' ? (
        <LayoutGroup>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
            {STATUS_ORDER.map((col) => {
              const items = byStatus.get(col) ?? [];
              const isTarget = dropTarget === col && draggedAppId;
              return (
                <section
                  key={col}
                  aria-label={STATUS_META[col].label}
                  className="flex w-[264px] shrink-0 snap-start flex-col xl:w-auto xl:min-w-0 xl:flex-1 xl:basis-0"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dropTarget !== col) setDropTarget(col);
                  }}
                  onDragLeave={() => setDropTarget((t) => (t === col ? null : t))}
                  onDrop={(e) => handleDrop(e, col)}
                >
                  <header className="mb-2 flex items-center justify-between px-1">
                    <span className="text-[13px] font-medium text-fg">{STATUS_META[col].label}</span>
                    <span className="num text-[12.5px] text-fg-3">{items.length}</span>
                  </header>
                  <div
                    className={cn(
                      'flex min-h-[320px] flex-1 flex-col gap-2 rounded-xl border border-dashed p-2 transition-colors',
                      isTarget ? 'border-accent-text bg-accent-soft' : 'border-line bg-surface-2/40'
                    )}
                  >
                    {items.map((app) => (
                      <AppCard
                        key={app.id}
                        app={app}
                        dragging={draggedAppId === app.id}
                        onOpen={() => handleOpenEditModal(app)}
                        onDragStart={(e) => {
                          setDraggedAppId(app.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDraggedAppId(null);
                          setDropTarget(null);
                        }}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </LayoutGroup>
      ) : (
        <Panel className="overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-[12.5px] text-fg-3">
                  <th scope="col" className="px-5 py-3 font-medium">Company</th>
                  <th scope="col" className="px-5 py-3 font-medium">Role</th>
                  <th scope="col" className="px-5 py-3 font-medium">Stage</th>
                  <th scope="col" className="px-5 py-3 font-medium">Applied</th>
                  <th scope="col" className="px-5 py-3 font-medium">Follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {apps.map((app) => (
                  <tr key={app.id} onClick={() => handleOpenEditModal(app)} className="cursor-pointer transition-colors hover:bg-surface-2/60">
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-3">
                        <Monogram name={app.companyName} size={28} />
                        <span className="font-medium text-fg">{app.companyName}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3 text-fg-2">{app.roleTitle}</td>
                    <td className="px-5 py-3"><StatusBadge status={app.status} /></td>
                    <td className="num px-5 py-3 text-fg-2">{formatDate(app.dateApplied)}</td>
                    <td className="num px-5 py-3 text-fg-2">{formatDate(app.followUpDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-line md:hidden">
            {apps.map((app) => (
              <li key={app.id}>
                <button type="button" onClick={() => handleOpenEditModal(app)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <Monogram name={app.companyName} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-fg">{app.companyName}</span>
                    <span className="block truncate text-[12.5px] text-fg-3">{app.roleTitle}</span>
                  </span>
                  <StatusBadge status={app.status} />
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg" title={selectedApp ? 'Edit application' : 'New application'} testId="application-dialog">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Company" htmlFor="app-company">
              <Input id="app-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
            </Field>
            <Field label="Role" htmlFor="app-role">
              <Input id="app-role" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} required />
            </Field>
            <Field label="Stage" htmlFor="app-status">
              <Select id="app-status" value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus)}>
                {STATUS_ORDER.map((c) => <option key={c} value={c}>{STATUS_META[c].label}</option>)}
              </Select>
            </Field>
            <Field label="Salary range" htmlFor="app-salary" optional>
              <Input id="app-salary" value={salaryRange} onChange={(e) => setSalaryRange(e.target.value)} />
            </Field>
            <Field label="Date applied" htmlFor="app-applied">
              <Input id="app-applied" type="date" value={dateApplied} onChange={(e) => setDateApplied(e.target.value)} />
            </Field>
            <Field label="Last contact" htmlFor="app-contact">
              <Input id="app-contact" type="date" value={dateLastContact} onChange={(e) => setDateLastContact(e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Location" htmlFor="app-location">
              <Input id="app-location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </Field>
            <Field label="Source" htmlFor="app-source">
              <Input id="app-source" value={source} onChange={(e) => setSource(e.target.value)} />
            </Field>
            <Field label="Resume version" htmlFor="app-resume">
              <Input id="app-resume" value={resumeVersion} onChange={(e) => setResumeVersion(e.target.value)} />
            </Field>
          </div>
          <Field label="Linked job description" htmlFor="app-jd" optional>
            <Select id="app-jd" value={jobDescriptionId} onChange={(e) => setJobDescriptionId(e.target.value)}>
              <option value="">None</option>
              {jds.map((jd) => <option key={jd.id} value={jd.id}>{jd.companyName}: {jd.roleTitle}</option>)}
            </Select>
          </Field>
          <label className="flex items-center gap-2.5 text-[13.5px] text-fg">
            <input type="checkbox" checked={isRemote} onChange={(e) => setIsRemote(e.target.checked)} className="h-4 w-4 accent-[var(--accent-text)]" />
            Remote role
          </label>
          <Field label="Notes" htmlFor="app-notes" optional>
            <Textarea id="app-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-between">
            {selectedApp ? (
              <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setAppToDelete(selectedApp.id)}>Delete</Button>
            ) : <span />}
            <div className="flex gap-2 sm:justify-end">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={isSubmitting} disabled={!companyName.trim() || !roleTitle.trim()}>
                {selectedApp ? 'Save changes' : 'Add application'}
              </Button>
            </div>
          </div>
        </form>
      </Dialog>

      <ConfirmationModal
        isOpen={!!appToDelete}
        title="Delete this application?"
        message="It moves to trash. There is no screen to restore it yet."
        confirmText="Delete"
        onConfirm={executeDelete}
        onCancel={() => setAppToDelete(null)}
        danger
      />
    </PageShell>
  );
}
