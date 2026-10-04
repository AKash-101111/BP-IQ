import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { LoginPage } from './components/auth/LoginPage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/views/DashboardView';
import { KnowledgeBaseView } from './components/views/KnowledgeBaseView';
import { ReportsView } from './components/views/ReportsView';
import { CreateProjectPage } from './components/create/CreateProjectPage';
import { BlueprintUploadPage } from './components/create/BlueprintUploadPage';
import { AnalysisProgressView } from './components/create/AnalysisProgressView';

import {
  Project,
  Blueprint,
  RoomItem,
  WallItem,
  OpeningItem,
  DimensionItem,
  BOQItem,
  MaterialEstimate,
  IssueItem,
  AnalysisReport,
  SystemHealth,
} from './types';
import { api } from './api';

import { ProjectsView } from './components/views/ProjectsView';
import { BlueprintViewerPage } from './components/views/BlueprintViewerPage';

export const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);

  // Extracted Data & Analysis
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [walls, setWalls] = useState<WallItem[]>([]);
  const [openings, setOpenings] = useState<OpeningItem[]>([]);
  const [dimensions, setDimensions] = useState<DimensionItem[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [materials, setMaterials] = useState<MaterialEstimate[]>([]);
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [report, setReport] = useState<AnalysisReport | null>(null);

  // UI Interactive States
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

  // Initial Load & Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      checkHealth();
      loadProjects();
      const interval = setInterval(checkHealth, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const checkHealth = async () => {
    try {
      const h = await api.getSystemHealth();
      setSystemHealth(h);
    } catch (e) {
      console.error('Health check failed', e);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
      if (data.length > 0 && !currentProject) {
        selectProject(data[0]);
      }
    } catch (e) {
      console.error('Error loading projects', e);
    }
  };

  const selectProject = async (p: Project) => {
    setCurrentProject(p);
    setSelectedIssueId(null);
    setBlueprints([]);
    setRooms([]);
    setWalls([]);
    setOpenings([]);
    setDimensions([]);
    setBoqItems([]);
    setMaterials([]);
    setIssues([]);
    setReport(null);

    try {
      const bps = await api.getBlueprints(p.id).catch(() => []);
      setBlueprints(bps || []);
      setCurrentPageNum(1);

      const ext = await api.getExtraction(p.id).catch(() => ({ rooms: [], walls: [], openings: [], dimensions: [] }));
      setRooms(ext.rooms || []);
      setWalls(ext.walls || []);
      setOpenings(ext.openings || []);
      setDimensions(ext.dimensions || []);

      const boq = await api.getBOQ(p.id).catch(() => ({ boq_items: [], materials: [] }));
      setBoqItems(boq.boq_items || []);
      setMaterials(boq.materials || []);

      const iss = await api.getIssues(p.id).catch(() => []);
      setIssues(iss || []);

      const rep = await api.getReport(p.id).catch(() => null);
      setReport(rep);
    } catch (e) {
      console.error('Error loading project details', e);
    }
  };

  if (!session) {
    return <LoginPage onLoginSuccess={(sess) => setSession(sess || { user: { email: 'engineer@company.com' } })} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas">
      {/* Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        systemHealth={systemHealth}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header
          currentProject={currentProject}
          projects={projects}
          onSelectProject={selectProject}
          onOpenNewProjectModal={() => setCurrentTab('create-project')}
          onRunAnalysis={() => setCurrentTab('analysis')}
          isAnalyzing={currentTab === 'analysis'}
          blueprints={blueprints}
        />

        {/* Dynamic Main Workspace Content */}
        <div className="flex-1 flex min-w-0 overflow-hidden">
          {currentTab === 'dashboard' && (
            <DashboardView
              projects={projects}
              currentProject={currentProject}
              report={report}
              blueprints={blueprints}
              materials={materials}
              issues={issues}
              rooms={rooms}
              walls={walls}
              openings={openings}
              dimensions={dimensions}
              boqItems={boqItems}
              onSelectProject={(p) => {
                selectProject(p);
              }}
              onOpenNewProjectModal={() => setCurrentTab('create-project')}
              onRunAnalysis={() => {
                if (!blueprints || blueprints.length === 0) {
                  setCurrentTab('upload-blueprint');
                } else {
                  setCurrentTab('analysis');
                }
              }}
              onUploadBlueprint={() => setCurrentTab('upload-blueprint')}
            />
          )}

          {currentTab === 'projects' && (
            <ProjectsView
              projects={projects}
              currentProject={currentProject}
              onSelectProject={(p) => selectProject(p)}
              onOpenDashboard={async (p) => {
                await selectProject(p);
                setCurrentTab('dashboard');
              }}
              onOpenNewProjectModal={() => setCurrentTab('create-project')}
              onViewBlueprint={async (p) => {
                await selectProject(p);
                setCurrentTab('viewer');
              }}
              onUploadBlueprint={async (p) => {
                await selectProject(p);
                setCurrentTab('upload-blueprint');
              }}
              onRunAnalysis={async (p) => {
                await selectProject(p);
                setCurrentTab('analysis');
              }}
              onDeleteProject={async (id) => {
                await api.deleteProject(id);
                loadProjects();
              }}
            />
          )}

          {currentTab === 'viewer' && (
            <BlueprintViewerPage
              project={currentProject}
              blueprints={blueprints}
              currentPageNum={currentPageNum}
              onSelectPage={setCurrentPageNum}
              onUploadBlueprint={() => setCurrentTab('upload-blueprint')}
            />
          )}

          {currentTab === 'create-project' && (
            <CreateProjectPage 
              onNext={async (newProj) => {
                await loadProjects();
                await selectProject(newProj);
                setCurrentTab('upload-blueprint');
              }}
              onCancel={() => setCurrentTab('projects')}
            />
          )}

          {currentTab === 'upload-blueprint' && currentProject && (
            <BlueprintUploadPage
              project={currentProject}
              onAnalyze={async () => {
                await selectProject(currentProject);
                setCurrentTab('analysis');
              }}
              onBack={() => setCurrentTab('create-project')}
            />
          )}

          {currentTab === 'analysis' && currentProject && (
            <AnalysisProgressView
              project={currentProject}
              onComplete={async () => {
                await selectProject(currentProject);
                const updated = await api.getProject(currentProject.id);
                setCurrentProject(updated);
                setCurrentTab('dashboard');
              }}
              onUploadBlueprint={() => setCurrentTab('upload-blueprint')}
              onBack={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'knowledge' && <KnowledgeBaseView />}

          {currentTab === 'reports' && (
            <ReportsView currentProject={currentProject} report={report} />
          )}
        </div>
      </div>
    </div>
  );
};
