import React, { useState } from 'react';
import { BehavioralStory } from '../../types';
import { api } from '../../api';

interface BehavioralStoryFormProps {
  story?: BehavioralStory | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const BehavioralStoryForm: React.FC<BehavioralStoryFormProps> = ({ story, onSuccess, onCancel }) => {
  const [title, setTitle] = useState(story?.title || '');
  const [situation, setSituation] = useState(story?.situation || '');
  const [task, setTask] = useState(story?.task || '');
  const [action, setAction] = useState(story?.action || '');
  const [result, setResult] = useState(story?.result || '');
  const [tags, setTags] = useState(story?.tags || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !situation.trim() || !task.trim() || !action.trim() || !result.trim()) {
      setError('Title, Situation, Task, Action, and Result are all required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        title: title.trim(),
        situation: situation.trim(),
        task: task.trim(),
        action: action.trim(),
        result: result.trim(),
        tags: tags.trim()
      };

      if (story) {
        await api.put(`/api/behavioralstory/${story.id}`, payload);
      } else {
        await api.post('/api/behavioralstory', payload);
      }
      onSuccess();
    } catch (err) {
      console.error('Failed to save behavioral story:', err);
      setError('Failed to save story. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card-container p-6 bg-brand-surface border border-brand-primary/30 relative">
      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-brand-primary"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-brand-primary"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-brand-primary"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-brand-primary"></div>

      <div className="flex justify-between items-center mb-6 pb-2 border-b border-brand-border/50">
        <h2 className="text-xl font-heading font-semibold text-brand-text flex items-center gap-2">
          <span className="material-symbols-outlined text-brand-primary">psychology</span>
          {story ? 'Edit Behavioral Story' : 'New Behavioral Story'}
        </h2>
        <button onClick={onCancel} className="text-brand-text-muted hover:text-brand-text transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {error && <div className="text-red-400 text-sm mb-4 font-mono bg-red-400/10 p-2 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-mono text-brand-text-muted uppercase tracking-wider mb-1">Story Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-brand-bg border border-brand-border rounded p-2 text-brand-text font-mono text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all outline-none"
            placeholder="e.g. Resolved Production DB Outage"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-brand-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <span className="text-brand-primary font-bold">S</span>ituation
              </label>
              <textarea
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                rows={4}
                className="w-full bg-brand-bg border border-brand-border rounded p-2 text-brand-text font-sans text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all outline-none"
                placeholder="What was the context or background? Set the scene."
              />
            </div>
            
            <div>
              <label className="block text-xs font-mono text-brand-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <span className="text-brand-primary font-bold">T</span>ask
              </label>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                rows={4}
                className="w-full bg-brand-bg border border-brand-border rounded p-2 text-brand-text font-sans text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all outline-none"
                placeholder="What was your specific responsibility or challenge?"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-brand-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <span className="text-brand-primary font-bold">A</span>ction
              </label>
              <textarea
                value={action}
                onChange={(e) => setAction(e.target.value)}
                rows={4}
                className="w-full bg-brand-bg border border-brand-border rounded p-2 text-brand-text font-sans text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all outline-none"
                placeholder="What specific steps did YOU take to solve the problem?"
              />
            </div>
            
            <div>
              <label className="block text-xs font-mono text-brand-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <span className="text-brand-primary font-bold">R</span>esult
              </label>
              <textarea
                value={result}
                onChange={(e) => setResult(e.target.value)}
                rows={4}
                className="w-full bg-brand-bg border border-brand-border rounded p-2 text-brand-text font-sans text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all outline-none"
                placeholder="What was the final outcome? (Use metrics if possible!)"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-brand-text-muted uppercase tracking-wider mb-1">Tags (Comma separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full bg-brand-bg border border-brand-border rounded p-2 text-brand-text font-mono text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all outline-none"
            placeholder="leadership, conflict, optimization"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-brand-border/50">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-brand-text-muted hover:text-brand-text font-mono text-sm transition-colors cursor-pointer"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary py-2 px-6 font-mono text-sm cursor-pointer"
          >
            {isSubmitting ? 'Saving...' : 'Save Story'}
          </button>
        </div>
      </form>
    </div>
  );
};
