import React from 'react';
import { HelpCircle } from 'lucide-react';

interface FieldLabelProps {
  label: string;
  tooltip?: string;
  required?: boolean;
  className?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const FieldLabel: React.FC<FieldLabelProps> = ({
  label,
  tooltip,
  required = false,
  className = '',
  icon,
  children,
}) => {
  return (
    <div
      className={`block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ${className}`}
    >
      <div className="relative inline-flex items-center gap-1.5 cursor-help group select-none" title={tooltip}>
        {icon}
        <span>{label}</span>
        {required && <span className="text-rose-400 font-bold">*</span>}
        {tooltip && (
          <>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 transition-colors opacity-75 group-hover:opacity-100 shrink-0" />
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:flex flex-col z-50 px-2.5 py-1.5 rounded-xl bg-slate-950/95 dark:bg-slate-900/95 border border-white/15 text-[11px] text-slate-200 font-normal leading-snug shadow-2xl shadow-black/80 whitespace-normal min-w-[200px] max-w-xs pointer-events-none backdrop-blur-xl animate-fadeIn">
              <span>{tooltip}</span>
              <div className="w-2 h-2 bg-slate-950 dark:bg-slate-900 border-r border-b border-white/15 rotate-45 absolute -bottom-1 left-4" />
            </div>
          </>
        )}
      </div>
      {children}
    </div>
  );
};
