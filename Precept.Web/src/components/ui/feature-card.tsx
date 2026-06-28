import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './card';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
  key?: React.Key;
}

export function FeatureCard({ icon, title, description, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.21, 1.02, 0.73, 1] }}
      whileHover={{ y: -6 }}
      className="h-full"
    >
      <Card className="h-full glass-card bg-[#090D14]/80 border-white/6 hover:border-brand-primary/30 transition-colors duration-300 group">
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-[#121A26] border border-white/10 flex items-center justify-center mb-4 group-hover:border-brand-primary/30 transition-colors">
            {icon}
          </div>
          <CardTitle className="text-xl text-white font-['Space_Grotesk']">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm leading-relaxed font-['Geist']">
            {description}
          </CardDescription>
        </CardContent>
      </Card>
    </motion.div>
  );
}
