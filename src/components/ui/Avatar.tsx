import React, { useState } from 'react';
import { Assignee } from '../../types';
import { twMerge } from 'tailwind-merge';

interface AvatarProps {
  assignee?: Assignee;
  name?: string;
  avatarUrl?: string;
  initials?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  showRole?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  assignee,
  name,
  avatarUrl,
  initials,
  size = 'md',
  showName = false,
  showRole = false,
  className,
}) => {
  const [imgError, setImgError] = useState(false);

  const finalName = assignee?.name || name || 'Unassigned';
  const finalRole = assignee?.role || '';
  const finalUrl = assignee?.avatarUrl || avatarUrl;
  const finalInitials =
    assignee?.initials ||
    initials ||
    finalName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const color = assignee?.color || '#6366f1';

  const sizeMap = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-lg',
  };

  return (
    <div className={twMerge('inline-flex items-center gap-2.5', className)}>
      <div
        className={twMerge(
          'relative rounded-full flex items-center justify-center font-bold text-white shadow-sm ring-1 ring-white/20 shrink-0 overflow-hidden select-none',
          sizeMap[size]
        )}
        style={{ backgroundColor: color }}
        title={`${finalName}${finalRole ? ` (${finalRole})` : ''}`}
      >
        {finalUrl && !imgError ? (
          <img
            src={finalUrl}
            alt={finalName}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span>{finalInitials}</span>
        )}
      </div>

      {(showName || showRole) && (
        <div className="flex flex-col text-left leading-tight min-w-0">
          {showName && (
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              {finalName}
            </span>
          )}
          {showRole && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {finalRole}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

interface StackedAvatarsProps {
  assignees: Assignee[];
  maxDisplay?: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const StackedAvatars: React.FC<StackedAvatarsProps> = ({
  assignees = [],
  maxDisplay = 3,
  size = 'sm',
  className,
}) => {
  if (!assignees || assignees.length === 0) {
    return <span className="text-[10px] text-slate-400 italic">Unassigned</span>;
  }

  const displayed = assignees.slice(0, maxDisplay);
  const remaining = assignees.length - maxDisplay;

  const tooltipText = assignees
    .map((a) => `${a.name} (${a.role})`)
    .join(', ');

  const sizeMap = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
  };

  return (
    <div
      className={twMerge('flex items-center -space-x-2 overflow-hidden py-0.5', className)}
      title={tooltipText}
    >
      {displayed.map((assignee) => (
        <div
          key={assignee.id}
          className={twMerge(
            'relative rounded-full flex items-center justify-center font-bold text-white shadow-sm ring-2 ring-slate-900 shrink-0 overflow-hidden select-none',
            sizeMap[size]
          )}
          style={{ backgroundColor: assignee.color || '#6366f1' }}
        >
          {assignee.avatarUrl ? (
            <img
              src={assignee.avatarUrl}
              alt={assignee.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span>{assignee.initials || assignee.name.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
      ))}

      {remaining > 0 && (
        <div
          className={twMerge(
            'relative rounded-full flex items-center justify-center font-bold text-slate-200 bg-slate-800 ring-2 ring-slate-900 shrink-0 select-none shadow-sm',
            sizeMap[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};
