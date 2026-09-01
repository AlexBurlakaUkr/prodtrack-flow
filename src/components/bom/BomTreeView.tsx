import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Filter,
  Layers,
  ChevronRight,
  FolderTree,
  AlertCircle,
  BookmarkPlus,
  AlignCenter,
} from 'lucide-react';
import { BOMNode, NodeLevel, NodeStatus, Project } from '../../types';
import { useI18n } from '../../locales';
import { APP_CONFIG } from '../../config/AppConfig';
import { BomNodeCard } from './BomNodeCard';
import { NodeEditModal } from './NodeEditModal';
import { GlassCard } from '../ui/GlassCard';
import { buildBOMTree, getDescendantNodeIds } from '../../services/rollupCalculator';

interface BomTreeViewProps {
  project: Project;
  nodes: BOMNode[];
  onSaveNode: (node: BOMNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onSaveAsTemplate?: () => void;
  searchQuery: string;
}

export const BomTreeView: React.FC<BomTreeViewProps> = ({
  project,
  nodes,
  onSaveNode,
  onDeleteNode,
  onSaveAsTemplate,
  searchQuery,
}) => {
  const { t } = useI18n();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Expansion State: By default expand root node and first module
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const defaultExpanded = new Set<string>();
    const root = nodes.find((n) => n.level === 1);
    if (root) defaultExpanded.add(root.id);
    const firstL2 = nodes.find((n) => n.level === 2);
    if (firstL2) defaultExpanded.add(firstL2.id);
    return defaultExpanded;
  });

  // Filter & Zoom state (Zoom can now go from 50% up to 130%)
  const [levelFilter, setLevelFilter] = useState<'all' | NodeLevel>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | NodeStatus>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [zoomScale, setZoomScale] = useState(1);

  // Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [nodeToEdit, setNodeToEdit] = useState<BOMNode | null>(null);
  const [parentNodeForNew, setParentNodeForNew] = useState<BOMNode | null>(null);

  // Delete Confirm Modal
  const [deleteConfirmNode, setDeleteConfirmNode] = useState<BOMNode | null>(null);

  /**
   * Smart Accordion Expansion:
   * When expanding a node, automatically collapse sibling branches under the same parent
   * to keep the tree clean, focused, and completely prevent visual card collisions/overlaps.
   */
  const toggleExpand = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        // Collapsing: remove this node and all its nested children
        const descendants = getDescendantNodeIds(nodes, nodeId);
        next.delete(nodeId);
        descendants.forEach((d) => next.delete(d));
      } else {
        // Expanding: find target node and its siblings
        const targetNode = nodes.find((n) => n.id === nodeId);
        if (targetNode) {
          // Collapse all sibling branches at the same level under the same parent
          const siblings = nodes.filter(
            (n) => n.parentId === targetNode.parentId && n.id !== targetNode.id
          );
          siblings.forEach((sibling) => {
            next.delete(sibling.id);
            const siblingDescendants = getDescendantNodeIds(nodes, sibling.id);
            siblingDescendants.forEach((d) => next.delete(d));
          });
        }
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    nodes.forEach((n) => all.add(n.id));
    setExpandedNodes(all);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Filter nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (levelFilter !== 'all' && node.level !== levelFilter) return false;
      if (statusFilter !== 'all' && node.status !== statusFilter) return false;
      if (assigneeFilter !== 'all') {
        const hasAssignee =
          (node.assignees || []).some((a) => a.id === assigneeFilter) ||
          node.assignee?.id === assigneeFilter;
        if (!hasAssignee) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = node.title.toLowerCase().includes(q);
        const matchesCode = node.code.toLowerCase().includes(q);
        const matchesAssignees =
          (node.assignees || []).some((a) => a.name.toLowerCase().includes(q)) ||
          node.assignee?.name.toLowerCase().includes(q) ||
          false;
        const matchesNotes = node.notes?.toLowerCase().includes(q) || false;
        if (!matchesTitle && !matchesCode && !matchesAssignees && !matchesNotes) {
          return false;
        }
      }
      return true;
    });
  }, [nodes, levelFilter, statusFilter, assigneeFilter, searchQuery]);

  const treeRoots = useMemo(() => {
    return buildBOMTree(nodes);
  }, [nodes]);

  const childrenLookup = useMemo(() => {
    const map = new Map<string, BOMNode[]>();
    nodes.forEach((n) => {
      if (n.parentId) {
        const list = map.get(n.parentId) || [];
        list.push(n);
        map.set(n.parentId, list);
      }
    });
    return map;
  }, [nodes]);

  // Center scroll horizontally
  const handleCenterView = () => {
    setZoomScale(1);
    if (scrollContainerRef.current) {
      const scrollWidth = scrollContainerRef.current.scrollWidth;
      const clientWidth = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollTo({
        left: (scrollWidth - clientWidth) / 2,
        behavior: 'smooth',
      });
    }
  };

  // Render centered hierarchical tree branches
  const renderTreeNode = (node: BOMNode, isRoot: boolean = false) => {
    const children = childrenLookup.get(node.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    const isVisible = filteredNodes.some((fn) => fn.id === node.id);
    const hasMatchingDescendant = filteredNodes.some((fn) => {
      const descendants = getDescendantNodeIds(nodes, node.id);
      return descendants.includes(fn.id);
    });

    if (
      !isVisible &&
      !hasMatchingDescendant &&
      (levelFilter !== 'all' || statusFilter !== 'all' || assigneeFilter !== 'all' || searchQuery)
    ) {
      return null;
    }

    return (
      <div key={node.id} className="flex flex-col items-center w-full relative">
        {/* Node card centered */}
        <div className="flex flex-col items-center justify-center w-full z-10 px-3">
          <BomNodeCard
            node={node}
            isExpanded={isExpanded}
            hasChildren={hasChildren}
            childCount={children.length}
            onToggleExpand={toggleExpand}
            onAddChild={(parent) => {
              setParentNodeForNew(parent);
              setNodeToEdit(null);
              setEditModalOpen(true);
            }}
            onEdit={(item) => {
              setNodeToEdit(item);
              setParentNodeForNew(null);
              setEditModalOpen(true);
            }}
            onDelete={(item) => {
              setDeleteConfirmNode(item);
            }}
          />
        </div>

        {/* Vertical connector down to children */}
        {hasChildren && isExpanded && (
          <div className="w-full flex flex-col items-center">
            {/* Center line from parent */}
            <div className="w-0.5 h-7 bg-gradient-to-b from-indigo-500 to-indigo-400 shadow-glow" />

            {/* Symmetrical child branches container - dynamic width to prevent overlap */}
            <div className="w-fit min-w-full flex flex-row items-start justify-center gap-8 relative pt-2 px-4">
              {/* Horizontal connecting ribbon across multiple children */}
              {children.length > 1 && (
                <div className="absolute top-0 left-24 right-24 h-0.5 bg-indigo-500/50 rounded-full" />
              )}

              {children.map((child) => (
                <div
                  key={child.id}
                  className="flex flex-col items-center shrink-0 w-fit relative"
                >
                  {/* Top vertical branch stub */}
                  <div className="w-0.5 h-3.5 bg-indigo-500/60 mb-1" />
                  {renderTreeNode(child, false)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-4 space-y-5">
      {/* Top Banner & Control Toolbar */}
      <GlassCard variant="elevated" className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t('bom_canvas_title')}
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {t('bom_canvas_subtitle')}
            </p>
          </div>

          {/* Action buttons & Zoom (50% to 130%) */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end">
            {onSaveAsTemplate && (
              <button
                onClick={onSaveAsTemplate}
                className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-xs font-semibold text-purple-300 flex items-center gap-1.5 transition-all shadow-sm"
                title={t('save_as_template')}
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-purple-400" />
                <span>{t('save_as_template')}</span>
              </button>
            )}

            <button
              onClick={expandAll}
              className="px-3 py-1.5 rounded-xl bg-white/10 dark:bg-slate-800/40 hover:bg-white/20 border border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all"
            >
              <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('expand_all')}</span>
            </button>

            <button
              onClick={collapseAll}
              className="px-3 py-1.5 rounded-xl bg-white/10 dark:bg-slate-800/40 hover:bg-white/20 border border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all"
            >
              <Minimize2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('collapse_all')}</span>
            </button>

            <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block" />

            {/* Zoom Controls (50% to 130%) */}
            <div className="flex items-center bg-white/10 dark:bg-slate-800/40 rounded-xl border border-white/10 p-0.5">
              <button
                onClick={() =>
                  setZoomScale((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(1))))
                }
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                title={`${t('zoom_out')} (min 50%)`}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <span className="text-[10px] font-mono font-bold px-2 text-slate-300 min-w-[42px] text-center">
                {Math.round(zoomScale * 100)}%
              </span>

              <button
                onClick={() =>
                  setZoomScale((prev) => Math.min(1.3, Number((prev + 0.1).toFixed(1))))
                }
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                title={`${t('zoom_in')} (max 130%)`}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleCenterView}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all flex items-center gap-1 text-[10px]"
                title={t('reset_zoom')}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Add Root Product Button */}
            <button
              onClick={() => {
                setNodeToEdit(null);
                setParentNodeForNew(null);
                setEditModalOpen(true);
              }}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t('add_root_node')}</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/10 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>Filters:</span>
          </div>

          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={(e) =>
              setLevelFilter(e.target.value === 'all' ? 'all' : (Number(e.target.value) as NodeLevel))
            }
            className="px-3 py-1 text-xs rounded-xl bg-white/20 dark:bg-slate-900/60 border border-white/15 text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="all" className="bg-slate-900 text-white">
              {t('all_levels')}
            </option>
            {APP_CONFIG.LEVELS.map((lvl) => (
              <option key={lvl.level} value={lvl.level} className="bg-slate-900 text-white">
                L{lvl.level}: {t(lvl.key as any)}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value === 'all' ? 'all' : (e.target.value as NodeStatus))
            }
            className="px-3 py-1 text-xs rounded-xl bg-white/20 dark:bg-slate-900/60 border border-white/15 text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="all" className="bg-slate-900 text-white">
              {t('all_statuses')}
            </option>
            {APP_CONFIG.STATUS_OPTIONS.map((st) => (
              <option key={st.value} value={st.value} className="bg-slate-900 text-white">
                {t(st.key as any)}
              </option>
            ))}
          </select>

          {(levelFilter !== 'all' || statusFilter !== 'all' || assigneeFilter !== 'all') && (
            <button
              onClick={() => {
                setLevelFilter('all');
                setStatusFilter('all');
                setAssigneeFilter('all');
              }}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-semibold ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </GlassCard>

      {/* Main Symmetrical Centered Canvas with Smooth Edge Fade Masks */}
      <div className="relative w-full overflow-hidden rounded-3xl">
        {/* Left & Right Smooth Edge Fade Overlays for soft UI transition */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 sm:w-16 bg-gradient-to-r from-slate-950/80 via-slate-950/30 to-transparent z-20" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 sm:w-16 bg-gradient-to-l from-slate-950/80 via-slate-950/30 to-transparent z-20" />

        {/* Scrollable Container with CSS Mask Fade */}
        <div
          ref={scrollContainerRef}
          className="w-full overflow-x-auto custom-scrollbar py-6 px-4 sm:px-12"
          style={{
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)',
            maskImage:
              'linear-gradient(to right, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)',
          }}
        >
          {treeRoots.length > 0 ? (
            <div
              className="min-w-max flex flex-col items-center justify-center transition-all duration-300 origin-top mx-auto"
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top center',
              }}
            >
              <div className="w-full flex flex-col items-center space-y-8">
                {treeRoots.map((root) => renderTreeNode(root, true))}
              </div>
            </div>
          ) : (
            <GlassCard variant="elevated" className="p-12 text-center max-w-md mx-auto">
              <AlertCircle className="w-12 h-12 text-indigo-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('no_matching_nodes')}
              </h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Try adjusting your search criteria or add new components.
              </p>
              <button
                onClick={() => {
                  setNodeToEdit(null);
                  setParentNodeForNew(null);
                  setEditModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg"
              >
                {t('add_root_node')}
              </button>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Node Create / Edit Modal */}
      <NodeEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        nodeToEdit={nodeToEdit}
        parentNode={parentNodeForNew}
        projectId={project.id}
        hasChildren={nodeToEdit ? Boolean(childrenLookup.get(nodeToEdit.id)?.length) : false}
        onSave={(node) => {
          onSaveNode(node);
          setEditModalOpen(false);
        }}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDeleteConfirmNode(null)}
          />
          <GlassCard
            variant="elevated"
            className="w-full max-w-md z-10 p-6 border-rose-500/40 shadow-2xl bg-slate-900/90 rounded-3xl"
          >
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-white">
                {t('delete_confirm_title')}
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              {t('delete_confirm_desc', {
                count: getDescendantNodeIds(nodes, deleteConfirmNode.id).length,
              })}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmNode(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => {
                  onDeleteNode(deleteConfirmNode.id);
                  setDeleteConfirmNode(null);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30"
              >
                {t('delete')}
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
