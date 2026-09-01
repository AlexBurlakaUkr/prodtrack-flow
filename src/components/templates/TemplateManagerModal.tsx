import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { ProductTemplate } from '../../types';
import { useI18n } from '../../locales';
import { TemplateManager } from './TemplateManager';
import { Modal } from '../ui/Modal';

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  isOpen,
  onClose,
  templates,
  onSaveTemplate,
  onDeleteTemplate,
  onInstantiateTemplate,
  searchQuery,
}) => {
  const { t } = useI18n();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span>{t('templates_title')}</span>
        </div>
      }
      subtitle={t('templates_subtitle')}
      size="2xl"
      footer={
        <button
          onClick={onClose}
          className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg"
        >
          {t('close')}
        </button>
      }
    >
      <div className="max-h-[75vh] overflow-y-auto custom-scrollbar pr-1 -mx-2 px-2">
        <TemplateManager
          templates={templates}
          onSaveTemplate={onSaveTemplate}
          onDeleteTemplate={onDeleteTemplate}
          onInstantiateTemplate={(tmplId, pName, pCode, batchQty, sDate, cName) => {
            onInstantiateTemplate(tmplId, pName, pCode, batchQty, sDate, cName);
            onClose();
          }}
          searchQuery={searchQuery}
        />
      </div>
    </Modal>
  );
};
