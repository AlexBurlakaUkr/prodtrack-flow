import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { NodeStatus } from '../../types';

interface ProgressBarProps {
  progress: number;
  status?: NodeStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  animate?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  status,
  size = 'md',
  showLabel = false,
  className,
  animate = true,
}) => {
  const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  const sizeClasses = {
    xs: 'h-1.5',
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  // Color mapping based on progress and status
  const getGradient = () => {
    if (status === 'delayed') {
      return 'from-rose-500 via-red-500 to-amber-500 shadow-rose-500/40';
    }
    if (status === 'completed' || clampedProgress === 100) {
      return 'from-emerald-500 via-teal-400 to-emerald-300 shadow-emerald-500/40';
    }
    if (status === 'in_review') {
      return 'from-amber-500 via-orange-400 to-yellow-300 shadow-amber-500/40';
    }
    if (clampedProgress >= 70) {
      return 'from-indigo-500 via-sky-400 to-teal-300 shadow-indigo-500/40';
    }
    if (clampedProgress >= 30) {
      return 'from-blue-600 via-indigo-500 to-sky-400 shadow-blue-500/40';
    }
    return 'from-slate-500 via-blue-500 to-indigo-400 shadow-blue-500/30';
  };

  return (
    <div className={twMerge('w-full flex items-center gap-3', className)}>
      <div className={twMerge('flex-1 bg-black/20 dark:bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/10 relative', sizeClasses[size])}>
        {/* Glow track */}
        <div
          className={twMerge(
            'h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out shadow-sm relative',
            getGradient(),
            animate && 'animate-pulse-subtle'
          )}
          style={{ width: `${clampedProgress}%` }}
        >
          {/* Specular glass reflection */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/30 rounded-t-full opacity-75" />
        </div>
      </div>
      {showLabel && (
        <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200 min-w-[36px] text-right">
          {clampedProgress}%
        </span>
      )}
    </div>
  );
};
