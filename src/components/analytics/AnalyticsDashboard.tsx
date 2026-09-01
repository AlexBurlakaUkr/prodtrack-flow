import React, { useMemo } from 'react';
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
} from 'lucide-react';
import { BOMNode, ProductionOrder, Project, NodeLevel } from '../../types';
import { useI18n } from '../../locales';
import { APP_CONFIG } from '../../config/AppConfig';
import { GlassCard } from '../ui/GlassCard';
import { ProgressBar } from '../ui/ProgressBar';
import { Avatar } from '../ui/Avatar';
import { StatusBadge } from '../ui/StatusBadge';

interface AnalyticsDashboardProps {
  project: Project;
  nodes: BOMNode[];
  orders: ProductionOrder[];
  onOpenCheckin: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  project,
  nodes,
  orders,
  onOpenCheckin,
}) => {
  const { t } = useI18n();

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

      return {
        level: lvl.level,
        nameKey: lvl.key,
        color: lvl.color,
        count,
        avgProgress,
        completedCount,
        delayedCount,
      };
    });
  }, [nodes]);

  // Bottlenecks list
  const bottlenecks = useMemo(() => {
    return nodes.filter(
      (n) =>
        n.status === 'delayed' ||
        (n.progress < 100 && new Date(n.dueDate) < new Date())
    );
  }, [nodes]);

  // Assignee workload breakdown
  const assigneeStats = useMemo(() => {
    return APP_CONFIG.DEFAULT_ASSIGNEES.map((assignee) => {
      const assignedNodes = nodes.filter((n) => {
        return (
          (n.assignees && n.assignees.some((a) => a.id === assignee.id)) ||
          n.assignee?.id === assignee.id
        );
      });
      const count = assignedNodes.length;
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
        avgProgress,
        delayedCount,
        completedCount,
      };
    });
  }, [nodes]);

  const totalCompletedNodes = nodes.filter((n) => n.progress === 100).length;
  const totalOnSchedule = nodes.filter(
    (n) => n.status === 'in_progress' || n.status === 'completed'
  ).length;

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-4 space-y-6">
      {/* Header Banner */}
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

        {/* High-level KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-black/5 dark:border-white/10">
          <div className="p-4 rounded-2xl bg-white/10 dark:bg-slate-800/40 border border-white/10 flex flex-col justify-between">
            <div className="text-xs font-semibold text-slate-400">
              {t('kpi_overall_progress')}
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-indigo-400 tabular-nums">
                {overallBOMProgress}%
              </span>
              <span className="text-[11px] text-emerald-400 font-bold flex items-center">
                <ArrowUpRight className="w-3 h-3" />
                Roll-up
              </span>
            </div>
            <ProgressBar progress={overallBOMProgress} size="xs" className="mt-2" />
          </div>

          <div className="p-4 rounded-2xl bg-white/10 dark:bg-slate-800/40 border border-white/10 flex flex-col justify-between">
            <div className="text-xs font-semibold text-slate-400">
              {t('kpi_delayed_nodes')}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 mt-2">
              {bottlenecks.length}
            </div>
            <div className="text-[11px] text-rose-400 font-semibold mt-1">
              Critical path blockers
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 dark:bg-slate-800/40 border border-white/10 flex flex-col justify-between">
            <div className="text-xs font-semibold text-slate-400">
              {t('kpi_on_schedule')}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-2">
              {totalOnSchedule} / {nodes.length}
            </div>
            <div className="text-[11px] text-slate-400 font-semibold mt-1">
              {Math.round((totalOnSchedule / Math.max(1, nodes.length)) * 100)}% on track
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 dark:bg-slate-800/40 border border-white/10 flex flex-col justify-between">
            <div className="text-xs font-semibold text-slate-400">
              {t('kpi_completed_parts')}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-sky-400 mt-2">
              {totalCompletedNodes} / {nodes.length}
            </div>
            <div className="text-[11px] text-sky-300 font-semibold mt-1">
              {Math.round((totalCompletedNodes / Math.max(1, nodes.length)) * 100)}% 100% completed
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Grid: Progress by Level & Bottleneck Analyzer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress by Hierarchy Level */}
        <GlassCard variant="elevated" className="p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/10 pb-3">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {t('progress_by_level')}
            </h3>
          </div>

          <div className="space-y-4 pt-1">
            {levelStats.map((item) => (
              <div
                key={item.level}
                className="p-3.5 rounded-xl bg-white/10 dark:bg-slate-800/30 border border-white/10 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      L{item.level}: {t(item.nameKey as any)}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({item.count} items)
                    </span>
                  </div>

                  <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                    {item.avgProgress}%
                  </span>
                </div>

                <ProgressBar progress={item.avgProgress} size="sm" />

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                  <span>{item.completedCount} completed</span>
                  {item.delayedCount > 0 && (
                    <span className="text-rose-400 font-semibold">
                      {item.delayedCount} delayed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Bottleneck Analyzer */}
        <GlassCard variant="elevated" className="p-5 space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {t('bottleneck_analyzer')}
              </h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">
              {bottlenecks.length} Blockers
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[420px] custom-scrollbar pt-1">
            {bottlenecks.length > 0 ? (
              bottlenecks.map((node) => (
                <div
                  key={node.id}
                  className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-rose-300">
                      {node.code}
                    </span>
                    <span className="text-[11px] text-rose-400 font-semibold">
                      Due: {node.dueDate}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {node.title}
                  </div>

                  {node.notes && (
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {node.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-rose-500/20 text-xs">
                    <Avatar assignee={node.assignee} size="xs" showName={true} />
                    <span className="font-mono font-bold text-rose-300">
                      {node.progress}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center my-auto">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {t('no_bottlenecks')}
                </p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Assignee & Operations Workload Matrix */}
      <GlassCard variant="elevated" className="p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/10 pb-3">
          <Users className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {t('assignee_workload')}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pt-1">
          {assigneeStats.map((item) => (
            <div
              key={item.assignee.id}
              className="p-4 rounded-2xl bg-white/10 dark:bg-slate-800/30 border border-white/10 flex flex-col justify-between gap-3"
            >
              <div className="flex items-center gap-2.5">
                <Avatar assignee={item.assignee} size="md" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.assignee.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {item.assignee.role}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{t('total_assigned')}</span>
                  <span className="font-bold text-slate-200">{item.count} items</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{t('avg_progress')}</span>
                  <span className="font-bold text-indigo-400">{item.avgProgress}%</span>
                </div>
                <ProgressBar progress={item.avgProgress} size="xs" />
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                <span className="text-emerald-400 font-semibold">
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
          ))}
        </div>
      </GlassCard>
    </div>
  );
};
