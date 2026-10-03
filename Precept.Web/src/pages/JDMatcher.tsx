import { useEffect, useState } from 'react';
import { Link2, Plus, ScanText, Trash2 } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../components/ui/Toast';
import { JobDescription, PagedResponse } from '../types';
import PageShell from '../components/PageShell';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { Button, Chip, EmptyState, Field, Input, Panel, PanelHeader, Reveal, Skeleton, Textarea } from '../components/ui/kit';
import { cn } from '../lib/utils';

function ScoreRing({ score }: { score: number }) {
  const r = 46;
  const circumference = 2 * Math.PI * r;
  const tone = score >= 70 ? 'var(--accent-text)' : score >= 40 ? 'var(--warning)' : 'var(--danger)';
  return (
    <svg viewBox="0 0 112 112" className="h-28 w-28 -rotate-90" aria-hidden="true">
      <circle cx="56" cy="56" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="8" />
      <circle
        cx="56"
        cy="56"
        r={r}
        fill="none"
        stroke={tone}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - (circumference * score) / 100}
        style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1)' }}
      />
    </svg>
  );
}

export default function JDMatcher() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [results, setResults] = useState<JobDescription | null>(null);
  const [savedJDs, setSavedJDs] = useState<JobDescription[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<JobDescription | null>(null);
  const toast = useToast();

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [url, setUrl] = useState('');
  const [jdText, setJdText] = useState('');

  const loadSavedJDs = async () => {
    try {
      const data = await api.get<PagedResponse<JobDescription>>('/api/jobdescription');
      setSavedJDs(data.items ?? []);
    } catch (err) {
      console.error('Failed to load saved JDs:', err);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadSavedJDs();
  }, []);

  const handleSelectJD = (jd: JobDescription) => {
    setResults(jd);
    setCompany(jd.companyName);
    setRole(jd.roleTitle);
    setUrl(jd.url);
    setJdText(jd.description);
  };

  const handleDeleteJD = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    try {
      await api.delete(`/api/jobdescription/${id}`);
      setSavedJDs((prev) => prev.filter((jd) => jd.id !== id));
      if (results?.id === id) {
        setResults(null);
        setCompany('');
        setRole('');
        setUrl('');
        setJdText('');
      }
      toast.success('Job description deleted.');
    } catch (err) {
      console.error('Failed to delete JD:', err);
      toast.error((err as Error).message || 'Could not delete it.');
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setResults(null);
    try {
      const res = await api.post<JobDescription>('/api/jobdescription', {
        companyName: company,
        roleTitle: role,
        description: jdText,
        url,
        location: 'Remote',
        isRemote: true,
        source: 'JD Matcher UI',
      });
      setResults(res);
      await loadSavedJDs();
    } catch (err) {
      console.error('Extraction failed:', err);
      toast.error((err as Error).message || 'The analysis failed. Try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddToApplications = async () => {
    if (!results) return;
    setIsAdding(true);
    try {
      const today = new Date().toISOString();
      const fu = new Date();
      fu.setDate(fu.getDate() + 7);
      await api.post('/api/application', {
        companyName: results.companyName,
        roleTitle: results.roleTitle,
        location: 'Remote',
        status: 'Applied',
        dateApplied: today,
        dateLastContact: today,
        followUpDate: fu.toISOString(),
        resumeVersion: 'v1',
        notes: `Linked to JD. Keyword match: ${results.yourMatchScore}%.`,
        isRemote: true,
        source: 'JD Matcher UI',
        jobDescriptionId: results.id,
      });
      toast.success(`${results.companyName} added to your applications.`);
    } catch (err) {
      console.error('Failed to create app from JD:', err);
      toast.error((err as Error).message || 'Could not add the application.');
    } finally {
      setIsAdding(false);
    }
  };

  const wordCount = jdText.split(/\s+/).filter(Boolean).length;
  const matched = results ? results.extractedKeyWords.filter((kw) => !results.missingKeyWords.some((m) => m.toLowerCase() === kw.toLowerCase())) : [];
  const score = results?.yourMatchScore ?? 0;

  return (
    <PageShell
      dataTestId="jd-matcher-page"
      title="JD Matcher"
      subtitle="Paste a job description. Precept finds the skills it names and checks them against your skills list."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Reveal>
          <Panel className="p-5">
            <form
              className="flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                handleAnalyze();
              }}
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Company" htmlFor="jd-company">
                  <Input id="jd-company" value={company} onChange={(e) => setCompany(e.target.value)} data-testid="jd-company" />
                </Field>
                <Field label="Role" htmlFor="jd-role">
                  <Input id="jd-role" value={role} onChange={(e) => setRole(e.target.value)} data-testid="jd-role" />
                </Field>
              </div>
              <Field label="Posting URL" htmlFor="jd-url" optional>
                <div className="relative">
                  <Link2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
                  <Input id="jd-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className="pl-9" data-testid="jd-url" />
                </div>
              </Field>
              <Field label="Job description" htmlFor="jd-text" help={<span className="num">{wordCount} words</span>}>
                <Textarea id="jd-text" rows={12} value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="Paste the full posting." data-testid="jd-text" />
              </Field>
              <Button type="submit" variant="primary" size="lg" icon={<ScanText size={16} />} loading={isAnalyzing} disabled={!jdText.trim()} data-testid="jd-analyze-btn">
                {isAnalyzing ? 'Analyzing' : 'Analyze'}
              </Button>
            </form>
          </Panel>
        </Reveal>

        <Reveal delay={0.06}>
          <Panel className="flex h-full flex-col" aria-live="polite">
            {isAnalyzing ? (
              <div className="flex flex-col gap-4 p-5">
                <Skeleton className="h-28 w-28 rounded-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-20" />
              </div>
            ) : !results ? (
              <EmptyState
                className="my-auto"
                icon={<ScanText size={18} />}
                title="Results appear here."
                description="You will see which skills the posting names, which are on your list and which are missing."
              />
            ) : (
              <>
                <div className="flex items-center gap-5 border-b border-line p-5">
                  <div className="relative">
                    <ScoreRing score={score} />
                    <span className="num absolute inset-0 grid place-items-center text-[26px] font-semibold tracking-tight text-fg">{score}%</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium text-fg">{results.companyName || 'Untitled posting'}</p>
                    <p className="truncate text-[13px] text-fg-3">{results.roleTitle}</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-fg-2">
                      <span className="num font-medium text-fg">{matched.length}</span> of <span className="num font-medium text-fg">{results.extractedKeyWords.length}</span> skills it names are on your list.
                    </p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-5 p-5">
                  <div>
                    <h3 className="text-[13px] font-medium text-fg">On your list</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {matched.length ? matched.map((kw) => <Chip key={kw} tone="accent">{kw}</Chip>) : <span className="text-[13px] text-fg-3">None yet.</span>}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[13px] font-medium text-fg">Missing from your list</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {results.missingKeyWords.length ? results.missingKeyWords.map((kw) => <Chip key={kw}>{kw}</Chip>) : <span className="text-[13px] text-fg-3">Nothing missing.</span>}
                    </div>
                    <p className="field-help">Missing can mean you lack the skill, or that it is not in your skills list yet. Add skills in Settings.</p>
                  </div>
                  <Button variant="secondary" className="mt-auto" icon={<Plus size={16} />} loading={isAdding} onClick={handleAddToApplications} data-testid="jd-add-app-btn">
                    Add to applications
                  </Button>
                </div>
              </>
            )}
          </Panel>
        </Reveal>
      </div>

      <Reveal delay={0.1}>
        <Panel>
          <PanelHeader title="Saved analyses" description={`${savedJDs.length} saved`} />
          {isLoadingList ? (
            <div className="flex flex-col gap-2 p-5">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : savedJDs.length === 0 ? (
            <EmptyState title="Nothing saved yet." description="Every analysis is saved here so you can reopen it." />
          ) : (
            <ul className="mt-3 divide-y divide-line border-t border-line">
              {savedJDs.map((jd) => {
                const selected = results?.id === jd.id;
                return (
                  <li key={jd.id} className={cn('group flex items-center gap-3 pr-3', selected && 'bg-surface-2')}>
                    <button type="button" onClick={() => handleSelectJD(jd)} className="flex min-w-0 flex-1 items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-surface-2/60">
                      <span className="num w-12 shrink-0 text-[15px] font-semibold text-fg">{jd.yourMatchScore ?? 0}%</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-fg">{jd.companyName || 'Untitled posting'}</span>
                        <span className="block truncate text-[12.5px] text-fg-3">{jd.roleTitle}</span>
                      </span>
                      <span className="hidden shrink-0 text-[12.5px] text-fg-3 sm:block">{jd.missingKeyWords.length} missing</span>
                    </button>
                    <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => setPendingDelete(jd)} aria-label={`Delete ${jd.companyName}`} />
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </Reveal>

      <ConfirmationModal
        isOpen={!!pendingDelete}
        title="Delete this analysis?"
        message={`The saved job description for ${pendingDelete?.companyName || 'this posting'} will be removed.`}
        confirmText="Delete"
        onConfirm={handleDeleteJD}
        onCancel={() => setPendingDelete(null)}
        danger
      />
    </PageShell>
  );
}
