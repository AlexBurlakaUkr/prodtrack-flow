import { db, AppSettingsRecord } from './db';
import { Project, BOMNode, ProductionOrder, ProductTemplate, Assignee } from '../types';
import { APP_CONFIG } from '../config/AppConfig';

export interface DatabaseSnapshot {
  version: string;
  exportedAt: string;
  projects: Project[];
  nodes: BOMNode[];
  orders: ProductionOrder[];
  templates?: ProductTemplate[];
  team?: Assignee[];
  settings?: AppSettingsRecord[];
}

export async function exportDatabaseToJson(): Promise<string> {
  const [projects, nodes, orders, templates, team, settings] = await Promise.all([
    db.projects.toArray(),
    db.nodes.toArray(),
    db.orders.toArray(),
    db.templates.toArray(),
    db.team.toArray(),
    db.settings.toArray(),
  ]);

  const snapshot: DatabaseSnapshot = {
    version: APP_CONFIG.APP_VERSION,
    exportedAt: new Date().toISOString(),
    projects,
    nodes,
    orders,
    templates,
    team,
    settings,
  };

  return JSON.stringify(snapshot, null, 2);
}

export async function importDatabaseFromJson(jsonString: string): Promise<boolean> {
  try {
    const data: Partial<DatabaseSnapshot> = JSON.parse(jsonString);
    if (!Array.isArray(data.projects) || !Array.isArray(data.nodes) || !Array.isArray(data.orders)) {
      throw new Error('Invalid JSON format: missing required tables.');
    }

    const tablesToLock = [db.projects, db.nodes, db.orders];
    if (Array.isArray(data.templates) && data.templates.length > 0) tablesToLock.push(db.templates as any);
    if (Array.isArray(data.team) && data.team.length > 0) tablesToLock.push(db.team as any);
    if (Array.isArray(data.settings) && data.settings.length > 0) tablesToLock.push(db.settings as any);

    await db.transaction('rw', tablesToLock, async () => {
      await db.projects.bulkPut(data.projects as Project[]);
      await db.nodes.bulkPut(data.nodes as BOMNode[]);
      await db.orders.bulkPut(data.orders as ProductionOrder[]);
      if (Array.isArray(data.templates) && data.templates.length > 0) {
        await db.templates.bulkPut(data.templates);
      }
      if (Array.isArray(data.team) && data.team.length > 0) {
        await db.team.bulkPut(data.team);
      }
      if (Array.isArray(data.settings) && data.settings.length > 0) {
        await db.settings.bulkPut(data.settings);
      }
    });

    return true;
  } catch (error) {
    console.error('Failed to import database:', error);
    return false;
  }
}
