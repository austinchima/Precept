import React, { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { BehavioralStory } from '../../types';
import { api } from '../../api';
import { BehavioralStoryCard } from './BehavioralStoryCard';
import { BehavioralStoryForm } from './BehavioralStoryForm';

export const BehavioralStoryTab: React.FC = () => {
  const [stories, setStories] = useState<BehavioralStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<BehavioralStory | null>(null);

  const loadStories = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<BehavioralStory[]>('/api/behavioralstory');
      setStories(data);
    } catch (err) {
      console.error('Failed to load behavioral stories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStories();
  }, []);

  const handleCreateNew = () => {
    setEditingStory(null);
    setIsFormOpen(true);
  };

  const handleEdit = (story: BehavioralStory) => {
    setEditingStory(story);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('DANGER: Are you sure you want to permanently erase this behavioral story?')) {
      return;
    }
    try {
      await api.delete(`/api/behavioralstory/${id}`);
      setStories(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete behavioral story.');
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    loadStories();
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-heading font-semibold text-brand-text">Behavioral STAR Stories</h2>
          <p className="text-brand-text-muted font-mono text-sm mt-1">Situation, Task, Action, Result narratives for behavioral interviews.</p>
        </div>
        {!isFormOpen && (
          <button onClick={handleCreateNew} className="btn-primary flex items-center gap-2 text-sm cursor-pointer">
            <Plus size={16} /> Add STAR Story
          </button>
        )}
      </div>

      {isFormOpen ? (
        <BehavioralStoryForm 
          story={editingStory} 
          onSuccess={handleFormSuccess} 
          onCancel={() => setIsFormOpen(false)} 
        />
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-brand-text-muted font-mono gap-3">
          <Loader2 className="animate-spin text-brand-primary" size={40} />
          <span>Accessing Behavioral Memory...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {stories.map(story => (
            <BehavioralStoryCard 
              key={story.id} 
              story={story} 
              onEdit={handleEdit} 
              onDelete={handleDelete} 
            />
          ))}

          {stories.length === 0 && (
            <div className="col-span-full py-16 text-center card-container bg-brand-surface/50 border-dashed border-brand-border flex flex-col items-center justify-center p-6">
              <span className="font-mono text-sm text-brand-text-muted italic mb-4">No behavioral narratives found.</span>
              <button onClick={handleCreateNew} className="btn-secondary text-xs flex items-center gap-2 cursor-pointer">
                <Plus size={14} /> Add First STAR Story
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
