import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, hint, icon, fullWidth = true, className = '', ...props },
    ref
  ) => {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const { type, ...restProps } = props;
    const isPasswordField = type === 'password';
    const inputType = isPasswordField ? (passwordVisible ? 'text' : 'password') : type ?? 'text';

    return (
      <motion.div
        className={`${fullWidth ? 'w-full' : ''}`}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {label && (
          <label className="block text-sm font-medium text-slate-200 mb-2">
            {label}
            {props.required && <span className="text-danger-400 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
          <input
            ref={ref}
            type={inputType}
            className={`
              w-full px-4 py-2.5 rounded-lg
              bg-slate-800 text-white placeholder-slate-500
              border border-slate-700
              focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? 'pl-10' : ''}
              ${isPasswordField ? 'pr-10' : ''}
              ${error ? 'border-danger-400 focus:border-danger-400 focus:ring-danger-500/20' : ''}
              ${className}
            `}
            {...restProps}
          />
          {isPasswordField && (
            <button
              type="button"
              onClick={() => setPasswordVisible((current) => !current)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100 focus:outline-none"
              aria-label={passwordVisible ? 'Hide password' : 'Show password'}
            >
              {passwordVisible ? '🙈' : '👁️'}
            </button>
          )}
        </div>
        {error && (
          <motion.p
            className="text-sm text-danger-400 mt-2 flex items-center gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            ⚠️ {error}
          </motion.p>
        )}
        {hint && !error && (
          <p className="text-xs text-slate-400 mt-2">{hint}</p>
        )}
      </motion.div>
    );
  }
);

Input.displayName = 'Input';
