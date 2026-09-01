import { BOMNode, NodeStatus } from '../types';

/**
 * Calculates roll-up progress and status for hierarchical BOM nodes.
 * The completion % of any parent component is automatically recalculated as the weighted average
 * of its direct child components based on their individual weights.
 */
export function recalculateNodeRollups(nodes: BOMNode[]): BOMNode[] {
  // Create a fast lookup map and deep copy array to avoid direct mutation
  const nodeMap = new Map<string, BOMNode>();
  const clonedNodes: BOMNode[] = nodes.map((node) => {
    // Normalize multi-assignee array
    const assignees = node.assignees && node.assignees.length > 0
      ? node.assignees
      : node.assignee
      ? [node.assignee]
      : [];

    return {
      ...node,
      assignees,
      assignee: assignees[0] || node.assignee,
      weight: typeof node.weight === 'number' && node.weight > 0 ? node.weight : 1,
    };
  });

  clonedNodes.forEach((node) => {
    nodeMap.set(node.id, node);
  });

  // Group child IDs by parentId
  const childrenMap = new Map<string, string[]>();
  clonedNodes.forEach((node) => {
    if (node.parentId) {
      const list = childrenMap.get(node.parentId) || [];
      list.push(node.id);
      childrenMap.set(node.parentId, list);
    }
  });

  // Bottom-up evaluation: process from level 5 up to level 1
  // Sort descending by level (Level 5 -> Level 4 -> Level 3 -> Level 2 -> Level 1)
  const sortedIds = [...clonedNodes].sort((a, b) => b.level - a.level).map((n) => n.id);

  sortedIds.forEach((id) => {
    const node = nodeMap.get(id);
    if (!node) return;

    const childIds = childrenMap.get(id);
    if (childIds && childIds.length > 0) {
      let totalWeight = 0;
      let weightedProgressSum = 0;
      let hasDelayedChild = false;
      let allCompleted = true;
      let allPending = true;

      childIds.forEach((childId) => {
        const childNode = nodeMap.get(childId);
        if (childNode) {
          const w = childNode.weight && childNode.weight > 0 ? childNode.weight : 1;
          totalWeight += w;
          weightedProgressSum += childNode.progress * w;

          if (childNode.status === 'delayed') {
            hasDelayedChild = true;
          }
          if (childNode.progress < 100) {
            allCompleted = false;
          }
          if (childNode.progress > 0) {
            allPending = false;
          }
        }
      });

      // Calculate weighted progress
      const computedProgress = totalWeight > 0 ? Math.round(weightedProgressSum / totalWeight) : 0;
      node.progress = Math.min(100, Math.max(0, computedProgress));

      // Adjust status intelligently based on rolled-up progress
      if (node.progress === 100 || allCompleted) {
        node.status = 'completed';
      } else if (hasDelayedChild && node.status !== 'completed') {
        node.status = 'delayed';
      } else if (node.progress > 0 && node.status === 'pending') {
        node.status = 'in_progress';
      } else if (allPending && node.progress === 0) {
        node.status = 'pending';
      }
    }
  });

  return Array.from(nodeMap.values());
}

/**
 * Builds a tree structure with nested `children` arrays from a flat list of BOMNode
 */
export function buildBOMTree(nodes: BOMNode[], rootParentId: string | null = null): BOMNode[] {
  const nodeMap = new Map<string, BOMNode>();
  const roots: BOMNode[] = [];

  // Create deep copy with empty children array
  nodes.forEach((node) => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  // Wire children
  nodeMap.forEach((node) => {
    if (node.parentId === rootParentId) {
      roots.push(node);
    } else if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId)!;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
      // Sort children by orderIndex
      parent.children.sort((a, b) => a.orderIndex - b.orderIndex);
    }
  });

  roots.sort((a, b) => a.orderIndex - b.orderIndex);
  return roots;
}

/**
 * Recursively find all descendant node IDs of a given node (useful for safe cascade deletion)
 */
export function getDescendantNodeIds(nodes: BOMNode[], targetNodeId: string): string[] {
  const descendants: string[] = [];
  const findChildren = (parentId: string) => {
    nodes.filter((n) => n.parentId === parentId).forEach((child) => {
      descendants.push(child.id);
      findChildren(child.id);
    });
  };
  findChildren(targetNodeId);
  return descendants;
}
