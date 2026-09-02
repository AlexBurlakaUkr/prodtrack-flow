import React from 'react';
import { BOMNode } from '../../types';
import { BomNodeCard } from './BomNodeCard';
import { getDescendantNodeIds } from '../../services/rollupCalculator';

interface BomHorizontalTreeProps {
  nodes: BOMNode[];
  filteredNodes: BOMNode[];
  expandedNodes: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  onAddChild: (parentNode: BOMNode) => void;
  onEdit: (node: BOMNode) => void;
  onDelete: (node: BOMNode) => void;
  zoomScale: number;
}

export const BomHorizontalTree: React.FC<BomHorizontalTreeProps> = ({
  nodes,
  filteredNodes,
  expandedNodes,
  onToggleExpand,
  onAddChild,
  onEdit,
  onDelete,
  zoomScale,
}) => {
  // Build lookup of children per parent
  const childrenLookup = React.useMemo(() => {
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

  const treeRoots = React.useMemo(() => {
    return nodes.filter((n) => n.parentId === null).sort((a, b) => a.orderIndex - b.orderIndex);
  }, [nodes]);

  const renderHorizontalNode = (node: BOMNode) => {
    const children = childrenLookup.get(node.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    const isVisible = filteredNodes.some((fn) => fn.id === node.id);
    const hasMatchingDescendant = filteredNodes.some((fn) => {
      const descendants = getDescendantNodeIds(nodes, node.id);
      return descendants.includes(fn.id);
    });

    if (!isVisible && !hasMatchingDescendant && filteredNodes.length < nodes.length) {
      return null;
    }

    return (
      <div key={node.id} className="flex flex-row items-center relative py-3">
        {/* Node card box */}
        <div className="shrink-0 w-[420px] sm:w-[460px] z-10">
          <BomNodeCard
            node={node}
            isExpanded={isExpanded}
            hasChildren={hasChildren}
            childCount={children.length}
            onToggleExpand={onToggleExpand}
            onAddChild={onAddChild}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>

        {/* Right horizontal connector branching to child nodes */}
        {hasChildren && isExpanded && (
          <div className="flex flex-row items-center">
            {/* Horizontal connecting line from parent card */}
            <div className="w-8 h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-400 shadow-glow shrink-0" />

            {/* Vertical spine connecting all children */}
            <div className="flex flex-col justify-center gap-4 relative pl-4 border-l-2 border-indigo-500/50 py-2">
              {children.map((child) => (
                <div key={child.id} className="relative flex items-center">
                  {/* Horizontal branch stub leading into child */}
                  <div className="absolute -left-4 w-4 h-0.5 bg-indigo-500/60" />
                  {renderHorizontalNode(child)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="min-w-max flex flex-col justify-center transition-all duration-300 origin-top-left px-6 py-6"
      style={{
        transform: `scale(${zoomScale})`,
        transformOrigin: 'top left',
      }}
    >
      <div className="flex flex-col space-y-8">
        {treeRoots.map((root) => renderHorizontalNode(root))}
      </div>
    </div>
  );
};
