import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Check, Download, Monitor, Moon, Pencil, Plus, Sun, Trash2 } from 'lucide-react';
import { PagedResponse, Skill, SKILL_CATEGORIES, SkillProficiency } from '../types';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../components/ui/Toast';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import PageShell from '../components/PageShell';
import { Button, Chip, EmptyState, Field, Input, Select, Skeleton, Textarea } from '../components/ui/kit';
import { useTheme, type ThemePreference } from '../lib/theme';
import { cn } from '../lib/utils';

const PROFICIENCIES: SkillProficiency[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'notifications', label: 'Email digest' },
  { id: 'skills', label: 'Skills' },
  { id: 'capture', label: 'Job capture' },
  { id: 'data', label: 'Your data' },
  { id: 'security', label: 'Sessions' },
  { id: 'testimonial', label: 'Testimonial' },
  { id: 'danger', label: 'Delete account' },
] as const;

function Section({ id, title, description, children, tone }: { id: string; title: string; description?: string; children: React.ReactNode; tone?: 'danger' }) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-line py-8 first:border-t-0 first:pt-0" aria-labelledby={`${id}-title`}>
      <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <h2 id={`${id}-title`} className={cn('text-[15px] font-medium', tone === 'danger' ? 'text-danger' : 'text-fg')}>{title}</h2>
          {description && <p className="mt-1 text-[13px] leading-relaxed text-fg-3">{description}</p>}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

function Toggle({ id, checked, onChange, label, description, testId }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; testId?: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span>
        <span className="block text-[13.5px] font-medium text-fg">{label}</span>
        {description && <span className="mt-0.5 block text-[12.5px] text-fg-3">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" data-testid={testId} />
        <span className="h-5 w-9 rounded-full border border-line-strong bg-surface-3 transition-colors peer-checked:border-transparent peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ring)]" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-fg shadow transition-transform peer-checked:translate-x-4 peer-checked:bg-accent-ink" />
      </span>
    </label>
  );
}

