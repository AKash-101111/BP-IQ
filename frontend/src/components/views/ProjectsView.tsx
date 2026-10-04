import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  Building,
  Calendar,
  Layers,
  Play,
  Upload,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { Project, Blueprint } from '../../types';

interface ProjectsViewProps {
  projects: Project[];
  currentProject: Project | null;
  onSelectProject: (project: Project) => void;
  onOpenDashboard?: (project: Project) => void;
  onOpenNewProjectModal: () => void;
  onViewBlueprint: (project: Project) => void;
  onUploadBlueprint: (project: Project) => void;
  onRunAnalysis: (project: Project) => void;
  onDeleteProject?: (projectId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  currentProject,
  onSelectProject,
  onOpenDashboard,
  onOpenNewProjectModal,
  onViewBlueprint,
  onUploadBlueprint,
  onRunAnalysis,
  onDeleteProject,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.building_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.location && p.location.toLowerCase().includes(searchTerm.toLowerCase()));

    if (filterType === 'ALL') return matchesSearch;
    return matchesSearch && p.building_type.toUpperCase() === filterType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ANALYSIS COMPLETE':
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-success-subtle text-success border border-success-border">
            <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETED
          </span>
        );
      case 'REVIEW REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-issue-subtle text-issue border border-issue-border">
            <AlertCircle className="w-3.5 h-3.5" /> REVIEW REQUIRED
          </span>
        );
      case 'INSUFFICIENT INFORMATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-warning-subtle text-warning border border-warning-border">
            <HelpCircle className="w-3.5 h-3.5" /> INCOMPLETE
          </span>
        );
      case 'UPLOADED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-subtle text-accent border border-accent/20">
            <Layers className="w-3.5 h-3.5" /> BLUEPRINT ATTACHED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-canvas text-textSecondary border border-borderline">
            <Clock className="w-3.5 h-3.5" /> CREATED
          </span>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-canvas p-6 lg:p-10 space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Project Management</h1>
          <p className="text-sm text-textSecondary mt-1">
            Manage construction projects, drawings, and evaluation workflows.
          </p>
        </div>
        <button
          onClick={onOpenNewProjectModal}
          className="px-4 py-2.5 bg-accent text-white rounded font-semibold text-sm hover:bg-accent-hover transition-colors shadow-sm inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-panel p-4 rounded-lg border border-borderline shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-textSecondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects by name, type, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-canvas border border-borderline rounded text-xs text-textPrimary placeholder-textSecondary focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-textSecondary font-semibold">Filter:</span>
          {['ALL', 'RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                filterType === type
                  ? 'bg-accent text-white'
                  : 'bg-canvas text-textSecondary hover:text-textPrimary border border-borderline'
              }`}
            >
              {type === 'ALL' ? 'All Types' : type.charAt(0) + type.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid / List */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const isCurrent = currentProject?.id === project.id;
            return (
              <div
                key={project.id}
                className={`bg-panel border rounded-lg p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                  isCurrent ? 'border-accent ring-1 ring-accent/30' : 'border-borderline'
                }`}
              >
                <div>
                  {/* Top Bar: Title & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-bold text-base text-textPrimary leading-snug">
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-textSecondary mt-1">
                        <Building className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span>{project.building_type}</span>
                        <span>•</span>
                        <span>{project.floors} {project.floors === 1 ? 'Floor' : 'Floors'}</span>
                      </div>
                    </div>
                    {getStatusBadge(project.status)}
                  </div>

                  {/* Metrics & Parameters */}
                  <div className="grid grid-cols-2 gap-2 bg-canvas/50 p-3 rounded border border-borderline/50 text-xs my-4">
                    <div>
                      <span className="text-textSecondary block text-[10px] uppercase font-semibold">
                        Built-Up Area
                      </span>
                      <span className="font-bold text-textPrimary mono-num">
                        {project.approx_builtup_area
                          ? `${project.approx_builtup_area} ${project.unit_system === 'METRIC' ? 'm²' : 'sq.ft'}`
                          : 'Not Stated'}
                      </span>
                    </div>

                    <div>
                      <span className="text-textSecondary block text-[10px] uppercase font-semibold">
                        Unit System
                      </span>
                      <span className="font-semibold text-textPrimary">
                        {project.unit_system || 'METRIC'}
                      </span>
                    </div>

                    <div>
                      <span className="text-textSecondary block text-[10px] uppercase font-semibold">
                        Created
                      </span>
                      <span className="text-textSecondary mono-num">
                        {format(new Date(project.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>

                    <div>
                      <span className="text-textSecondary block text-[10px] uppercase font-semibold">
                        Drawing Scale
                      </span>
                      <span className="text-textPrimary mono-num">
                        {project.metadata?.drawing_scale || '1:100'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="pt-4 border-t border-borderline flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      onViewBlueprint(project);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-canvas border border-borderline text-xs font-semibold text-textPrimary hover:bg-panel hover:border-accent hover:text-accent transition-colors shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Blueprint</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        onUploadBlueprint(project);
                      }}
                      className="p-1.5 rounded bg-canvas border border-borderline text-textSecondary hover:text-textPrimary hover:bg-panel transition-colors"
                      title="Upload Blueprint"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (onOpenDashboard) {
                          onOpenDashboard(project);
                        } else {
                          onSelectProject(project);
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
                    >
                      <span>Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-panel border border-borderline rounded-lg p-12 text-center shadow-sm">
          <FolderKanban className="w-12 h-12 text-textSecondary mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-bold text-textPrimary">No Projects Found</h3>
          <p className="text-sm text-textSecondary mt-2 mb-6">
            {searchTerm || filterType !== 'ALL'
              ? 'No projects match your current search filters.'
              : 'Create your first construction project to begin blueprint analysis.'}
          </p>
          <button
            onClick={onOpenNewProjectModal}
            className="px-6 py-2.5 bg-accent text-white rounded font-semibold text-sm hover:bg-accent-hover transition-colors shadow-sm inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create New Project
          </button>
        </div>
      )}
    </div>
  );
};
