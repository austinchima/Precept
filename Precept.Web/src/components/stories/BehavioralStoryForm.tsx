import React, { useState } from 'react';
import { BehavioralStory } from '../../types';
import { api } from '../../api';
import type { BehavioralStoryTemplate } from '../../data/behavioralStoryTemplates';
import { C, cardStyle, inputStyle, textareaBodyStyle, Eyebrow } from './storyTheme';
import { X, Loader2, Brain } from 'lucide-react';

interface BehavioralStoryFormProps {
  story?: BehavioralStory | null;
  template?: BehavioralStoryTemplate | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const BehavioralStoryForm: React.FC<BehavioralStoryFormProps> = ({ story, template, onSuccess, onCancel }) => {
  const [title, setTitle] = useState(story?.title || template?.title || '');
  const [situation, setSituation] = useState(story?.situation || template?.situation || '');
  const [task, setTask] = useState(story?.task || template?.task || '');
  const [action, setAction] = useState(story?.action || template?.action || '');
  const [result, setResult] = useState(story?.result || template?.result || '');
  const [tags, setTags] = useState(story?.tags || template?.tags || '');
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
    <div className="relative overflow-hidden opacity-0 animate-fade-in-up" style={cardStyle()}>
      <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${C.hair}` }}>
        <Eyebrow color={story ? C.amber : C.teal}>
          <span className="flex items-center gap-2">
            <Brain size={12} />
            {story ? 'Edit STAR story' : 'New STAR story'}
          </span>
        </Eyebrow>
        <button title="Close Form" aria-label="Close Form" onClick={onCancel} className="min-h-[40px] min-w-[40px] rounded-lg grid place-items-center transition-colors cursor-pointer"
          style={{ color: C.inkDim }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.ink; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.inkDim; }}>
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="p-6 space-y-4">
          {error && (
            <div className="px-3 py-2.5 rounded-lg font-mono text-[11.5px]" style={{ background: `${C.rose}10`, border: `1px solid ${C.rose}33`, color: C.rose }}>
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: C.inkMute }}>Story Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Resolved Production DB Outage"
              style={inputStyle}
              required
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: C.inkMute }}>
                  <span style={{ color: C.teal, fontWeight: 700 }}>S</span>ituation
                </label>
                <textarea
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  rows={4}
                  placeholder="What was the context or background? Set the scene."
                  style={textareaBodyStyle}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: C.inkMute }}>
                  <span style={{ color: C.teal, fontWeight: 700 }}>T</span>ask
                </label>
                <textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  rows={4}
                  placeholder="What was your specific responsibility or challenge?"
                  style={textareaBodyStyle}
                  required
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: C.inkMute }}>
                  <span style={{ color: C.teal, fontWeight: 700 }}>A</span>ction
                </label>
                <textarea
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  rows={4}
                  placeholder="What specific steps did YOU take to solve the problem?"
                  style={textareaBodyStyle}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: C.inkMute }}>
                  <span style={{ color: C.teal, fontWeight: 700 }}>R</span>esult
                </label>
                <textarea
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  rows={4}
                  placeholder="What was the final outcome? (Use metrics if possible!)"
                  style={textareaBodyStyle}
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: C.inkMute }}>Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="leadership, conflict, optimization"
              style={{ ...inputStyle, fontFamily: 'Geist, Inter, sans-serif' }}
            />
          </div>
        </div>

        <div className="p-4 flex justify-end gap-3 shrink-0" style={{ borderTop: `1px solid ${C.hair}` }}>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] cursor-pointer"
            style={{ background: 'transparent', color: C.inkDim, border: `1px solid ${C.hair2}` }}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] cursor-pointer disabled:opacity-60"
            style={{ background: C.ink, color: C.bg0, boxShadow: `0 0 0 1px ${C.ink}` }}
          >
            {isSubmitting && <Loader2 size={12} className="animate-spin" />}
            {story ? 'Save changes' : 'Bank story'}
          </button>
        </div>
      </form>
    </div>
  );
};
