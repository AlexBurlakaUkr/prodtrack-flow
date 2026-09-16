import React, { useState, useEffect } from 'react';
import { Project } from '../../types';
import { useI18n } from '../../locales';
import { Modal } from '../ui/Modal';
import { FieldLabel } from '../ui/FieldLabel';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit: Project | null;
  onSave: (project: Project) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  projectToEdit,
  onSave,
}) => {
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [archetype, setArchetype] = useState('');
  const [category, setCategory] = useState('');
  const [targetUnits, setTargetUnits] = useState<number | string>(100);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (projectToEdit) {
      setName(projectToEdit.name);
      setCode(projectToEdit.code);
      setArchetype(projectToEdit.archetype);
      setCategory(projectToEdit.category);
      setTargetUnits(projectToEdit.targetOutputUnits);
      setDescription(projectToEdit.description);
    } else {
      setName('');
      setCode(`PROJ-${Math.floor(100 + Math.random() * 900)}`);
      setArchetype('Next-Gen EV Modular Platform');
      setCategory('Automotive / Energy Storage');
      setTargetUnits(500);
      setDescription('');
    }
    setErrors({});
  }, [projectToEdit, isOpen]);

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t('required_field');
    if (!code.trim()) newErrors.code = t('required_field');

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const projectId = projectToEdit ? projectToEdit.id : `proj-${Date.now()}`;
    const rootNodeId = projectToEdit ? projectToEdit.rootNodeId : `node-root-${Date.now()}`;

    const parsedUnits = parseInt(String(targetUnits), 10);
    const finalUnits = !isNaN(parsedUnits) && parsedUnits > 0 ? parsedUnits : 100;

    const updatedProj: Project = {
      id: projectId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      archetype: archetype.trim(),
      category: category.trim(),
      targetOutputUnits: finalUnits,
      description: description.trim(),
      rootNodeId,
      createdAt: projectToEdit ? projectToEdit.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefaultDemo: false,
    };

    onSave(updatedProj);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={projectToEdit ? t('edit_project_title') : t('new_project_title')}
      subtitle="Define product hierarchy archetypes, manufacturing capacity, and technical specs"
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
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all"
          >
            {projectToEdit ? t('save_changes') : t('create')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <FieldLabel
            label={t('project_name')}
            tooltip={t('field_tooltip_project_name')}
            required={true}
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Next-Gen Megapack Battery Unit"
            className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
          />
          {errors.name && <span className="text-[10px] text-rose-400">{errors.name}</span>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel
              label={t('project_code')}
              tooltip={t('field_tooltip_project_code')}
              required={true}
            />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
            />
            {errors.code && <span className="text-[10px] text-rose-400">{errors.code}</span>}
          </div>

          <div>
            <FieldLabel
              label={t('target_units')}
              tooltip={t('field_tooltip_target_units')}
            />
            <input
              type="text"
              inputMode="numeric"
              value={targetUnits}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || /^\d*$/.test(val)) setTargetUnits(val);
              }}
              onBlur={() => {
                const parsed = parseInt(String(targetUnits), 10);
                setTargetUnits(!isNaN(parsed) && parsed > 0 ? parsed : 100);
              }}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('project_archetype')}
            </label>
            <input
              type="text"
              value={archetype}
              onChange={(e) => setArchetype(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('category')}
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
            />
          </div>
        </div>

        <div>
          <FieldLabel
            label={t('project_desc')}
            tooltip={t('field_tooltip_description')}
          />
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Technical overview and product specifications..."
            className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none"
          />
        </div>
      </div>
    </Modal>
  );
};
