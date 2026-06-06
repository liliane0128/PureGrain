import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field

from app.schemas.prediction import (
    PredictionRequest, PredictionResponse,
    FeatureImportanceResponse,
)
from app.schemas.batch import BatchPredictionResponse
from app.services import prediction as svc
from app.services import weather_model

router = APIRouter(prefix="/predict", tags=["prediction"])


class GeoPredictionRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    crop_group: str = Field("maize", description="maize | wheat | generic_cereal")
    sampling_point: str = Field("Primary production")

    model_config = {
        "json_schema_extra": {
            "example": {
                "lat": 48.8566, "lon": 2.3522,
                "crop_group": "wheat", "sampling_point": "Primary production",
            }
        }
    }


class GeoPredictionResponse(BaseModel):
    zen_probability: float
    risk_level: str
    weather: dict[str, float]
    model_roc_auc: float


@router.post("/", response_model=PredictionResponse)
async def predict(req: PredictionRequest):
    """Sensor data + manual weather windows -> risk prediction (GREEN / ORANGE / RED)."""
    try:
        return svc.predict(req)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/geo", response_model=GeoPredictionResponse)
async def predict_geo(req: GeoPredictionRequest):
    """GPS coordinates -> Open-Meteo weather -> ZEN risk prediction (no sensor required)."""
    try:
        return await weather_model.predict_geo(
            lat=req.lat,
            lon=req.lon,
            crop_group=req.crop_group,
            sampling_point=req.sampling_point,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Open-Meteo request failed: {e}")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/batch", response_model=BatchPredictionResponse)
async def predict_batch(
    file: UploadFile = File(..., description="CSV — same format as weather_added_1.csv"),
):
    """Batch ZEN-risk prediction from a CSV upload (weather-based Random Forest)."""
    if not (file.filename or "").endswith(".csv"):
        raise HTTPException(status_code=422, detail="Uploaded file must be a .csv")
    try:
        content = await file.read()
        return weather_model.predict_csv(content)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except KeyError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to process CSV: {e}")


@router.get("/features/importance", response_model=FeatureImportanceResponse)
def feature_importance():
    """Random Forest feature importances for model transparency."""
    try:
        return svc.get_feature_importance()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
