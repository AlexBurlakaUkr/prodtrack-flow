import React from 'react';
import { Coffee, Maximize2, X } from 'lucide-react';
import { ActiveScheduleState } from '../../services/scheduleService';
import { useI18n } from '../../locales';

interface MinimizedBreakPillProps {
  state: ActiveScheduleState;
  onExpand: () => void;
  onDismiss?: () => void;
}

export const MinimizedBreakPill: React.FC<MinimizedBreakPillProps> = ({
  state,
  onExpand,
  onDismiss,
}) => {
  const { t } = useI18n();
  const { activeItem, remainingSeconds, progress } = state;

  const remainingHours = Math.floor(Math.max(0, remainingSeconds) / 3600);
  const remainingMinutes = Math.floor((Math.max(0, remainingSeconds) % 3600) / 60);
  const remainingSecs = Math.max(0, remainingSeconds) % 60;

  const formattedCountdown =
    remainingHours > 0
      ? `${String(remainingHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`
      : `${String(remainingMinutes).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;

  return (
    <div
      onClick={onExpand}
      className="fixed bottom-6 right-6 z-[9998] cursor-pointer group animate-slideLeft select-none"
      title={t('break_expand')}
    >
      <div className="relative flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-white/75 dark:bg-slate-900/85 backdrop-blur-2xl border border-white/40 dark:border-indigo-500/40 shadow-2xl shadow-indigo-950/50 hover:shadow-indigo-500/20 hover:scale-[1.03] transition-all overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
        {/* Subtle glowing accent background */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent pointer-events-none" />

        {/* Coffee Icon with soft pulsing badge */}
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 shrink-0">
          <Coffee className="w-5 h-5 animate-pulse" />
        </div>

        {/* Info Text */}
        <div className="min-w-0 pr-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
              {activeItem.title}
            </span>
            <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
              {formattedCountdown}
            </span>
          </div>

          {/* Mini progress line */}
          <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-indigo-500 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            className="p-1.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-all"
            title={t('break_expand')}
          >
            <Maximize2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          </button>

          {onDismiss && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 transition-all"
              title="Закрити перегляд"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
