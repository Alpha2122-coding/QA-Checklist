import React from 'react';
import { motion } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 focus:ring-brand-500',
  secondary: 'bg-slate-700 text-white hover:bg-slate-600 focus:ring-slate-500',
  danger: 'bg-danger-500 text-white hover:bg-danger-600 focus:ring-danger-500',
  ghost: 'bg-transparent text-brand-300 border border-slate-700 hover:bg-slate-800 focus:ring-brand-500'
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-xs font-medium rounded-md',
  md: 'px-4 py-2.5 text-sm font-semibold rounded-lg',
  lg: 'px-5 py-3 text-base font-semibold rounded-xl'
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      icon,
      fullWidth = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          inline-flex items-center justify-center gap-2 font-medium
          transition-all duration-200 ease-smooth
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        whileHover={!disabled && !isLoading ? { scale: 1.02 } : {}}
        whileTap={!disabled && !isLoading ? { scale: 0.98 } : {}}
        {...props}
      >
        {isLoading ? (
          <motion.div
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        ) : icon ? (
          icon
        ) : null}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
