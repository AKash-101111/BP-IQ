import logging
from fastapi import APIRouter
from backend.app.services.ollama_client import ollama_client
from backend.app.services.db import db
from backend.app.services.storage import storage

router = APIRouter(prefix="/system", tags=["system"])

@router.get("/health")
async def health_check():
    ollama_status = await ollama_client.check_health()
    return {
        "status": "healthy",
        "app": "BlueprintIQ",
        "tagline": "Uncertainty-Aware Blueprint-to-BOQ Intelligence",
        "ollama": ollama_status,
        "supabase_database": {
            "connected": db.is_supabase_connected,
            "mode": "Supabase PostgreSQL" if db.is_supabase_connected else "Local Resilient Store"
        },
        "supabase_storage": {
            "connected": storage.is_supabase_connected,
            "mode": "Supabase Storage" if storage.is_supabase_connected else "Local Filesystem Store"
        }
    }