export default function Settings() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, updateProfile, deleteAccount } = useAuth();
  const { preference, setPreference } = useTheme();
  const toast = useToast();

  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', confirmText: '', danger: false, onConfirm: () => {} });

  const [profileFirstName, setProfileFirstName] = useState(user?.firstName || '');
  const [profileLastName, setProfileLastName] = useState(user?.lastName || '');
  const [profileEmailDigest, setProfileEmailDigest] = useState(user?.emailDigestEnabled ?? true);
  const [profileDigestFollowUps, setProfileDigestFollowUps] = useState(user?.digestIncludeFollowUps ?? true);
  const [profileDigestReviews, setProfileDigestReviews] = useState(user?.digestIncludeReviews ?? true);
  const [profileDigestHour, setProfileDigestHour] = useState(user?.digestHourUtc ?? 13);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [isApiReachable, setIsApiReachable] = useState<boolean | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSigningOutEverywhere, setIsSigningOutEverywhere] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [proficiency, setProficiency] = useState<SkillProficiency>('Intermediate');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [testimonyHandle, setTestimonyHandle] = useState('');
  const [testimonyText, setTestimonyText] = useState('');
  const [isPublicConfirmed, setIsPublicConfirmed] = useState(false);
  const [isSubmittingTestimony, setIsSubmittingTestimony] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfileFirstName(user.firstName);
    setProfileLastName(user.lastName);
    setProfileEmailDigest(user.emailDigestEnabled ?? true);
    setProfileDigestFollowUps(user.digestIncludeFollowUps ?? true);
    setProfileDigestReviews(user.digestIncludeReviews ?? true);
    setProfileDigestHour(user.digestHourUtc ?? 13);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const check = () =>
      api
        .get('/api/system/ping', { skipAuth: true })
        .then(() => !cancelled && setIsApiReachable(true))
        .catch(() => !cancelled && setIsApiReachable(false));
    check();
    const interval = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    api
      .get<PagedResponse<Skill>>('/api/skill')
      .then((data) => setSkills(data.items ?? []))
      .catch((err) => console.error('Failed to load skills:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSignOutEverywhere = async () => {
    setIsSigningOutEverywhere(true);
    try {
      await api.post('/api/auth/sign-out-everywhere', {});
      toast.success('Every other device is signed out.');
    } catch {
      toast.error('Could not sign out other devices.');
    } finally {
      setIsSigningOutEverywhere(false);
    }
  };

  const resetSkillForm = () => {
    setEditingId(null);
    setName('');
    setCategory('');
    setProficiency('Intermediate');
    setNotes('');
  };

  const startEditSkill = (skill: Skill) => {
    setEditingId(skill.id);
    setName(skill.name);
    setCategory(skill.category || '');
    setProficiency(skill.proficiencyLevel);
    setNotes(skill.notes || '');
    document.getElementById('skill-name')?.focus();
  };

  const handleSubmitSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const payload = { name: name.trim(), category: category.trim() || undefined, proficiencyLevel: proficiency, notes: notes.trim() || undefined };
      if (editingId) {
        const updated = await api.put<Skill>(`/api/skill/${editingId}`, payload);
        setSkills((prev) => prev.map((s) => (s.id === editingId ? updated : s)).sort((a, b) => a.name.localeCompare(b.name)));
        toast.success('Skill updated.');
      } else {
        const added = await api.post<Skill>('/api/skill', payload);
        setSkills((prev) => [...prev, added].sort((a, b) => a.name.localeCompare(b.name)));
      }
      resetSkillForm();
    } catch (err) {
      console.error('Failed to save skill:', err);
      toast.error((err as Error).message || 'The skill could not be saved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeSkill = (skill: Skill) => {
    setConfirmConfig({
      isOpen: true,
      title: `Delete ${skill.name}?`,
      message: 'It is removed from your skills list and JD Matcher stops counting it.',
      confirmText: 'Delete',
      danger: true,
      onConfirm: async () => {
        setConfirmConfig((p) => ({ ...p, isOpen: false }));
        try {
          await api.delete(`/api/skill/${skill.id}`);
          setSkills((prev) => prev.filter((s) => s.id !== skill.id));
        } catch (err) {
          console.error('Failed to delete skill:', err);
          toast.error((err as Error).message || 'Could not delete the skill.');
        }
      },
    });
  };

  const handleSubmitTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testimonyHandle.trim() || !testimonyText.trim() || !isPublicConfirmed) return;
    setIsSubmittingTestimony(true);
    try {
      await api.post('/api/testimonial', { name: `${user?.firstName} ${user?.lastName}`, handle: testimonyHandle.trim(), text: testimonyText.trim() });
      toast.success('Thanks. It appears on the site after review.');
      setTestimonyHandle('');
      setTestimonyText('');
      setIsPublicConfirmed(false);
    } catch (err) {
      console.error('Failed to submit testimonial:', err);
      toast.error('The testimonial could not be sent.');
    } finally {
      setIsSubmittingTestimony(false);
    }
  };

  const handlePurge = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete your account?',
      message: 'This permanently deletes your account, stories, applications and skills. It cannot be undone.',
      confirmText: 'Delete account',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteAccount();
          localStorage.clear();
          toast.success('Your account and data are deleted.');
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'The account could not be deleted. Try again.');
        }
      },
    });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileFirstName.trim() || !profileLastName.trim()) return;
    setIsUpdatingProfile(true);
    try {
      await updateProfile(profileFirstName, profileLastName, profileEmailDigest, profileDigestFollowUps, profileDigestReviews, profileDigestHour);
      toast.success('Saved.');
    } catch {
      toast.error('Could not save your changes.');
    } finally {
      setIsUpdatingProfile(false);
    }
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
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export:', err);
      toast.error('The export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const themeOptions: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
    { value: 'system', label: 'System', icon: Monitor },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
  ];

  return (
    <PageShell dataTestId="settings-page" title="Settings" subtitle="Your profile, preferences and data." width="wide">
      <div className="grid gap-10 lg:grid-cols-[180px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="hidden lg:block">
          <ul className="sticky top-6 flex flex-col gap-0.5 text-[13.5px]">
            {SECTIONS.filter((s) => !(s.id === 'testimonial' && user?.isDemo)).map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={cn('block rounded-md px-2.5 py-1.5 transition-colors hover:bg-surface-2 hover:text-fg', s.id === 'danger' ? 'text-danger' : 'text-fg-2')}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 max-w-3xl">
          <form onSubmit={handleUpdateProfile}>
            <Section id="profile" title="Profile" description="Shown on your dashboard and in emails.">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="First name" htmlFor="settings-first">
                  <Input id="settings-first" value={profileFirstName} onChange={(e) => setProfileFirstName(e.target.value)} required data-testid="settings-firstname" />
                </Field>
                <Field label="Last name" htmlFor="settings-last">
                  <Input id="settings-last" value={profileLastName} onChange={(e) => setProfileLastName(e.target.value)} required data-testid="settings-lastname" />
                </Field>
              </div>
              <p className="mt-4 text-[13px] text-fg-3">Signed in as <span className="text-fg-2">{user?.email}</span></p>
            </Section>

            <Section id="appearance" title="Appearance" description="System follows your device setting.">
              <div role="radiogroup" aria-label="Theme" className="grid max-w-md grid-cols-3 gap-2">
                {themeOptions.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={preference === value}
                    onClick={() => setPreference(value)}
                    className={cn(
                      'flex flex-col items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                      preference === value ? 'border-fg bg-surface-1' : 'border-line bg-surface-2 hover:border-line-strong'
                    )}
                  >
                    <Icon size={16} className="text-fg-2" />
                    <span className="text-[13.5px] font-medium text-fg">{label}</span>
                  </button>
                ))}
              </div>
            </Section>

            <Section id="notifications" title="Email digest" description="One email a day with what needs attention.">
              {user?.isDemo ? (
                <p className="text-[13.5px] text-fg-3">Demo accounts do not receive email.</p>
              ) : (
                <div className="flex flex-col divide-y divide-line">
                  <Toggle id="digest-enabled" checked={profileEmailDigest} onChange={setProfileEmailDigest} label="Daily digest" description="Follow-ups and reviews due, in one email." testId="pref-digest-enabled" />
                  {profileEmailDigest && (
                    <>
                      <Toggle id="digest-followups" checked={profileDigestFollowUps} onChange={setProfileDigestFollowUps} label="Include application follow-ups" testId="pref-digest-followups" />
                      <Toggle id="digest-reviews" checked={profileDigestReviews} onChange={setProfileDigestReviews} label="Include stories due for review" testId="pref-digest-reviews" />
                      <div className="py-3">
                        <Field label="Send at" htmlFor="digest-hour" help="Time is in UTC.">
                          <Select id="digest-hour" value={profileDigestHour} onChange={(e) => setProfileDigestHour(Number(e.target.value))} className="w-40" data-testid="pref-digest-hour">
                            {Array.from({ length: 24 }).map((_, i) => (
                              <option key={i} value={i}>{String(i).padStart(2, '0')}:00 UTC</option>
                            ))}
                          </Select>
                        </Field>
                      </div>
                    </>
                  )}
                </div>
              )}
              <div className="mt-6">
                <Button type="submit" variant="primary" icon={<Check size={16} />} loading={isUpdatingProfile} data-testid="settings-save-profile">
                  Save profile and email settings
                </Button>
              </div>
            </Section>
          </form>

          <Section id="skills" title="Skills" description="JD Matcher and Readiness compare postings against this list.">
            <form onSubmit={handleSubmitSkill} className="grid gap-4 rounded-xl border border-line bg-surface-1 p-4 sm:grid-cols-[1.4fr_1fr_1fr]">
              <Field label="Skill" htmlFor="skill-name">
                <Input id="skill-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="React" required data-testid="skill-name" />
              </Field>
              <Field label="Category" htmlFor="skill-category">
                <Select id="skill-category" value={category} onChange={(e) => setCategory(e.target.value)} data-testid="skill-category">
                  <option value="">None</option>
                  {SKILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Level" htmlFor="skill-proficiency">
                <Select id="skill-proficiency" value={proficiency} onChange={(e) => setProficiency(e.target.value as SkillProficiency)} data-testid="skill-proficiency">
                  {PROFICIENCIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </Select>
              </Field>
              <Field label="Notes" htmlFor="skill-notes" optional className="sm:col-span-3">
                <Input id="skill-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Hooks, server components, testing library" data-testid="skill-notes" />
              </Field>
              <div className="flex justify-end gap-2 sm:col-span-3">
                {editingId && <Button variant="ghost" onClick={resetSkillForm} disabled={isSubmitting}>Cancel</Button>}
                <Button type="submit" variant="secondary" icon={editingId ? <Check size={16} /> : <Plus size={16} />} loading={isSubmitting} disabled={!name.trim()} data-testid="skill-submit">
                  {editingId ? 'Update skill' : 'Add skill'}
                </Button>
              </div>
            </form>

            <div className="mt-4">
              {isLoading ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-11" />
                  <Skeleton className="h-11" />
                </div>
              ) : skills.length === 0 ? (
                <EmptyState className="px-0" title="No skills yet." description="Add the languages, frameworks and tools you would be comfortable being asked about." />
              ) : (
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {skills.map((skill) => (
                    <li key={skill.id} className="group flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-fg">{skill.name}</p>
                        {skill.notes && <p className="truncate text-[12.5px] text-fg-3">{skill.notes}</p>}
                      </div>
                      {skill.category && <Chip className="hidden sm:inline-flex">{skill.category}</Chip>}
                      <span className="w-24 text-right text-[12.5px] text-fg-2">{skill.proficiencyLevel}</span>
                      <div className="flex gap-0.5 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                        <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => startEditSkill(skill)} aria-label={`Edit ${skill.name}`} />
                        <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => removeSkill(skill)} aria-label={`Delete ${skill.name}`} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Section>

          <Section id="capture" title="Job capture" description="A bookmarklet that saves the posting you are viewing as a draft application.">
            <Button variant="secondary" icon={<Bookmark size={16} />} href="/capture/index.html" data-testid="settings-bookmarklet-link">
              Get the bookmarklet
            </Button>
          </Section>

          <Section id="data" title="Your data" description="Download everything in your account as JSON.">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" icon={<Download size={16} />} loading={isExporting} onClick={handleExportData} data-testid="settings-export-btn">
                Download JSON
              </Button>
              <span className="text-[12.5px] text-fg-3">
                API {isApiReachable === null ? 'checking' : isApiReachable ? 'reachable' : 'not reachable'}
              </span>
            </div>
          </Section>

          <Section id="security" title="Sessions" description="Sign out every other browser and device. This one stays signed in.">
            <Button variant="secondary" loading={isSigningOutEverywhere} onClick={handleSignOutEverywhere}>
              Sign out other devices
            </Button>
          </Section>

          {!user?.isDemo && (
            <Section id="testimonial" title="Testimonial" description="Landed a role with Precept's help? Tell other engineers. Shown on the site after review.">
              <form onSubmit={handleSubmitTestimonial} className="flex flex-col gap-4">
                <Field label="Your new role" htmlFor="testimony-handle">
                  <Input id="testimony-handle" value={testimonyHandle} onChange={(e) => setTestimonyHandle(e.target.value)} placeholder="Backend engineer at a fintech" required data-testid="testimony-handle" />
                </Field>
                <Field label="What helped" htmlFor="testimony-text" help="Keep it to two or three sentences.">
                  <Textarea id="testimony-text" rows={3} value={testimonyText} onChange={(e) => setTestimonyText(e.target.value)} required data-testid="testimony-text" />
                </Field>
                <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-fg-2">
                  <input type="checkbox" checked={isPublicConfirmed} onChange={(e) => setIsPublicConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--accent-text)]" data-testid="testimony-consent" />
                  It is accurate, and Precept may show it on its website with my name.
                </label>
                <div>
                  <Button type="submit" variant="secondary" loading={isSubmittingTestimony} disabled={!isPublicConfirmed || !testimonyHandle || !testimonyText} data-testid="testimony-submit">
                    Send testimonial
                  </Button>
                </div>
              </form>
            </Section>
          )}

          <Section id="danger" title="Delete account" description="Permanently removes your account and everything in it." tone="danger">
            <Button variant="danger" onClick={handlePurge} data-testid="settings-purge-btn">Delete account</Button>
            <p className="mt-6 text-[12.5px] text-fg-3">
              <Link to="/terms" className="underline-offset-4 hover:text-fg-2 hover:underline">Terms of service</Link>
            </p>
          </Section>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        danger={confirmConfig.danger}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((p) => ({ ...p, isOpen: false }))}
      />
    </PageShell>
  );
}
