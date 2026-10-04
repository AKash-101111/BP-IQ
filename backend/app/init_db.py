import asyncio
from pathlib import Path
from uuid import uuid4
from datetime import datetime
from backend.app.services.db import db
from backend.app.services.storage import storage
from backend.app.services.blueprint_cv import blueprint_cv
from backend.app.services.boq_engine import boq_engine
from backend.app.services.issue_detector import issue_detector
from backend.app.services.rag_engine import rag_engine
from backend.app.services.uncertainty_engine import uncertainty_engine
from backend.app.services.markup_generator import markup_generator
from backend.app.services.report_generator import report_generator
from backend.app.services.ollama_client import ollama_client

async def seed_initial_project():
    print("Seeding initial authentic architectural blueprint project...")
    
    # 1. Project details
    proj_id = "11111111-2222-3333-4444-555555555555"
    existing = db.get("projects", proj_id)
    if existing:
        print("Initial project already seeded.")
        return

    now = datetime.utcnow().isoformat()
    project = {
        "id": proj_id,
        "name": "Villa Residence G+1",
        "building_type": "Residential",
        "floors": 2,
        "rooms_count": 5,
        "approx_builtup_area": 180.0,
        "plot_area": 250.0,
        "unit_system": "METRIC",
        "measurement_system": "Standard",
        "soil_type": "Not Provided", # Deliberately unprovided to show uncertainty reasoning
        "location": "Urban Coastal Region",
        "climate_info": "Warm Humid",
        "seismic_zone": "Zone III",
        "local_authority": "Municipal Development Authority",
        "status": "REVIEW REQUIRED",
        "overall_confidence": "MEDIUM",
        "created_at": now,
        "updated_at": now
    }
    db.insert("projects", project)

    metadata = {
        "id": str(uuid4()),
        "project_id": proj_id,
        "floor_height": 3.0,
        "wall_thickness": 0.23,
        "internal_wall_thickness": 0.115,
        "slab_thickness": 0.15,
        "drawing_scale": "1:100",
        "scale_calibrated": True,
        "scale_factor": 60.0,
        "cement_grade": "OPC 43",
        "concrete_grade": "M20",
        "brick_type": "Modular Clay Brick (190x90x90mm)",
        "mortar_ratio": "1:6",
        "plaster_ratio": "1:6",
        "steel_assumptions": "Fe500 TMT (Standard 1.2% thumb rule)",
        "flooring_type": "Vitrified Tiles (600x600mm)",
        "created_at": now,
        "updated_at": now
    }
    db.insert("project_metadata", metadata)

    # 2. Ingest Sample Blueprint
    sample_pdf_path = Path(__file__).resolve().parent.parent / "sample_blueprints" / "sample_residential_blueprint.pdf"
    if not sample_pdf_path.exists():
        from backend.sample_blueprints.create_sample import generate_sample_drawing
        generate_sample_drawing()

    with open(sample_pdf_path, "rb") as f:
        pdf_bytes = f.read()

    blueprint_id = "bbbbbbbb-1111-2222-3333-444444444444"
    bp_url, local_file = storage.save_blueprint(f"{blueprint_id}_sample_residential_blueprint.pdf", pdf_bytes)

    bp_record = {
        "id": blueprint_id,
        "project_id": proj_id,
        "filename": "sample_residential_blueprint.pdf",
        "file_path": bp_url,
        "file_size": len(pdf_bytes),
        "mime_type": "application/pdf",
        "page_count": 1,
        "scale_ratio": "1:100",
        "scale_unit": "m",
        "is_calibrated": True,
        "status": "ANALYZED",
        "created_at": now
    }
    db.insert("blueprints", bp_record)

    # Process CV
    pages_data = blueprint_cv.process_file(str(sample_pdf_path), scale_ratio="1:100", unit_system="METRIC")
    p0 = pages_data[0]

    page_id = "pppppppp-1111-2222-3333-444444444444"
    raw_page_url, local_page_path = storage.save_page_image(blueprint_id, 1, p0["image_bytes"], marked=False)

    # Extracted rooms
    rooms = p0["rooms"]
    for r in rooms:
        r["page_id"] = page_id
        r["project_id"] = proj_id
        db.insert("rooms", r)

    walls = p0["walls"]
    for w in walls:
        w["page_id"] = page_id
        w["project_id"] = proj_id
        db.insert("walls", w)

    openings = p0["openings"]
    for op in openings:
        op["page_id"] = page_id
        op["project_id"] = proj_id
        db.insert("openings", op)

    dimensions = p0["dimensions"]
    for d in dimensions:
        d["page_id"] = page_id
        d["project_id"] = proj_id
        db.insert("extracted_dimensions", d)

    # 3. Calculate BOQ
    boq_items, materials, summary_metrics = boq_engine.calculate_boq(
        project_id=proj_id,
        project_metadata=metadata,
        extracted_rooms=rooms,
        extracted_walls=walls,
        extracted_openings=openings,
        unit_system="METRIC",
        soil_type="Not Provided",
        floors=2,
        approx_builtup_area=180.0
    )
    for b in boq_items:
        b_dict = b.model_dump()
        b_dict["project_id"] = proj_id
        db.insert("boq_items", b_dict)
    for m in materials:
        m_dict = m.model_dump()
        m_dict["project_id"] = proj_id
        db.insert("material_estimates", m_dict)

    # 4. Detect Issues
    issues = issue_detector.audit_blueprint(
        project_id=proj_id,
        blueprint_id=blueprint_id,
        rooms=rooms,
        walls=walls,
        openings=openings,
        dimensions=dimensions,
        project_metadata=metadata,
        scale_calibrated=True
    )
    for iss in issues:
        iss_dict = iss.model_dump()
        iss_dict["project_id"] = proj_id
        db.insert("issues", iss_dict)

    # 5. Generate Visual Marked-up Blueprint
    marked_bytes = markup_generator.generate_marked_blueprint(
        raw_image_bytes=p0["image_bytes"],
        issues=[iss.model_dump() for iss in issues],
        page_number=1
    )
    marked_page_url, _ = storage.save_page_image(blueprint_id, 1, marked_bytes, marked=True)

    page_record = {
        "id": page_id,
        "blueprint_id": blueprint_id,
        "page_number": 1,
        "image_path": raw_page_url,
        "marked_image_path": marked_page_url,
        "width": p0["width"],
        "height": p0["height"],
        "dpi": 150,
        "created_at": now
    }
    db.insert("blueprint_pages", page_record)

    # 6. Uncertainty & Reasoning
    uncertainty = uncertainty_engine.evaluate(project, metadata, {
        "rooms_count": len(rooms),
        "dimensions_count": len(dimensions),
        "dpi": 150
    })

    rag_refs = rag_engine.search("habitable room area staircase clearance concrete", limit=4)

    gemma_reasoning = await ollama_client.reason_over_blueprint(
        project_context=project,
        blueprint_summary={
            "carpet_area": summary_metrics["carpet_area"],
            "builtup_area": summary_metrics["builtup_area"],
            "rooms_count": len(rooms),
            "total_wall_length": summary_metrics["total_wall_length"],
            "openings_count": len(openings)
        },
        detected_issues=[iss.model_dump() for iss in issues],
        rag_evidence=rag_refs,
        uncertainty_info=uncertainty.model_dump()
    )

    # 7. Generate PDF Report
    pdf_bytes = report_generator.generate_pdf(
        project=project,
        project_metadata=metadata,
        boq_items=[b.model_dump() for b in boq_items],
        materials=[m.model_dump() for m in materials],
        issues=[iss.model_dump() for iss in issues],
        uncertainty=uncertainty.model_dump(),
        rag_references=rag_refs,
        gemma_reasoning=gemma_reasoning
    )
    pdf_url, _ = storage.save_report(proj_id, pdf_bytes, extension="pdf")

    report_record = {
        "id": str(uuid4()),
        "project_id": proj_id,
        "blueprint_id": blueprint_id,
        "summary_text": gemma_reasoning.get("executive_summary", "Preliminary architectural evaluation completed."),
        "approval_status": "REVIEW REQUIRED",
        "pdf_path": pdf_url,
        "report_json": {
            "gemma_reasoning": gemma_reasoning,
            "uncertainty": uncertainty.model_dump(),
            "summary_metrics": summary_metrics
        },
        "created_at": now
    }
    db.insert("analysis_reports", report_record)
    print("Initial authentic project seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_initial_project())
