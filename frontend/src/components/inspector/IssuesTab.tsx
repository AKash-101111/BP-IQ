import React, { useState } from 'react';
import { IssueItem } from '../../types';
import { AlertTriangle, AlertCircle, Info, ShieldCheck, MapPin, ExternalLink } from 'lucide-react';

interface IssuesTabProps {
  issues: IssueItem[];
  selectedIssueId: string | null;
  onSelectIssue: (issueId: string | null) => void;
}

export const IssuesTab: React.FC<IssuesTabProps> = ({
  issues,
  selectedIssueId,
  onSelectIssue,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filteredIssues = issues.filter((iss) => {
    if (filterSeverity === 'ALL') return true;
    if (filterSeverity === 'HIGH_CRITICAL') return iss.severity === 'HIGH' || iss.severity === 'CRITICAL';
    if (filterSeverity === 'MEDIUM') return iss.severity === 'MEDIUM';
    if (filterSeverity === 'LOW_INFO') return iss.severity === 'LOW' || iss.severity === 'INFO';
    return true;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold mono-num bg-issue-subtle text-issue border border-issue-border">
            {severity}
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold mono-num bg-warning-subtle text-warning border border-warning-border">
            MEDIUM
          </span>
        );
      case 'LOW':
      case 'INFO':
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold mono-num bg-canvas text-textSecondary border border-borderline">
            {severity}
          </span>
        );
    }
  };

  return (
    <div className="space-y-3 p-4 text-xs">
      {/* Severity Filter Pills */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterSeverity('ALL')}
          className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
            filterSeverity === 'ALL'
              ? 'bg-accent text-white'
              : 'bg-canvas text-textSecondary hover:bg-borderline'
          }`}
        >
          All ({issues.length})
        </button>
        <button
          onClick={() => setFilterSeverity('HIGH_CRITICAL')}
          className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
            filterSeverity === 'HIGH_CRITICAL'
              ? 'bg-issue text-white'
              : 'bg-canvas text-textSecondary hover:bg-borderline'
          }`}
        >
          High/Crit ({issues.filter((i) => i.severity === 'HIGH' || i.severity === 'CRITICAL').length})
        </button>
        <button
          onClick={() => setFilterSeverity('MEDIUM')}
          className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
            filterSeverity === 'MEDIUM'
              ? 'bg-warning text-white'
              : 'bg-canvas text-textSecondary hover:bg-borderline'
          }`}
        >
          Medium ({issues.filter((i) => i.severity === 'MEDIUM').length})
        </button>
      </div>

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <div className="p-6 text-center bg-canvas rounded border border-borderline">
          <ShieldCheck className="w-8 h-8 text-success mx-auto mb-2 opacity-80" />
          <h5 className="font-semibold text-textPrimary text-xs">No Issues In Selected Filter</h5>
          <p className="text-[11px] text-textSecondary mt-0.5">
            Based on the available blueprint information and referenced rules. Professional verification is still recommended.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredIssues.map((iss, index) => {
            const isSelected = selectedIssueId === iss.id;
            return (
              <div
                key={iss.id}
                onClick={() => onSelectIssue(isSelected ? null : iss.id)}
                className={`p-3 rounded border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-accent-subtle/50 border-accent shadow-sm ring-1 ring-accent/30'
                    : 'bg-panel border-borderline hover:border-accent/40'
                }`}
              >
                {/* Header: Code, Severity, Page */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="mono-num font-bold text-accent text-[11px]">
                      {iss.issue_code}
                    </span>
                    {getSeverityBadge(iss.severity)}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-textSecondary mono-num">
                    <MapPin className="w-3 h-3" />
                    <span>Page {iss.page_number}</span>
                  </div>
                </div>

                {/* Title */}
                <h5 className="font-bold text-textPrimary text-[12px] leading-tight">
                  {iss.title}
                </h5>

                {/* Evidence & Numbers */}
                <div className="mt-2 p-2 bg-canvas/70 rounded border border-borderline/60 text-[11px] space-y-1">
                  <p className="text-textSecondary leading-snug">{iss.evidence}</p>

                  {(iss.detected_value || iss.expected_value) && (
                    <div className="flex items-center gap-3 pt-1 text-[10px] border-t border-borderline/40 mono-num">
                      {iss.detected_value && (
                        <span>
                          <strong>Detected:</strong> {iss.detected_value}
                        </span>
                      )}
                      {iss.expected_value && (
                        <span>
                          <strong>Expected:</strong> {iss.expected_value}
                        </span>
                      )}
                      {iss.difference_pct && (
                        <span className="text-issue font-bold">
                          Δ {iss.difference_pct}%
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Recommendation */}
                <div className="mt-2 text-[11px] text-textPrimary">
                  <span className="font-semibold text-textSecondary uppercase text-[9px] block">
                    Recommendation:
                  </span>
                  <p className="mt-0.5 leading-snug">{iss.recommendation}</p>
                </div>

                {/* RAG Reference Citation */}
                {iss.rag_reference && (
                  <div className="mt-2 pt-1.5 border-t border-borderline/60 flex items-center justify-between text-[10px] text-accent">
                    <span className="truncate max-w-[220px]">
                      Ref: {iss.rag_reference}
                    </span>
                    <span className="font-semibold text-[9px] uppercase tracking-wide">
                      {isSelected ? 'Focused on canvas' : 'Click to locate'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
