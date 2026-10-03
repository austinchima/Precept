import { Pencil, Trash2 } from 'lucide-react';
import { BehavioralStory } from '../../types';
import { Button } from '../ui/kit';
import { ConfidenceMeter, nextReviewLabel } from '../domain';

interface BehavioralStoryCardProps {
  story: BehavioralStory;
  onEdit: (story: BehavioralStory) => void;
  onDelete: (id: string) => void;
}

export function BehavioralStoryCard({ story, onEdit, onDelete }: BehavioralStoryCardProps) {
  const tags = story.tags ? story.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
  return (
    <article className="panel group flex flex-col transition-colors hover:border-line-strong" data-testid="behavioral-story-card">
      <div className="flex flex-1 flex-col p-5">
        {tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="chip">{tag}</span>
            ))}
          </div>
        )}
        <h3 className="text-[15.5px] font-semibold leading-snug tracking-tight text-fg">{story.title}</h3>
        <dl className="mt-3 grid gap-2.5 text-[13px] leading-relaxed">
          {(['situation', 'action', 'result'] as const).map((k) => (
            <div key={k} className="grid grid-cols-[72px_1fr] gap-3">
              <dt className="font-medium capitalize text-fg-3">{k}</dt>
              <dd className="line-clamp-2 text-fg-2">{story[k]}</dd>
            </div>
          ))}
        </dl>
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
        <div className="flex items-center gap-3">
          <ConfidenceMeter level={story.confidenceLevel} />
          <span className="text-[12px] text-fg-3">{nextReviewLabel(story.nextReviewAt)}</span>
        </div>
        <div className="flex items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
          <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => onEdit(story)} aria-label={`Edit ${story.title}`} />
          <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => onDelete(story.id)} aria-label={`Delete ${story.title}`} />
        </div>
      </footer>
    </article>
  );
}
