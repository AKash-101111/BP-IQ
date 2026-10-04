import React, { useState } from 'react';
import {
  Project,
  AnalysisReport,
  BOQItem,
  MaterialEstimate,
  IssueItem,
  RoomItem,
  WallItem,
  OpeningItem,
  DimensionItem,
} from '../../types';
import { OverviewTab } from './OverviewTab';
import { MeasurementsTab } from './MeasurementsTab';
import { BOQTab } from './BOQTab';
import { IssuesTab } from './IssuesTab';
import { EvidenceTab } from './EvidenceTab';
import { AssumptionsTab } from './AssumptionsTab';

interface AnalysisInspectorProps {
  project: Project;
  report: AnalysisReport | null;
  boqItems: BOQItem[];
  materials: MaterialEstimate[];
  issues: IssueItem[];
  rooms: RoomItem[];
  walls: WallItem[];
  openings: OpeningItem[];
  dimensions: DimensionItem[];
  selectedIssueId: string | null;
  onSelectIssue: (issueId: string | null) => void;
}

export const AnalysisInspector: React.FC<AnalysisInspectorProps> = ({
  project,
  report,
  boqItems,
  materials,
  issues,
  rooms,
  walls,
  openings,
  dimensions,
  selectedIssueId,
  onSelectIssue,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'measurements' | 'boq' | 'issues' | 'evidence' | 'assumptions'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'measurements', label: `Meas. (${rooms.length})` },
    { id: 'boq', label: `BOQ (${materials.length})` },
    { id: 'issues', label: `Issues (${issues.length})`, alert: issues.some((i) => i.severity === 'HIGH' || i.severity === 'CRITICAL') },
    { id: 'evidence', label: 'Evidence & RAG' },
    { id: 'assumptions', label: 'Assumptions' },
  ];

  return (
    <aside className="w-96 bg-panel border-l border-borderline flex flex-col h-full select-none">
      {/* Inspector Header / Tabs */}
      <div className="border-b border-borderline bg-canvas/40 px-2 pt-2">
        <div className="flex items-center gap-1 overflow-x-auto pb-1.5 scrollbar-none">
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-2.5 py-1.5 rounded text-[11px] font-medium whitespace-nowrap transition-colors relative ${
                  isActive
                    ? 'bg-panel text-accent font-semibold shadow-sm border border-borderline'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-canvas'
                }`}
              >
                <span>{t.label}</span>
                {t.alert && (
                  <span className="w-1.5 h-1.5 rounded-full bg-issue absolute top-1 right-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inspector Tab Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <OverviewTab
            project={project}
            uncertainty={report?.uncertainty}
            roomsCount={rooms.length}
            wallsCount={walls.length}
            openingsCount={openings.length}
            totalIssues={issues.length}
          />
        )}

        {activeTab === 'measurements' && (
          <MeasurementsTab
            rooms={rooms}
            walls={walls}
            openings={openings}
            dimensions={dimensions}
          />
        )}

        {activeTab === 'boq' && (
          <BOQTab boqItems={boqItems} materials={materials} />
        )}

        {activeTab === 'issues' && (
          <IssuesTab
            issues={issues}
            selectedIssueId={selectedIssueId}
            onSelectIssue={onSelectIssue}
          />
        )}

        {activeTab === 'evidence' && <EvidenceTab report={report} />}

        {activeTab === 'assumptions' && (
          <AssumptionsTab project={project} uncertainty={report?.uncertainty} />
        )}
      </div>
    </aside>
  );
};
