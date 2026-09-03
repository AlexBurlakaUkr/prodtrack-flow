import { db } from './db';
import { Project, BOMNode, ProductionOrder } from '../types';

export interface DatabaseSnapshot {
  version: string;
  exportedAt: string;
  projects: Project[];
  nodes: BOMNode[];
  orders: ProductionOrder[];
}

export async function exportDatabaseToJson(): Promise<string> {
  const projects = await db.projects.toArray();
  const nodes = await db.nodes.toArray();
  const orders = await db.orders.toArray();

  const snapshot: DatabaseSnapshot = {
    version: '1.0.1',
    exportedAt: new Date().toISOString(),
    projects,
    nodes,
    orders,
  };

  return JSON.stringify(snapshot, null, 2);
}

export async function importDatabaseFromJson(jsonString: string): Promise<boolean> {
  try {
    const data: Partial<DatabaseSnapshot> = JSON.parse(jsonString);
    if (!Array.isArray(data.projects) || !Array.isArray(data.nodes) || !Array.isArray(data.orders)) {
      throw new Error('Invalid JSON format: missing required tables.');
    }

    await db.transaction('rw', db.projects, db.nodes, db.orders, async () => {
      await db.projects.bulkPut(data.projects as Project[]);
      await db.nodes.bulkPut(data.nodes as BOMNode[]);
      await db.orders.bulkPut(data.orders as ProductionOrder[]);
    });

    return true;
  } catch (error) {
    console.error('Failed to import database:', error);
    return false;
  }
}
