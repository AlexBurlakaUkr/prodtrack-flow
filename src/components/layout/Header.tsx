import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Plus,
  Settings,
  Bell,
  Search,
  ChevronDown,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Project, BOMNode } from '../../types';
import { useI18n } from '../../locales';
import { DEMO_PROJECT_ID } from '../../services/demoData';
import { APP_CONFIG } from '../../config/AppConfig';

interface HeaderProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (projectId: string) => void;
  onOpenCreateProject: () => void;
  onOpenSettings: () => void;
  onOpenDailyCheckin: () => void;
  onLaunchDemo: () => void;
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
  onLaunchDemo,
  urgentNodesCount,
  searchQuery,
  onSearchChange,
}) => {
  const { t } = useI18n();
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full px-4 sm:px-6 py-3.5 backdrop-blur-2xl bg-white/40 dark:bg-slate-950/40 border-b border-white/20 dark:border-white/10 shadow-sm transition-all">
      <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Brand & Project Selector */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/30 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  ProdTrack
                </span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  FLOW
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                Visual BOM & MES
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-300 dark:bg-slate-800 hidden sm:block" />

          {/* Project Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/20 dark:bg-slate-900/50 hover:bg-white/30 dark:hover:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-sm transition-all max-w-[280px] sm:max-w-xs truncate"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="truncate">
                {activeProject ? activeProject.name : t('select_project')}
              </span>
              <ChevronDown className="w-3.5 h-3.5 ml-1 text-slate-400 shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {projectDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setProjectDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-2 w-80 rounded-2xl bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl z-30 py-2 animate-scaleIn">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t('select_project')}
                  </div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {projects.map((proj) => (
                      <button
                        key={proj.id}
                        onClick={() => {
                          onSelectProject(proj.id);
                          setProjectDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-indigo-500/15 transition-colors ${
                          activeProject?.id === proj.id
                            ? 'bg-indigo-500/20 text-indigo-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="truncate">{proj.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {proj.code}
                          </div>
                        </div>
                        {activeProject?.id === proj.id && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 mt-1 pt-1 px-2">
                    <button
                      onClick={() => {
                        setProjectDropdownOpen(false);
                        onOpenCreateProject();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t('create_project')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="w-full md:max-w-md relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('search_placeholder')}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-white/20 dark:bg-slate-900/40 border border-white/20 dark:border-white/10 placeholder-slate-400 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-md transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Right: Demo Quick Launcher & Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Quick Demo Launcher Button */}
          <button
            onClick={onLaunchDemo}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all hover:scale-105 active:scale-95"
            title={t('demo_project_button')}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            <span className="hidden sm:inline">{t('demo_project_button')}</span>
            <span className="sm:hidden">Demo</span>
          </button>

          {/* Daily Check-in / Reminders Drawer Trigger */}
          <button
            onClick={onOpenDailyCheckin}
            className="relative p-2 rounded-xl bg-white/10 dark:bg-slate-900/40 hover:bg-white/20 dark:hover:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-700 dark:text-slate-300 transition-all shadow-sm"
            title={t('notifications')}
          >
            <Bell className="w-4 h-4" />
            {urgentNodesCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-500 text-white shadow-lg shadow-rose-500/50 animate-pulse">
                {urgentNodesCount}
              </span>
            )}
          </button>

          {/* System Preferences / Settings */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-white/10 dark:bg-slate-900/40 hover:bg-white/20 dark:hover:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-700 dark:text-slate-300 transition-all shadow-sm hover:rotate-45"
            title={t('settings')}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
