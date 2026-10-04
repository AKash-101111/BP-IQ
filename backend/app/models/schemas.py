from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID, uuid4

class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float

class ProjectMetadataBase(BaseModel):
    floor_height: float = 3.0 # meters or feet
    wall_thickness: float = 0.23 # meters (e.g. 230mm)
    internal_wall_thickness: float = 0.115 # meters (115mm)
    slab_thickness: float = 0.15 # meters (150mm)
    drawing_scale: str = "1:100"
    scale_calibrated: bool = False
    scale_factor: float = 1.0
    cement_grade: str = "OPC 43" # OPC 43, OPC 53, PPC, Not Provided
    concrete_grade: str = "M20" # M15, M20, M25, Not Provided
    brick_type: str = "Modular Clay Brick (190x90x90mm)"
    mortar_ratio: str = "1:6" # 1:4, 1:6, Not Provided
    plaster_ratio: str = "1:6" # 1:4, 1:6
    steel_assumptions: str = "Fe500 TMT (Standard 1.2% thumb rule)"
    flooring_type: str = "Vitrified Tiles (600x600mm)"

class ProjectCreate(BaseModel):
    name: str
    building_type: str = "Residential" # Residential, Commercial, Industrial, Infrastructure, Other
    floors: int = 1
    rooms_count: Optional[int] = None
    approx_builtup_area: Optional[float] = None
    plot_area: Optional[float] = None
    unit_system: str = "METRIC" # METRIC or IMPERIAL
    measurement_system: str = "Standard"
    soil_type: str = "Not Provided"
    location: str = "Not Provided"
    climate_info: str = "Not Provided"
    seismic_zone: str = "Not Provided"
    local_authority: str = "Not Provided"
    metadata: Optional[ProjectMetadataBase] = None

class ProjectResponse(BaseModel):
    id: str
    name: str
    building_type: str
    floors: int
    rooms_count: Optional[int] = None
    approx_builtup_area: Optional[float] = None
    plot_area: Optional[float] = None
    unit_system: str
    measurement_system: str
    soil_type: str
    location: str
    climate_info: str
    seismic_zone: str
    local_authority: str
    status: str
    overall_confidence: str
    created_at: str
    updated_at: str
    metadata: Optional[Dict[str, Any]] = None

class BlueprintPageResponse(BaseModel):
    id: str
    blueprint_id: str
    page_number: int
    image_url: str
    marked_image_url: Optional[str] = None
    width: int
    height: int
    dpi: int = 150

class BlueprintResponse(BaseModel):
    id: str
    project_id: str
    filename: str
    file_size: int
    mime_type: str
    page_count: int
    scale_ratio: str
    scale_unit: str
    is_calibrated: bool
    status: str
    created_at: str
    pages: List[BlueprintPageResponse] = []

class ExtractedObject(BaseModel):
    id: str
    page_id: str
    object_type: str # room, wall, door, window, staircase, dimension_callout
    label: Optional[str] = None
    bbox: BoundingBox
    confidence: float = 0.85
    attributes: Dict[str, Any] = {}

class RoomItem(BaseModel):
    id: str
    name: str
    stated_area: Optional[float] = None
    measured_area: float
    width: Optional[float] = None
    length: Optional[float] = None
    perimeter: Optional[float] = None
    height: float = 3.0
    bbox: BoundingBox
    confidence: float = 0.85
    page_number: int = 1

class WallItem(BaseModel):
    id: str
    wall_type: str = "EXTERNAL" # EXTERNAL, INTERNAL
    length: float
    thickness: float
    height: float
    volume: float
    start_point: Dict[str, float]
    end_point: Dict[str, float]
    bbox: BoundingBox
    confidence: float = 0.85
    page_number: int = 1

class OpeningItem(BaseModel):
    id: str
    opening_type: str # DOOR, WINDOW, VENTILATOR
    label: Optional[str] = None
    width: float
    height: float
    area: float
    volume: float
    bbox: BoundingBox
    confidence: float = 0.85
    page_number: int = 1

class DimensionItem(BaseModel):
    id: str
    text_value: str
    numeric_value: Optional[float] = None
    unit: str = "m"
    orientation: str = "HORIZONTAL"
    bbox: BoundingBox
    confidence: float = 0.85
    page_number: int = 1

class BOQItem(BaseModel):
    id: str
    project_id: Optional[str] = None
    category: str
    item_code: str
    item_name: str
    estimated_quantity: float
    unit: str
    range_min: float
    range_max: float
    confidence: str # HIGH, MEDIUM, LOW
    calculation_basis: str
    assumptions: str
    uncertainty_reasons: List[str] = []

class MaterialEstimate(BaseModel):
    id: str
    project_id: Optional[str] = None
    material_name: str
    estimated_quantity: float
    unit: str
    range_min: float
    range_max: float
    confidence: str
    calculation_basis: str
    formula_ref: str
    assumptions: str

class IssueItem(BaseModel):
    id: str
    project_id: Optional[str] = None
    issue_code: str # ISSUE-001
    issue_type: str # DIMENSION_INCONSISTENCY, MISSING_INFORMATION, CLEARANCE_CONCERN, GEOMETRY_ANOMALY, CODE_CONSIDERATION
    severity: str # INFO, LOW, MEDIUM, HIGH, CRITICAL
    page_number: int = 1
    title: str
    description: str
    evidence: str
    detected_value: Optional[str] = None
    expected_value: Optional[str] = None
    difference_pct: Optional[float] = None
    bbox: Optional[BoundingBox] = None
    confidence: str = "MEDIUM"
    source: str = "Geometric & Rule Inspection"
    rag_reference: Optional[str] = None
    recommendation: str
    verification_required: bool = True

class UncertaintySummary(BaseModel):
    overall_confidence: str # HIGH, MEDIUM, LOW
    confidence_score: float # 0.0 - 1.0
    missing_inputs: List[Dict[str, str]]
    major_assumptions: List[str]
    limitations: List[str]

class AnalysisRunResponse(BaseModel):
    id: str
    project_id: str
    blueprint_id: Optional[str] = None
    status: str # PENDING, IN_PROGRESS, COMPLETED, FAILED
    current_stage: str
    progress_pct: int
    model_used: str = "Gemma 2B (Ollama)"
    overall_confidence: str
    missing_inputs: List[Dict[str, str]] = []
    error_message: Optional[str] = None
    started_at: str
    completed_at: Optional[str] = None

class RAGChunkResponse(BaseModel):
    id: str
    standard_code: str
    clause_ref: str
    topic: str
    content: str
    relevance_score: Optional[float] = None

class AnalysisReportResponse(BaseModel):
    id: str
    project_id: str
    blueprint_id: Optional[str] = None
    approval_status: str # NO POTENTIAL ISSUES DETECTED, REVIEW REQUIRED, INSUFFICIENT INFORMATION
    summary_text: str
    gemma_reasoning: Optional[str] = None
    created_at: str
    project_summary: Dict[str, Any]
    extraction_summary: Dict[str, Any]
    uncertainty: UncertaintySummary
    boq_summary: List[BOQItem]
    materials_summary: List[MaterialEstimate]
    issues_summary: List[IssueItem]
    rag_references: List[RAGChunkResponse]
    legal_disclaimer: str
