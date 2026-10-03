import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Code2, Layers, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { ConfidenceLevel, PagedResponse, Story, StoryCategory } from '../types';
import { api } from '../api';
import { STORY_TEMPLATES, type StoryTemplate } from '../data/storyTemplates';
import { BehavioralStoryTab } from '../components/stories/BehavioralStoryTab';
import { TemplateList } from '../components/stories/TemplateList';
import { useToast } from '../components/ui/Toast';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import PageShell from '../components/PageShell';
import { Button, Dialog, EmptyState, Field, Input, Panel, Segmented, Select, Skeleton, Textarea } from '../components/ui/kit';
import { ConfidenceMeter, ConfidencePicker, nextReviewLabel } from '../components/domain';
import { formatCategoryName } from '../lib/skills';
import { cn } from '../lib/utils';

const CATEGORIES: StoryCategory[] = ['Auth', 'Database', 'Ai', 'ML', 'DevOps', 'Frontend', 'Backend', 'SystemDesign', 'Security', 'Testing', 'Cloud', 'Architecture'];
const MIN_EXPLANATION = 50;

function TechStoryCard({ story, onEdit, onDelete }: { story: Story; onEdit: () => void; onDelete: () => void }) {
  return (
    <article className="panel group flex flex-col transition-colors hover:border-line-strong" data-testid="story-card">
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center gap-2 text-[12.5px] text-fg-3">
          <span className="chip">{formatCategoryName(story.category)}</span>
          {story.sourceProject && <span className="truncate">{story.sourceProject}</span>}
        </div>
        <h3 className="text-[15.5px] font-semibold leading-snug tracking-tight text-fg">{story.title}</h3>
        <p className="mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-fg-2">{story.explanation}</p>
        {story.codeSnippet && (
          <pre className="mt-4 max-h-28 overflow-hidden rounded-lg border border-line bg-bg p-3 font-mono text-[11.5px] leading-relaxed text-fg-2 [mask-image:linear-gradient(to_bottom,black_60%,transparent)]">
            <code>{story.codeSnippet}</code>
          </pre>
        )}
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <ConfidenceMeter level={story.confidenceLevel} />
          <span className="truncate text-[12px] text-fg-3">{nextReviewLabel(story.nextReviewAt)}</span>
        </div>
        <div className="flex items-center gap-0.5 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
          <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={onEdit} aria-label={`Edit ${story.title}`} />
          <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={onDelete} aria-label={`Delete ${story.title}`} />
        </div>
      </footer>
    </article>
  );
}

