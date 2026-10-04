import React from 'react';
import { AnalysisReport } from '../../types';
import { BookOpen, Cpu, ShieldCheck } from 'lucide-react';

interface EvidenceTabProps {
  report: AnalysisReport | null;
}

export const EvidenceTab: React.FC<EvidenceTabProps> = ({ report }) => {
  const gemma = report?.gemma_reasoning;

  return (
    <div className="space-y-4 p-4 text-xs">
      {/* Gemma 2B Local AI Reasoning Card */}
      <div className="bg-panel border border-borderline rounded p-3 shadow-workbench">
        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-borderline">
          <div className="w-5 h-5 rounded bg-accent/10 flex items-center justify-center text-accent">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <div>
            <h5 className="font-bold text-textPrimary text-[12px]">
              Gemma 2B Local AI Reasoning
            </h5>
            <span className="text-[10px] text-textSecondary mono-num">
              Ollama localhost:11434 • Structured Synthesis
            </span>
          </div>
        </div>

        {gemma?.executive_summary ? (
          <div className="space-y-2 text-[11px] text-textPrimary leading-relaxed">
            <p>{gemma.executive_summary}</p>

            {gemma.uncertainty_assessment && (
              <div className="p-2 bg-canvas rounded border border-borderline/60 text-[10px]">
                <strong className="text-textSecondary uppercase block mb-0.5">
                  Local AI Uncertainty Evaluation:
                </strong>
                {gemma.uncertainty_assessment}
              </div>
            )}
          </div>
        ) : (
          <p className="text-textSecondary text-[11px] italic">
            Run full analysis to generate Gemma 2B structured technical reasoning.
          </p>
        )}
      </div>

      {/* RAG Retrieved Construction Standards */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-3.5 h-3.5 text-accent" />
          <h4 className="font-semibold text-textPrimary uppercase tracking-wider text-[10px]">
            Verified Construction Standards & Clauses
          </h4>
        </div>

        <div className="space-y-2">
          <div className="bg-canvas border border-borderline rounded p-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-textPrimary">
              <span>NBC 2016 Part 3: Clause 4.2.1</span>
              <span className="mono-num text-[10px] text-accent">DIMENSIONS</span>
            </div>
            <p className="text-[11px] text-textSecondary mt-1 leading-snug">
              Minimum habitable room area is 9.5 m² (approx 102 sq.ft) with minimum width of 2.4 m (7 ft 10 in).
            </p>
          </div>

          <div className="bg-canvas border border-borderline rounded p-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-textPrimary">
              <span>NBC 4.8.1 / IBC Section 1011.5.2</span>
              <span className="mono-num text-[10px] text-accent">STAIRS & EGRESS</span>
            </div>
            <p className="text-[11px] text-textSecondary mt-1 leading-snug">
              Residential stairways require minimum clear width of 1.0 m (1000 mm). Maximum riser 190 mm, minimum tread 250 mm. Minimum headroom clearance is 2.2 m (7 ft 3 in).
            </p>
          </div>

          <div className="bg-canvas border border-borderline rounded p-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-textPrimary">
              <span>IS 456:2000 Table 9 & Clause 26.5</span>
              <span className="mono-num text-[10px] text-accent">CONCRETE & STEEL</span>
            </div>
            <p className="text-[11px] text-textSecondary mt-1 leading-snug">
              Nominal mix M20 (1:1.5:3) requires dry volume factor 1.54. Steel estimation thumb rules: Slab 0.8%, Beams/Columns 1.5% by volume.
            </p>
          </div>

          <div className="bg-canvas border border-borderline rounded p-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-textPrimary">
              <span>IS 1200 Part 3 & IS 2212</span>
              <span className="mono-num text-[10px] text-accent">MASONRY & DEDUCTIONS</span>
            </div>
            <p className="text-[11px] text-textSecondary mt-1 leading-snug">
              500 modular bricks per m³ of finished brickwork with 1:6 mortar. Deductions required for all openings exceeding 0.1 sq.m.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
