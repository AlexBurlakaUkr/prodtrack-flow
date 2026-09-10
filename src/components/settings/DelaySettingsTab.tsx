import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Clock,
  Tag,
  Info,
} from 'lucide-react';
import { DelayConfig, DelayReason } from '../../types';
import {
  getDelayConfig,
  saveDelayConfig,
  resetDelayConfig,
  DELAY_CONFIG_UPDATED_EVENT,
} from '../../services/delayService';
import { useI18n } from '../../locales';

export const DelaySettingsTab: React.FC = () => {
  const { t } = useI18n();
  const [config, setConfig] = useState<DelayConfig>(() => getDelayConfig());

  const [deadlineDays, setDeadlineDays] = useState<number>(config.deadlineWarningDaysThreshold);
  const [progressThreshold, setProgressThreshold] = useState<number>(config.progressWarningThreshold);
  const [reasons, setReasons] = useState<DelayReason[]>(config.reasons);

  // New Reason form
  const [newReasonText, setNewReasonText] = useState('');
  const [editingReasonId, setEditingReasonId] = useState<string | null>(null);
  const [editingReasonText, setEditingReasonText] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<DelayConfig>;
      if (customEvent.detail) {
        setConfig(customEvent.detail);
        setDeadlineDays(customEvent.detail.deadlineWarningDaysThreshold);
        setProgressThreshold(customEvent.detail.progressWarningThreshold);
        setReasons(customEvent.detail.reasons);
      }
    };
    window.addEventListener(DELAY_CONFIG_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(DELAY_CONFIG_UPDATED_EVENT, handleUpdate);
  }, []);

  const handleSave = async () => {
    const updated: DelayConfig = {
      deadlineWarningDaysThreshold: Math.max(0, Number(deadlineDays)),
      progressWarningThreshold: Math.min(100, Math.max(0, Number(progressThreshold))),
      reasons,
    };
    await saveDelayConfig(updated);
    setConfig(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleReset = async () => {
    const def = await resetDelayConfig();
    setConfig(def);
    setDeadlineDays(def.deadlineWarningDaysThreshold);
    setProgressThreshold(def.progressWarningThreshold);
    setReasons(def.reasons);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAddReason = () => {
    if (!newReasonText.trim()) return;
    const newReason: DelayReason = {
      id: `reason-${Date.now()}`,
      label: newReasonText.trim(),
      isDefault: false,
    };
    const updatedReasons = [...reasons, newReason];
    setReasons(updatedReasons);
    setNewReasonText('');
  };

  const handleDeleteReason = (id: string) => {
    setReasons((prev) => prev.filter((r) => r.id !== id));
  };

  const handleStartEdit = (reason: DelayReason) => {
    setEditingReasonId(reason.id);
    setEditingReasonText(reason.label);
  };

  const handleSaveEdit = () => {
    if (!editingReasonId || !editingReasonText.trim()) return;
    setReasons((prev) =>
      prev.map((r) => (r.id === editingReasonId ? { ...r, label: editingReasonText.trim() } : r))
    );
    setEditingReasonId(null);
    setEditingReasonText('');
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 dark:text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
            <span>{t('delay_settings_title')}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('delay_settings_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl bg-white/10 dark:bg-slate-800/40 hover:bg-white/20 border border-white/10 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all"
            title={t('reset_defaults')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('reset_defaults')}</span>
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-500/20 transition-all"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>{t('saved')}</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{t('save_changes')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Section 1: Thresholds */}
      <div className="p-4 rounded-2xl bg-white/5 dark:bg-slate-900/40 border border-white/10 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          <span>{t('delay_thresholds_section')}</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Days threshold */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>{t('deadline_warning_days')}</span>
              <span className="text-xs font-mono font-bold text-sky-400">
                {deadlineDays} {t('days_unit')}
              </span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={30}
                value={deadlineDays}
                onChange={(e) => setDeadlineDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white/10 dark:bg-slate-800/60 border border-white/15 text-white outline-none focus:ring-2 focus:ring-rose-500/40"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold pointer-events-none">
                {t('days_unit')}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              {t('deadline_warning_days_hint')}
            </p>
          </div>

          {/* Progress % threshold */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>{t('progress_warning_threshold')}</span>
              <span className="text-xs font-mono font-bold text-amber-400">
                {progressThreshold}%
              </span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={progressThreshold}
                onChange={(e) => setProgressThreshold(Number(e.target.value))}
                className="flex-1 accent-rose-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-slate-300 min-w-[36px] text-right">
                {progressThreshold}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              {t('progress_warning_threshold_hint')}
            </p>
          </div>
        </div>

        {/* Informational note */}
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
          <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{t('delay_calculation_rule_notice')}</span>
        </div>
      </div>

      {/* Section 2: Delay Reasons Directory */}
      <div className="p-4 rounded-2xl bg-white/5 dark:bg-slate-900/40 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
            <Tag className="w-3.5 h-3.5" />
            <span>{t('delay_reasons_directory')}</span>
            <span className="text-[10px] px-2 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300">
              {reasons.length}
            </span>
          </h4>
        </div>

        {/* Add new reason form */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={t('new_delay_reason_placeholder')}
            value={newReasonText}
            onChange={(e) => setNewReasonText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddReason()}
            className="flex-1 px-3 py-2 text-xs rounded-xl bg-white/10 dark:bg-slate-800/60 border border-white/15 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-rose-500/40"
          />
          <button
            onClick={handleAddReason}
            disabled={!newReasonText.trim()}
            className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-xs font-bold text-rose-300 flex items-center gap-1.5 transition-all disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('add_reason_btn')}</span>
          </button>
        </div>

        {/* Reasons list */}
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
          {reasons.map((r, index) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/5 dark:bg-slate-800/40 border border-white/10 text-xs hover:border-white/20 transition-all"
            >
              {editingReasonId === r.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editingReasonText}
                    onChange={(e) => setEditingReasonText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                    className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-rose-500/50 text-white outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-slate-500 font-mono text-[10px] w-5 text-right">
                    {index + 1}.
                  </span>
                  <span className="font-medium text-slate-200 truncate">{r.label}</span>
                </div>
              )}

              <div className="flex items-center gap-1 shrink-0">
                {editingReasonId !== r.id && (
                  <button
                    onClick={() => handleStartEdit(r)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-sky-300 transition-colors"
                    title="Редагувати назву"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteReason(r.id)}
                  className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Видалити причину"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
