import React, { useState, useEffect } from 'react';
import { ProductionOrder, OrderStatus, OrderPriority, Assignee, ProductTemplate } from '../../types';
import { useI18n } from '../../locales';
import { APP_CONFIG } from '../../config/AppConfig';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { db } from '../../services/db';
import { Sparkles, Layers, Check } from 'lucide-react';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderToEdit: ProductionOrder | null;
  projectId: string;
  onSave: (order: ProductionOrder) => void;
  templates?: ProductTemplate[];
  onInstantiateFromTemplate?: (
    templateId: string,
    projectName: string,
    projectCode: string,
    batchQuantity: number,
    startDate: string,
    customerName: string
  ) => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  orderToEdit,
  projectId,
  onSave,
  templates = [],
  onInstantiateFromTemplate,
}) => {
  const { t } = useI18n();

  const [teamList, setTeamList] = useState<Assignee[]>(APP_CONFIG.DEFAULT_ASSIGNEES);
  const [creationMode, setCreationMode] = useState<'custom' | 'template'>('custom');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');

  const [orderNumber, setOrderNumber] = useState('');
  const [title, setTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [batchQuantity, setBatchQuantity] = useState(5);
  const [completedUnits, setCompletedUnits] = useState(0);
  const [status, setStatus] = useState<OrderStatus>('in_progress');
  const [priority, setPriority] = useState<OrderPriority>('medium');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetDate, setTargetDate] = useState(new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [highlightNote, setHighlightNote] = useState('');
  const [assignedLead, setAssignedLead] = useState<Assignee>(APP_CONFIG.DEFAULT_ASSIGNEES[0]);
  const [assignedTeam, setAssignedTeam] = useState<Assignee[]>([APP_CONFIG.DEFAULT_ASSIGNEES[0]]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const team = await db.team.toArray();
        if (team && team.length > 0) setTeamList(team);
      } catch (e) {
        console.error(e);
      }
    };
    if (isOpen) {
      fetchTeam();
    }
  }, [isOpen]);

  useEffect(() => {
    if (orderToEdit) {
      setCreationMode('custom');
      setOrderNumber(orderToEdit.orderNumber);
      setTitle(orderToEdit.title);
      setCustomerName(orderToEdit.customerName);
      setBatchQuantity(orderToEdit.batchQuantity);
      setCompletedUnits(orderToEdit.completedUnits);
      setStatus(orderToEdit.status);
      setPriority(orderToEdit.priority);
      setStartDate(orderToEdit.startDate);
      setTargetDate(orderToEdit.targetDate);
      setNotes(orderToEdit.notes);
      setHighlightNote(orderToEdit.highlightNote || '');
      setAssignedLead(orderToEdit.assignedLead);
      setAssignedTeam(orderToEdit.assignedTeam || [orderToEdit.assignedLead]);
    } else {
      setCreationMode('custom');
      setOrderNumber(`ORD-${Math.floor(4000 + Math.random() * 5000)}`);
      setTitle('Production Run Batch');
      setCustomerName('Tesla Gigafactory Assembly Line');
      setBatchQuantity(5);
      setCompletedUnits(0);
      setStatus('in_progress');
      setPriority('high');
      setStartDate(new Date().toISOString().split('T')[0]);
      setTargetDate(new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0]);
      setNotes('');
      setHighlightNote('New Production Run Scheduled');
      setAssignedLead(teamList[0] || APP_CONFIG.DEFAULT_ASSIGNEES[0]);
      setAssignedTeam([teamList[0] || APP_CONFIG.DEFAULT_ASSIGNEES[0]]);
    }
    setErrors({});
  }, [orderToEdit, isOpen]);

  const toggleTeamMember = (member: Assignee) => {
    setAssignedTeam((prev) => {
      const exists = prev.some((m) => m.id === member.id);
      if (exists) {
        if (prev.length === 1) return prev;
        return prev.filter((m) => m.id !== member.id);
      } else {
        return [...prev, member];
      }
    });
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!orderNumber.trim()) newErrors.orderNumber = t('required_field');
    if (!title.trim()) newErrors.title = t('required_field');
    if (!customerName.trim()) newErrors.customerName = t('required_field');

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (creationMode === 'template' && onInstantiateFromTemplate && selectedTemplateId) {
      onInstantiateFromTemplate(
        selectedTemplateId,
        title.trim(),
        orderNumber.trim().toUpperCase(),
        Number(batchQuantity) || 1,
        startDate,
        customerName.trim()
      );
      onClose();
      return;
    }

    const qty = Math.max(1, Number(batchQuantity) || 1);
    const completed = Math.min(qty, Math.max(0, Number(completedUnits) || 0));
    const calculatedProgress = Math.round((completed / qty) * 100);

    const updatedOrder: ProductionOrder = {
      id: orderToEdit ? orderToEdit.id : `ord-${Date.now()}`,
      orderNumber: orderNumber.trim().toUpperCase(),
      projectId,
      title: title.trim(),
      customerName: customerName.trim(),
      batchQuantity: qty,
      completedUnits: completed,
      status: completed === qty ? 'completed' : status,
      priority,
      progress: calculatedProgress,
      startDate,
      targetDate,
      notes: notes.trim(),
      highlightNote: highlightNote.trim(),
      assignedLead,
      assignedTeam,
    };

    onSave(updatedOrder);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={orderToEdit ? t('edit_order') : t('create_order')}
      subtitle="Configure production batch sizes, delivery milestones and engineering specialists"
      size="xl"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white/10 dark:hover:bg-slate-800 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all"
          >
            {creationMode === 'template' ? t('instantiate_button') : t('save_changes')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Mode Selector for New Orders */}
        {!orderToEdit && templates.length > 0 && onInstantiateFromTemplate && (
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/10 dark:bg-slate-800/40 border border-white/10">
            <button
              type="button"
              onClick={() => setCreationMode('custom')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                creationMode === 'custom'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('custom_order')}</span>
            </button>

            <button
              type="button"
              onClick={() => setCreationMode('template')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                creationMode === 'template'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{t('instantiate_from_template')}</span>
            </button>
          </div>
        )}

        {/* Template Picker if in template mode */}
        {creationMode === 'template' && (
          <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
            <label className="block text-xs font-bold text-purple-300">
              Select Product Template Blueprint:
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-purple-400/30 text-white outline-none"
            >
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name} ({tmpl.code} — {tmpl.nodes.length} Components)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left column */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('order_number')} *
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
                {errors.orderNumber && (
                  <span className="text-[10px] text-rose-400">{errors.orderNumber}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('priority')}
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as OrderPriority)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                >
                  {APP_CONFIG.PRIORITY_OPTIONS.map((pr) => (
                    <option key={pr.value} value={pr.value} className="bg-slate-900 text-white">
                      {t(pr.key as any)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Order Title / Batch Description *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Batch LR-01 (North America Logistics)"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              />
              {errors.title && <span className="text-[10px] text-rose-400">{errors.title}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('customer_name')} *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Tesla Fremont Facility"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              />
              {errors.customerName && (
                <span className="text-[10px] text-rose-400">{errors.customerName}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('order_status')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              >
                {APP_CONFIG.ORDER_STATUS_OPTIONS.map((st) => (
                  <option key={st.value} value={st.value} className="bg-slate-900 text-white">
                    {t(st.key as any)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Batch Quantities */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('batch_quantity')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={batchQuantity}
                  onChange={(e) => setBatchQuantity(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('completed_units')}
                </label>
                <input
                  type="number"
                  min="0"
                  max={batchQuantity}
                  value={completedUnits}
                  onChange={(e) => setCompletedUnits(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('start_date')}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('target_date')}
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>
            </div>

            {/* Highlight note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Highlight Summary / Status Note
              </label>
              <input
                type="text"
                value={highlightNote}
                onChange={(e) => setHighlightNote(e.target.value)}
                placeholder="e.g. 85% overall, On Track"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              />
            </div>

            {/* Lead Specialist Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Lead Production Engineer
              </label>
              <select
                value={assignedLead.id}
                onChange={(e) => {
                  const found = teamList.find((a) => a.id === e.target.value);
                  if (found) setAssignedLead(found);
                }}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              >
                {teamList.map((usr) => (
                  <option key={usr.id} value={usr.id} className="bg-slate-900 text-white">
                    {usr.name} ({usr.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
