import Dexie, { type Table } from 'dexie';
import {
  Project,
  BOMNode,
  ProductionOrder,
  ProductTemplate,
  TemplateNode,
  Assignee,
} from '../types';
import {
  DEMO_PROJECT,
  DEMO_NODES,
  DEMO_ORDERS,
  DEMO_TEMPLATES,
  DEMO_PROJECT_ID,
  DEMO_TEMPLATE_ID,
} from './demoData';
import { APP_CONFIG } from '../config/AppConfig';
import { recalculateNodeRollups } from './rollupCalculator';
import { addDays, format } from 'date-fns';

export interface AppSettingsRecord {
  key: string;
  value: string;
}

export class ProdTrackDatabase extends Dexie {
  projects!: Table<Project, string>;
  nodes!: Table<BOMNode, string>;
  orders!: Table<ProductionOrder, string>;
  templates!: Table<ProductTemplate, string>;
  team!: Table<Assignee, string>;
  settings!: Table<AppSettingsRecord, string>;

  constructor() {
    super('ProdTrackFlowDB');
    this.version(3).stores({
      projects: 'id, code, createdAt, updatedAt',
      nodes: 'id, projectId, orderId, parentId, level, status, dueDate, orderIndex',
      orders: 'id, projectId, orderNumber, status, priority, targetDate',
      templates: 'id, code, name, category',
      team: 'id, name, role',
      settings: 'key',
    });
  }
}

export const db = new ProdTrackDatabase();

/**
 * Ensures initial default data exists on first run
 */
