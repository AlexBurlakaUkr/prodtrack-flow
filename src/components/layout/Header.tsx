import React, { useState } from 'react';
import {
  Layers,
  Search,
  Settings,
  Bell,
  ChevronDown,
  Plus,
  Boxes,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Project } from '../../types';
import { useI18n } from '../../locales';
import { GlassCard } from '../ui/GlassCard';

interface HeaderProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (projectId: string) => void;
  onOpenCreateProject: () => void;
  onOpenSettings: () => void;
  onOpenDailyCheckin: () => void;
  onOpenTemplates: () => void;
  templatesCount?: number;
  urgentNodesCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onOpenCreateProject,
  onOpenSettings,
  onOpenDailyCheckin,
  onOpenTemplates,
  templatesCount = 0,
  urgentNodesCount,
  searchQuery,
  onSearchChange,
}) => {
  const { t } = useI18n();
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full px-4 sm:px-6 py-3 max-w-[1720px] mx-auto">
      <GlassCard
        variant="elevated"
        className="px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 shadow-glass-md rounded-2xl"
      >
        {/* Left: App Logo & Project Switcher Dropdown */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3 sm:gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-glass-glow">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xs sm:text-sm font-extrabold tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
                {t('app_subtitle')}
              </h1>
            </div>
          </div>

          {/* Project Switcher Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 dark:bg-slate-800/60 hover:bg-white/20 dark:hover:bg-slate-700/60 border border-white/20 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all shadow-sm max-w-[240px] sm:max-w-[280px]"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">
                {activeProject ? activeProject.name : t('select_project')}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-auto" />
            </button>

            {/* Dropdown Menu */}
            {projectDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setProjectDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl p-2 z-30 space-y-1 animate-scaleIn">
                  <div className="px-2 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {t('switch_project')}
                  </div>

                  <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1">
                    {projects.map((proj) => {
                      const isSelected = activeProject?.id === proj.id;
                      return (
                        <button
                          key={proj.id}
                          onClick={() => {
                            onSelectProject(proj.id);
                            setProjectDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-all ${
                            isSelected
                              ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-white/10 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="truncate">{proj.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {proj.code}
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-1.5 border-t border-white/10">
                    <button
                      onClick={() => {
                        setProjectDropdownOpen(false);
                        onOpenCreateProject();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('create_project')}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="w-full md:w-auto md:flex-1 md:max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('search_placeholder')}
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-white/15 dark:bg-slate-800/40 border border-white/20 dark:border-white/10 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all"
          />
        </div>

        {/* Right: Templates Manager, Daily Alerts Bell & Settings */}
        <div className="flex items-center gap-2 shrink-0 justify-end w-full md:w-auto">
          {/* Templates Library Launcher Button */}
          <button
            onClick={onOpenTemplates}
            className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-xs font-semibold text-purple-300 flex items-center gap-1.5 transition-all shadow-sm"
            title={t('templates_title')}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">{t('tab_templates')}</span>
            {templatesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-500/30 text-purple-200">
                {templatesCount}
              </span>
            )}
          </button>

          {/* Daily Alert Bell */}
          <button
            onClick={onOpenDailyCheckin}
            className="relative p-2 rounded-xl bg-white/10 dark:bg-slate-800/60 hover:bg-white/20 dark:hover:bg-slate-700/60 border border-white/20 dark:border-white/10 text-slate-700 dark:text-slate-300 transition-all"
            title={t('notifications')}
          >
            <Bell className="w-4 h-4" />
            {urgentNodesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-bounce shadow-md">
                {urgentNodesCount}
              </span>
            )}
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-white/10 dark:bg-slate-800/60 hover:bg-white/20 dark:hover:bg-slate-700/60 border border-white/20 dark:border-white/10 text-slate-700 dark:text-slate-300 transition-all"
            title={t('settings')}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </GlassCard>
    </header>
  );
};
