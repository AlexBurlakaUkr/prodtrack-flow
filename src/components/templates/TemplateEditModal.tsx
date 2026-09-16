import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Layers,
  Clock,
  Briefcase,
  Check,
  User,
} from 'lucide-react';
import { ProductTemplate, TemplateNode, NodeLevel, Assignee } from '../../types';
import { useI18n } from '../../locales';
import { APP_CONFIG } from '../../config/AppConfig';
import { Modal } from '../ui/Modal';
import { Avatar, StackedAvatars } from '../ui/Avatar';
import { FieldLabel } from '../ui/FieldLabel';
import { db } from '../../services/db';

interface TemplateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateToEdit: ProductTemplate | null;
  onSave: (template: ProductTemplate) => void;
  team?: Assignee[];
}

export const TemplateEditModal: React.FC<TemplateEditModalProps> = ({
  isOpen,
  onClose,
  templateToEdit,
  onSave,
  team = [],
}) => {
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [archetype, setArchetype] = useState('Standard Unit');
  const [category, setCategory] = useState('Electronics');
  const [description, setDescription] = useState('');
  const [nodes, setNodes] = useState<TemplateNode[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [teamList, setTeamList] = useState<Assignee[]>(team);
  const [openAssigneesNodeId, setOpenAssigneesNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (team && team.length > 0) {
      setTeamList(team);
    } else {
      db.team.toArray().then((loaded) => {
        if (loaded && loaded.length > 0) {
          setTeamList(loaded);
        } else {
          setTeamList(APP_CONFIG.DEFAULT_ASSIGNEES);
        }
      });
    }
  }, [team, isOpen]);

  useEffect(() => {
    if (templateToEdit) {
      setName(templateToEdit.name);
      setCode(templateToEdit.code);
      setArchetype(templateToEdit.archetype);
      setCategory(templateToEdit.category);
      setDescription(templateToEdit.description);
      setNodes(
        templateToEdit.nodes.map((n, idx) => ({
          ...n,
          normHours: typeof n.normHours === 'number' ? n.normHours : n.weight || 8,
          orderIndex: typeof n.orderIndex === 'number' ? n.orderIndex : idx,
        }))
      );
    } else {
      setName('');
      setCode(`TMPL-${Math.floor(1000 + Math.random() * 9000)}`);
      setArchetype('Modular Platform Archetype');
      setCategory('Hardware Manufacturing');
      setDescription('');
      const defaultMember = teamList[0] || APP_CONFIG.DEFAULT_ASSIGNEES[0];
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
          suggestedRole: defaultMember?.role || 'Chief Battery Architect',
          assignee: defaultMember,
          assignees: defaultMember ? [defaultMember] : [],
        },
      ]);
    }
    setErrors({});
  }, [templateToEdit, isOpen, teamList]);

  const handleUpdateNode = (id: string, updates: Partial<TemplateNode>) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
    );
  };

  const handleAddNode = (parentId: string | null = null) => {
    const parent = nodes.find((n) => n.id === parentId);
    const level = (parent ? Math.min(5, parent.level + 1) : 2) as NodeLevel;
    const defaultMember = teamList[0] || APP_CONFIG.DEFAULT_ASSIGNEES[0];

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
      suggestedRole: defaultMember?.role || 'Lead Automation Engineer',
      assignee: defaultMember,
      assignees: defaultMember ? [defaultMember] : [],
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

    const roots: TemplateNode[] = [];
    const childrenMap = new Map<string, TemplateNode[]>();
    nodes.forEach((n) => {
      if (!n.parentId) {
        roots.push(n);
      } else {
        const list = childrenMap.get(n.parentId) || [];
        list.push(n);
        childrenMap.set(n.parentId, list);
      }
    });

    roots.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    childrenMap.forEach((list) => {
      list.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    });

    const orderedNodes: TemplateNode[] = [];
    const traverse = (node: TemplateNode) => {
      orderedNodes.push(node);
      const children = childrenMap.get(node.id) || [];
      children.forEach(traverse);
    };
    roots.forEach(traverse);

    if (orderedNodes.length < nodes.length) {
      const visited = new Set(orderedNodes.map((n) => n.id));
      nodes.forEach((n) => {
        if (!visited.has(n.id)) orderedNodes.push(n);
      });
    }

    const siblingCountMap = new Map<string | null, number>();
    const sanitizedNodes = orderedNodes.map((n) => {
      const parsedH = parseFloat(String(n.normHours));
      const h = !isNaN(parsedH) && parsedH > 0 ? parsedH : 1;
      const parsedD = parseInt(String(n.defaultDurationDays), 10);
      const d = !isNaN(parsedD) && parsedD > 0 ? parsedD : 1;
      const parentKey = n.parentId || null;
      const currentOrder = siblingCountMap.get(parentKey) ?? 0;
      siblingCountMap.set(parentKey, currentOrder + 1);
      const nodeAssignees =
        n.assignees && n.assignees.length > 0
          ? n.assignees
          : n.assignee
          ? [n.assignee]
          : [];

      return {
        ...n,
        normHours: h,
        weight: h,
        baseNormHours: h,
        defaultDurationDays: d,
        orderIndex: typeof n.orderIndex === 'number' ? n.orderIndex : currentOrder,
        assignees: nodeAssignees,
        assignee: nodeAssignees[0] || undefined,
        suggestedRole: nodeAssignees[0]?.role || n.suggestedRole || 'Lead Specialist',
      };
    });

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
      nodes: sanitizedNodes,
    };

    onSave(updatedTemplate);
    onClose();
  };

  const totalTemplateHours = Math.round(
    nodes.reduce((acc, curr) => acc + (parseFloat(String(curr.normHours)) || 0), 0) * 10
  ) / 10;

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
            <FieldLabel
              label={t('template_name')}
              tooltip={t('field_tooltip_template_name')}
              required={true}
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl bg-white/30 dark:bg-slate-900/60 border border-white/15 text-white outline-none"
            />
            {errors.name && <span className="text-[10px] text-rose-400">{errors.name}</span>}
          </div>

          <div>
            <FieldLabel
              label={t('template_code')}
              tooltip={t('field_tooltip_template_code')}
              required={true}
            />
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

          <div className="space-y-2 max-h-[440px] overflow-y-auto custom-scrollbar pr-1">
            {nodes.map((node) => {
              const levelConf =
                APP_CONFIG.LEVELS.find((l) => l.level === node.level) || APP_CONFIG.LEVELS[0];

              const nodeAssignees =
                node.assignees && node.assignees.length > 0
                  ? node.assignees
                  : node.assignee
                  ? [node.assignee]
                  : [];
              const currentAssignee = nodeAssignees[0];

              return (
                <div
                  key={node.id}
                  className="p-3 rounded-2xl bg-white/10 dark:bg-slate-800/50 border border-white/10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3"
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
                      className="flex-1 min-w-[160px] px-2.5 py-1 text-xs rounded-lg bg-black/30 border border-white/10 text-white"
                      placeholder="Component Title"
                    />
                  </div>

                  {/* Norm-Hours, Durations, and Assignee Selection */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* Norm-Hours */}
                    <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded-lg border border-white/10 text-[11px] text-slate-300">
                      <Clock className="w-3 h-3 text-sky-400" />
                      <span>{t('norm_hours_short')}:</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={node.normHours ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*([.,]\d*)?$/.test(val)) {
                            handleUpdateNode(node.id, {
                              normHours: val as any,
                              weight: val as any,
                            });
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseFloat(String(node.normHours));
                          const valid = !isNaN(parsed) && parsed > 0 ? parsed : 1;
                          handleUpdateNode(node.id, {
                            normHours: valid,
                            weight: valid,
                          });
                        }}
                        className="w-12 bg-transparent text-center font-bold text-sky-300 outline-none border-b border-transparent focus:border-sky-400"
                      />
                    </div>

                    {/* Duration in Days */}
                    <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded-lg border border-white/10 text-[11px] text-slate-300">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      <span>Days:</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={node.defaultDurationDays ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*$/.test(val)) {
                            handleUpdateNode(node.id, { defaultDurationDays: val as any });
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseInt(String(node.defaultDurationDays), 10);
                          const valid = !isNaN(parsed) && parsed > 0 ? parsed : 1;
                          handleUpdateNode(node.id, { defaultDurationDays: valid });
                        }}
                        className="w-10 bg-transparent text-center font-bold text-indigo-300 outline-none border-b border-transparent focus:border-indigo-400"
                      />
                    </div>

                    {/* Multi-Assignee Selector right after Days */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenAssigneesNodeId(openAssigneesNodeId === node.id ? null : node.id)
                        }
                        className="flex items-center gap-1.5 bg-black/30 hover:bg-black/50 px-2.5 py-1 rounded-lg border border-white/10 hover:border-indigo-400/40 text-[11px] text-slate-300 transition-all cursor-pointer"
                        title={t('node_assignee')}
                      >
                        {nodeAssignees.length > 0 ? (
                          <>
                            <StackedAvatars assignees={nodeAssignees} size="xs" />
                            <span className="font-semibold text-white">({nodeAssignees.length})</span>
                          </>
                        ) : (
                          <>
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-400">{t('unassigned')}</span>
                          </>
                        )}
                      </button>

                      {/* Multi-Assignee Selection Popover */}
                      {openAssigneesNodeId === node.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setOpenAssigneesNodeId(null)}
                          />
                          <div className="absolute right-0 top-full mt-1.5 z-50 w-64 p-2.5 rounded-2xl bg-slate-900/95 border border-white/20 shadow-2xl backdrop-blur-xl animate-fadeIn">
                            <div className="text-[11px] font-bold text-slate-300 mb-2 px-1 flex items-center justify-between">
                              <span>{t('node_assignee')}</span>
                              <span className="text-[10px] text-indigo-400 font-semibold">
                                {nodeAssignees.length} вибрано
                              </span>
                            </div>
                            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                              {teamList.map((member) => {
                                const isSelected = nodeAssignees.some((a) => a.id === member.id);
                                return (
                                  <button
                                    type="button"
                                    key={member.id}
                                    onClick={() => {
                                      const updated = isSelected
                                        ? nodeAssignees.filter((a) => a.id !== member.id)
                                        : [...nodeAssignees, member];
                                      handleUpdateNode(node.id, {
                                        assignees: updated,
                                        assignee: updated[0] || undefined,
                                        suggestedRole: updated[0]?.role || node.suggestedRole,
                                      });
                                    }}
                                    className={`w-full flex items-center justify-between p-1.5 rounded-xl border text-left transition-all ${
                                      isSelected
                                        ? 'bg-indigo-500/25 border-indigo-400 text-white shadow-sm'
                                        : 'bg-white/5 border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/10'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Avatar assignee={member} size="xs" />
                                      <div className="truncate">
                                        <div className="text-xs font-bold truncate">{member.name}</div>
                                        <div className="text-[9px] text-slate-400 truncate">{member.role}</div>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-1" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="mt-2 pt-2 border-t border-white/10 flex justify-end">
                              <button
                                type="button"
                                onClick={() => setOpenAssigneesNodeId(null)}
                                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shadow"
                              >
                                OK
                              </button>
                            </div>
                          </div>
                        </>
                      )}
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
