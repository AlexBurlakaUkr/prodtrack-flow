import React from 'react';
import { Network, Package, BarChart3, CalendarRange, Sparkles } from 'lucide-react';
import { ActiveTab } from '../../types';
import { useI18n } from '../../locales';
import { GlassCard } from '../ui/GlassCard';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  ordersCount?: number;
  templatesCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  ordersCount = 0,
  templatesCount = 0,
}) => {
  const { t } = useI18n();

  const tabs: { id: ActiveTab; labelKey: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'bom', labelKey: 'tab_bom', icon: Network },
    { id: 'orders', labelKey: 'tab_orders', icon: Package },
    { id: 'templates', labelKey: 'tab_templates', icon: Sparkles },
    { id: 'analytics', labelKey: 'tab_analytics', icon: BarChart3 },
    { id: 'gantt', labelKey: 'tab_gantt', icon: CalendarRange },
  ];

  return (
    <div className="w-full px-4 sm:px-6 pt-4 pb-2 max-w-[1720px] mx-auto">
      <GlassCard
        variant="elevated"
        className="p-1.5 flex items-center justify-between sm:justify-start gap-1 sm:gap-2 overflow-x-auto custom-scrollbar rounded-2xl"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 relative whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-500/30 via-indigo-600/30 to-purple-600/30 text-indigo-300 dark:text-white border border-indigo-400/40 shadow-glass-glow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/10 dark:hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{t(tab.labelKey as any)}</span>
              {tab.id === 'orders' && ordersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/20 text-slate-200">
                  {ordersCount}
                </span>
              )}
              {tab.id === 'templates' && templatesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {templatesCount}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-400 rounded-full shadow-glow" />
              )}
            </button>
          );
        })}
      </GlassCard>
    </div>
  );
};
