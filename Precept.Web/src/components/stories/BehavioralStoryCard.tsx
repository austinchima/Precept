import React from 'react';
import { BehavioralStory } from '../../types';
import { C, cardStyle, IconButton } from './storyTheme';
import { Pencil, Trash2, Star } from 'lucide-react';

interface BehavioralStoryCardProps {
  story: BehavioralStory;
  onEdit: (story: BehavioralStory) => void;
  onDelete: (storyId: string) => void;
}

const STAR_SECTIONS: { key: keyof Pick<BehavioralStory, 'situation' | 'task' | 'action' | 'result'>; label: string }[] = [
  { key: 'situation', label: 'Situation' },
  { key: 'task', label: 'Task' },
  { key: 'action', label: 'Action' },
  { key: 'result', label: 'Result' },
];

export const BehavioralStoryCard: React.FC<BehavioralStoryCardProps> = ({ story, onEdit, onDelete }) => {
  const tags = story.tags ? story.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  return (
    <div className="flex flex-col group transition-all duration-300 overflow-hidden" style={cardStyle()}>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-widest"
            style={{ background: `${C.teal}1c`, color: C.teal, border: `1px solid ${C.teal}44` }}>
            <Star size={9} /> STAR
          </span>
          <div className="flex items-center gap-2">
            <IconButton title="Edit story" onClick={() => onEdit(story)}>
              <Pencil size={12} />
            </IconButton>
            <IconButton title="Delete story" onClick={() => onDelete(story.id)} hoverColor={C.rose}>
              <Trash2 size={12} />
            </IconButton>
          </div>
        </div>

        <h3 className="font-display text-[15px] font-semibold mb-1.5 line-clamp-2" style={{ color: C.ink }} title={story.title}>
          {story.title}
        </h3>

        <div className="flex-1 space-y-2.5 mb-3">
          {STAR_SECTIONS.map(({ key, label }) => {
            const text = story[key];
            if (!text?.trim()) return null;
            return (
              <div key={key}>
                <strong className="font-mono uppercase tracking-wider text-[10px] block mb-0.5" style={{ color: C.teal }}>
                  {label}
                </strong>
                <p className="font-body text-[12.5px] leading-relaxed line-clamp-2" style={{ color: C.inkDim }}>
                  {text}
                </p>
              </div>
            );
          })}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2" style={{ borderTop: `1px solid ${C.hair}` }}>
            {tags.map((tag, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-wider"
                style={{ background: `${C.teal}10`, color: C.inkDim, border: `1px solid ${C.hair}` }}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-3 flex justify-between items-center font-mono text-[10.5px]" style={{ borderTop: `1px solid ${C.hair}`, color: C.inkMute }}>
        <span>Updated: {story.updatedAt ? new Date(story.updatedAt).toLocaleDateString() : 'never'}</span>
      </div>
    </div>
  );
};
