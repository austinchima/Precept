import React, { useState, useEffect } from 'react';
import { Plus, Filter, Star, Code, X, Trash2, Edit, Loader2 } from 'lucide-react';
import { Story, StoryCategory, ConfidenceLevel } from '../types';
import { api } from '../api';
import { BehavioralStoryTab } from '../components/stories/BehavioralStoryTab';

const CATEGORIES: ('All' | StoryCategory)[] = ['All', 'Auth', 'Database', 'Ai', 'ML', 'DevOps', 'Frontend', 'Backend', 'SystemDesign', 'Security', 'Testing', 'Cloud', 'Architecture'];
const CONFIDENCE_LEVELS: ConfidenceLevel[] = ['Panic', 'Shaky', 'Okay', 'Solid', 'CanTeach'];

const CONFIDENCE_VALUES: Record<ConfidenceLevel, number> = {
  Panic: 1,
  Shaky: 2,
  Okay: 3,
  Solid: 4,
  CanTeach: 5
};

const CATEGORY_COLORS: Record<StoryCategory, string> = {
  Auth: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Database: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Ai: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  ML: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  DevOps: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  Frontend: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Backend: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  SystemDesign: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Security: 'bg-red-500/10 text-red-400 border-red-500/20',
  Testing: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
  Cloud: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  Architecture: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20'
};

