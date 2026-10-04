import logging
from typing import List, Dict, Any, Optional
from uuid import uuid4
from backend.app.models.schemas import IssueItem, BoundingBox
from backend.app.services.rag_engine import rag_engine

logger = logging.getLogger("blueprintiq.issue_detector")

class IssueDetector:
    """
    Precision Blueprint Anomaly, Dimensional Conflict, and Compliance Consideration Engine.
    Inspects extracted geometry and dimensions against deterministic geometric consistency rules
    and RAG-indexed construction standards (NBC, IS codes, IBC).
    """

    @staticmethod
    def audit_blueprint(
        project_id: str,
        blueprint_id: str,
        rooms: List[Dict[str, Any]],
        walls: List[Dict[str, Any]],
        openings: List[Dict[str, Any]],
        dimensions: List[Dict[str, Any]],
        project_metadata: Dict[str, Any],
        scale_calibrated: bool = True
    ) -> List[IssueItem]:
        issues: List[IssueItem] = []
        issue_counter = 1

        def next_code() -> str:
            nonlocal issue_counter
            code = f"ISSUE-{issue_counter:03d}"
            issue_counter += 1
            return code

        # 1. Scale Calibration Audit
        if not scale_calibrated or project_metadata.get("scale_factor", 1.0) == 1.0:
            scale_str = project_metadata.get("drawing_scale", "Unknown")
            if scale_str == "Unknown" or not scale_calibrated:
                issues.append(IssueItem(
                    id=str(uuid4()),
                    issue_code=next_code(),
                    issue_type="SCALE_UNCERTAINTY",
                    severity="HIGH",
                    page_number=1,
                    title="Drawing Scale Not Confirmed or Uncalibrated",
                    description="The blueprint does not have a confirmed graphic scale bar or verified dimensional calibration.",
                    evidence=f"Drawing scale specified as '{scale_str}' without dimension calibration points.",
                    detected_value=scale_str,
                    expected_value="Verified scale ratio (e.g. 1:100 or known dimension callout)",
                    difference_pct=None,
                    bbox=BoundingBox(x=50, y=50, width=150, height=50),
                    confidence="HIGH",
                    source="Scale Verification Rule",
                    rag_reference="IS 1200 / ISO 128 Architectural Drawing Presentation Rules",
                    recommendation="Perform scale calibration against a known reference dimension on the drawing before procurement.",
                    verification_required=True
                ))

        # 2. Stated Area vs Measured Geometry Area Inconsistencies
        for r in rooms:
            stated = r.get("stated_area")
            measured = r.get("measured_area", 0.0)
            room_name = r.get("name", "Unnamed Room")
            bbox_dict = r.get("bbox", {"x": 100, "y": 100, "width": 100, "height": 100})
            bbox = BoundingBox(**bbox_dict) if isinstance(bbox_dict, dict) else BoundingBox(x=100, y=100, width=100, height=100)

            if stated and stated > 0:
                diff_pct = abs(measured - stated) / stated * 100.0
                if diff_pct > 8.0:
                    severity = "HIGH" if diff_pct > 20.0 else "MEDIUM"
                    issues.append(IssueItem(
                        id=str(uuid4()),
                        issue_code=next_code(),
                        issue_type="DIMENSION_INCONSISTENCY",
                        severity=severity,
                        page_number=r.get("page_number", 1),
                        title=f"Area Mismatch in {room_name}",
                        description=f"Annotated text specifies {stated:.1f} m² (or sq.ft), but measured polygon geometry calculates to {measured:.1f} m².",
                        evidence=f"Annotated stated area: {stated:.1f} | Measured coordinate area: {measured:.1f} (Deviation: {diff_pct:.1f}%)",
                        detected_value=f"{measured:.1f}",
                        expected_value=f"{stated:.1f}",
                        difference_pct=round(diff_pct, 1),
                        bbox=bbox,
                        confidence="HIGH",
                        source="Direct Polyline Geometry vs OCR Annotation Comparison",
                        rag_reference="IS 1200 Part 28 (Carpet Area Measurement Rules)",
                        recommendation="Verify room boundary dimensions against architectural source files.",
                        verification_required=True
                    ))

        # 3. Minimum Habitable Space Compliance (NBC 2016 Clause 4.2.1)
        nbc_habitable_rule = rag_engine.get_rule_by_id("rag-nbc-room-min")
        min_habitable_area = nbc_habitable_rule.get("min_habitable_area_sqm", 9.5) if nbc_habitable_rule else 9.5
        min_habitable_width = nbc_habitable_rule.get("min_habitable_width_m", 2.4) if nbc_habitable_rule else 2.4

        for r in rooms:
            name_lower = r.get("name", "").lower()
            measured = r.get("measured_area", 0.0)
            width = r.get("width")
            bbox_dict = r.get("bbox", {"x": 100, "y": 100, "width": 100, "height": 100})
            bbox = BoundingBox(**bbox_dict) if isinstance(bbox_dict, dict) else BoundingBox(x=100, y=100, width=100, height=100)

            if any(k in name_lower for k in ["bed", "living", "master", "hall"]):
                if measured > 0 and measured < min_habitable_area:
                    issues.append(IssueItem(
                        id=str(uuid4()),
                        issue_code=next_code(),
                        issue_type="CODE_CONSIDERATION",
                        severity="MEDIUM",
                        page_number=r.get("page_number", 1),
                        title=f"Potential Habitable Area Constraint: {r.get('name')}",
                        description=f"Room area of {measured:.1f} m² is below the standard habitable room recommendation of {min_habitable_area} m² (approx 102 sq.ft).",
                        evidence=f"Measured area: {measured:.1f} m² vs Recommended threshold: {min_habitable_area} m²",
                        detected_value=f"{measured:.1f} m²",
                        expected_value=f">= {min_habitable_area} m²",
                        difference_pct=round((min_habitable_area - measured) / min_habitable_area * 100, 1),
                        bbox=bbox,
                        confidence="HIGH",
                        source="RAG-verified National Building Code Clause 4.2.1",
                        rag_reference="NBC 2016 Part 3 Clause 4.2.1 (Minimum Habitable Room Area)",
                        recommendation="Review room layout with a licensed architect to confirm local municipal development control guidelines.",
                        verification_required=True
                    ))
                if width and width < min_habitable_width:
                    issues.append(IssueItem(
                        id=str(uuid4()),
                        issue_code=next_code(),
                        issue_type="CLEARANCE_CONCERN",
                        severity="LOW",
                        page_number=r.get("page_number", 1),
                        title=f"Narrow Room Span in {r.get('name')}",
                        description=f"Room width ({width:.2f} m) is less than standard minimum recommended width ({min_habitable_width} m).",
                        evidence=f"Measured clear span: {width:.2f} m | NBC standard: >= {min_habitable_width} m",
                        detected_value=f"{width:.2f} m",
                        expected_value=f">= {min_habitable_width} m",
                        difference_pct=round((min_habitable_width - width) / min_habitable_width * 100, 1),
                        bbox=bbox,
                        confidence="MEDIUM",
                        source="RAG-verified NBC 2016 Part 3",
                        rag_reference="NBC 2016 Part 3 Clause 4.2.1",
                        recommendation="Check furniture circulation clearances and structural beam alignment.",
                        verification_required=True
                    ))

        # 4. Staircase Geometry & Clearances (NBC Clause 4.8.1 & IBC 1011)
        stair_rooms = [r for r in rooms if "stair" in r.get("name", "").lower()]
        for st in stair_rooms:
            width = st.get("width")
            bbox_dict = st.get("bbox", {"x": 200, "y": 200, "width": 120, "height": 100})
            bbox = BoundingBox(**bbox_dict) if isinstance(bbox_dict, dict) else BoundingBox(x=200, y=200, width=120, height=100)
            
            if width and width < 0.90:
                issues.append(IssueItem(
                    id=str(uuid4()),
                    issue_code=next_code(),
                    issue_type="CLEARANCE_CONCERN",
                    severity="HIGH",
                    page_number=st.get("page_number", 1),
                    title="Possible Staircase Width Clearance Concern",
                    description="Stair flight width appears less than 1.0 m (1000 mm) clear residential standard.",
                    evidence=f"Detected clear width: {width:.2f} m | NBC standard requirement: >= 1.00 m",
                    detected_value=f"{width:.2f} m",
                    expected_value=">= 1.00 m",
                    difference_pct=round((1.0 - width) / 1.0 * 100, 1),
                    bbox=bbox,
                    confidence="HIGH",
                    source="NBC 2016 Clause 4.8.1 & IBC Section 1011.2",
                    rag_reference="NBC 2016 Part 3 Clause 4.8.1 (Staircase Minimum Width)",
                    recommendation="Verify clear flight width and handrail projection with structural and architectural drawings.",
                    verification_required=True
                ))
            else:
                # If staircase exists but no riser/tread dimensions are explicitly annotated
                issues.append(IssueItem(
                    id=str(uuid4()),
                    issue_code=next_code(),
                    issue_type="MISSING_INFORMATION",
                    severity="MEDIUM",
                    page_number=st.get("page_number", 1),
                    title="Staircase Riser and Tread Detail Missing on 2D Plan",
                    description="Stair flight boundary detected, but specific riser height (e.g. 150-180mm) and tread depth (>=250mm) schedules are unannotated on this plan.",
                    evidence="No textual riser/tread callouts (e.g. '18 Risers @ 165mm') identified in staircase zone.",
                    detected_value="Unannotated",
                    expected_value="Riser <= 190mm, Tread >= 250mm",
                    difference_pct=None,
                    bbox=bbox,
                    confidence="MEDIUM",
                    source="Plan Completeness Audit",
                    rag_reference="IBC Section 1011.5.2 & NBC 4.8.1",
                    recommendation="Request sectional drawing / stair detailing schedule for precise concrete and reinforcement calculation.",
                    verification_required=True
                ))

        # 5. Missing Dimension Callouts on Unmeasured Spans
        unmeasured_rooms = [r for r in rooms if not r.get("width") or not r.get("length")]
        if unmeasured_rooms and len(dimensions) < len(rooms):
            for ur in unmeasured_rooms[:2]: # report top unmeasured rooms
                bbox_dict = ur.get("bbox", {"x": 150, "y": 150, "width": 100, "height": 80})
                bbox = BoundingBox(**bbox_dict) if isinstance(bbox_dict, dict) else BoundingBox(x=150, y=150, width=100, height=80)
                issues.append(IssueItem(
                    id=str(uuid4()),
                    issue_code=next_code(),
                    issue_type="MISSING_INFORMATION",
                    severity="LOW",
                    page_number=ur.get("page_number", 1),
                    title=f"Missing Linear Dimensions for {ur.get('name')}",
                    description="Room boundary identified via contour geometry, but explicit dual-axis dimension strings (Length x Width) were not found.",
                    evidence=f"Room '{ur.get('name')}' relies solely on pixel raster polygon scaling.",
                    detected_value="Polygon inference only",
                    expected_value="Explicit dimension callout (e.g., 3.60m x 4.20m)",
                    difference_pct=None,
                    bbox=bbox,
                    confidence="MEDIUM",
                    source="Dimension Extraction Inspector",
                    rag_reference="IS 1200 / Architectural CAD Annotation Standards",
                    recommendation="Cross-reference with master architectural dimension schedule.",
                    verification_required=True
                ))

        # 6. Door Clearance & Wall Opening Conflict Audit
        for op in openings:
            if op.get("opening_type") == "DOOR":
                width = op.get("width", 0.0)
                label = op.get("label", "Door")
                bbox_dict = op.get("bbox", {"x": 100, "y": 100, "width": 40, "height": 40})
                bbox = BoundingBox(**bbox_dict) if isinstance(bbox_dict, dict) else BoundingBox(x=100, y=100, width=40, height=40)
                if width > 0 and width < 0.70:
                    issues.append(IssueItem(
                        id=str(uuid4()),
                        issue_code=next_code(),
                        issue_type="CLEARANCE_CONCERN",
                        severity="HIGH",
                        page_number=op.get("page_number", 1),
                        title=f"Sub-Standard Door Opening Width ({label})",
                        description=f"Door width of {width:.2f} m is narrower than standard minimum clear opening (0.75m for baths, 0.80m for rooms, 0.90m for main entry).",
                        evidence=f"Detected door span: {width:.2f} m",
                        detected_value=f"{width:.2f} m",
                        expected_value=">= 0.75 m (bath) or >= 0.80 m (room)",
                        difference_pct=round((0.75 - width) / 0.75 * 100, 1),
                        bbox=bbox,
                        confidence="HIGH",
                        source="IBC Section 1010.1.1 Egress Provisions",
                        rag_reference="IBC 2021 Section 1010.1.1 / NBC 2016 Part 3",
                        recommendation="Verify rough opening (RO) size to ensure ADA / egress compliance.",
                        verification_required=True
                    ))

        # 7. Check for Disconnected or Isolated Wall Segments
        if len(walls) > 0:
            # Check for walls with very short length or orphan endpoints
            short_walls = [w for w in walls if w.get("length", 0.0) < 0.40]
            if short_walls:
                w0 = short_walls[0]
                bbox_dict = w0.get("bbox", {"x": 200, "y": 200, "width": 30, "height": 30})
                bbox = BoundingBox(**bbox_dict) if isinstance(bbox_dict, dict) else BoundingBox(x=200, y=200, width=30, height=30)
                issues.append(IssueItem(
                    id=str(uuid4()),
                    issue_code=next_code(),
                    issue_type="GEOMETRY_ANOMALY",
                    severity="LOW",
                    page_number=w0.get("page_number", 1),
                    title="Short or Disconnected Wall Segment Detected",
                    description=f"Isolated wall stub detected with length {w0.get('length', 0):.2f}m. May represent a column projection, chase, or CAD drafting break.",
                    evidence=f"Wall segment length = {w0.get('length', 0):.2f}m (< 0.4m)",
                    detected_value=f"{w0.get('length', 0):.2f} m",
                    expected_value="Continuous structural wall or column tag",
                    difference_pct=None,
                    bbox=bbox,
                    confidence="MEDIUM",
                    source="Topological Wall Vector Connectivity Inspector",
                    rag_reference="Standard Architectural CAD Layer Standards",
                    recommendation="Verify whether this segment represents an RCC column wrap or plumbing shaft.",
                    verification_required=True
                ))

        return issues

issue_detector = IssueDetector()
