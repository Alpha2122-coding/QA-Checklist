import React from 'react';

type Status = 'PENDING' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'BLOCKED';

const classes: Record<Status, string> = {
  PENDING: 'bg-warning-500/10 text-warning-300 border-warning-500/20',
  IN_PROGRESS: 'bg-info-500/10 text-info-300 border-info-500/20',
  PASSED: 'bg-success-500/10 text-success-300 border-success-500/20',
  FAILED: 'bg-danger-500/10 text-danger-300 border-danger-500/20',
  BLOCKED: 'bg-danger-500/10 text-danger-300 border-danger-500/20'
};

const labels: Record<Status, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  PASSED: 'Passed',
  FAILED: 'Failed',
  BLOCKED: 'Blocked'
};

interface StatusBadgeProps {
  status: Status;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${classes[status]}`}
      aria-label={`Status: ${labels[status]}`}
    >
      {labels[status]}
    </span>
  );
};

StatusBadge.displayName = 'StatusBadge';
