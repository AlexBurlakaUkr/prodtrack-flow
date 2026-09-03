import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  Flame,
  Coffee,
  Check,
  RotateCcw,
  Eye,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { ScheduleConfig, ScheduleItem } from '../../types';
import {
  getScheduleConfig,
  saveScheduleConfig,
  resetScheduleConfig,
  triggerSchedulePreview,
  stopSchedulePreview,
  SCHEDULE_PREVIEW_EVENT,
  SCHEDULE_PREVIEW_STOP_EVENT,
} from '../../services/scheduleService';
import { useI18n } from '../../locales';

export const ScheduleSettingsTab: React.FC = () => {
  const { t } = useI18n();
  const [config, setConfig] = useState<ScheduleConfig>(() => getScheduleConfig());

  // Editing / Adding modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formStartTime, setFormStartTime] = useState('12:00');
  const [formEndTime, setFormEndTime] = useState('12:30');
  const [formIsSolemn, setFormIsSolemn] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [activePreviewItemId, setActivePreviewItemId] = useState<string | null>(null);

  // Sync state if external changes happen
  useEffect(() => {
    const handleUpdate = () => setConfig(getScheduleConfig());
    const handlePreviewStart = (e: Event) => {
      const customEvent = e as CustomEvent<{ item: ScheduleItem }>;
      if (customEvent.detail?.item) {
        setActivePreviewItemId(customEvent.detail.item.id);
      }
    };
    const handlePreviewStop = () => setActivePreviewItemId(null);

    window.addEventListener('storage', handleUpdate);
    window.addEventListener(SCHEDULE_PREVIEW_EVENT, handlePreviewStart);
    window.addEventListener(SCHEDULE_PREVIEW_STOP_EVENT, handlePreviewStop);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener(SCHEDULE_PREVIEW_EVENT, handlePreviewStart);
      window.removeEventListener(SCHEDULE_PREVIEW_STOP_EVENT, handlePreviewStop);
    };
  }, []);

  // Update master toggle
  const handleToggleMaster = () => {
    const updated: ScheduleConfig = {
      ...config,
      enabled: !config.enabled,
    };
    setConfig(updated);
    saveScheduleConfig(updated);
  };

  // Toggle specific item on/off
  const handleToggleItem = (itemId: string) => {
    const updated: ScheduleConfig = {
      ...config,
      items: config.items.map((item) =>
        item.id === itemId ? { ...item, isEnabled: !item.isEnabled } : item
      ),
    };
    setConfig(updated);
    saveScheduleConfig(updated);
  };

  // Open add modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormStartTime('15:00');
    setFormEndTime('15:15');
    setFormIsSolemn(false);
    setFormDescription('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (item: ScheduleItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormStartTime(item.startTime);
    setFormEndTime(item.endTime);
    setFormIsSolemn(!!item.isSolemn);
    setFormDescription(item.description || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Save event
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      setFormError(t('required_field'));
      return;
    }

    if (!formStartTime || !formEndTime) {
      setFormError(t('required_field'));
      return;
    }

    let updatedItems: ScheduleItem[];

    if (editingItem) {
      // Edit existing
      updatedItems = config.items.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              title: formTitle.trim(),
              startTime: formStartTime,
              endTime: formEndTime,
              isSolemn: formIsSolemn,
              description: formDescription.trim() || undefined,
            }
          : item
      );
    } else {
      // Create new
      const newItem: ScheduleItem = {
        id: `sched-${Date.now()}`,
        title: formTitle.trim(),
        startTime: formStartTime,
        endTime: formEndTime,
        isEnabled: true,
        isSolemn: formIsSolemn,
        description: formDescription.trim() || undefined,
      };
      updatedItems = [...config.items, newItem];
    }

    // Sort by startTime
    updatedItems.sort((a, b) => a.startTime.localeCompare(b.startTime));

    const updatedConfig: ScheduleConfig = {
      ...config,
      items: updatedItems,
    };

    setConfig(updatedConfig);
    saveScheduleConfig(updatedConfig);
    setIsModalOpen(false);
  };

  // Delete item
  const handleDeleteItem = (itemId: string) => {
    const updated: ScheduleConfig = {
      ...config,
      items: config.items.filter((item) => item.id !== itemId),
    };
    setConfig(updated);
    saveScheduleConfig(updated);
  };

  // Restore defaults
  const handleRestoreDefaults = () => {
    const defaults = resetScheduleConfig();
    setConfig(defaults);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Header Card with Master Toggle */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/10 dark:bg-slate-800/40 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('schedule_master_toggle')}
            </h4>
          </div>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed">
            {t('schedule_master_toggle_desc')}
          </p>
        </div>

        {/* Master Switch */}
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={handleToggleMaster}
            className="sr-only peer"
          />
          <div className="w-12 h-6.5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
          <span className="ml-2.5 text-xs font-bold text-slate-300">
            {config.enabled ? 'ON' : 'OFF'}
          </span>
        </label>
      </div>

      {/* Active Preview Banner with Close Button */}
      {activePreviewItemId && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5 text-xs font-bold text-amber-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span>Тестовий перегляд активний на екрані</span>
          </div>
          <button
            type="button"
            onClick={stopSchedulePreview}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition-all hover:scale-105"
          >
            <X className="w-3.5 h-3.5" />
            <span>Закрити тестовий перегляд</span>
          </button>
        </div>
      )}

      {/* Schedule Manager Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div>
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {t('schedule_title')} ({config.items.length})
          </h5>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRestoreDefaults}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title={t('schedule_restore_defaults')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('schedule_restore_defaults')}</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('schedule_add_event')}</span>
          </button>
        </div>
      </div>

      {/* Schedule Items List */}
      <div className="space-y-2.5 max-h-[360px] overflow-y-auto custom-scrollbar p-1">
        {config.items.map((item) => {
          const isSolemn = !!item.isSolemn;

          return (
            <div
              key={item.id}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                item.isEnabled
                  ? isSolemn
                    ? 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-500/30 shadow-sm'
                    : 'bg-white/10 dark:bg-slate-800/40 border-white/10 hover:border-white/20'
                  : 'bg-white/5 dark:bg-slate-900/40 border-white/5 opacity-60'
              }`}
            >
              {/* Left: Icon, Title, Time Window & Badges */}
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Event Icon */}
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                    isSolemn
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  }`}
                >
                  {isSolemn ? (
                    <Flame className="w-5 h-5 animate-pulse" />
                  ) : (
                    <Coffee className="w-5 h-5" />
                  )}
                </div>

                {/* Info Text */}
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </span>

                    {/* Solemn badge */}
                    {isSolemn && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300">
                        {t('schedule_solemn_badge')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span className="px-2 py-0.5 rounded-lg bg-black/20 text-indigo-300 font-bold">
                      {item.startTime} – {item.endTime}
                    </span>
                    {item.description && (
                      <span className="text-[11px] text-slate-400 italic truncate max-w-xs hidden md:inline">
                        {item.description}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Actions and Item Switch */}
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
                {/* Preview Test Trigger */}
                {activePreviewItemId === item.id ? (
                  <button
                    type="button"
                    onClick={stopSchedulePreview}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all animate-pulse"
                    title="Закрити перегляд"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Закрити тест</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => triggerSchedulePreview(item, isSolemn ? 60 : 120)}
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all"
                    title={t('schedule_preview_btn')}
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden sm:inline">{t('schedule_preview_btn')}</span>
                  </button>
                )}

                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(item)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
                  title={t('edit')}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                {/* Delete Button (Protected from deleting solemn remembrance or with confirmation) */}
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all"
                  title={t('delete')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Individual On/Off Switch */}
                <label className="relative inline-flex items-center cursor-pointer ml-1">
                  <input
                    type="checkbox"
                    checked={item.isEnabled}
                    onChange={() => handleToggleItem(item.id)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal to Create / Edit Schedule Event */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>
                  {editingItem ? t('edit') : t('schedule_add_modal_title')}
                </span>
              </h4>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('schedule_event_title')} *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Обідня перерва"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Times: Start and End */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('schedule_start_time')} (HH:mm) *
                  </label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('schedule_end_time')} (HH:mm) *
                  </label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Special Flag: Solemn Remembrance */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="isSolemn"
                  checked={formIsSolemn}
                  onChange={(e) => setFormIsSolemn(e.target.checked)}
                  className="mt-0.5 rounded text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="isSolemn" className="text-xs text-amber-200 cursor-pointer">
                  <span className="font-bold block">{t('schedule_is_solemn')}</span>
                  <span className="text-[10px] text-amber-300/80 block mt-0.5">
                    Повноекранний затемнений оверлей із запаленою свічкою та заблокованим кліком (як о 09:00).
                  </span>
                </label>
              </div>

              {/* Description / Subtitle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Підзаголовок / Примітка
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Час для відпочинку та обіду бригади"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-all"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
