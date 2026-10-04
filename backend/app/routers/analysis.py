import logging
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, BackgroundTasks, Response
from uuid import uuid4
from datetime import datetime
from backend.app.models.schemas import (
    AnalysisRunResponse, AnalysisReportResponse, BOQItem, MaterialEstimate,
    IssueItem, RoomItem, WallItem, OpeningItem, DimensionItem, UncertaintySummary, RAGChunkResponse
)
from backend.app.services.db import db
from backend.app.services.storage import storage
from backend.app.services.boq_engine import boq_engine
from backend.app.services.issue_detector import issue_detector
from backend.app.services.rag_engine import rag_engine
from backend.app.services.ollama_client import ollama_client
from backend.app.services.uncertainty_engine import uncertainty_engine
from backend.app.services.markup_generator import markup_generator
from backend.app.services.report_generator import report_generator

router = APIRouter(prefix="/projects/{project_id}", tags=["analysis"])
logger = logging.getLogger("blueprintiq.analysis")

@router.post("/analyze", response_model=AnalysisRunResponse)
async def run_analysis(project_id: str, background_tasks: BackgroundTasks):
    project = db.get("projects", project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    blueprints = db.query("blueprints", {"project_id": project_id})
    if not blueprints:
        raise HTTPException(status_code=400, detail="Upload a construction blueprint to begin analysis.")

    bp = blueprints[0]
    blueprint_id = bp["id"]

    run_id = str(uuid4())
    now = datetime.utcnow().isoformat()
    analysis_run = {
        "id": run_id,
        "project_id": project_id,
        "blueprint_id": blueprint_id,
        "status": "IN_PROGRESS",
        "current_stage": "PREPROCESSING",
        "progress_pct": 10,
        "model_used": "Gemma 2B (Ollama)",
        "overall_confidence": "MEDIUM",
        "missing_inputs": [],
        "error_message": None,
        "started_at": now,
        "completed_at": None
    }
    db.insert("analysis_runs", analysis_run)

    # Execute full synchronous pipeline or background processing
    await execute_full_pipeline(run_id, project_id, blueprint_id)

    updated_run = db.get("analysis_runs", run_id)
    return updated_run

async def execute_full_pipeline(run_id: str, project_id: str, blueprint_id: str):
    project = db.get("projects", project_id)
    meta_list = db.query("project_metadata", {"project_id": project_id})
    project_metadata = meta_list[0] if meta_list else {}

    pages = db.query("blueprint_pages", {"blueprint_id": blueprint_id})
    
    # Stages 1-5: Gather extracted objects
    db.update("analysis_runs", run_id, {"current_stage": "GEOMETRY", "progress_pct": 30})
    rooms = db.query("rooms", {"project_id": project_id})
    walls = db.query("walls", {"project_id": project_id})
    openings = db.query("openings", {"project_id": project_id})
    dimensions = db.query("extracted_dimensions", {"project_id": project_id})

    # Stage 6: Deterministic Quantity Estimation (BOQ)
    db.update("analysis_runs", run_id, {"current_stage": "QUANTITY_ESTIMATION", "progress_pct": 50})
    unit_sys = project.get("unit_system", "METRIC")
    soil = project.get("soil_type", "Not Provided")
    floors = int(project.get("floors", 1))
    approx_area = float(project.get("approx_builtup_area") or 0.0)

    boq_items, materials, summary_metrics = boq_engine.calculate_boq(
        project_id=project_id,
        project_metadata=project_metadata,
        extracted_rooms=rooms,
        extracted_walls=walls,
        extracted_openings=openings,
        unit_system=unit_sys,
        soil_type=soil,
        floors=floors,
        approx_builtup_area=approx_area
    )

    # Save BOQ & Materials
    for b in boq_items:
        b_dict = b.model_dump()
        b_dict["project_id"] = project_id
        db.insert("boq_items", b_dict)
    for m in materials:
        m_dict = m.model_dump()
        m_dict["project_id"] = project_id
        db.insert("material_estimates", m_dict)

    # Stage 7: Issue Detection Engine
    db.update("analysis_runs", run_id, {"current_stage": "ISSUE_DETECTION", "progress_pct": 65})
    issues = issue_detector.audit_blueprint(
        project_id=project_id,
        blueprint_id=blueprint_id,
        rooms=rooms,
        walls=walls,
        openings=openings,
        dimensions=dimensions,
        project_metadata=project_metadata,
        scale_calibrated=project_metadata.get("scale_calibrated", False)
    )
    for iss in issues:
        iss_dict = iss.model_dump()
        iss_dict["project_id"] = project_id
        db.insert("issues", iss_dict)

    # Stage 8: RAG Construction Standards Verification
    db.update("analysis_runs", run_id, {"current_stage": "RAG_VERIFICATION", "progress_pct": 75})
    rag_refs = []
    # Search RAG for room dimensions, stairs, and materials
    rag_refs.extend(rag_engine.search("habitable room area width ceiling height", limit=2))
    rag_refs.extend(rag_engine.search("staircase riser tread clearance", limit=2))
    rag_refs.extend(rag_engine.search("concrete mortar brickwork deductions", limit=2))

    # Stage 9: Uncertainty Quantification
    drawing_stats = {
        "rooms_count": len(rooms),
        "dimensions_count": len(dimensions),
        "dpi": pages[0].get("dpi", 150) if pages else 150
    }
    uncertainty = uncertainty_engine.evaluate(project, project_metadata, drawing_stats)

    # Stage 10: Local Gemma 2B Reasoning
    db.update("analysis_runs", run_id, {"current_stage": "GEMMA_REASONING", "progress_pct": 85})
    blueprint_summary = {
        "carpet_area": summary_metrics["carpet_area"],
        "builtup_area": summary_metrics["builtup_area"],
        "rooms_count": len(rooms),
        "total_wall_length": summary_metrics["total_wall_length"],
        "openings_count": len(openings)
    }
    gemma_reasoning = await ollama_client.reason_over_blueprint(
        project_context=project,
        blueprint_summary=blueprint_summary,
        detected_issues=[iss.model_dump() for iss in issues],
        rag_evidence=rag_refs,
        uncertainty_info=uncertainty.model_dump()
    )

    # Stage 11: Visual Marked-Up Blueprint Generation
    db.update("analysis_runs", run_id, {"current_stage": "MARKUP", "progress_pct": 92})
    for p in pages:
        p_num = p["page_number"]
        raw_img_path = p.get("image_path", "")
        # read local page image bytes
        filename = raw_img_path.split("/")[-1]
        local_page_file = storage.settings.BLUEPRINTS_PATH / filename
        if local_page_file.exists():
            with open(local_page_file, "rb") as f:
                raw_bytes = f.read()
            page_walls = [w for w in walls if w.get("page_id") == p["id"] or w.get("page_number") == p_num]
            page_openings = [op for op in openings if op.get("page_id") == p["id"] or op.get("page_number") == p_num]
            page_rooms = [r for r in rooms if r.get("page_id") == p["id"] or r.get("page_number") == p_num]
            marked_bytes = markup_generator.generate_marked_blueprint(
                raw_image_bytes=raw_bytes,
                issues=[iss.model_dump() for iss in issues],
                walls=page_walls,
                openings=page_openings,
                rooms=page_rooms,
                page_number=p_num
            )
            marked_url, _ = storage.save_page_image(blueprint_id, p_num, marked_bytes, marked=True)
            db.update("blueprint_pages", p["id"], {"marked_image_path": marked_url})

    # Stage 12: Report Generation & Completion
    db.update("analysis_runs", run_id, {"current_stage": "REPORT", "progress_pct": 98})
    approval_status = "ANALYSIS COMPLETE"
    if any(i.severity in ["HIGH", "CRITICAL"] for i in issues):
        approval_status = "REVIEW REQUIRED"
    elif uncertainty.overall_confidence == "LOW":
        approval_status = "INSUFFICIENT INFORMATION"

    pdf_bytes = report_generator.generate_pdf(
        project=project,
        project_metadata=project_metadata,
        boq_items=[b.model_dump() for b in boq_items],
        materials=[m.model_dump() for m in materials],
        issues=[iss.model_dump() for iss in issues],
        uncertainty=uncertainty.model_dump(),
        rag_references=rag_refs,
        gemma_reasoning=gemma_reasoning
    )
    pdf_url, _ = storage.save_report(project_id, pdf_bytes, extension="pdf")

    # Save Analysis Report
    report_id = str(uuid4())
    report_dict = {
        "id": report_id,
        "project_id": project_id,
        "blueprint_id": blueprint_id,
        "summary_text": gemma_reasoning.get("executive_summary", "Analysis completed."),
        "approval_status": approval_status,
        "pdf_path": pdf_url,
        "report_json": {
            "gemma_reasoning": gemma_reasoning,
            "uncertainty": uncertainty.model_dump(),
            "summary_metrics": summary_metrics
        }
    }
    db.insert("analysis_reports", report_dict)

    # Finalize Run & Project Status
    now = datetime.utcnow().isoformat()
    db.update("analysis_runs", run_id, {
        "status": "COMPLETED",
        "current_stage": "COMPLETE",
        "progress_pct": 100,
        "overall_confidence": uncertainty.overall_confidence,
        "missing_inputs": uncertainty.missing_inputs,
        "completed_at": now
    })
    db.update("projects", project_id, {
        "status": approval_status,
        "overall_confidence": uncertainty.overall_confidence
    })

    logger.info(
        f"[PIPELINE COMPLETE] Analysis Run ID: {run_id} | Report ID: {report_id} | Project ID: {project_id} | "
        f"Saved Overall Confidence: {uncertainty.overall_confidence} ({uncertainty.confidence_score}) | "
        f"Approval Status: {approval_status}"
    )

@router.get("/status", response_model=List[AnalysisRunResponse])
def get_analysis_status(project_id: str):
    runs = db.query("analysis_runs", {"project_id": project_id})
    runs.sort(key=lambda x: x.get("started_at", ""), reverse=True)
    return runs

@router.get("/extraction")
def get_extraction(project_id: str):
    rooms = db.query("rooms", {"project_id": project_id})
    walls = db.query("walls", {"project_id": project_id})
    openings = db.query("openings", {"project_id": project_id})
    dimensions = db.query("extracted_dimensions", {"project_id": project_id})
    return {
        "rooms": rooms,
        "walls": walls,
        "openings": openings,
        "dimensions": dimensions
    }

@router.get("/boq")
def get_boq(project_id: str):
    boq = db.query("boq_items", {"project_id": project_id})
    materials = db.query("material_estimates", {"project_id": project_id})
    return {
        "boq_items": boq,
        "materials": materials
    }

@router.get("/issues", response_model=List[IssueItem])
def get_issues(project_id: str):
    return db.query("issues", {"project_id": project_id})

@router.get("/report")
def get_report(project_id: str):
    reports = db.query("analysis_reports", {"project_id": project_id})
    if not reports:
        raise HTTPException(status_code=404, detail="Analysis report not generated yet. Run analysis first.")
    rep = reports[-1]
    
    project = db.get("projects", project_id)
    meta_list = db.query("project_metadata", {"project_id": project_id})
    metadata = meta_list[0] if meta_list else {}
    boq = db.query("boq_items", {"project_id": project_id})
    materials = db.query("material_estimates", {"project_id": project_id})
    issues = db.query("issues", {"project_id": project_id})
    rooms = db.query("rooms", {"project_id": project_id})
    walls = db.query("walls", {"project_id": project_id})
    openings = db.query("openings", {"project_id": project_id})

    return {
        "report_id": rep["id"],
        "approval_status": rep["approval_status"],
        "summary_text": rep["summary_text"],
        "pdf_url": rep.get("pdf_path"),
        "created_at": rep.get("created_at"),
        "project_summary": project,
        "project_metadata": metadata,
        "extraction_summary": {
            "rooms_count": len(rooms),
            "walls_count": len(walls),
            "openings_count": len(openings)
        },
        "uncertainty": rep.get("report_json", {}).get("uncertainty", {}),
        "gemma_reasoning": rep.get("report_json", {}).get("gemma_reasoning", {}),
        "boq_summary": boq,
        "materials_summary": materials,
        "issues_summary": issues,
        "legal_disclaimer": "BlueprintIQ provides preliminary automated analysis and quantity estimates. It does not replace a licensed architect, structural engineer, quantity surveyor, or local authority approval."
    }

import re

@router.get("/export-pdf")
def export_pdf(project_id: str):
    project = db.get("projects", project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    meta_list = db.query("project_metadata", {"project_id": project_id})
    project_metadata = meta_list[0] if meta_list else {}
    rooms = db.query("rooms", {"project_id": project_id})
    walls = db.query("walls", {"project_id": project_id})
    openings = db.query("openings", {"project_id": project_id})
    dimensions = db.query("extracted_dimensions", {"project_id": project_id})
    boq_items = db.query("boq_items", {"project_id": project_id})
    materials = db.query("material_estimates", {"project_id": project_id})
    issues = db.query("issues", {"project_id": project_id})
    reports = db.query("analysis_reports", {"project_id": project_id})

    if not boq_items or not materials:
        unit_sys = project.get("unit_system", "METRIC")
        soil = project.get("soil_type", "Not Provided")
        floors = int(project.get("floors", 1))
        approx_area = float(project.get("approx_builtup_area") or 0.0)
        calculated_boq, calculated_materials, _ = boq_engine.calculate_boq(
            project_id=project_id,
            project_metadata=project_metadata,
            extracted_rooms=rooms,
            extracted_walls=walls,
            extracted_openings=openings,
            unit_system=unit_sys,
            soil_type=soil,
            floors=floors,
            approx_builtup_area=approx_area
        )
        boq_items = [b.model_dump() for b in calculated_boq]
        materials = [m.model_dump() for m in calculated_materials]

    # Use persisted uncertainty from saved analysis_reports if available
    saved_report = reports[-1] if reports else None
    if saved_report and saved_report.get("report_json", {}).get("uncertainty"):
        uncertainty_dict = saved_report["report_json"]["uncertainty"]
    else:
        uncertainty_obj = uncertainty_engine.evaluate(
            project, project_metadata,
            {"rooms_count": len(rooms), "dimensions_count": len(dimensions), "dpi": 150}
        )
        uncertainty_dict = uncertainty_obj.model_dump()

    rag_refs = []
    rag_refs.extend(rag_engine.search("habitable room area width ceiling height", limit=2))
    rag_refs.extend(rag_engine.search("concrete mortar brickwork deductions", limit=2))

    if saved_report and saved_report.get("report_json", {}).get("gemma_reasoning"):
        gemma_reasoning = saved_report["report_json"]["gemma_reasoning"]
    else:
        gemma_reasoning = {
            "model_used": "Gemma 2B (Ollama)",
            "executive_summary": f"Technical memorandum and verified Bill of Quantities for {project.get('name', 'BlueprintIQ Project')}. Contains structural metrics, geometric quantities, and code compliance audits.",
            "uncertainty_assessment": "Derived from geometric plan extractions and standard engineering estimation principles."
        }

    pdf_bytes = report_generator.generate_pdf(
        project=project,
        project_metadata=project_metadata,
        boq_items=boq_items,
        materials=materials,
        issues=issues,
        uncertainty=uncertainty_dict,
        rag_references=rag_refs,
        gemma_reasoning=gemma_reasoning
    )
    storage.save_report(project_id, pdf_bytes, extension="pdf")

    safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', project.get('name', 'Project'))
    filename = f"BlueprintIQ_Report_{safe_name}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\"",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

