import pytest
from pathlib import Path
from backend.app.services.boq_engine import boq_engine
from backend.app.services.issue_detector import issue_detector
from backend.app.services.rag_engine import rag_engine
from backend.app.services.blueprint_cv import blueprint_cv
from backend.app.services.uncertainty_engine import uncertainty_engine

def test_rag_search():
    res = rag_engine.search("habitable room area")
    assert len(res) > 0
    assert any("NBC 2016" in r["standard_code"] for r in res)

    stair_res = rag_engine.search("staircase riser tread width")
    assert len(stair_res) > 0
    assert any("4.8.1" in r["clause_ref"] or "1011" in r["clause_ref"] for r in stair_res)

def test_boq_deterministic_calculations():
    sample_rooms = [
        {"name": "Living", "measured_area": 25.0},
        {"name": "Bedroom", "measured_area": 15.0},
        {"name": "Kitchen", "measured_area": 8.0}
    ]
    sample_walls = [
        {"length": 10.0, "thickness": 0.23, "height": 3.0, "wall_type": "EXTERNAL"},
        {"length": 8.0, "thickness": 0.115, "height": 3.0, "wall_type": "INTERNAL"}
    ]
    sample_openings = [
        {"opening_type": "DOOR", "width": 1.0, "height": 2.1, "area": 2.1}
    ]
    metadata = {
        "floor_height": 3.0,
        "wall_thickness": 0.23,
        "internal_wall_thickness": 0.115,
        "slab_thickness": 0.15,
        "concrete_grade": "M20",
        "mortar_ratio": "1:6"
    }
    boq, mats, summary = boq_engine.calculate_boq(
        project_id="test-proj",
        project_metadata=metadata,
        extracted_rooms=sample_rooms,
        extracted_walls=sample_walls,
        extracted_openings=sample_openings,
        unit_system="METRIC",
        soil_type="Sandy Loam",
        floors=1,
        approx_builtup_area=60.0
    )

    assert len(boq) >= 5
    assert len(mats) >= 6
    assert summary["total_cement_bags"] > 50
    assert summary["total_bricks"] > 1000

    # Test uncertainty bounds
    for m in mats:
        assert m.range_min <= m.estimated_quantity <= m.range_max
        assert m.confidence in ["HIGH", "MEDIUM", "LOW"]

def test_issue_detection():
    # Room with deliberate 25% area discrepancy (stated 18.0 vs measured 13.0)
    rooms = [{
        "name": "Master Bed",
        "stated_area": 18.0,
        "measured_area": 13.0,
        "bbox": {"x": 100, "y": 100, "width": 100, "height": 100},
        "page_number": 1
    }]
    # Staircase with narrow flight width 0.85m (< 1.0m NBC standard)
    stair = [{
        "name": "Staircase Flight",
        "measured_area": 6.0,
        "width": 0.85,
        "bbox": {"x": 200, "y": 200, "width": 80, "height": 100},
        "page_number": 1
    }]
    # Narrow door (0.65m)
    openings = [{
        "opening_type": "DOOR",
        "label": "Bath Door",
        "width": 0.65,
        "height": 2.1,
        "area": 1.365,
        "bbox": {"x": 150, "y": 150, "width": 25, "height": 25},
        "page_number": 1
    }]

    issues = issue_detector.audit_blueprint(
        project_id="p1",
        blueprint_id="b1",
        rooms=rooms + stair,
        walls=[],
        openings=openings,
        dimensions=[],
        project_metadata={"drawing_scale": "1:100", "scale_calibrated": True}
    )

    issue_types = [i.issue_type for i in issues]
    assert "DIMENSION_INCONSISTENCY" in issue_types
    assert "CLEARANCE_CONCERN" in issue_types

def test_cv_pipeline():
    sample_pdf = Path(__file__).resolve().parent.parent / "sample_blueprints" / "sample_residential_blueprint.pdf"
    assert sample_pdf.exists()
    pages = blueprint_cv.process_file(str(sample_pdf))
    assert len(pages) == 1
    p = pages[0]
    assert p["width"] > 0
    assert p["height"] > 0
    assert len(p["rooms"]) > 0
    assert len(p["openings"]) > 0
