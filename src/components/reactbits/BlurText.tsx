import React, { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface BlurTextProps {
  children: ReactNode;
  className?: string;
}

export const BlurText: React.FC<BlurTextProps> = ({ children, className = '' }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.h1
      initial={shouldReduceMotion ? false : { opacity: 0, y: 18, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.h1>
  );
};
