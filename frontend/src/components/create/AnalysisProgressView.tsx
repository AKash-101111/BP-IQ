import React, { useEffect, useState } from 'react';
import { Project } from '../../types';
import { api } from '../../api';
import { Cpu, Check } from 'lucide-react';

interface AnalysisProgressViewProps {
  project: Project;
  onComplete: () => void;
  onUploadBlueprint?: () => void;
  onBack?: () => void;
}

export const AnalysisProgressView: React.FC<AnalysisProgressViewProps> = ({
  project,
  onComplete,
  onUploadBlueprint,
  onBack,
}) => {
  const [analysisStage, setAnalysisStage] = useState('PREPROCESSING');
  const [analysisPercent, setAnalysisPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    const runPipeline = async () => {
      const stages = [
        { name: 'FILE PREPROCESSING', pct: 10 },
        { name: 'OCR / DRAWING EXTRACTION', pct: 25 },
        { name: 'GEOMETRIC EXTRACTION', pct: 40 },
        { name: 'DIMENSION & SCALE CALIBRATION', pct: 50 },
        { name: 'SPACE / WALL / OPENING DETECTION', pct: 60 },
        { name: 'DETERMINISTIC QUANTITY ENGINE', pct: 70 },
        { name: 'RAG KNOWLEDGE VERIFICATION', pct: 75 },
        { name: 'GEMMA 2B REASONING', pct: 85 },
        { name: 'ISSUE / ANOMALY DETECTION', pct: 90 },
        { name: 'UNCERTAINTY ASSESSMENT', pct: 95 },
        { name: 'VISUAL ISSUE LOCALIZATION', pct: 98 },
        { name: 'FINAL RESULT', pct: 100 },
      ];

      try {
        const analysisPromise = api.runAnalysis(project.id);
        
        for (const st of stages) {
          if (!isMounted) break;
          setAnalysisStage(st.name);
          setAnalysisPercent(st.pct);
          await new Promise(r => setTimeout(r, 600)); 
        }
        
        await analysisPromise;
        
        if (isMounted) {
          onComplete();
        }
      } catch (e: any) {
        if (isMounted) {
          setErrorMsg(e.message || 'Analysis error');
        }
      }
    };

    runPipeline();
    return () => { isMounted = false; };
  }, [project.id, onComplete]);

  return (
    <div className="flex-1 overflow-y-auto bg-canvas p-6 lg:p-10 flex items-center justify-center">
      <div className="w-full max-w-lg bg-panel border border-borderline rounded-lg shadow-sm p-10 text-center">
        {errorMsg ? (
          <div className="space-y-6">
            <div className="p-4 bg-issue-subtle border border-issue-border rounded text-issue font-medium text-sm">
              {errorMsg}
            </div>
            <div className="flex justify-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-panel border border-borderline text-textPrimary rounded text-xs font-semibold hover:bg-canvas transition-colors shadow-sm"
                >
                  Back to Dashboard
                </button>
              )}
              {onUploadBlueprint && (
                <button
                  onClick={onUploadBlueprint}
                  className="px-4 py-2 bg-accent text-white rounded text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
                >
                  Upload Blueprint
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <Cpu className="w-16 h-16 text-accent mx-auto animate-pulse" />
            <div>
              <h2 className="font-bold text-xl text-textPrimary">Analyzing Blueprint</h2>
              <p className="text-sm font-semibold text-textSecondary mt-2 tracking-wider mono-num">{analysisStage}</p>
            </div>

            <div className="max-w-md mx-auto mt-8">
              <div className="w-full bg-borderline h-3 rounded-full overflow-hidden">
                <div
                  className="bg-accent h-full transition-all duration-300 ease-out"
                  style={{ width: `${analysisPercent}%` }}
                />
              </div>
              <span className="font-bold text-xs text-textSecondary mt-3 block mono-num">
                {analysisPercent}%
              </span>
            </div>
            <p className="text-xs text-textSecondary italic">
              Please wait while BlueprintIQ processes the drawing geometry and estimates quantities...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
