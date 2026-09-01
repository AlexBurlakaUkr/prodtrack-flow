import React, { useState } from 'react';
import { AlertTriangle, Trash2, RotateCcw } from 'lucide-react';
import { useI18n } from '../../locales';
import { Modal } from '../ui/Modal';

interface FactoryResetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => void;
}

export const FactoryResetDialog: React.FC<FactoryResetDialogProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
}) => {
  const { t } = useI18n();
  const [confirmInput, setConfirmInput] = useState('');

  const isConfirmed = confirmInput.trim().toUpperCase() === 'RESET';

  const handleExecute = () => {
    if (!isConfirmed) return;
    onConfirmReset();
    setConfirmInput('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-rose-500">
          <AlertTriangle className="w-5 h-5 animate-pulse" />
          <span>{t('factory_reset_confirm_title')}</span>
        </div>
      }
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white/10 dark:hover:bg-slate-800 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            disabled={!isConfirmed}
            onClick={handleExecute}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg ${
              isConfirmed
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
                : 'bg-slate-700 text-slate-400 opacity-50 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('reset_button')}</span>
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs leading-relaxed">
          {t('factory_reset_warning')}
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t('type_to_confirm')}
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder="RESET"
            className="w-full px-3.5 py-2 text-xs font-mono font-bold tracking-widest text-center uppercase rounded-xl bg-white/30 dark:bg-slate-800/60 border border-white/20 dark:border-white/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/50 outline-none"
          />
        </div>
      </div>
    </Modal>
  );
};
