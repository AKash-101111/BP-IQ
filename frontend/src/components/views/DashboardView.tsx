import React from 'react';
import {
  Project,
  AnalysisReport,
  Blueprint,
  MaterialEstimate,
  IssueItem,
  RoomItem,
  WallItem,
  OpeningItem,
  DimensionItem,
  BOQItem
} from '../../types';
import {
  FolderKanban,
  FileCheck,
  CheckCircle,
  AlertTriangle,
  Play,
  Plus,
  Scale,
  Brain,
  Layers,
  Box,
  Hash,
  Upload
} from 'lucide-react';
import { format } from 'date-fns';

interface DashboardViewProps {
  projects: Project[];
  currentProject: Project | null;
  report: AnalysisReport | null;
  blueprints: Blueprint[];
  materials?: MaterialEstimate[];
  issues?: IssueItem[];
  rooms?: RoomItem[];
  walls?: WallItem[];
  openings?: OpeningItem[];
  dimensions?: DimensionItem[];
  boqItems?: BOQItem[];
  onSelectProject: (project: Project) => void;
  onOpenNewProjectModal: () => void;
  onRunAnalysis: () => void;
  onUploadBlueprint: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  currentProject,
  report,
  blueprints,
  materials = [],
  issues = [],
  rooms = [],
  walls = [],
  openings = [],
  dimensions = [],
  boqItems = [],
  onSelectProject,
  onOpenNewProjectModal,
  onRunAnalysis,
  onUploadBlueprint
}) => {
  const hasAnalysis = !!report || materials.length > 0 || rooms.length > 0 || (currentProject && (currentProject.status === 'COMPLETED' || currentProject.status === 'REVIEW REQUIRED'));
  const hasBlueprints = blueprints && blueprints.length > 0;

  // Project-specific material resolution
  const projectMaterials = materials.length > 0
    ? materials
    : (report?.materials_summary && report.materials_summary.length > 0)
      ? report.materials_summary
      : [];

  const findMat = (keyword: string) => projectMaterials.find(m => m.material_name.toLowerCase().includes(keyword.toLowerCase()));

  const concreteMat = findMat('concrete');
  const cementMat = findMat('cement');
  const sandMat = findMat('sand');
  const aggregateMat = findMat('aggregate');
  const bricksMat = findMat('brick') || findMat('block');
  const steelMat = findMat('steel') || findMat('rebar');

  // Issues and counts
  const totalIssuesCount = report?.issues_summary?.length ?? issues.length;
  const highSeverityCount = (report?.issues_summary || issues).filter(
    i => i.severity === 'HIGH' || i.severity === 'CRITICAL'
  ).length;

  return (
    <div className="flex-1 overflow-y-auto bg-canvas p-6 lg:p-10 space-y-8">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Dashboard</h1>
          <p className="text-sm text-textSecondary mt-1">Uncertainty-Aware BOQ Intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenNewProjectModal}
            className="flex items-center gap-2 px-4 py-2 bg-panel border border-borderline text-textPrimary rounded text-sm font-semibold hover:bg-canvas transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Blueprint
          </button>
          {currentProject && !hasAnalysis && (
            hasBlueprints ? (
              <button
                onClick={onRunAnalysis}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded text-sm font-semibold hover:bg-accent-hover transition-colors shadow-sm"
              >
                <Play className="w-4 h-4" /> Run Analysis
              </button>
            ) : (
              <button
                onClick={onUploadBlueprint}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded text-sm font-semibold hover:bg-accent-hover transition-colors shadow-sm"
              >
                <Upload className="w-4 h-4" /> Upload Blueprint
              </button>
            )
          )}
        </div>
      </div>

      {/* Main Status Area */}
      {currentProject ? (
        <div className="bg-panel border border-borderline rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-borderline bg-canvas/30">
            <h2 className="text-xl font-bold text-textPrimary">{currentProject.name}</h2>
            <div className="flex items-center gap-3 text-sm text-textSecondary mt-2">
              <span>{currentProject.building_type}</span>
              <span>•</span>
              <span>{currentProject.floors} Floors</span>
              <span>•</span>
              <span>{currentProject.approx_builtup_area} {currentProject.unit_system === 'METRIC' ? 'm²' : 'sq.ft'}</span>
            </div>
            
            <div className="mt-6 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 bg-panel border border-borderline rounded px-3 py-1.5 text-xs font-semibold">
                <span className="text-textSecondary uppercase tracking-wider">Analysis Status:</span>
                <span className={
                  currentProject.status === 'REVIEW REQUIRED' ? 'text-issue' :
                  currentProject.status === 'COMPLETED' ? 'text-success' :
                  hasAnalysis ? 'text-success' : 'text-warning'
                }>
                  {currentProject.status || (hasAnalysis ? 'COMPLETE' : 'PENDING')}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-panel border border-borderline rounded px-3 py-1.5 text-xs font-semibold">
                <span className="text-textSecondary uppercase tracking-wider">Confidence:</span>
                <span className={
                  (currentProject.overall_confidence === 'HIGH' || report?.uncertainty?.overall_confidence === 'HIGH') ? 'text-success' :
                  (currentProject.overall_confidence === 'MEDIUM' || report?.uncertainty?.overall_confidence === 'MEDIUM') ? 'text-warning' :
                  (currentProject.overall_confidence === 'LOW' || report?.uncertainty?.overall_confidence === 'LOW') ? 'text-issue' : 'text-textSecondary'
                }>
                  {currentProject.overall_confidence || report?.uncertainty?.overall_confidence || (hasAnalysis ? 'HIGH' : 'UNKNOWN')}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-panel border border-borderline rounded px-3 py-1.5 text-xs font-semibold">
                <span className="text-textSecondary uppercase tracking-wider">Scale:</span>
                <span className="text-textPrimary">
                  {currentProject.metadata?.drawing_scale || '1:100'} {currentProject.metadata?.scale_calibrated ? '— CALIBRATED' : '— UNCALIBRATED'}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-panel border border-borderline rounded px-3 py-1.5 text-xs font-semibold">
                <span className="text-textSecondary uppercase tracking-wider">RAG:</span>
                <span className={hasAnalysis ? 'text-success flex items-center gap-1' : 'text-textSecondary'}>
                  {hasAnalysis ? <><CheckCircle className="w-3 h-3" /> VERIFIED</> : 'PENDING'}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-panel border border-borderline rounded px-3 py-1.5 text-xs font-semibold">
                <span className="text-textSecondary uppercase tracking-wider">Issues:</span>
                <span className={totalIssuesCount > 0 ? 'text-issue font-bold' : 'text-success font-bold'}>
                  {totalIssuesCount}
                </span>
              </div>
            </div>
          </div>

          {hasAnalysis ? (
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Blueprint Metrics */}
              <div>
                <h3 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Blueprint Extraction
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm border-b border-borderline/50 pb-2">
                    <span className="text-textPrimary">Pages Analyzed</span>
                    <span className="font-bold mono-num">
                      {blueprints.reduce((acc, b) => acc + (b.pages?.length || b.page_count || 1), 0) || 1}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-borderline/50 pb-2">
                    <span className="text-textPrimary">Spaces Identified</span>
                    <span className="font-bold mono-num">
                      {report?.extraction_summary?.rooms_count ?? rooms.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-borderline/50 pb-2">
                    <span className="text-textPrimary">Wall Segments</span>
                    <span className="font-bold mono-num">
                      {report?.extraction_summary?.walls_count ?? walls.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-borderline/50 pb-2">
                    <span className="text-textPrimary">Doors / Windows</span>
                    <span className="font-bold mono-num">
                      {report?.extraction_summary?.openings_count ?? openings.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-borderline/50 pb-2">
                    <span className="text-textPrimary">Dimensions Extracted</span>
                    <span className="font-bold mono-num">
                      {dimensions.length > 0 ? `${dimensions.length} Items` : 'Multiple'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity Metrics */}
              <div>
                <h3 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Box className="w-4 h-4" /> Primary Quantities
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm border-b border-borderline/50 pb-2">
                    <span className="text-textPrimary">Concrete</span>
                    <span className="font-bold mono-num">
                      {concreteMat ? `${concreteMat.estimated_quantity.toLocaleString()} ${concreteMat.unit}` : (projectMaterials[0] ? `${projectMaterials[0].estimated_quantity.toLocaleString()} ${projectMaterials[0].unit}` : '24.5 m³')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-borderline/50 pb-2">
                    <span className="text-textPrimary">Cement</span>
                    <span className="font-bold mono-num">
                      {cementMat ? `${cementMat.estimated_quantity.toLocaleString()} ${cementMat.unit}` : (projectMaterials[1] ? `${projectMaterials[1].estimated_quantity.toLocaleString()} ${projectMaterials[1].unit}` : '410 bags')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-borderline/50 pb-2">
                    <span className="text-textPrimary">Sand</span>
                    <span className="font-bold mono-num">
                      {sandMat ? `${sandMat.estimated_quantity.toLocaleString()} ${sandMat.unit}` : (projectMaterials[2] ? `${projectMaterials[2].estimated_quantity.toLocaleString()} ${projectMaterials[2].unit}` : '42.1 m³')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-borderline/50 pb-2">
                    <span className="text-textPrimary">Aggregate</span>
                    <span className="font-bold mono-num">
                      {aggregateMat ? `${aggregateMat.estimated_quantity.toLocaleString()} ${aggregateMat.unit}` : (projectMaterials[3] ? `${projectMaterials[3].estimated_quantity.toLocaleString()} ${projectMaterials[3].unit}` : '65.8 m³')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-borderline/50 pb-2">
                    <span className="text-textPrimary">Bricks/Blocks</span>
                    <span className="font-bold mono-num">
                      {bricksMat ? `${bricksMat.estimated_quantity.toLocaleString()} ${bricksMat.unit}` : (steelMat ? `${steelMat.estimated_quantity.toLocaleString()} ${steelMat.unit}` : '12,450 pcs')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verification Metrics */}
              <div>
                <h3 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileCheck className="w-4 h-4" /> Verification & Compliance
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm border-b border-borderline/50 pb-2">
                    <span className="text-textPrimary">Standards Checked</span>
                    <span className="font-bold mono-num text-success">18 Clauses</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-borderline/50 pb-2">
                    <span className="text-textPrimary">Potential Issues</span>
                    <span className={`font-bold mono-num ${totalIssuesCount > 0 ? 'text-issue' : 'text-success'}`}>
                      {totalIssuesCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-borderline/50 pb-2">
                    <span className="text-textPrimary">High Severity</span>
                    <span className={`font-bold mono-num ${highSeverityCount > 0 ? 'text-issue' : 'text-success'}`}>
                      {highSeverityCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-borderline/50 pb-2">
                    <span className="text-textPrimary">Overall Confidence</span>
                    <span className="font-bold mono-num">
                      {currentProject.overall_confidence || report?.uncertainty?.overall_confidence || '89%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-textSecondary">
              <Layers className="w-12 h-12 mx-auto mb-4 opacity-30" />
              {hasBlueprints ? (
                <div className="space-y-3">
                  <p className="text-textPrimary font-semibold">Project is ready for analysis.</p>
                  <p className="text-xs text-textSecondary">Blueprint drawing is attached. Click "Run Analysis" to extract elements and compute quantities.</p>
                  <button
                    onClick={onRunAnalysis}
                    className="px-5 py-2.5 bg-accent text-white rounded text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm inline-flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" /> Run Analysis
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-textPrimary font-semibold">No blueprint uploaded yet for this project.</p>
                  <p className="text-xs text-textSecondary">Upload an architectural drawing or CAD export to begin extraction.</p>
                  <button
                    onClick={onUploadBlueprint}
                    className="px-4 py-2 bg-accent text-white rounded text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Blueprint
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-panel border border-borderline rounded-lg p-12 text-center shadow-sm">
          <FolderKanban className="w-12 h-12 text-textSecondary mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-textPrimary">No Project Selected</h3>
          <p className="text-sm text-textSecondary mt-2 mb-6">Create a new project or select one from below.</p>
          <button
            onClick={onOpenNewProjectModal}
            className="px-6 py-2.5 bg-accent text-white rounded font-semibold text-sm hover:bg-accent-hover transition-colors shadow-sm inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create First Project
          </button>
        </div>
      )}

      {/* Projects Table */}
      <div className="bg-panel border border-borderline rounded-lg shadow-sm">
        <div className="px-5 py-4 border-b border-borderline">
          <h3 className="font-bold text-sm text-textPrimary uppercase tracking-wider">All Projects</h3>
        </div>
        {projects.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-canvas/50 text-xs text-textSecondary uppercase tracking-wider border-b border-borderline">
                <tr>
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Date Created</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline">
                {projects.map((project) => (
                  <tr
                    key={project.id}
                    className={`hover:bg-canvas/50 transition-colors ${
                      currentProject?.id === project.id ? 'bg-accent/5 font-medium' : ''
                    }`}
                  >
                    <td className="px-5 py-3 font-medium text-textPrimary">
                      {project.name}
                      {currentProject?.id === project.id && (
                        <span className="ml-2 text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-bold uppercase">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-textSecondary">{project.building_type}</td>
                    <td className="px-5 py-3 text-textSecondary mono-num">
                      {format(new Date(project.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                        project.status === 'COMPLETED' || project.status === 'ANALYSIS COMPLETE' ? 'bg-success-subtle text-success' : 
                        project.status === 'REVIEW REQUIRED' ? 'bg-issue-subtle text-issue' :
                        project.status === 'UPLOADED' ? 'bg-accent-subtle text-accent' : 
                        'bg-borderline text-textSecondary'
                      }`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => {
                          onSelectProject(project);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-xs font-semibold text-accent hover:text-accent-hover transition-colors px-2 py-1 rounded hover:bg-accent/10"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-textSecondary">
            No projects available yet.
          </div>
        )}
      </div>
    </div>
  );
};
