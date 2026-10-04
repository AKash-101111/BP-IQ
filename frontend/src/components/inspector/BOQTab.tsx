import React, { useState } from 'react';
import { BOQItem, MaterialEstimate } from '../../types';
import { Calculator, Info, ChevronDown, ChevronUp, Layers } from 'lucide-react';

interface BOQTabProps {
  boqItems: BOQItem[];
  materials: MaterialEstimate[];
}

export const BOQTab: React.FC<BOQTabProps> = ({ boqItems, materials }) => {
  const [activeSubTab, setActiveSubTab] = useState<'materials' | 'civil'>('materials');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  const getConfidenceBadge = (conf: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (conf) {
      case 'HIGH':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold mono-num bg-success-subtle text-success border border-success-border">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold mono-num bg-warning-subtle text-warning border border-warning-border">
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold mono-num bg-issue-subtle text-issue border border-issue-border">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 p-4 text-xs">
      {/* Sub-tab switcher */}
      <div className="flex bg-canvas p-0.5 rounded border border-borderline">
        <button
          onClick={() => setActiveSubTab('materials')}
          className={`flex-1 py-1.5 text-center font-medium rounded transition-colors ${
            activeSubTab === 'materials'
              ? 'bg-panel text-accent font-semibold shadow-sm'
              : 'text-textSecondary hover:text-textPrimary'
          }`}
        >
          Primary Materials ({materials.length})
        </button>
        <button
          onClick={() => setActiveSubTab('civil')}
          className={`flex-1 py-1.5 text-center font-medium rounded transition-colors ${
            activeSubTab === 'civil'
              ? 'bg-panel text-accent font-semibold shadow-sm'
              : 'text-textSecondary hover:text-textPrimary'
          }`}
        >
          Civil Works BOQ ({boqItems.length})
        </button>
      </div>

      {/* Materials View */}
      {activeSubTab === 'materials' && (
        <div className="space-y-2">
          {materials.map((mat) => {
            const isExpanded = expandedItemId === mat.id;
            return (
              <div
                key={mat.id}
                className="bg-panel border border-borderline rounded p-2.5 transition-all hover:border-accent/40"
              >
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => toggleExpand(mat.id)}
                >
                  <div>
                    <h5 className="font-semibold text-textPrimary text-[12px]">{mat.material_name}</h5>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-base font-bold mono-num text-accent">
                        {mat.estimated_quantity.toLocaleString()} {mat.unit}
                      </span>
                      <span className="text-[11px] mono-num text-textSecondary">
                        ({mat.range_min.toLocaleString()} – {mat.range_max.toLocaleString()})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {getConfidenceBadge(mat.confidence)}
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-textSecondary" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-textSecondary" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-2.5 pt-2 border-t border-borderline/60 text-[11px] space-y-1.5 bg-canvas/50 -mx-2.5 -mb-2.5 p-2.5 rounded-b">
                    <div>
                      <span className="text-[10px] text-textSecondary uppercase font-semibold">
                        Calculation Basis:
                      </span>
                      <p className="text-textPrimary mt-0.5">{mat.calculation_basis}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-textSecondary uppercase font-semibold">
                        Reference Standard:
                      </span>
                      <p className="text-accent font-mono text-[10px] mt-0.5">{mat.formula_ref}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-textSecondary uppercase font-semibold">
                        Assumptions:
                      </span>
                      <p className="text-textSecondary mt-0.5 italic">{mat.assumptions}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Civil Works Items */}
      {activeSubTab === 'civil' && (
        <div className="space-y-2">
          {boqItems.map((item) => {
            const isExpanded = expandedItemId === item.id;
            return (
              <div
                key={item.id}
                className="bg-panel border border-borderline rounded p-2.5 transition-all hover:border-accent/40"
              >
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono px-1 py-0.2 bg-canvas border border-borderline rounded text-textSecondary">
                        {item.item_code}
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-textSecondary">
                        {item.category}
                      </span>
                    </div>
                    <h5 className="font-semibold text-textPrimary text-[11px] mt-1 leading-snug">
                      {item.item_name}
                    </h5>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold mono-num text-textPrimary">
                        {item.estimated_quantity.toFixed(2)} {item.unit}
                      </span>
                      <span className="text-[10px] mono-num text-textSecondary">
                        [{item.range_min.toFixed(1)} – {item.range_max.toFixed(1)}]
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {getConfidenceBadge(item.confidence)}
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-textSecondary" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-textSecondary" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-2.5 pt-2 border-t border-borderline/60 text-[11px] space-y-1.5 bg-canvas/50 -mx-2.5 -mb-2.5 p-2.5 rounded-b">
                    <div>
                      <span className="text-[10px] text-textSecondary uppercase font-semibold">
                        Measurement Derivation:
                      </span>
                      <p className="text-textPrimary mt-0.5">{item.calculation_basis}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-textSecondary uppercase font-semibold">
                        Assumptions:
                      </span>
                      <p className="text-textSecondary mt-0.5 italic">{item.assumptions}</p>
                    </div>
                    {item.uncertainty_reasons.length > 0 && (
                      <div className="p-1.5 bg-warning-subtle border border-warning-border rounded text-[10px] text-warning">
                        <strong>Uncertainty Factor:</strong> {item.uncertainty_reasons.join(', ')}
                      </div>
                    )}
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
