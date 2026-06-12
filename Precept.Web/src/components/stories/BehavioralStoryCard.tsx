import React from 'react';
import { BehavioralStory } from '../../types';

interface BehavioralStoryCardProps {
  story: BehavioralStory;
  onEdit: (story: BehavioralStory) => void;
  onDelete: (storyId: string) => void;
}

export const BehavioralStoryCard: React.FC<BehavioralStoryCardProps> = ({ story, onEdit, onDelete }) => {
  const tags = story.tags ? story.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  return (
    <div className="card-container p-5 bg-brand-surface border border-brand-border/50 hover:border-brand-primary/50 transition-colors flex flex-col group">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-heading font-semibold text-brand-text break-words pr-4">{story.title}</h3>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(story)} className="text-brand-text-muted hover:text-brand-primary cursor-pointer transition-colors" title="Edit">
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button onClick={() => onDelete(story.id)} className="text-brand-text-muted hover:text-red-400 cursor-pointer transition-colors" title="Delete">
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 font-sans text-sm text-brand-text/90">
        <div>
          <strong className="text-brand-primary font-mono uppercase tracking-wider text-[10px] block mb-1">Situation</strong>
          <p className="line-clamp-3">{story.situation}</p>
        </div>
        <div>
          <strong className="text-brand-primary font-mono uppercase tracking-wider text-[10px] block mb-1">Task</strong>
          <p className="line-clamp-2">{story.task}</p>
        </div>
        <div>
          <strong className="text-brand-primary font-mono uppercase tracking-wider text-[10px] block mb-1">Action</strong>
          <p className="line-clamp-3">{story.action}</p>
        </div>
        <div>
          <strong className="text-brand-primary font-mono uppercase tracking-wider text-[10px] block mb-1">Result</strong>
          <p className="line-clamp-2">{story.result}</p>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-brand-border/30 flex items-center gap-2 flex-wrap">
        {tags.map((tag, idx) => (
          <span key={idx} className="text-[10px] font-mono text-brand-primary bg-brand-primary/10 px-2 py-1 rounded">
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
};
