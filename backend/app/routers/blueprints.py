import logging
from typing import List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from uuid import uuid4
from datetime import datetime
from backend.app.models.schemas import BlueprintResponse, BlueprintPageResponse
from backend.app.services.db import db
from backend.app.services.storage import storage
from backend.app.services.blueprint_cv import blueprint_cv

router = APIRouter(prefix="/projects/{project_id}/blueprints", tags=["blueprints"])
logger = logging.getLogger("blueprintiq.blueprints")

@router.post("", response_model=BlueprintResponse)
async def upload_blueprint(
    project_id: str,
    file: UploadFile = File(...),
    scale_ratio: str = Form("1:100"),
    scale_unit: str = Form("m")
):
    project = db.get("projects", project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    content = await file.read()
    file_size = len(content)
    if file_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    mime_type = file.content_type or "application/octet-stream"
    filename = file.filename or f"blueprint_{uuid4().hex[:8]}.pdf"

    blueprint_id = str(uuid4())
    stored_filename = f"{blueprint_id}_{filename}"
    file_url, local_path = storage.save_blueprint(stored_filename, content)

    # Process drawing with CV engine
    unit_sys = project.get("unit_system", "METRIC")
    try:
        pages_data = blueprint_cv.process_file(local_path, scale_ratio=scale_ratio, unit_system=unit_sys)
    except Exception as e:
        logger.error(f"Error processing blueprint CV: {e}")
        pages_data = []

    now = datetime.utcnow().isoformat()
    bp_dict = {
        "id": blueprint_id,
        "project_id": project_id,
        "filename": filename,
        "file_path": file_url,
        "file_size": file_size,
        "mime_type": mime_type,
        "page_count": max(1, len(pages_data)),
        "scale_ratio": scale_ratio,
        "scale_unit": scale_unit,
        "is_calibrated": False,
        "status": "UPLOADED",
        "created_at": now
    }
    db.insert("blueprints", bp_dict)

    page_responses = []
    # Save individual page records & images
    for p in pages_data:
        p_num = p["page_number"]
        p_id = str(uuid4())
        page_img_url, _ = storage.save_page_image(blueprint_id, p_num, p["image_bytes"], marked=False)
        
        page_dict = {
            "id": p_id,
            "blueprint_id": blueprint_id,
            "page_number": p_num,
            "image_path": page_img_url,
            "marked_image_path": None,
            "width": p["width"],
            "height": p["height"],
            "dpi": 150,
            "created_at": now
        }
        db.insert("blueprint_pages", page_dict)

        # Store raw extracted items temporarily linked to page
        for r in p.get("rooms", []):
            r["page_id"] = p_id
            r["project_id"] = project_id
            db.insert("rooms", r)

        for w in p.get("walls", []):
            w["page_id"] = p_id
            w["project_id"] = project_id
            db.insert("walls", w)

        for op in p.get("openings", []):
            op["page_id"] = p_id
            op["project_id"] = project_id
            db.insert("openings", op)

        for d in p.get("dimensions", []):
            d["page_id"] = p_id
            d["project_id"] = project_id
            db.insert("extracted_dimensions", d)

        page_responses.append(BlueprintPageResponse(
            id=p_id,
            blueprint_id=blueprint_id,
            page_number=p_num,
            image_url=page_img_url,
            marked_image_url=None,
            width=p["width"],
            height=p["height"],
            dpi=150
        ))

    bp_dict["pages"] = page_responses
    return bp_dict

@router.post("/sample", response_model=BlueprintResponse)
async def load_sample_blueprint(project_id: str):
    project = db.get("projects", project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    from backend.app.config import BASE_DIR
    sample_file = BASE_DIR / "sample_blueprints" / "sample_residential_blueprint.pdf"
    if not sample_file.exists():
        raise HTTPException(status_code=404, detail="Sample blueprint PDF file not found on disk")

    with open(sample_file, "rb") as f:
        content = f.read()

    file_size = len(content)
    filename = "sample_residential_blueprint.pdf"
    mime_type = "application/pdf"
    scale_ratio = "1:100"
    scale_unit = "m"

    blueprint_id = str(uuid4())
    stored_filename = f"{blueprint_id}_{filename}"
    file_url, local_path = storage.save_blueprint(stored_filename, content)

    unit_sys = project.get("unit_system", "METRIC")
    try:
        pages_data = blueprint_cv.process_file(local_path, scale_ratio=scale_ratio, unit_system=unit_sys)
    except Exception as e:
        logger.error(f"Error processing sample blueprint CV: {e}")
        pages_data = []

    now = datetime.utcnow().isoformat()
    bp_dict = {
        "id": blueprint_id,
        "project_id": project_id,
        "filename": filename,
        "file_path": file_url,
        "file_size": file_size,
        "mime_type": mime_type,
        "page_count": max(1, len(pages_data)),
        "scale_ratio": scale_ratio,
        "scale_unit": scale_unit,
        "is_calibrated": True,
        "status": "UPLOADED",
        "created_at": now
    }
    db.insert("blueprints", bp_dict)

    page_responses = []
    for p in pages_data:
        p_num = p["page_number"]
        p_id = str(uuid4())
        page_img_url, _ = storage.save_page_image(blueprint_id, p_num, p["image_bytes"], marked=False)
        
        page_dict = {
            "id": p_id,
            "blueprint_id": blueprint_id,
            "page_number": p_num,
            "image_path": page_img_url,
            "marked_image_path": None,
            "width": p["width"],
            "height": p["height"],
            "dpi": 150,
            "created_at": now
        }
        db.insert("blueprint_pages", page_dict)

        for r in p.get("rooms", []):
            r["page_id"] = p_id
            r["project_id"] = project_id
            db.insert("rooms", r)

        for w in p.get("walls", []):
            w["page_id"] = p_id
            w["project_id"] = project_id
            db.insert("walls", w)

        for op in p.get("openings", []):
            op["page_id"] = p_id
            op["project_id"] = project_id
            db.insert("openings", op)

        for d in p.get("dimensions", []):
            d["page_id"] = p_id
            d["project_id"] = project_id
            db.insert("extracted_dimensions", d)

        page_responses.append(BlueprintPageResponse(
            id=p_id,
            blueprint_id=blueprint_id,
            page_number=p_num,
            image_url=page_img_url,
            marked_image_url=None,
            width=p["width"],
            height=p["height"],
            dpi=150
        ))

    bp_dict["pages"] = page_responses
    return bp_dict

@router.get("", response_model=List[BlueprintResponse])
def list_blueprints(project_id: str):
    bps = db.query("blueprints", {"project_id": project_id})
    res = []
    for b in bps:
        pages = db.query("blueprint_pages", {"blueprint_id": b["id"]})
        page_responses = [
            BlueprintPageResponse(
                id=p["id"],
                blueprint_id=b["id"],
                page_number=p["page_number"],
                image_url=p["image_path"],
                marked_image_url=p.get("marked_image_path"),
                width=p["width"],
                height=p["height"],
                dpi=p.get("dpi", 150)
            ) for p in pages
        ]
        b_copy = dict(b)
        b_copy["pages"] = sorted(page_responses, key=lambda x: x.page_number)
        res.append(b_copy)
    return res

@router.get("/{blueprint_id}", response_model=BlueprintResponse)
def get_blueprint(project_id: str, blueprint_id: str):
    b = db.get("blueprints", blueprint_id)
    if not b or b.get("project_id") != project_id:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    pages = db.query("blueprint_pages", {"blueprint_id": blueprint_id})
    page_responses = [
        BlueprintPageResponse(
            id=p["id"],
            blueprint_id=blueprint_id,
            page_number=p["page_number"],
            image_url=p["image_path"],
            marked_image_url=p.get("marked_image_path"),
            width=p["width"],
            height=p["height"],
            dpi=p.get("dpi", 150)
        ) for p in pages
    ]
    b_copy = dict(b)
    b_copy["pages"] = sorted(page_responses, key=lambda x: x.page_number)
    return b_copy