export default function StoryBank() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'technical' | 'behavioral'>('technical');
  const [stories, setStories] = useState<Story[]>([]);
  const [filter, setFilter] = useState<'All' | StoryCategory>('All');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null);
  const [behavioralCreateTrigger, setBehavioralCreateTrigger] = useState(0);
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<StoryCategory>('Backend');
  const [sourceProject, setSourceProject] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [explanation, setExplanation] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState<ConfidenceLevel>('Okay');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadStories = async (cat: 'All' | StoryCategory) => {
    setIsLoading(true);
    try {
      const url = cat === 'All' ? '/api/story' : `/api/story?category=${cat}`;
      const data = await api.get<PagedResponse<Story>>(url);
      setStories(data.items ?? []);
    } catch (err) {
      console.error('Failed to load stories:', err);
      toast.error('Could not load stories.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStories(filter);
  }, [filter]);

  // The dashboard's "New story" button arrives with this flag.
  useEffect(() => {
    if ((location.state as { openNewForm?: boolean } | null)?.openNewForm) {
      handleOpenCreateModal();
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state]);

  const handleOpenCreateModal = (template?: StoryTemplate) => {
    setEditingStory(null);
    setTitle(template?.title ?? '');
    setCategory(template?.category ?? 'Backend');
    setSourceProject(template?.sourceProject ?? '');
    setCodeSnippet(template?.codeSnippet ?? '');
    setExplanation(template?.explanation ?? '');
    setConfidenceLevel(template?.confidenceLevel ?? 'Okay');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (story: Story) => {
    setEditingStory(story);
    setTitle(story.title);
    setCategory(story.category);
    setSourceProject(story.sourceProject);
    setCodeSnippet(story.codeSnippet);
    setExplanation(story.explanation);
    setConfidenceLevel(story.confidenceLevel);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (explanation.length < MIN_EXPLANATION) {
      setFormError(`The explanation needs at least ${MIN_EXPLANATION} characters.`);
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = { title, category, sourceProject, codeSnippet, explanation, confidenceLevel };
      if (editingStory) {
        const updated = await api.put<Story>(`/api/story/${editingStory.id}`, { ...payload, id: editingStory.id });
        setStories((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast.success('Story updated.');
      } else {
        const created = await api.post<Story>('/api/story', payload);
        setStories((prev) => [created, ...prev]);
        toast.success('Story saved.');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setFormError((err as Error).message || 'The story could not be saved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDelete = async () => {
    if (!storyToDelete) return;
    const targetId = storyToDelete;
    setStoryToDelete(null);
    try {
      await api.delete(`/api/story/${targetId}`);
      setStories((prev) => prev.filter((s) => s.id !== targetId));
      toast.success('Story moved to trash.');
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || 'Could not delete the story.');
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stories;
    return stories.filter((s) => [s.title, s.explanation, s.sourceProject, s.codeSnippet].some((v) => v?.toLowerCase().includes(q)));
  }, [stories, query]);

  const canSubmit = !!title.trim() && !!codeSnippet.trim() && explanation.length >= MIN_EXPLANATION;

  return (
    <PageShell
      dataTestId="story-bank-page"
      title="STAR Bank"
      subtitle="Your technical stories and behavioral answers, scheduled for review so you can recall them under pressure."
      actions={
        <>
          <Button variant="secondary" icon={<Layers size={16} />} to="/story-bank/quiz">Drill due stories</Button>
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            data-testid="storybank-new-btn"
            onClick={() => (activeTab === 'technical' ? handleOpenCreateModal() : setBehavioralCreateTrigger((n) => n + 1))}
          >
            {activeTab === 'technical' ? 'New story' : 'New STAR story'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Segmented
          ariaLabel="Story type"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'technical', label: 'Technical', testId: 'storybank-tab-technical' },
            { value: 'behavioral', label: 'Behavioral (STAR)', testId: 'storybank-tab-behavioral' },
          ]}
        />
        <label className="relative block w-full md:w-72">
          <span className="sr-only">Search stories</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stories" className="pl-9" />
        </label>
      </div>

      {activeTab === 'technical' ? (
        <>
          <div className="-mx-4 flex snap-x gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Filter by category" data-testid="storybank-filter">
            {(['All', ...CATEGORIES] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={filter === c}
                onClick={() => setFilter(c)}
                className={cn(
                  'h-8 shrink-0 snap-start rounded-lg border px-3 text-[13px] transition-colors',
                  filter === c ? 'border-fg bg-fg text-bg' : 'border-line bg-surface-1 text-fg-2 hover:border-line-strong hover:text-fg'
                )}
              >
                {c === 'All' ? 'All' : formatCategoryName(c)}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-60" />)}
            </div>
          ) : stories.length === 0 && filter === 'All' ? (
            <div className="flex flex-col gap-6">
              <Panel>
                <EmptyState
                  icon={<Code2 size={18} />}
                  title="No technical stories yet."
                  description="A good story names the problem, the trade-off you made and what happened after."
                  action={<Button variant="primary" icon={<Plus size={16} />} onClick={() => handleOpenCreateModal()}>New story</Button>}
                />
              </Panel>
              <TemplateList
                items={STORY_TEMPLATES.map((t) => ({ key: t.title, title: t.title, meta: formatCategoryName(t.category), body: t.explanation }))}
                onUse={(key) => handleOpenCreateModal(STORY_TEMPLATES.find((t) => t.title === key))}
              />
            </div>
          ) : visible.length === 0 ? (
            <Panel>
              <EmptyState
                title={query ? `No stories match “${query}”.` : `No ${formatCategoryName(filter)} stories yet.`}
                action={<Button variant="secondary" size="sm" onClick={() => { setQuery(''); setFilter('All'); }}>Clear filters</Button>}
              />
            </Panel>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {visible.map((story) => (
                <TechStoryCard key={story.id} story={story} onEdit={() => handleOpenEditModal(story)} onDelete={() => setStoryToDelete(story.id)} />
              ))}
            </div>
          )}
        </>
      ) : (
        <BehavioralStoryTab createNewTrigger={behavioralCreateTrigger} query={query} />
      )}

      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
        title={editingStory ? 'Edit story' : 'New technical story'}
        description="Something you built or fixed that you can explain in depth."
        testId="story-dialog"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {formError && <p className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger" role="alert">{formError}</p>}
          <Field label="Title" htmlFor="st-title">
            <Input id="st-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Distributed cache invalidation" required />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Category" htmlFor="st-category">
              <Select id="st-category" value={category} onChange={(e) => setCategory(e.target.value as StoryCategory)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{formatCategoryName(c)}</option>)}
              </Select>
            </Field>
            <Field label="Project" htmlFor="st-project" optional>
              <Input id="st-project" value={sourceProject} onChange={(e) => setSourceProject(e.target.value)} placeholder="Payments service" />
            </Field>
          </div>
          <Field label="Code" htmlFor="st-code" help="The key snippet. Paste only code you are allowed to share.">
            <Textarea id="st-code" rows={6} value={codeSnippet} onChange={(e) => setCodeSnippet(e.target.value)} className="font-mono text-[12.5px]" required />
          </Field>
          <Field
            label="Explanation"
            htmlFor="st-explanation"
            help={
              <span className={cn('num', explanation.length < MIN_EXPLANATION ? 'text-fg-3' : 'text-accent-text')}>
                {explanation.length} of {MIN_EXPLANATION} characters minimum
              </span>
            }
          >
            <Textarea id="st-explanation" rows={5} value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Why it existed, what you chose and what you gave up." required />
          </Field>
          <div>
            <p className="field-label">Confidence</p>
            <ConfidencePicker value={confidenceLevel} onChange={setConfidenceLevel} />
          </div>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={isSubmitting} disabled={!canSubmit}>
              {editingStory ? 'Save changes' : 'Save story'}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmationModal
        isOpen={!!storyToDelete}
        title="Delete this story?"
        message="The story moves to trash. There is no screen to restore it yet."
        confirmText="Delete"
        onConfirm={executeDelete}
        onCancel={() => setStoryToDelete(null)}
        danger
      />
    </PageShell>
  );
}
