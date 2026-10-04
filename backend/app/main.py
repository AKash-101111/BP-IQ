import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.config import settings
from backend.app.routers import projects, blueprints, analysis, rag, system

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("blueprintiq")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Uncertainty-Aware Blueprint-to-BOQ Intelligence Platform",
    version="1.0.0"
)

# CORS setup for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local storage directory for blueprints, marked images, and generated reports
app.mount("/storage", StaticFiles(directory=str(settings.STORAGE_PATH)), name="storage")

# Include Routers
app.include_router(projects.router, prefix=settings.API_V1_STR)
app.include_router(blueprints.router, prefix=settings.API_V1_STR)
app.include_router(analysis.router, prefix=settings.API_V1_STR)
app.include_router(rag.router, prefix=settings.API_V1_STR)
app.include_router(system.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "tagline": settings.TAGLINE,
        "status": "operational",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/system/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
