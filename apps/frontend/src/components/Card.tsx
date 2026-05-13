import React from 'react';
import { motion } from 'framer-motion';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glassEffect?: boolean;
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { glassEffect = false, hoverable = false, className = '', children, ...props },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        className={`
          rounded-2xl border border-white/10
          ${glassEffect
            ? 'bg-slate-900/80 backdrop-blur-xl shadow-glass'
            : 'bg-slate-900/50 shadow-base'
          }
          transition-all duration-300 ease-smooth
          ${hoverable ? 'hover:border-white/20 hover:shadow-lg cursor-pointer' : ''}
          ${className}
        `}
        whileHover={hoverable ? { y: -2 } : {}}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';
