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
    this.version(2).stores({
      projects: 'id, code, createdAt, updatedAt',
      nodes: 'id, projectId, parentId, level, status, dueDate, orderIndex',
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
 * Helper to save node updates and automatically perform roll-up calculation for the project
 */
export async function saveNodeAndRecalculate(node: BOMNode): Promise<BOMNode[]> {
  // Normalize multi-assignee field
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

  const normalizedNode: BOMNode = {
    ...node,
    assignees,
    assignee: assignees[0] || node.assignee,
    normHours: rawHours,
    weight: rawHours,
  };

  await db.nodes.put(normalizedNode);
  
  // Fetch all nodes for this project to recalculate rollups bottom-up
  const projectNodes = await db.nodes.where('projectId').equals(node.projectId).toArray();
  const updatedNodes = recalculateNodeRollups(projectNodes);
  
  // Persist updated rollups in bulk
  await db.nodes.bulkPut(updatedNodes);
  return updatedNodes;
}

/**
 * Helper to delete a node and all its nested descendants
 */
export async function deleteNodeCascade(nodeId: string, projectId: string): Promise<BOMNode[]> {
  const allNodes = await db.nodes.where('projectId').equals(projectId).toArray();
  
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
  
  const remainingNodes = await db.nodes.where('projectId').equals(projectId).toArray();
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

  const nodes = await db.nodes.where('projectId').equals(projectId).toArray();
  
  const templateId = `tmpl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const idMap = new Map<string, string>();
  
  nodes.forEach((n) => {
    idMap.set(n.id, `tmpl-node-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`);
  });

  const templateNodes: TemplateNode[] = nodes.map((n) => {
    const hours = typeof n.normHours === 'number' ? n.normHours : n.weight || 8;
    return {
      id: idMap.get(n.id)!,
      parentId: n.parentId ? idMap.get(n.parentId) || null : null,
      title: n.title,
      code: n.code,
      level: n.level,
      defaultDurationDays: 14,
      defaultBatchQuantity: n.batchQuantity,
      unit: n.unit,
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
  const rootTemplateNode = template.nodes.find((n) => n.parentId === null) || template.nodes[0];
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

  const instanceNodes: BOMNode[] = template.nodes.map((tn) => {
    const matchedAssignee = team.find((t) => t.role === tn.suggestedRole) || defaultAssignee;
    const durationDays = tn.defaultDurationDays || 14;
    const dueDate = addDays(startDate, durationDays);
    const hours = typeof tn.normHours === 'number' ? tn.normHours : tn.weight || 8;

    return {
      id: idMap.get(tn.id)!,
      projectId,
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
      batchQuantity: tn.defaultBatchQuantity * (tn.level === 1 ? batchQuantity : 1),
      unit: tn.unit,
      normHours: hours,
      weight: hours,
      orderIndex: tn.orderIndex,
      notes: tn.notes,
      image: tn.image,
    };
  });

  const calculatedNodes = recalculateNodeRollups(instanceNodes);

  let newOrder: ProductionOrder | undefined = undefined;
  if (customerName) {
    newOrder = {
      id: `ord-${Date.now()}`,
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
  }

  await db.transaction('rw', [db.projects, db.nodes, db.orders], async () => {
    await db.projects.put(newProject);
    await db.nodes.bulkPut(calculatedNodes);
    if (newOrder) {
      await db.orders.put(newOrder);
    }
  });

  return { project: newProject, nodes: calculatedNodes, order: newOrder };
}
