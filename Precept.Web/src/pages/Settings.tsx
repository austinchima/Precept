import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Skill, SkillProficiency, SKILL_CATEGORIES, PagedResponse } from '../types';
import { getSkillIcon } from '../lib/utils';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../components/ui/Toast';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { AnimatedSection } from '../components/animation/AnimatedSection';
import { Check, Plus, Pencil, X, Loader2, Database, Stethoscope, Download, Radiation, Megaphone, Terminal as TerminalIcon, User2, Bookmark } from 'lucide-react';
import PageShell from '../components/PageShell';

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

const PROF_COLOR: Record<SkillProficiency, string> = {
  Beginner: C.sky, Intermediate: C.amber, Advanced: C.violet, Expert: C.emerald,
};

const SectionHeader = ({ icon, title, sub, color = C.teal }: { icon: React.ReactNode; title: string; sub: string; color?: string }) => (
  <div className="flex items-start gap-3 mb-4">
    <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0" style={{ background: `${color}14`, border: `1px solid ${color}33`, color }}>
      {icon}
    </div>
    <div>
      <h2 className="font-display text-[17px] font-semibold leading-tight" style={{ color: C.ink }}>{title}</h2>
      <p className="font-body text-[12.5px] mt-0.5" style={{ color: C.inkDim }}>{sub}</p>
    </div>
  </div>
);

