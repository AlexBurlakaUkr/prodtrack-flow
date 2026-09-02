import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Users,
  Activity,
  ArrowUpRight,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Check,
  ShieldAlert,
  ArrowDownWideNarrow,
  Sparkles,
  X,
  Tv,
  Projector,
} from 'lucide-react';
import { BOMNode, ProductionOrder, Project, NodeLevel, Assignee } from '../../types';
import { useI18n } from '../../locales';
import { APP_CONFIG } from '../../config/AppConfig';
import { GlassCard } from '../ui/GlassCard';
import { ProgressBar } from '../ui/ProgressBar';
import { Avatar, StackedAvatars } from '../ui/Avatar';
import { StatusBadge } from '../ui/StatusBadge';
import { differenceInDays, parseISO } from 'date-fns';

interface AnalyticsDashboardProps {
  project: Project;
  nodes: BOMNode[];
  orders: ProductionOrder[];
  onOpenCheckin: () => void;
}

export type AnalyticsWidgetId =
  | 'kpi_overview'
  | 'bottlenecks'
  | 'progress_by_level'
  | 'detailed_components'
  | 'team_workload';

const ALL_WIDGETS: { id: AnalyticsWidgetId; labelKey: string }[] = [
  { id: 'kpi_overview', labelKey: 'widget_kpi_overview' },
  { id: 'bottlenecks', labelKey: 'widget_bottlenecks' },
  { id: 'progress_by_level', labelKey: 'widget_progress_by_level' },
  { id: 'detailed_components', labelKey: 'widget_detailed_components' },
  { id: 'team_workload', labelKey: 'widget_team_workload' },
];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  project,
  nodes,
  orders,
  onOpenCheckin,
}) => {
  const { t } = useI18n();

  // Widget visibility state with localStorage persistence
  const [visibleWidgets, setVisibleWidgets] = useState<Set<AnalyticsWidgetId>>(() => {
    try {
      const saved = localStorage.getItem('analytics_widget_visibility');
      if (saved) {
        return new Set(JSON.parse(saved) as AnalyticsWidgetId[]);
      }
    } catch {}
    return new Set<AnalyticsWidgetId>([
      'kpi_overview',
      'bottlenecks',
      'progress_by_level',
      'detailed_components',
      'team_workload',
    ]);
  });

  const [widgetDropdownOpen, setWidgetDropdownOpen] = useState(false);
  const [fullScreenWidget, setFullScreenWidget] = useState<AnalyticsWidgetId | null>(null);

  // Live time for projector mode
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  useEffect(() => {
    if (!fullScreenWidget) return;
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [fullScreenWidget]);

  // Granular component progress filters & sorting
  const [componentLevelFilter, setComponentLevelFilter] = useState<'all' | NodeLevel>('all');
  const [componentSort, setComponentSort] = useState<'lowest_progress' | 'highest_hours' | 'level'>('lowest_progress');
  const [componentSearch, setComponentSearch] = useState('');

  // Operator task lists expanded state (Set of assignee IDs)
  const [expandedWorkloads, setExpandedWorkloads] = useState<Set<string>>(new Set());

  // Save visibility preferences
  useEffect(() => {
    localStorage.setItem(
      'analytics_widget_visibility',
      JSON.stringify(Array.from(visibleWidgets))
    );
  }, [visibleWidgets]);

  // Escape key listener to close full screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullScreenWidget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleWidgetVisibility = (id: AnalyticsWidgetId) => {
    setVisibleWidgets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev; // Keep at least one
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleWorkloadExpand = (assigneeId: string) => {
    setExpandedWorkloads((prev) => {
      const next = new Set(prev);
      if (next.has(assigneeId)) {
        next.delete(assigneeId);
      } else {
        next.add(assigneeId);
      }
      return next;
    });
  };

  // Root node progress
  const rootNode = nodes.find((n) => n.parentId === null) || nodes[0];
  const overallBOMProgress = rootNode ? rootNode.progress : 0;

  // Level-by-level stats
  const levelStats = useMemo(() => {
    return APP_CONFIG.LEVELS.map((lvl) => {
      const levelNodes = nodes.filter((n) => n.level === lvl.level);
      const count = levelNodes.length;
      const avgProgress =
        count > 0
          ? Math.round(
              levelNodes.reduce((acc, curr) => acc + curr.progress, 0) / count
            )
          : 0;
      const completedCount = levelNodes.filter((n) => n.progress === 100).length;
      const delayedCount = levelNodes.filter((n) => n.status === 'delayed').length;
      const totalHours = Math.round(
        levelNodes.reduce((acc, curr) => acc + (curr.normHours || 0), 0) * 10
      ) / 10;

      return {
        level: lvl.level,
        nameKey: lvl.key,
        color: lvl.color,
        count,
        avgProgress,
        completedCount,
        delayedCount,
        totalHours,
      };
    });
  }, [nodes]);

  // Risk & Bottlenecks list (Sorted by highest norm-hours first)
  const bottlenecks = useMemo(() => {
    const list: { node: BOMNode; reason: 'delayed' | 'approaching'; daysLeft?: number }[] = [];

    nodes.forEach((n) => {
      if (n.status === 'delayed') {
        list.push({ node: n, reason: 'delayed' });
      } else if (n.progress < 80) {
        try {
          const due = parseISO(n.dueDate);
          const days = differenceInDays(due, new Date());
          if (days <= 2) {
            list.push({ node: n, reason: 'approaching', daysLeft: days });
          }
        } catch {}
      }
    });

    // Sort by normHours descending
    return list.sort((a, b) => (b.node.normHours || 0) - (a.node.normHours || 0));
  }, [nodes]);

  // Total Hours at Risk
  const totalHoursAtRisk = useMemo(() => {
    return Math.round(
      bottlenecks.reduce((acc, curr) => acc + (curr.node.normHours || 0), 0) * 10
    ) / 10;
  }, [bottlenecks]);

  // Detailed Components list filtered and sorted
  const sortedDetailedComponents = useMemo(() => {
    return nodes
      .filter((n) => {
        if (componentLevelFilter !== 'all' && n.level !== componentLevelFilter) return false;
        if (componentSearch.trim()) {
          const q = componentSearch.toLowerCase();
          const matchTitle = n.title.toLowerCase().includes(q);
          const matchCode = n.code.toLowerCase().includes(q);
          const matchAssignee = (n.assignees || []).some((a) =>
            a.name.toLowerCase().includes(q)
          );
          if (!matchTitle && !matchCode && !matchAssignee) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (componentSort === 'lowest_progress') {
          return a.progress - b.progress;
        }
        if (componentSort === 'highest_hours') {
          return (b.normHours || 0) - (a.normHours || 0);
        }
        return a.level - b.level || a.orderIndex - b.orderIndex;
      });
  }, [nodes, componentLevelFilter, componentSort, componentSearch]);

  // Assignee workload breakdown with individual task lists
  const assigneeStats = useMemo(() => {
    return APP_CONFIG.DEFAULT_ASSIGNEES.map((assignee) => {
      const assignedNodes = nodes.filter((n) => {
        return (
          (n.assignees && n.assignees.some((a) => a.id === assignee.id)) ||
          n.assignee?.id === assignee.id
        );
      });
      const count = assignedNodes.length;
      const totalHours = Math.round(
        assignedNodes.reduce((acc, curr) => acc + (curr.normHours || 0), 0) * 10
      ) / 10;
      const avgProgress =
        count > 0
          ? Math.round(
              assignedNodes.reduce((acc, curr) => acc + curr.progress, 0) / count
            )
          : 0;
      const delayedCount = assignedNodes.filter((n) => n.status === 'delayed').length;
      const completedCount = assignedNodes.filter((n) => n.progress === 100).length;

      return {
        assignee,
        count,
        totalHours,
        avgProgress,
        delayedCount,
        completedCount,
        tasks: assignedNodes,
      };
    });
  }, [nodes]);

  const totalCompletedNodes = nodes.filter((n) => n.progress === 100).length;
  const totalOnSchedule = nodes.filter(
    (n) => n.status === 'in_progress' || n.status === 'completed'
  ).length;

  // Render Widget Content helper for both standard and full-screen presentation modes
  const renderWidgetContent = (id: AnalyticsWidgetId, isFullscreen: boolean = false) => {
    switch (id) {
      case 'kpi_overview':
        return (
          <div
            className={`grid grid-cols-2 ${
              isFullscreen ? 'lg:grid-cols-4 gap-6 sm:gap-8 h-full py-4' : 'sm:grid-cols-4 gap-4'
            }`}
          >
            <div
              className={`rounded-3xl border flex flex-col justify-between ${
                isFullscreen
                  ? 'p-8 sm:p-10 shadow-2xl bg-[#090e1f] border-indigo-500/30'
                  : 'p-4 bg-white/10 dark:bg-slate-800/40 border-white/10'
              }`}
            >
              <div className={`${isFullscreen ? 'text-sm sm:text-base font-bold text-slate-300' : 'text-xs font-semibold text-slate-400'}`}>
                {t('kpi_overall_progress')}
              </div>
              <div className="flex items-baseline gap-3 my-4">
                <span
                  className={`font-black text-indigo-400 tabular-nums ${
                    isFullscreen ? 'text-6xl sm:text-8xl tracking-tight' : 'text-2xl sm:text-3xl font-extrabold'
                  }`}
                >
                  {overallBOMProgress}%
                </span>
                <span className={`text-emerald-400 font-bold flex items-center ${isFullscreen ? 'text-sm' : 'text-[11px]'}`}>
                  <ArrowUpRight className={isFullscreen ? 'w-5 h-5' : 'w-3 h-3'} />
                  Roll-up
                </span>
              </div>
              <ProgressBar
                progress={overallBOMProgress}
                size={isFullscreen ? 'md' : 'xs'}
                className="mt-2"
              />
            </div>

            <div
              className={`rounded-3xl border flex flex-col justify-between ${
                isFullscreen
                  ? 'p-8 sm:p-10 shadow-2xl bg-[#14080e] border-rose-500/30'
                  : 'p-4 bg-white/10 dark:bg-slate-800/40 border-white/10'
              }`}
            >
              <div className={`${isFullscreen ? 'text-sm sm:text-base font-bold text-slate-300' : 'text-xs font-semibold text-slate-400'}`}>
                {t('kpi_delayed_nodes')}
              </div>
              <div
                className={`font-black text-rose-400 my-4 ${
                  isFullscreen ? 'text-6xl sm:text-8xl tracking-tight' : 'text-2xl sm:text-3xl font-extrabold'
                }`}
              >
                {bottlenecks.length}
              </div>
              <div className={`text-rose-400 font-semibold ${isFullscreen ? 'text-sm' : 'text-[11px]'}`}>
                {totalHoursAtRisk} {t('norm_hours_unit')} under risk
              </div>
            </div>

            <div
              className={`rounded-3xl border flex flex-col justify-between ${
                isFullscreen
                  ? 'p-8 sm:p-10 shadow-2xl bg-[#061412] border-emerald-500/30'
                  : 'p-4 bg-white/10 dark:bg-slate-800/40 border-white/10'
              }`}
            >
              <div className={`${isFullscreen ? 'text-sm sm:text-base font-bold text-slate-300' : 'text-xs font-semibold text-slate-400'}`}>
                {t('kpi_on_schedule')}
              </div>
              <div
                className={`font-black text-emerald-400 my-4 ${
                  isFullscreen ? 'text-6xl sm:text-8xl tracking-tight' : 'text-2xl sm:text-3xl font-extrabold'
                }`}
              >
                {totalOnSchedule} / {nodes.length}
              </div>
              <div className={`text-slate-300 font-semibold ${isFullscreen ? 'text-sm' : 'text-[11px]'}`}>
                {Math.round((totalOnSchedule / Math.max(1, nodes.length)) * 100)}% on track
              </div>
            </div>

            <div
              className={`rounded-3xl border flex flex-col justify-between ${
                isFullscreen
                  ? 'p-8 sm:p-10 shadow-2xl bg-[#08111f] border-sky-500/30'
                  : 'p-4 bg-white/10 dark:bg-slate-800/40 border-white/10'
              }`}
            >
              <div className={`${isFullscreen ? 'text-sm sm:text-base font-bold text-slate-300' : 'text-xs font-semibold text-slate-400'}`}>
                {t('kpi_completed_parts')}
              </div>
              <div
                className={`font-black text-sky-400 my-4 ${
                  isFullscreen ? 'text-6xl sm:text-8xl tracking-tight' : 'text-2xl sm:text-3xl font-extrabold'
                }`}
              >
                {totalCompletedNodes} / {nodes.length}
              </div>
              <div className={`text-sky-300 font-semibold ${isFullscreen ? 'text-sm' : 'text-[11px]'}`}>
                {Math.round((totalCompletedNodes / Math.max(1, nodes.length)) * 100)}% 100% completed
              </div>
            </div>
          </div>
        );

      case 'progress_by_level':
        return (
          <div className={`space-y-4 pt-1 ${isFullscreen ? 'max-w-6xl mx-auto w-full py-6 space-y-6' : ''}`}>
            {levelStats.map((item) => (
              <div
                key={item.level}
                className={`rounded-2xl bg-white/10 dark:bg-slate-800/30 border border-white/10 space-y-3 transition-all ${
                  isFullscreen ? 'p-6 sm:p-8 hover:border-indigo-400/50' : 'p-3.5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full ${isFullscreen ? 'w-4 h-4' : 'w-2.5 h-2.5'}`}
                      style={{ backgroundColor: item.color }}
                    />
                    <span className={`font-extrabold text-slate-800 dark:text-slate-100 ${isFullscreen ? 'text-lg sm:text-xl' : 'text-xs'}`}>
                      L{item.level}: {t(item.nameKey as any)}
                    </span>
                    <span className={`text-slate-400 ${isFullscreen ? 'text-sm font-semibold' : 'text-[11px]'}`}>
                      ({item.count} items • {item.totalHours} {t('norm_hours_unit')})
                    </span>
                  </div>

                  <span className={`font-mono font-black text-slate-900 dark:text-white tabular-nums ${isFullscreen ? 'text-2xl sm:text-3xl text-indigo-400' : 'text-xs font-bold'}`}>
                    {item.avgProgress}%
                  </span>
                </div>

                <ProgressBar progress={item.avgProgress} size={isFullscreen ? 'md' : 'sm'} />

                <div className={`flex items-center justify-between text-slate-400 pt-1 ${isFullscreen ? 'text-sm font-semibold' : 'text-[11px]'}`}>
                  <span>{item.completedCount} completed</span>
                  {item.delayedCount > 0 && (
                    <span className="text-rose-400 font-bold">
                      {item.delayedCount} delayed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case 'bottlenecks':
        return (
          <div
            className={`space-y-3 flex-1 overflow-y-auto custom-scrollbar pt-1 ${
              isFullscreen
                ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 p-2 space-y-0 max-h-[82vh]'
                : 'max-h-[420px]'
            }`}
          >
            {bottlenecks.length > 0 ? (
              bottlenecks.map(({ node, reason, daysLeft }) => (
                <div
                  key={node.id}
                  className={`rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col justify-between gap-3 hover:border-rose-500/40 transition-all ${
                    isFullscreen ? 'p-5 sm:p-6 shadow-lg' : 'p-3.5'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-rose-300">
                          {node.code}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase border bg-rose-500/20 border-rose-500/30 text-rose-300">
                          L{node.level}
                        </span>
                        {reason === 'delayed' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/30 text-rose-200 border border-rose-500/40">
                            {t('risk_delayed')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/30 text-amber-200 border border-amber-500/40">
                            {t('risk_approaching_deadline', { days: daysLeft || 0 })}
                          </span>
                        )}
                      </div>

                      <span className="font-mono font-bold text-sky-300 text-xs sm:text-sm">
                        ⏱ {node.normHours} {t('norm_hours_unit')}
                      </span>
                    </div>

                    <div className={`font-bold text-slate-900 dark:text-white ${isFullscreen ? 'text-base' : 'text-xs'}`}>
                      {node.title}
                    </div>

                    {node.notes && (
                      <p className={`text-slate-400 line-clamp-2 ${isFullscreen ? 'text-xs' : 'text-[11px]'}`}>
                        {node.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-rose-500/20 text-xs">
                    <Avatar assignee={node.assignee} size={isFullscreen ? 'sm' : 'xs'} showName={true} />
                    <span className={`font-mono font-black text-rose-300 ${isFullscreen ? 'text-base' : 'text-xs'}`}>
                      {node.progress}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center my-auto col-span-full">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-3 opacity-80" />
                <h4 className="text-lg font-bold text-white mb-1">
                  {t('no_bottlenecks')}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  All production items are progressing on schedule without critical delays.
                </p>
              </div>
            )}
          </div>
        );

      case 'detailed_components':
        return (
          <div className="space-y-4 pt-1 h-full flex flex-col">
            {/* Filter / Sort Bar inside Panel */}
            <div className="flex items-center justify-between gap-3 flex-wrap text-xs pb-3 border-b border-white/10 shrink-0">
              {/* Level Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 mr-1">
                  Level:
                </span>
                {(['all', 1, 2, 3, 4, 5] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setComponentLevelFilter(lvl as any)}
                    className={`px-3 py-1 rounded-xl font-bold text-xs transition-all ${
                      componentLevelFilter === lvl
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {lvl === 'all' ? 'All Levels' : `L${lvl}`}
                  </button>
                ))}
              </div>

              {/* Sort & Search */}
              <div className="flex items-center gap-3 flex-wrap ml-auto">
                <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                  <ArrowDownWideNarrow className="w-4 h-4 text-indigo-400" />
                  <select
                    value={componentSort}
                    onChange={(e) => setComponentSort(e.target.value as any)}
                    className="bg-transparent text-white text-xs outline-none cursor-pointer font-semibold"
                  >
                    <option value="lowest_progress" className="bg-slate-900">
                      {t('sort_lowest_progress')}
                    </option>
                    <option value="highest_hours" className="bg-slate-900">
                      {t('sort_highest_hours')}
                    </option>
                    <option value="level" className="bg-slate-900">
                      {t('sort_level_order')}
                    </option>
                  </select>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={componentSearch}
                    onChange={(e) => setComponentSearch(e.target.value)}
                    placeholder="Search component..."
                    className="pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white/10 border border-white/10 text-white outline-none w-48 sm:w-60"
                  />
                </div>
              </div>
            </div>

            {/* Components Rows List */}
            <div
              className={`space-y-3 overflow-y-auto custom-scrollbar pr-1 flex-1 ${
                isFullscreen ? 'max-h-[78vh]' : 'max-h-[480px]'
              }`}
            >
              {sortedDetailedComponents.map((node) => {
                const levelConfig =
                  APP_CONFIG.LEVELS.find((l) => l.level === node.level) || APP_CONFIG.LEVELS[0];
                const assigneesList =
                  node.assignees && node.assignees.length > 0
                    ? node.assignees
                    : node.assignee
                    ? [node.assignee]
                    : [];

                return (
                  <div
                    key={node.id}
                    className={`rounded-2xl bg-white/10 dark:bg-slate-800/40 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-white/20 transition-all ${
                      isFullscreen ? 'p-4 sm:p-5' : 'p-3'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <span
                        className={`px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase border shrink-0 ${levelConfig.badgeBg}`}
                      >
                        L{node.level}
                      </span>

                      {node.image && (
                        <img
                          src={node.image}
                          alt={node.title}
                          className="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5 border border-white/10 shrink-0"
                        />
                      )}

                      <div className="min-w-0">
                        <div className={`font-bold text-slate-900 dark:text-white truncate ${isFullscreen ? 'text-sm sm:text-base' : 'text-xs'}`}>
                          {node.title}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {node.code}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                      <StatusBadge status={node.status} size={isFullscreen ? 'sm' : 'xs'} />

                      <div className={`${isFullscreen ? 'w-44 sm:w-56 space-y-1.5' : 'w-28 sm:w-36 space-y-1'}`}>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-extrabold text-slate-200">{node.progress}%</span>
                          <span className="text-sky-300 font-mono font-bold">
                            ⏱ {node.normHours} {t('norm_hours_unit')}
                          </span>
                        </div>
                        <ProgressBar progress={node.progress} status={node.status} size={isFullscreen ? 'sm' : 'xs'} />
                      </div>

                      <StackedAvatars assignees={assigneesList} size={isFullscreen ? 'sm' : 'xs'} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'team_workload':
        return (
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 pt-1 ${
              isFullscreen ? 'max-h-[82vh] overflow-y-auto custom-scrollbar p-1' : ''
            }`}
          >
            {assigneeStats.map((item) => {
              const isExpanded = isFullscreen ? true : expandedWorkloads.has(item.assignee.id);
              const visibleTasks = isExpanded ? item.tasks : item.tasks.slice(0, 2);

              return (
                <div
                  key={item.assignee.id}
                  className={`rounded-2xl bg-white/10 dark:bg-slate-800/30 border border-white/10 flex flex-col justify-between gap-4 hover:border-white/20 transition-all ${
                    isFullscreen ? 'p-5 sm:p-6' : 'p-4'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar assignee={item.assignee} size={isFullscreen ? 'lg' : 'md'} />
                    <div className="min-w-0">
                      <div className={`font-bold text-slate-900 dark:text-white truncate ${isFullscreen ? 'text-sm sm:text-base' : 'text-xs'}`}>
                        {item.assignee.name}
                      </div>
                      <div className={`text-slate-400 truncate ${isFullscreen ? 'text-xs' : 'text-[10px]'}`}>
                        {item.assignee.role}
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric */}
                  <div className="space-y-2">
                    <div className={`flex items-center justify-between text-slate-400 ${isFullscreen ? 'text-xs font-semibold' : 'text-[11px]'}`}>
                      <span>{t('total_assigned')}</span>
                      <span className="font-bold text-slate-200">
                        {item.count} items ({item.totalHours} {t('norm_hours_unit')})
                      </span>
                    </div>
                    <div className={`flex items-center justify-between text-slate-400 ${isFullscreen ? 'text-xs font-semibold' : 'text-[11px]'}`}>
                      <span>{t('avg_progress')}</span>
                      <span className="font-extrabold text-indigo-400">{item.avgProgress}%</span>
                    </div>
                    <ProgressBar progress={item.avgProgress} size={isFullscreen ? 'sm' : 'xs'} />
                  </div>

                  {/* Tasks List Breakdown */}
                  {item.tasks.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-white/10">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Assigned Tasks ({item.tasks.length})
                      </div>
                      <div className="space-y-1.5">
                        {visibleTasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-2.5 rounded-xl bg-black/25 border border-white/5 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-white truncate max-w-[140px]">
                                {task.title}
                              </span>
                              <span className="font-mono text-sky-300 font-bold shrink-0">
                                ⏱ {task.normHours}h
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="font-semibold">L{task.level}</span>
                              <span className="font-bold text-slate-200">{task.progress}%</span>
                            </div>
                            <ProgressBar progress={task.progress} status={task.status} size="xs" />
                          </div>
                        ))}
                      </div>

                      {!isFullscreen && item.tasks.length > 2 && (
                        <button
                          onClick={() => toggleWorkloadExpand(item.assignee.id)}
                          className="w-full py-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1 transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3 h-3" />
                              <span>{t('show_less_tasks')}</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3" />
                              <span>{t('show_all_tasks', { count: item.tasks.length })}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-emerald-400 font-bold">
                      {item.completedCount} done
                    </span>
                    {item.delayedCount > 0 ? (
                      <span className="text-rose-400 font-bold">
                        {item.delayedCount} delayed
                      </span>
                    ) : (
                      <span className="text-slate-500">0 delayed</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-4 space-y-6">
      {/* Header Banner & Customize Widgets Toolbar */}
      <GlassCard variant="elevated" className="p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t('analytics_title')}
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {t('analytics_subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end w-full lg:w-auto">
            {/* Customize Widgets Multi-Select Dropdown */}
            <div className="relative">
              <button
                onClick={() => setWidgetDropdownOpen(!widgetDropdownOpen)}
                className="px-3.5 py-2 rounded-xl bg-white/10 dark:bg-slate-800/60 hover:bg-white/20 border border-white/15 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-all shadow-sm"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('customize_widgets')}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {widgetDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setWidgetDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl p-2.5 z-40 space-y-1 animate-scaleIn">
                    <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {t('customize_widgets')}
                    </div>

                    {ALL_WIDGETS.map((widget) => {
                      const isChecked = visibleWidgets.has(widget.id);
                      return (
                        <button
                          key={widget.id}
                          onClick={() => toggleWidgetVisibility(widget.id)}
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-white/10 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <span>{t(widget.labelKey as any)}</span>
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                              isChecked
                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                : 'border-slate-500 bg-transparent'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Check-in Alerts Button */}
            <button
              onClick={onOpenCheckin}
              className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
              <span>
                {t('checkin_alerts_count', { count: bottlenecks.length })}
              </span>
            </button>
          </div>
        </div>

        {/* Panel 1: Executive KPI Overview */}
        {visibleWidgets.has('kpi_overview') && (
          <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/10 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {t('widget_kpi_overview')}
              </span>
              <button
                onClick={() => setFullScreenWidget('kpi_overview')}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all"
                title={t('fullscreen_expand')}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {renderWidgetContent('kpi_overview')}
          </div>
        )}
      </GlassCard>

      {/* Grid: Progress by Level & Risk Bottleneck Analyzer */}
      {(visibleWidgets.has('progress_by_level') || visibleWidgets.has('bottlenecks')) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel 2: Progress by Hierarchy Level */}
          {visibleWidgets.has('progress_by_level') && (
            <GlassCard variant="elevated" className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {t('progress_by_level')}
                  </h3>
                </div>
                <button
                  onClick={() => setFullScreenWidget('progress_by_level')}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all"
                  title={t('fullscreen_expand')}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {renderWidgetContent('progress_by_level')}
            </GlassCard>
          )}

          {/* Panel 3: Risk & Bottleneck Analyzer */}
          {visibleWidgets.has('bottlenecks') && (
            <GlassCard variant="elevated" className="p-5 space-y-4 flex flex-col">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {t('widget_bottlenecks')}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">
                    {bottlenecks.length} Blockers
                  </span>
                  <button
                    onClick={() => setFullScreenWidget('bottlenecks')}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all"
                    title={t('fullscreen_expand')}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {renderWidgetContent('bottlenecks')}
            </GlassCard>
          )}
        </div>
      )}

      {/* Panel 4: Granular Component-by-Component Progress */}
      {visibleWidgets.has('detailed_components') && (
        <GlassCard variant="elevated" className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {t('detailed_components_title')}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {t('detailed_components_subtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setFullScreenWidget('detailed_components')}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all shrink-0"
              title={t('fullscreen_expand')}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {renderWidgetContent('detailed_components')}
        </GlassCard>
      )}

      {/* Panel 5: Team Workload & Task Breakdown */}
      {visibleWidgets.has('team_workload') && (
        <GlassCard variant="elevated" className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {t('assignee_workload')}
              </h3>
            </div>
            <button
              onClick={() => setFullScreenWidget('team_workload')}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all"
              title={t('fullscreen_expand')}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {renderWidgetContent('team_workload')}
        </GlassCard>
      )}

      {/* True 100vw / 100vh Full-Screen Presentation & Projector Mode */}
      {fullScreenWidget && (
        <div className="fixed inset-0 z-50 w-screen h-screen bg-[#020409] p-6 sm:p-10 flex flex-col justify-between overflow-hidden animate-fadeIn">
          {/* Top Presentation Bar */}
          <div className="flex items-center justify-between border-b border-white/15 pb-5 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-glass-glow">
                <Projector className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {t(
                      ALL_WIDGETS.find((w) => w.id === fullScreenWidget)?.labelKey as any
                    )}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE PROJECTOR MODE
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  {project.name} • {project.code} • {new Date().toLocaleDateString('uk-UA')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="hidden sm:inline-block font-mono text-sm font-bold text-slate-300 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10">
                {currentTime}
              </span>

              <button
                onClick={() => setFullScreenWidget(null)}
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all hover:scale-105"
                title="Exit Fullscreen (Esc)"
              >
                <Minimize2 className="w-4 h-4" />
                <span>{t('fullscreen_minimize')}</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Body: Adaptive View Filling the Entire Screen */}
          <div className="flex-1 overflow-hidden py-6">
            {renderWidgetContent(fullScreenWidget, true)}
          </div>

          {/* Bottom subtle hint */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-white/10 pt-3 shrink-0">
            <span>ProdTrack Flow Presentation Engine</span>
            <span>Натисніть [ ESC ] або кнопку згортання для повернення до загального дашборду</span>
          </div>
        </div>
      )}
    </div>
  );
};
