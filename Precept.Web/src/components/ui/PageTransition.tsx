import React from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -15, filter: 'blur(8px)' }}
      transition={{ 
        duration: 0.5, 
        ease: [0.22, 1, 0.36, 1] // Custom smooth easing (like Apple/premium)
      }}
      className={`w-full h-full ${className}`}
    >
      {children}
    </motion.div>
  );
}
