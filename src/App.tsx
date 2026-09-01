import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  ActiveTab,
  BOMNode,
  GradientTheme,
  ProductionOrder,
  Project,
  ProductTemplate,
  ThemeMode,
  Assignee,
} from './types';
import { useI18n } from './locales';
import { APP_CONFIG } from './config/AppConfig';
import {
  db,
  initializeDatabase,
  saveNodeAndRecalculate,
  deleteNodeCascade,
  factoryReset,
  seedDefaultDemoData,
  saveProjectAsTemplate,
  instantiateTemplateToProject,
} from './services/db';
import { DEMO_PROJECT_ID } from './services/demoData';
import { recalculateNodeRollups } from './services/rollupCalculator';
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { Background } from './components/layout/Background';
import { BomTreeView } from './components/bom/BomTreeView';
import { OrderList } from './components/orders/OrderList';
import { TemplateManager } from './components/templates/TemplateManager';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { GanttTimeline } from './components/gantt/GanttTimeline';
import { DailyCheckInDrawer } from './components/analytics/DailyCheckInDrawer';
import { SettingsModal } from './components/modals/SettingsModal';
import { ProjectModal } from './components/modals/ProjectModal';
import { FactoryResetDialog } from './components/modals/FactoryResetDialog';
import { differenceInDays, parseISO } from 'date-fns';

