import React, { useState, useEffect } from 'react';
import { Story, StoryCategory, ConfidenceLevel } from '../types';
import { api } from '../api';
import { BehavioralStoryTab } from '../components/stories/BehavioralStoryTab';
import { useToast } from '../components/ui/Toast';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { AnimatedSection } from '../components/animation/AnimatedSection';
import { Plus, X, Code2, Star as StarIcon, Loader2, FilterIcon, Trash2, Pencil, Terminal } from 'lucide-react';

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
  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em]"
    style={{ background: `${color}14`, border: `1px solid ${color}33`, color }}>
    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
    {children}
  </span>
);

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

const CATEGORIES: ('All' | StoryCategory)[] = ['All', 'Auth', 'Database', 'Ai', 'ML', 'DevOps', 'Frontend', 'Backend', 'SystemDesign', 'Security', 'Testing', 'Cloud', 'Architecture'];
const CONFIDENCE_LEVELS: ConfidenceLevel[] = ['Panic', 'Shaky', 'Okay', 'Solid', 'CanTeach'];
const formatWord = (str: string) => (str === 'CanTeach' ? 'Can Teach' : str === 'SystemDesign' ? 'System Design' : str);

const CONFIDENCE_VALUES: Record<ConfidenceLevel, number> = {
  Panic: 1, Shaky: 2, Okay: 3, Solid: 4, CanTeach: 5,
};

const CATEGORY_COLOR: Record<StoryCategory, string> = {
  Auth: C.amber, Database: C.sky, Ai: C.emerald, ML: C.teal,
  DevOps: C.rose, Frontend: C.violet, Backend: '#6366f1',
  SystemDesign: '#06b6d4', Security: '#ef4444', Testing: '#84cc16',
  Cloud: '#0ea5e9', Architecture: '#d946ef',
};

