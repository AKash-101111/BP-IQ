import {
  Project, ProjectMetadata, Blueprint, RoomItem, WallItem, OpeningItem, DimensionItem,
  BOQItem, MaterialEstimate, IssueItem, AnalysisRun, AnalysisReport, SystemHealth, RAGChunk
} from './types';

const API_BASE = '/api';

export const api = {
  // Projects
  async getProjects(): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  },

  async getProject(id: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch project ${id}`);
    return res.json();
  },

  async createProject(data: Partial<Project> & { metadata?: Partial<ProjectMetadata> }): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },

  async deleteProject(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete project ${id}`);
  },

  // Blueprints
  async getBlueprints(projectId: string): Promise<Blueprint[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/blueprints`);
    if (!res.ok) throw new Error('Failed to fetch blueprints');
    return res.json();
  },

  async uploadBlueprint(
    projectId: string,
    file: File,
    scaleRatio: string = '1:100',
    scaleUnit: string = 'm'
  ): Promise<Blueprint> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('scale_ratio', scaleRatio);
    formData.append('scale_unit', scaleUnit);

    const res = await fetch(`${API_BASE}/projects/${projectId}/blueprints`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async loadSampleBlueprint(projectId: string): Promise<Blueprint> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/blueprints/sample`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to load sample blueprint' }));
      throw new Error(err.detail || 'Failed to load sample blueprint');
    }
    return res.json();
  },

  // Analysis Pipeline
  async runAnalysis(projectId: string): Promise<AnalysisRun> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/analyze`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
      throw new Error(err.detail || 'Analysis failed');
    }
    return res.json();
  },

  async getAnalysisStatus(projectId: string): Promise<AnalysisRun[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/status`);
    if (!res.ok) throw new Error('Failed to fetch status');
    return res.json();
  },

  async getExtraction(projectId: string): Promise<{
    rooms: RoomItem[];
    walls: WallItem[];
    openings: OpeningItem[];
    dimensions: DimensionItem[];
  }> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/extraction`);
    if (!res.ok) throw new Error('Failed to fetch extraction data');
    return res.json();
  },

  async getBOQ(projectId: string): Promise<{
    boq_items: BOQItem[];
    materials: MaterialEstimate[];
  }> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/boq`);
    if (!res.ok) throw new Error('Failed to fetch BOQ');
    return res.json();
  },

  async getIssues(projectId: string): Promise<IssueItem[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/issues`);
    if (!res.ok) throw new Error('Failed to fetch issues');
    return res.json();
  },

  async getReport(projectId: string): Promise<AnalysisReport> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/report`);
    if (!res.ok) throw new Error('Failed to fetch report');
    return res.json();
  },

  // System & Health
  async getSystemHealth(): Promise<SystemHealth> {
    const res = await fetch(`${API_BASE}/system/health`);
    if (!res.ok) throw new Error('Failed to fetch system health');
    return res.json();
  },

  // RAG
  async searchRAG(query: string, category?: string): Promise<RAGChunk[]> {
    const res = await fetch(`${API_BASE}/rag/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, category, limit: 10 })
    });
    if (!res.ok) throw new Error('Failed to search RAG');
    return res.json();
  },

  async getStandards(): Promise<RAGChunk[]> {
    const res = await fetch(`${API_BASE}/rag/standards`);
    if (!res.ok) throw new Error('Failed to fetch standards');
    return res.json();
  }
};
