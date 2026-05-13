import React from 'react';
import { motion } from 'framer-motion';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  autoClose?: number;
}

const variantClasses: Record<AlertVariant, { container: string; icon: string }> = {
  info: {
    container: 'bg-info-500/10 border-info-500/30',
    icon: 'text-info-400'
  },
  success: {
    container: 'bg-success-500/10 border-success-500/30',
    icon: 'text-success-400'
  },
  warning: {
    container: 'bg-warning-500/10 border-warning-500/30',
    icon: 'text-warning-400'
  },
  danger: {
    container: 'bg-danger-500/10 border-danger-500/30',
    icon: 'text-danger-400'
  }
};

const iconMap: Record<AlertVariant, string> = {
  info: 'ℹ️',
  success: '✓',
  warning: '⚠️',
  danger: '✕'
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  message,
  icon,
  onClose,
  autoClose
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  if (!isVisible) return null;

  return (
    <motion.div
      className={`
        rounded-lg border px-4 py-3
        flex items-start gap-3
        ${variantClasses[variant].container}
      `}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <span className={`text-lg flex-shrink-0 ${variantClasses[variant].icon}`}>
        {icon || iconMap[variant]}
      </span>
      <div className="flex-1 min-w-0">
        {title && <h3 className="font-semibold text-slate-100 text-sm mb-0.5">{title}</h3>}
        <p className="text-sm text-slate-300">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={() => {
            setIsVisible(false);
            onClose();
          }}
          className="flex-shrink-0 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Close alert"
        >
          ✕
        </button>
      )}
    </motion.div>
  );
};

Alert.displayName = 'Alert';
