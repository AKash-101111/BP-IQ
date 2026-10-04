import React, { useState } from 'react';
import { Project } from '../../types';
import { api } from '../../api';
import { Upload, FileText, Check, AlertTriangle, ArrowLeft } from 'lucide-react';

interface BlueprintUploadPageProps {
  project: Project;
  onAnalyze: () => void;
  onBack: () => void;
}

export const BlueprintUploadPage: React.FC<BlueprintUploadPageProps> = ({ project, onAnalyze, onBack }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleLoadSample = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await api.loadSampleBlueprint(project.id);
      onAnalyze();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load sample blueprint.');
      setIsSubmitting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setErrorMsg('Please upload a blueprint file or click "Load Sample Blueprint".');
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      // Ensure drawing_scale exists or provide a default
      const scale = project.metadata?.drawing_scale || '1:100';
      await api.uploadBlueprint(project.id, selectedFile, scale, 'm');
      onAnalyze();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading blueprint');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-canvas p-6 lg:p-10 flex justify-center">
      <div className="w-full max-w-2xl">
        <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-textSecondary hover:text-textPrimary mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Project Details
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-textPrimary">Upload Construction Blueprint</h1>
          <p className="text-sm text-textSecondary mt-2">
            Upload the architectural drawing you want BlueprintIQ to analyze.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-issue-subtle border border-issue-border rounded flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-issue shrink-0 mt-0.5" />
            <p className="text-sm text-issue">{errorMsg}</p>
          </div>
        )}

        <div className="bg-panel border border-borderline rounded-lg p-8 shadow-sm">
          <div className="border-2 border-dashed border-borderline hover:border-accent rounded-lg p-10 text-center bg-canvas/30 transition-colors">
            <Upload className="w-10 h-10 text-accent mx-auto mb-4 opacity-80" />
            <h5 className="font-bold text-sm text-textPrimary">
              Drag and drop blueprint here
            </h5>
            <p className="text-xs text-textSecondary mt-1">
              Supports PDF, PNG, JPG, or scanned drawings (multi-page PDF supported).
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <label className="cursor-pointer px-6 py-2.5 rounded bg-accent text-white font-medium hover:bg-accent-hover transition-colors shadow-sm">
                Browse File
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <span className="text-textSecondary text-sm font-medium">or</span>

              <button
                type="button"
                onClick={handleLoadSample}
                className="px-6 py-2.5 rounded bg-panel border border-borderline hover:bg-canvas font-medium text-textPrimary transition-colors"
              >
                Load Sample Blueprint
              </button>
            </div>
          </div>

          {selectedFile && (
            <div className="mt-6 bg-canvas border border-borderline rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-accent shrink-0" />
                <div>
                  <span className="font-bold text-textPrimary text-sm block">{selectedFile.name}</span>
                  <div className="flex gap-3 text-xs text-textSecondary mono-num mt-1">
                    <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                    <span>{selectedFile.type || 'application/pdf'}</span>
                  </div>
                </div>
              </div>
              <span className="text-success text-xs font-bold flex items-center gap-1.5 bg-success-subtle px-3 py-1.5 rounded border border-success-border">
                <Check className="w-4 h-4" /> Ready
              </span>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-borderline flex justify-end">
            <button 
              onClick={handleAnalyze}
              disabled={!selectedFile || isSubmitting}
              className="px-8 py-3 bg-accent text-white rounded font-bold text-sm hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {isSubmitting ? 'Uploading...' : 'Analyze Blueprint'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
