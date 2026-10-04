import React from 'react';
import { Project, Blueprint } from '../../types';
import { Play, Download, Plus, Scale, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';

interface HeaderProps {
  currentProject: Project | null;
  projects: Project[];
  onSelectProject: (proj: Project) => void;
  onOpenNewProjectModal: () => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
  blueprints: Blueprint[];
}

export const Header: React.FC<HeaderProps> = ({
  currentProject,
  projects,
  onSelectProject,
  onOpenNewProjectModal,
  onRunAnalysis,
  isAnalyzing,
  blueprints,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ANALYSIS COMPLETE':
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-success-subtle text-success border border-success-border">
            <CheckCircle2 className="w-3.5 h-3.5" /> NO CONFLICTS / COMPLETE
          </span>
        );
      case 'REVIEW REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-issue-subtle text-issue border border-issue-border">
            <AlertCircle className="w-3.5 h-3.5" /> REVIEW REQUIRED
          </span>
        );
      case 'INSUFFICIENT INFORMATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-warning-subtle text-warning border border-warning-border">
            <HelpCircle className="w-3.5 h-3.5" /> INSUFFICIENT INFORMATION
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-canvas text-textSecondary border border-borderline">
            INITIALIZED
          </span>
        );
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'HIGH':
        return <span className="mono-num text-[11px] font-semibold text-success">CONFIDENCE: HIGH</span>;
      case 'MEDIUM':
        return <span className="mono-num text-[11px] font-semibold text-warning">CONFIDENCE: MEDIUM</span>;
      case 'LOW':
        return <span className="mono-num text-[11px] font-semibold text-issue">CONFIDENCE: LOW</span>;
      default:
        return <span className="mono-num text-[11px] text-textSecondary">CONFIDENCE: UNKNOWN</span>;
    }
  };

  return (
    <header className="h-14 bg-panel border-b border-borderline px-4 flex items-center justify-between select-none">
      {/* Left: Project Selector & Status */}
      <div className="flex items-center gap-3">
        <select
          value={currentProject?.id || ''}
          onChange={(e) => {
            const selected = projects.find((p) => p.id === e.target.value);
            if (selected) onSelectProject(selected);
          }}
          className="bg-canvas border border-borderline text-textPrimary font-semibold text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-accent"
        >
          {projects.length === 0 && <option value="">No projects available</option>}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.building_type} - {p.floors}F)
            </option>
          ))}
        </select>

        {currentProject && (
          <>
            {getStatusBadge(currentProject.status)}
            <div className="h-4 w-px bg-borderline" />
            {getConfidenceBadge(currentProject.overall_confidence)}
            <div className="h-4 w-px bg-borderline" />
            <div className="flex items-center gap-1 text-xs text-textSecondary mono-num">
              <Scale className="w-3.5 h-3.5" />
              <span>SCALE: {currentProject.metadata?.drawing_scale || '1:100'}</span>
              {currentProject.metadata?.scale_calibrated ? (
                <span className="text-[10px] text-success">(Calibrated)</span>
              ) : (
                <span className="text-[10px] text-warning">(Uncalibrated)</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenNewProjectModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-canvas hover:bg-borderline text-textPrimary border border-borderline transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Blueprint</span>
        </button>

        {currentProject && blueprints.length > 0 && (
          <button
            onClick={onRunAnalysis}
            disabled={isAnalyzing}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold text-white transition-all shadow-sm ${
              isAnalyzing
                ? 'bg-accent/70 cursor-not-allowed'
                : 'bg-accent hover:bg-accent-hover active:scale-[0.98]'
            }`}
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isAnalyzing ? 'animate-pulse' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing Blueprint...' : 'Run Analysis'}</span>
          </button>
        )}

        {currentProject && (
          <a
            href={`/api/projects/${currentProject.id}/export-pdf`}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-canvas hover:bg-borderline text-textPrimary border border-borderline transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-textSecondary" />
            <span>Export Report</span>
          </a>
        )}
      </div>
    </header>
  );
};
