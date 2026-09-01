import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'active' | 'subtle' | 'glow';
  glowColor?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  variant = 'default',
  glowColor,
  style,
  ...props
}) => {
  const baseClasses = `
    backdrop-blur-xl rounded-2xl transition-all duration-300 relative
  `;

  const variantClasses = {
    default: 'bg-white/10 dark:bg-slate-900/40 border border-white/20 dark:border-white/10 shadow-glass-sm',
    elevated: 'bg-white/15 dark:bg-slate-900/60 border border-white/25 dark:border-white/15 shadow-glass-md',
    interactive: 'bg-white/10 dark:bg-slate-900/40 border border-white/20 dark:border-white/10 shadow-glass-sm hover:bg-white/20 dark:hover:bg-slate-800/50 hover:border-white/30 dark:hover:border-white/20 hover:shadow-glass-md hover:-translate-y-0.5 cursor-pointer',
    active: 'bg-white/25 dark:bg-indigo-950/50 border border-indigo-400/40 dark:border-indigo-400/30 shadow-glass-glow',
    subtle: 'bg-white/5 dark:bg-slate-900/25 border border-white/10 dark:border-white/5',
    glow: 'bg-white/15 dark:bg-slate-900/60 border border-white/25 dark:border-white/20 shadow-glass-glow-lg',
  };

  return (
    <div
      className={twMerge(clsx(baseClasses, variantClasses[variant], className))}
      style={{
        ...style,
        ...(glowColor ? ({ '--tw-shadow-color': glowColor } as React.CSSProperties) : {}),
      }}
      {...props}
    >
      {children}
    </div>
  );
};
