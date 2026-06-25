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
    <div className="glass-panel rounded-2xl p-5 flex flex-col group hover:border-white/15 hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-base font-semibold text-white wrap-break-word pr-4 group-hover:text-accent-teal transition-colors duration-300">{story.title}</h3>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onEdit(story)} className="text-text-secondary hover:text-accent-teal cursor-pointer transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" title="Edit">
            <i className="fa-solid fa-pen text-xs"></i>
          </button>
          <button onClick={() => onDelete(story.id)} className="text-text-secondary hover:text-[#f87171] cursor-pointer transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" title="Delete">
            <i className="fa-regular fa-trash-can text-xs"></i>
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 text-sm text-text-secondary">
        <div>
          <strong className="text-accent-teal font-mono uppercase tracking-wider text-[10px] block mb-1">Situation</strong>
          <p className="line-clamp-3">{story.situation}</p>
        </div>
        <div>
          <strong className="text-accent-teal font-mono uppercase tracking-wider text-[10px] block mb-1">Task</strong>
          <p className="line-clamp-2">{story.task}</p>
        </div>
        <div>
          <strong className="text-accent-teal font-mono uppercase tracking-wider text-[10px] block mb-1">Action</strong>
          <p className="line-clamp-3">{story.action}</p>
        </div>
        <div>
          <strong className="text-accent-teal font-mono uppercase tracking-wider text-[10px] block mb-1">Result</strong>
          <p className="line-clamp-2">{story.result}</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-panel-border/20 flex items-center gap-2 flex-wrap">
        {tags.map((tag, idx) => (
          <span key={idx} className="text-[10px] font-mono text-accent-teal bg-accent-teal/10 px-2 py-0.5 rounded-full border border-accent-teal/20">
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
};