export const App: React.FC = () => {
  const { t } = useI18n();

  // App Theme & Styling State
  const [mode, setMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('prodtrack_theme_mode') as ThemeMode) || 'dark';
  });

  const [gradientTheme, setGradientTheme] = useState<GradientTheme>(() => {
    return (
      (localStorage.getItem('prodtrack_gradient_theme') as GradientTheme) ||
      'cosmic-indigo'
    );
  });

  // Active Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('bom');

  // Database Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>(DEMO_PROJECT_ID);
  const [nodes, setNodes] = useState<BOMNode[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [team, setTeam] = useState<Assignee[]>([]);
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [dailyCheckinOpen, setDailyCheckinOpen] = useState(false);
  const [factoryResetOpen, setFactoryResetOpen] = useState(false);

  // Sync Dark/Light Mode with HTML document class
  useEffect(() => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('prodtrack_theme_mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('prodtrack_gradient_theme', gradientTheme);
  }, [gradientTheme]);

  // Load Database Data
  const loadDatabaseData = useCallback(async () => {
    try {
      await initializeDatabase();

      const [allProjects, allTemplates, allTeam] = await Promise.all([
        db.projects.toArray(),
        db.templates.toArray(),
        db.team.toArray(),
      ]);

      setProjects(allProjects);
      setTemplates(allTemplates);
      setTeam(allTeam.length > 0 ? allTeam : APP_CONFIG.DEFAULT_ASSIGNEES);

      // Determine active project
      let currentId = activeProjectId;
      const activeSetting = await db.settings.get('active_project_id');
      if (activeSetting && allProjects.some((p) => p.id === activeSetting.value)) {
        currentId = activeSetting.value;
      } else if (!allProjects.some((p) => p.id === currentId) && allProjects.length > 0) {
        currentId = allProjects[0].id;
      }
      setActiveProjectId(currentId);

      // Load nodes & orders for current project
      const projNodes = await db.nodes.where('projectId').equals(currentId).toArray();
      const calculatedNodes = recalculateNodeRollups(projNodes);
      setNodes(calculatedNodes);

      const projOrders = await db.orders.where('projectId').equals(currentId).toArray();
      setOrders(projOrders);

      setIsDbLoaded(true);
    } catch (err) {
      console.error('Failed loading data from IndexedDB:', err);
    }
  }, [activeProjectId]);

  useEffect(() => {
    loadDatabaseData();
  }, [loadDatabaseData]);

  // Active Project object
  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0] || null;
  }, [projects, activeProjectId]);

  // Switch Active Project
  const handleSelectProject = async (projectId: string) => {
    setActiveProjectId(projectId);
    await db.settings.put({ key: 'active_project_id', value: projectId });

    const projNodes = await db.nodes.where('projectId').equals(projectId).toArray();
    setNodes(recalculateNodeRollups(projNodes));

    const projOrders = await db.orders.where('projectId').equals(projectId).toArray();
    setOrders(projOrders);
  };

  // Launch Demo Project
  const handleLaunchDemo = async () => {
    const demo = projects.find((p) => p.id === DEMO_PROJECT_ID);
    if (!demo) {
      await seedDefaultDemoData();
      await loadDatabaseData();
    }
    await handleSelectProject(DEMO_PROJECT_ID);
    setActiveTab('bom');
  };

  // Save Node & Recalculate Rollups
  const handleSaveNode = async (node: BOMNode) => {
    try {
      const updatedNodes = await saveNodeAndRecalculate(node);
      setNodes(updatedNodes);

      if (node.progress === 100) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      }
    } catch (err) {
      console.error('Failed to save node:', err);
    }
  };

  // Delete Node & Cascade Subcomponents
  const handleDeleteNode = async (nodeId: string) => {
    try {
      if (!activeProject) return;
      const updatedNodes = await deleteNodeCascade(nodeId, activeProject.id);
      setNodes(updatedNodes);
    } catch (err) {
      console.error('Failed to delete node:', err);
    }
  };

  // Save Order
  const handleSaveOrder = async (order: ProductionOrder) => {
    try {
      await db.orders.put(order);
      const updatedOrders = await db.orders
        .where('projectId')
        .equals(order.projectId)
        .toArray();
      setOrders(updatedOrders);

      if (order.status === 'completed' || order.progress === 100) {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      console.error('Failed to save order:', err);
    }
  };

  // Delete Order
  const handleDeleteOrder = async (orderId: string) => {
    try {
      await db.orders.delete(orderId);
      if (activeProject) {
        const updatedOrders = await db.orders
          .where('projectId')
          .equals(activeProject.id)
          .toArray();
        setOrders(updatedOrders);
      }
    } catch (err) {
      console.error('Failed to delete order:', err);
    }
  };

  // Save Project
  const handleSaveProject = async (project: Project) => {
    try {
      await db.projects.put(project);

      // If new project, create an initial root node for it
      const existingNodes = await db.nodes.where('projectId').equals(project.id).toArray();
      if (existingNodes.length === 0) {
        const initialRootNode: BOMNode = {
          id: project.rootNodeId,
          projectId: project.id,
          parentId: null,
          title: project.name,
          code: project.code,
          level: 1,
          progress: 0,
          assignees: [team[0] || APP_CONFIG.DEFAULT_ASSIGNEES[0]],
          assignee: team[0] || APP_CONFIG.DEFAULT_ASSIGNEES[0],
          status: 'pending',
          startDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
          batchQuantity: project.targetOutputUnits,
          unit: 'units',
          weight: 1,
          orderIndex: 0,
          notes: project.description,
        };
        await db.nodes.put(initialRootNode);
      }

      await loadDatabaseData();
      await handleSelectProject(project.id);
    } catch (err) {
      console.error('Failed to save project:', err);
    }
  };

  // Save Template
  const handleSaveTemplate = async (template: ProductTemplate) => {
    try {
      await db.templates.put(template);
      const updated = await db.templates.toArray();
      setTemplates(updated);
    } catch (err) {
      console.error('Failed to save template:', err);
    }
  };

  // Delete Template
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await db.templates.delete(templateId);
      const updated = await db.templates.toArray();
      setTemplates(updated);
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  // Save Active BOM as Template
  const handleSaveCurrentProjectAsTemplate = async () => {
    if (!activeProject) return;
    try {
      const tmplName = `${activeProject.name} Blueprint`;
      const tmplCode = `TMPL-${activeProject.code}`;
      await saveProjectAsTemplate(activeProject.id, tmplName, tmplCode, activeProject.description);
      const updated = await db.templates.toArray();
      setTemplates(updated);
      setActiveTab('templates');
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error('Failed to save project as template:', err);
    }
  };

  // Instantiate Template to Active Project / Order
  const handleInstantiateTemplate = async (
    templateId: string,
    projectName: string,
    projectCode: string,
    batchQuantity: number,
    startDate: string,
    customerName: string
  ) => {
    try {
      const result = await instantiateTemplateToProject(
        templateId,
        projectName,
        projectCode,
        batchQuantity,
        startDate,
        customerName
      );

      await loadDatabaseData();
      await handleSelectProject(result.project.id);
      setActiveTab('bom');

      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.5 },
      });
    } catch (err) {
      console.error('Failed to instantiate template:', err);
    }
  };

  // Factory Reset Execution
  const handleConfirmFactoryReset = async () => {
    try {
      await factoryReset();
      await loadDatabaseData();
      await handleSelectProject(DEMO_PROJECT_ID);
      setActiveTab('bom');
    } catch (err) {
      console.error('Failed to execute factory reset:', err);
    }
  };

  // Calculate Urgent / Bottleneck Nodes (<= 2 days remaining with < 80% progress)
  const urgentNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (node.progress >= APP_CONFIG.PROGRESS_WARNING_THRESHOLD) return false;
      try {
        const due = parseISO(node.dueDate);
        const days = differenceInDays(due, new Date());
        return days <= APP_CONFIG.DEADLINE_WARNING_DAYS_THRESHOLD;
      } catch {
        return false;
      }
    });
  }, [nodes]);

  // Quick progress update from Daily Check-in Drawer
  const handleQuickProgressUpdate = (nodeId: string, progress: number) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      const updatedNode: BOMNode = {
        ...node,
        progress,
        status: progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : node.status,
      };
      handleSaveNode(updatedNode);
    }
  };

  if (!isDbLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-400">
            Initializing ProdTrack Flow Database...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 relative flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Dynamic Animated Mesh Liquid Glass Background */}
      <Background theme={gradientTheme} mode={mode} />

      {/* Top Header Navbar */}
      <Header
        projects={projects}
        activeProject={activeProject}
        onSelectProject={handleSelectProject}
        onOpenCreateProject={() => {
          setProjectToEdit(null);
          setProjectModalOpen(true);
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenDailyCheckin={() => setDailyCheckinOpen(true)}
        onLaunchDemo={handleLaunchDemo}
        urgentNodesCount={urgentNodes.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Tab Navigation Switcher */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ordersCount={orders.length}
        templatesCount={templates.length}
      />

      {/* Main Content Modules */}
      <main className="flex-1 pb-16">
        {activeTab === 'templates' ? (
          <TemplateManager
            templates={templates}
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onInstantiateTemplate={handleInstantiateTemplate}
            searchQuery={searchQuery}
          />
        ) : activeProject ? (
          <>
            {activeTab === 'bom' && (
              <BomTreeView
                project={activeProject}
                nodes={nodes}
                onSaveNode={handleSaveNode}
                onDeleteNode={handleDeleteNode}
                onSaveAsTemplate={handleSaveCurrentProjectAsTemplate}
                searchQuery={searchQuery}
              />
            )}

            {activeTab === 'orders' && (
              <OrderList
                project={activeProject}
                orders={orders}
                templates={templates}
                onSaveOrder={handleSaveOrder}
                onDeleteOrder={handleDeleteOrder}
                onInstantiateFromTemplate={handleInstantiateTemplate}
                searchQuery={searchQuery}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsDashboard
                project={activeProject}
                nodes={nodes}
                orders={orders}
                onOpenCheckin={() => setDailyCheckinOpen(true)}
              />
            )}

            {activeTab === 'gantt' && (
              <GanttTimeline
                project={activeProject}
                nodes={nodes}
                orders={orders}
                searchQuery={searchQuery}
              />
            )}
          </>
        ) : (
          <div className="max-w-md mx-auto my-20 p-8 text-center bg-white/10 dark:bg-slate-900/60 rounded-3xl border border-white/20">
            <h3 className="text-lg font-bold">No Active Project Selected</h3>
            <button
              onClick={handleLaunchDemo}
              className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg"
            >
              {t('demo_project_button')}
            </button>
          </div>
        )}
      </main>

      {/* Modals & Drawers */}
      <DailyCheckInDrawer
        isOpen={dailyCheckinOpen}
        onClose={() => setDailyCheckinOpen(false)}
        urgentNodes={urgentNodes}
        onUpdateProgress={handleQuickProgressUpdate}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        mode={mode}
        onToggleMode={setMode}
        gradientTheme={gradientTheme}
        onSelectGradient={setGradientTheme}
        onOpenFactoryReset={() => setFactoryResetOpen(true)}
        onDataImported={loadDatabaseData}
        team={team}
        onTeamUpdated={loadDatabaseData}
      />

      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        projectToEdit={projectToEdit}
        onSave={handleSaveProject}
      />

      <FactoryResetDialog
        isOpen={factoryResetOpen}
        onClose={() => setFactoryResetOpen(false)}
        onConfirmReset={handleConfirmFactoryReset}
      />
    </div>
  );
};
