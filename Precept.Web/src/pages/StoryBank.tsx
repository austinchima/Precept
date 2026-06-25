import React, { useState, useEffect } from 'react';
import { Story, StoryCategory, ConfidenceLevel } from '../types';
import { api } from '../api';
import { BehavioralStoryTab } from '../components/stories/BehavioralStoryTab';
import { useToast } from '../components/ui/Toast';
import ConfirmationModal from '../components/ui/ConfirmationModal';

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
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null);
  const toast = useToast();

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

  const confirmDelete = (id: string) => {
    setStoryToDelete(id);
  };

  const executeDelete = async () => {
    if (!storyToDelete) return;

    try {
      await api.delete(`/api/story/${storyToDelete}`);
      setStories(prev => prev.filter(s => s.id !== storyToDelete));
      setStoryToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || 'Failed to delete story.');
      setStoryToDelete(null);
    }
  };

  return (
    <div className="p-8 pt-6 max-w-[1400px] mx-auto space-y-6">

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 opacity-0 animate-fade-in-up">
        <div>
          <h1 className="text-[28px] font-medium text-white flex items-center tracking-tight">
            Story <span className="font-bold ml-2 hover:text-accent-teal transition-colors duration-300 cursor-default">Bank</span>
            <span className="mx-3 text-text-secondary/30 text-3xl font-light">|</span>
            <span className="text-text-secondary font-normal text-lg">Narrative Repository</span>
          </h1>
        </div>
        
        {/* Tab Toggle */}
        <div className="flex glass-panel rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveTab('technical')}
            className={`px-4 py-2 min-h-[44px] text-sm rounded-lg transition-all duration-300 cursor-pointer flex items-center gap-2 ${activeTab === 'technical' ? 'bg-accent-teal/10 text-accent-teal shadow-[0_0_10px_rgba(45,212,191,0.15)]' : 'text-text-secondary hover:text-white'}`}
          >
            <i className="fa-solid fa-code text-xs"></i> Technical Snippets
          </button>
          <button
            onClick={() => setActiveTab('behavioral')}
            className={`px-4 py-2 min-h-[44px] text-sm rounded-lg transition-all duration-300 cursor-pointer flex items-center gap-2 ${activeTab === 'behavioral' ? 'bg-accent-teal/10 text-accent-teal shadow-[0_0_10px_rgba(45,212,191,0.15)]' : 'text-text-secondary hover:text-white'}`}
          >
            <i className="fa-regular fa-star text-xs"></i> Behavioral STAR
          </button>
        </div>
      </div>

      {activeTab === 'technical' ? (
        <>
          {/* Subheader & Actions */}
          <div className="flex flex-wrap justify-between items-center gap-4 opacity-0 animate-fade-in-up delay-100">
            <div className="flex items-center gap-3">
              {/* Category Filter */}
              <div className="relative">
                <select 
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="appearance-none bg-transparent text-text-secondary border border-panel-border/50 rounded-xl pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-teal focus:border-accent-teal cursor-pointer hover:border-white/20 transition-all"
                >
                  {CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>)}
                </select>
                <i className="fa-solid fa-filter absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-secondary pointer-events-none"></i>
              </div>
            </div>

            <button onClick={handleOpenCreateModal} className="inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold bg-accent-teal text-dashboard-bg shadow-[0_0_15px_rgba(45,212,191,0.2)] animate-pulse-glow-teal hover:scale-105 transition-all duration-300 cursor-pointer">
              <i className="fa-solid fa-plus mr-2"></i> Add Snippet
            </button>
          </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-accent-teal/10 border-t-accent-teal animate-spin"></div>
          <span className="font-mono text-sm">Accessing Memory Enclaves...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 opacity-0 animate-fade-in-up delay-200">
          {stories.map(story => (
            <div key={story.id} className="glass-panel rounded-2xl flex flex-col group hover:border-white/15 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full border text-xs font-mono font-medium ${CATEGORY_COLORS[story.category] || 'bg-white/5 text-text-secondary'}`}>
                      {story.category}
                    </span>
                    <div className="flex gap-0.5" title={`Confidence: ${story.confidenceLevel}`}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <i 
                          key={star} 
                          className={`${star <= CONFIDENCE_VALUES[story.confidenceLevel] ? "fa-solid fa-star text-accent-teal" : "fa-regular fa-star text-panel-border"} text-[10px]`}
                        ></i>
                      ))}
                    </div>
                  </div>
                  
                  <h3 className="text-base font-semibold text-white mb-2 line-clamp-2 group-hover:text-accent-teal transition-colors duration-300" title={story.title}>
                    {story.title}
                  </h3>
                  
                  <p className="text-xs font-mono text-text-secondary flex items-center gap-2 mb-3">
                    <i className="fa-solid fa-code text-[10px]"></i> {story.sourceProject || 'Independent'}
                  </p>
                  
                  <p className="text-sm text-text-secondary line-clamp-3 mb-4 leading-relaxed">
                    {story.explanation}
                  </p>
                </div>

                {story.codeSnippet && (
                  <div className="bg-dashboard-bg/70 border border-panel-border/30 rounded-lg p-2.5 mb-2 overflow-hidden max-h-24">
                    <pre className="font-mono text-[10px] text-accent-teal/80 overflow-x-auto whitespace-pre-wrap leading-tight select-none">
                      <code>{story.codeSnippet.length > 150 ? `${story.codeSnippet.substring(0, 150)}...` : story.codeSnippet}</code>
                    </pre>
                  </div>
                )}
              </div>
              
              <div className="px-5 py-3 border-t border-panel-border/20 flex justify-between items-center text-xs text-text-secondary">
                <span className="font-mono">Last: {story.lastReviewedAt ? new Date(story.lastReviewedAt).toLocaleDateString() : 'Never'}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleOpenEditModal(story)} className="hover:text-accent-teal flex items-center justify-center min-h-[44px] min-w-[44px] gap-1 transition-colors cursor-pointer">
                    <i className="fa-solid fa-pen text-[10px]"></i> Edit
                  </button>
                  <button onClick={() => confirmDelete(story.id)} className="hover:text-[#f87171] flex items-center justify-center min-h-[44px] min-w-[44px] gap-1 transition-colors cursor-pointer">
                    <i className="fa-regular fa-trash-can text-[10px]"></i> Purge
                  </button>
                </div>
              </div>
            </div>
          ))}

          {stories.length === 0 && (
            <div className="col-span-full py-16 text-center glass-panel rounded-2xl border-dashed flex flex-col items-center justify-center p-6">
              <i className="fa-regular fa-folder-open text-3xl text-text-secondary/50 mb-4"></i>
              <span className="font-mono text-sm text-text-secondary mb-4">No narrative data matches selected filter.</span>
              <button onClick={handleOpenCreateModal} className="px-4 py-2 min-h-[44px] rounded-xl text-sm text-text-secondary hover:text-white border border-panel-border/30 hover:border-white/20 transition-all cursor-pointer flex items-center gap-2">
                <i className="fa-solid fa-plus text-xs"></i> Add First Story
              </button>
            </div>
          )}
        </div>
      )}

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-panel rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden opacity-0 animate-fade-in-up">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-linear-to-r from-accent-teal/20 via-accent-teal to-accent-teal/20"></div>
            
            <div className="flex items-center justify-between p-5 border-b border-panel-border/30">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <i className={`${editingStory ? 'fa-solid fa-pen-to-square' : 'fa-solid fa-plus'} text-accent-teal text-sm`}></i>
                {editingStory ? 'Modify Narrative' : 'Initialize Narrative'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
                {formError && (
                  <div className="p-3.5 rounded-lg bg-[#f87171]/10 border border-[#f87171]/20 text-[#f87171] text-xs font-mono flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation"></i> {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Title</label>
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
                    <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Category</label>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value as StoryCategory)}
                      className="input-base w-full text-sm"
                    >
                      {CATEGORIES.slice(1).map(c => <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>)}
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Source Project</label>
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
                    <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Confidence Level</label>
                  </div>
                  <div className="flex items-center gap-4 bg-dashboard-bg/50 p-3 rounded-xl border border-panel-border/30">
                    {CONFIDENCE_LEVELS.map((level) => (
                      <label key={level} className="flex items-center gap-1.5 cursor-pointer text-xs text-text-secondary hover:text-accent-teal transition-colors">
                        <input 
                          type="radio" 
                          name="confidenceLevel" 
                          value={level} 
                          checked={confidenceLevel === level}
                          onChange={() => setConfidenceLevel(level)}
                          className="accent-accent-teal"
                        />
                        {level}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Code Snippet</label>
                  <textarea 
                    value={codeSnippet}
                    onChange={(e) => setCodeSnippet(e.target.value)}
                    className="input-base w-full h-32 font-mono text-sm leading-relaxed bg-dashboard-bg/50 resize-none" 
                    placeholder="// Paste primary code block here"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Explanation</label>
                    <span className={`text-[10px] font-mono ${explanation.length < 50 ? 'text-[#f87171]' : 'text-accent-teal'}`}>
                      {explanation.length}/50 min
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

              <div className="p-4 border-t border-panel-border/30 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 min-h-[44px] rounded-xl text-sm text-text-secondary hover:text-white border border-panel-border/30 hover:border-white/20 transition-all cursor-pointer">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || explanation.length < 50 || !title.trim() || !codeSnippet.trim()}
                  className="inline-flex items-center justify-center px-4 py-2 min-h-[44px] rounded-xl text-sm font-semibold bg-accent-teal text-dashboard-bg shadow-[0_0_15px_rgba(45,212,191,0.2)] hover:scale-105 transition-all duration-300 cursor-pointer gap-2"
                >
                  {isSubmitting ? <div className="w-4 h-4 rounded-full border-2 border-dashboard-bg/30 border-t-dashboard-bg animate-spin"></div> : null}
                  {editingStory ? 'Commit Changes' : 'Commit to Memory'}
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

      <ConfirmationModal 
        isOpen={!!storyToDelete}
        title="Delete Story"
        message="Are you sure you want to permanently erase this story narrative? This cannot be undone."
        confirmText="Erase Story"
        cancelText="Cancel"
        onConfirm={executeDelete}
        onCancel={() => setStoryToDelete(null)}
        danger={true}
      />
    </div>
  );
}
