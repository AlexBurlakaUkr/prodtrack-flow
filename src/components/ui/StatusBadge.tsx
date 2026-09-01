import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { NodeStatus, OrderStatus, OrderPriority } from '../../types';
import { useI18n } from '../../locales';
import { TranslationKey } from '../../locales/en';

interface StatusBadgeProps {
  status?: NodeStatus | OrderStatus;
  priority?: OrderPriority;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  priority,
  size = 'sm',
  className,
}) => {
  const { t } = useI18n();

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px] gap-1',
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-sm gap-2',
  };

  if (priority) {
    const priorityConfig: Record<OrderPriority, { key: TranslationKey; dot: string; bg: string }> = {
      low: { key: 'priority_low', dot: 'bg-slate-400', bg: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
      medium: { key: 'priority_medium', dot: 'bg-sky-400', bg: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
      high: { key: 'priority_high', dot: 'bg-orange-400', bg: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
      critical: { key: 'priority_critical', dot: 'bg-rose-400 animate-ping', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
    };

    const conf = priorityConfig[priority] || priorityConfig.medium;

    return (
      <span
        className={twMerge(
          'inline-flex items-center font-medium rounded-full backdrop-blur-md border shadow-sm',
          sizeClasses[size],
          conf.bg,
          className
        )}
      >
        <span className={twMerge('w-1.5 h-1.5 rounded-full', conf.dot)} />
        <span>{t(conf.key)}</span>
      </span>
    );
  }

  if (status) {
    const statusConfig: Record<string, { key: TranslationKey; dot: string; bg: string }> = {
      pending: { key: 'status_pending', dot: 'bg-slate-400', bg: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
      in_progress: { key: 'status_in_progress', dot: 'bg-sky-400 animate-pulse', bg: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
      in_review: { key: 'status_in_review', dot: 'bg-amber-400', bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
      completed: { key: 'status_completed', dot: 'bg-emerald-400', bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
      delayed: { key: 'status_delayed', dot: 'bg-rose-400 animate-ping', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
      urgent_delayed: { key: 'order_status_urgent_delayed', dot: 'bg-rose-400 animate-ping', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
      on_hold: { key: 'order_status_on_hold', dot: 'bg-amber-400', bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
    };

    const conf = statusConfig[status] || statusConfig.pending;

    return (
      <span
        className={twMerge(
          'inline-flex items-center font-medium rounded-full backdrop-blur-md border shadow-sm transition-all',
          sizeClasses[size],
          conf.bg,
          className
        )}
      >
        <span className={twMerge('w-1.5 h-1.5 rounded-full', conf.dot)} />
        <span>{t(conf.key)}</span>
      </span>
    );
  }

  return null;
};
