import os
import shutil
import logging
from pathlib import Path
from typing import Optional, Tuple
from backend.app.config import settings

logger = logging.getLogger("blueprintiq.storage")

class StorageService:
    def __init__(self):
        self.settings = settings
        self.supabase = None
        self.is_supabase_connected = False
        key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY
        if settings.SUPABASE_URL and key:
            try:
                from supabase import create_client
                self.supabase = create_client(settings.SUPABASE_URL, key)
                self.is_supabase_connected = True
                self._ensure_buckets()
            except Exception as e:
                logger.warning(f"Supabase storage init failed: {e}. Using local storage.")
                self.supabase = None
                self.is_supabase_connected = False

    def _ensure_buckets(self):
        if not self.supabase:
            return
        buckets = ["blueprints", "marked-blueprints", "reports"]
        try:
            existing = [b.name for b in self.supabase.storage.list_buckets()]
            for b in buckets:
                if b not in existing:
                    try:
                        self.supabase.storage.create_bucket(b, options={"public": True})
                    except Exception:
                        pass
        except Exception as e:
            logger.warning(f"Failed to ensure Supabase buckets: {e}")

    def save_blueprint(self, filename: str, content: bytes) -> Tuple[str, str]:
        """Saves uploaded blueprint. Returns (relative_path_or_url, absolute_local_path)"""
        safe_name = f"{filename}"
        local_path = settings.BLUEPRINTS_PATH / safe_name
        with open(local_path, "wb") as f:
            f.write(content)
        
        file_url = f"/storage/blueprints/{safe_name}"
        if self.is_supabase_connected and self.supabase:
            try:
                self.supabase.storage.from_("blueprints").upload(
                    safe_name, content, file_options={"content-type": "application/octet-stream"}
                )
                file_url = self.supabase.storage.from_("blueprints").get_public_url(safe_name)
            except Exception as e:
                logger.warning(f"Supabase upload failed for blueprint {safe_name}: {e}")
        
        return file_url, str(local_path)

    def save_page_image(self, blueprint_id: str, page_num: int, image_bytes: bytes, marked: bool = False) -> Tuple[str, str]:
        prefix = "marked_" if marked else "page_"
        filename = f"{blueprint_id}_{prefix}{page_num}.png"
        target_dir = settings.MARKED_PATH if marked else settings.BLUEPRINTS_PATH
        local_path = target_dir / filename
        with open(local_path, "wb") as f:
            f.write(image_bytes)

        bucket_name = "marked-blueprints" if marked else "blueprints"
        url_dir = "marked" if marked else "blueprints"
        file_url = f"/storage/{url_dir}/{filename}"

        if self.is_supabase_connected and self.supabase:
            try:
                self.supabase.storage.from_(bucket_name).upload(
                    filename, image_bytes, file_options={"content-type": "image/png"}
                )
                file_url = self.supabase.storage.from_(bucket_name).get_public_url(filename)
            except Exception as e:
                logger.warning(f"Supabase upload failed for {filename}: {e}")

        return file_url, str(local_path)

    def save_report(self, project_id: str, report_bytes: bytes, extension: str = "pdf") -> Tuple[str, str]:
        filename = f"report_{project_id}.{extension}"
        local_path = settings.REPORTS_PATH / filename
        with open(local_path, "wb") as f:
            f.write(report_bytes)

        file_url = f"/storage/reports/{filename}"
        if self.is_supabase_connected and self.supabase:
            try:
                content_type = "application/pdf" if extension == "pdf" else "application/json"
                self.supabase.storage.from_("reports").upload(
                    filename, report_bytes, file_options={"content-type": content_type}
                )
                file_url = self.supabase.storage.from_("reports").get_public_url(filename)
            except Exception as e:
                logger.warning(f"Supabase upload failed for {filename}: {e}")

        return file_url, str(local_path)

storage = StorageService()
