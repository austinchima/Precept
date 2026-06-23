import React, { useState, useEffect } from 'react';
import { BehavioralStory } from '../../types';
import { api } from '../../api';
import { useToast } from '../ui/Toast';
import { BehavioralStoryCard } from './BehavioralStoryCard';
import { BehavioralStoryForm } from './BehavioralStoryForm';
import ConfirmationModal from '../ui/ConfirmationModal';

export const BehavioralStoryTab: React.FC = () => {
  const [stories, setStories] = useState<BehavioralStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<BehavioralStory | null>(null);
  const [behavioralToDelete, setBehavioralToDelete] = useState<string | null>(null);
  const toast = useToast();

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
    loadStories();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">Behavioral STAR Stories</h2>
          <p className="text-text-secondary text-sm mt-0.5">Situation, Task, Action, Result narratives for behavioral interviews.</p>
        </div>
        {!isFormOpen && (
          <button onClick={handleCreateNew} className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent-teal text-dashboard-bg shadow-[0_0_15px_rgba(45,212,191,0.2)] hover:scale-105 transition-all duration-300 cursor-pointer gap-2">
            <i className="fa-solid fa-plus text-xs"></i> Add STAR Story
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
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-accent-teal/10 border-t-accent-teal animate-spin"></div>
          <span className="font-mono text-sm">Accessing Behavioral Memory...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {stories.map(story => (
            <BehavioralStoryCard 
              key={story.id} 
              story={story} 
              onEdit={handleEdit} 
              onDelete={confirmDelete} 
            />
          ))}

          {stories.length === 0 && (
            <div className="col-span-full py-16 text-center glass-panel rounded-2xl border-dashed flex flex-col items-center justify-center p-6">
              <i className="fa-regular fa-folder-open text-3xl text-text-secondary/30 mb-4"></i>
              <span className="font-mono text-sm text-text-secondary mb-4">No behavioral narratives found.</span>
              <button onClick={handleCreateNew} className="px-4 py-2 rounded-xl text-sm text-text-secondary hover:text-white border border-panel-border/30 hover:border-white/20 transition-all cursor-pointer flex items-center gap-2">
                <i className="fa-solid fa-plus text-xs"></i> Add First STAR Story
              </button>
            </div>
          )}
        </div>
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
