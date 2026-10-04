import React from 'react';
import { Project, UncertaintySummary } from '../../types';
import { AlertCircle, CheckCircle, ShieldAlert, FileText, Info } from 'lucide-react';

interface OverviewTabProps {
  project: Project;
  uncertainty?: UncertaintySummary;
  roomsCount: number;
  wallsCount: number;
  openingsCount: number;
  totalIssues: number;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  project,
  uncertainty,
  roomsCount,
  wallsCount,
  openingsCount,
  totalIssues,
}) => {
  return (
    <div className="space-y-4 p-4 text-xs">
      {/* Statutory Disclaimer Box */}
      <div className="bg-warning-subtle border border-warning-border rounded p-3 text-[11px] text-textPrimary leading-relaxed">
        <div className="flex items-center gap-1.5 font-bold text-warning mb-1">
          <ShieldAlert className="w-4 h-4" />
          <span>PRELIMINARY ENGINEERING DECISION-SUPPORT</span>
        </div>
        BlueprintIQ provides preliminary automated analysis and quantity estimates. It does not replace a licensed architect, structural engineer, quantity surveyor, or municipal authority approval.
      </div>

      {/* Building Extraction Metrics Grid */}
      <div>
        <h4 className="font-semibold text-textPrimary uppercase tracking-wider text-[10px] mb-2">
          Geometric Extraction Metrics
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-canvas border border-borderline rounded p-2.5">
            <span className="text-[10px] text-textSecondary uppercase">Spaces Identified</span>
            <div className="text-base font-bold mono-num text-textPrimary mt-0.5">{roomsCount}</div>
          </div>
          <div className="bg-canvas border border-borderline rounded p-2.5">
            <span className="text-[10px] text-textSecondary uppercase">Wall Segments</span>
            <div className="text-base font-bold mono-num text-textPrimary mt-0.5">{wallsCount}</div>
          </div>
          <div className="bg-canvas border border-borderline rounded p-2.5">
            <span className="text-[10px] text-textSecondary uppercase">Openings (Doors/Win)</span>
            <div className="text-base font-bold mono-num text-textPrimary mt-0.5">{openingsCount}</div>
          </div>
          <div className="bg-canvas border border-borderline rounded p-2.5">
            <span className="text-[10px] text-textSecondary uppercase">Audit Anomalies</span>
            <div className="text-base font-bold mono-num text-issue mt-0.5">{totalIssues}</div>
          </div>
        </div>
      </div>

      {/* Uncertainty & Missing Input Disclosures */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-textPrimary uppercase tracking-wider text-[10px]">
            Uncertainty Assessment
          </h4>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold mono-num ${
              uncertainty?.overall_confidence === 'HIGH'
                ? 'bg-success-subtle text-success border border-success-border'
                : uncertainty?.overall_confidence === 'MEDIUM'
                ? 'bg-warning-subtle text-warning border border-warning-border'
                : 'bg-issue-subtle text-issue border border-issue-border'
            }`}
          >
            {uncertainty?.overall_confidence || 'MEDIUM'} CONFIDENCE
          </span>
        </div>

        {uncertainty?.missing_inputs && uncertainty.missing_inputs.length > 0 ? (
          <div className="space-y-1.5">
            {uncertainty.missing_inputs.map((m, idx) => (
              <div key={idx} className="bg-canvas border border-borderline rounded p-2 text-[11px]">
                <div className="flex items-center justify-between font-semibold text-textPrimary">
                  <span>{m.field}</span>
                  <span className="text-issue font-mono text-[10px]">{m.status}</span>
                </div>
                <p className="text-textSecondary mt-0.5 text-[10px]">{m.impact}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-textSecondary bg-canvas border border-borderline rounded p-2 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-success" />
            All required project metadata supplied.
          </div>
        )}
      </div>

      {/* Structural & Plan Limitations */}
      {uncertainty?.limitations && uncertainty.limitations.length > 0 && (
        <div>
          <h4 className="font-semibold text-textPrimary uppercase tracking-wider text-[10px] mb-1.5">
            Engineering Scope Limitations
          </h4>
          <ul className="space-y-1 text-[11px] text-textSecondary list-disc list-inside">
            {uncertainty.limitations.map((lim, i) => (
              <li key={i}>{lim}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
