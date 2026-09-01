import React, { useState, useMemo } from 'react';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Layers,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { BOMNode, ProductionOrder, GanttZoom, Project } from '../../types';
import { useI18n } from '../../locales';
import { GlassCard } from '../ui/GlassCard';
import { Avatar } from '../ui/Avatar';
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInDays,
  format,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';

interface GanttTimelineProps {
  project: Project;
  nodes: BOMNode[];
  orders: ProductionOrder[];
  searchQuery: string;
}

export const GanttTimeline: React.FC<GanttTimelineProps> = ({
  project,
  nodes,
  orders,
  searchQuery,
}) => {
  const { t } = useI18n();

  const [zoom, setZoom] = useState<GanttZoom>('week');
  const [viewMode, setViewMode] = useState<'bom' | 'orders'>('bom');
  const [baseDate, setBaseDate] = useState<Date>(new Date('2026-08-20'));

  // Calculate timeline bounds based on zoom level
  const timelineColumns = useMemo(() => {
    const columns: { date: Date; label: string; subLabel: string; isToday: boolean }[] = [];
    const today = new Date();

    if (zoom === 'day') {
      const start = subDays(baseDate, 10);
      for (let i = 0; i < 30; i++) {
        const d = addDays(start, i);
        columns.push({
          date: d,
          label: format(d, 'd MMM'),
          subLabel: format(d, 'EEE'),
          isToday: isSameDay(d, today),
        });
      }
    } else if (zoom === 'week') {
      const start = subDays(baseDate, 14);
      for (let i = 0; i < 8; i++) {
        const d = addWeeks(start, i);
        columns.push({
          date: d,
          label: `W${format(d, 'w')}`,
          subLabel: format(d, 'MMM d'),
          isToday: isWithinInterval(today, { start: d, end: addDays(d, 6) }),
        });
      }
    } else if (zoom === 'month') {
      const start = subDays(baseDate, 30);
      for (let i = 0; i < 6; i++) {
        const d = addMonths(start, i);
        columns.push({
          date: d,
          label: format(d, 'MMMM'),
          subLabel: format(d, 'yyyy'),
          isToday: isSameDay(startOfMonth(d), startOfMonth(today)),
        });
      }
    } else {
      // Year zoom
      for (let i = -1; i <= 2; i++) {
        const d = new Date(baseDate.getFullYear() + i, 0, 1);
        columns.push({
          date: d,
          label: format(d, 'yyyy'),
          subLabel: 'Annual',
          isToday: d.getFullYear() === today.getFullYear(),
        });
      }
    }

    return columns;
  }, [baseDate, zoom]);

  // Timeline date range for calculating bar coordinates
  const timelineStart = timelineColumns[0]?.date || new Date();
  const timelineEnd =
    zoom === 'day'
      ? addDays(timelineColumns[timelineColumns.length - 1]?.date || new Date(), 1)
      : zoom === 'week'
      ? addWeeks(timelineColumns[timelineColumns.length - 1]?.date || new Date(), 1)
      : zoom === 'month'
      ? addMonths(timelineColumns[timelineColumns.length - 1]?.date || new Date(), 1)
      : addMonths(timelineColumns[timelineColumns.length - 1]?.date || new Date(), 12);

  const totalTimelineDays = Math.max(1, differenceInDays(timelineEnd, timelineStart));

  // Compute position percentage
  const getTimelineBarPosition = (startStr: string, endStr: string) => {
    try {
      const start = parseISO(startStr);
      const end = parseISO(endStr);
      const daysFromStart = differenceInDays(start, timelineStart);
      const durationDays = Math.max(1, differenceInDays(end, start));

      const leftPercent = Math.max(0, (daysFromStart / totalTimelineDays) * 100);
      const widthPercent = Math.min(
        100 - leftPercent,
        Math.max(3, (durationDays / totalTimelineDays) * 100)
      );

      return { left: `${leftPercent}%`, width: `${widthPercent}%` };
    } catch {
      return { left: '0%', width: '10%' };
    }
  };

  // Filter items
  const displayItems = useMemo(() => {
    if (viewMode === 'bom') {
      return nodes.filter((n) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const hasAssigneeMatch =
          (n.assignees && n.assignees.some((a) => a.name.toLowerCase().includes(q))) ||
          n.assignee?.name.toLowerCase().includes(q) ||
          false;

        return (
          n.title.toLowerCase().includes(q) ||
          n.code.toLowerCase().includes(q) ||
          hasAssigneeMatch
        );
      });
    } else {
      return orders.filter((o) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          o.title.toLowerCase().includes(q) ||
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q)
        );
      });
    }
  }, [viewMode, nodes, orders, searchQuery]);

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-4 space-y-5">
      {/* Top Controls Banner */}
      <GlassCard variant="elevated" className="p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t('gantt_title')}
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {t('gantt_subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-end">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-white/10 dark:bg-slate-800/40 p-0.5 rounded-xl border border-white/10">
              <button
                onClick={() => setViewMode('bom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'bom'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('view_mode_bom')}
              </button>
              <button
                onClick={() => setViewMode('orders')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'orders'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('view_mode_orders')}
              </button>
            </div>

            {/* Zoom Switcher */}
            <div className="flex items-center bg-white/10 dark:bg-slate-800/40 p-0.5 rounded-xl border border-white/10">
              {(['day', 'week', 'month', 'year'] as const).map((z) => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    zoom === z
                      ? 'bg-white/20 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t(`scale_${z}` as any)}
                </button>
              ))}
            </div>

            {/* Time pan buttons */}
            <div className="flex items-center gap-1 bg-white/10 dark:bg-slate-800/40 p-0.5 rounded-xl border border-white/10">
              <button
                onClick={() => setBaseDate((prev) => subDays(prev, 7))}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                title="Pan Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setBaseDate(new Date())}
                className="px-2 py-1 text-xs font-semibold text-slate-300 hover:text-white"
              >
                {t('today')}
              </button>
              <button
                onClick={() => setBaseDate((prev) => addDays(prev, 7))}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                title="Pan Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Gantt Matrix Canvas */}
      <GlassCard variant="elevated" className="overflow-hidden p-0">
        <div className="overflow-x-auto custom-scrollbar">
          <div className="min-w-[900px] divide-y divide-white/10">
            {/* Header Timeline Columns */}
            <div className="flex bg-black/30 backdrop-blur-md sticky top-0 z-10">
              {/* Left Title column */}
              <div className="w-72 p-3.5 text-xs font-bold uppercase tracking-wider text-slate-400 border-r border-white/10 shrink-0">
                {viewMode === 'bom' ? 'Component / Operation' : 'Production Batch Order'}
              </div>

              {/* Time grid columns */}
              <div className="flex-1 grid grid-flow-col auto-cols-fr divide-x divide-white/5 text-center">
                {timelineColumns.map((col, idx) => (
                  <div
                    key={idx}
                    className={`py-2 px-1 text-center transition-colors ${
                      col.isToday ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">{col.label}</div>
                    <div className="text-[10px] opacity-75">{col.subLabel}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Rows */}
            <div className="divide-y divide-white/5">
              {displayItems.map((item) => {
                const isBom = viewMode === 'bom';
                const node = isBom ? (item as BOMNode) : null;
                const order = !isBom ? (item as ProductionOrder) : null;

                const id = item.id;
                const title = item.title;
                const code = node ? node.code : order ? order.orderNumber : '';
                const progress = item.progress;
                const status = item.status;
                const startDate = node ? node.startDate : order?.startDate || '';
                const targetDate = node ? node.dueDate : order?.targetDate || '';
                const assignee = node ? node.assignee : order?.assignedLead;

                const barPos = getTimelineBarPosition(startDate, targetDate);

                return (
                  <div key={id} className="flex items-center hover:bg-white/5 transition-colors group">
                    {/* Left Column info */}
                    <div className="w-72 p-3.5 border-r border-white/10 flex items-center justify-between gap-2 shrink-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold text-indigo-400">
                            {code}
                          </span>
                          {node && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                              L{node.level}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                          {title}
                        </div>
                      </div>

                      {assignee && <Avatar assignee={assignee} size="xs" />}
                    </div>

                    {/* Timeline Ribbon Canvas */}
                    <div className="flex-1 relative py-3.5 px-2 h-14 flex items-center">
                      {/* Grid background lines */}
                      <div className="absolute inset-0 grid grid-flow-col auto-cols-fr divide-x divide-white/5 pointer-events-none" />

                      {/* Visual Timeline Ribbon */}
                      <div
                        className="absolute h-7 rounded-xl shadow-md border overflow-hidden flex items-center px-2 text-white text-xs font-semibold transition-all duration-300 group-hover:h-8 z-0"
                        style={{
                          left: barPos.left,
                          width: barPos.width,
                          background:
                            status === 'delayed' || status === 'urgent_delayed'
                              ? 'linear-gradient(90deg, #e11d48, #f43f5e)'
                              : status === 'completed'
                              ? 'linear-gradient(90deg, #059669, #10b981)'
                              : 'linear-gradient(90deg, #4f46e5, #6366f1)',
                          borderColor:
                            status === 'delayed' || status === 'urgent_delayed'
                              ? 'rgba(244, 63, 94, 0.4)'
                              : status === 'completed'
                              ? 'rgba(16, 185, 129, 0.4)'
                              : 'rgba(99, 102, 241, 0.4)',
                        }}
                      >
                        {/* Progress Fill inside ribbon */}
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-white/20 border-r border-white/40"
                          style={{ width: `${progress}%` }}
                        />

                        {/* Text label */}
                        <div className="relative z-10 flex items-center justify-between w-full text-[11px] truncate drop-shadow">
                          <span className="truncate font-semibold">{title}</span>
                          <span className="ml-2 font-mono font-bold tabular-nums">
                            {progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
