import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Layers,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Projector,
} from 'lucide-react';
import { BOMNode, ProductionOrder, GanttZoom, Project } from '../../types';
import { useI18n } from '../../locales';
import { APP_CONFIG } from '../../config/AppConfig';
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Hierarchical expansion state: orders and child nodes start collapsed
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Reset expansion when switching active project
  useEffect(() => {
    setExpandedOrders(new Set());
    setExpandedNodes(new Set());
  }, [project.id]);

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const allOrderIds = orders.map((o) => o.id).concat(['master_blueprint']);
    setExpandedOrders(new Set(allOrderIds));
    setExpandedNodes(new Set(nodes.map((n) => n.id)));
  };

  const handleCollapseAll = () => {
    setExpandedOrders(new Set());
    setExpandedNodes(new Set());
  };

  // Synchronize baseDate dynamically with active project items
  const initialDate = useMemo(() => {
    const dates: Date[] = [];
    nodes.forEach((n) => {
      if (n.startDate) {
        try {
          const d = parseISO(n.startDate);
          if (!isNaN(d.getTime())) dates.push(d);
        } catch {}
      }
    });
    orders.forEach((o) => {
      if (o.startDate) {
        try {
          const d = parseISO(o.startDate);
          if (!isNaN(d.getTime())) dates.push(d);
        } catch {}
      }
    });
    if (dates.length > 0) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      return dates[0];
    }
    return new Date();
  }, [project.id, nodes, orders]);

  const [baseDate, setBaseDate] = useState<Date>(initialDate);

  useEffect(() => {
    setBaseDate(initialDate);
  }, [initialDate]);

  // Live time for projector presentation mode
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  useEffect(() => {
    if (!isFullscreen) return;
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [isFullscreen]);

  // Escape key listener to exit full screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Calculate timeline bounds based on zoom level
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

  // Helper to get effective dates for orders
  const getEffectiveOrderDates = (order: ProductionOrder, orderNodes: BOMNode[]) => {
    let start = order.startDate;
    let end = order.targetDate;

    if ((!start || !end) && orderNodes.length > 0) {
      const datesWithStart = orderNodes.map((n) => n.startDate).filter(Boolean) as string[];
      const datesWithEnd = orderNodes.map((n) => n.dueDate).filter(Boolean) as string[];
      if (!start && datesWithStart.length > 0) {
        datesWithStart.sort();
        start = datesWithStart[0];
      }
      if (!end && datesWithEnd.length > 0) {
        datesWithEnd.sort();
        end = datesWithEnd[datesWithEnd.length - 1];
      }
    }

    return {
      startDate: start || format(new Date(), 'yyyy-MM-dd'),
      targetDate: end || format(addDays(new Date(), 14), 'yyyy-MM-dd'),
    };
  };

  // Hierarchical display rows: Orders + child BOM nodes (expandable)
  type GanttRow =
    | {
        type: 'order';
        id: string;
        order: ProductionOrder;
        effectiveStartDate: string;
        effectiveTargetDate: string;
        hasChildren: boolean;
        isExpanded: boolean;
      }
    | {
        type: 'master';
        id: string;
        title: string;
        code: string;
        effectiveStartDate: string;
        effectiveTargetDate: string;
        progress: number;
        status: string;
        hasChildren: boolean;
        isExpanded: boolean;
      }
    | {
        type: 'node';
        id: string;
        node: BOMNode;
        depth: number;
        hasChildren: boolean;
        isExpanded: boolean;
      };

  const displayRows = useMemo<GanttRow[]>(() => {
    const query = searchQuery.trim().toLowerCase();

    // Group nodes by orderId
    const orderNodesMap = new Map<string, BOMNode[]>();
    const masterNodes: BOMNode[] = [];

    nodes.forEach((n) => {
      if (n.orderId) {
        const list = orderNodesMap.get(n.orderId) || [];
        list.push(n);
        orderNodesMap.set(n.orderId, list);
      } else {
        masterNodes.push(n);
      }
    });

    const buildChildrenLookup = (nodeList: BOMNode[]) => {
      const map = new Map<string, BOMNode[]>();
      nodeList.forEach((n) => {
        if (n.parentId) {
          const list = map.get(n.parentId) || [];
          list.push(n);
          map.set(n.parentId, list);
        }
      });
      return map;
    };

    const nodeMatches = (n: BOMNode) => {
      if (!query) return true;
      const hasAssigneeMatch =
        (n.assignees && n.assignees.some((a) => a.name.toLowerCase().includes(query))) ||
        n.assignee?.name.toLowerCase().includes(query) ||
        false;
      return (
        n.title.toLowerCase().includes(query) ||
        n.code.toLowerCase().includes(query) ||
        hasAssigneeMatch
      );
    };

    const rows: GanttRow[] = [];

    const appendNodeHierarchy = (
      nodeList: BOMNode[],
      parentId: string | null,
      depth: number,
      childrenMap: Map<string, BOMNode[]>
    ) => {
      const directChildren = (
        parentId === null
          ? nodeList.filter((n) => !n.parentId || !nodeList.some((other) => other.id === n.parentId))
          : childrenMap.get(parentId) || []
      ).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

      for (const child of directChildren) {
        const subChildren = childrenMap.get(child.id) || [];
        const hasSubChildren = subChildren.length > 0;
        const isExpanded = expandedNodes.has(child.id);

        rows.push({
          type: 'node',
          id: child.id,
          node: child,
          depth,
          hasChildren: hasSubChildren,
          isExpanded,
        });

        if (isExpanded && hasSubChildren) {
          appendNodeHierarchy(nodeList, child.id, depth + 1, childrenMap);
        }
      }
    };

    // Orders
    orders.forEach((order) => {
      const orderNodes = orderNodesMap.get(order.id) || [];
      const orderMatchesQuery =
        !query ||
        order.title.toLowerCase().includes(query) ||
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        orderNodes.some(nodeMatches);

      if (!orderMatchesQuery) return;

      const { startDate, targetDate } = getEffectiveOrderDates(order, orderNodes);
      const hasChildren = orderNodes.length > 0;
      const isExpanded =
        expandedOrders.has(order.id) || (query.length > 0 && orderNodes.some(nodeMatches));

      rows.push({
        type: 'order',
        id: order.id,
        order,
        effectiveStartDate: startDate,
        effectiveTargetDate: targetDate,
        hasChildren,
        isExpanded,
      });

      if (isExpanded && hasChildren) {
        const childrenMap = buildChildrenLookup(orderNodes);
        appendNodeHierarchy(orderNodes, null, 1, childrenMap);
      }
    });

    // Master blueprint components if any exist without an order
    if (masterNodes.length > 0) {
      const masterMatchesQuery = !query || masterNodes.some(nodeMatches);
      if (masterMatchesQuery) {
        const datesWithStart = masterNodes.map((n) => n.startDate).filter(Boolean) as string[];
        const datesWithEnd = masterNodes.map((n) => n.dueDate).filter(Boolean) as string[];
        datesWithStart.sort();
        datesWithEnd.sort();
        const startDate = datesWithStart[0] || format(new Date(), 'yyyy-MM-dd');
        const targetDate =
          datesWithEnd[datesWithEnd.length - 1] || format(addDays(new Date(), 14), 'yyyy-MM-dd');
        const avgProgress = Math.round(
          masterNodes.reduce((sum, n) => sum + (n.progress || 0), 0) / masterNodes.length
        );
        const isExpanded =
          expandedOrders.has('master_blueprint') || (query.length > 0 && masterNodes.some(nodeMatches));

        rows.push({
          type: 'master',
          id: 'master_blueprint',
          title: t('filter_orders_master'),
          code: project.code,
          effectiveStartDate: startDate,
          effectiveTargetDate: targetDate,
          progress: avgProgress,
          status: avgProgress === 100 ? 'completed' : 'in_progress',
          hasChildren: true,
          isExpanded,
        });

        if (isExpanded) {
          const childrenMap = buildChildrenLookup(masterNodes);
          appendNodeHierarchy(masterNodes, null, 1, childrenMap);
        }
      }
    }

    return rows;
  }, [orders, nodes, searchQuery, expandedOrders, expandedNodes, project.code, t]);

  // Render Matrix Canvas helper
  const renderGanttCanvas = (isFull: boolean = false) => (
    <div
      className={`overflow-x-auto custom-scrollbar ${
        isFull ? 'flex-1 h-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1429]' : ''
      }`}
    >
      <div className="min-w-[960px] divide-y divide-white/10">
        {/* Header Timeline Columns */}
        <div className="flex bg-black/40 backdrop-blur-md sticky top-0 z-10 border-b border-white/10">
          {/* Left Title column */}
          <div className="w-88 sm:w-96 p-3 text-xs font-bold uppercase tracking-wider text-slate-400 border-r border-white/10 shrink-0 flex items-center justify-between">
            <span>{t('col_orders_and_components')}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleExpandAll}
                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
                title={t('expand_all')}
              >
                +
              </button>
              <button
                onClick={handleCollapseAll}
                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
                title={t('collapse_all')}
              >
                −
              </button>
            </div>
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

        {/* Timeline Rows or Empty State */}
        {displayRows.length > 0 ? (
          <div className="divide-y divide-white/5 bg-slate-950/20">
            {displayRows.map((row) => {
              if (row.type === 'order') {
                const order = row.order;
                const barPos = getTimelineBarPosition(row.effectiveStartDate, row.effectiveTargetDate);
                const isDelayed = order.status === 'urgent_delayed' || order.status === 'on_hold';
                const isCompleted = order.status === 'completed' || order.progress === 100;

                return (
                  <div
                    key={row.id}
                    className="flex items-center hover:bg-indigo-500/5 bg-slate-900/40 transition-colors group border-t border-white/10"
                  >
                    {/* Left Column: Order Header */}
                    <div className="w-88 sm:w-96 p-3 border-r border-white/10 flex items-center justify-between gap-2 shrink-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {row.hasChildren ? (
                          <button
                            onClick={() => toggleOrderExpand(order.id)}
                            className="p-1 rounded-lg hover:bg-white/10 text-indigo-400 hover:text-indigo-200 transition-colors shrink-0"
                            title={row.isExpanded ? t('collapse_all') : t('expand_all')}
                          >
                            {row.isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <div className="w-6 shrink-0" />
                        )}

                        <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
                          <Package className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-extrabold text-indigo-300">
                              {order.orderNumber}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                              {order.batchQuantity} од.
                            </span>
                          </div>
                          <div className="text-xs font-bold text-white truncate mt-0.5">
                            {order.title}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {order.customerName}
                          </div>
                        </div>
                      </div>

                      {order.assignedLead && <Avatar assignee={order.assignedLead} size="xs" />}
                    </div>

                    {/* Timeline Ribbon Canvas for Order */}
                    <div className="flex-1 relative py-3 px-2 h-14 flex items-center">
                      <div className="absolute inset-0 grid grid-flow-col auto-cols-fr divide-x divide-white/5 pointer-events-none" />

                      <div
                        className="absolute h-8 rounded-xl shadow-md border overflow-hidden flex items-center px-2.5 text-white text-xs font-bold transition-all duration-300 group-hover:h-9 z-0"
                        style={{
                          left: barPos.left,
                          width: barPos.width,
                          background: isDelayed
                            ? 'linear-gradient(90deg, #e11d48, #f43f5e)'
                            : isCompleted
                            ? 'linear-gradient(90deg, #059669, #10b981)'
                            : 'linear-gradient(90deg, #4f46e5, #6366f1)',
                          borderColor: isDelayed
                            ? 'rgba(244, 63, 94, 0.4)'
                            : isCompleted
                            ? 'rgba(16, 185, 129, 0.4)'
                            : 'rgba(99, 102, 241, 0.4)',
                        }}
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-white/20 border-r border-white/40"
                          style={{ width: `${order.progress}%` }}
                        />

                        <div className="relative z-10 flex items-center justify-between w-full text-xs truncate drop-shadow">
                          <span className="truncate font-semibold flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 shrink-0" />
                            {order.orderNumber}: {order.title}
                          </span>
                          <span className="ml-2 font-mono font-black tabular-nums">
                            {order.progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (row.type === 'master') {
                const barPos = getTimelineBarPosition(row.effectiveStartDate, row.effectiveTargetDate);

                return (
                  <div
                    key={row.id}
                    className="flex items-center hover:bg-purple-500/5 bg-slate-900/30 transition-colors group border-t border-white/10"
                  >
                    <div className="w-88 sm:w-96 p-3 border-r border-white/10 flex items-center justify-between gap-2 shrink-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <button
                          onClick={() => toggleOrderExpand('master_blueprint')}
                          className="p-1 rounded-lg hover:bg-white/10 text-purple-400 hover:text-purple-200 transition-colors shrink-0"
                          title={row.isExpanded ? t('collapse_all') : t('expand_all')}
                        >
                          {row.isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>

                        <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-xs font-extrabold text-purple-300">
                            {row.code}
                          </div>
                          <div className="text-xs font-bold text-white truncate mt-0.5">
                            {row.title}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 relative py-3 px-2 h-14 flex items-center">
                      <div className="absolute inset-0 grid grid-flow-col auto-cols-fr divide-x divide-white/5 pointer-events-none" />

                      <div
                        className="absolute h-8 rounded-xl shadow-md border overflow-hidden flex items-center px-2.5 text-white text-xs font-bold transition-all duration-300 group-hover:h-9 z-0"
                        style={{
                          left: barPos.left,
                          width: barPos.width,
                          background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
                          borderColor: 'rgba(168, 85, 247, 0.4)',
                        }}
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-white/20 border-r border-white/40"
                          style={{ width: `${row.progress}%` }}
                        />

                        <div className="relative z-10 flex items-center justify-between w-full text-xs truncate drop-shadow">
                          <span className="truncate font-semibold flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 shrink-0" />
                            {row.title}
                          </span>
                          <span className="ml-2 font-mono font-black tabular-nums">
                            {row.progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // BOM Node component row
              const node = row.node;
              const barPos = getTimelineBarPosition(node.startDate || '', node.dueDate || '');
              const isDelayed = node.status === 'delayed';
              const isCompleted = node.status === 'completed' || node.progress === 100;

              return (
                <div
                  key={node.id}
                  className="flex items-center hover:bg-white/5 bg-slate-950/25 transition-colors group"
                >
                  {/* Left Column: Component Info with Indentation */}
                  <div
                    className="w-88 sm:w-96 p-2.5 border-r border-white/10 flex items-center justify-between gap-2 shrink-0"
                    style={{ paddingLeft: `${14 + row.depth * 18}px` }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {row.hasChildren ? (
                        <button
                          onClick={() => toggleNodeExpand(node.id)}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
                          title={row.isExpanded ? t('collapse_all') : t('expand_all')}
                        >
                          {row.isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      ) : (
                        <div className="w-5 shrink-0" />
                      )}

                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300 font-bold font-mono shrink-0">
                        L{node.level}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[11px] font-bold text-indigo-400">
                            {node.code}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-slate-200 truncate">
                          {node.title}
                        </div>
                      </div>
                    </div>

                    {node.assignee && <Avatar assignee={node.assignee} size="xs" />}
                  </div>

                  {/* Timeline Ribbon Canvas for Component */}
                  <div className="flex-1 relative py-2.5 px-2 h-11 flex items-center">
                    <div className="absolute inset-0 grid grid-flow-col auto-cols-fr divide-x divide-white/5 pointer-events-none" />

                    <div
                      className="absolute h-6 rounded-lg shadow-sm border overflow-hidden flex items-center px-2 text-white text-[11px] font-medium transition-all duration-300 group-hover:h-7 z-0"
                      style={{
                        left: barPos.left,
                        width: barPos.width,
                        background: isDelayed
                          ? 'linear-gradient(90deg, #e11d48, #f43f5e)'
                          : isCompleted
                          ? 'linear-gradient(90deg, #059669, #10b981)'
                          : 'linear-gradient(90deg, #3b82f6, #6366f1)',
                        borderColor: isDelayed
                          ? 'rgba(244, 63, 94, 0.4)'
                          : isCompleted
                          ? 'rgba(16, 185, 129, 0.4)'
                          : 'rgba(99, 102, 241, 0.35)',
                      }}
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-white/20 border-r border-white/40"
                        style={{ width: `${node.progress}%` }}
                      />

                      <div className="relative z-10 flex items-center justify-between w-full text-[11px] truncate drop-shadow">
                        <span className="truncate font-medium">{node.title}</span>
                        <span className="ml-2 font-mono font-bold tabular-nums">
                          {node.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 px-6 text-center bg-slate-950/20 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">
              {t('gantt_no_orders', { name: project.name })}
            </h3>
            <p className="text-xs text-slate-400 max-w-md">
              {t('gantt_no_orders_hint')}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-4 space-y-5">
      {/* Top Controls Banner */}
      <GlassCard variant="elevated" className="p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <CalendarRange className="w-5 h-5 text-indigo-400 shrink-0" />
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t('gantt_title')}
              </h2>
              {/* Prominent Active Project Context Pill */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs">{project.name}</span>
                <span className="text-[11px] font-mono text-indigo-300 shrink-0">({project.code})</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {t('gantt_subtitle')} • <span className="text-slate-300 font-medium">{project.archetype || project.name}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-end">
            {/* Orders View Indicator Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 text-xs font-bold shadow-sm">
              <Package className="w-4 h-4 text-indigo-400" />
              <span>{t('view_mode_orders')}</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-md bg-indigo-400/20 text-[10px] font-mono font-bold text-indigo-300">
                {orders.length}
              </span>
            </div>

            {/* Quick Expand All / Collapse All */}
            <div className="flex items-center bg-white/10 dark:bg-slate-800/40 p-0.5 rounded-xl border border-white/10">
              <button
                onClick={handleExpandAll}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1"
                title={t('expand_all')}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('expand_all')}</span>
              </button>
              <button
                onClick={handleCollapseAll}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1"
                title={t('collapse_all')}
              >
                <span>{t('collapse_all')}</span>
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

            {/* Fullscreen Mode Button */}
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-slate-300 hover:text-white transition-all shadow-sm"
              title={t('fullscreen_expand')}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Gantt Matrix Canvas */}
      <GlassCard variant="elevated" className="overflow-hidden p-0">
        {renderGanttCanvas(false)}
      </GlassCard>

      {/* True 100vw / 100vh Full-Screen Presentation & Projector Mode for Gantt */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 w-screen h-screen bg-[#090e1f] p-6 sm:p-10 flex flex-col justify-between overflow-hidden animate-fadeIn">
          {/* Top Presentation Bar */}
          <div className="flex items-center justify-between border-b border-white/15 pb-5 shrink-0 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-glass-glow">
                <Projector className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {t('gantt_title')}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE TIMELINE PROJECTOR
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  {project.name} • {project.code} • {new Date().toLocaleDateString('uk-UA')}
                </p>
              </div>
            </div>

            {/* Interactive controls in fullscreen header */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Orders View Indicator */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 text-xs font-bold shadow-sm">
                <Package className="w-4 h-4 text-indigo-400" />
                <span>{t('view_mode_orders')}</span>
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-indigo-400/20 text-[10px] font-mono font-bold text-indigo-300">
                  {orders.length}
                </span>
              </div>

              {/* Quick Expand All / Collapse All */}
              <div className="flex items-center bg-white/10 p-0.5 rounded-xl border border-white/10">
                <button
                  onClick={handleExpandAll}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1"
                  title={t('expand_all')}
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('expand_all')}</span>
                </button>
                <button
                  onClick={handleCollapseAll}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1"
                  title={t('collapse_all')}
                >
                  <span>{t('collapse_all')}</span>
                </button>
              </div>

              {/* Zoom Switcher */}
              <div className="flex items-center bg-white/10 p-0.5 rounded-xl border border-white/10">
                {(['day', 'week', 'month', 'year'] as const).map((z) => (
                  <button
                    key={z}
                    onClick={() => setZoom(z)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      zoom === z
                        ? 'bg-white/25 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t(`scale_${z}` as any)}
                  </button>
                ))}
              </div>

              {/* Pan buttons */}
              <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-xl border border-white/10">
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

              <span className="hidden sm:inline-block font-mono text-sm font-bold text-slate-300 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10">
                {currentTime}
              </span>

              <button
                onClick={() => setIsFullscreen(false)}
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all hover:scale-105"
                title="Exit Fullscreen (Esc)"
              >
                <Minimize2 className="w-4 h-4" />
                <span>{t('fullscreen_minimize')}</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Body: Gantt Matrix filling screen */}
          <div className="flex-1 overflow-hidden py-6 flex flex-col">
            {renderGanttCanvas(true)}
          </div>

          {/* Bottom subtle hint */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-white/10 pt-3 shrink-0">
            <span>ProdTrack Flow Production Timeline Engine</span>
            <span>Натисніть [ ESC ] або кнопку згортання для повернення до стандартного перегляду</span>
          </div>
        </div>
      )}
    </div>
  );
};
