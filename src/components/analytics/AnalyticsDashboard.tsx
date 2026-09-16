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
  Package,
} from 'lucide-react';
import { BOMNode, ProductionOrder, Project, NodeLevel, Assignee } from '../../types';
import { useI18n } from '../../locales';
import { APP_CONFIG } from '../../config/AppConfig';
import { GlassCard } from '../ui/GlassCard';
import { ProgressBar } from '../ui/ProgressBar';
import { Avatar, StackedAvatars } from '../ui/Avatar';
import { StatusBadge } from '../ui/StatusBadge';
import { differenceInDays, parseISO } from 'date-fns';
import { getDelayConfig, evaluateNodeDelay } from '../../services/delayService';

interface AnalyticsDashboardProps {
  project: Project;
  nodes: BOMNode[];
  orders: ProductionOrder[];
  onOpenCheckin: () => void;
}

export type AnalyticsWidgetId =
  | 'kpi_overview'
  | 'bottlenecks'
  | 'delay_analysis'
  | 'progress_by_level'
  | 'detailed_components'
  | 'team_workload';

const ALL_WIDGETS: { id: AnalyticsWidgetId; labelKey: string }[] = [
  { id: 'kpi_overview', labelKey: 'widget_kpi_overview' },
  { id: 'bottlenecks', labelKey: 'widget_bottlenecks' },
  { id: 'delay_analysis', labelKey: 'widget_delay_analysis' },
  { id: 'progress_by_level', labelKey: 'widget_progress_by_level' },
  { id: 'detailed_components', labelKey: 'widget_detailed_components' },
  { id: 'team_workload', labelKey: 'widget_team_workload' },
];