export default function StoryBank() {
  const [activeTab, setActiveTab] = useState<'technical' | 'behavioral'>('technical');
  const [stories, setStories] = useState<Story[]>([]);
  const [filter, setFilter] = useState<'All' | StoryCategory>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null);
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<StoryCategory>('Auth');
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
      const data = await api.get<Story[]>(url);
      setStories(data);
    } catch (err) {
      console.error('Failed to load stories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadStories(filter); }, [filter]);

  const handleOpenCreateModal = () => {
    setEditingStory(null);
    setTitle(''); setCategory('Auth'); setSourceProject(''); setCodeSnippet(''); setExplanation(''); setConfidenceLevel('Okay');
    setFormError(null);
    setIsModalOpen(true);
  };
  const handleOpenEditModal = (story: Story) => {
    setEditingStory(story);
    setTitle(story.title); setCategory(story.category); setSourceProject(story.sourceProject);
    setCodeSnippet(story.codeSnippet); setExplanation(story.explanation); setConfidenceLevel(story.confidenceLevel);
    setFormError(null);
    setIsModalOpen(true);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (explanation.length < 50) {
      setFormError('Explanation must be at least 50 characters.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = { title, category, sourceProject, codeSnippet, explanation, confidenceLevel };
      if (editingStory) {
        const updated = await api.put<Story>(`/api/story/${editingStory.id}`, { ...payload, id: editingStory.id });
        setStories((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await api.post<Story>('/api/story', payload);
        setStories((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setFormError((err as Error).message || 'Failed to save story.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const confirmDelete = (id: string) => setStoryToDelete(id);
  const executeDelete = async () => {
    if (!storyToDelete) return;
    try {
      await api.delete(`/api/story/${storyToDelete}`);
      setStories((prev) => prev.filter((s) => s.id !== storyToDelete));
      setStoryToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || 'Failed to delete story.');
      setStoryToDelete(null);
    }
  };

  return (
    <div className="font-body p-4 md:p-8 pt-4 md:pt-6 max-w-[1400px] mx-auto space-y-6" data-testid="story-bank-page" style={{ color: C.ink }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 opacity-0 animate-fade-in-up">
        <div>
          <Eyebrow color={C.teal}>Story bank</Eyebrow>
          <h1 className="mt-4 font-display font-bold leading-[1.05]" style={{ color: C.ink, fontSize: 'clamp(28px,4vw,40px)' }}>
            Bank your <span className="font-editorial" style={{ color: C.teal, fontWeight: 400 }}>narratives.</span>
          </h1>
          <p className="mt-2 font-body text-[14px]" style={{ color: C.inkDim }}>
            Technical snippets and STAR stories — drilled to recall.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex p-1 gap-1" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.hair}`, borderRadius: 12 }}>
          {[
            { v: 'technical' as const, l: 'Technical', i: <Code2 size={12} /> },
            { v: 'behavioral' as const, l: 'Behavioral · STAR', i: <StarIcon size={12} /> },
          ].map((opt) => (
            <button key={opt.v} onClick={() => setActiveTab(opt.v)} data-testid={`storybank-tab-${opt.v}`}
              className="px-4 py-2 rounded-lg font-mono text-[11px] uppercase tracking-[0.16em] cursor-pointer flex items-center gap-2 transition-all"
              style={{
                background: activeTab === opt.v ? C.tealDim : 'transparent',
                color: activeTab === opt.v ? C.teal : C.inkDim,
                border: `1px solid ${activeTab === opt.v ? `${C.teal}44` : 'transparent'}`,
              }}>
              {opt.i} {opt.l}
            </button>
          ))}
        </div>
      </div>

      <div
        className="rounded-2xl overflow-hidden flex flex-col opacity-0 animate-fade-in-up delay-200"
        style={{
          background: `linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)`,
          border: `1px solid ${C.hair2}`,
          boxShadow: `0 40px 100px -30px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.06)`,
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Window Chrome Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: `1px solid ${C.hair}`, background: C.bg1 }}>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#febc2e" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28c840" }} />
          </div>
          <div
            className="hidden sm:flex items-center gap-2 rounded-md px-3 py-1 font-mono text-[11px]"
            style={{ background: C.bg2, color: C.inkDim, border: `1px solid ${C.hair}` }}
          >
            <Terminal size={12} style={{ color: C.teal }} /> precept · ~/career/story-bank
          </div>
          <div className="font-mono text-[11px] flex items-center gap-1.5" style={{ color: C.inkDim }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full animate-ping" style={{ background: C.emerald }} />
            <span style={{ color: C.emerald }}>{stories.length} stories banked</span>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-6" style={{ background: C.bg1 }}>
          {activeTab === 'technical' ? (
        <>
          <div className="flex flex-wrap justify-between items-center gap-3 opacity-0 animate-fade-in-up delay-100">
            <div className="relative">
              <FilterIcon size={12} style={{ color: C.inkMute }} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select title="Story Category Filter" value={filter} onChange={(e) => setFilter(e.target.value as 'All' | StoryCategory)} data-testid="storybank-filter"
                className="appearance-none pl-8 pr-8 py-2 rounded-full font-mono text-[11px] uppercase tracking-[0.14em] cursor-pointer transition-colors"
                style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.hair}`, color: C.inkDim, outline: 'none' }}
              >
                {CATEGORIES.map((c) => <option key={c} value={c} style={{ background: C.bg1, color: C.ink }}>{formatWord(c)}</option>)}
              </select>
            </div>
            <button onClick={handleOpenCreateModal} data-testid="storybank-new-btn"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] cursor-pointer"
              style={{ background: C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${C.ink}, 0 18px 60px -20px rgba(45,212,191,0.45)` }}>
              <Plus size={13} /> New snippet
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: C.inkDim }}>
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: C.teal }} />
              <span className="font-mono text-sm">Loading stories…</span>
            </div>
          ) : (
            <AnimatedSection animation="staggerFadeUp" stagger={0.06} childSelector="> div" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stories.map((story) => {
                const catColor = CATEGORY_COLOR[story.category];
                return (
                  <div key={story.id} className="flex flex-col group transition-all duration-300 overflow-hidden" style={cardStyle()}>
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-start justify-between mb-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-widest"
                          style={{ background: `${catColor}1c`, color: catColor, border: `1px solid ${catColor}44` }}>
                          {formatWord(story.category)}
                        </span>
                        <div className="flex gap-0.5" title={`Confidence: ${formatWord(story.confidenceLevel)}`}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <StarIcon
                              key={star}
                              size={10}
                              strokeWidth={1.5}
                              style={{ color: star <= CONFIDENCE_VALUES[story.confidenceLevel] ? C.teal : C.hair2 }}
                              fill={star <= CONFIDENCE_VALUES[story.confidenceLevel] ? C.teal : 'transparent'}
                            />
                          ))}
                        </div>
                      </div>
                      <h3 className="font-display text-[15px] font-semibold mb-1.5 line-clamp-2" style={{ color: C.ink }} title={story.title}>
                        {story.title}
                      </h3>
                      <p className="font-mono text-[10.5px] uppercase tracking-widest mb-3" style={{ color: C.inkMute }}>
                        {story.sourceProject || 'independent'}
                      </p>
                      <p className="font-body text-[13px] leading-relaxed line-clamp-3 mb-3" style={{ color: C.inkDim }}>
                        {story.explanation}
                      </p>
                      {story.codeSnippet && (
                        <pre className="overflow-hidden rounded-lg p-3 font-mono text-[10.5px] leading-[1.55] max-h-24"
                          style={{ background: C.bg0, color: C.inkDim, border: `1px solid ${C.hair}` }}>
                          <code>{story.codeSnippet.length > 150 ? `${story.codeSnippet.substring(0, 150)}…` : story.codeSnippet}</code>
                        </pre>
                      )}
                    </div>
                    <div className="px-5 py-3 flex justify-between items-center font-mono text-[10.5px]" style={{ borderTop: `1px solid ${C.hair}`, color: C.inkMute }}>
                      <span>Last: {story.lastReviewedAt ? new Date(story.lastReviewedAt).toLocaleDateString() : 'never'}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleOpenEditModal(story)} className="min-w-[32px] min-h-[32px] flex items-center justify-center transition-colors cursor-pointer"
                          style={{ color: C.inkDim }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = C.teal)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = C.inkDim)}
                        >
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => confirmDelete(story.id)} className="min-w-[32px] min-h-[32px] flex items-center justify-center transition-colors cursor-pointer"
                          style={{ color: C.inkDim }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = C.rose)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = C.inkDim)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {stories.length === 0 && (
                <div className="col-span-full py-14 px-6 text-center flex flex-col items-center gap-4" style={{ ...cardStyle(), border: `1px dashed ${C.hair2}` }}>
                  <Code2 size={28} style={{ color: C.inkMute }} />
                  <span className="font-mono text-[12.5px]" style={{ color: C.inkMute }}>No narratives match this filter.</span>
                  <button onClick={handleOpenCreateModal} className="rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.hair2}`, color: C.ink }}>
                    <Plus size={11} className="inline mr-1.5 -translate-y-px" /> Bank your first story
                  </button>
                </div>
              )}
            </AnimatedSection>
          )}

          {/* MODAL */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(2,5,10,0.7)', backdropFilter: 'blur(10px)' }}>
              <div className="w-full max-w-[680px] max-h-[92vh] flex flex-col relative opacity-0 animate-fade-in-up" style={{ ...cardStyle(), borderRadius: 22 }}>
                <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${C.hair}` }}>
                  <Eyebrow color={editingStory ? C.amber : C.teal}>{editingStory ? 'Edit snippet' : 'New snippet'}</Eyebrow>
                  <button title="Close Modal" onClick={() => setIsModalOpen(false)} className="min-h-[40px] min-w-[40px] rounded-lg grid place-items-center" style={{ color: C.inkDim }}>
                    <X size={16} />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                  <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                    {formError && (
                      <div className="px-3 py-2.5 rounded-lg font-mono text-[11.5px]" style={{ background: `${C.rose}10`, border: `1px solid ${C.rose}33`, color: C.rose }}>
                        {formError}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-1.5">
                        <label className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: C.inkMute }}>Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Distributed cache invalidation" style={inputStyle} required />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: C.inkMute }}>Category</label>
                        <select title="Story Category" value={category} onChange={(e) => setCategory(e.target.value as StoryCategory)} style={inputStyle}>
                          {CATEGORIES.slice(1).map((c) => <option key={c} value={c} style={{ background: C.bg1, color: C.ink }}>{formatWord(c)}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: C.inkMute }}>Source project</label>
                        <input title="Source Project" type="text" value={sourceProject} onChange={(e) => setSourceProject(e.target.value)} placeholder="e.g. Apollo" style={inputStyle} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: C.inkMute }}>Confidence rung</label>
                      <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: C.bg2, border: `1px solid ${C.hair}` }}>
                        {CONFIDENCE_LEVELS.map((level) => {
                          const active = confidenceLevel === level;
                          return (
                            <button type="button" key={level} onClick={() => setConfidenceLevel(level)}
                              className="rounded-full px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] transition-all cursor-pointer"
                              style={{
                                background: active ? C.tealDim : 'transparent',
                                color: active ? C.teal : C.inkDim,
                                border: `1px solid ${active ? `${C.teal}55` : C.hair}`,
                              }}>
                              {formatWord(level)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: C.inkMute }}>Code snippet</label>
                      <textarea title="Code Snippet" value={codeSnippet} onChange={(e) => setCodeSnippet(e.target.value)} rows={6} placeholder="// paste primary code block here"
                        style={{ ...inputStyle, background: C.bg0, resize: 'vertical' }} required />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <label className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: C.inkMute }}>Explanation</label>
                        <span className="font-mono text-[10px]" style={{ color: explanation.length < 50 ? C.rose : C.teal }}>{explanation.length}/50 min</span>
                      </div>
                      <textarea title="Explanation" value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={5}
                        placeholder="Why does this exist? Trade-offs?"
                        style={{ ...inputStyle, fontFamily: 'Geist, Inter, sans-serif', resize: 'vertical' }} required />
                    </div>
                  </div>

                  <div className="p-4 flex justify-end gap-3 shrink-0" style={{ borderTop: `1px solid ${C.hair}` }}>
                    <button type="button" title="Close Modal" onClick={() => setIsModalOpen(false)}
                      className="rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] cursor-pointer"
                      style={{ background: 'transparent', color: C.inkDim, border: `1px solid ${C.hair2}` }}>
                      Cancel
                    </button>
                    <button type="submit" title="Submit Form" disabled={isSubmitting || explanation.length < 50 || !title.trim() || !codeSnippet.trim()}
                      className="inline-flex items-center gap-2 rounded-full px-5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] cursor-pointer disabled:opacity-60"
                      style={{ background: C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${C.ink}` }}>
                      {isSubmitting && <Loader2 size={12} className="animate-spin" />}
                      {editingStory ? 'Save changes' : 'Bank story'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="opacity-0 animate-fade-in-up delay-100">
          <BehavioralStoryTab />
        </div>
      )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!storyToDelete}
        title="Delete story"
        message="Are you sure you want to permanently erase this narrative? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={executeDelete}
        onCancel={() => setStoryToDelete(null)}
        danger={true}
      />
    </div>
  );
}
