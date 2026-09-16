import { BOMNode, NodeStatus } from '../types';

/**
 * Calculates automated cascade roll-up norm-hours and weighted progress for hierarchical BOM nodes.
 * Rules:
 * 1. Parent Norm-Hours (L1-L4) = Sum of all direct children's Norm-Hours.
 * 2. Parent Base Norm-Hours = Sum of all direct children's Base Norm-Hours.
 * 3. Parent Progress % = [Sum of (Child Progress % * Child Norm-Hours)] / [Sum of Child Norm-Hours].
 * 4. Status is automatically adjusted based on rolled-up progress and child blocker states.
 */
export function recalculateNodeRollups(nodes: BOMNode[]): BOMNode[] {
  // Group nodes by orderId (or null for master) to calculate each tree independently
  const groups = new Map<string | null, BOMNode[]>();
  nodes.forEach((node) => {
    const key = node.orderId || null;
    const list = groups.get(key) || [];
    list.push(node);
    groups.set(key, list);
  });

  const allUpdatedNodes: BOMNode[] = [];

  groups.forEach((groupNodes) => {
    const nodeMap = new Map<string, BOMNode>();
    const clonedNodes: BOMNode[] = groupNodes.map((node) => {
      const assignees =
        node.assignees && node.assignees.length > 0
          ? node.assignees
          : node.assignee
          ? [node.assignee]
          : [];

      const rawHours =
        typeof node.normHours === 'number' && node.normHours >= 0
          ? node.normHours
          : typeof node.weight === 'number' && node.weight > 0
          ? node.weight
          : 5;

      const baseHours =
        typeof node.baseNormHours === 'number' && node.baseNormHours >= 0
          ? node.baseNormHours
          : rawHours;

      return {
        ...node,
        orderId: node.orderId || null,
        assignees,
        assignee: assignees[0] || node.assignee,
        baseNormHours: baseHours,
        normHours: rawHours,
        weight: rawHours,
        baseBatchQuantity: node.baseBatchQuantity || node.batchQuantity || 1,
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

    // Sort descending by level (Level 5 -> Level 4 -> Level 3 -> Level 2 -> Level 1)
    const sortedIds = [...clonedNodes].sort((a, b) => b.level - a.level).map((n) => n.id);

    sortedIds.forEach((id) => {
      const node = nodeMap.get(id);
      if (!node) return;

      const ownHours =
        typeof node.normHours === 'number' && node.normHours >= 0 ? node.normHours : 1;
      const ownBaseHours =
        typeof node.baseNormHours === 'number' && node.baseNormHours >= 0
          ? node.baseNormHours
          : ownHours;

      const childIds = childrenMap.get(id);
      if (childIds && childIds.length > 0) {
        let totalChildHours = 0;
        let totalChildBaseHours = 0;
        let weightedProgressSum = 0;
        let hasDelayedChild = false;
        let allCompleted = true;
        let allPending = true;

        childIds.forEach((childId) => {
          const childNode = nodeMap.get(childId);
          if (childNode) {
            // Child's effective total hours (its own hours + all its children hours)
            const childH =
              typeof childNode.totalNormHours === 'number' && childNode.totalNormHours > 0
                ? childNode.totalNormHours
                : childNode.normHours && childNode.normHours > 0
                ? childNode.normHours
                : 1;

            const childBaseH =
              typeof childNode.totalBaseNormHours === 'number' && childNode.totalBaseNormHours > 0
                ? childNode.totalBaseNormHours
                : childNode.baseNormHours && childNode.baseNormHours > 0
                ? childNode.baseNormHours
                : childH;

            totalChildHours += childH;
            totalChildBaseHours += childBaseH;
            weightedProgressSum += (childNode.progress || 0) * childH;

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

        // Formula: Загальні нормо-години = Нормо-година конкретного вузла цього ж вузла + час усіх дочірніх об'єктів
        node.totalNormHours = Math.round((ownHours + totalChildHours) * 10) / 10;
        node.totalBaseNormHours = Math.round((ownBaseHours + totalChildBaseHours) * 10) / 10;
        // Keep weight aligned with total hours for backward compatibility
        node.weight = node.totalNormHours;

        // Calculate parent's own progress
        let ownProg =
          typeof node.ownProgress === 'number'
            ? node.ownProgress
            : node.status === 'completed'
            ? 100
            : node.status === 'pending'
            ? 0
            : typeof node.progress === 'number'
            ? node.progress
            : 0;

        if (node.status === 'completed') {
          ownProg = 100;
        }

        // Weighted progress percentage combining own progress + child tasks
        const combinedHours = ownHours + totalChildHours;
        const totalProgressPoints = weightedProgressSum + ownProg * ownHours;
        const computedProgress =
          combinedHours > 0 ? Math.round(totalProgressPoints / combinedHours) : 0;

        node.ownProgress = ownProg;
        node.progress = node.status === 'completed' ? 100 : Math.min(100, Math.max(0, computedProgress));

        // Status adjustment
        if (node.progress === 100 || (allCompleted && ownProg === 100)) {
          node.status = 'completed';
          node.progress = 100;
          node.ownProgress = 100;
        } else if (hasDelayedChild && node.status !== 'completed') {
          node.status = 'delayed';
        } else if (node.progress > 0 && node.status === 'pending') {
          node.status = 'in_progress';
        } else if (allPending && node.progress === 0) {
          node.status = 'pending';
        }
      } else {
        // Leaf node with no children: totalNormHours equals own normHours
        node.totalNormHours = ownHours;
        node.totalBaseNormHours = ownBaseHours;
        node.weight = ownHours;
        node.ownProgress = node.progress;
      }
    });

    allUpdatedNodes.push(...Array.from(nodeMap.values()));
  });

  return allUpdatedNodes;
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
      parent.children.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    }
  });

  roots.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  return roots;
}

/**
 * Recursively find all descendant node IDs of a given node
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
