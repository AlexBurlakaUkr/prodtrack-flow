import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Layers,
  ArrowRight,
  Boxes,
  CheckCircle2,
  FolderTree,
  Building2,
  Scale,
} from 'lucide-react';
import { ProductTemplate } from '../../types';
import { useI18n } from '../../locales';
import { GlassCard } from '../ui/GlassCard';
import { TemplateEditModal } from './TemplateEditModal';
import { InstantiateTemplateModal } from './InstantiateTemplateModal';

interface TemplateManagerProps {
  templates: ProductTemplate[];
  onSaveTemplate: (template: ProductTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onInstantiateTemplate: (
    templateId: string,
    projectName: string,
    projectCode: string,
    batchQuantity: number,
    startDate: string,
    customerName: string
  ) => void;
  searchQuery: string;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  templates,
  onSaveTemplate,
  onDeleteTemplate,
  onInstantiateTemplate,
  searchQuery,
}) => {
  const { t } = useI18n();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<ProductTemplate | null>(null);

  const [instantiateModalOpen, setInstantiateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const filteredTemplates = templates.filter((tmpl) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      tmpl.name.toLowerCase().includes(q) ||
      tmpl.code.toLowerCase().includes(q) ||
      tmpl.archetype.toLowerCase().includes(q) ||
      tmpl.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-4 space-y-5">
      {/* Top Banner */}
      <GlassCard variant="elevated" className="p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t('templates_title')}
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {t('templates_subtitle')}
            </p>
          </div>

          <button
            onClick={() => {
              setTemplateToEdit(null);
              setEditModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>{t('create_template')}</span>
          </button>
        </div>
      </GlassCard>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map((template) => {
          // Count distinct levels in template
          const distinctLevels = new Set(template.nodes.map((n) => n.level)).size;

          return (
            <GlassCard
              key={template.id}
              variant="elevated"
              className="p-5 flex flex-col justify-between gap-4 border-l-4 border-l-purple-500 hover:shadow-glass-md transition-all group"
            >
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-lg border border-purple-500/30">
                    {template.code}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setTemplateToEdit(template);
                        setEditModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
                      title={t('edit_template')}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!template.isBuiltIn && (
                      <button
                        onClick={() => onDeleteTemplate(template.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400"
                        title={t('delete_template')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-300 transition-colors">
                  {template.name}
                </h3>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{template.archetype}</span>
                </div>
                {template.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>
                )}
              </div>

              {/* Blueprint Summary Pill */}
              <div className="p-3 rounded-xl bg-white/10 dark:bg-slate-800/40 border border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Structure</span>
                </span>
                <span className="font-bold text-indigo-300">
                  {t('template_nodes_count', {
                    count: template.nodes.length,
                    levels: distinctLevels,
                  })}
                </span>
              </div>

              {/* Instantiate Button */}
              <button
                onClick={() => {
                  setSelectedTemplateId(template.id);
                  setInstantiateModalOpen(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('instantiate_button')}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </button>
            </GlassCard>
          );
        })}
      </div>

      {/* Template Edit Modal */}
      <TemplateEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        templateToEdit={templateToEdit}
        onSave={(tmpl) => {
          onSaveTemplate(tmpl);
          setEditModalOpen(false);
        }}
      />

      {/* Instantiate Modal */}
      <InstantiateTemplateModal
        isOpen={instantiateModalOpen}
        onClose={() => setInstantiateModalOpen(false)}
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        onInstantiate={onInstantiateTemplate}
      />
    </div>
  );
};
