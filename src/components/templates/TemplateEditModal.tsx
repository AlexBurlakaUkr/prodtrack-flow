import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Layers,
  Clock,
  Briefcase,
  Check,
} from 'lucide-react';
import { ProductTemplate, TemplateNode, NodeLevel } from '../../types';
import { useI18n } from '../../locales';
import { APP_CONFIG } from '../../config/AppConfig';
import { Modal } from '../ui/Modal';

interface TemplateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateToEdit: ProductTemplate | null;
  onSave: (template: ProductTemplate) => void;
}

export const TemplateEditModal: React.FC<TemplateEditModalProps> = ({
  isOpen,
  onClose,
  templateToEdit,
  onSave,
}) => {
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [archetype, setArchetype] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [nodes, setNodes] = useState<TemplateNode[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (templateToEdit) {
      setName(templateToEdit.name);
      setCode(templateToEdit.code);
      setArchetype(templateToEdit.archetype);
      setCategory(templateToEdit.category);
      setDescription(templateToEdit.description);
      setNodes(
        templateToEdit.nodes.map((n) => ({
          ...n,
          normHours: typeof n.normHours === 'number' ? n.normHours : n.weight || 8,
        }))
      );
    } else {
      setName('');
      setCode(`TMPL-${Math.floor(1000 + Math.random() * 9000)}`);
      setArchetype('Modular Platform Archetype');
      setCategory('Hardware Manufacturing');
      setDescription('');
      setNodes([
        {
          id: `tmpl-node-root-${Date.now()}`,
          parentId: null,
          title: 'Primary End Item',
          code: 'PROD-01',
          level: 1,
          defaultDurationDays: 30,
          defaultBatchQuantity: 1,
          unit: 'units',
          normHours: 50,
          weight: 50,
          orderIndex: 0,
          suggestedRole: 'Chief Battery Architect',
        },
      ]);
    }
    setErrors({});
  }, [templateToEdit, isOpen]);

  const handleUpdateNode = (id: string, updates: Partial<TemplateNode>) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
    );
  };

  const handleAddNode = (parentId: string | null = null) => {
    const parent = nodes.find((n) => n.id === parentId);
    const level = (parent ? Math.min(5, parent.level + 1) : 2) as NodeLevel;

    const newNode: TemplateNode = {
      id: `tmpl-node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      parentId,
      title: 'New Sub-Component / Operation',
      code: `PART-${Math.floor(100 + Math.random() * 900)}`,
      level,
      defaultDurationDays: 14,
      defaultBatchQuantity: 1,
      unit: 'pcs',
      normHours: 8,
      weight: 8,
      orderIndex: nodes.length,
      suggestedRole: 'Lead Automation Engineer',
    };

    setNodes((prev) => [...prev, newNode]);
  };

  const handleDeleteNode = (id: string) => {
    if (nodes.length <= 1) return;
    const toDelete = new Set<string>();
    toDelete.add(id);

    const findChildren = (pid: string) => {
      nodes.filter((n) => n.parentId === pid).forEach((c) => {
        toDelete.add(c.id);
        findChildren(c.id);
      });
    };
    findChildren(id);

    setNodes((prev) => prev.filter((n) => !toDelete.has(n.id)));
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t('required_field');
    if (!code.trim()) newErrors.code = t('required_field');

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const updatedTemplate: ProductTemplate = {
      id: templateToEdit ? templateToEdit.id : `tmpl-${Date.now()}`,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      archetype: archetype.trim(),
      category: category.trim(),
      description: description.trim(),
      createdAt: templateToEdit ? templateToEdit.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isBuiltIn: templateToEdit?.isBuiltIn || false,
      nodes,
    };

    onSave(updatedTemplate);
    onClose();
  };

  const totalTemplateHours = nodes.reduce((acc, curr) => acc + (curr.normHours || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('template_editor_title')}
      subtitle={t('template_editor_desc')}
      size="2xl"
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
      <div className="space-y-6">
        {/* Template Overview Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/10 dark:bg-slate-800/40 p-4 rounded-2xl border border-white/10">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('template_name')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl bg-white/30 dark:bg-slate-900/60 border border-white/15 text-white outline-none"
            />
            {errors.name && <span className="text-[10px] text-rose-400">{errors.name}</span>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('template_code')} *
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-mono rounded-xl bg-white/30 dark:bg-slate-900/60 border border-white/15 text-white outline-none"
            />
            {errors.code && <span className="text-[10px] text-rose-400">{errors.code}</span>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Product Archetype
            </label>
            <input
              type="text"
              value={archetype}
              onChange={(e) => setArchetype(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl bg-white/30 dark:bg-slate-900/60 border border-white/15 text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl bg-white/30 dark:bg-slate-900/60 border border-white/15 text-white outline-none"
            />
          </div>
        </div>

        {/* Component Hierarchy Editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <span>Template Component Blueprint ({nodes.length} Nodes)</span>
              <span className="text-sky-300 font-mono font-bold bg-sky-500/20 px-2 py-0.5 rounded-lg border border-sky-500/30">
                Total ~{totalTemplateHours} {t('norm_hours_unit')}
              </span>
            </h4>

            <button
              type="button"
              onClick={() => handleAddNode(null)}
              className="px-3 py-1 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Node</span>
            </button>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
            {nodes.map((node) => {
              const levelConf =
                APP_CONFIG.LEVELS.find((l) => l.level === node.level) || APP_CONFIG.LEVELS[0];

              return (
                <div
                  key={node.id}
                  className={`p-3 rounded-2xl bg-white/10 dark:bg-slate-800/50 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}
                >
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${levelConf.badgeBg}`}>
                      L{node.level}
                    </span>

                    <input
                      type="text"
                      value={node.code}
                      onChange={(e) => handleUpdateNode(node.id, { code: e.target.value.toUpperCase() })}
                      className="w-24 px-2 py-1 text-xs font-mono rounded-lg bg-black/30 border border-white/10 text-white"
                      placeholder="CODE"
                    />

                    <input
                      type="text"
                      value={node.title}
                      onChange={(e) => handleUpdateNode(node.id, { title: e.target.value })}
                      className="flex-1 min-w-[180px] px-2.5 py-1 text-xs rounded-lg bg-black/30 border border-white/10 text-white"
                      placeholder="Component Title"
                    />
                  </div>

                  {/* Norm-Hours & Durations */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Norm-Hours */}
                    <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded-lg border border-white/10 text-[11px] text-slate-300">
                      <Clock className="w-3 h-3 text-sky-400" />
                      <span>{t('norm_hours_short')}:</span>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={node.normHours}
                        onChange={(e) =>
                          handleUpdateNode(node.id, {
                            normHours: Number(e.target.value) || 1,
                            weight: Number(e.target.value) || 1,
                          })
                        }
                        className="w-12 bg-transparent text-center font-bold text-sky-300 outline-none"
                      />
                    </div>

                    {/* Duration in Days */}
                    <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded-lg border border-white/10 text-[11px] text-slate-300">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      <span>Days:</span>
                      <input
                        type="number"
                        min="1"
                        value={node.defaultDurationDays}
                        onChange={(e) =>
                          handleUpdateNode(node.id, { defaultDurationDays: Number(e.target.value) || 1 })
                        }
                        className="w-10 bg-transparent text-center font-bold text-indigo-300 outline-none"
                      />
                    </div>

                    {/* Add child button */}
                    {node.level < 5 && (
                      <button
                        type="button"
                        onClick={() => handleAddNode(node.id)}
                        className="p-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30"
                        title="Add Child Sub-component"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete node button */}
                    {nodes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteNode(node.id)}
                        className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30"
                        title="Delete Component"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};
