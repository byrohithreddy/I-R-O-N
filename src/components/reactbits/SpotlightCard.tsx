import React, { CSSProperties, PointerEvent, ReactNode, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

type SpotlightStyle = CSSProperties & {
  '--spotlight-x': string;
  '--spotlight-y': string;
};

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
  delay = 0,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [pointer, setPointer] = useState({ x: 50, y: 50 });

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;

    const bounds = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    });
  };

  const spotlightStyle: SpotlightStyle = {
    '--spotlight-x': `${pointer.x}%`,
    '--spotlight-y': `${pointer.y}%`,
  };

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.45, delay: shouldReduceMotion ? 0 : delay }}
      whileHover={shouldReduceMotion ? undefined : { y: -4 }}
      onPointerMove={handlePointerMove}
      style={spotlightStyle}
      className={`group/spotlight relative isolate overflow-hidden ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500 group-hover/spotlight:opacity-100"
        style={{
          background:
            'radial-gradient(320px circle at var(--spotlight-x) var(--spotlight-y), rgb(190 242 100 / 0.13), transparent 72%)',
        }}
      />
      <div className="relative z-10 flex h-full min-h-0 flex-col">{children}</div>
    </motion.div>
  );
};
