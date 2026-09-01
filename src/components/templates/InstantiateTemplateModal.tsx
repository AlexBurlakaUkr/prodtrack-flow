import React, { useState, useEffect } from 'react';
import {
  Package,
  Layers,
  Sparkles,
  Check,
  Calendar,
  Building2,
} from 'lucide-react';
import { ProductTemplate } from '../../types';
import { useI18n } from '../../locales';
import { Modal } from '../ui/Modal';

interface InstantiateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ProductTemplate[];
  selectedTemplateId?: string;
  onInstantiate: (
    templateId: string,
    projectName: string,
    projectCode: string,
    batchQuantity: number,
    startDate: string,
    customerName: string
  ) => void;
}

export const InstantiateTemplateModal: React.FC<InstantiateTemplateModalProps> = ({
  isOpen,
  onClose,
  templates,
  selectedTemplateId,
  onInstantiate,
}) => {
  const { t } = useI18n();

  const [activeTmplId, setActiveTmplId] = useState<string>('');
  const [projectName, setProjectName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [batchQuantity, setBatchQuantity] = useState(10);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const tmplId = selectedTemplateId || templates[0]?.id || '';
    setActiveTmplId(tmplId);
    const tmpl = templates.find((t) => t.id === tmplId);
    if (tmpl) {
      setProjectName(`${tmpl.name} (Batch #${Math.floor(100 + Math.random() * 900)})`);
      setProjectCode(`PROD-${Math.floor(1000 + Math.random() * 9000)}`);
      setCustomerName('Tesla Global Logistics');
    }
    setErrors({});
  }, [selectedTemplateId, templates, isOpen]);

  const handleTemplateChange = (id: string) => {
    setActiveTmplId(id);
    const tmpl = templates.find((t) => t.id === id);
    if (tmpl) {
      setProjectName(`${tmpl.name} (Batch #${Math.floor(100 + Math.random() * 900)})`);
    }
  };

  const handleExecute = () => {
    const newErrors: Record<string, string> = {};
    if (!projectName.trim()) newErrors.projectName = t('required_field');
    if (!projectCode.trim()) newErrors.projectCode = t('required_field');
    if (!activeTmplId) newErrors.activeTmplId = 'Please select a template';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onInstantiate(
      activeTmplId,
      projectName.trim(),
      projectCode.trim().toUpperCase(),
      Number(batchQuantity) || 1,
      startDate,
      customerName.trim()
    );
    onClose();
  };

  const currentTemplate = templates.find((t) => t.id === activeTmplId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span>{t('instantiate_from_template')}</span>
        </div>
      }
      subtitle="Clone a master BOM blueprint into an active production run with custom batch parameters"
      size="lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white/10 dark:hover:bg-slate-800 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleExecute}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all"
          >
            {t('instantiate_button')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Template Selector Card */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Select Product Blueprint
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
            {templates.map((tmpl) => {
              const isSelected = activeTmplId === tmpl.id;
              return (
                <button
                  type="button"
                  key={tmpl.id}
                  onClick={() => handleTemplateChange(tmpl.id)}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'bg-indigo-500/25 border-indigo-400 text-white shadow-sm ring-1 ring-indigo-400'
                      : 'bg-white/10 dark:bg-slate-800/40 border-white/10 text-slate-300 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs truncate">{tmpl.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">{tmpl.code}</div>
                  <div className="text-[10px] text-indigo-300 mt-1">
                    {tmpl.nodes.length} Components • {tmpl.archetype}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Project & Order Details */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Production Project Name *
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-white outline-none"
            />
            {errors.projectName && (
              <span className="text-[10px] text-rose-400">{errors.projectName}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Project Code *
              </label>
              <input
                type="text"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-white outline-none"
              />
              {errors.projectCode && (
                <span className="text-[10px] text-rose-400">{errors.projectCode}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Batch Size (Units)
              </label>
              <input
                type="number"
                min="1"
                value={batchQuantity}
                onChange={(e) => setBatchQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Customer / Destination Facility
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-white outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
