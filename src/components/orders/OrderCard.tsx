import React from 'react';
import {
  Package,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  Building2,
  Network,
  ArrowRight,
} from 'lucide-react';
import { ProductionOrder } from '../../types';
import { useI18n } from '../../locales';
import { GlassCard } from '../ui/GlassCard';
import { ProgressBar } from '../ui/ProgressBar';
import { StatusBadge } from '../ui/StatusBadge';
import { Avatar } from '../ui/Avatar';
import { differenceInDays, parseISO } from 'date-fns';

interface OrderCardProps {
  order: ProductionOrder;
  onEdit: (order: ProductionOrder) => void;
  onDelete: (order: ProductionOrder) => void;
  onOpenTree?: (order: ProductionOrder) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onEdit, onDelete, onOpenTree }) => {
  const { t } = useI18n();

  // Delivery status calculation
  let daysDiff = 0;
  let isOverdue = false;
  try {
    const target = parseISO(order.targetDate);
    const now = new Date();
    daysDiff = differenceInDays(target, now);
    if (daysDiff < 0 && order.status !== 'completed') {
      isOverdue = true;
    }
  } catch (e) {
    // Ignore date parsing
  }

  return (
    <GlassCard
      variant="elevated"
      className={`w-full p-5 flex flex-col gap-4 border-l-4 transition-all duration-300 hover:shadow-glass-md ${
        order.status === 'urgent_delayed'
          ? 'border-l-rose-500 shadow-rose-950/20'
          : order.status === 'completed'
          ? 'border-l-emerald-400'
          : 'border-l-indigo-500'
      }`}
    >
      {/* Top Header: Order Number, Priority, Status, Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono font-bold text-xs">
            <Package className="w-3.5 h-3.5" />
            <span>{order.orderNumber}</span>
          </div>

          <StatusBadge status={order.status} size="xs" />
          <StatusBadge priority={order.priority} size="xs" />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(order)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/10 transition-all"
            title={t('edit_order')}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(order)}
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-all"
            title={t('delete_order')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Details: Title & Customer Destination */}
      <div>
        <h4 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
          {order.title}
        </h4>
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mt-1">
          <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="truncate">{order.customerName}</span>
        </div>
      </div>

      {/* Highlight Note Banner if present */}
      {order.highlightNote && (
        <div
          className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
            order.status === 'urgent_delayed'
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              : order.status === 'completed'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
          }`}
        >
          {order.status === 'urgent_delayed' ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 animate-bounce" />
          ) : order.status === 'completed' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <Clock className="w-4 h-4 shrink-0 text-indigo-400" />
          )}
          <span className="truncate">{order.highlightNote}</span>
        </div>
      )}

      {/* Batch Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-500 dark:text-slate-400">
            {t('order_progress')}
          </span>
          <span className="text-slate-800 dark:text-slate-200">
            {t('units_count', {
              completed: order.completedUnits,
              total: order.batchQuantity,
            })}{' '}
            ({order.progress}%)
          </span>
        </div>
        <ProgressBar
          progress={order.progress}
          status={order.status === 'urgent_delayed' ? 'delayed' : order.status === 'completed' ? 'completed' : 'in_progress'}
          size="md"
        />
      </div>

      {/* Open BOM Tree Button for this Order */}
      {onOpenTree && (
        <button
          onClick={() => onOpenTree(order)}
          className="w-full py-2 px-3 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <Network className="w-3.5 h-3.5 text-indigo-400" />
          <span>{t('open_bom_tree')} ({order.batchQuantity} {t('units')})</span>
          <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-70" />
        </button>
      )}

      {/* Footer: Dates & Assigned Lead */}
      <div className="pt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-3 flex-wrap text-xs">
        {/* Assignee */}
        <Avatar
          assignee={order.assignedLead}
          size="sm"
          showName={true}
          className="shrink-0"
        />

        {/* Deadline Indicator */}
        <div className="flex items-center gap-1.5 font-medium text-[11px]">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {isOverdue ? (
            <span className="text-rose-400 font-bold">
              {t('overdue_by_days', { days: Math.abs(daysDiff) })}
            </span>
          ) : order.status === 'completed' ? (
            <span className="text-emerald-400 font-bold">
              {t('order_status_completed')}
            </span>
          ) : (
            <span className="text-slate-600 dark:text-slate-300">
              {t('due_in_days', { days: daysDiff })} ({order.targetDate})
            </span>
          )}
        </div>
      </div>
    </GlassCard>
  );
};
