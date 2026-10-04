import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from uuid import uuid4
from datetime import datetime
from backend.app.models.schemas import ProjectCreate, ProjectResponse, ProjectMetadataBase
from backend.app.services.db import db

router = APIRouter(prefix="/projects", tags=["projects"])
logger = logging.getLogger("blueprintiq.projects")

@router.post("", response_model=ProjectResponse)
def create_project(project_in: ProjectCreate):
    proj_id = str(uuid4())
    now = datetime.utcnow().isoformat()
    
    proj_dict = {
        "id": proj_id,
        "name": project_in.name,
        "building_type": project_in.building_type,
        "floors": project_in.floors,
        "rooms_count": project_in.rooms_count,
        "approx_builtup_area": project_in.approx_builtup_area,
        "plot_area": project_in.plot_area,
        "unit_system": project_in.unit_system,
        "measurement_system": project_in.measurement_system,
        "soil_type": project_in.soil_type,
        "location": project_in.location,
        "climate_info": project_in.climate_info,
        "seismic_zone": project_in.seismic_zone,
        "local_authority": project_in.local_authority,
        "status": "CREATED",
        "overall_confidence": "UNKNOWN",
        "created_at": now,
        "updated_at": now
    }
    db.insert("projects", proj_dict)

    # Save Project Metadata
    meta = project_in.metadata or ProjectMetadataBase()
    meta_dict = {
        "id": str(uuid4()),
        "project_id": proj_id,
        "floor_height": meta.floor_height,
        "wall_thickness": meta.wall_thickness,
        "internal_wall_thickness": meta.internal_wall_thickness,
        "slab_thickness": meta.slab_thickness,
        "drawing_scale": meta.drawing_scale,
        "scale_calibrated": meta.scale_calibrated,
        "scale_factor": meta.scale_factor,
        "cement_grade": meta.cement_grade,
        "concrete_grade": meta.concrete_grade,
        "brick_type": meta.brick_type,
        "mortar_ratio": meta.mortar_ratio,
        "plaster_ratio": meta.plaster_ratio,
        "steel_assumptions": meta.steel_assumptions,
        "flooring_type": meta.flooring_type,
        "created_at": now,
        "updated_at": now
    }
    db.insert("project_metadata", meta_dict)

    proj_dict["metadata"] = meta_dict
    return proj_dict

@router.get("", response_model=List[ProjectResponse])
def list_projects():
    projects = db.query("projects")
    res = []
    for p in projects:
        meta_list = db.query("project_metadata", {"project_id": p["id"]})
        meta = meta_list[0] if meta_list else None
        p_copy = dict(p)
        p_copy["metadata"] = meta
        res.append(p_copy)
    # sort by created_at desc
    res.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return res

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str):
    p = db.get("projects", project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    meta_list = db.query("project_metadata", {"project_id": project_id})
    meta = meta_list[0] if meta_list else None
    p_copy = dict(p)
    p_copy["metadata"] = meta
    return p_copy

@router.delete("/{project_id}")
def delete_project(project_id: str):
    p = db.get("projects", project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete("projects", project_id)
    return {"status": "deleted", "id": project_id}
