import React, { useState } from 'react';
import { BehavioralStory } from '../../types';
import { api } from '../../api';
import type { BehavioralStoryTemplate } from '../../data/behavioralStoryTemplates';
import { Button, Dialog, Field, Input, Textarea } from '../ui/kit';

interface BehavioralStoryFormProps {
  open: boolean;
  story?: BehavioralStory | null;
  template?: BehavioralStoryTemplate | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const STAR_FIELDS = [
  { key: 'situation', label: 'Situation', help: 'The context. Where were you and what was going on?' },
  { key: 'task', label: 'Task', help: 'Your responsibility or the problem you owned.' },
  { key: 'action', label: 'Action', help: 'What you did, in the order you did it.' },
  { key: 'result', label: 'Result', help: 'The outcome. Use real numbers only if you have them.' },
] as const;

type StarKey = (typeof STAR_FIELDS)[number]['key'];

function BehavioralStoryFormBody({ story, template, onSuccess, onCancel }: Omit<BehavioralStoryFormProps, 'open'>) {
  const [title, setTitle] = useState(story?.title || template?.title || '');
  const [fields, setFields] = useState<Record<StarKey, string>>({
    situation: story?.situation || template?.situation || '',
    task: story?.task || template?.task || '',
    action: story?.action || template?.action || '',
    result: story?.result || template?.result || '',
  });
  const [tags, setTags] = useState(story?.tags || template?.tags || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || STAR_FIELDS.some((f) => !fields[f.key].trim())) {
      setError('Fill in the title and all four STAR sections.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        situation: fields.situation.trim(),
        task: fields.task.trim(),
        action: fields.action.trim(),
        result: fields.result.trim(),
        tags: tags.trim(),
      };
      if (story) await api.put(`/api/behavioralstory/${story.id}`, payload);
      else await api.post('/api/behavioralstory', payload);
      onSuccess();
    } catch (err) {
      console.error('Failed to save behavioral story:', err);
      setError('The story could not be saved. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form id="behavioral-story-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger" role="alert">{error}</p>}
      <Field label="Title" htmlFor="bs-title">
        <Input id="bs-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resolved a production outage under pressure" required />
      </Field>
      <div className="grid gap-5 md:grid-cols-2">
        {STAR_FIELDS.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={`bs-${f.key}`} help={f.help}>
            <Textarea
              id={`bs-${f.key}`}
              rows={4}
              value={fields[f.key]}
              onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
              required
            />
          </Field>
        ))}
      </div>
      <Field label="Tags" htmlFor="bs-tags" help="Comma separated, for example: ownership, conflict" optional>
        <Input id="bs-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>{story ? 'Save changes' : 'Save story'}</Button>
      </div>
    </form>
  );
}

export function BehavioralStoryForm({ open, story, template, onSuccess, onCancel }: BehavioralStoryFormProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      size="lg"
      title={story ? 'Edit STAR story' : 'New STAR story'}
      description="Write it the way you would say it in an interview."
      testId="behavioral-story-dialog"
    >
      {open && <BehavioralStoryFormBody key={story?.id ?? template?.title ?? 'new'} story={story} template={template} onSuccess={onSuccess} onCancel={onCancel} />}
    </Dialog>
  );
}
