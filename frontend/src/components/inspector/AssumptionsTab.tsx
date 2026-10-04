import React from 'react';
import { Project, UncertaintySummary } from '../../types';
import { Layers, HelpCircle } from 'lucide-react';

interface AssumptionsTabProps {
  project: Project;
  uncertainty?: UncertaintySummary;
}

export const AssumptionsTab: React.FC<AssumptionsTabProps> = ({ project, uncertainty }) => {
  const meta = project.metadata;

  return (
    <div className="space-y-4 p-4 text-xs">
      <div>
        <h4 className="font-semibold text-textPrimary uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-accent" />
          Active Engineering Parameters
        </h4>

        <div className="bg-canvas border border-borderline rounded divide-y divide-borderline text-[11px]">
          <div className="p-2 flex items-center justify-between">
            <span className="text-textSecondary">Floor-to-Floor Height</span>
            <span className="mono-num font-semibold text-textPrimary">{meta?.floor_height || 3.0} m</span>
          </div>
          <div className="p-2 flex items-center justify-between">
            <span className="text-textSecondary">External Wall Thickness</span>
            <span className="mono-num font-semibold text-textPrimary">{(meta?.wall_thickness || 0.23) * 1000} mm</span>
          </div>
          <div className="p-2 flex items-center justify-between">
            <span className="text-textSecondary">Internal Wall Thickness</span>
            <span className="mono-num font-semibold text-textPrimary">{(meta?.internal_wall_thickness || 0.115) * 1000} mm</span>
          </div>
          <div className="p-2 flex items-center justify-between">
            <span className="text-textSecondary">Slab Thickness</span>
            <span className="mono-num font-semibold text-textPrimary">{(meta?.slab_thickness || 0.15) * 1000} mm</span>
          </div>
          <div className="p-2 flex items-center justify-between">
            <span className="text-textSecondary">Concrete Mix Grade</span>
            <span className="mono-num font-semibold text-textPrimary">{meta?.concrete_grade || 'M20'}</span>
          </div>
          <div className="p-2 flex items-center justify-between">
            <span className="text-textSecondary">Mortar Proportions</span>
            <span className="mono-num font-semibold text-textPrimary">{meta?.mortar_ratio || '1:6'}</span>
          </div>
          <div className="p-2 flex items-center justify-between">
            <span className="text-textSecondary">Dry Mortar Factor</span>
            <span className="mono-num font-semibold text-textPrimary">1.33 (IS 2212)</span>
          </div>
          <div className="p-2 flex items-center justify-between">
            <span className="text-textSecondary">Dry Concrete Factor</span>
            <span className="mono-num font-semibold text-textPrimary">1.54 (IS 456)</span>
          </div>
        </div>
      </div>

      {/* Applied Assumptions List */}
      <div>
        <h4 className="font-semibold text-textPrimary uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-accent" />
          Assumptions Applied Due to Missing Data
        </h4>

        {uncertainty?.major_assumptions && uncertainty.major_assumptions.length > 0 ? (
          <ul className="space-y-1.5 text-[11px] text-textSecondary">
            {uncertainty.major_assumptions.map((assump, idx) => (
              <li key={idx} className="bg-canvas border border-borderline rounded p-2 text-textPrimary">
                • {assump}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-textSecondary text-[11px]">No default assumptions required.</p>
        )}
      </div>
    </div>
  );
};
