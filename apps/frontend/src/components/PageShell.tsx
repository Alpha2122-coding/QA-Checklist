import React from 'react';
import { motion } from 'framer-motion';

interface PageShellProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const PageShell: React.FC<PageShellProps> = ({ title, subtitle, actions, children }) => {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_25%),radial-gradient(circle_at_20%_10%,_rgba(59,130,246,0.08),_transparent_20%),linear-gradient(180deg,_rgba(7,16,28,0.88),_rgba(2,6,23,0.96))] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="mb-10 rounded-[2rem] border border-white/10 bg-slate-900/90 p-8 shadow-glass backdrop-blur-xl"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.32em] text-brand-300">{subtitle || 'QA Management'}</p>
                <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
              </div>
              {actions && <div className="flex items-center justify-end">{actions}</div>}
            </div>
          </motion.section>
          {children}
        </div>
      </div>
    </main>
  );
};
