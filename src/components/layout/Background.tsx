import React from 'react';
import { GradientTheme, ThemeMode } from '../../types';
import { APP_CONFIG } from '../../config/AppConfig';

interface BackgroundProps {
  theme: GradientTheme;
  mode: ThemeMode;
}

export const Background: React.FC<BackgroundProps> = ({ theme, mode }) => {
  const gradientConfig = APP_CONFIG.GRADIENTS.find(g => g.id === theme) || APP_CONFIG.GRADIENTS[0];

  const isDark = mode === 'dark';

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none transition-colors duration-700">
      {/* Base gradient layer */}
      <div
        className={`absolute inset-0 bg-gradient-to-br transition-all duration-1000 ${
          isDark
            ? gradientConfig.bgClass
            : 'from-slate-100 via-indigo-50/50 to-sky-100/60'
        }`}
      />

      {/* Dynamic Animated Glowing Glass Orbs */}
      <div
        className={`absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-3xl opacity-60 animate-float transition-all duration-1000 ${
          isDark ? gradientConfig.orb1 : 'bg-indigo-300/30'
        }`}
        style={{ animationDuration: '14s' }}
      />
      <div
        className={`absolute top-1/4 -right-32 w-[550px] h-[550px] rounded-full blur-3xl opacity-50 animate-float transition-all duration-1000 ${
          isDark ? gradientConfig.orb2 : 'bg-sky-300/30'
        }`}
        style={{ animationDuration: '18s', animationDelay: '-4s' }}
      />
      <div
        className={`absolute -bottom-32 left-1/3 w-[650px] h-[650px] rounded-full blur-3xl opacity-50 animate-float transition-all duration-1000 ${
          isDark ? gradientConfig.orb3 : 'bg-purple-300/25'
        }`}
        style={{ animationDuration: '22s', animationDelay: '-8s' }}
      />

      {/* Subtle Noise / Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '28px 28px',
        }}
      />
    </div>
  );
};