// Helper calculations extracted for per-widget data filtering
const computeBottlenecks = (nodeList: BOMNode[]) => {
  const list: { node: BOMNode; reason: 'delayed' | 'approaching'; daysLeft?: number }[] = [];
  nodeList.forEach((n) => {
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
  return list.sort((a, b) => (b.node.normHours || 0) - (a.node.normHours || 0));
};

const computeDelayAnalysis = (nodeList: BOMNode[], delayConfig: ReturnType<typeof getDelayConfig>) => {
  const overdueItems: {
    node: BOMNode;
    daysOverdue: number;
    reasons: string[];
    notes?: string;
  }[] = [];

  nodeList.forEach((node) => {
    const evaluation = evaluateNodeDelay(node, delayConfig);
    const isOverdue =
      evaluation.isOverdue || (node.status === 'delayed' && node.progress < 100);
    if (isOverdue) {
      overdueItems.push({
        node,
        daysOverdue: Math.max(1, Math.abs(evaluation.daysDiff)),
        reasons: node.delayReasons || [],
        notes: node.delayNotes,
      });
    }
  });

  overdueItems.sort(
    (a, b) =>
      b.daysOverdue - a.daysOverdue ||
      a.node.progress - b.node.progress ||
      (b.node.normHours || 0) - (a.node.normHours || 0)
  );

  const top10Overdue = overdueItems.slice(0, 10);
  const totalOverdueCount = overdueItems.length;
  const totalOverdueHours =
    Math.round(
      overdueItems.reduce((acc, curr) => acc + (curr.node.normHours || 0), 0) * 10
    ) / 10;
  const avgDelayDays =
    totalOverdueCount > 0
      ? Math.round(
          (overdueItems.reduce((acc, curr) => acc + curr.daysOverdue, 0) /
            totalOverdueCount) *
            10
        ) / 10
      : 0;

  const reasonCounts: Record<string, number> = {};
  delayConfig.reasons.forEach((r) => {
    reasonCounts[r.label] = 0;
  });

  let totalLoggedReasonsCount = 0;
  nodeList.forEach((n) => {
    if (n.delayReasons && n.delayReasons.length > 0) {
      n.delayReasons.forEach((r) => {
        reasonCounts[r] = (reasonCounts[r] || 0) + 1;
        totalLoggedReasonsCount++;
      });
    }
  });

  const sortedReasons = Object.entries(reasonCounts)
    .map(([label, count]) => ({
      label,
      count,
      percentage:
        totalLoggedReasonsCount > 0
          ? Math.round((count / totalLoggedReasonsCount) * 100)
          : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const topReason =
    sortedReasons.length > 0 && sortedReasons[0].count > 0
      ? sortedReasons[0].label
      : '—';

  return {
    overdueItems,
    top10Overdue,
    totalOverdueCount,
    totalOverdueHours,
    avgDelayDays,
    sortedReasons,
    totalLoggedReasonsCount,
    topReason,
  };
};

const computeLevelStats = (nodeList: BOMNode[]) => {
  return APP_CONFIG.LEVELS.map((lvl) => {
    const levelNodes = nodeList.filter((n) => n.level === lvl.level);
    const count = levelNodes.length;
    const avgProgress =
      count > 0
        ? Math.round(
            levelNodes.reduce((acc, curr) => acc + curr.progress, 0) / count
          )
        : 0;
    const completedCount = levelNodes.filter((n) => n.progress === 100).length;
    const delayedCount = levelNodes.filter((n) => n.status === 'delayed').length;
    const totalHours =
      Math.round(
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
};

const computeAssigneeStats = (nodeList: BOMNode[]) => {
  return APP_CONFIG.DEFAULT_ASSIGNEES.map((assignee) => {
    const assignedNodes = nodeList.filter((n) => {
      return (
        (n.assignees && n.assignees.some((a) => a.id === assignee.id)) ||
        n.assignee?.id === assignee.id
      );
    });
    const count = assignedNodes.length;
    const totalHours =
      Math.round(
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
};

const computeDetailedComponents = (
  nodeList: BOMNode[],
  levelFilter: 'all' | NodeLevel,
  sort: 'lowest_progress' | 'highest_hours' | 'level',
  search: string
) => {
  return nodeList
    .filter((n) => {
      if (levelFilter !== 'all' && n.level !== levelFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
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
      if (sort === 'lowest_progress') {
        return a.progress - b.progress;
      }
      if (sort === 'highest_hours') {
        return (b.normHours || 0) - (a.normHours || 0);
      }
      return a.level - b.level || a.orderIndex - b.orderIndex;
    });
};

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
      'delay_analysis',
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

  // Per-widget order filter state: Record<AnalyticsWidgetId, string[]>
  // Defaults to ['all'] for all widgets. When project changes, resets to ['all'].
  const [widgetOrderFilters, setWidgetOrderFilters] = useState<Record<AnalyticsWidgetId, string[]>>({
    kpi_overview: ['all'],
    bottlenecks: ['all'],
    delay_analysis: ['all'],
    progress_by_level: ['all'],
    detailed_components: ['all'],
    team_workload: ['all'],
  });

  const [openFilterWidget, setOpenFilterWidget] = useState<AnalyticsWidgetId | null>(null);

  // Reset order filters when switching active project
  useEffect(() => {
    setWidgetOrderFilters({
      kpi_overview: ['all'],
      bottlenecks: ['all'],
      delay_analysis: ['all'],
      progress_by_level: ['all'],
      detailed_components: ['all'],
      team_workload: ['all'],
    });
    setOpenFilterWidget(null);
  }, [project.id]);

  // Escape key listener to close dropdown or full screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (openFilterWidget) {
          setOpenFilterWidget(null);
        } else {
          setFullScreenWidget(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openFilterWidget]);

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

  const delayConfig = useMemo(() => getDelayConfig(), []);

  // Compute filtered dataset for each widget based on its selected orders
  const widgetData = useMemo(() => {
    const getWidgetNodes = (id: AnalyticsWidgetId): BOMNode[] => {
      const filter = widgetOrderFilters[id] || ['all'];
      if (filter.includes('all')) return nodes;
      return nodes.filter((n) => {
        if (!n.orderId) return filter.includes('master');
        return filter.includes(n.orderId);
      });
    };

    // 1. KPI Overview
    const kpiNodes = getWidgetNodes('kpi_overview');
    const kpiRootNodes = kpiNodes.filter((n) => n.parentId === null);
    const kpiOverallProgress =
      kpiRootNodes.length > 0
        ? Math.round(kpiRootNodes.reduce((sum, n) => sum + n.progress, 0) / kpiRootNodes.length)
        : (kpiNodes[0]?.progress ?? 0);
    const kpiBottlenecks = computeBottlenecks(kpiNodes);
    const kpiTotalHoursAtRisk = Math.round(
      kpiBottlenecks.reduce((acc, curr) => acc + (curr.node.normHours || 0), 0) * 10
    ) / 10;
    const kpiTotalCompleted = kpiNodes.filter((n) => n.progress === 100).length;
    const kpiTotalOnSchedule = kpiNodes.filter(
      (n) => n.status === 'in_progress' || n.status === 'completed'
    ).length;

    // 2. Bottlenecks
    const bottleneckNodes = getWidgetNodes('bottlenecks');
    const bottlenecksList = computeBottlenecks(bottleneckNodes);
    const bottlenecksHoursAtRisk = Math.round(
      bottlenecksList.reduce((acc, curr) => acc + (curr.node.normHours || 0), 0) * 10
    ) / 10;

    // 3. Delay Analysis
    const delayNodes = getWidgetNodes('delay_analysis');
    const delayAnalysisData = computeDelayAnalysis(delayNodes, delayConfig);

    // 4. Progress by Level
    const levelNodes = getWidgetNodes('progress_by_level');
    const levelStatsData = computeLevelStats(levelNodes);

    // 5. Detailed Components
    const detailedNodes = getWidgetNodes('detailed_components');
    const detailedComponentsData = computeDetailedComponents(
      detailedNodes,
      componentLevelFilter,
      componentSort,
      componentSearch
    );

    // 6. Team Workload
    const workloadNodes = getWidgetNodes('team_workload');
    const assigneeStatsData = computeAssigneeStats(workloadNodes);

    return {
      kpi_overview: {
        nodes: kpiNodes,
        overallProgress: kpiOverallProgress,
        bottlenecks: kpiBottlenecks,
        totalHoursAtRisk: kpiTotalHoursAtRisk,
        totalCompleted: kpiTotalCompleted,
        totalOnSchedule: kpiTotalOnSchedule,
      },
      bottlenecks: {
        nodes: bottleneckNodes,
        list: bottlenecksList,
        totalHoursAtRisk: bottlenecksHoursAtRisk,
      },
      delay_analysis: {
        nodes: delayNodes,
        data: delayAnalysisData,
      },
      progress_by_level: {
        nodes: levelNodes,
        stats: levelStatsData,
      },
      detailed_components: {
        nodes: detailedNodes,
        components: detailedComponentsData,
      },
      team_workload: {
        nodes: workloadNodes,
        stats: assigneeStatsData,
      },
    };
  }, [
    nodes,
    widgetOrderFilters,
    delayConfig,
    componentLevelFilter,
    componentSort,
    componentSearch,
  ]);

  // Project-wide total bottlenecks (for top-bar alerts button)
  const totalProjectBottlenecks = useMemo(() => computeBottlenecks(nodes), [nodes]);

  // Order filter handlers
  const handleSelectAllOrders = (widgetId: AnalyticsWidgetId) => {
    setWidgetOrderFilters((prev) => ({
      ...prev,
      [widgetId]: ['all'],
    }));
  };

  const handleIsolateOrderFilter = (widgetId: AnalyticsWidgetId, orderId: string) => {
    setWidgetOrderFilters((prev) => ({
      ...prev,
      [widgetId]: [orderId],
    }));
    setOpenFilterWidget(null);
  };

  const handleToggleOrderFilter = (widgetId: AnalyticsWidgetId, orderId: string) => {
    setWidgetOrderFilters((prev) => {
      const current = prev[widgetId] || ['all'];
      if (orderId === 'all') {
        return { ...prev, [widgetId]: ['all'] };
      }

      if (current.includes('all')) {
        return { ...prev, [widgetId]: [orderId] };
      }

      let next: string[];
      if (current.includes(orderId)) {
        next = current.filter((id) => id !== orderId);
        if (next.length === 0) {
          next = ['all'];
        }
      } else {
        next = [...current, orderId];
      }

      return { ...prev, [widgetId]: next };
    });
  };

  // Render Order Filter Dropdown button and menu for any widget
  const renderOrderFilterDropdown = (widgetId: AnalyticsWidgetId, isFullscreen: boolean = false) => {
    const currentFilters = widgetOrderFilters[widgetId] || ['all'];
    const isAllSelected = currentFilters.includes('all');
    const isMasterSelected = !isAllSelected && currentFilters.includes('master');
    const isOpen = openFilterWidget === widgetId;

    let buttonLabel = t('filter_orders_button_all');
    if (!isAllSelected) {
      if (currentFilters.length === 1) {
        if (currentFilters[0] === 'master') {
          buttonLabel = t('filter_orders_master');
        } else {
          const ord = orders.find((o) => o.id === currentFilters[0]);
          buttonLabel = ord ? ord.orderNumber : t('filter_orders_button_selected', { count: 1 });
        }
      } else {
        buttonLabel = t('filter_orders_button_selected', { count: currentFilters.length });
      }
    }

    const widgetNodesCount = widgetData[widgetId]?.nodes?.length ?? 0;
    const masterNodesCount = nodes.filter((n) => !n.orderId).length;
    const hasMasterNodes = masterNodesCount > 0;

    return (
      <div className="relative inline-block text-left">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenFilterWidget(isOpen ? null : widgetId);
          }}
          className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all text-xs font-semibold shadow-sm ${
            !isAllSelected
              ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-200 hover:bg-indigo-600/40'
              : 'bg-white/10 dark:bg-slate-800/60 hover:bg-white/20 border-white/15 text-slate-300'
          }`}
          title={t('filter_orders_title')}
        >
          <Package className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="max-w-[120px] sm:max-w-[150px] truncate">{buttonLabel}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300 font-mono">
            {widgetNodesCount}
          </span>
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setOpenFilterWidget(null);
              }}
            />
            <div
              className={`absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[#0f172e]/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl p-2.5 z-50 space-y-1.5 animate-scaleIn text-xs ${
                isFullscreen ? 'text-slate-200' : ''
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-2 py-1 border-b border-white/10 pb-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3 h-3 text-indigo-400" />
                  {t('filter_orders_title')}
                </span>
                <button
                  onClick={() => handleSelectAllOrders(widgetId)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  {t('filter_orders_select_all')}
                </button>
              </div>

              {/* Option 1: All Orders */}
              <button
                onClick={() => handleToggleOrderFilter(widgetId, 'all')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                      isAllSelected
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'border-slate-500 bg-transparent'
                    }`}
                  >
                    {isAllSelected && <Check className="w-3 h-3" />}
                  </div>
                  <span className={`truncate font-semibold ${isAllSelected ? 'text-white' : 'text-slate-300'}`}>
                    {t('filter_orders_all')}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  {nodes.length} {t('subcomponents_label')}
                </span>
              </button>

              {/* Option 2: Master Blueprint (if has master nodes) */}
              {hasMasterNodes && (
                <button
                  onClick={() => handleToggleOrderFilter(widgetId, 'master')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                        isMasterSelected
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'border-slate-500 bg-transparent'
                      }`}
                    >
                      {isMasterSelected && <Check className="w-3 h-3" />}
                    </div>
                    <span className={`truncate ${isMasterSelected ? 'text-white font-semibold' : 'text-slate-300'}`}>
                      {t('filter_orders_master')}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {masterNodesCount}
                  </span>
                </button>
              )}

              {/* Orders list */}
              <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1 pt-1 border-t border-white/10">
                {orders.length === 0 ? (
                  <div className="p-3 text-center text-slate-500 text-[11px]">
                    {t('filter_orders_empty')}
                  </div>
                ) : (
                  orders.map((order) => {
                    const isChecked = !isAllSelected && currentFilters.includes(order.id);
                    const orderNodesCount = nodes.filter((n) => n.orderId === order.id).length;
                    return (
                      <div
                        key={order.id}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-colors group"
                      >
                        <button
                          onClick={() => handleToggleOrderFilter(widgetId, order.id)}
                          className="flex items-center gap-2 min-w-0 flex-1 text-left"
                        >
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                              isChecked
                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                : 'border-slate-500 bg-transparent'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`font-bold truncate ${isChecked ? 'text-white' : 'text-slate-200'}`}>
                              {order.orderNumber}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {order.title} • {order.batchQuantity} шт.
                            </div>
                          </div>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[10px] font-mono text-slate-400">
                            {orderNodesCount}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleIsolateOrderFilter(widgetId, order.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 rounded bg-white/10 hover:bg-indigo-600 text-[9px] font-semibold text-slate-300 hover:text-white transition-all"
                            title={t('filter_orders_isolate')}
                          >
                            {t('filter_orders_isolate')}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };


  // Render Widget Content helper for both standard and full-screen presentation modes
  const renderWidgetContent = (id: AnalyticsWidgetId, isFullscreen: boolean = false) => {
    switch (id) {
      case 'kpi_overview': {
        const {
          overallProgress,
          bottlenecks: kpiBottlenecks,
          totalHoursAtRisk: kpiHoursAtRisk,
          totalOnSchedule,
          totalCompleted,
          nodes: kpiNodes,
        } = widgetData.kpi_overview;

        return (
          <div
            className={`grid grid-cols-2 ${
              isFullscreen ? 'lg:grid-cols-4 gap-6 sm:gap-8 h-full py-4' : 'sm:grid-cols-4 gap-4'
            }`}
          >
            <div
              className={`rounded-3xl border flex flex-col justify-between ${
                isFullscreen
                  ? 'p-8 sm:p-10 shadow-2xl bg-[#111833] border-indigo-500/30'
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
                  {overallProgress}%
                </span>
                <span className={`text-emerald-400 font-bold flex items-center ${isFullscreen ? 'text-sm' : 'text-[11px]'}`}>
                  <ArrowUpRight className={isFullscreen ? 'w-5 h-5' : 'w-3 h-3'} />
                  Roll-up
                </span>
              </div>
              <ProgressBar
                progress={overallProgress}
                size={isFullscreen ? 'md' : 'xs'}
                className="mt-2"
              />
            </div>

            <div
              className={`rounded-3xl border flex flex-col justify-between ${
                isFullscreen
                  ? 'p-8 sm:p-10 shadow-2xl bg-[#211019] border-rose-500/30'
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
                {kpiBottlenecks.length}
              </div>
              <div className={`text-rose-400 font-semibold ${isFullscreen ? 'text-sm' : 'text-[11px]'}`}>
                {kpiHoursAtRisk} {t('norm_hours_unit')} under risk
              </div>
            </div>

            <div
              className={`rounded-3xl border flex flex-col justify-between ${
                isFullscreen
                  ? 'p-8 sm:p-10 shadow-2xl bg-[#0d2420] border-emerald-500/30'
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
                {totalOnSchedule} / {kpiNodes.length}
              </div>
              <div className={`text-slate-300 font-semibold ${isFullscreen ? 'text-sm' : 'text-[11px]'}`}>
                {Math.round((totalOnSchedule / Math.max(1, kpiNodes.length)) * 100)}% on track
              </div>
            </div>

            <div
              className={`rounded-3xl border flex flex-col justify-between ${
                isFullscreen
                  ? 'p-8 sm:p-10 shadow-2xl bg-[#101e38] border-sky-500/30'
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
                {totalCompleted} / {kpiNodes.length}
              </div>
              <div className={`text-sky-300 font-semibold ${isFullscreen ? 'text-sm' : 'text-[11px]'}`}>
                {Math.round((totalCompleted / Math.max(1, kpiNodes.length)) * 100)}% 100% completed
              </div>
            </div>
          </div>
        );
      }

      case 'progress_by_level': {
        const { stats: levelStats } = widgetData.progress_by_level;
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
      }

      case 'bottlenecks': {
        const { list: bottlenecks } = widgetData.bottlenecks;
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
      }

      case 'delay_analysis': {
        const { data: delayAnalysis, nodes: delayNodes } = widgetData.delay_analysis;
        return (
          <div
            className={`space-y-6 pt-1 ${
              isFullscreen ? 'max-w-7xl mx-auto w-full py-6 space-y-8' : ''
            }`}
          >
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col justify-between">
                <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  {t('overdue_nodes_count')}
                </span>
                <div className="my-2">
                  <span className="text-3xl sm:text-4xl font-black text-rose-400 tabular-nums">
                    {delayAnalysis.totalOverdueCount}
                  </span>
                  <span className="text-xs text-rose-300/80 ml-2 font-medium">
                    / {delayNodes.length}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {delayAnalysis.totalOverdueHours} {t('norm_hours_unit')} {t('hours_at_risk').toLowerCase()}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col justify-between">
                <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {t('avg_delay_days')}
                </span>
                <div className="my-2">
                  <span className="text-3xl sm:text-4xl font-black text-amber-400 tabular-nums">
                    {delayAnalysis.avgDelayDays}
                  </span>
                  <span className="text-xs text-amber-300/80 ml-2 font-medium">
                    {t('scale_day').toLowerCase()}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {t('risk_delayed')}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col justify-between sm:col-span-2">
                <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  {t('top_delay_reason')}
                </span>
                <div className="my-2">
                  <span className="text-sm sm:text-base font-bold text-white line-clamp-2">
                    {delayAnalysis.topReason}
                  </span>
                </div>
                <span className="text-[11px] text-purple-300/80">
                  {delayAnalysis.totalLoggedReasonsCount > 0
                    ? `${delayAnalysis.totalLoggedReasonsCount} ${t('delay_reasons_label').toLowerCase()}`
                    : t('delay_reasons_multi_hint')}
                </span>
              </div>
            </div>

            {/* Main Section: Top 10 Overdue Tasks & Reasons Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Top 10 Most Critical Overdue Tasks (7 cols) */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    {t('top_10_overdue_tasks')}
                  </h4>
                  <span className="text-xs font-mono text-slate-400">
                    {delayAnalysis.top10Overdue.length} / {delayAnalysis.totalOverdueCount}
                  </span>
                </div>

                {delayAnalysis.top10Overdue.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center flex flex-col items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 opacity-80" />
                    <span className="text-sm font-bold text-white">
                      {t('no_overdue_tasks')}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
                    {delayAnalysis.top10Overdue.map((item, idx) => (
                      <div
                        key={item.node.id}
                        className="p-3.5 rounded-2xl bg-white/10 dark:bg-slate-800/40 border border-white/10 hover:border-rose-500/40 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-lg bg-rose-500/20 text-rose-400 text-[11px] font-black flex items-center justify-center font-mono">
                              #{idx + 1}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                              {item.node.code}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-slate-400 border border-white/10">
                              L{item.node.level}
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-[280px]">
                              {item.node.title}
                            </span>
                          </div>

                          <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-lg border border-rose-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            {t('overdue_by_days', { days: item.daysOverdue })}
                          </span>
                        </div>

                        {/* Progress Bar & Labor Hours */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <ProgressBar progress={item.node.progress} status={item.node.status} size="xs" />
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 shrink-0">
                            {item.node.progress}% • ⏱ {item.node.normHours} {t('norm_hours_unit')}
                          </span>
                        </div>

                        {/* Reasons Badges & Assignees */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5 flex-wrap text-xs">
                          <div className="flex items-center gap-1 flex-wrap">
                            {item.reasons.length > 0 ? (
                              item.reasons.map((r, rIdx) => (
                                <span
                                  key={rIdx}
                                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-rose-950/60 border border-rose-500/30 text-rose-300"
                                >
                                  {r}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] italic text-slate-500">
                                {t('delay_reason_not_specified')}
                              </span>
                            )}
                          </div>

                          <StackedAvatars
                            assignees={
                              item.node.assignees && item.node.assignees.length > 0
                                ? item.node.assignees
                                : item.node.assignee
                                ? [item.node.assignee]
                                : []
                            }
                            size="xs"
                          />
                        </div>

                        {item.notes && (
                          <p className="text-[11px] text-slate-400 italic pt-1 border-t border-white/5">
                            "{item.notes}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Delay Root Cause Frequency Distribution (5 cols) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    {t('delay_reasons_distribution')}
                  </h4>
                  <span className="text-xs text-slate-400">
                    {delayAnalysis.totalLoggedReasonsCount} {t('delay_reasons_label').toLowerCase()}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/10 dark:bg-slate-800/40 border border-white/10 space-y-4 max-h-[480px] overflow-y-auto custom-scrollbar">
                  {delayAnalysis.sortedReasons.map((item, idx) => {
                    const maxCount = Math.max(1, delayAnalysis.sortedReasons[0]?.count || 1);
                    const barWidth =
                      item.count > 0 ? Math.max(8, Math.round((item.count / maxCount) * 100)) : 0;
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2 text-xs">
                          <span className="text-slate-300 font-medium leading-tight">
                            {item.label}
                          </span>
                          <span className="font-mono font-bold text-slate-200 shrink-0 tabular-nums">
                            {item.count} {item.count > 0 && `(${item.percentage}%)`}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'detailed_components': {
        const { components: sortedDetailedComponents } = widgetData.detailed_components;
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
              {sortedDetailedComponents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-white/5 rounded-2xl border border-white/10 text-xs">
                  {t('no_matching_nodes')}
                </div>
              ) : (
                sortedDetailedComponents.map((node) => {
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
                })
              )}
            </div>
          </div>
        );
      }

      case 'team_workload': {
        const { stats: assigneeStats } = widgetData.team_workload;
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

                      {item.tasks.length > 2 && !isFullscreen && (
                        <button
                          onClick={() => toggleWorkloadExpand(item.assignee.id)}
                          className="w-full py-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1 transition-colors"
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
      }

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
            <div className="flex items-center gap-2.5 flex-wrap">
              <Activity className="w-5 h-5 text-indigo-400 shrink-0" />
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t('analytics_title')}
              </h2>
              {/* Prominent Active Project Context Pill */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs">{project.name}</span>
                <span className="text-[11px] font-mono text-indigo-300 shrink-0">({project.code})</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {t('analytics_subtitle')} • <span className="text-slate-300 font-medium">{project.archetype || project.name}</span>
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
                {t('checkin_alerts_count', { count: totalProjectBottlenecks.length })}
              </span>
            </button>
          </div>
        </div>

        {/* Panel 1: Executive KPI Overview */}
        {visibleWidgets.has('kpi_overview') && (
          <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/10 relative">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {t('widget_kpi_overview')}
              </span>
              <div className="flex items-center gap-2">
                {renderOrderFilterDropdown('kpi_overview')}
                <button
                  onClick={() => setFullScreenWidget('kpi_overview')}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all"
                  title={t('fullscreen_expand')}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
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
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {t('progress_by_level')}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {renderOrderFilterDropdown('progress_by_level')}
                  <button
                    onClick={() => setFullScreenWidget('progress_by_level')}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all"
                    title={t('fullscreen_expand')}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {renderWidgetContent('progress_by_level')}
            </GlassCard>
          )}

          {/* Panel 3: Risk & Bottleneck Analyzer */}
          {visibleWidgets.has('bottlenecks') && (
            <GlassCard variant="elevated" className="p-5 space-y-4 flex flex-col">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {t('widget_bottlenecks')}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">
                    {widgetData.bottlenecks.list.length} Blockers
                  </span>
                  {renderOrderFilterDropdown('bottlenecks')}
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

      {/* Panel: Delay & Root Cause Analytics */}
      {visibleWidgets.has('delay_analysis') && (
        <GlassCard variant="elevated" className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {t('widget_delay_analysis')}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {t('top_10_overdue_tasks')} • {t('delay_reasons_distribution')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold">
                {widgetData.delay_analysis.data.totalOverdueCount} {t('overdue_nodes_count').toLowerCase()}
              </span>
              {renderOrderFilterDropdown('delay_analysis')}
              <button
                onClick={() => setFullScreenWidget('delay_analysis')}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all"
                title={t('fullscreen_expand')}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {renderWidgetContent('delay_analysis')}
        </GlassCard>
      )}

      {/* Panel 4: Granular Component-by-Component Progress */}
      {visibleWidgets.has('detailed_components') && (
        <GlassCard variant="elevated" className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3 flex-wrap gap-2">
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
            <div className="flex items-center gap-2">
              {renderOrderFilterDropdown('detailed_components')}
              <button
                onClick={() => setFullScreenWidget('detailed_components')}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all shrink-0"
                title={t('fullscreen_expand')}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {renderWidgetContent('detailed_components')}
        </GlassCard>
      )}

      {/* Panel 5: Team Workload & Task Breakdown */}
      {visibleWidgets.has('team_workload') && (
        <GlassCard variant="elevated" className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {t('assignee_workload')}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {renderOrderFilterDropdown('team_workload')}
              <button
                onClick={() => setFullScreenWidget('team_workload')}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all"
                title={t('fullscreen_expand')}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {renderWidgetContent('team_workload')}
        </GlassCard>
      )}

      {/* True 100vw / 100vh Full-Screen Presentation & Projector Mode */}
      {fullScreenWidget && (
        <div className="fixed inset-0 z-50 w-screen h-screen bg-[#090e1f] p-6 sm:p-10 flex flex-col justify-between overflow-hidden animate-fadeIn">
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
              {renderOrderFilterDropdown(fullScreenWidget, true)}

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
