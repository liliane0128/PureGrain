from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any

from app.services import contamination
from app.services import lgbm_pipeline

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
async def predict_full(req: GeoPredictionRequest):
    """
    Unified prediction endpoint.

    Pipeline:
      1. Open-Meteo API — 61 days of hourly weather aggregated to daily
      2. Lag feature engineering (75 features matching LightGBM training)
      3. LightGBM — ZEN (zearalenone) + DON (deoxynivalenol) probabilities
      4. FUM (fumonisines) mock based on temperature/humidity
      5. Save weather CSV + result JSON to api/data/
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
    )
    return FullPredictionResponse(**result)