export async function initializeDatabase(): Promise<void> {
  try {
    const projectCount = await db.projects.count();
    if (projectCount === 0) {
      await seedDefaultDemoData();
    } else {
      // Ensure templates and team exist
      const templateCount = await db.templates.count();
      if (templateCount === 0) {
        await db.templates.bulkPut(DEMO_TEMPLATES);
      }
      const teamCount = await db.team.count();
      if (teamCount === 0) {
        await db.team.bulkPut(APP_CONFIG.DEFAULT_ASSIGNEES);
      }
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

/**
 * Seed or re-seed the default Tesla Model 3 Battery Pack demo project, templates and team
 */
export async function seedDefaultDemoData(): Promise<void> {
  await db.transaction('rw', [db.projects, db.nodes, db.orders, db.templates, db.team, db.settings], async () => {
    await db.projects.put(DEMO_PROJECT);
    await db.nodes.bulkPut(DEMO_NODES);
    await db.orders.bulkPut(DEMO_ORDERS);
    await db.templates.bulkPut(DEMO_TEMPLATES);
    await db.team.bulkPut(APP_CONFIG.DEFAULT_ASSIGNEES);
    
    // Set active project if not set
    const currentActive = await db.settings.get('active_project_id');
    if (!currentActive) {
      await db.settings.put({ key: 'active_project_id', value: DEMO_PROJECT_ID });
    }
  });
}

/**
 * Factory Reset: erases custom data and re-seeds clean demo data
 */
export async function factoryReset(): Promise<void> {
  await db.transaction('rw', [db.projects, db.nodes, db.orders, db.templates, db.team, db.settings], async () => {
    await db.projects.clear();
    await db.nodes.clear();
    await db.orders.clear();
    await db.templates.clear();
    await db.team.clear();
    
    // Restore clean demo data
    await db.projects.put(DEMO_PROJECT);
    await db.nodes.bulkPut(DEMO_NODES);
    await db.orders.bulkPut(DEMO_ORDERS);
    await db.templates.bulkPut(DEMO_TEMPLATES);
    await db.team.bulkPut(APP_CONFIG.DEFAULT_ASSIGNEES);
    await db.settings.put({ key: 'active_project_id', value: DEMO_PROJECT_ID });
  });
}

/**
 * Create or Update Order and instantiate its dedicated scaled BOM tree clone
 */
export async function saveOrderAndInstantiateBOM(
  order: ProductionOrder,
  templateId?: string
): Promise<{ order: ProductionOrder; nodes: BOMNode[] }> {
  // Check if order already has nodes
  const existingOrderNodes = await db.nodes.where('orderId').equals(order.id).toArray();
  
  if (existingOrderNodes.length > 0) {
    // If updating existing order batch quantity, adjust scaled hours & quantities
    const multiplier = Math.max(1, order.batchQuantity);
    const updatedNodes = existingOrderNodes.map((n) => {
      const baseH = n.baseNormHours || n.normHours || 1;
      const scaledH = Math.round(baseH * multiplier * 10) / 10;
      const baseQ = n.baseBatchQuantity || 1;
      return {
        ...n,
        normHours: scaledH,
        weight: scaledH,
        batchQuantity: baseQ * multiplier,
        dueDate: order.targetDate,
      };
    });

    const calculated = recalculateNodeRollups(updatedNodes);
    await db.transaction('rw', [db.orders, db.nodes], async () => {
      await db.orders.put(order);
      await db.nodes.bulkPut(calculated);
    });

    return { order, nodes: calculated };
  }

  // Clone from template or master project BOM
  let baseNodes: {
    id: string;
    parentId: string | null;
    title: string;
    code: string;
    level: any;
    baseNormHours: number;
    baseBatchQuantity: number;
    unit: string;
    notes?: string;
    image?: string;
    orderIndex: number;
    suggestedRole?: string;
  }[] = [];

  if (templateId) {
    const tmpl = await db.templates.get(templateId);
    if (tmpl && tmpl.nodes.length > 0) {
      baseNodes = tmpl.nodes.map((n) => ({
        id: n.id,
        parentId: n.parentId,
        title: n.title,
        code: n.code,
        level: n.level,
        baseNormHours: n.baseNormHours || n.normHours || 8,
        baseBatchQuantity: n.defaultBatchQuantity || 1,
        unit: n.unit || 'pcs',
        notes: n.notes,
        image: n.image,
        orderIndex: n.orderIndex,
        suggestedRole: n.suggestedRole,
      }));
    }
  }

  // Fallback to project's master BOM nodes (where orderId is null)
  if (baseNodes.length === 0) {
    const projectMasterNodes = await db.nodes
      .where('projectId')
      .equals(order.projectId)
      .and((n) => !n.orderId)
      .toArray();

    baseNodes = projectMasterNodes.map((n) => ({
      id: n.id,
      parentId: n.parentId,
      title: n.title,
      code: n.code,
      level: n.level,
      baseNormHours: n.baseNormHours || n.normHours || 8,
      baseBatchQuantity: n.baseBatchQuantity || n.batchQuantity || 1,
      unit: n.unit || 'pcs',
      notes: n.notes,
      image: n.image,
      orderIndex: n.orderIndex,
      suggestedRole: n.assignees?.[0]?.role,
    }));
  }

  const team = await db.team.toArray();
  const defaultLead = order.assignedLead || team[0] || APP_CONFIG.DEFAULT_ASSIGNEES[0];
  const multiplier = Math.max(1, order.batchQuantity);

  const idMap = new Map<string, string>();
  baseNodes.forEach((bn) => {
    idMap.set(bn.id, `node-${order.id}-${bn.id.replace('node-', '').replace('tmpl-node-', '')}`);
  });

  const clonedOrderNodes: BOMNode[] = baseNodes.map((bn) => {
    const newId = idMap.get(bn.id)!;
    const newParentId = bn.parentId ? idMap.get(bn.parentId) || null : null;
    const baseH = bn.baseNormHours;
    const scaledH = Math.round(baseH * multiplier * 10) / 10;
    const baseQ = bn.baseBatchQuantity;
    const scaledQ = baseQ * multiplier;
    const matchedAssignee = team.find((t) => t.role === bn.suggestedRole) || defaultLead;

    return {
      id: newId,
      projectId: order.projectId,
      orderId: order.id,
      parentId: newParentId,
      title: bn.title,
      code: bn.code,
      level: bn.level,
      progress: 0,
      assignees: [matchedAssignee],
      assignee: matchedAssignee,
      status: 'pending',
      startDate: order.startDate,
      dueDate: order.targetDate,
      baseBatchQuantity: baseQ,
      batchQuantity: scaledQ,
      unit: bn.unit,
      baseNormHours: baseH,
      normHours: scaledH,
      weight: scaledH,
      orderIndex: bn.orderIndex,
      notes: bn.notes,
      image: bn.image,
    };
  });

  const calculated = recalculateNodeRollups(clonedOrderNodes);

  await db.transaction('rw', [db.orders, db.nodes], async () => {
    await db.orders.put(order);
    await db.nodes.bulkPut(calculated);
  });

  return { order, nodes: calculated };
}

/**
 * Cascading Delete Order: removes order record and all its associated cloned BOM tree nodes
 */
export async function deleteOrderCascade(orderId: string): Promise<void> {
  await db.transaction('rw', [db.orders, db.nodes], async () => {
    await db.orders.delete(orderId);
    // Delete all nodes belonging to this order instance
    const orderNodes = await db.nodes.where('orderId').equals(orderId).toArray();
    if (orderNodes.length > 0) {
      await db.nodes.bulkDelete(orderNodes.map((n) => n.id));
    }
  });
}

/**
 * Helper to save node updates and automatically perform roll-up calculation for the project/order
 */
export async function saveNodeAndRecalculate(node: BOMNode): Promise<BOMNode[]> {
  const assignees = node.assignees && node.assignees.length > 0
    ? node.assignees
    : node.assignee
    ? [node.assignee]
    : [];

  const rawHours = typeof node.normHours === 'number' && node.normHours >= 0
    ? node.normHours
    : typeof node.weight === 'number' && node.weight > 0
    ? node.weight
    : 8;

  const baseH = typeof node.baseNormHours === 'number' && node.baseNormHours >= 0
    ? node.baseNormHours
    : rawHours;

  const normalizedNode: BOMNode = {
    ...node,
    orderId: node.orderId || null,
    assignees,
    assignee: assignees[0] || node.assignee,
    baseNormHours: baseH,
    normHours: rawHours,
    weight: rawHours,
    baseBatchQuantity: node.baseBatchQuantity || node.batchQuantity || 1,
  };

  await db.nodes.put(normalizedNode);
  
  // Fetch all nodes in the same tree scope (same projectId and same orderId)
  let treeNodes: BOMNode[] = [];
  if (node.orderId) {
    treeNodes = await db.nodes.where('orderId').equals(node.orderId).toArray();
  } else {
    treeNodes = await db.nodes
      .where('projectId')
      .equals(node.projectId)
      .and((n) => !n.orderId)
      .toArray();
  }

  const updatedNodes = recalculateNodeRollups(treeNodes);
  await db.nodes.bulkPut(updatedNodes);

  // If node belongs to an order, sync order progress with root node progress
  if (node.orderId) {
    const rootNode = updatedNodes.find((n) => n.level === 1);
    if (rootNode) {
      const ord = await db.orders.get(node.orderId);
      if (ord) {
        ord.progress = rootNode.progress;
        if (rootNode.progress === 100) {
          ord.status = 'completed';
          ord.completedUnits = ord.batchQuantity;
        } else if (rootNode.status === 'delayed') {
          ord.status = 'urgent_delayed';
        } else if (rootNode.progress > 0) {
          ord.status = 'in_progress';
        }
        await db.orders.put(ord);
      }
    }
  }

  return updatedNodes;
}

/**
 * Helper to delete a node and all its nested descendants
 */
export async function deleteNodeCascade(nodeId: string, projectId: string, orderId?: string | null): Promise<BOMNode[]> {
  let allNodes: BOMNode[] = [];
  if (orderId) {
    allNodes = await db.nodes.where('orderId').equals(orderId).toArray();
  } else {
    allNodes = await db.nodes.where('projectId').equals(projectId).and((n) => !n.orderId).toArray();
  }
  
  const toDeleteIds = new Set<string>();
  toDeleteIds.add(nodeId);

  const findChildren = (parentId: string) => {
    allNodes.filter((n) => n.parentId === parentId).forEach((child) => {
      toDeleteIds.add(child.id);
      findChildren(child.id);
    });
  };
  findChildren(nodeId);

  await db.nodes.bulkDelete(Array.from(toDeleteIds));
  
  const remainingNodes = allNodes.filter((n) => !toDeleteIds.has(n.id));
  const updatedNodes = recalculateNodeRollups(remainingNodes);
  await db.nodes.bulkPut(updatedNodes);
  return updatedNodes;
}

/**
 * Save an active project's BOM as a reusable Product Template
 */
export async function saveProjectAsTemplate(
  projectId: string,
  templateName: string,
  templateCode: string,
  description: string
): Promise<ProductTemplate> {
  const project = await db.projects.get(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);

  // Use base blueprint nodes (orderId == null)
  const nodes = await db.nodes
    .where('projectId')
    .equals(projectId)
    .and((n) => !n.orderId)
    .toArray();
  
  const templateId = `tmpl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const idMap = new Map<string, string>();
  
  nodes.forEach((n) => {
    idMap.set(n.id, `tmpl-node-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`);
  });

  const templateNodes: TemplateNode[] = nodes.map((n) => {
    const hours = typeof n.baseNormHours === 'number' ? n.baseNormHours : n.normHours || 8;
    return {
      id: idMap.get(n.id)!,
      parentId: n.parentId ? idMap.get(n.parentId) || null : null,
      title: n.title,
      code: n.code,
      level: n.level,
      defaultDurationDays: 14,
      defaultBatchQuantity: n.baseBatchQuantity || 1,
      unit: n.unit,
      baseNormHours: hours,
      normHours: hours,
      weight: hours,
      notes: n.notes,
      image: n.image,
      orderIndex: n.orderIndex,
      suggestedRole: n.assignees?.[0]?.role || n.assignee?.role || 'Lead Specialist',
    };
  });

  const newTemplate: ProductTemplate = {
    id: templateId,
    name: templateName.trim(),
    code: templateCode.trim().toUpperCase(),
    archetype: project.archetype,
    description: description.trim() || project.description,
    category: project.category,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isBuiltIn: false,
    nodes: templateNodes,
  };

  await db.templates.put(newTemplate);
  return newTemplate;
}

/**
 * Instantiate a new Project and full BOM from a Product Template
 */
export async function instantiateTemplateToProject(
  templateId: string,
  projectName: string,
  projectCode: string,
  batchQuantity: number,
  startDateStr: string,
  customerName?: string
): Promise<{ project: Project; nodes: BOMNode[]; order?: ProductionOrder }> {
  const template = await db.templates.get(templateId);
  if (!template) throw new Error(`Template ${templateId} not found`);

  const team = await db.team.toArray();
  const defaultAssignee = team[0] || APP_CONFIG.DEFAULT_ASSIGNEES[0];

  const projectId = `proj-${Date.now()}`;
  const rootNodeId = `node-${Date.now()}-root`;

  const newProject: Project = {
    id: projectId,
    name: projectName.trim(),
    code: projectCode.trim().toUpperCase(),
    archetype: template.archetype,
    description: template.description,
    rootNodeId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefaultDemo: false,
    category: template.category,
    targetOutputUnits: batchQuantity,
    templateId: template.id,
  };

  const idMap = new Map<string, string>();
  template.nodes.forEach((tn) => {
    if (tn.parentId === null) {
      idMap.set(tn.id, rootNodeId);
    } else {
      idMap.set(tn.id, `node-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`);
    }
  });

  const startDate = new Date(startDateStr);

  // 1. Create Base Master Blueprint Nodes (orderId: null, 1 unit)
  const masterNodes: BOMNode[] = template.nodes.map((tn) => {
    const matchedAssignee = team.find((t) => t.role === tn.suggestedRole) || defaultAssignee;
    const durationDays = tn.defaultDurationDays || 14;
    const dueDate = addDays(startDate, durationDays);
    const baseH = tn.baseNormHours || tn.normHours || 8;

    return {
      id: idMap.get(tn.id)!,
      projectId,
      orderId: null,
      parentId: tn.parentId ? idMap.get(tn.parentId) || null : null,
      title: tn.title,
      code: tn.code,
      level: tn.level,
      progress: 0,
      assignees: [matchedAssignee],
      assignee: matchedAssignee,
      status: 'pending',
      startDate: startDateStr,
      dueDate: format(dueDate, 'yyyy-MM-dd'),
      baseBatchQuantity: tn.defaultBatchQuantity || 1,
      batchQuantity: tn.defaultBatchQuantity || 1,
      unit: tn.unit,
      baseNormHours: baseH,
      normHours: baseH,
      weight: baseH,
      orderIndex: tn.orderIndex,
      notes: tn.notes,
      image: tn.image,
    };
  });

  const calculatedMaster = recalculateNodeRollups(masterNodes);

  // 2. If customer name specified, create Order and scaled cloned instance
  let newOrder: ProductionOrder | undefined = undefined;
  let orderClonedNodes: BOMNode[] = [];

  if (customerName) {
    const orderId = `ord-${Date.now()}`;
    newOrder = {
      id: orderId,
      orderNumber: `ORD-${Math.floor(5000 + Math.random() * 4000)}`,
      projectId,
      title: `Batch Run: ${projectName}`,
      customerName: customerName.trim(),
      batchQuantity,
      completedUnits: 0,
      status: 'in_progress',
      priority: 'high',
      progress: 0,
      startDate: startDateStr,
      targetDate: format(addDays(startDate, 30), 'yyyy-MM-dd'),
      notes: `Instantiated from template [${template.name}]`,
      highlightNote: 'Production batch initialized from blueprint template',
      assignedLead: defaultAssignee,
      assignedTeam: [defaultAssignee],
      templateId: template.id,
    };

    const multiplier = Math.max(1, batchQuantity);
    orderClonedNodes = calculatedMaster.map((mn) => ({
      ...mn,
      id: `node-${orderId}-${mn.id.replace('node-', '')}`,
      orderId,
      parentId: mn.parentId ? `node-${orderId}-${mn.parentId.replace('node-', '')}` : null,
      normHours: Math.round((mn.baseNormHours || mn.normHours) * multiplier * 10) / 10,
      weight: Math.round((mn.baseNormHours || mn.normHours) * multiplier * 10) / 10,
      batchQuantity: (mn.baseBatchQuantity || 1) * multiplier,
      startDate: startDateStr,
      dueDate: format(addDays(startDate, 30), 'yyyy-MM-dd'),
    }));
  }

  const allToInsert = [...calculatedMaster, ...recalculateNodeRollups(orderClonedNodes)];

  await db.transaction('rw', [db.projects, db.nodes, db.orders], async () => {
    await db.projects.put(newProject);
    await db.nodes.bulkPut(allToInsert);
    if (newOrder) {
      await db.orders.put(newOrder);
    }
  });

  return { project: newProject, nodes: allToInsert, order: newOrder };
}
