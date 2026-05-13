import React from 'react';
import { motion } from 'framer-motion';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
  label: string;
  icon?: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-700 text-slate-100',
  success: 'bg-success-500/20 text-success-200',
  warning: 'bg-warning-500/20 text-warning-200',
  danger: 'bg-danger-500/20 text-danger-200',
  info: 'bg-info-500/20 text-info-200'
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  label,
  icon,
  className = '',
  ...props
}) => {
  return (
    <motion.div
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
        text-xs font-medium uppercase tracking-wide
        ${variantClasses[variant]}
        ${className}
      `}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {label}
    </motion.div>
  );
};

Badge.displayName = 'Badge';
