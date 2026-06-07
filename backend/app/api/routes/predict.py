from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from app.db.session import get_db
from app.db.models.prediction_result import Prediction
from app.services import contamination, lgbm_pipeline

router = APIRouter(prefix="/predict", tags=["prediction"])


class GeoPredictionRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    crop_group: str = Field("wheat", description="wheat | maize | barley | nuts | rye")
    sampling_point: str = Field("Primary production")
    date: str | None = Field(None, description="ISO date (unused, kept for compatibility)")

    model_config = {
        "json_schema_extra": {
            "example": {"lat": 48.8566, "lon": 2.3522, "crop_group": "wheat"}
        }
    }


class FullPredictionResponse(BaseModel):
    contamination_probability: float
    toxins: dict[str, float]
    accuracy: float
    risk_level: str
    weather: dict[str, Any]
    model_roc_auc: float
    source_file: str
    result_file: str
    generated_at: str


@router.post("/full", response_model=FullPredictionResponse)
async def predict_full(req: GeoPredictionRequest, db: AsyncSession = Depends(get_db)):
    """
    Unified prediction endpoint.

    Pipeline:
      1. Open-Meteo API — 61 days of hourly weather aggregated to daily
      2. Lag feature engineering (75 features matching LightGBM training)
      3. LightGBM — ZEN / DON / Aflatoxins probabilities
      4. Save result to PostgreSQL + CSV/JSON files
    """
    try:
        lgbm_result = await lgbm_pipeline.predict_toxins(req.lat, req.lon, req.crop_group)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {e}")

    result = contamination.run_unified(
        weather=lgbm_result["weather"],
        lat=req.lat,
        lon=req.lon,
        zen_probability=lgbm_result["ZEN"],
        don_probability=lgbm_result["DON"],
        afla_probability=lgbm_result["AFLA"],
    )

    db_row = Prediction(
        lat=req.lat,
        lon=req.lon,
        crop_group=req.crop_group,
        zen_probability=lgbm_result["ZEN"],
        don_probability=lgbm_result["DON"],
        afla_probability=lgbm_result["AFLA"],
        contamination_probability=result["contamination_probability"] / 100.0,
        risk_level=result["risk_level"],
        weather=lgbm_result["weather"],
    )
    db.add(db_row)
    await db.commit()

    return FullPredictionResponse(**result)
