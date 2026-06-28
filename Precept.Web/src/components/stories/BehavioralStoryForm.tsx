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
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
      {/* Top accent */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-accent-teal/20 via-accent-teal to-accent-teal/20"></div>

      <div className="flex justify-between items-center mb-6 pb-3 border-b border-panel-border/20">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2.5">
          <i className="fa-solid fa-brain text-accent-teal text-sm"></i>
          {story ? 'Edit Behavioral Story' : 'New Behavioral Story'}
        </h2>
        <button onClick={onCancel} className="text-text-secondary hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[#f87171]/10 border border-[#f87171]/20 text-[#f87171] text-xs font-mono flex items-center gap-2 mb-4">
          <i className="fa-solid fa-triangle-exclamation"></i> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Story Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-base w-full text-sm"
            placeholder="e.g. Resolved Production DB Outage"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">
                <span className="text-accent-teal font-bold">S</span>ituation
              </label>
              <textarea
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                rows={4}
                className="input-base w-full text-sm resize-none"
                placeholder="What was the context or background? Set the scene."
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">
                <span className="text-accent-teal font-bold">T</span>ask
              </label>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                rows={4}
                className="input-base w-full text-sm resize-none"
                placeholder="What was your specific responsibility or challenge?"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">
                <span className="text-accent-teal font-bold">A</span>ction
              </label>
              <textarea
                value={action}
                onChange={(e) => setAction(e.target.value)}
                rows={4}
                className="input-base w-full text-sm resize-none"
                placeholder="What specific steps did YOU take to solve the problem?"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">
                <span className="text-accent-teal font-bold">R</span>esult
              </label>
              <textarea
                value={result}
                onChange={(e) => setResult(e.target.value)}
                rows={4}
                className="input-base w-full text-sm resize-none"
                placeholder="What was the final outcome? (Use metrics if possible!)"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Tags (Comma separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="input-base w-full text-sm font-mono"
            placeholder="leadership, conflict, optimization"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-panel-border/20">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 min-h-[44px] rounded-xl text-sm text-text-secondary hover:text-white border border-panel-border/30 hover:border-white/20 transition-all cursor-pointer"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center px-5 py-2 min-h-[44px] rounded-xl text-sm font-semibold bg-accent-teal text-dashboard-bg shadow-[0_0_15px_rgba(45,212,191,0.2)] hover:scale-105 transition-all duration-300 cursor-pointer gap-2"
          >
            {isSubmitting ? <div className="w-4 h-4 rounded-full border-2 border-dashboard-bg/30 border-t-dashboard-bg animate-spin"></div> : null}
            {isSubmitting ? 'Saving...' : 'Save Story'}
          </button>
        </div>
      </form>
    </div>
  );
};
