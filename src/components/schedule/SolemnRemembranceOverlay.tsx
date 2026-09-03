import React from 'react';
import { ActiveScheduleState } from '../../services/scheduleService';
import { useI18n } from '../../locales';
import { X } from 'lucide-react';

interface SolemnRemembranceOverlayProps {
  state: ActiveScheduleState;
  onClosePreview?: () => void;
}

export const SolemnRemembranceOverlay: React.FC<SolemnRemembranceOverlayProps> = ({
  state,
  onClosePreview,
}) => {
  const { t } = useI18n();
  const { activeItem, remainingSeconds, totalSeconds } = state;

  // Format MM:SS
  const minutes = Math.floor(Math.max(0, remainingSeconds) / 60);
  const seconds = Math.max(0, remainingSeconds) % 60;
  const formattedCountdown = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Progress percentage (from 0 to 100)
  const elapsed = Math.max(0, totalSeconds - remainingSeconds);
  const progressPercent = Math.min(100, Math.max(0, (elapsed / Math.max(1, totalSeconds)) * 100));

  return (
    <div
      className="fixed inset-0 z-[99999] backdrop-blur-2xl bg-black/85 flex flex-col items-center justify-center p-6 text-white select-none pointer-events-auto cursor-default animate-fadeIn"
      style={{ WebkitUserSelect: 'none' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Subtle radial ambient glow behind the candle */}
      <div className="absolute w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none -translate-y-12" />

      {/* If preview mode, allow quick close */}
      {state.isPreview && onClosePreview && (
        <button
          onClick={onClosePreview}
          className="absolute top-6 right-6 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white shadow-2xl shadow-rose-600/50 border border-rose-400/50 transition-all hover:scale-105 text-xs font-bold flex items-center gap-2 z-50 cursor-pointer animate-pulse"
          title="Закрити тестовий перегляд"
        >
          <X className="w-4 h-4" />
          <span>Закрити тестовий перегляд</span>
        </button>
      )}

      <div className="relative max-w-xl w-full flex flex-col items-center text-center space-y-7 animate-scaleIn">
        {/* Ukrainian Coat of Arms (Trident) & Candle with Flickering Flame */}
        <div className="flex flex-col items-center">
          {/* Subtle Ukrainian Trident Crest */}
          <div className="mb-4 opacity-80 transition-opacity hover:opacity-100">
            <svg
              className="w-10 h-10 text-amber-400/80 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L13.5 6.5C14.5 9.5 17 11 20 11V12.5C17.5 12.5 15.5 14 14.5 16.5L13.5 19H10.5L9.5 16.5C8.5 14 6.5 12.5 4 12.5V11C7 11 9.5 9.5 10.5 6.5L12 2Z" />
              <path d="M11 7H13V15H11V7Z" />
              <path d="M7 11C7.8 11 8.5 11.5 9 12.2V16H7V11Z" />
              <path d="M17 11C16.2 11 15.5 11.5 15 12.2V16H17V11Z" />
              <path d="M10 19H14V22H10V19Z" />
            </svg>
          </div>

          {/* Stylized Candle with Animated Flame */}
          <div className="relative flex flex-col items-center">
            {/* Candle Flame Aura / Glow */}
            <div className="absolute -top-7 w-8 h-12 bg-amber-400/30 rounded-full blur-md animate-pulse" />

            {/* Candle Flame */}
            <div className="relative w-6 h-9 -mb-1 animate-pulse">
              <svg viewBox="0 0 24 36" className="w-full h-full drop-shadow-[0_0_16px_rgba(245,158,11,0.9)]">
                {/* Outer amber flame */}
                <path
                  d="M12 0C12 0 4 12 4 22C4 28 7.5 32 12 32C16.5 32 20 28 20 22C20 12 12 0 12 0Z"
                  fill="#f59e0b"
                />
                {/* Inner bright yellow-white core */}
                <path
                  d="M12 8C12 8 7 16 7 23C7 27 9.2 30 12 30C14.8 30 17 27 17 23C17 16 12 8 12 8Z"
                  fill="#fef08a"
                />
                {/* Wick */}
                <line x1="12" y1="28" x2="12" y2="36" stroke="#451a03" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            {/* Candle Body */}
            <div className="w-9 h-20 rounded-t-sm rounded-b-md bg-gradient-to-b from-amber-100 via-amber-200/90 to-amber-300/80 shadow-[0_0_20px_rgba(251,191,36,0.3)] relative overflow-hidden border border-amber-200/40">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-200/90 rounded-full shadow-inner" />
              <div className="absolute inset-y-0 left-1 w-2 bg-white/40 blur-[1px]" />
            </div>

            {/* Candle Base Plate */}
            <div className="w-20 h-2.5 rounded-full bg-gradient-to-r from-amber-900 via-amber-700 to-amber-900 shadow-lg border border-amber-600/50 mt-[-2px]" />
          </div>
        </div>

        {/* Title and Subtitle */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-wider bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent uppercase drop-shadow">
            {activeItem.title || t('solemn_title')}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-medium max-w-lg mx-auto leading-relaxed drop-shadow-sm">
            {activeItem.description || t('solemn_subtitle')}
          </p>
        </div>

        {/* Large 60-Second Countdown Clock */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="px-8 py-4 rounded-3xl bg-black/40 border border-amber-500/30 shadow-[0_0_35px_rgba(245,158,11,0.25)] backdrop-blur-xl">
            <span className="font-mono text-5xl sm:text-6xl font-black text-amber-300 tracking-widest drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]">
              {formattedCountdown}
            </span>
          </div>

          {/* Progress Indicator Bar */}
          <div className="w-72 sm:w-80 h-1.5 bg-white/10 rounded-full overflow-hidden mt-4 border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-1000 ease-linear rounded-full shadow-[0_0_10px_rgba(245,158,11,0.8)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Locked UI Notice */}
        <div className="pt-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>
              {t('solemn_unlock_notice')} {activeItem.endTime}:00
            </span>
          </div>
        </div>

        {/* Bottom Close Button in Preview Mode */}
        {state.isPreview && onClosePreview && (
          <div className="pt-2">
            <button
              onClick={onClosePreview}
              className="px-6 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all hover:scale-105 flex items-center justify-center gap-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Закрити тестовий перегляд</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
