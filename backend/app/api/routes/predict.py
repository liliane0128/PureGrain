import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.prediction import (
    PredictionRequest, PredictionResponse,
    FeatureImportanceResponse, WeatherWindow,
)
from app.schemas.weather import AutoPredictionRequest, AutoPredictionResponse
from app.services import prediction as svc
from app.services.weather import fetch_weather
from app.db.session import get_db
from app.db.models import SensorReading as SensorReadingModel, Prediction, Parcelle

router = APIRouter(prefix="/predict", tags=["prediction"])


@router.post("/", response_model=PredictionResponse)
async def predict(
    req: PredictionRequest,
    parcelle_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Sensor data + manual weather windows -> risk prediction (GREEN / ORANGE / RED).
    Pass parcelle_id to persist the reading and result to the database.
    """
    try:
        result = svc.predict(req)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    if parcelle_id is not None:
        await _persist(db, parcelle_id, req, result)

    return result


@router.post("/auto", response_model=AutoPredictionResponse)
async def predict_auto(
    parcelle_id: int,
    req: AutoPredictionRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Sensor data + parcelle_id only.
    Weather data for the past 48h is fetched automatically from Open-Meteo
    using the parcelle's coordinates. The parcelle must have latitude/longitude set.
    """
    parcelle = await db.get(Parcelle, parcelle_id)
    if not parcelle:
        raise HTTPException(status_code=404, detail="Parcelle not found.")
    if parcelle.latitude is None or parcelle.longitude is None:
        raise HTTPException(
            status_code=422,
            detail="This parcelle has no coordinates. "
                   "Set latitude/longitude via PATCH /api/v1/parcelles/{id} first.",
        )

    try:
        weather = await fetch_weather(parcelle.latitude, parcelle.longitude)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Open-Meteo request failed: {e}")
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))

    full_req = PredictionRequest(
        sensor=req.sensor,
        weather_24h=WeatherWindow(
            temperature_mean=weather.window_24h.temperature_mean,
            humidity_mean=weather.window_24h.humidity_mean,
            temperature_max=weather.window_24h.temperature_max,
            temperature_min=weather.window_24h.temperature_min,
        ),
        weather_48h=WeatherWindow(
            temperature_mean=weather.window_48h.temperature_mean,
            humidity_mean=weather.window_48h.humidity_mean,
            temperature_max=weather.window_48h.temperature_max,
            temperature_min=weather.window_48h.temperature_min,
        ),
        temperature_current=weather.current_temperature,
        humidity_current=weather.current_humidity,
        days_since_harvest=req.days_since_harvest,
    )

    try:
        result = svc.predict(full_req)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    await _persist(db, parcelle_id, full_req, result)

    return AutoPredictionResponse(
        **result.model_dump(),
        weather_fetched_at=weather.fetched_at,
        current_temperature=weather.current_temperature,
        current_humidity=weather.current_humidity,
        temp_mean_24h=weather.window_24h.temperature_mean,
        humidity_mean_24h=weather.window_24h.humidity_mean,
        temp_mean_48h=weather.window_48h.temperature_mean,
        humidity_mean_48h=weather.window_48h.humidity_mean,
    )


@router.get("/features/importance", response_model=FeatureImportanceResponse)
def feature_importance():
    """Random Forest feature importances for model transparency."""
    try:
        return svc.get_feature_importance()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


async def _persist(db, parcelle_id: int, req: PredictionRequest, result):
    """Write sensor reading and prediction result to the database."""
    reading = SensorReadingModel(
        parcelle_id=parcelle_id,
        zen_ppb=req.sensor.zen_ppb,
        grain_moisture_pct=req.sensor.grain_moisture_pct,
        temperature_current=req.temperature_current,
        humidity_current=req.humidity_current,
        temp_mean_24h=req.weather_24h.temperature_mean,
        humidity_mean_24h=req.weather_24h.humidity_mean,
        temp_max_24h=req.weather_24h.temperature_max,
        temp_min_24h=req.weather_24h.temperature_min,
        temp_mean_48h=req.weather_48h.temperature_mean,
        humidity_mean_48h=req.weather_48h.humidity_mean,
        temp_max_48h=req.weather_48h.temperature_max,
        temp_min_48h=req.weather_48h.temperature_min,
        days_since_harvest=req.days_since_harvest,
    )
    db.add(reading)
    await db.flush()

    db.add(Prediction(
        sensor_reading_id=reading.id,
        risk_level=result.risk_level.value,
        risk_score=result.risk_score,
        storage_recommendation=result.storage_recommendation.value,
        prob_green=result.probabilities["GREEN"],
        prob_orange=result.probabilities["ORANGE"],
        prob_red=result.probabilities["RED"],
        top_factors=[f.model_dump() for f in result.top_factors],
    ))
    await db.commit()
