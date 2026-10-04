import logging
from typing import Dict, Any, List
from backend.app.models.schemas import UncertaintySummary

logger = logging.getLogger("blueprintiq.uncertainty")

class UncertaintyEngine:
    """
    Uncertainty Quantification and Confidence Assessment Engine.
    Penalizes confidence for missing metadata, uncalibrated scale, low DPI,
    and missing dimension callouts. Ensures BlueprintIQ never fakes certainty.
    """

    @staticmethod
    def evaluate(
        project: Dict[str, Any],
        project_metadata: Dict[str, Any],
        drawing_stats: Dict[str, Any]
    ) -> UncertaintySummary:
        missing_inputs: List[Dict[str, str]] = []
        major_assumptions: List[str] = []
        limitations: List[str] = []

        base_score = 1.0

        # 1. Soil Type Check
        soil = project.get("soil_type", "Not Provided")
        if not soil or soil.lower() == "not provided":
            base_score -= 0.08
            missing_inputs.append({
                "field": "Soil Type",
                "status": "Not Provided",
                "impact": "Foundation trench excavation, footing depth, and sub-base quantities cannot be verified without soil bearing capacity (SBC)."
            })
            major_assumptions.append("Excavation depth assumed at nominal 1.2m for medium dense soil; footing sizes subject to soil report.")

        # 2. Scale Calibration Check
        scale_calibrated = project_metadata.get("scale_calibrated", False)
        drawing_scale = project_metadata.get("drawing_scale", "1:100")
        if not scale_calibrated:
            base_score -= 0.15
            missing_inputs.append({
                "field": "Scale Calibration",
                "status": "Uncalibrated",
                "impact": "Drawing scale relies on nominal text ratio ('1:100') rather than two-point physical dimension calibration. Coordinate errors may magnify calculated areas by 5-10%."
            })
            major_assumptions.append(f"Graphic scale ratio {drawing_scale} assumed uniformly proportional across X and Y axes.")

        # 3. Slab Thickness
        slab_thick = project_metadata.get("slab_thickness")
        if not slab_thick:
            base_score -= 0.08
            missing_inputs.append({
                "field": "Slab Thickness",
                "status": "Not Provided",
                "impact": "Slab concrete volume, cement requirements, and rebar tonnage are estimated using standard 150mm residential thumb rule."
            })
            major_assumptions.append("RCC slab thickness assumed as standard 150 mm (6 inches).")

        # 4. Structural Drawings Availability
        base_score -= 0.05
        limitations.append("Analysis is based on 2D architectural floor plan only. Structural framing schedules (column schedules, beam cross-sections, and bar bending schedules) were not provided.")
        major_assumptions.append("Reinforcement steel estimated via standard IS 456 thumb rules (0.8% for slabs, 1.5% for framed elements).")

        # 5. Dimension Callout Coverage
        rooms_count = drawing_stats.get("rooms_count", 0)
        dimensions_count = drawing_stats.get("dimensions_count", 0)
        if rooms_count > 0 and dimensions_count < (rooms_count * 0.5):
            base_score -= 0.10
            missing_inputs.append({
                "field": "Dimension Callout Annotations",
                "status": "Incomplete Drawing Text",
                "impact": f"Only {dimensions_count} dimension strings extracted for {rooms_count} detected spaces. Several room polygons are inferred from wall boundaries."
            })
            major_assumptions.append("Unannotated room dimensions derived from closed boundary polylines.")

        # 6. Scan / Image DPI
        dpi = drawing_stats.get("dpi", 150)
        if dpi < 100:
            base_score -= 0.08
            limitations.append(f"Image resolution ({dpi} DPI) is below recommended 150-300 DPI architectural standard, increasing OCR uncertainty.")

        score = max(0.20, min(0.95, base_score))

        if score >= 0.90:
            overall_confidence = "HIGH"
        elif score >= 0.60:
            overall_confidence = "MEDIUM"
        else:
            overall_confidence = "LOW"

        return UncertaintySummary(
            overall_confidence=overall_confidence,
            confidence_score=round(score, 2),
            missing_inputs=missing_inputs,
            major_assumptions=major_assumptions,
            limitations=limitations
        )

uncertainty_engine = UncertaintyEngine()
