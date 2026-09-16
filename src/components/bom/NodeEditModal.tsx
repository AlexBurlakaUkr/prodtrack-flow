import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Trash2,
  Calendar,
  Layers,
  Users,
  Check,
  Clock,
  Lock,
  Info,
  Sliders,
  AlertTriangle,
} from 'lucide-react';
import { BOMNode, NodeLevel, NodeStatus, Assignee, DelayConfig } from '../../types';
import { useI18n } from '../../locales';
import { APP_CONFIG } from '../../config/AppConfig';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { db } from '../../services/db';
import { getDelayConfig, evaluateNodeDelay } from '../../services/delayService';

interface NodeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeToEdit: BOMNode | null;
  parentNode: BOMNode | null;
  projectId: string;
  orderId?: string | null;
  hasChildren?: boolean;
  onSave: (node: BOMNode) => void;
}

export const NodeEditModal: React.FC<NodeEditModalProps> = ({
  isOpen,
  onClose,
  nodeToEdit,
  parentNode,
  projectId,
  orderId = null,
  hasChildren = false,
  onSave,
}) => {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Team State
  const [teamList, setTeamList] = useState<Assignee[]>(APP_CONFIG.DEFAULT_ASSIGNEES);

  // Form State
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [level, setLevel] = useState<NodeLevel>(1);
  const [progress, setProgress] = useState(0);
  const [ownProgress, setOwnProgress] = useState(0);
  const [lastCustomProgress, setLastCustomProgress] = useState(50);
  const [status, setStatus] = useState<NodeStatus>('pending');
  const [selectedAssignees, setSelectedAssignees] = useState<Assignee[]>([APP_CONFIG.DEFAULT_ASSIGNEES[0]]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [batchQuantity, setBatchQuantity] = useState(1);
  const [unit, setUnit] = useState('pcs');
  const [normHours, setNormHours] = useState<number>(8);
  const [childrenTotalHours, setChildrenTotalHours] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [delayConfig, setDelayConfig] = useState<DelayConfig>(() => getDelayConfig());
  const [delayReasons, setDelayReasons] = useState<string[]>([]);
  const [delayNotes, setDelayNotes] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Is this node locked for direct progress slider editing?
  const isParentNode = Boolean(nodeToEdit && hasChildren);

  // Sync delayConfig on open
  useEffect(() => {
    if (isOpen) {
      setDelayConfig(getDelayConfig());
    }
  }, [isOpen]);

  // Load direct children's hours when editing parent node
  useEffect(() => {
    const fetchChildrenHours = async () => {
      if (!nodeToEdit || !hasChildren) {
        setChildrenTotalHours(0);
        return;
      }
      try {
        const children = await db.nodes.where('parentId').equals(nodeToEdit.id).toArray();
        const sum = children.reduce((acc, c) => {
          const h =
            typeof c.totalNormHours === 'number' && c.totalNormHours > 0
              ? c.totalNormHours
              : c.normHours || 0;
          return acc + h;
        }, 0);
        setChildrenTotalHours(Math.round(sum * 10) / 10);
      } catch (err) {
        console.error('Failed to load children norm hours:', err);
      }
    };
    if (isOpen) {
      fetchChildrenHours();
    }
  }, [isOpen, nodeToEdit, hasChildren]);

  // Load team members from database
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const members = await db.team.toArray();
        if (members && members.length > 0) {
          setTeamList(members);
        }
      } catch (err) {
        console.error('Failed to load team:', err);
      }
    };
    if (isOpen) {
      fetchTeam();
    }
  }, [isOpen]);

  useEffect(() => {
    if (nodeToEdit) {
      setTitle(nodeToEdit.title);
      setCode(nodeToEdit.code);
      setLevel(nodeToEdit.level);
      setProgress(nodeToEdit.progress);
      const initialOwn =
        typeof nodeToEdit.ownProgress === 'number'
          ? nodeToEdit.ownProgress
          : nodeToEdit.status === 'completed'
          ? 100
          : nodeToEdit.status === 'pending'
          ? 0
          : nodeToEdit.progress;
      setOwnProgress(initialOwn);
      setLastCustomProgress(
        initialOwn > 0 && initialOwn < 100
          ? initialOwn
          : 50
      );
      setStatus(nodeToEdit.status);

      const currentAssignees =
        nodeToEdit.assignees && nodeToEdit.assignees.length > 0
          ? nodeToEdit.assignees
          : nodeToEdit.assignee
          ? [nodeToEdit.assignee]
          : [APP_CONFIG.DEFAULT_ASSIGNEES[0]];

      setSelectedAssignees(currentAssignees);
      setStartDate(nodeToEdit.startDate);
      setDueDate(nodeToEdit.dueDate);
      setBatchQuantity(nodeToEdit.batchQuantity);
      setUnit(nodeToEdit.unit);
      setNormHours(
        typeof nodeToEdit.normHours === 'number'
          ? nodeToEdit.normHours
          : nodeToEdit.weight || 8
      );
      setNotes(nodeToEdit.notes || '');
      setImage(nodeToEdit.image);
      setDelayReasons(nodeToEdit.delayReasons || []);
      setDelayNotes(nodeToEdit.delayNotes || '');
    } else if (parentNode) {
      // Adding child
      const childLevel = Math.min(5, parentNode.level + 1) as NodeLevel;
      setTitle('');
      setCode(`PART-${Math.floor(1000 + Math.random() * 9000)}`);
      setLevel(childLevel);
      setProgress(0);
      setOwnProgress(0);
      setLastCustomProgress(50);
      setStatus('pending');
      setSelectedAssignees(
        parentNode.assignees && parentNode.assignees.length > 0
          ? [parentNode.assignees[0]]
          : [APP_CONFIG.DEFAULT_ASSIGNEES[0]]
      );
      setStartDate(parentNode.startDate);
      setDueDate(parentNode.dueDate);
      setBatchQuantity(1);
      setUnit('pcs');
      setNormHours(8);
      setNotes('');
      setImage(undefined);
      setDelayReasons([]);
      setDelayNotes('');
    } else {
      // Adding new root node
      setTitle('');
      setCode(`PROD-${Math.floor(1000 + Math.random() * 9000)}`);
      setLevel(1);
      setProgress(0);
      setOwnProgress(0);
      setLastCustomProgress(50);
      setStatus('pending');
      setSelectedAssignees([APP_CONFIG.DEFAULT_ASSIGNEES[0]]);
      setStartDate(new Date().toISOString().split('T')[0]);
      setDueDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
      setBatchQuantity(1);
      setUnit('units');
      setNormHours(50);
      setNotes('');
      setImage(undefined);
      setDelayReasons([]);
      setDelayNotes('');
    }
    setErrors({});
  }, [nodeToEdit, parentNode, isOpen]);

  /**
   * Handle Status transitions and apply automated progress locking rules:
   * - "pending" (в очікуванні): progress is always 0%, slider disabled.
   * - "in_progress" (у виробництві): slider enabled, user can freely adjust 1..99% (restoring previous value).
   * - "in_review" / "completed" (на перевірці / завершено): progress is always 100%, slider disabled.
   * - "delayed" (затримка / заблоковано): progress is preserved as-is, slider disabled.
   */
  const handleStatusChange = (newStatus: NodeStatus) => {
    setStatus(newStatus);

    if (newStatus === 'pending') {
      if (progress > 0 && progress < 100) {
        setLastCustomProgress(progress);
      }
      setProgress(0);
      setOwnProgress(0);
    } else if (newStatus === 'in_review' || newStatus === 'completed') {
      if (progress > 0 && progress < 100) {
        setLastCustomProgress(progress);
      }
      setProgress(100);
      setOwnProgress(100);
    } else if (newStatus === 'delayed') {
      // Keep progress exactly what it was before setting delayed
      if (progress > 0 && progress < 100) {
        setLastCustomProgress(progress);
      }
    } else if (newStatus === 'in_progress') {
      // Re-enable slider; if progress was 0% or 100%, restore last custom progress
      if (progress === 0 || progress === 100) {
        const restored = lastCustomProgress > 0 && lastCustomProgress < 100 ? lastCustomProgress : 50;
        setProgress(restored);
        setOwnProgress(restored);
      }
    }
  };

  const handleProgressSliderChange = (newVal: number) => {
    setProgress(newVal);
    setOwnProgress(newVal);
    if (newVal > 0 && newVal < 100) {
      setLastCustomProgress(newVal);
    }
  };

  const toggleAssignee = (member: Assignee) => {
    setSelectedAssignees((prev) => {
      const exists = prev.some((a) => a.id === member.id);
      if (exists) {
        if (prev.length === 1) return prev;
        return prev.filter((a) => a.id !== member.id);
      } else {
        return [...prev, member];
      }
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('Image file size must be less than 4MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = t('required_field');
    if (!code.trim()) newErrors.code = t('required_field');

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const finalAssignees =
      selectedAssignees.length > 0 ? selectedAssignees : [APP_CONFIG.DEFAULT_ASSIGNEES[0]];

    const assignedOrderId = nodeToEdit ? nodeToEdit.orderId : orderId || null;
    const finalHours = Number(normHours) >= 0 ? Number(normHours) : 1;
    const finalBaseHours = nodeToEdit?.baseNormHours || finalHours;

    const updatedNode: BOMNode = {
      id: nodeToEdit
        ? nodeToEdit.id
        : `node-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      projectId,
      orderId: assignedOrderId,
      parentId: nodeToEdit ? nodeToEdit.parentId : parentNode ? parentNode.id : null,
      title: title.trim(),
      code: code.trim().toUpperCase(),
      level,
      progress: status === 'completed' ? 100 : progress,
      ownProgress: isParentNode ? ownProgress : status === 'completed' ? 100 : progress,
      status,
      assignees: finalAssignees,
      assignee: finalAssignees[0],
      startDate,
      dueDate,
      baseBatchQuantity: nodeToEdit?.baseBatchQuantity || Number(batchQuantity) || 1,
      batchQuantity: Number(batchQuantity) || 1,
      unit: unit.trim() || 'pcs',
      baseNormHours: finalBaseHours,
      normHours: finalHours,
      weight: finalHours,
      notes: notes.trim(),
      delayReasons: delayReasons.length > 0 ? delayReasons : undefined,
      delayNotes: delayNotes.trim() || undefined,
      image,
      orderIndex: nodeToEdit ? nodeToEdit.orderIndex : Date.now(),
    };

    onSave(updatedNode);
    onClose();
  };

  // Determine if slider should be disabled
  const isSliderDisabled = isParentNode || status !== 'in_progress';

  // Check if overdue or approaching or has historical delay data
  const isNodeOverdue = Boolean(
    dueDate && evaluateNodeDelay({ dueDate, progress } as BOMNode, delayConfig).isOverdue
  );
  const hasRecordedDelayData = Boolean(
    (nodeToEdit?.delayReasons && nodeToEdit.delayReasons.length > 0) ||
    Boolean(nodeToEdit?.delayNotes && nodeToEdit.delayNotes.trim().length > 0) ||
    delayReasons.length > 0 ||
    delayNotes.trim().length > 0
  );
  const showDelayFields = isNodeOverdue || hasRecordedDelayData || status === 'delayed';

  const toggleDelayReason = (reasonLabel: string) => {
    setDelayReasons((prev) =>
      prev.includes(reasonLabel)
        ? prev.filter((r) => r !== reasonLabel)
        : [...prev, reasonLabel]
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={nodeToEdit ? t('edit_node') : t('add_child_node')}
      subtitle={
        parentNode ? (
          `Parent: ${parentNode.code} — ${parentNode.title}`
        ) : isParentNode ? (
          <span className="flex items-center gap-1 text-indigo-300">
            <Info className="w-3.5 h-3.5" />
            {t('rollup_notice')}
          </span>
        ) : undefined
      }
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
            {t('save_changes')}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Column: Core Fields */}
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('node_title')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 2170 Lithium-Ion Battery Cell Brick"
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
            />
            {errors.title && <span className="text-[10px] text-rose-400 mt-1">{errors.title}</span>}
          </div>

          {/* Code & Level */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('node_code')} *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CELL-2170"
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              />
              {errors.code && <span className="text-[10px] text-rose-400 mt-1">{errors.code}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('level')}
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(Number(e.target.value) as NodeLevel)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              >
                {APP_CONFIG.LEVELS.map((lvl) => (
                  <option key={lvl.level} value={lvl.level} className="bg-slate-900 text-white">
                    L{lvl.level}: {t(lvl.key as any)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Progress Section: Dual display for Parent nodes, single slider for Leaf nodes */}
          {isParentNode ? (
            <div className="space-y-3">
              {/* 1. Overall Roll-up Progress (Read-only calculation) */}
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {t('rollup_progress_label')}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-md border border-indigo-500/30">
                      <Lock className="w-2.5 h-2.5" />
                      Auto Roll-up
                    </span>
                  </div>
                  <span className="text-sm font-extrabold text-indigo-400 tabular-nums">
                    {progress}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-lg bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-2 leading-tight flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                  <span>{t('progress_locked_hint')}</span>
                </p>
              </div>

              {/* 2. Parent's Dedicated Own Work Progress Slider */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  status === 'in_progress'
                    ? 'bg-white/10 dark:bg-slate-800/40 border-white/15'
                    : 'bg-slate-900/40 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {t('node_own_progress')}
                    </label>
                    {status === 'pending' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-300 bg-slate-700/50 px-2 py-0.5 rounded-md border border-white/10">
                        <Lock className="w-2.5 h-2.5" />
                        0%
                      </span>
                    ) : status === 'completed' || status === 'in_review' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                        <Lock className="w-2.5 h-2.5" />
                        100%
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded-md border border-sky-500/30">
                        Регулюється
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-extrabold text-sky-400 tabular-nums">
                    {ownProgress}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  disabled={status !== 'in_progress'}
                  value={ownProgress}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setOwnProgress(val);
                    if (val > 0 && val < 100) setLastCustomProgress(val);
                  }}
                  className={`w-full h-2 rounded-lg appearance-none transition-all ${
                    status !== 'in_progress'
                      ? 'bg-slate-800 opacity-50 cursor-not-allowed'
                      : 'bg-slate-700 cursor-pointer accent-sky-500 hover:accent-sky-400'
                  }`}
                />
                <p className="text-[10px] text-slate-400 mt-2 leading-tight flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                  <span>{t('node_own_progress_hint')}</span>
                </p>
              </div>
            </div>
          ) : (
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                status === 'in_progress'
                  ? 'bg-white/10 dark:bg-slate-800/40 border-white/15'
                  : 'bg-slate-900/40 border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {t('node_progress')}
                  </label>

                  {status === 'pending' ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-300 bg-slate-700/50 px-2 py-0.5 rounded-md border border-white/10">
                      <Lock className="w-2.5 h-2.5" />
                      0% (В очікуванні)
                    </span>
                  ) : status === 'in_review' || status === 'completed' ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                      <Lock className="w-2.5 h-2.5" />
                      100% ({status === 'completed' ? 'Завершено' : 'На перевірці'})
                    </span>
                  ) : status === 'delayed' ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/30">
                      <Lock className="w-2.5 h-2.5" />
                      Зафіксовано ({progress}%)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded-md border border-sky-500/30">
                      Регулюється вручну
                    </span>
                  )}
                </div>

                <span className="text-sm font-extrabold text-indigo-400 tabular-nums">
                  {progress}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                disabled={status !== 'in_progress'}
                value={progress}
                onChange={(e) => handleProgressSliderChange(Number(e.target.value))}
                className={`w-full h-2 rounded-lg appearance-none transition-all ${
                  status !== 'in_progress'
                    ? 'bg-slate-800 opacity-50 cursor-not-allowed'
                    : 'bg-slate-700 cursor-pointer accent-indigo-500 hover:accent-indigo-400'
                }`}
              />

              {/* Explanatory Tooltip / Notice */}
              <p className="text-[10px] text-slate-400 mt-2 leading-tight flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                <span>
                  {status === 'pending'
                    ? t('status_pending_hint')
                    : status === 'in_review' || status === 'completed'
                    ? t('status_completed_hint')
                    : status === 'delayed'
                    ? t('status_delayed_hint')
                    : t('status_in_progress_hint')}
                </span>
              </p>
            </div>
          )}

          {/* Status & Norm-Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('status')}
              </label>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as NodeStatus)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              >
                {APP_CONFIG.STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                    {t(opt.key as any)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>{t('node_own_norm_hours_short')}</span>
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={normHours}
                  onChange={(e) => setNormHours(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border text-slate-900 dark:text-white outline-none bg-white/30 dark:bg-slate-800/60 border-white/20 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/50 font-medium"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold pointer-events-none">
                  {t('norm_hours_unit')}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                {t('node_own_norm_hours_hint')}
              </p>

              {/* Calculated Total Norm-Hours: only shown if node has children */}
              {isParentNode && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-indigo-300">
                      <span className="text-xs font-extrabold text-indigo-400">∑</span>
                      <span>{t('total_norm_hours')}</span>
                    </span>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                      {Math.round(((Number(normHours) || 0) + childrenTotalHours) * 10) / 10} {t('norm_hours_unit')}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    {Number(normHours) || 0} {t('norm_hours_unit')} ({t('node_own_norm_hours_short')}) + {childrenTotalHours} {t('norm_hours_unit')} ({t('subcomponents_label')})
                  </p>
                  <span className="inline-flex items-center gap-1 text-[9px] text-indigo-300/80 mt-1">
                    <Lock className="w-2.5 h-2.5" />
                    {t('total_norm_hours_readonly_badge')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Multi-Assignee Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('node_assignee')} ({selectedAssignees.length})</span>
              </span>
              <span className="text-[10px] text-slate-400">Click to assign</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto custom-scrollbar p-1">
              {teamList.map((usr) => {
                const isSelected = selectedAssignees.some((a) => a.id === usr.id);
                return (
                  <button
                    type="button"
                    key={usr.id}
                    onClick={() => toggleAssignee(usr)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-500/25 border-indigo-400 text-white shadow-sm'
                        : 'bg-white/10 dark:bg-slate-800/40 border-white/10 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar assignee={usr} size="xs" />
                      <div className="truncate">
                        <div className="text-[11px] font-bold truncate">{usr.name}</div>
                        <div className="text-[9px] text-slate-400 truncate">{usr.role}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Schedule, Batch Quantity & Photo Upload */}
        <div className="space-y-4">
          {/* Start & Due Date */}
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
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              />
            </div>
          </div>

          {/* Batch Quantity & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('node_batch_qty')}
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
                {t('unit')}
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="pcs / units"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              />
            </div>
          </div>

          {/* Photo Upload Attachment */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('node_photo')}
            </label>
            <div className="flex items-center gap-4">
              {image ? (
                <div className="relative w-24 h-24 rounded-2xl bg-black/40 border border-white/20 p-1 shrink-0 overflow-hidden flex items-center justify-center group shadow-md">
                  <img src={image} alt="Preview" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setImage(undefined)}
                    className="absolute inset-0 bg-rose-900/80 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="text-[10px] mt-1 font-bold">{t('remove_photo')}</span>
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 border-2 border-dashed border-white/20 rounded-2xl hover:border-indigo-400/50 hover:bg-white/5 transition-all cursor-pointer flex flex-col items-center justify-center text-center"
                >
                  <Upload className="w-6 h-6 text-indigo-400 mb-2" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {t('upload_photo')}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {t('drop_photo_hint')}
                  </span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Technical Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('node_notes')}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Assembly tolerances, torque specs, testing procedures..."
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none"
            />
          </div>

          {/* Overdue / Delay Details Section (appears when overdue, delayed, or previously recorded) */}
          {showDelayFields && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3.5 transition-all animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="text-xs font-bold text-rose-300">
                    {t('delay_section_title')}
                  </span>
                </div>
                {progress === 100 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {t('delay_history_badge')}
                  </span>
                )}
              </div>

              {/* Delay Reasons Multi-Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('delay_reasons_label')}
                </label>
                <p className="text-[10px] text-slate-400 mb-2">
                  {t('delay_reasons_multi_hint')}
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1">
                  {delayConfig.reasons.map((reason) => {
                    const isSelected = delayReasons.includes(reason.label);
                    return (
                      <button
                        key={reason.id}
                        type="button"
                        onClick={() => toggleDelayReason(reason.label)}
                        className={`text-left text-xs px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-rose-500/25 border-rose-400 text-rose-100 font-bold shadow-sm shadow-rose-950/40'
                            : 'bg-white/10 dark:bg-slate-800/40 border-white/10 text-slate-300 hover:border-white/30 hover:bg-white/15'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                            isSelected
                              ? 'bg-rose-500 border-rose-400 text-white'
                              : 'border-white/30'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className="text-[11px] leading-tight">{reason.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Delay Notes Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('delay_notes_label')}
                </label>
                <textarea
                  rows={3}
                  value={delayNotes}
                  onChange={(e) => setDelayNotes(e.target.value)}
                  placeholder={t('delay_notes_placeholder')}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-rose-500/30 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-500/50 outline-none resize-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
