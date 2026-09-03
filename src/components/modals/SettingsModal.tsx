import React, { useState, useRef } from 'react';
import {
  Sun,
  Moon,
  Globe,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Palette,
  Check,
  FileJson,
  ShieldAlert,
  Users,
  Plus,
  Edit2,
  Trash2,
  Mail,
  Briefcase,
  Play,
  Layers,
  BatteryCharging,
  Clock,
  Boxes,
  BookOpen,
  Code2,
  ExternalLink,
  Cpu,
} from 'lucide-react';
import { ThemeMode, GradientTheme, Language, Assignee } from '../../types';
import { useI18n } from '../../locales';
import { APP_CONFIG } from '../../config/AppConfig';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { exportDatabaseToJson, importDatabaseFromJson } from '../../services/exportImport';
import { db } from '../../services/db';
import obStudioLogo from '../../assets/LogoOBStudi512x512.png';
import { ScheduleSettingsTab } from '../schedule/ScheduleSettingsTab';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ThemeMode;
  onToggleMode: (mode: ThemeMode) => void;
  gradientTheme: GradientTheme;
  onSelectGradient: (theme: GradientTheme) => void;
  onOpenFactoryReset: () => void;
  onDataImported: () => void;
  team: Assignee[];
  onTeamUpdated: () => void;
  onLaunchDemo: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  mode,
  onToggleMode,
  gradientTheme,
  onSelectGradient,
  onOpenFactoryReset,
  onDataImported,
  team,
  onTeamUpdated,
  onLaunchDemo,
}) => {
  const { t, language, setLanguage } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<
    'appearance' | 'schedule' | 'team' | 'glossary' | 'demo' | 'storage' | 'developer'
  >('appearance');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Team Member Form State
  const [editingMember, setEditingMember] = useState<Assignee | null>(null);
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberAvatarUrl, setMemberAvatarUrl] = useState('');
  const [memberColor, setMemberColor] = useState('#6366f1');

  const COLOR_PALETTES = [
    '#6366f1', // Indigo
    '#0ea5e9', // Sky
    '#10b981', // Emerald
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#8b5cf6', // Purple
    '#f43f5e', // Rose
    '#06b6d4', // Cyan
  ];

  const handleOpenAddMember = () => {
    setEditingMember(null);
    setMemberName('');
    setMemberRole('');
    setMemberEmail('');
    setMemberAvatarUrl('');
    setMemberColor(COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)]);
    setIsMemberFormOpen(true);
  };

  const handleOpenEditMember = (member: Assignee) => {
    setEditingMember(member);
    setMemberName(member.name);
    setMemberRole(member.role);
    setMemberEmail(member.email || '');
    setMemberAvatarUrl(member.avatarUrl || '');
    setMemberColor(member.color || '#6366f1');
    setIsMemberFormOpen(true);
  };

  const handleSaveMember = async () => {
    if (!memberName.trim()) return;

    const initials = memberName
      .trim()
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const member: Assignee = {
      id: editingMember ? editingMember.id : `usr-${Date.now()}`,
      name: memberName.trim(),
      role: memberRole.trim() || 'Manufacturing Specialist',
      email: memberEmail.trim(),
      avatarUrl: memberAvatarUrl.trim() || undefined,
      initials,
      color: memberColor,
    };

    await db.team.put(member);
    setIsMemberFormOpen(false);
    onTeamUpdated();
  };

  const handleDeleteMember = async (memberId: string) => {
    if (team.length <= 1) return;
    await db.team.delete(memberId);
    onTeamUpdated();
  };

  const handleExport = async () => {
    try {
      const json = await exportDatabaseToJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prodtrack-flow-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export data', e);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const content = reader.result as string;
      const success = await importDatabaseFromJson(content);
      if (success) {
        setImportStatus('success');
        onDataImported();
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus('error');
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings_title')}
      subtitle="Customize visual aesthetics, team rosters, terminology reference and developer credits"
      size="xl"
      headerExtra={
        <button
          onClick={() => setActiveTab('developer')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shrink-0 ${
            activeTab === 'developer'
              ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white shadow-pink-500/30 ring-2 ring-pink-400/50'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-600/20 hover:scale-105'
          }`}
          title={t('tab_developer')}
        >
          <Code2 className="w-3.5 h-3.5 text-purple-200" />
          <span>{t('tab_developer')}</span>
        </button>
      }
      footer={
        <button
          onClick={onClose}
          className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg transition-all"
        >
          {t('close')}
        </button>
      }
    >
      <div className="space-y-5">
        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/10 dark:bg-slate-800/40 border border-white/10 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'appearance'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{t('tab_appearance')}</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'schedule'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-300" />
            <span>{t('tab_schedule')}</span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'team'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t('tab_team')} ({team.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('glossary')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'glossary'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
            <span>{t('tab_glossary')}</span>
          </button>

          <button
            onClick={() => setActiveTab('demo')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'demo'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-amber-300" />
            <span>{t('tab_demo')}</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'storage'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('tab_storage')}</span>
          </button>
        </div>

        {/* Tab 1: Appearance & Theme */}
        {activeTab === 'appearance' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Mode */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                {t('theme_mode')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onToggleMode('dark')}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                    mode === 'dark'
                      ? 'bg-indigo-600/20 border-indigo-400 text-white shadow-glass-glow'
                      : 'bg-white/10 dark:bg-slate-800/40 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Moon className="w-5 h-5 text-indigo-400" />
                  <div className="text-left">
                    <div className="text-xs font-bold">{t('dark_mode')}</div>
                    <div className="text-[10px] text-slate-400">Deep OLED glass</div>
                  </div>
                </button>

                <button
                  onClick={() => onToggleMode('light')}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                    mode === 'light'
                      ? 'bg-indigo-600/20 border-indigo-400 text-white shadow-glass-glow'
                      : 'bg-white/10 dark:bg-slate-800/40 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Sun className="w-5 h-5 text-amber-400" />
                  <div className="text-left">
                    <div className="text-xs font-bold">{t('light_mode')}</div>
                    <div className="text-[10px] text-slate-400">Frosted crystal glass</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Dynamic Background Gradients */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                {t('gradient_theme')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {APP_CONFIG.GRADIENTS.map((g) => {
                  const isSelected = gradientTheme === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => onSelectGradient(g.id as GradientTheme)}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all relative overflow-hidden group ${
                        isSelected
                          ? 'border-indigo-400 shadow-glass-glow ring-2 ring-indigo-400/50'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div
                        className="w-full h-12 rounded-xl shadow-inner flex items-center justify-center transition-transform group-hover:scale-105"
                        style={{ background: g.preview }}
                      >
                        {isSelected && <Check className="w-5 h-5 text-white drop-shadow" />}
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 text-center">
                        {t(g.key as any)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                {t('language')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setLanguage('en')}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                    language === 'en'
                      ? 'bg-indigo-600/20 border-indigo-400 text-white shadow-sm'
                      : 'bg-white/10 dark:bg-slate-800/40 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold">{t('lang_en')}</span>
                </button>

                <button
                  onClick={() => setLanguage('ua')}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                    language === 'ua'
                      ? 'bg-indigo-600/20 border-indigo-400 text-white shadow-sm'
                      : 'bg-white/10 dark:bg-slate-800/40 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold">{t('lang_ua')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Work Schedule & Breaks (Розклад та перерви) */}
        {activeTab === 'schedule' && <ScheduleSettingsTab />}

        {/* Tab 2: Team Management */}
        {activeTab === 'team' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('team_title')}
                </h4>
                <p className="text-xs text-slate-400">{t('team_subtitle')}</p>
              </div>

              <button
                onClick={handleOpenAddMember}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('add_member')}</span>
              </button>
            </div>

            {/* Member Editor Form */}
            {isMemberFormOpen && (
              <div className="p-4 rounded-2xl bg-white/15 dark:bg-slate-800/60 border border-indigo-500/30 space-y-3 animate-scaleIn">
                <h5 className="text-xs font-bold text-indigo-300">
                  {editingMember ? t('edit_member') : t('add_member')}
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {t('member_name')} *
                    </label>
                    <input
                      type="text"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      placeholder="e.g. Alex Miller"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-white/10 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {t('member_role')} *
                    </label>
                    <input
                      type="text"
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value)}
                      placeholder="e.g. Thermal Specialist"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-white/10 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {t('member_email')}
                    </label>
                    <input
                      type="email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder="alex@prodflow.io"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-white/10 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {t('member_avatar')}
                    </label>
                    <input
                      type="text"
                      value={memberAvatarUrl}
                      onChange={(e) => setMemberAvatarUrl(e.target.value)}
                      placeholder="https://... (or leave empty for initials)"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-white/10 text-white outline-none"
                    />
                  </div>
                </div>

                {/* Color Tag Selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    {t('member_color')}
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {COLOR_PALETTES.map((color) => (
                      <button
                        type="button"
                        key={color}
                        onClick={() => setMemberColor(color)}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          memberColor === color ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() => setIsMemberFormOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleSaveMember}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
                  >
                    {t('save')}
                  </button>
                </div>
              </div>
            )}

            {/* Team Members List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto custom-scrollbar p-1">
              {team.map((member) => (
                <div
                  key={member.id}
                  className="p-3.5 rounded-2xl bg-white/10 dark:bg-slate-800/40 border border-white/10 flex items-center justify-between gap-3 group hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar assignee={member} size="md" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {member.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {member.role}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-75 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEditMember(member)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
                      title={t('edit_member')}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {team.length > 1 && (
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400"
                        title={t('delete_member')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Glossary & Manufacturing Terms (Довідник термінів) */}
        {activeTab === 'glossary' && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>{t('glossary_title')}</span>
              </h4>
              <p className="text-xs text-slate-400">{t('glossary_subtitle')}</p>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
              {/* 1. BOM */}
              <div className="p-4 rounded-2xl bg-white/10 dark:bg-slate-800/50 border border-indigo-500/20 hover:border-indigo-500/40 transition-all">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold font-mono text-xs border border-indigo-500/30">
                    BOM
                  </span>
                  <h5 className="text-xs font-bold text-white">
                    {t('glossary_bom_title')}
                  </h5>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t('glossary_bom_desc')}
                </p>
              </div>

              {/* 2. Norm-Hours */}
              <div className="p-4 rounded-2xl bg-white/10 dark:bg-slate-800/50 border border-sky-500/20 hover:border-sky-500/40 transition-all">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 font-bold font-mono text-xs border border-sky-500/30">
                    ⏱ {t('norm_hours_short')}
                  </span>
                  <h5 className="text-xs font-bold text-white">
                    {t('glossary_normhours_title')}
                  </h5>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t('glossary_normhours_desc')}
                </p>
              </div>

              {/* 3. Roll-up */}
              <div className="p-4 rounded-2xl bg-white/10 dark:bg-slate-800/50 border border-purple-500/20 hover:border-purple-500/40 transition-all">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 font-bold font-mono text-xs border border-purple-500/30">
                    ∑ Roll-up
                  </span>
                  <h5 className="text-xs font-bold text-white">
                    {t('glossary_rollup_title')}
                  </h5>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t('glossary_rollup_desc')}
                </p>
              </div>

              {/* 4. MES */}
              <div className="p-4 rounded-2xl bg-white/10 dark:bg-slate-800/50 border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold font-mono text-xs border border-emerald-500/30">
                    MES
                  </span>
                  <h5 className="text-xs font-bold text-white">
                    {t('glossary_mes_title')}
                  </h5>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t('glossary_mes_desc')}
                </p>
              </div>

              {/* 5. Batch */}
              <div className="p-4 rounded-2xl bg-white/10 dark:bg-slate-800/50 border border-amber-500/20 hover:border-amber-500/40 transition-all">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-bold font-mono text-xs border border-amber-500/30">
                    📦 {t('batch_quantity')}
                  </span>
                  <h5 className="text-xs font-bold text-white">
                    {t('glossary_batch_title')}
                  </h5>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t('glossary_batch_desc')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Demo Mode Showcase */}
        {activeTab === 'demo' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/15 via-indigo-500/10 to-purple-500/15 border border-amber-500/30 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
                    <BatteryCharging className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">
                      {t('demo_mode_title')}
                    </h4>
                    <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                      TSLA-M3-82KWH-BP
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {t('demo_mode_desc')}
              </p>

              {/* Demo Architecture Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-center">
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/10">
                  <div className="text-[10px] text-slate-400 font-semibold">Hierarchy</div>
                  <div className="text-sm font-bold text-white mt-0.5">5 Levels</div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/10">
                  <div className="text-[10px] text-slate-400 font-semibold">Labor Norm-Hours</div>
                  <div className="text-sm font-bold text-sky-400 mt-0.5">175 hours</div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/10">
                  <div className="text-[10px] text-slate-400 font-semibold">Orders / Batches</div>
                  <div className="text-sm font-bold text-indigo-400 mt-0.5">3 Active</div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/10">
                  <div className="text-[10px] text-slate-400 font-semibold">Specialists</div>
                  <div className="text-sm font-bold text-amber-300 mt-0.5">5 Assigned</div>
                </div>
              </div>

              {/* Launch Demo Button */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    onLaunchDemo();
                    onClose();
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 border border-amber-400/40 transition-all hover:scale-[1.02]"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{t('launch_demo_button')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Data & Storage */}
        {activeTab === 'storage' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Database Backup & Snapshots
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleExport}
                  className="p-3.5 rounded-2xl bg-white/10 dark:bg-slate-800/40 hover:bg-white/20 border border-white/10 text-left flex items-center gap-3 text-slate-200 transition-all group"
                >
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold">{t('export_data')}</div>
                    <div className="text-[10px] text-slate-400 truncate">JSON backup snapshot</div>
                  </div>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3.5 rounded-2xl bg-white/10 dark:bg-slate-800/40 hover:bg-white/20 border border-white/10 text-left flex items-center gap-3 text-slate-200 transition-all group"
                >
                  <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 group-hover:scale-110 transition-transform">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold">{t('import_data')}</div>
                    <div className="text-[10px] text-slate-400 truncate">Restore from JSON</div>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </div>

              {importStatus === 'success' && (
                <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Database restored successfully!</span>
                </div>
              )}
              {importStatus === 'error' && (
                <div className="p-3 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Failed to parse or restore JSON snapshot.</span>
                </div>
              )}
            </div>

            {/* System Reset (Factory Reset) */}
            <div className="pt-4 border-t border-black/10 dark:border-white/10">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('factory_reset')}</span>
                  </div>
                  <div className="text-[10px] text-rose-400/80 mt-0.5 max-w-sm leading-relaxed">
                    {t('factory_reset_desc')}
                  </div>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onOpenFactoryReset();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/25 shrink-0 transition-all hover:scale-105"
                >
                  {t('factory_reset')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Developer Credits (Розробник) */}
        {activeTab === 'developer' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900/80 via-indigo-950/40 to-purple-950/60 border border-indigo-500/30 backdrop-blur-2xl text-center space-y-4 shadow-glass-glow">
              {/* Studio Logo */}
              <div className="relative inline-block mx-auto">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-md opacity-60 animate-pulse" />
                <img
                  src={obStudioLogo}
                  alt="OBStudio Logo"
                  className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-2xl ring-2 ring-white/30 mx-auto"
                />
              </div>

              {/* Studio Name & Tagline */}
              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-indigo-300 via-purple-200 to-pink-300 bg-clip-text text-transparent tracking-tight">
                  {t('dev_studio_name')}
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto leading-relaxed">
                  {t('dev_tagline')}
                </p>
              </div>

              {/* Version Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[11px] font-mono font-bold text-indigo-300 shadow-inner">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('dev_edition')}</span>
              </div>

              {/* Contact Email Action */}
              <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="mailto:obgamestudio@gmail.com"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/30 border border-indigo-400/40 transition-all hover:scale-105"
                >
                  <Mail className="w-4 h-4" />
                  <span>{t('dev_contact_btn')} (obgamestudio@gmail.com)</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70 ml-1" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