export default function Settings() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, updateProfile, deleteAccount } = useAuth();
  const toast = useToast();

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false, title: '', message: '', confirmText: '', danger: false, onConfirm: () => {},
  });

  const [profileFirstName, setProfileFirstName] = useState(user?.firstName || '');
  const [profileLastName, setProfileLastName] = useState(user?.lastName || '');
  const [profileEmailDigest, setProfileEmailDigest] = useState(user?.emailDigestEnabled ?? true);
  const [profileDigestFollowUps, setProfileDigestFollowUps] = useState(user?.digestIncludeFollowUps ?? true);
  const [profileDigestReviews, setProfileDigestReviews] = useState(user?.digestIncludeReviews ?? true);
  const [profileDigestHour, setProfileDigestHour] = useState(user?.digestHourUtc ?? 13);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [isSystemOnline, setIsSystemOnline] = useState<boolean | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [proficiency, setProficiency] = useState<SkillProficiency>('Intermediate');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const skillFormRef = useRef<HTMLDivElement>(null);

  const [testimonyHandle, setTestimonyHandle] = useState('');
  const [testimonyText, setTestimonyText] = useState('');
  const [isPublicConfirmed, setIsPublicConfirmed] = useState(false);
  const [isSubmittingTestimony, setIsSubmittingTestimony] = useState(false);

  useEffect(() => {
    if (user) { 
      setProfileFirstName(user.firstName); 
      setProfileLastName(user.lastName); 
      setProfileEmailDigest(user.emailDigestEnabled ?? true);
      setProfileDigestFollowUps(user.digestIncludeFollowUps ?? true);
      setProfileDigestReviews(user.digestIncludeReviews ?? true);
      setProfileDigestHour(user.digestHourUtc ?? 13);
    }
  }, [user]);

  useEffect(() => {
    async function checkSystemHealth() {
      setIsCheckingStatus(true);
      try {
        await api.get('/api/system/ping', { skipAuth: true });
        setIsSystemOnline(true);
      } catch {
        setIsSystemOnline(false);
      } finally {
        setIsCheckingStatus(false);
      }
    }
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const data = await api.get<any[]>('/api/auth/sessions');
      setSessions(data);
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    async function loadSkills() {
      try {
        const data = await api.get<PagedResponse<Skill>>('/api/skill');
        setSkills(data.items ?? []);
      }
      catch (err) { console.error('Failed to load skills:', err); }
      finally { setIsLoading(false); }
    }
    loadSkills();
    loadSessions();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.delete(`/api/auth/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success('Session revoked.');
    } catch (err) {
      toast.error('Failed to revoke session.');
    }
  };

  const resetSkillForm = () => {
    setEditingId(null); setName(''); setCategory(''); setProficiency('Intermediate'); setNotes('');
  };
  const startEditSkill = (skill: Skill) => {
    setEditingId(skill.id); setName(skill.name); setCategory(skill.category || '');
    setProficiency(skill.proficiencyLevel); setNotes(skill.notes || '');
    skillFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const handleSubmitSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        category: category.trim() || undefined,
        proficiencyLevel: proficiency,
        notes: notes.trim() || undefined,
      };
      if (editingId) {
        const updated = await api.put<Skill>(`/api/skill/${editingId}`, payload);
        setSkills((prev) => prev.map((s) => (s.id === editingId ? updated : s)).sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        const added = await api.post<Skill>('/api/skill', payload);
        setSkills((prev) => [...prev, added].sort((a, b) => a.name.localeCompare(b.name)));
      }
      resetSkillForm();
    } catch (err) {
      console.error('Failed to save skill:', err);
      toast.error((err as Error).message || 'Failed to save skill.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testimonyHandle.trim() || !testimonyText.trim() || !isPublicConfirmed) return;
    setIsSubmittingTestimony(true);
    try {
      await api.post('/api/testimonial', {
        name: `${user?.firstName} ${user?.lastName}`,
        handle: testimonyHandle.trim(),
        text: testimonyText.trim(),
      });
      toast.success('Story published! Thanks for sharing.');
      setTestimonyHandle(''); setTestimonyText(''); setIsPublicConfirmed(false);
    } catch (err) {
      console.error('Failed to submit testimonial:', err);
      toast.error('Failed to publish story.');
    } finally {
      setIsSubmittingTestimony(false);
    }
  };

  const removeSkill = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete skill',
      message: 'Are you sure? This affects your JD Matcher scores.',
      confirmText: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/skill/${id}`);
          setSkills((prev) => prev.filter((s) => s.id !== id));
          setConfirmConfig((p) => ({ ...p, isOpen: false }));
        } catch (err) {
          console.error('Failed to delete skill:', err);
          toast.error((err as Error).message || 'Failed to remove skill.');
          setConfirmConfig((p) => ({ ...p, isOpen: false }));
        }
      },
    });
  };

  const handlePurge = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete account',
      message: 'This permanently deletes your account and all your data. This cannot be undone. Continue?',
      confirmText: 'Delete account',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteAccount();
          localStorage.clear();
          toast.success('Your account and all data have been permanently deleted.');
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to delete account. Please try again.');
        }
      },
    });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileFirstName.trim() || !profileLastName.trim()) return;
    setIsUpdatingProfile(true);
    try { await updateProfile(profileFirstName, profileLastName, profileEmailDigest, profileDigestFollowUps, profileDigestReviews, profileDigestHour); toast.success('Profile updated.'); }
    catch { toast.error('Failed to update profile.'); }
    finally { setIsUpdatingProfile(false); }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await api.get('/api/dashboard/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `precept-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export:', err);
      toast.error('Export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const proficiencyPct: Record<SkillProficiency, number> = { Beginner: 30, Intermediate: 60, Advanced: 80, Expert: 95 };

  return (
    <PageShell
      dataTestId="settings-page"
      badge="Configuration"
      badgeColor={C.violet}
      title={
        <>
          System <span className="font-editorial" style={{ color: C.violet, fontWeight: 400 }}>configuration.</span>
        </>
      }
      subtitle="Profile, capabilities, diagnostics, exports."
    >
      <AnimatedSection animation="staggerFadeUp" stagger={0.12} childSelector="> div" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile */}
          <section className="opacity-0 animate-fade-in-up delay-100 p-6" style={cardStyle()}>
            <SectionHeader icon={<User2 size={16} />} title="Operator details" sub="Update your name and preferences." color={C.teal} />
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="First name">
                  <input title="First Name" type="text" value={profileFirstName} onChange={(e) => setProfileFirstName(e.target.value)} style={inputStyle} required data-testid="settings-firstname" />
                </Field>
                <Field label="Last name">
                  <input title="Last Name" type="text" value={profileLastName} onChange={(e) => setProfileLastName(e.target.value)} style={inputStyle} required data-testid="settings-lastname" />
                </Field>
              </div>

              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="emailDigestEnabled" 
                  checked={profileEmailDigest} 
                  onChange={(e) => setProfileEmailDigest(e.target.checked)} 
                  style={{ accentColor: C.teal, width: 16, height: 16 }} 
                  data-testid="pref-digest-enabled"
                />
                <div>
                  <label htmlFor="emailDigestEnabled" className="font-display text-[14px] font-medium block" style={{ color: C.ink }}>
                    Daily Digest Email
                  </label>
                  <p className="font-body text-[12px] mt-0.5" style={{ color: C.inkDim }}>
                    Receive a unified daily email for follow-ups and reviews.
                  </p>
                </div>
              </div>

              {profileEmailDigest && (
                <div className="ml-8 space-y-4 pt-2" style={{ borderLeft: `1px solid ${C.hair}`, paddingLeft: 16 }}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="digestIncludeFollowUps" 
                      checked={profileDigestFollowUps} 
                      onChange={(e) => setProfileDigestFollowUps(e.target.checked)} 
                      style={{ accentColor: C.teal, width: 14, height: 14 }} 
                      data-testid="pref-digest-followups"
                    />
                    <label htmlFor="digestIncludeFollowUps" className="font-body text-[13px]" style={{ color: C.inkDim }}>
                      Include application follow-ups
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="digestIncludeReviews" 
                      checked={profileDigestReviews} 
                      onChange={(e) => setProfileDigestReviews(e.target.checked)} 
                      style={{ accentColor: C.teal, width: 14, height: 14 }} 
                      data-testid="pref-digest-reviews"
                    />
                    <label htmlFor="digestIncludeReviews" className="font-body text-[13px]" style={{ color: C.inkDim }}>
                      Include spaced-repetition reviews
                    </label>
                  </div>
                  <div className="pt-2">
                    <Field label="Delivery Hour (UTC)">
                      <select 
                        title="Digest Hour UTC" 
                        value={profileDigestHour} 
                        onChange={(e) => setProfileDigestHour(Number(e.target.value))} 
                        style={{ ...inputStyle, width: 'auto', minWidth: 120 }} 
                        data-testid="pref-digest-hour"
                      >
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option key={i} value={i} style={{ background: C.bg1 }}>
                            {i.toString().padStart(2, '0')}:00 UTC
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>
              )}

              <button type="submit" disabled={isUpdatingProfile} data-testid="settings-save-profile"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] cursor-pointer disabled:opacity-60"
                style={{ background: C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${C.ink}` }}>
                {isUpdatingProfile ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                {isUpdatingProfile ? 'Updating…' : 'Save changes'}
              </button>
            </form>
          </section>

          {/* Active Sessions */}
          <section className="opacity-0 animate-fade-in-up delay-150 p-6" style={cardStyle()}>
            <SectionHeader icon={<Database size={16} />} title="Active Sessions & Devices" sub="Manage signed-in devices." color={C.sky} />
            {isLoadingSessions ? (
              <div className="flex items-center gap-2 font-mono text-xs text-brand-primary/60 py-2">
                <Loader2 size={14} className="animate-spin" /> Loading sessions…
              </div>
            ) : sessions.length === 0 ? (
              <p className="font-mono text-xs" style={{ color: C.inkMute }}>No active sessions found.</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.hair}` }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold" style={{ color: C.ink }}>{s.deviceInfo || 'Unknown Device'}</span>
                        {s.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-wider font-bold" style={{ background: `${C.emerald}20`, color: C.emerald }}>
                            Current Session
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[11px] mt-0.5" style={{ color: C.inkDim }}>
                        Signed in: {new Date(s.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {!s.isCurrent && (
                      <button onClick={() => handleRevokeSession(s.id)} className="px-3 py-1.5 rounded-lg font-mono text-xs text-rose-400 hover:bg-rose-500/10 transition-colors">
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Skills */}
          <section className="space-y-4 opacity-0 animate-fade-in-up delay-200">
            <div className="p-6" style={cardStyle()} ref={skillFormRef}>
              <SectionHeader icon={<TerminalIcon size={16} />} title="Capabilities" sub="These keywords feed your JD match scores." color={C.violet} />
              <form onSubmit={handleSubmitSkill} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Name">
                    <input title="Skill Name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. React, Docker" style={inputStyle} required data-testid="skill-name" />
                  </Field>
                  <Field label="Category">
                    <select title="Skill Category" value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle} data-testid="skill-category">
                      <option value="" style={{ background: C.bg1 }}>— Select category —</option>
                      {SKILL_CATEGORIES.map((c) => <option key={c} value={c} style={{ background: C.bg1 }}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Proficiency">
                    <select title="Skill Proficiency" value={proficiency} onChange={(e) => setProficiency(e.target.value as SkillProficiency)} style={inputStyle} data-testid="skill-proficiency">
                      {(['Beginner', 'Intermediate', 'Advanced', 'Expert'] as SkillProficiency[]).map((p) => (
                        <option key={p} value={p} style={{ background: C.bg1 }}>{p}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Notes · optional">
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Hooks, Context API, Redux, Next.js" style={inputStyle} data-testid="skill-notes" />
                </Field>
                <div className="flex justify-end gap-3 pt-1">
                  {editingId && (
                    <button type="button" onClick={resetSkillForm} disabled={isSubmitting}
                      className="rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] cursor-pointer"
                      style={{ background: 'transparent', color: C.inkDim, border: `1px solid ${C.hair2}` }}>
                      Cancel
                    </button>
                  )}
                  <button type="submit" disabled={isSubmitting || !name.trim()} data-testid="skill-submit"
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] cursor-pointer disabled:opacity-60"
                    style={{ background: C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${C.ink}` }}>
                    {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : (editingId ? <Check size={12} /> : <Plus size={12} />)}
                    {editingId ? 'Update skill' : 'Add skill'}
                  </button>
                </div>
              </form>
            </div>

            <div className="p-6" style={cardStyle()}>
              <h3 className="font-mono text-[10.5px] uppercase tracking-[0.18em] mb-4" style={{ color: C.inkMute }}>Current inventory</h3>
              {isLoading ? (
                <div className="flex items-center gap-2 py-6 justify-center font-mono text-sm" style={{ color: C.inkDim }}>
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: C.teal }} /> Scanning…
                </div>
              ) : (
                <AnimatedSection animation="staggerFadeUp" stagger={0.04} childSelector="> div" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {skills.map((skill) => {
                    const ic = getSkillIcon(skill.name);
                    const profColor = PROF_COLOR[skill.proficiencyLevel];
                    return (
                      <div key={skill.id} className="p-4 group transition-all duration-300 relative" style={{ background: C.bg2, border: `1px solid ${C.hair}`, borderRadius: 12 }}>
                        <div className="absolute top-1 right-1 flex opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEditSkill(skill)} title="Edit" className="w-8 h-8 grid place-items-center cursor-pointer" style={{ color: C.inkDim }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = C.teal)}
                            onMouseLeave={(e) => (e.currentTarget.style.color = C.inkDim)}><Pencil size={12} /></button>
                          <button onClick={() => removeSkill(skill.id)} title="Delete" className="w-8 h-8 grid place-items-center cursor-pointer" style={{ color: C.inkDim }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = C.rose)}
                            onMouseLeave={(e) => (e.currentTarget.style.color = C.inkDim)}><X size={12} /></button>
                        </div>
                        <h4 className="font-display font-semibold text-[13.5px] pr-16 flex items-center gap-2" style={{ color: C.ink }}>
                          <i className={ic.icon} style={{ color: ic.color, fontSize: 13 }} />
                          {skill.name}
                        </h4>
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[9.5px] uppercase tracking-widest"
                            style={{ background: `${profColor}1c`, color: profColor, border: `1px solid ${profColor}44` }}>
                            {skill.proficiencyLevel}
                          </span>
                          {skill.category && (
                            <span className="px-2 py-0.5 rounded-full font-mono text-[9.5px] uppercase tracking-widest"
                              style={{ background: C.bg1, color: C.inkDim, border: `1px solid ${C.hair}` }}>
                              {skill.category}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 h-1 overflow-hidden rounded-full" style={{ background: C.hair }}>
                          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${proficiencyPct[skill.proficiencyLevel]}%`, background: profColor }} />
                        </div>
                        {skill.notes && (
                          <p className="font-body text-[11.5px] mt-2.5 line-clamp-2 leading-relaxed" style={{ color: C.inkDim }} title={skill.notes}>{skill.notes}</p>
                        )}
                      </div>
                    );
                  })}
                  {skills.length === 0 && (
                    <div className="col-span-full py-10 text-center font-mono text-[12.5px] rounded-xl flex flex-col items-center gap-2"
                      style={{ color: C.inkMute, border: `1px dashed ${C.hair2}`, background: C.bg2 }}>
                      <Database size={20} className="opacity-50" />
                      Inventory empty. Add skills above to compute match scores.
                    </div>
                  )}
                </AnimatedSection>
              )}
            </div>
          </section>

          {/* Testimonial */}
          <section className="opacity-0 animate-fade-in-up delay-200 p-6" style={cardStyle()}>
            <SectionHeader icon={<Megaphone size={16} />} title="Share your success story" sub="Land a role? Tell other engineers." color={C.amber} />
            <form onSubmit={handleSubmitTestimonial} className="space-y-4">
              <Field label="New role · handle">
                <input type="text" value={testimonyHandle} onChange={(e) => setTestimonyHandle(e.target.value)} placeholder="Software Engineer @ Google" style={inputStyle} required data-testid="testimony-handle" />
              </Field>
              <Field label="The story">
                <textarea value={testimonyText} onChange={(e) => setTestimonyText(e.target.value)} rows={3}
                  placeholder="Precept helped me organize prep and land in 3 weeks."
                  style={{ ...inputStyle, fontFamily: 'Geist, Inter, sans-serif', resize: 'vertical' }} required data-testid="testimony-text" />
              </Field>
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl" style={{ background: `${C.amber}10`, border: `1px solid ${C.amber}33` }}>
                <input type="checkbox" checked={isPublicConfirmed} onChange={(e) => setIsPublicConfirmed(e.target.checked)} className="mt-0.5" style={{ accentColor: C.amber }} data-testid="testimony-consent" />
                <span className="font-body text-[12.5px] leading-relaxed" style={{ color: C.inkDim }}>
                  <strong className="font-semibold" style={{ color: C.amber }}>Public display consent:</strong> I confirm this is accurate and grant permission for it to appear on the Precept landing page with my name.
                </span>
              </label>
              <button type="submit" disabled={isSubmittingTestimony || !isPublicConfirmed || !testimonyHandle || !testimonyText} data-testid="testimony-submit"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] cursor-pointer disabled:opacity-60"
                style={{ background: C.amber, color: C.bg0, boxShadow: `0 0 0 1px ${C.amber}` }}>
                {isSubmittingTestimony ? <Loader2 size={12} className="animate-spin" /> : <Megaphone size={12} />}
                {isSubmittingTestimony ? 'Publishing…' : 'Publish'}
              </button>
            </form>
          </section>
        </div>

        {/* RIGHT */}
        <div className="space-y-6 opacity-0 animate-fade-in-up delay-300">
          {/* Diagnostics */}
          <section className="p-6" style={cardStyle()}>
            <SectionHeader icon={<Stethoscope size={16} />} title="Diagnostics" sub="System health probe." color={C.sky} />
            <div className="font-mono text-sm space-y-3">
              <div className="flex justify-between items-center pb-3" style={{ borderBottom: `1px solid ${C.hair}` }}>
                <span style={{ color: C.inkDim }}>System status</span>
                {isCheckingStatus ? (
                  <span className="flex items-center gap-2" style={{ color: C.inkDim }}><Loader2 size={11} className="animate-spin" /> Checking…</span>
                ) : isSystemOnline ? (
                  <span className="flex items-center gap-1.5" style={{ color: C.emerald }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.emerald, boxShadow: `0 0 6px ${C.emerald}` }} /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5" style={{ color: C.rose }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.rose }} /> Offline
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: C.inkDim }}>Database</span>
                <span style={{ color: isSystemOnline ? C.ink : C.rose }}>{isSystemOnline ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
          </section>

          {/* Data export */}
          <section className="p-6" style={cardStyle()}>
            <SectionHeader icon={<Download size={16} />} title="Data export" sub="Your data as raw JSON. Anytime." color={C.teal} />
            <button onClick={handleExportData} disabled={isExporting} data-testid="settings-export-btn"
              className="w-full inline-flex items-center justify-center gap-2 rounded-full py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] cursor-pointer disabled:opacity-60"
              style={{ background: 'rgba(255,255,255,0.025)', color: C.ink, border: `1px solid ${C.hair2}` }}>
              {isExporting ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
              {isExporting ? 'Exporting…' : 'Download JSON'}
            </button>
          </section>

          {/* Job capture bookmarklet */}
          <section className="p-6" style={cardStyle()}>
            <SectionHeader icon={<Bookmark size={16} />} title="Job capture" sub="One-click bookmarklet for job postings." color={C.amber} />
            <p className="font-body text-[12px] leading-relaxed mb-4" style={{ color: C.inkDim }}>
              Drag the bookmarklet to your browser bar. Click it on any job posting to save a draft application.
            </p>
            <a
              href="/capture/index.html"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="settings-bookmarklet-link"
              className="w-full inline-flex items-center justify-center gap-2 rounded-full py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.025)', color: C.ink, border: `1px solid ${C.hair2}` }}
            >
              <Bookmark size={11} /> Get bookmarklet
            </a>
          </section>

          {/* Danger */}
          <section className="p-6" style={{ ...cardStyle(), borderColor: `${C.rose}33` }}>
            <SectionHeader icon={<Radiation size={16} />} title="Danger zone" sub="Permanently delete your account and all data." color={C.rose} />
            <button onClick={handlePurge} data-testid="settings-purge-btn"
              className="w-full rounded-full py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] cursor-pointer transition-colors"
              style={{ background: 'transparent', color: C.rose, border: `1px solid ${C.rose}55` }}>
              Delete account
            </button>
          </section>

          {/* Footer links */}
          <section className="pt-4 pb-8 flex justify-center">
            <Link to="/terms" className="font-mono text-[11px] uppercase tracking-widest hover:underline underline-offset-4" style={{ color: C.inkMute }}>
              Terms of Service
            </Link>
          </section>
        </div>
      </AnimatedSection>

      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText="Cancel"
        danger={confirmConfig.danger}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((p) => ({ ...p, isOpen: false }))}
      />
    </PageShell>
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
