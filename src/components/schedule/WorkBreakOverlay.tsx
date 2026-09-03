import React from 'react';
import { Coffee, Clock, Minimize2, CheckCircle, Sparkles, X } from 'lucide-react';
import { ActiveScheduleState } from '../../services/scheduleService';
import { useI18n } from '../../locales';

interface WorkBreakOverlayProps {
  state: ActiveScheduleState;
  onMinimize: () => void;
  onDismiss?: () => void;
}

export const WorkBreakOverlay: React.FC<WorkBreakOverlayProps> = ({
  state,
  onMinimize,
  onDismiss,
}) => {
  const { t } = useI18n();
  const { activeItem, remainingSeconds, totalSeconds, progress } = state;

  // Formatting hours, minutes, and seconds
  const remainingHours = Math.floor(Math.max(0, remainingSeconds) / 3600);
  const remainingMinutes = Math.floor((Math.max(0, remainingSeconds) % 3600) / 60);
  const remainingSecs = Math.max(0, remainingSeconds) % 60;

  // Digital countdown clock (HH:MM:SS or MM:SS)
  const formattedCountdown =
    remainingHours > 0
      ? `${String(remainingHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`
      : `${String(remainingMinutes).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;

  // Time remaining human-readable label
  const remainingLabel =
    remainingHours > 0
      ? `${remainingHours} год ${remainingMinutes} хв`
      : remainingMinutes > 0
      ? `${remainingMinutes} хв ${remainingSecs} сек`
      : `${remainingSecs} сек`;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 sm:p-6 bg-black/60 dark:bg-black/75 backdrop-blur-xl animate-fadeIn"
      style={{ WebkitUserSelect: 'none' }}
      onClick={state.isPreview ? onDismiss : undefined}
    >
      {/* Apple Glass Frosted Card */}
      <div
        className="relative w-full max-w-lg rounded-3xl p-6 sm:p-8 bg-white/20 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/30 dark:border-white/15 shadow-2xl shadow-indigo-950/40 text-center space-y-6 animate-scaleIn overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient background light spot */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Floating Badge & Actions */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 dark:bg-indigo-500/20 border border-indigo-400/30 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>{t('schedule_break_badge')}</span>
            </div>

            {state.isPreview && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold uppercase tracking-wider animate-pulse">
                Тест
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onMinimize}
              className="p-2 rounded-2xl bg-white/15 dark:bg-slate-800/60 hover:bg-white/25 dark:hover:bg-slate-700/80 border border-white/20 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold group"
              title={t('break_minimize')}
            >
              <Minimize2 className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">{t('break_minimize')}</span>
            </button>

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-2 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 hover:text-rose-300 transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold"
                title={state.isPreview ? 'Закрити тестовий перегляд' : t('close')}
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">{state.isPreview ? 'Закрити тест' : t('close')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Big Coffee / Rest Icon */}
        <div className="relative inline-flex items-center justify-center mx-auto z-10">
          <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 to-sky-500 rounded-3xl blur-md opacity-40 animate-pulse" />
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-indigo-500/30 via-indigo-600/20 to-sky-500/30 border border-white/30 dark:border-white/20 flex items-center justify-center text-indigo-600 dark:text-indigo-300 shadow-glass-glow">
            <Coffee className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow" />
          </div>
        </div>

        {/* Title & Time Window */}
        <div className="space-y-1.5 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {activeItem.title}
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
            {activeItem.title} • {t('break_remaining')} {remainingLabel}
          </p>
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-xl border border-indigo-400/20 mt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{activeItem.startTime} – {activeItem.endTime}</span>
          </div>
        </div>

        {/* Digital Countdown Clock */}
        <div className="relative z-10 py-1">
          <div className="inline-block px-8 py-3.5 rounded-2xl bg-black/5 dark:bg-black/40 border border-white/20 dark:border-white/10 shadow-inner">
            <span className="font-mono text-4xl sm:text-5xl font-black text-indigo-600 dark:text-indigo-300 tracking-wider">
              {formattedCountdown}
            </span>
          </div>
        </div>

        {/* Progress Bar & Meta Details */}
        <div className="space-y-2 relative z-10">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            <span>{t('break_progress')}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-3 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/20 dark:border-white/10">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-sky-400 rounded-full transition-all duration-1000 ease-linear shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 relative z-10 border-t border-black/10 dark:border-white/10">
          {state.isPreview ? (
            <button
              onClick={onDismiss}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              <span>Закрити тестовий перегляд</span>
            </button>
          ) : (
            <>
              <button
                onClick={onMinimize}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 flex items-center justify-center gap-2"
              >
                <Minimize2 className="w-4 h-4" />
                <span>{t('break_minimize')}</span>
              </button>

              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all"
                >
                  {t('break_resume_work')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
