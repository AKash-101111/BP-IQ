export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProjectMetadata {
  id?: string;
  project_id?: string;
  floor_height: number;
  wall_thickness: number;
  internal_wall_thickness: number;
  slab_thickness: number;
  drawing_scale: string;
  scale_calibrated: boolean;
  scale_factor: number;
  cement_grade: string;
  concrete_grade: string;
  brick_type: string;
  mortar_ratio: string;
  plaster_ratio: string;
  steel_assumptions: string;
  flooring_type: string;
}

export interface Project {
  id: string;
  name: string;
  building_type: string;
  floors: number;
  rooms_count?: number;
  approx_builtup_area?: number;
  plot_area?: number;
  unit_system: string;
  measurement_system: string;
  soil_type: string;
  location: string;
  climate_info: string;
  seismic_zone: string;
  local_authority: string;
  status: string; // CREATED, IN_PROGRESS, COMPLETED, REVIEW REQUIRED, INSUFFICIENT INFORMATION
  overall_confidence: string; // HIGH, MEDIUM, LOW, UNKNOWN
  created_at: string;
  updated_at: string;
  metadata?: ProjectMetadata;
}

export interface BlueprintPage {
  id: string;
  blueprint_id: string;
  page_number: number;
  image_url: string;
  marked_image_url?: string;
  width: number;
  height: number;
  dpi: number;
}

export interface Blueprint {
  id: string;
  project_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  page_count: number;
  scale_ratio: string;
  scale_unit: string;
  is_calibrated: boolean;
  status: string;
  created_at: string;
  pages: BlueprintPage[];
}

export interface RoomItem {
  id: string;
  name: string;
  stated_area?: number;
  measured_area: number;
  width?: number;
  length?: number;
  perimeter?: number;
  height: number;
  bbox: BoundingBox;
  confidence: number;
  page_number: number;
}

export interface WallItem {
  id: string;
  wall_type: string;
  length: number;
  thickness: number;
  height: number;
  volume: number;
  start_point: { x: number; y: number };
  end_point: { x: number; y: number };
  bbox: BoundingBox;
  confidence: number;
  page_number: number;
}

export interface OpeningItem {
  id: string;
  opening_type: string;
  label?: string;
  width: number;
  height: number;
  area: number;
  volume: number;
  bbox: BoundingBox;
  confidence: number;
  page_number: number;
}

export interface DimensionItem {
  id: string;
  text_value: string;
  numeric_value?: number;
  unit: string;
  orientation: string;
  bbox: BoundingBox;
  confidence: number;
  page_number: number;
}

export interface BOQItem {
  id: string;
  category: string;
  item_code: string;
  item_name: string;
  estimated_quantity: number;
  unit: string;
  range_min: number;
  range_max: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  calculation_basis: string;
  assumptions: string;
  uncertainty_reasons: string[];
}

export interface MaterialEstimate {
  id: string;
  material_name: string;
  estimated_quantity: number;
  unit: string;
  range_min: number;
  range_max: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  calculation_basis: string;
  formula_ref: string;
  assumptions: string;
}

export interface IssueItem {
  id: string;
  issue_code: string; // ISSUE-001
  issue_type: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  page_number: number;
  title: string;
  description: string;
  evidence: string;
  detected_value?: string;
  expected_value?: string;
  difference_pct?: number;
  bbox?: BoundingBox;
  confidence: string;
  source: string;
  rag_reference?: string;
  recommendation: string;
  verification_required: boolean;
}

export interface MissingInput {
  field: string;
  status: string;
  impact: string;
}

export interface UncertaintySummary {
  overall_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence_score: number;
  missing_inputs: MissingInput[];
  major_assumptions: string[];
  limitations: string[];
}

export interface AnalysisRun {
  id: string;
  project_id: string;
  blueprint_id?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  current_stage: string;
  progress_pct: number;
  model_used: string;
  overall_confidence: string;
  missing_inputs: MissingInput[];
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export interface RAGChunk {
  id: string;
  standard_code: string;
  clause_ref: string;
  topic: string;
  category: string;
  content: string;
  relevance_score?: number;
}

export interface AnalysisReport {
  report_id: string;
  approval_status: string;
  summary_text: string;
  pdf_url?: string;
  created_at: string;
  project_summary: Project;
  project_metadata: ProjectMetadata;
  extraction_summary: {
    rooms_count: number;
    walls_count: number;
    openings_count: number;
  };
  uncertainty: UncertaintySummary;
  gemma_reasoning?: {
    executive_summary?: string;
    issue_explanations?: Array<{
      issue_code: string;
      synthesis: string;
      recommended_action: string;
    }>;
    uncertainty_assessment?: string;
    professional_verification_notice?: string;
  };
  boq_summary: BOQItem[];
  materials_summary: MaterialEstimate[];
  issues_summary: IssueItem[];
  legal_disclaimer: string;
}

export interface SystemHealth {
  status: string;
  app: string;
  tagline: string;
  ollama: {
    available: boolean;
    base_url: string;
    configured_model: string;
    model_ready: boolean;
    installed_models: string[];
    message: string;
  };
  supabase_database: {
    connected: boolean;
    mode: string;
  };
  supabase_storage: {
    connected: boolean;
    mode: string;
  };
}
