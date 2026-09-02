export type NodeLevel = 1 | 2 | 3 | 4 | 5;

export type NodeStatus = 'pending' | 'in_progress' | 'in_review' | 'completed' | 'delayed';

export interface Assignee {
  id: string;
  name: string;
  role: string;
  email?: string;
  avatarUrl?: string;
  initials: string;
  color: string;
}

export interface BOMNode {
  id: string;
  projectId: string;
  orderId?: string | null; // null for Master Blueprint BOM, or specific Order ID for cloned batch instance
  parentId: string | null;
  title: string;
  code: string;
  level: NodeLevel;
  progress: number; // 0 to 100
  assignees: Assignee[]; // Multi-assignee support
  assignee?: Assignee; // Optional backward compatibility
  image?: string; // Base64 or URL
  status: NodeStatus;
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  baseBatchQuantity?: number; // Base quantity for 1 unit
  batchQuantity: number; // Scaled batch quantity (Base * N)
  unit: string;
  notes?: string;
  baseNormHours?: number; // Base Labor Intensity for 1 unit (нормо-години на 1 виріб)
  normHours: number; // Scaled Labor Intensity (baseNormHours * N) for this batch
  weight?: number; // Backward compatibility alias
  orderIndex: number;
  children?: BOMNode[];
}

export type OrderStatus = 'in_progress' | 'urgent_delayed' | 'completed' | 'pending' | 'on_hold';
export type OrderPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  projectId: string;
  title: string;
  customerName: string;
  batchQuantity: number;
  completedUnits: number;
  status: OrderStatus;
  priority: OrderPriority;
  progress: number;
  startDate: string;
  targetDate: string;
  completedDate?: string;
  notes: string;
  assignedLead: Assignee;
  assignedTeam?: Assignee[];
  highlightNote?: string;
  templateId?: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  archetype: string;
  description: string;
  rootNodeId: string;
  createdAt: string;
  updatedAt: string;
  isDefaultDemo?: boolean;
  category: string;
  targetOutputUnits: number;
  templateId?: string;
}

export interface TemplateNode {
  id: string;
  parentId: string | null;
  title: string;
  code: string;
  level: NodeLevel;
  defaultDurationDays: number;
  defaultBatchQuantity: number;
  unit: string;
  baseNormHours?: number;
  normHours: number; // Labor intensity in hours for 1 unit
  weight?: number;
  notes?: string;
  image?: string;
  orderIndex: number;
  suggestedRole?: string;
}

export interface ProductTemplate {
  id: string;
  name: string;
  code: string;
  archetype: string;
  description: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  isBuiltIn?: boolean;
  nodes: TemplateNode[];
}

export type ThemeMode = 'dark' | 'light';
export type GradientTheme = 'cosmic-indigo' | 'deep-emerald' | 'midnight-blue' | 'cyber-violet';
export type Language = 'en' | 'ua';
export type ActiveTab = 'bom' | 'orders' | 'analytics' | 'gantt' | 'templates';
export type GanttZoom = 'day' | 'week' | 'month' | 'year';

export interface FilterState {
  search: string;
  status: 'all' | NodeStatus;
  level: 'all' | NodeLevel;
  assigneeId: 'all' | string;
}
