import React, { useState, useEffect } from 'react';
import { BehavioralStory } from '../../types';
import { api } from '../../api';
import { useToast } from '../ui/Toast';
import { BehavioralStoryCard } from './BehavioralStoryCard';
import { BehavioralStoryForm } from './BehavioralStoryForm';
import ConfirmationModal from '../ui/ConfirmationModal';
import { AnimatedSection } from '../animation/AnimatedSection';
import { BEHAVIORAL_STORY_TEMPLATES, type BehavioralStoryTemplate } from '../../data/behavioralStoryTemplates';
import { C, cardStyle } from './storyTheme';
import { Plus, Star, Loader2, FolderOpen, Sparkles } from 'lucide-react';

interface BehavioralStoryTabProps {
  createNewTrigger?: number;
}

export const BehavioralStoryTab: React.FC<BehavioralStoryTabProps> = ({ createNewTrigger = 0 }) => {
  const [stories, setStories] = useState<BehavioralStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<BehavioralStory | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<BehavioralStoryTemplate | null>(null);
  const [behavioralToDelete, setBehavioralToDelete] = useState<string | null>(null);
  const toast = useToast();

  const loadStories = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<PagedResponse<BehavioralStory>>('/api/behavioralstory');
      setStories(data.items ?? []);
    } catch (err) {
      console.error('Failed to load behavioral stories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStories();
  }, []);

  useEffect(() => {
    if (createNewTrigger > 0) {
      handleCreateNew();
    }
  }, [createNewTrigger]);

  const handleCreateNew = (template?: BehavioralStoryTemplate) => {
    setEditingStory(null);
    setSelectedTemplate(template || null);
    setIsFormOpen(true);
  };

  const handleEdit = (story: BehavioralStory) => {
    setEditingStory(story);
    setIsFormOpen(true);
  };

  const confirmDelete = (id: string) => {
    setBehavioralToDelete(id);
  };

  const executeDelete = async () => {
    if (!behavioralToDelete) return;

    try {
      await api.delete(`/api/behavioralstory/${behavioralToDelete}`);
      setStories(prev => prev.filter(s => s.id !== behavioralToDelete));
      setBehavioralToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || 'Failed to delete behavioral story.');
      setBehavioralToDelete(null);
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedTemplate(null);
    loadStories();
  };

  const handleCancelForm = () => {
    setIsFormOpen(false);
    setSelectedTemplate(null);
  };

  return (
    <div className="space-y-6 opacity-0 animate-fade-in-up delay-100">
      {!isFormOpen && (
        <div className="flex items-center gap-2 opacity-0 animate-fade-in-up">
          <Star size={14} style={{ color: C.teal }} />
          <span className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: C.inkDim }}>
            Behavioral STAR Stories
          </span>
        </div>
      )}

      {isFormOpen ? (
        <BehavioralStoryForm 
          story={editingStory}
          template={selectedTemplate}
          onSuccess={handleFormSuccess} 
          onCancel={handleCancelForm} 
        />
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: C.inkDim }}>
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: C.teal }} />
          <span className="font-mono text-sm">Loading stories…</span>
        </div>
      ) : (
        <AnimatedSection animation="staggerFadeUp" stagger={0.06} childSelector="> div" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stories.map(story => (
            <BehavioralStoryCard 
              key={story.id} 
              story={story} 
              onEdit={handleEdit} 
              onDelete={confirmDelete} 
            />
          ))}

          {stories.length === 0 && (
            <div className="col-span-full space-y-6">
              <div className="py-10 px-6 text-center flex flex-col items-center gap-4" style={{ ...cardStyle(), border: `1px dashed ${C.hair2}` }}>
                <FolderOpen size={28} style={{ color: C.inkMute }} />
                <div>
                  <p className="font-mono text-[12.5px] mb-1" style={{ color: C.ink }}>Your STAR story bank is empty.</p>
                  <p className="font-body text-[13px]" style={{ color: C.inkDim }}>Pick a template to pre-fill your first narrative, then personalize it.</p>
                </div>
                <button onClick={() => handleCreateNew()} className="rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.hair2}`, color: C.ink }}>
                  <Plus size={11} className="inline mr-1.5 -translate-y-px" /> Bank your first STAR story
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1" style={{ background: C.hair }} />
                <span className="font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: C.inkMute }}>Or create from template</span>
                <div className="h-px flex-1" style={{ background: C.hair }} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {BEHAVIORAL_STORY_TEMPLATES.map((template) => (
                  <div key={template.title} className="flex flex-col overflow-hidden" style={cardStyle()}>
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-start justify-between mb-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-widest"
                          style={{ background: `${C.teal}1c`, color: C.teal, border: `1px solid ${C.teal}44` }}>
                          STAR
                        </span>
                        <Sparkles size={12} style={{ color: C.inkMute }} />
                      </div>
                      <h3 className="font-display text-[15px] font-semibold mb-1" style={{ color: C.ink }}>
                        {template.title}
                      </h3>
                      <p className="font-body text-[13px] leading-relaxed line-clamp-3 mb-3" style={{ color: C.inkDim }}>
                        {template.situation}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {template.tags.split(',').map((tag) => (
                          <span key={tag.trim()} className="px-2 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-wider"
                            style={{ background: `${C.teal}10`, color: C.inkDim, border: `1px solid ${C.hair}` }}>
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="px-5 py-3" style={{ borderTop: `1px solid ${C.hair}` }}>
                      <button onClick={() => handleCreateNew(template)}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] cursor-pointer transition-colors"
                        style={{ background: `${C.teal}14`, color: C.teal, border: `1px solid ${C.teal}33` }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = `${C.teal}22`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = `${C.teal}14`; }}>
                        <Plus size={11} /> Use this template
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </AnimatedSection>
      )}

      <ConfirmationModal 
        isOpen={!!behavioralToDelete}
        title="Delete STAR Story"
        message="Are you sure you want to permanently erase this behavioral story narrative? This cannot be undone."
        confirmText="Erase Story"
        cancelText="Cancel"
        onConfirm={executeDelete}
        onCancel={() => setBehavioralToDelete(null)}
        danger={true}
      />
    </div>
  );
};
