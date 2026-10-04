import React from 'react';
import { Project, AnalysisReport } from '../../types';
import { Download, FileText, CheckCircle2, AlertTriangle, ShieldCheck, Printer } from 'lucide-react';

interface ReportsViewProps {
  currentProject: Project | null;
  report: AnalysisReport | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ currentProject, report }) => {
  if (!currentProject) {
    return (
      <div className="flex-1 p-8 text-center">
        <FileText className="w-12 h-12 text-borderline mx-auto mb-2" />
        <h3 className="font-semibold text-textPrimary text-sm">No Active Project Selected</h3>
        <p className="text-xs text-textSecondary mt-1">
          Select or create a project to generate and export certified analysis reports.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-borderline pb-4">
        <div>
          <h2 className="text-xl font-bold text-textPrimary tracking-tight">Analysis & BOQ Reports</h2>
          <p className="text-xs text-textSecondary mt-0.5">
            Export official engineering summaries, verified Bill of Quantities, and drawing markups.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-borderline bg-panel hover:bg-canvas text-textPrimary text-xs font-medium"
          >
            <Printer className="w-3.5 h-3.5 text-textSecondary" />
            <span>Print View</span>
          </button>
          <a
            href={`/api/projects/${currentProject.id}/export-pdf`}
            download
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download Official PDF</span>
          </a>
        </div>
      </div>

      {/* Report Document Card */}
      <div className="max-w-4xl mx-auto bg-panel border border-borderline rounded-lg shadow-workbench p-8 space-y-6">
        {/* Banner */}
        <div className="border-b border-borderline pb-4 flex items-start justify-between">
          <div>
            <span className="mono-num text-[11px] font-bold text-accent tracking-wider uppercase block">
              BlueprintIQ Technical Memorandum
            </span>
            <h1 className="text-xl font-bold text-textPrimary mt-1">{currentProject.name}</h1>
            <p className="text-xs text-textSecondary">
              Building Type: {currentProject.building_type} • {currentProject.floors} Floors • Soil: {currentProject.soil_type}
            </p>
          </div>
          <div className="text-right">
            <span
              className={`inline-block px-3 py-1 rounded text-xs font-bold mono-num uppercase ${
                currentProject.status === 'ANALYSIS COMPLETE'
                  ? 'bg-success-subtle text-success border border-success-border'
                  : currentProject.status === 'REVIEW REQUIRED'
                  ? 'bg-issue-subtle text-issue border border-issue-border'
                  : 'bg-warning-subtle text-warning border border-warning-border'
              }`}
            >
              {currentProject.status}
            </span>
            <span className="text-[10px] text-textSecondary block mt-1 mono-num">
              {new Date().toISOString().split('T')[0]}
            </span>
          </div>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="bg-canvas border border-borderline rounded p-3 text-[11px] text-textSecondary leading-relaxed">
          <strong>STATUTORY ENGINEERING NOTICE:</strong> BlueprintIQ provides preliminary automated computer-vision
          analysis and quantity estimates. It does not replace a licensed architect, structural engineer, quantity
          surveyor, or municipal authority approval. All values must be field-verified before material procurement.
        </div>

        {/* Executive Summary */}
        {report?.summary_text && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1.5">
              1. Executive Summary & AI Synthesis
            </h3>
            <p className="text-xs text-textPrimary leading-relaxed bg-canvas/40 p-3 rounded border border-borderline/60">
              {report.summary_text}
            </p>
          </div>
        )}

        {/* BOQ Table Summary */}
        {report?.materials_summary && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">
              2. Consolidated Materials Estimation (With Uncertainty Bounds)
            </h3>
            <div className="border border-borderline rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-canvas text-textSecondary text-[10px] uppercase border-b border-borderline">
                    <th className="py-2 px-3">Material</th>
                    <th className="py-2 px-3 text-right">Estimated Qty</th>
                    <th className="py-2 px-3 text-right">Range</th>
                    <th className="py-2 px-3">Confidence</th>
                    <th className="py-2 px-3">Standard / Formula</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderline">
                  {report.materials_summary.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2 px-3 font-semibold text-textPrimary">{m.material_name}</td>
                      <td className="py-2 px-3 text-right mono-num font-bold text-accent">
                        {m.estimated_quantity.toLocaleString()} {m.unit}
                      </td>
                      <td className="py-2 px-3 text-right mono-num text-textSecondary text-[11px]">
                        {m.range_min.toLocaleString()} – {m.range_max.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 mono-num text-[11px] font-semibold">{m.confidence}</td>
                      <td className="py-2 px-3 text-[11px] text-textSecondary">{m.formula_ref}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Issues Summary */}
        {report?.issues_summary && report.issues_summary.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">
              3. Blueprint Anomaly & Compliance Audit Findings
            </h3>
            <div className="space-y-2">
              {report.issues_summary.map((iss) => (
                <div key={iss.id} className="p-3 bg-canvas/40 border border-borderline rounded text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-accent mono-num">{iss.issue_code}: {iss.title}</span>
                    <span className="mono-num text-[10px] font-bold text-issue">{iss.severity}</span>
                  </div>
                  <p className="text-textSecondary text-[11px]">{iss.evidence}</p>
                  <p className="text-textPrimary text-[11px]">
                    <strong>Recommendation:</strong> {iss.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
