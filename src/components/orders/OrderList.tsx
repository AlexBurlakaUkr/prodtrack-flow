import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ProductionOrder, Project, OrderStatus, ProductTemplate } from '../../types';
import { useI18n } from '../../locales';
import { GlassCard } from '../ui/GlassCard';
import { OrderCard } from './OrderCard';
import { OrderModal } from './OrderModal';

interface OrderListProps {
  project: Project;
  orders: ProductionOrder[];
  templates?: ProductTemplate[];
  onSaveOrder: (order: ProductionOrder) => void;
  onDeleteOrder: (orderId: string) => void;
  onInstantiateFromTemplate?: (
    templateId: string,
    projectName: string,
    projectCode: string,
    batchQuantity: number,
    startDate: string,
    customerName: string
  ) => void;
  searchQuery: string;
}

export const OrderList: React.FC<OrderListProps> = ({
  project,
  orders,
  templates = [],
  onSaveOrder,
  onDeleteOrder,
  onInstantiateFromTemplate,
  searchQuery,
}) => {
  const { t } = useI18n();

  const [modalOpen, setModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<ProductionOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');

  // Calculate Batch Aggregations
  const stats = useMemo(() => {
    let totalUnits = 0;
    let completedUnits = 0;
    let inProgressCount = 0;
    let delayedCount = 0;
    let completedOrders = 0;

    orders.forEach((ord) => {
      totalUnits += ord.batchQuantity;
      completedUnits += ord.completedUnits;
      if (ord.status === 'in_progress') inProgressCount++;
      if (ord.status === 'urgent_delayed') delayedCount++;
      if (ord.status === 'completed') completedOrders++;
    });

    const overallBatchProgress =
      totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

    return {
      totalOrders: orders.length,
      totalUnits,
      completedUnits,
      inProgressCount,
      delayedCount,
      completedOrders,
      overallBatchProgress,
    };
  }, [orders]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (statusFilter !== 'all' && ord.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = ord.orderNumber.toLowerCase().includes(q);
        const matchTitle = ord.title.toLowerCase().includes(q);
        const matchCust = ord.customerName.toLowerCase().includes(q);
        const matchLead = ord.assignedLead.name.toLowerCase().includes(q);
        if (!matchNum && !matchTitle && !matchCust && !matchLead) return false;
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-4 space-y-5">
      {/* Top Header & Metrics Banner */}
      <GlassCard variant="elevated" className="p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t('orders_title')}
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {t('orders_subtitle')}
            </p>
          </div>

          <button
            onClick={() => {
              setOrderToEdit(null);
              setModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>{t('create_order')}</span>
          </button>
        </div>

        {/* Quick Batch KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-black/5 dark:border-white/10">
          <div className="p-3 rounded-2xl bg-white/10 dark:bg-slate-800/40 border border-white/10">
            <div className="text-[11px] font-semibold text-slate-400">
              {t('kpi_total_orders')}
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {stats.totalOrders}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 dark:bg-slate-800/40 border border-white/10">
            <div className="text-[11px] font-semibold text-slate-400">
              {t('kpi_total_units')}
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-indigo-400 mt-1">
              {stats.completedUnits} / {stats.totalUnits}{' '}
              <span className="text-xs text-slate-400 font-normal">
                ({stats.overallBatchProgress}%)
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 dark:bg-slate-800/40 border border-white/10">
            <div className="text-[11px] font-semibold text-slate-400">
              {t('order_status_in_progress')}
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-sky-400 mt-1">
              {stats.inProgressCount}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 dark:bg-slate-800/40 border border-white/10">
            <div className="text-[11px] font-semibold text-slate-400">
              {t('order_status_urgent_delayed')}
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-rose-400 mt-1">
              {stats.delayedCount}
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/10 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>Filter:</span>
          </div>

          {(['all', 'in_progress', 'urgent_delayed', 'completed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                statusFilter === st
                  ? 'bg-indigo-500/25 border-indigo-400 text-white shadow-sm'
                  : 'bg-white/10 dark:bg-slate-800/40 border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'all'
                ? t('filter_all')
                : st === 'in_progress'
                ? t('order_status_in_progress')
                : st === 'urgent_delayed'
                ? t('order_status_urgent_delayed')
                : t('order_status_completed')}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Orders Grid */}
      {filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onEdit={(ord) => {
                setOrderToEdit(ord);
                setModalOpen(true);
              }}
              onDelete={onDeleteOrder}
            />
          ))}
        </div>
      ) : (
        <GlassCard variant="elevated" className="p-12 text-center max-w-md mx-auto">
          <Package className="w-12 h-12 text-indigo-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t('no_orders')}
          </h3>
          <button
            onClick={() => {
              setOrderToEdit(null);
              setModalOpen(true);
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg"
          >
            {t('create_order')}
          </button>
        </GlassCard>
      )}

      {/* Create / Edit Modal */}
      <OrderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        orderToEdit={orderToEdit}
        projectId={project.id}
        templates={templates}
        onSave={(ord) => {
          onSaveOrder(ord);
          setModalOpen(false);
        }}
        onInstantiateFromTemplate={onInstantiateFromTemplate}
      />
    </div>
  );
};
