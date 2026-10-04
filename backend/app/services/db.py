import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path
from uuid import uuid4
from backend.app.config import settings

logger = logging.getLogger("blueprintiq.db")

class LocalStore:
    """Persistent local database store when Supabase credentials are not configured or as local replica."""
    def __init__(self, file_path: Path):
        self.file_path = file_path
        self.last_mtime = 0.0
        self.data: Dict[str, Dict[str, Any]] = {
            "projects": {},
            "project_metadata": {},
            "blueprints": {},
            "blueprint_pages": {},
            "extracted_objects": {},
            "rooms": {},
            "walls": {},
            "openings": {},
            "extracted_dimensions": {},
            "boq_items": {},
            "material_estimates": {},
            "issues": {},
            "analysis_runs": {},
            "rag_documents": {},
            "rag_chunks": {},
            "analysis_reports": {},
            "user_assumptions": {}
        }
        self.load()

    def load(self):
        if self.file_path.exists():
            try:
                mtime = self.file_path.stat().st_mtime
                if mtime != self.last_mtime:
                    with open(self.file_path, "r", encoding="utf-8") as f:
                        content = json.load(f)
                        for key in self.data.keys():
                            if key in content:
                                self.data[key] = content[key]
                    self.last_mtime = mtime
            except Exception as e:
                logger.error(f"Error loading local db: {e}")

    def save(self):
        try:
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=2, default=str)
            if self.file_path.exists():
                self.last_mtime = self.file_path.stat().st_mtime
        except Exception as e:
            logger.error(f"Error saving local db: {e}")

    def insert(self, table: str, record: Dict[str, Any]) -> Dict[str, Any]:
        self.load()
        if "id" not in record or not record["id"]:
            record["id"] = str(uuid4())
        now = datetime.utcnow().isoformat()
        if "created_at" not in record:
            record["created_at"] = now
        record["updated_at"] = now
        if table not in self.data:
            self.data[table] = {}
        self.data[table][str(record["id"])] = record
        self.save()
        return record

    def get(self, table: str, item_id: str) -> Optional[Dict[str, Any]]:
        self.load()
        return self.data.get(table, {}).get(str(item_id))

    def update(self, table: str, item_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        self.load()
        item = self.get(table, item_id)
        if item:
            item.update(updates)
            item["updated_at"] = datetime.utcnow().isoformat()
            self.save()
            return item
        return None

    def query(self, table: str, filter_fn=None) -> List[Dict[str, Any]]:
        self.load()
        items = list(self.data.get(table, {}).values())
        if filter_fn:
            items = [item for item in items if filter_fn(item)]
        return items

    def delete(self, table: str, item_id: str) -> bool:
        if table in self.data and str(item_id) in self.data[table]:
            del self.data[table][str(item_id)]
            self.save()
            return True
        return False

# Initialize local store file
LOCAL_DB_FILE = settings.STORAGE_PATH / "blueprintiq_local_db.json"
local_db = LocalStore(LOCAL_DB_FILE)

TABLE_COLUMNS = {
    "projects": {
        "id", "name", "building_type", "floors", "rooms_count", "approx_builtup_area",
        "plot_area", "unit_system", "measurement_system", "soil_type", "location",
        "climate_info", "seismic_zone", "local_authority", "status", "overall_confidence",
        "created_at", "updated_at"
    },
    "project_metadata": {
        "id", "project_id", "floor_height", "wall_thickness", "internal_wall_thickness",
        "slab_thickness", "drawing_scale", "scale_calibrated", "scale_factor",
        "cement_grade", "concrete_grade", "brick_type", "mortar_ratio", "plaster_ratio",
        "steel_assumptions", "flooring_type", "created_at", "updated_at"
    },
    "blueprints": {
        "id", "project_id", "filename", "file_path", "file_size", "mime_type",
        "page_count", "scale_ratio", "scale_unit", "is_calibrated", "status", "created_at"
    },
    "blueprint_pages": {
        "id", "blueprint_id", "page_number", "image_path", "marked_image_path",
        "width", "height", "dpi", "created_at"
    },
    "extracted_objects": {
        "id", "page_id", "object_type", "label", "bbox", "confidence", "attributes", "created_at"
    },
    "rooms": {
        "id", "page_id", "name", "stated_area", "measured_area", "width", "length",
        "perimeter", "height", "bbox", "confidence", "created_at"
    },
    "walls": {
        "id", "page_id", "wall_type", "length", "thickness", "height", "volume",
        "start_point", "end_point", "bbox", "confidence", "created_at"
    },
    "openings": {
        "id", "page_id", "opening_type", "label", "width", "height", "area",
        "volume", "wall_ref", "bbox", "confidence", "created_at"
    },
    "extracted_dimensions": {
        "id", "page_id", "text_value", "numeric_value", "unit", "orientation",
        "bbox", "confidence", "created_at"
    },
    "boq_items": {
        "id", "project_id", "category", "item_code", "item_name", "estimated_quantity",
        "unit", "range_min", "range_max", "confidence", "calculation_basis",
        "assumptions", "uncertainty_reasons", "created_at"
    },
    "material_estimates": {
        "id", "project_id", "material_name", "estimated_quantity", "unit",
        "range_min", "range_max", "confidence", "calculation_basis", "formula_ref",
        "assumptions", "created_at"
    },
    "issues": {
        "id", "project_id", "blueprint_id", "page_number", "issue_code", "issue_type",
        "severity", "title", "description", "evidence", "detected_value", "expected_value",
        "difference_pct", "bbox", "confidence", "source", "rag_reference",
        "recommendation", "verification_required", "created_at"
    },
    "analysis_runs": {
        "id", "project_id", "blueprint_id", "status", "current_stage", "progress_pct",
        "model_used", "overall_confidence", "missing_inputs", "error_message",
        "started_at", "completed_at"
    },
    "rag_documents": {
        "id", "title", "standard_code", "category", "description", "created_at"
    },
    "rag_chunks": {
        "id", "document_id", "clause_ref", "topic", "content", "created_at"
    },
    "user_assumptions": {
        "id", "project_id", "category", "assumption_key", "applied_value",
        "rationale", "impact_level", "created_at"
    },
    "analysis_reports": {
        "id", "project_id", "blueprint_id", "summary_text", "approval_status",
        "report_json", "pdf_path", "created_at"
    }
}

def clean_for_supabase(table: str, record: Dict[str, Any]) -> Dict[str, Any]:
    valid_cols = TABLE_COLUMNS.get(table)
    if not valid_cols:
        return record
    return {k: v for k, v in record.items() if k in valid_cols}

class DatabaseService:
    def __init__(self):
        self.supabase = None
        self.is_supabase_connected = False
        key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY
        if settings.SUPABASE_URL and key:
            try:
                from supabase import create_client
                self.supabase = create_client(settings.SUPABASE_URL, key)
                self.is_supabase_connected = True
                logger.info("Connected to remote Supabase database.")
            except Exception as e:
                logger.warning(f"Failed to connect to Supabase: {e}. Using local persistent store.")
                self.supabase = None
                self.is_supabase_connected = False

    def insert(self, table: str, record: Dict[str, Any]) -> Dict[str, Any]:
        # Always save to local store for resilience
        res = local_db.insert(table, record)
        if self.is_supabase_connected and self.supabase:
            try:
                cleaned = clean_for_supabase(table, record)
                self.supabase.table(table).upsert(cleaned).execute()
            except Exception as e:
                logger.warning(f"Supabase sync failed for {table}: {e}")
        return res

    def get(self, table: str, item_id: str) -> Optional[Dict[str, Any]]:
        if self.is_supabase_connected and self.supabase:
            try:
                resp = self.supabase.table(table).select("*").eq("id", item_id).execute()
                if resp.data:
                    return resp.data[0]
            except Exception as e:
                logger.warning(f"Supabase get failed for {table}: {e}")
        return local_db.get(table, item_id)

    def update(self, table: str, item_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        res = local_db.update(table, item_id, updates)
        if self.is_supabase_connected and self.supabase:
            try:
                cleaned = clean_for_supabase(table, updates)
                if cleaned:
                    self.supabase.table(table).update(cleaned).eq("id", item_id).execute()
            except Exception as e:
                logger.warning(f"Supabase update failed for {table}: {e}")
        return res

    def query(self, table: str, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        def filter_fn(item):
            if not filters:
                return True
            for k, v in filters.items():
                if str(item.get(k)) != str(v):
                    return False
            return True

        valid_cols = TABLE_COLUMNS.get(table, set())

        if self.is_supabase_connected and self.supabase:
            try:
                supabase_filters = {k: v for k, v in (filters or {}).items() if k in valid_cols}
                req = self.supabase.table(table).select("*")
                for k, v in supabase_filters.items():
                    req = req.eq(k, v)
                resp = req.execute()
                if resp.data:
                    data = resp.data
                    if filters and len(supabase_filters) < len(filters):
                        data = [item for item in data if filter_fn(item)]
                    return data
            except Exception as e:
                logger.warning(f"Supabase query failed for {table}: {e}")
        return local_db.query(table, filter_fn if filters else None)

    def delete(self, table: str, item_id: str) -> bool:
        if self.is_supabase_connected and self.supabase:
            try:
                self.supabase.table(table).delete().eq("id", item_id).execute()
            except Exception as e:
                logger.warning(f"Supabase delete failed: {e}")
        return local_db.delete(table, item_id)

db = DatabaseService()
