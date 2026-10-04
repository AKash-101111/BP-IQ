import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
BLUEPRINTS_DIR = STORAGE_DIR / "blueprints"
MARKED_DIR = STORAGE_DIR / "marked"
REPORTS_DIR = STORAGE_DIR / "reports"

for dir_path in [STORAGE_DIR, BLUEPRINTS_DIR, MARKED_DIR, REPORTS_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    PROJECT_NAME: str = "BlueprintIQ"
    TAGLINE: str = "Uncertainty-Aware Blueprint-to-BOQ Intelligence"
    API_V1_STR: str = "/api"
    
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    
    # Ollama Configuration - strictly Gemma 2B
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "gemma:2b")
    OLLAMA_TIMEOUT: float = float(os.getenv("OLLAMA_TIMEOUT", "60.0"))
    
    # Local Storage directories
    STORAGE_PATH: Path = STORAGE_DIR
    BLUEPRINTS_PATH: Path = BLUEPRINTS_DIR
    MARKED_PATH: Path = MARKED_DIR
    REPORTS_PATH: Path = REPORTS_DIR

settings = Settings()