export default function StoryBank() {
  const [activeTab, setActiveTab] = useState<'technical' | 'behavioral'>('technical');
  const [stories, setStories] = useState<Story[]>([]);
  const [filter, setFilter] = useState<'All' | StoryCategory>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);

  // Form states
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

  useEffect(() => {
    loadStories(filter);
  }, [filter]);

  const handleOpenCreateModal = () => {
    setEditingStory(null);
    setTitle('');
    setCategory('Auth');
    setSourceProject('');
    setCodeSnippet('');
    setExplanation('');
    setConfidenceLevel('Okay');
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

    if (explanation.length < 50) {
      setFormError('Explanation must be at least 50 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title,
        category,
        sourceProject,
        codeSnippet,
        explanation,
        confidenceLevel
      };

      if (editingStory) {
        const updated = await api.put<Story>(`/api/story/${editingStory.id}`, {
          ...payload,
          id: editingStory.id
        });
        setStories(prev => prev.map(s => s.id === updated.id ? updated : s));
      } else {
        const created = await api.post<Story>('/api/story', payload);
        setStories(prev => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Failed to save story. Please verify backend state.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('DANGER: Are you sure you want to permanently erase this story narrative?')) {
      return;
    }

    try {
      await api.delete(`/api/story/${id}`);
      setStories(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete story.');
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-brand-text tracking-tight">Story Bank</h1>
          <p className="text-brand-text-muted font-mono text-sm mt-1">Behavioral & Technical narrative repository.</p>
        </div>
        
        <div className="flex bg-brand-surface-high/30 p-1 rounded-md border border-brand-border">
          <button
            onClick={() => setActiveTab('technical')}
            className={`px-4 py-1.5 text-sm font-mono rounded transition-colors ${activeTab === 'technical' ? 'bg-brand-primary text-[#050b14] font-semibold' : 'text-brand-text-muted hover:text-brand-text'}`}
          >
            Technical Snippets
          </button>
          <button
            onClick={() => setActiveTab('behavioral')}
            className={`px-4 py-1.5 text-sm font-mono rounded transition-colors ${activeTab === 'behavioral' ? 'bg-brand-primary text-[#050b14] font-semibold' : 'text-brand-text-muted hover:text-brand-text'}`}
          >
            Behavioral STAR
          </button>
        </div>
      </header>

      {activeTab === 'technical' ? (
        <>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-heading font-semibold text-brand-text">Technical Code Snippets</h2>
              <p className="text-brand-text-muted font-mono text-sm mt-1">Store and explain technical solutions and architectures.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select 
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="input-base pr-8 appearance-none bg-brand-surface border-brand-border font-mono text-sm cursor-pointer"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted pointer-events-none" />
              </div>
              
              <button onClick={handleOpenCreateModal} className="btn-primary flex items-center gap-2 text-sm cursor-pointer">
                <Plus size={16} /> Add Snippet
              </button>
            </div>
          </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-brand-text-muted font-mono gap-3">
          <Loader2 className="animate-spin text-brand-primary" size={40} />
          <span>Accessing Memory Enclaves...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map(story => (
            <div key={story.id} className="card-container flex flex-col group hover:border-brand-primary/50 transition-colors bg-brand-surface">
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-2 py-0.5 rounded border text-xs font-mono font-medium ${CATEGORY_COLORS[story.category] || 'bg-brand-surface-high text-brand-text-muted'}`}>
                      {story.category}
                    </span>
                    <div className="flex gap-0.5" title={`Confidence: ${story.confidenceLevel}`}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star 
                          key={star} 
                          size={14} 
                          className={star <= CONFIDENCE_VALUES[story.confidenceLevel] ? "fill-brand-primary text-brand-primary" : "text-brand-border"} 
                        />
                      ))}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-heading font-semibold text-brand-text mb-2 line-clamp-2" title={story.title}>
                    {story.title}
                  </h3>
                  
                  <p className="text-xs font-mono text-brand-text-muted flex items-center gap-2 mb-3">
                    <Code size={12} /> {story.sourceProject || 'Independent'}
                  </p>
                  
                  <p className="text-sm text-brand-text-muted line-clamp-3 mb-4 font-sans leading-relaxed">
                    {story.explanation}
                  </p>
                </div>

                {story.codeSnippet && (
                  <div className="bg-[#050b14] border border-brand-border/50 rounded p-2.5 mb-2 overflow-hidden max-h-24">
                    <pre className="font-mono text-2xs text-brand-primary/80 overflow-x-auto whitespace-pre-wrap leading-tight select-none">
                      <code>{story.codeSnippet.length > 150 ? `${story.codeSnippet.substring(0, 150)}...` : story.codeSnippet}</code>
                    </pre>
                  </div>
                )}
              </div>
              
              <div className="px-5 py-3 border-t border-brand-border bg-brand-surface-high/20 flex justify-between items-center text-xs font-mono text-brand-text-muted">
                <span>Last reviewed: {story.lastReviewedAt ? new Date(story.lastReviewedAt).toLocaleDateString() : 'Never'}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleOpenEditModal(story)} className="hover:text-brand-primary flex items-center gap-1 transition-colors cursor-pointer">
                    <Edit size={12} /> Edit
                  </button>
                  <button onClick={() => handleDelete(story.id)} className="hover:text-[#f87171] flex items-center gap-1 transition-colors cursor-pointer">
                    <Trash2 size={12} /> Purge
                  </button>
                </div>
              </div>
            </div>
          ))}

          {stories.length === 0 && (
            <div className="col-span-full py-16 text-center card-container bg-brand-surface/50 border-dashed border-brand-border flex flex-col items-center justify-center p-6">
              <span className="font-mono text-sm text-brand-text-muted italic mb-4">No narrative data matches selected filter.</span>
              <button onClick={handleOpenCreateModal} className="btn-secondary text-xs flex items-center gap-2 cursor-pointer">
                <Plus size={14} /> Add First Story
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-secondary/80 backdrop-blur-sm">
          <div className="card-container w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 bg-brand-surface">
            <div className="flex items-center justify-between p-4 border-b border-brand-border bg-brand-surface-high/30">
              <h2 className="text-lg font-heading font-bold">{editingStory ? 'Modify Narrative Data' : 'Initialize Narrative'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-brand-text-muted hover:text-brand-text p-1 rounded hover:bg-brand-surface-high transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {formError && (
                  <div className="p-3.5 rounded bg-[#f87171]/10 border border-[#f87171]/20 text-[#f87171] text-xs font-mono">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-mono text-brand-text-muted uppercase tracking-wider">Designation (Title)</label>
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="input-base w-full text-sm" 
                      placeholder="e.g. Distributed Cache Implementation" 
                      required
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-brand-text-muted uppercase tracking-wider">Classification (Category)</label>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value as StoryCategory)}
                      className="input-base w-full text-sm"
                    >
                      {CATEGORIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-brand-text-muted uppercase tracking-wider">Origin Source (Project)</label>
                    <input 
                      type="text" 
                      value={sourceProject}
                      onChange={(e) => setSourceProject(e.target.value)}
                      className="input-base w-full text-sm" 
                      placeholder="e.g. Project Apollo" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-mono text-brand-text-muted uppercase tracking-wider">Confidence Level</label>
                  </div>
                  <div className="flex items-center gap-4 bg-[#050b14] p-3 rounded border border-brand-border">
                    {CONFIDENCE_LEVELS.map((level) => (
                      <label key={level} className="flex items-center gap-1.5 cursor-pointer font-mono text-xs text-brand-text hover:text-brand-primary">
                        <input 
                          type="radio" 
                          name="confidenceLevel" 
                          value={level} 
                          checked={confidenceLevel === level}
                          onChange={() => setConfidenceLevel(level)}
                          className="accent-brand-primary"
                        />
                        {level}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-brand-text-muted uppercase tracking-wider">Technical Artifact (Snippet)</label>
                  <textarea 
                    value={codeSnippet}
                    onChange={(e) => setCodeSnippet(e.target.value)}
                    className="input-base w-full h-32 font-mono text-sm leading-relaxed bg-[#050b14] resize-none" 
                    placeholder="// Paste primary code block here"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-xs font-mono text-brand-text-muted uppercase tracking-wider">Executive Summary (Explanation)</label>
                    <span className={`text-2xs font-mono ${explanation.length < 50 ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
                      Length: {explanation.length}/50 min chars
                    </span>
                  </div>
                  <textarea 
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    className="input-base w-full h-24 text-sm" 
                    placeholder="Explain the technical decisions and business/system impact..."
                    required
                  />
                </div>
              </div>

              <div className="p-4 border-t border-brand-border bg-brand-surface-high/40 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-sm cursor-pointer">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || explanation.length < 50 || !title.trim() || !codeSnippet.trim()}
                  className="btn-primary text-sm flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : null}
                  {editingStory ? 'Commit Changes' : 'Commit to Memory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      ) : (
        <BehavioralStoryTab />
      )}
    </div>
  );
}
