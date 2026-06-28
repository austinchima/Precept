import React from 'react';
import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';
import { Card, CardContent } from './card';

interface TestimonialCardProps {
  name: string;
  handle: string;
  text: string;
  avatarSrc?: string;
  delay?: number;
  key?: React.Key;
}

export function TestimonialCard({ name, handle, text, avatarSrc, delay = 0 }: TestimonialCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.21, 1.02, 0.73, 1] }}
      className="h-full"
    >
      <Card className="h-full glass-card bg-[#090D14]/80 border-white/6 hover:border-white/12 transition-colors duration-300">
        <CardContent className="p-6 flex flex-col h-full">
          <Quote size={24} className="text-brand-primary/60 mb-4" />
          <p className="text-brand-text font-['Geist'] text-sm leading-relaxed flex-1 mb-6">
            "{text}"
          </p>
          <div className="flex items-center gap-3 mt-auto">
            <div className="w-10 h-10 rounded-full bg-brand-surface-high border border-white/10 flex items-center justify-center overflow-hidden">
              {avatarSrc ? (
                <img src={avatarSrc} alt={name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-mono text-xs text-brand-primary">{name.charAt(0)}</span>
              )}
            </div>
            <div>
              <p className="text-white font-['Space_Grotesk'] text-sm font-semibold">{name}</p>
              <p className="text-brand-text-muted font-mono text-xs">{handle}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
