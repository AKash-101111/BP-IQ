import os
import sys
import asyncio
from pathlib import Path

# Add backend root to sys.path
sys.path.insert(0, r"C:\Users\naray\BP-IQ")

from backend.app.services.blueprint_cv import blueprint_cv
from backend.app.services.markup_generator import markup_generator
from backend.app.services.boq_engine import boq_engine
from backend.app.services.issue_detector import issue_detector
from backend.app.services.rag_engine import rag_engine
from backend.app.services.uncertainty_engine import uncertainty_engine
from backend.app.services.ollama_client import ollama_client

async def test_yolo_pipeline():
    print("=" * 60)
    print("TESTING REAL YOLO11n INTEGRATION & ANALYSIS PIPELINE")
    print("=" * 60)

    test_dir = Path(r"C:\Users\naray\BP-IQ\backend\datasets\cubicasa_yolo\images\test")
    test_imgs = list(test_dir.glob("*.png"))

    if not test_imgs:
        print("ERROR: No real architectural test images found in datasets/cubicasa_yolo/images/test")
        return

    test_img_path = str(test_imgs[0])
    print(f"\n1. Processing Real Architectural Blueprint:\n   {test_img_path}")

    # Process with BlueprintCVEngine
    pages = blueprint_cv.process_file(test_img_path, scale_ratio="1:100", unit_system="METRIC")
    if not pages:
        print("ERROR: BlueprintCVEngine returned 0 pages.")
        return

    p = pages[0]
    detections = p.get("detections", [])
    classes_found = sorted(list(set(d["class_name"] for d in detections)))
    confidences = [d["confidence"] for d in detections]

    print("\n2. YOLO11n Inference Results:")
    print(f"   - Total Detections: {len(detections)}")
    print(f"   - Detected Classes: {classes_found}")
    print(f"   - Min Confidence:   {min(confidences):.4f}" if confidences else "N/A")
    print(f"   - Max Confidence:   {max(confidences):.4f}" if confidences else "N/A")
    print(f"   - Avg Confidence:   {(sum(confidences)/len(confidences)):.4f}" if confidences else "N/A")

    print("\n3. Extracted Architectural Entities Passed to Downstream Pipeline:")
    print(f"   - Real Walls Extracted:    {len(p['walls'])}")
    print(f"   - Real Openings Extracted: {len(p['openings'])} ({len([o for o in p['openings'] if o['opening_type']=='DOOR'])} Doors, {len([o for o in p['openings'] if o['opening_type']=='WINDOW'])} Windows)")
    print(f"   - Rooms Extracted:         {len(p['rooms'])}")
    print(f"   - Dimensions Extracted:    {len(p['dimensions'])}")

    print("\n   Sample Detected Objects:")
    for idx, d in enumerate(detections[:6]):
        print(f"     [{idx+1}] {d['class_name'].upper():<6} | Conf: {d['confidence']*100:.1f}% | BBox: x={d['bbox']['x']}, y={d['bbox']['y']}, w={d['bbox']['width']}, h={d['bbox']['height']}")

    # 4. Generate Visual Marked-up Blueprint with authentic detection coordinates
    marked_bytes = markup_generator.generate_marked_blueprint(
        raw_image_bytes=p["image_bytes"],
        walls=p["walls"],
        openings=p["openings"],
        rooms=p["rooms"],
        page_number=1
    )

    out_dir = Path(r"C:\Users\naray\BP-IQ\backend\storage\blueprints")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "test_real_yolo_marked.png"
    with open(out_file, "wb") as f:
        f.write(marked_bytes)

    print(f"\n4. Visual Marked-Up Blueprint Generated:")
    print(f"   - Path: {out_file}")
    print(f"   - Size: {out_file.stat().st_size} bytes")

    # 5. Verify Downstream Pipeline Receiving Real Detections
    print("\n5. Verifying Downstream Integration with Real Detections:")

    project_mock = {
        "id": "proj-real-test-01",
        "name": "Real Blueprint Test Project",
        "unit_system": "METRIC",
        "soil_type": "Medium Dense Clay",
        "floors": 1,
        "approx_builtup_area": 0.0
    }
    project_metadata_mock = {
        "floor_height": 3.0,
        "wall_thickness": 0.23,
        "internal_wall_thickness": 0.115,
        "slab_thickness": 0.15,
        "concrete_grade": "M20",
        "drawing_scale": "1:100",
        "scale_calibrated": True
    }

    # BOQ Engine
    boq_items, materials, summary = boq_engine.calculate_boq(
        project_id=project_mock["id"],
        project_metadata=project_metadata_mock,
        extracted_rooms=p["rooms"],
        extracted_walls=p["walls"],
        extracted_openings=p["openings"],
        unit_system="METRIC",
        soil_type="Medium Dense Clay",
        floors=1,
        approx_builtup_area=0.0
    )
    print(f"   - BOQ Engine: Generated {len(boq_items)} BOQ items and {len(materials)} material estimates from {len(p['walls'])} detected walls and {len(p['openings'])} openings.")

    # Issue Detector
    issues = issue_detector.audit_blueprint(
        project_id=project_mock["id"],
        blueprint_id="bp-test-01",
        rooms=p["rooms"],
        walls=p["walls"],
        openings=p["openings"],
        dimensions=p["dimensions"],
        project_metadata=project_metadata_mock,
        scale_calibrated=True
    )
    print(f"   - Issue Detector: Audited {len(p['walls'])} walls & {len(p['openings'])} openings against code standards -> {len(issues)} issues detected.")

    # RAG Verification
    rag_refs = rag_engine.search("habitable room area width ceiling height", limit=2)
    print(f"   - RAG Verification: Retrieved {len(rag_refs)} building code standards.")

    # Uncertainty Engine
    uncertainty = uncertainty_engine.evaluate(
        project_mock,
        project_metadata_mock,
        {"rooms_count": len(p["rooms"]), "dimensions_count": len(p["dimensions"]), "dpi": 150}
    )
    print(f"   - Uncertainty Engine: Overall Confidence = {uncertainty.overall_confidence} (Score: {uncertainty.confidence_score})")

    # Gemma 2B / Ollama reasoning test
    print("   - Testing Local Gemma 2B / Ollama reasoning with real detection payload...")
    blueprint_summary = {
        "carpet_area": summary["carpet_area"],
        "builtup_area": summary["builtup_area"],
        "rooms_count": len(p["rooms"]),
        "total_wall_length": summary["total_wall_length"],
        "openings_count": len(p["openings"])
    }
    gemma_response = await ollama_client.reason_over_blueprint(
        project_context=project_mock,
        blueprint_summary=blueprint_summary,
        detected_issues=[iss.model_dump() for iss in issues],
        rag_evidence=rag_refs,
        uncertainty_info=uncertainty.model_dump()
    )
    print(f"   - Gemma 2B Output: Model Used = '{gemma_response.get('model_used')}', Summary Length = {len(gemma_response.get('executive_summary', ''))} chars")

    print("\n" + "=" * 60)
    print("YOLO11n REAL INTEGRATION TEST COMPLETED SUCCESSFULLY")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_yolo_pipeline())
