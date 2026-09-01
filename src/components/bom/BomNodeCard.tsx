import React from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  AlertTriangle,
  Clock,
  Users,
  Layers,
} from 'lucide-react';
import { BOMNode } from '../../types';
import { useI18n } from '../../locales';
import { APP_CONFIG } from '../../config/AppConfig';
import { GlassCard } from '../ui/GlassCard';
import { ProgressBar } from '../ui/ProgressBar';
import { StatusBadge } from '../ui/StatusBadge';
import { StackedAvatars } from '../ui/Avatar';
import { differenceInDays, parseISO } from 'date-fns';

interface BomNodeCardProps {
  node: BOMNode;
  isExpanded: boolean;
  hasChildren: boolean;
  childCount: number;
  onToggleExpand: (nodeId: string) => void;
  onAddChild: (parentNode: BOMNode) => void;
  onEdit: (node: BOMNode) => void;
  onDelete: (node: BOMNode) => void;
}

export const BomNodeCard: React.FC<BomNodeCardProps> = ({
  node,
  isExpanded,
  hasChildren,
  childCount,
  onToggleExpand,
  onAddChild,
  onEdit,
  onDelete,
}) => {
  const { t } = useI18n();

  const levelConfig =
    APP_CONFIG.LEVELS.find((l) => l.level === node.level) || APP_CONFIG.LEVELS[0];

  const assigneesList =
    node.assignees && node.assignees.length > 0
      ? node.assignees
      : node.assignee
      ? [node.assignee]
      : [];

  const normHours = typeof node.normHours === 'number' ? node.normHours : node.weight || 0;
  const unitHours = t('norm_hours_unit');

  // Calculate days remaining to due date
  let isApproachingDeadline = false;
  let isOverdue = false;
  let daysDiff = 0;

  try {
    const dueDate = parseISO(node.dueDate);
    const now = new Date();
    daysDiff = differenceInDays(dueDate, now);

    if (daysDiff < 0 && node.progress < 100) {
      isOverdue = true;
    } else if (
      daysDiff <= APP_CONFIG.DEADLINE_WARNING_DAYS_THRESHOLD &&
      node.progress < APP_CONFIG.PROGRESS_WARNING_THRESHOLD
    ) {
      isApproachingDeadline = true;
    }
  } catch (e) {
    // Ignore date parse issues
  }

  return (
    <GlassCard
      variant="elevated"
      className={`group w-full max-w-[540px] transition-all duration-300 border-l-4 ${
        node.status === 'delayed'
          ? 'border-l-rose-500 shadow-rose-950/20'
          : node.status === 'completed'
          ? 'border-l-emerald-400'
          : 'border-l-indigo-500'
      } ${node.level === 1 ? 'shadow-glass-glow ring-1 ring-indigo-400/30' : ''}`}
    >
      <div className="p-4 sm:p-5 flex flex-col gap-3.5">
        {/* Top bar: Level badge, Code, Status & Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {/* Level Badge */}
            <span
              className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border backdrop-blur-md ${levelConfig.badgeBg}`}
            >
              L{node.level}: {t(levelConfig.key as any)}
            </span>

            {/* Part Code */}
            <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
              {node.code}
            </span>

            {/* Prominent Norm-Hours Badge */}
            <span
              className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 flex items-center gap-1 shadow-sm"
              title={
                hasChildren
                  ? t('norm_hours_locked_hint')
                  : `${t('norm_hours')}: ${normHours} ${unitHours}`
              }
            >
              <Clock className="w-3 h-3 text-sky-400" />
              <span>
                {hasChildren && <span className="text-[10px] font-normal mr-0.5">∑</span>}
                {normHours} {unitHours}
              </span>
            </span>
          </div>

          {/* Quick Action buttons */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            {node.level < 5 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild(node);
                }}
                className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 transition-all"
                title={t('add_child_node')}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(node);
              }}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/10 transition-all"
              title={t('edit_node')}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node);
              }}
              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-all"
              title={t('delete_node')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Main Content: Title + Thumbnail Preview */}
        <div className="flex items-start gap-3 justify-between">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug break-words">
              {node.title}
            </h4>
            {node.notes && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {node.notes}
              </p>
            )}
          </div>

          {/* Image Thumbnail */}
          {node.image && (
            <div className="w-12 h-12 rounded-xl bg-white/10 dark:bg-black/40 border border-white/15 p-1 shrink-0 overflow-hidden flex items-center justify-center shadow-inner">
              <img
                src={node.image}
                alt={node.title}
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>

        {/* Progress Bar with Roll-up indicator */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>{t('node_progress')}</span>
              {hasChildren && (
                <span
                  className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 font-mono"
                  title={t('rollup_notice')}
                >
                  ∑ Roll-up ({normHours} {unitHours})
                </span>
              )}
            </span>
            <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">
              ⏱ {normHours} {unitHours} • {node.progress}%
            </span>
          </div>
          <ProgressBar progress={node.progress} status={node.status} size="sm" />
        </div>

        {/* Bottom Metadata: Status, Multi-Assignees, Batch, Deadline */}
        <div className="pt-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-2 flex-wrap text-xs">
          {/* Status Badge */}
          <StatusBadge status={node.status} size="xs" />

          {/* Multi-Assignee Stacked Avatars */}
          <div className="flex items-center gap-1.5 bg-white/10 dark:bg-slate-900/40 px-2 py-0.5 rounded-xl border border-white/10">
            <Users className="w-3 h-3 text-slate-400 shrink-0" />
            <StackedAvatars assignees={assigneesList} size="xs" />
          </div>

          {/* Batch info */}
          <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-white/10 dark:bg-slate-900/40 px-2 py-0.5 rounded-lg border border-white/10 shrink-0">
            {node.batchQuantity} {node.unit}
          </div>

          {/* Deadline / Overdue Alert */}
          <div className="flex items-center gap-1 shrink-0">
            {isOverdue ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-lg border border-rose-500/30 animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                {t('overdue_by_days', { days: Math.abs(daysDiff) })}
              </span>
            ) : isApproachingDeadline ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30">
                <AlertTriangle className="w-3 h-3" />
                {t('due_in_days', { days: daysDiff })}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Calendar className="w-3 h-3" />
                {node.dueDate}
              </span>
            )}
          </div>
        </div>

        {/* Expand / Collapse Button if has children */}
        {hasChildren && (
          <button
            onClick={() => onToggleExpand(node.id)}
            className="w-full mt-1 py-1.5 px-3 rounded-xl bg-white/10 dark:bg-slate-800/40 hover:bg-white/20 dark:hover:bg-slate-700/50 border border-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            {isExpanded ? (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('collapse_all')} ({childCount} items • {normHours} {unitHours})</span>
              </>
            ) : (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('expand_all')} ({childCount} items • {normHours} {unitHours})</span>
              </>
            )}
          </button>
        )}
      </div>
    </GlassCard>
  );
};
