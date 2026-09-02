import React, { useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Calendar,
  AlertTriangle,
  Package,
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

interface BomTreeGridProps {
  nodes: BOMNode[];
  filteredNodes: BOMNode[];
  expandedNodes: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  onAddChild: (parentNode: BOMNode) => void;
  onEdit: (node: BOMNode) => void;
  onDelete: (node: BOMNode) => void;
}

export const BomTreeGrid: React.FC<BomTreeGridProps> = ({
  nodes,
  filteredNodes,
  expandedNodes,
  onToggleExpand,
  onAddChild,
  onEdit,
  onDelete,
}) => {
  const { t } = useI18n();
  const unitHours = t('norm_hours_unit');

  // Build lookup of children per parent
  const childrenLookup = useMemo(() => {
    const map = new Map<string, BOMNode[]>();
    nodes.forEach((n) => {
      if (n.parentId) {
        const list = map.get(n.parentId) || [];
        list.push(n);
        map.set(n.parentId, list);
      }
    });
    return map;
  }, [nodes]);

  // Flatten tree based on expanded status
  const visibleRows = useMemo(() => {
    const result: BOMNode[] = [];
    const roots = nodes.filter((n) => n.parentId === null).sort((a, b) => a.orderIndex - b.orderIndex);

    const traverse = (node: BOMNode) => {
      const isVisibleInFilter = filteredNodes.some((fn) => fn.id === node.id);
      if (isVisibleInFilter || filteredNodes.length === nodes.length) {
        result.push(node);
      }

      if (expandedNodes.has(node.id)) {
        const children = childrenLookup.get(node.id) || [];
        children.sort((a, b) => a.orderIndex - b.orderIndex).forEach((child) => traverse(child));
      }
    };

    roots.forEach((root) => traverse(root));
    return result;
  }, [nodes, filteredNodes, expandedNodes, childrenLookup]);

  return (
    <div className="w-full overflow-x-auto custom-scrollbar rounded-3xl border border-white/10 shadow-glass-md">
      <table className="w-full text-left border-collapse min-w-[980px]">
        {/* Table Header */}
        <thead>
          <tr className="bg-slate-900/80 border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <th className="py-3.5 px-4">{t('col_component')}</th>
            <th className="py-3.5 px-3">{t('col_status')}</th>
            <th className="py-3.5 px-3 min-w-[160px]">{t('col_progress')}</th>
            <th className="py-3.5 px-3">{t('col_norm_hours')}</th>
            <th className="py-3.5 px-3">{t('col_assignees')}</th>
            <th className="py-3.5 px-3">{t('col_quantity')}</th>
            <th className="py-3.5 px-3">{t('col_due_date')}</th>
            <th className="py-3.5 px-4 text-right">{t('col_actions')}</th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-white/5 bg-slate-950/40 text-xs text-slate-200">
          {visibleRows.map((node) => {
            const children = childrenLookup.get(node.id) || [];
            const hasChildren = children.length > 0;
            const isExpanded = expandedNodes.has(node.id);
            const levelConfig =
              APP_CONFIG.LEVELS.find((l) => l.level === node.level) || APP_CONFIG.LEVELS[0];

            const assigneesList =
              node.assignees && node.assignees.length > 0
                ? node.assignees
                : node.assignee
                ? [node.assignee]
                : [];

            const normHours =
              typeof node.normHours === 'number' ? node.normHours : node.weight || 0;
            const baseNormHours =
              typeof node.baseNormHours === 'number' ? node.baseNormHours : normHours;
            const isScaled = Boolean(
              node.orderId && baseNormHours > 0 && normHours !== baseNormHours
            );

            // Deadline calculation
            let isOverdue = false;
            let daysDiff = 0;
            try {
              const dueDate = parseISO(node.dueDate);
              daysDiff = differenceInDays(dueDate, new Date());
              if (daysDiff < 0 && node.progress < 100) isOverdue = true;
            } catch (e) {}

            return (
              <tr
                key={node.id}
                className={`hover:bg-white/5 transition-colors group ${
                  node.level === 1
                    ? 'bg-indigo-950/20 font-semibold'
                    : node.level === 2
                    ? 'bg-slate-900/30'
                    : ''
                }`}
              >
                {/* 1. Component Name & Code with Indentation */}
                <td className="py-3 px-4">
                  <div
                    className="flex items-center gap-2"
                    style={{ paddingLeft: `${(node.level - 1) * 20}px` }}
                  >
                    {/* Expand/Collapse Chevron */}
                    {hasChildren ? (
                      <button
                        onClick={() => onToggleExpand(node.id)}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        title={isExpanded ? t('collapse_all') : t('expand_all')}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                    ) : (
                      <div className="w-5.5 h-5.5" />
                    )}

                    {/* Level Badge */}
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider border ${levelConfig.badgeBg}`}
                    >
                      L{node.level}
                    </span>

                    {/* Thumbnail if available */}
                    {node.image && (
                      <img
                        src={node.image}
                        alt={node.title}
                        className="w-5 h-5 rounded object-contain bg-white/10 p-0.5 border border-white/10 shrink-0"
                      />
                    )}

                    {/* Title and Code */}
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate max-w-[280px]">
                        {node.title}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {node.code}
                      </div>
                    </div>
                  </div>
                </td>

                {/* 2. Status */}
                <td className="py-3 px-3">
                  <StatusBadge status={node.status} size="xs" />
                </td>

                {/* 3. Progress Bar */}
                <td className="py-3 px-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-400">
                        {node.progress}%
                      </span>
                      {hasChildren && (
                        <span className="text-[9px] px-1 rounded bg-indigo-500/15 text-indigo-300 font-mono">
                          ∑ Roll-up
                        </span>
                      )}
                    </div>
                    <ProgressBar
                      progress={node.progress}
                      status={node.status}
                      size="xs"
                    />
                  </div>
                </td>

                {/* 4. Norm-Hours */}
                <td className="py-3 px-3">
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300"
                    title={
                      isScaled
                        ? `Scaled: ${normHours}h (Base: ${baseNormHours}h × batch size)`
                        : undefined
                    }
                  >
                    <Clock className="w-3 h-3 text-sky-400" />
                    <span>
                      {normHours} {unitHours}
                    </span>
                    {isScaled && (
                      <span className="text-[9px] text-sky-400/80">({baseNormHours}×)</span>
                    )}
                  </span>
                </td>

                {/* 5. Assignees */}
                <td className="py-3 px-3">
                  <StackedAvatars assignees={assigneesList} size="xs" />
                </td>

                {/* 6. Quantity */}
                <td className="py-3 px-3 text-[11px] font-medium text-slate-300">
                  {node.batchQuantity} {node.unit}
                </td>

                {/* 7. Due Date */}
                <td className="py-3 px-3">
                  {isOverdue ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/30">
                      <AlertTriangle className="w-3 h-3" />
                      {node.dueDate}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-mono">
                      {node.dueDate}
                    </span>
                  )}
                </td>

                {/* 8. Quick Actions */}
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    {node.level < 5 && (
                      <button
                        onClick={() => onAddChild(node)}
                        className="p-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/20"
                        title={t('add_child_node')}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(node)}
                      className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300"
                      title={t('edit_node')}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDelete(node)}
                      className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400"
                      title={t('delete_node')}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
