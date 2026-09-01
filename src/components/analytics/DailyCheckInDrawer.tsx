import React from 'react';
import {
  Bell,
  X,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { BOMNode } from '../../types';
import { useI18n } from '../../locales';
import { APP_CONFIG } from '../../config/AppConfig';
import { GlassCard } from '../ui/GlassCard';
import { ProgressBar } from '../ui/ProgressBar';
import { Avatar } from '../ui/Avatar';
import { differenceInDays, parseISO } from 'date-fns';

interface DailyCheckInDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  urgentNodes: BOMNode[];
  onUpdateProgress: (nodeId: string, progress: number) => void;
}

export const DailyCheckInDrawer: React.FC<DailyCheckInDrawerProps> = ({
  isOpen,
  onClose,
  urgentNodes,
  onUpdateProgress,
}) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Drawer */}
      <GlassCard
        variant="elevated"
        className="w-full max-w-lg z-10 h-full rounded-none rounded-l-3xl bg-white/90 dark:bg-slate-900/95 backdrop-blur-3xl border-l border-white/20 shadow-2xl flex flex-col animate-slideLeft overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-black/10 dark:border-white/10 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t('daily_checkin_title')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('checkin_alerts_count', { count: urgentNodes.length })}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtitle instructions */}
        <div className="px-6 py-3 bg-rose-500/10 border-b border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
          <span>{t('daily_checkin_subtitle')}</span>
        </div>

        {/* List of Urgent / Approaching Deadline Items */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
          {urgentNodes.length > 0 ? (
            urgentNodes.map((node) => {
              let daysDiff = 0;
              try {
                const due = parseISO(node.dueDate);
                daysDiff = differenceInDays(due, new Date());
              } catch (e) {
                // Ignore
              }

              const levelConf =
                APP_CONFIG.LEVELS.find((l) => l.level === node.level) || APP_CONFIG.LEVELS[0];

              return (
                <GlassCard
                  key={node.id}
                  variant="elevated"
                  className="p-4 border-l-4 border-l-rose-500 bg-white/15 dark:bg-slate-800/60"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${levelConf.badgeBg}`}
                    >
                      L{node.level}: {node.code}
                    </span>
                    <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {daysDiff < 0
                        ? t('overdue_by_days', { days: Math.abs(daysDiff) })
                        : t('due_in_days', { days: daysDiff })}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                    {node.title}
                  </h4>

                  <div className="flex items-center justify-between mb-3">
                    <Avatar assignee={node.assignee} size="xs" showName={true} />
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                      {node.progress}%
                    </span>
                  </div>

                  {/* Quick-edit Slider */}
                  <div className="space-y-2 bg-black/20 p-2.5 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                      <span>{t('quick_progress_update')}</span>
                      <span>{node.progress}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={node.progress}
                      onChange={(e) => onUpdateProgress(node.id, Number(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        {[25, 50, 75].map((val) => (
                          <button
                            key={val}
                            onClick={() => onUpdateProgress(node.id, val)}
                            className="px-2 py-0.5 rounded text-[10px] bg-white/10 hover:bg-white/20 text-slate-300 font-mono"
                          >
                            {val}%
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => onUpdateProgress(node.id, 100)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{t('mark_complete')}</span>
                      </button>
                    </div>
                  </div>
                </GlassCard>
              );
            })
          ) : (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-70" />
              <h4 className="text-sm font-bold text-white mb-1">
                {t('no_urgent_items')}
              </h4>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25"
          >
            {t('close_drawer')}
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
