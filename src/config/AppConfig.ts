/**
 * Central Configuration for ProdTrack Flow
 * Contains all data-driven constants, thresholds, level definitions, and visual presets.
 */

import { Assignee } from '../types';

export const APP_CONFIG = {
  APP_NAME: 'ProdTrack Flow',
  APP_VERSION: '1.1.0',
  DEFAULT_PROJECT_ID: 'proj-tesla-model3-battery',
  DEFAULT_TEMPLATE_ID: 'tmpl-tesla-model3-battery',
  
  // Alert & Check-in thresholds
  DEADLINE_WARNING_DAYS_THRESHOLD: 2, // Highlight nodes with <= 2 days remaining
  PROGRESS_WARNING_THRESHOLD: 80,      // and < 80% progress
  
  // Level Hierarchy Definitions
  LEVELS: [
    { level: 1, key: 'level_1_title', defaultName: 'Product / End Item', color: '#6366f1', badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
    { level: 2, key: 'level_2_title', defaultName: 'Major Modules / Assemblies', color: '#0ea5e9', badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
    { level: 3, key: 'level_3_title', defaultName: 'Sub-assemblies', color: '#10b981', badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    { level: 4, key: 'level_4_title', defaultName: 'Functional Blocks', color: '#f59e0b', badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    { level: 5, key: 'level_5_title', defaultName: 'Parts / Operations', color: '#ec4899', badgeBg: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
  ] as const,

  // Status Presets
  STATUS_OPTIONS: [
    { value: 'pending', key: 'status_pending', color: '#94a3b8', bg: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
    { value: 'in_progress', key: 'status_in_progress', color: '#38bdf8', bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
    { value: 'in_review', key: 'status_in_review', color: '#fbbf24', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    { value: 'completed', key: 'status_completed', color: '#34d399', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    { value: 'delayed', key: 'status_delayed', color: '#f87171', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  ] as const,

  // Order Status Presets
  ORDER_STATUS_OPTIONS: [
    { value: 'in_progress', key: 'order_status_in_progress', color: '#38bdf8', bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
    { value: 'urgent_delayed', key: 'order_status_urgent_delayed', color: '#f87171', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
    { value: 'completed', key: 'order_status_completed', color: '#34d399', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    { value: 'pending', key: 'order_status_pending', color: '#94a3b8', bg: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
    { value: 'on_hold', key: 'order_status_on_hold', color: '#fbbf24', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  ] as const,

  // Priority Presets
  PRIORITY_OPTIONS: [
    { value: 'low', key: 'priority_low', color: '#94a3b8', bg: 'bg-slate-500/20 text-slate-300' },
    { value: 'medium', key: 'priority_medium', color: '#38bdf8', bg: 'bg-blue-500/20 text-blue-300' },
    { value: 'high', key: 'priority_high', color: '#fb923c', bg: 'bg-orange-500/20 text-orange-300' },
    { value: 'critical', key: 'priority_critical', color: '#f43f5e', bg: 'bg-rose-500/20 text-rose-300' },
  ] as const,

  // Dynamic Background Themes
  GRADIENTS: [
    {
      id: 'cosmic-indigo',
      key: 'theme_cosmic_indigo',
      name: 'Cosmic Indigo',
      bgClass: 'from-slate-950 via-indigo-950/80 to-slate-950',
      accentColor: '#6366f1',
      orb1: 'bg-indigo-600/25',
      orb2: 'bg-purple-600/20',
      orb3: 'bg-blue-600/20',
      preview: 'linear-gradient(135deg, #1e1b4b, #312e81, #0f172a)',
    },
    {
      id: 'deep-emerald',
      key: 'theme_deep_emerald',
      name: 'Deep Emerald',
      bgClass: 'from-slate-950 via-emerald-950/80 to-slate-950',
      accentColor: '#10b981',
      orb1: 'bg-emerald-600/25',
      orb2: 'bg-teal-600/20',
      orb3: 'bg-green-600/20',
      preview: 'linear-gradient(135deg, #064e3b, #065f46, #022c22)',
    },
    {
      id: 'midnight-blue',
      key: 'theme_midnight_blue',
      name: 'Midnight Blue',
      bgClass: 'from-slate-950 via-sky-950/80 to-slate-950',
      accentColor: '#0ea5e9',
      orb1: 'bg-sky-600/25',
      orb2: 'bg-blue-600/20',
      orb3: 'bg-cyan-600/20',
      preview: 'linear-gradient(135deg, #0c1938, #172554, #030712)',
    },
    {
      id: 'cyber-violet',
      key: 'theme_cyber_violet',
      name: 'Cyber Violet',
      bgClass: 'from-slate-950 via-fuchsia-950/80 to-slate-950',
      accentColor: '#d946ef',
      orb1: 'bg-fuchsia-600/25',
      orb2: 'bg-pink-600/20',
      orb3: 'bg-purple-600/20',
      preview: 'linear-gradient(135deg, #3b0764, #581c87, #18022b)',
    },
  ] as const,

  // Initial Default Team Members
  DEFAULT_ASSIGNEES: [
    { id: 'usr-1', name: 'Sarah Chen', role: 'Chief Battery Architect', email: 's.chen@prodflow.io', initials: 'SC', color: '#6366f1', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80' },
    { id: 'usr-2', name: 'Marco Rossi', role: 'Lead Automation Engineer', email: 'm.rossi@prodflow.io', initials: 'MR', color: '#0ea5e9', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80' },
    { id: 'usr-3', name: 'Alex Miller', role: 'Quality & Thermal Specialist', email: 'a.miller@prodflow.io', initials: 'AM', color: '#10b981', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80' },
    { id: 'usr-4', name: 'Elena Kovalenko', role: 'BMS Firmware Lead', email: 'e.kovalenko@prodflow.io', initials: 'EK', color: '#ec4899', avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80' },
    { id: 'usr-5', name: 'David Tanaka', role: 'High-Voltage Safety Lead', email: 'd.tanaka@prodflow.io', initials: 'DT', color: '#f59e0b', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80' },
  ] as Assignee[],
};
