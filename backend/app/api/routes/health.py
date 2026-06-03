from fastapi import APIRouter
from pathlib import Path
from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    model_ready = Path(settings.model_path).exists()
    return {
        "status": "ok",
        "model_ready": model_ready,
        "version": settings.version,
    }
