import React, { useState } from 'react';
import { Project } from '../../types';
import { api } from '../../api';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface CreateProjectPageProps {
  onNext: (project: Project) => void;
  onCancel: () => void;
}

export const CreateProjectPage: React.FC<CreateProjectPageProps> = ({ onNext, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [buildingType, setBuildingType] = useState('Residential');
  const [floors, setFloors] = useState(2);
  const [approxBuiltupArea, setApproxBuiltupArea] = useState(180);
  const [unitSystem, setUnitSystem] = useState('METRIC');
  const [soilType, setSoilType] = useState('Not Provided');
  const [location, setLocation] = useState('Not Provided');
  const [constructionType, setConstructionType] = useState('RCC Framed');
  const [wallType, setWallType] = useState('Brick Masonry');
  const [drawingScale, setDrawingScale] = useState('Unknown');
  const [blueprintType, setBlueprintType] = useState('Architectural Floor Plan');
  const [notes, setNotes] = useState('');

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please provide a Project Name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const newProj = await api.createProject({
        name,
        building_type: buildingType,
        floors: Number(floors),
        approx_builtup_area: Number(approxBuiltupArea),
        plot_area: 0,
        unit_system: unitSystem,
        soil_type: soilType,
        location,
        seismic_zone: 'Not Provided',
        metadata: {
          floor_height: 3.0,
          wall_thickness: 0.23,
          internal_wall_thickness: 0.115,
          slab_thickness: 0.15,
          drawing_scale: drawingScale,
          scale_calibrated: drawingScale !== 'Unknown',
          scale_factor: 1.0,
          cement_grade: 'OPC 43',
          concrete_grade: 'M20',
          brick_type: wallType,
          mortar_ratio: '1:6',
          plaster_ratio: '1:6',
          steel_assumptions: 'Fe500 TMT (Standard 1.2% thumb rule)',
          flooring_type: 'Vitrified Tiles (600x600mm)',
        }
      });
      onNext(newProj);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating project');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-canvas p-6 lg:p-10 flex justify-center">
      <div className="w-full max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-textPrimary">Create Blueprint Analysis</h1>
          <p className="text-sm text-textSecondary mt-2">
            Provide the project context required for accurate blueprint interpretation and quantity estimation.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-issue-subtle border border-issue-border rounded flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-issue shrink-0 mt-0.5" />
            <p className="text-sm text-issue">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleContinue} className="space-y-8 bg-panel border border-borderline rounded-lg p-8 shadow-sm">
          {/* Project Information */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-textSecondary border-b border-borderline pb-2 mb-4">
              Project Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-textPrimary mb-1.5">Project Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Villa Residence G+1" className="w-full px-3 py-2 bg-canvas border border-borderline rounded text-sm focus:outline-none focus:border-accent transition-colors" required />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-textPrimary mb-1.5">Building Type</label>
                <select value={buildingType} onChange={e => setBuildingType(e.target.value)} className="w-full px-3 py-2 bg-canvas border border-borderline rounded text-sm focus:outline-none focus:border-accent">
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Institutional">Institutional</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-textPrimary mb-1.5">Number of Floors</label>
                <input type="number" min="1" value={floors} onChange={e => setFloors(Number(e.target.value))} className="w-full px-3 py-2 bg-canvas border border-borderline rounded text-sm focus:outline-none focus:border-accent" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-textPrimary mb-1.5">Approx Built-up Area</label>
                <input type="number" min="0" value={approxBuiltupArea} onChange={e => setApproxBuiltupArea(Number(e.target.value))} className="w-full px-3 py-2 bg-canvas border border-borderline rounded text-sm focus:outline-none focus:border-accent" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-textPrimary mb-1.5">Unit System</label>
                <select value={unitSystem} onChange={e => setUnitSystem(e.target.value)} className="w-full px-3 py-2 bg-canvas border border-borderline rounded text-sm focus:outline-none focus:border-accent">
                  <option value="METRIC">Metric</option>
                  <option value="IMPERIAL">Imperial</option>
                </select>
              </div>
            </div>
          </div>

          {/* Construction Context */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-textSecondary border-b border-borderline pb-2 mb-4">
              Construction Context
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-textPrimary mb-1.5">Soil Type</label>
                <select value={soilType} onChange={e => setSoilType(e.target.value)} className="w-full px-3 py-2 bg-canvas border border-borderline rounded text-sm focus:outline-none focus:border-accent">
                  <option value="Not Provided">Unknown / Not Provided</option>
                  <option value="Medium Dense Sandy Loam">Medium Dense Sandy Loam</option>
                  <option value="Black Cotton Soil">Black Cotton Soil</option>
                  <option value="Hard Gravel / Rocky">Hard Gravel / Rocky</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-textPrimary mb-1.5">Location / Region</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Unknown / Not Provided" className="w-full px-3 py-2 bg-canvas border border-borderline rounded text-sm focus:outline-none focus:border-accent" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-textPrimary mb-1.5">Construction Type</label>
                <select value={constructionType} onChange={e => setConstructionType(e.target.value)} className="w-full px-3 py-2 bg-canvas border border-borderline rounded text-sm focus:outline-none focus:border-accent">
                  <option value="RCC Framed">RCC Framed</option>
                  <option value="Load Bearing">Load Bearing</option>
                  <option value="Steel Framed">Steel Framed</option>
                  <option value="Composite">Composite</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-textPrimary mb-1.5">Wall Type</label>
                <select value={wallType} onChange={e => setWallType(e.target.value)} className="w-full px-3 py-2 bg-canvas border border-borderline rounded text-sm focus:outline-none focus:border-accent">
                  <option value="Brick Masonry">Brick Masonry</option>
                  <option value="Concrete Block">Concrete Block</option>
                  <option value="AAC Block">AAC Block</option>
                  <option value="Drywall / Partition">Drywall / Partition</option>
                </select>
              </div>
            </div>
          </div>

          {/* Blueprint Context */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-textSecondary border-b border-borderline pb-2 mb-4">
              Blueprint Context
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-textPrimary mb-1.5">Drawing Scale</label>
                <select value={drawingScale} onChange={e => setDrawingScale(e.target.value)} className="w-full px-3 py-2 bg-canvas border border-borderline rounded text-sm focus:outline-none focus:border-accent">
                  <option value="Unknown">Unknown / Not Provided</option>
                  <option value="1:50">1:50</option>
                  <option value="1:100">1:100</option>
                  <option value="1:200">1:200</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-textPrimary mb-1.5">Blueprint Type</label>
                <select value={blueprintType} onChange={e => setBlueprintType(e.target.value)} className="w-full px-3 py-2 bg-canvas border border-borderline rounded text-sm focus:outline-none focus:border-accent">
                  <option value="Architectural Floor Plan">Architectural Floor Plan</option>
                  <option value="Structural Layout">Structural Layout</option>
                  <option value="Site Plan">Site Plan</option>
                  <option value="Section / Elevation">Section / Elevation</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-textPrimary mb-1.5">Additional Notes / Description</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Any specific requirements or known constraints..." className="w-full px-3 py-2 bg-canvas border border-borderline rounded text-sm focus:outline-none focus:border-accent resize-none"></textarea>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-borderline">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-textSecondary hover:text-textPrimary transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded font-semibold text-sm hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-70">
              Continue to Blueprint Upload <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
