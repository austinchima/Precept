import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { BehavioralStory, PagedResponse } from '../../types';
import { api } from '../../api';
import { useToast } from '../ui/Toast';
import { BehavioralStoryCard } from './BehavioralStoryCard';
import { BehavioralStoryForm } from './BehavioralStoryForm';
import ConfirmationModal from '../ui/ConfirmationModal';
import { BEHAVIORAL_STORY_TEMPLATES, type BehavioralStoryTemplate } from '../../data/behavioralStoryTemplates';
import { Button, EmptyState, Panel, Skeleton } from '../ui/kit';
import { TemplateList } from './TemplateList';

interface BehavioralStoryTabProps {
  createNewTrigger?: number;
  query?: string;
}

export const BehavioralStoryTab: React.FC<BehavioralStoryTabProps> = ({ createNewTrigger = 0, query = '' }) => {
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
      toast.error('Could not load STAR stories.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStories();
  }, []);

  useEffect(() => {
    if (createNewTrigger > 0) handleCreateNew();
  }, [createNewTrigger]);

  const handleCreateNew = (template?: BehavioralStoryTemplate) => {
    setEditingStory(null);
    setSelectedTemplate(template || null);
    setIsFormOpen(true);
  };

  const executeDelete = async () => {
    if (!behavioralToDelete) return;
    const id = behavioralToDelete;
    setBehavioralToDelete(null);
    try {
      await api.delete(`/api/behavioralstory/${id}`);
      setStories((prev) => prev.filter((s) => s.id !== id));
      toast.success('Story deleted.');
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || 'Could not delete the story.');
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stories;
    return stories.filter((s) => [s.title, s.situation, s.task, s.action, s.result, s.tags].some((v) => v?.toLowerCase().includes(q)));
  }, [stories, query]);

  return (
    <>
      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56" />)}
        </div>
      ) : stories.length === 0 ? (
        <div className="flex flex-col gap-6">
          <Panel>
            <EmptyState
              icon={<BookOpen size={18} />}
              title="No STAR stories yet."
              description="Write one from scratch or start from a template and make it yours."
              action={<Button variant="primary" icon={<Plus size={16} />} onClick={() => handleCreateNew()}>New STAR story</Button>}
            />
          </Panel>
          <TemplateList
            items={BEHAVIORAL_STORY_TEMPLATES.map((t) => ({ key: t.title, title: t.title, meta: t.tags.split(',')[0]?.trim(), body: t.situation }))}
            onUse={(key) => handleCreateNew(BEHAVIORAL_STORY_TEMPLATES.find((t) => t.title === key))}
          />
        </div>
      ) : visible.length === 0 ? (
        <Panel>
          <EmptyState title={`No STAR stories match “${query}”.`} />
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((story) => (
            <BehavioralStoryCard
              key={story.id}
              story={story}
              onEdit={(s) => {
                setEditingStory(s);
                setSelectedTemplate(null);
                setIsFormOpen(true);
              }}
              onDelete={setBehavioralToDelete}
            />
          ))}
        </div>
      )}

      <BehavioralStoryForm
        open={isFormOpen}
        story={editingStory}
        template={selectedTemplate}
        onSuccess={() => {
          setIsFormOpen(false);
          setSelectedTemplate(null);
          toast.success(editingStory ? 'Story updated.' : 'Story saved.');
          loadStories();
        }}
        onCancel={() => {
          setIsFormOpen(false);
          setSelectedTemplate(null);
        }}
      />

      <ConfirmationModal
        isOpen={!!behavioralToDelete}
        title="Delete this STAR story?"
        message="The story moves to trash. There is no screen to restore it yet."
        confirmText="Delete"
        onConfirm={executeDelete}
        onCancel={() => setBehavioralToDelete(null)}
        danger
      />
    </>
  );
};
