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
} from 'lucide-react';
import { BOMNode, NodeLevel, NodeStatus, Assignee } from '../../types';
import { useI18n } from '../../locales';
import { APP_CONFIG } from '../../config/AppConfig';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { db } from '../../services/db';

interface NodeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeToEdit: BOMNode | null;
  parentNode: BOMNode | null;
  projectId: string;
  hasChildren?: boolean;
  onSave: (node: BOMNode) => void;
}

export const NodeEditModal: React.FC<NodeEditModalProps> = ({
  isOpen,
  onClose,
  nodeToEdit,
  parentNode,
  projectId,
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
  const [lastCustomProgress, setLastCustomProgress] = useState(50);
  const [status, setStatus] = useState<NodeStatus>('pending');
  const [selectedAssignees, setSelectedAssignees] = useState<Assignee[]>([APP_CONFIG.DEFAULT_ASSIGNEES[0]]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [batchQuantity, setBatchQuantity] = useState(1);
  const [unit, setUnit] = useState('pcs');
  const [normHours, setNormHours] = useState<number>(8);
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Is this node locked for direct progress/hours editing?
  const isParentNode = Boolean(nodeToEdit && hasChildren);

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
      setLastCustomProgress(
        nodeToEdit.progress > 0 && nodeToEdit.progress < 100
          ? nodeToEdit.progress
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
    } else if (parentNode) {
      // Adding child
      const childLevel = Math.min(5, parentNode.level + 1) as NodeLevel;
      setTitle('');
      setCode(`PART-${Math.floor(1000 + Math.random() * 9000)}`);
      setLevel(childLevel);
      setProgress(0);
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
    } else {
      // Adding new root node
      setTitle('');
      setCode(`PROD-${Math.floor(1000 + Math.random() * 9000)}`);
      setLevel(1);
      setProgress(0);
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

    if (isParentNode) {
      // Parent node progress is always calculated via roll-up
      return;
    }

    if (newStatus === 'pending') {
      if (progress > 0 && progress < 100) {
        setLastCustomProgress(progress);
      }
      setProgress(0);
    } else if (newStatus === 'in_review' || newStatus === 'completed') {
      if (progress > 0 && progress < 100) {
        setLastCustomProgress(progress);
      }
      setProgress(100);
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
      }
    }
  };

  const handleProgressSliderChange = (newVal: number) => {
    setProgress(newVal);
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

    const updatedNode: BOMNode = {
      id: nodeToEdit
        ? nodeToEdit.id
        : `node-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      projectId,
      parentId: nodeToEdit ? nodeToEdit.parentId : parentNode ? parentNode.id : null,
      title: title.trim(),
      code: code.trim().toUpperCase(),
      level,
      progress,
      status,
      assignees: finalAssignees,
      assignee: finalAssignees[0],
      startDate,
      dueDate,
      batchQuantity: Number(batchQuantity) || 1,
      unit: unit.trim() || 'pcs',
      normHours: Number(normHours) >= 0 ? Number(normHours) : 1,
      weight: Number(normHours) >= 0 ? Number(normHours) : 1,
      notes: notes.trim(),
      image,
      orderIndex: nodeToEdit ? nodeToEdit.orderIndex : Date.now(),
    };

    onSave(updatedNode);
    onClose();
  };

  // Determine if slider should be disabled
  const isSliderDisabled = isParentNode || status !== 'in_progress';

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

          {/* Progress Slider (Smart Locking based on parent state & status) */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              isParentNode
                ? 'bg-indigo-500/10 border-indigo-500/25'
                : status === 'in_progress'
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

                {isParentNode ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-md border border-indigo-500/30">
                    <Lock className="w-2.5 h-2.5" />
                    Auto Roll-up
                  </span>
                ) : status === 'pending' ? (
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
              disabled={isSliderDisabled}
              value={progress}
              onChange={(e) => handleProgressSliderChange(Number(e.target.value))}
              className={`w-full h-2 rounded-lg appearance-none transition-all ${
                isSliderDisabled
                  ? 'bg-slate-800 opacity-50 cursor-not-allowed'
                  : 'bg-slate-700 cursor-pointer accent-indigo-500 hover:accent-indigo-400'
              }`}
            />

            {/* Explanatory Tooltip / Notice */}
            <p className="text-[10px] text-slate-400 mt-2 leading-tight flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
              <span>
                {isParentNode
                  ? t('progress_locked_hint')
                  : status === 'pending'
                  ? t('status_pending_hint')
                  : status === 'in_review' || status === 'completed'
                  ? t('status_completed_hint')
                  : status === 'delayed'
                  ? t('status_delayed_hint')
                  : t('status_in_progress_hint')}
              </span>
            </p>
          </div>

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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-400" />
                  <span>{t('norm_hours_short')}</span>
                </span>
                {isParentNode && (
                  <span className="text-[9px] font-bold text-sky-300 flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" />
                    Sum
                  </span>
                )}
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  disabled={isParentNode}
                  value={normHours}
                  onChange={(e) => setNormHours(Number(e.target.value))}
                  className={`w-full px-3.5 py-2 text-xs rounded-xl border text-slate-900 dark:text-white outline-none ${
                    isParentNode
                      ? 'bg-sky-500/15 border-sky-500/30 text-sky-200 cursor-not-allowed font-bold'
                      : 'bg-white/30 dark:bg-slate-800/60 border-white/20 dark:border-white/10 focus:ring-2 focus:ring-indigo-500/50'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold pointer-events-none">
                  {t('norm_hours_unit')}
                </span>
              </div>

              {isParentNode && (
                <p className="text-[9px] text-sky-300/80 mt-1 leading-tight">
                  {t('norm_hours_locked_hint')}
                </p>
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
        </div>
      </div>
    </Modal>
  );
};
