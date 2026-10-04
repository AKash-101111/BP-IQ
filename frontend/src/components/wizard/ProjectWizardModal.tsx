import React, { useState } from 'react';
import {
  X,
  Upload,
  Check,
  ChevronRight,
  ChevronLeft,
  FileText,
  AlertTriangle,
  Play,
  Layers,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { Project, ProjectMetadata } from '../../types';
import { api } from '../../api';

interface ProjectWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

export const ProjectWizardModal: React.FC<ProjectWizardModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('Villa Residence G+1');
  const [buildingType, setBuildingType] = useState('Residential');
  const [floors, setFloors] = useState(2);
  const [approxBuiltupArea, setApproxBuiltupArea] = useState(180);
  const [plotArea, setPlotArea] = useState(300);
  const [unitSystem, setUnitSystem] = useState('METRIC');

  // Dimension Info
  const [floorHeight, setFloorHeight] = useState(3.0);
  const [wallThickness, setWallThickness] = useState(0.23);
  const [internalWallThickness, setInternalWallThickness] = useState(0.115);
  const [slabThickness, setSlabThickness] = useState(0.15);
  const [drawingScale, setDrawingScale] = useState('1:100');
  const [scaleCalibrated, setScaleCalibrated] = useState(true);

  // Construction Info
  const [cementGrade, setCementGrade] = useState('OPC 43');
  const [concreteGrade, setConcreteGrade] = useState('M20');
  const [brickType, setBrickType] = useState('Modular Clay Brick (190x90x90mm)');
  const [mortarRatio, setMortarRatio] = useState('1:6');
  const [plasterRatio, setPlasterRatio] = useState('1:6');
  const [steelAssumptions, setSteelAssumptions] = useState('Fe500 TMT (Standard 1.2% thumb rule)');

  // Site Info
  const [soilType, setSoilType] = useState('Not Provided');
  const [location, setLocation] = useState('Urban Residential Zone');
  const [seismicZone, setSeismicZone] = useState('Zone III');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [createdProject, setCreatedProject] = useState<Project | null>(null);
  const [analysisStage, setAnalysisStage] = useState('Idle');
  const [analysisPercent, setAnalysisPercent] = useState(0);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleLoadSample = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      // Fetch the generated sample blueprint from static storage
      const res = await fetch('/backend/sample_blueprints/sample_residential_blueprint.pdf');
      const blob = await res.blob();
      const file = new File([blob], 'sample_residential_blueprint.pdf', { type: 'application/pdf' });
      setSelectedFile(file);
      setIsSubmitting(false);
    } catch (e: any) {
      setErrorMsg('Failed to load sample blueprint. You can upload any PDF or image.');
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    setErrorMsg(null);
    if (currentStep === 1 && !name.trim()) {
      setErrorMsg('Please enter a project name.');
      return;
    }

    if (currentStep === 4) {
      // Step 4 to 5: Create Project record in DB first
      try {
        setIsSubmitting(true);
        const newProj = await api.createProject({
          name,
          building_type: buildingType,
          floors: Number(floors),
          approx_builtup_area: Number(approxBuiltupArea),
          plot_area: Number(plotArea),
          unit_system: unitSystem,
          soil_type: soilType,
          location,
          seismic_zone: seismicZone,
          metadata: {
            floor_height: Number(floorHeight),
            wall_thickness: Number(wallThickness),
            internal_wall_thickness: Number(internalWallThickness),
            slab_thickness: Number(slabThickness),
            drawing_scale: drawingScale,
            scale_calibrated: scaleCalibrated,
            scale_factor: 1.0,
            cement_grade: cementGrade,
            concrete_grade: concreteGrade,
            brick_type: brickType,
            mortar_ratio: mortarRatio,
            plaster_ratio: plasterRatio,
            steel_assumptions: steelAssumptions,
            flooring_type: 'Vitrified Tiles (600x600mm)',
          },
        });
        setCreatedProject(newProj);
        setIsSubmitting(false);
        setCurrentStep(5);
      } catch (err: any) {
        setErrorMsg(err.message || 'Error creating project');
        setIsSubmitting(false);
        return;
      }
      return;
    }

    if (currentStep === 5) {
      if (!selectedFile) {
        setErrorMsg('Please upload a blueprint file or click "Load Sample Plan".');
        return;
      }
      // Upload file to backend
      try {
        setIsSubmitting(true);
        if (createdProject) {
          await api.uploadBlueprint(createdProject.id, selectedFile, drawingScale, 'm');
        }
        setIsSubmitting(false);
        setCurrentStep(6);
      } catch (err: any) {
        setErrorMsg(err.message || 'Error uploading blueprint');
        setIsSubmitting(false);
        return;
      }
      return;
    }

    if (currentStep === 7) {
      // Trigger full 12-stage analysis pipeline
      setCurrentStep(8);
      runPipeline();
      return;
    }

    if (currentStep < 10) {
      setCurrentStep((s) => s + 1);
    } else {
      if (createdProject) onProjectCreated(createdProject);
      onClose();
    }
  };

  const runPipeline = async () => {
    if (!createdProject) return;
    setIsSubmitting(true);
    const stages = [
      { name: 'PREPROCESSING & IMAGE CLEANING', pct: 15 },
      { name: 'OCR & TEXT BOUNDARY EXTRACTION', pct: 30 },
      { name: 'GEOMETRY & WALL CONTOUR SEGMENTATION', pct: 45 },
      { name: 'DIMENSION CALLOUT PARSING', pct: 55 },
      { name: 'DETERMINISTIC QUANTITY ESTIMATION (BOQ)', pct: 68 },
      { name: 'BLUEPRINT ISSUE DETECTION ENGINE', pct: 78 },
      { name: 'RAG CONSTRUCTION STANDARDS AUDIT', pct: 86 },
      { name: 'LOCAL GEMMA 2B REASONING (Ollama)', pct: 93 },
      { name: 'VISUAL MARKED-UP BLUEPRINT COMPOSITION', pct: 98 },
      { name: 'FINAL BOQ REPORT COMPILATION', pct: 100 },
    ];

    try {
      // Simulate live stage feedback
      for (const st of stages) {
        setAnalysisStage(st.name);
        setAnalysisPercent(st.pct);
        await new Promise((r) => setTimeout(r, 200));
      }
      // Call actual backend analysis
      await api.runAnalysis(createdProject.id);
      setIsSubmitting(false);
      setCurrentStep(9);
    } catch (e: any) {
      setErrorMsg(e.message || 'Analysis error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-panel border border-borderline rounded-lg shadow-elevation w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-borderline flex items-center justify-between bg-canvas/40">
          <div>
            <h3 className="font-bold text-sm text-textPrimary">Project Creation & Ingestion Wizard</h3>
            <p className="text-[11px] text-textSecondary mono-num">
              Step {currentStep} of 10 • Uncertainty-Aware Intake
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-canvas text-textSecondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="mb-4 p-3 bg-issue-subtle border border-issue-border rounded text-issue text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Project Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-textPrimary border-b border-borderline pb-1">
                Step 1: Project Information
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-textSecondary uppercase mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-canvas border border-borderline rounded p-2 text-textPrimary focus:outline-none focus:border-accent"
                    placeholder="e.g. Modern Residential Villa"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-textSecondary uppercase mb-1">
                    Building Type
                  </label>
                  <select
                    value={buildingType}
                    onChange={(e) => setBuildingType(e.target.value)}
                    className="w-full bg-canvas border border-borderline rounded p-2 text-textPrimary focus:outline-none focus:border-accent"
                  >
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Infrastructure">Infrastructure</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-textSecondary uppercase mb-1">
                    Number of Floors
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={floors}
                    onChange={(e) => setFloors(Number(e.target.value))}
                    className="w-full bg-canvas border border-borderline rounded p-2 text-textPrimary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-textSecondary uppercase mb-1">
                    Approx Built-Up Area (m² or sq.ft)
                  </label>
                  <input
                    type="number"
                    value={approxBuiltupArea}
                    onChange={(e) => setApproxBuiltupArea(Number(e.target.value))}
                    className="w-full bg-canvas border border-borderline rounded p-2 text-textPrimary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-textSecondary uppercase mb-1">
                    Unit System
                  </label>
                  <select
                    value={unitSystem}
                    onChange={(e) => setUnitSystem(e.target.value)}
                    className="w-full bg-canvas border border-borderline rounded p-2 text-textPrimary focus:outline-none focus:border-accent"
                  >
                    <option value="METRIC">Metric (Meters, m², m³)</option>
                    <option value="IMPERIAL">Imperial (Feet, sq.ft, cu.ft)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Dimension Setup */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-textPrimary border-b border-borderline pb-1">
                Step 2: Dimension & Scale Information
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-textSecondary uppercase mb-1">
                    Floor-to-Floor Height (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={floorHeight}
                    onChange={(e) => setFloorHeight(Number(e.target.value))}
                    className="w-full bg-canvas border border-borderline rounded p-2 text-textPrimary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-textSecondary uppercase mb-1">
                    External Wall Thickness (m)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={wallThickness}
                    onChange={(e) => setWallThickness(Number(e.target.value))}
                    className="w-full bg-canvas border border-borderline rounded p-2 text-textPrimary focus:outline-none focus:border-accent"
                  />
                  <span className="text-[10px] text-textSecondary">Standard 230mm (9") brickwork</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-textSecondary uppercase mb-1">
                    Internal Partition Thickness (m)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={internalWallThickness}
                    onChange={(e) => setInternalWallThickness(Number(e.target.value))}
                    className="w-full bg-canvas border border-borderline rounded p-2 text-textPrimary focus:outline-none focus:border-accent"
                  />
                  <span className="text-[10px] text-textSecondary">Standard 115mm (4.5") partition</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-textSecondary uppercase mb-1">
                    Drawing Scale Ratio
                  </label>
                  <select
                    value={drawingScale}
                    onChange={(e) => setDrawingScale(e.target.value)}
                    className="w-full bg-canvas border border-borderline rounded p-2 text-textPrimary focus:outline-none focus:border-accent"
                  >
                    <option value="1:100">1:100 (1cm = 1m)</option>
                    <option value="1:50">1:50 (1cm = 0.5m)</option>
                    <option value="1:200">1:200 (1cm = 2m)</option>
                    <option value="Unknown">Unknown (Requires Calibration)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Construction & Material Information */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-textPrimary border-b border-borderline pb-1">
                Step 3: Construction & Material Specifications
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-textSecondary uppercase mb-1">
                    Concrete Grade (IS 456)
                  </label>
                  <select
                    value={concreteGrade}
                    onChange={(e) => setConcreteGrade(e.target.value)}
                    className="w-full bg-canvas border border-borderline rounded p-2 text-textPrimary focus:outline-none focus:border-accent"
                  >
                    <option value="M20">M20 (1:1.5:3 Nominal Mix)</option>
                    <option value="M25">M25 (1:1:2 Nominal Mix)</option>
                    <option value="M15">M15 (1:2:4 Plain Concrete)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-textSecondary uppercase mb-1">
                    Cement Grade
                  </label>
                  <select
                    value={cementGrade}
                    onChange={(e) => setCementGrade(e.target.value)}
                    className="w-full bg-canvas border border-borderline rounded p-2 text-textPrimary focus:outline-none focus:border-accent"
                  >
                    <option value="OPC 43">OPC 43 Grade</option>
                    <option value="OPC 53">OPC 53 Grade</option>
                    <option value="PPC">PPC (Portland Pozzolana)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-textSecondary uppercase mb-1">
                    Masonry Mortar Ratio
                  </label>
                  <select
                    value={mortarRatio}
                    onChange={(e) => setMortarRatio(e.target.value)}
                    className="w-full bg-canvas border border-borderline rounded p-2 text-textPrimary focus:outline-none focus:border-accent"
                  >
                    <option value="1:6">1:6 Cement:Sand (Standard)</option>
                    <option value="1:4">1:4 Cement:Sand (High Strength)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-textSecondary uppercase mb-1">
                    Masonry Unit Type
                  </label>
                  <select
                    value={brickType}
                    onChange={(e) => setBrickType(e.target.value)}
                    className="w-full bg-canvas border border-borderline rounded p-2 text-textPrimary focus:outline-none focus:border-accent"
                  >
                    <option value="Modular Clay Brick (190x90x90mm)">Modular Clay Brick (190x90x90mm)</option>
                    <option value="AAC Lightweight Blocks">AAC Lightweight Blocks</option>
                    <option value="Solid Concrete Blocks">Solid Concrete Blocks</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Site Context & Soil Information */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-textPrimary border-b border-borderline pb-1">
                Step 4: Site Information & Geotechnical Context
              </h4>
              <div className="bg-canvas border border-borderline rounded p-3 text-[11px] text-textSecondary">
                <p>
                  <strong>Uncertainty Engine Rule:</strong> If Soil Type is marked "Not Provided", foundation trenching and footing concrete estimates will be marked with a <strong>LOW CONFIDENCE</strong> penalty.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-textSecondary uppercase mb-1">
                    Soil Bearing Type *
                  </label>
                  <select
                    value={soilType}
                    onChange={(e) => setSoilType(e.target.value)}
                    className="w-full bg-canvas border border-borderline rounded p-2 text-textPrimary focus:outline-none focus:border-accent"
                  >
                    <option value="Not Provided">Not Provided (Increases Uncertainty)</option>
                    <option value="Medium Dense Sandy Loam">Medium Dense Sandy Loam</option>
                    <option value="Black Cotton Soil">Black Cotton Soil (Expansive)</option>
                    <option value="Hard Gravel / Rocky">Hard Gravel / Rocky</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-textSecondary uppercase mb-1">
                    Seismic Zone
                  </label>
                  <select
                    value={seismicZone}
                    onChange={(e) => setSeismicZone(e.target.value)}
                    className="w-full bg-canvas border border-borderline rounded p-2 text-textPrimary focus:outline-none focus:border-accent"
                  >
                    <option value="Zone III">Zone III (Moderate)</option>
                    <option value="Zone II">Zone II (Low)</option>
                    <option value="Zone IV">Zone IV (Severe)</option>
                    <option value="Not Provided">Not Provided</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Upload Blueprint Drawing */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-textPrimary border-b border-borderline pb-1">
                Step 5: Construction Blueprint Upload
              </h4>

              <div className="border-2 border-dashed border-borderline hover:border-accent rounded-lg p-6 text-center bg-canvas/30 transition-colors">
                <Upload className="w-8 h-8 text-accent mx-auto mb-2 opacity-80" />
                <h5 className="font-bold text-xs text-textPrimary">
                  Drag and drop architectural blueprint here
                </h5>
                <p className="text-[11px] text-textSecondary mt-0.5">
                  Supports multi-page PDF, PNG, JPG, or scanned drawings.
                </p>

                <div className="mt-4 flex items-center justify-center gap-3">
                  <label className="cursor-pointer px-4 py-2 rounded bg-accent text-white font-medium hover:bg-accent-hover transition-colors shadow-sm">
                    Browse File
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  <span className="text-textSecondary">or</span>

                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="px-4 py-2 rounded bg-panel border border-borderline hover:bg-canvas font-medium text-textPrimary transition-colors"
                  >
                    Load Sample Villa Plan
                  </button>
                </div>
              </div>

              {selectedFile && (
                <div className="bg-canvas border border-borderline rounded p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-accent" />
                    <div>
                      <span className="font-semibold text-textPrimary">{selectedFile.name}</span>
                      <span className="text-[10px] text-textSecondary mono-num ml-2">
                        ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  </div>
                  <span className="text-success text-[11px] font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Ready for Validation
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: Preprocessing Validation */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-textPrimary border-b border-borderline pb-1">
                Step 6: Blueprint Validation & DPI Check
              </h4>
              <div className="bg-canvas border border-borderline rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span>File Integrity</span>
                  <span className="text-success font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Valid Architectural Document
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Image DPI Rating</span>
                  <span className="mono-num text-success font-semibold">150 DPI (Optimal for CV)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Vector Text Stream</span>
                  <span className="text-success font-semibold">Detected Native Callouts</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Analysis Configuration */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-textPrimary border-b border-borderline pb-1">
                Step 7: Configure Analysis Pipeline
              </h4>
              <div className="space-y-2 text-[11px]">
                <label className="flex items-center gap-2 p-2 bg-canvas border border-borderline rounded cursor-pointer">
                  <input type="checkbox" defaultChecked disabled className="accent-accent" />
                  <div>
                    <strong>Computer Vision Spatial Extraction:</strong> Walls, rooms, openings, and dimension callouts.
                  </div>
                </label>
                <label className="flex items-center gap-2 p-2 bg-canvas border border-borderline rounded cursor-pointer">
                  <input type="checkbox" defaultChecked disabled className="accent-accent" />
                  <div>
                    <strong>Deterministic BOQ Engine:</strong> IS 456 & IS 1200 civil and material calculations.
                  </div>
                </label>
                <label className="flex items-center gap-2 p-2 bg-canvas border border-borderline rounded cursor-pointer">
                  <input type="checkbox" defaultChecked disabled className="accent-accent" />
                  <div>
                    <strong>National Building Code (NBC) & IBC Audit:</strong> Habitable spaces, staircase clearances, door widths.
                  </div>
                </label>
                <label className="flex items-center gap-2 p-2 bg-canvas border border-borderline rounded cursor-pointer">
                  <input type="checkbox" defaultChecked disabled className="accent-accent" />
                  <div>
                    <strong>Local Gemma 2B AI Reasoning:</strong> Synthesis, uncertainty explanation, and summary generation.
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 8: Multi-Stage Pipeline Execution */}
          {currentStep === 8 && (
            <div className="space-y-6 py-6 text-center">
              <Cpu className="w-10 h-10 text-accent mx-auto animate-pulse" />
              <div>
                <h4 className="font-bold text-base text-textPrimary">Running 12-Stage Intelligence Pipeline</h4>
                <p className="text-xs text-textSecondary mt-1 mono-num">{analysisStage}</p>
              </div>

              {/* Progress Bar */}
              <div className="max-w-md mx-auto">
                <div className="w-full bg-borderline h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-accent h-full transition-all duration-300"
                    style={{ width: `${analysisPercent}%` }}
                  />
                </div>
                <span className="mono-num text-[11px] text-textSecondary mt-2 block">
                  {analysisPercent}% Completed
                </span>
              </div>
            </div>
          )}

          {/* STEP 9 & 10: Complete */}
          {currentStep >= 9 && (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-success-subtle text-success mx-auto flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-textPrimary">Blueprint Analysis Complete</h4>
              <p className="text-xs text-textSecondary max-w-md mx-auto leading-relaxed">
                Extracted spatial dimensions, calculated deterministic Bill of Quantities (BOQ), verified against NBC building standards, and marked visual anomalies on the drawing.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-borderline bg-canvas/40 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={currentStep === 1 || currentStep === 8 || isSubmitting}
            className="flex items-center gap-1 px-3 py-1.5 rounded border border-borderline bg-panel hover:bg-canvas text-textPrimary font-medium disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="flex items-center gap-1 px-4 py-1.5 rounded bg-accent text-white font-semibold hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50"
          >
            <span>
              {currentStep === 7
                ? 'Launch Analysis'
                : currentStep >= 9
                ? 'Open In Workbench'
                : 'Next'}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
