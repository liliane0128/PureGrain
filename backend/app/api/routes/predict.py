import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from typing import Optional, Any
from app.schemas.batch import BatchPredictionResponse
from sqlalchemy import select, func, case, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models.imported_record import ImportedRecord
from app.db.models.prediction_result import Prediction
from app.services import weather_model
from app.services import contamination
from app.services.prediction_service import predict_risks_from_csv
from app.services.prediction_service import predict_risks_from_features

router = APIRouter(prefix="/predict", tags=["prediction"])

# French country names (from weather model) → search terms for DB lookup
_COUNTRY_ALIASES: dict[str, list[str]] = {
    "Hongrie":    ["hungary", "hungari", "hongrie"],
    "Tchequie":   ["czech", "tchequie", "czechia"],
    "Slovaquie":  ["slovakia", "slovaquie", "slovak"],
    "Danemark":   ["denmark", "danemark"],
    "Estonie":    ["estonia", "estonie"],
    "Lituanie":   ["lithuania", "lituanie"],
}


class HistoricalSummary(BaseModel):
    country: str
    total_records: int
    detection_rate: float
    avg_toxin_ug_kg: float | None
    top_fungal_species: str | None
    avg_risk_score: float | None


class GeoPredictionResponse(BaseModel):
    zen_probability: float
    risk_level: str
    weather: dict[str, Any]
    model_roc_auc: float
    historical: HistoricalSummary


async def _historical_summary(db: AsyncSession, country_fr: str) -> HistoricalSummary:
    terms = _COUNTRY_ALIASES.get(country_fr, [country_fr.lower()])
    conditions = [ImportedRecord.location_country.ilike(f"%{t}%") for t in terms]
    country_filter = or_(*conditions)

    # Aggregation: count, detection rate, avg toxin, avg risk score
    agg = (
        select(
            func.count(ImportedRecord.id).label("total"),
            func.sum(
                case((ImportedRecord.toxin_detected == True, 1), else_=0)
            ).label("detected"),
            func.avg(ImportedRecord.toxin_value_standardized_ug_kg).label("avg_toxin"),
            func.avg(Prediction.risk_score).label("avg_risk"),
        )
        .outerjoin(Prediction, Prediction.imported_record_id == ImportedRecord.id)
        .where(country_filter)
    )
    row = (await db.execute(agg)).first()
    total = row.total or 0
    detected = row.detected or 0
    avg_toxin = float(row.avg_toxin) if row.avg_toxin is not None else None
    avg_risk = float(row.avg_risk) if row.avg_risk is not None else None

    # Top fungal species
    top_species_row = (
        await db.execute(
            select(ImportedRecord.fungal_species, func.count().label("n"))
            .where(country_filter, ImportedRecord.fungal_species.isnot(None))
            .group_by(ImportedRecord.fungal_species)
            .order_by(func.count().desc())
            .limit(1)
        )
    ).first()
    top_species = top_species_row.fungal_species if top_species_row else None

    return HistoricalSummary(
        country=country_fr,
        total_records=total,
        detection_rate=round(detected / total, 3) if total > 0 else 0.0,
        avg_toxin_ug_kg=round(avg_toxin, 2) if avg_toxin is not None else None,
        top_fungal_species=top_species,
        avg_risk_score=round(avg_risk, 3) if avg_risk is not None else None,
    )


class GeoPredictionRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    crop_group: str = Field("maize", description="maize | wheat | generic_cereal")
    sampling_point: str = Field("Primary production")
    date: str | None = Field(None, description="ISO date string (YYYY-MM-DD) to use as sample_date")

    model_config = {
        "json_schema_extra": {
            "example": {"lat": 48.8566, "lon": 2.3522, "crop_group": "wheat"}
        }
    }


@router.post("/geo", response_model=GeoPredictionResponse)
async def predict_geo(
    req: GeoPredictionRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    GPS coordinates → Open-Meteo weather → ML prediction (ROC-AUC 0.90)
    + historical toxin records for the same country from the imported dataset.
    """
    # No external API calls: build features from date/lat/lon and run per-strain models
    features = {"date": req.date, "lat": req.lat, "lon": req.lon}
    try:
        per_strain = await predict_risks_from_features(features)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Aggregate a single ZEN-like probability and ROC-AUC for backward compatibility
    probs = [v["incertitude"] / 100.0 for v in per_strain.values() if v.get("incertitude") is not None]
    accs = [v["accuracy"] for v in per_strain.values() if v.get("accuracy") is not None]
    zen_prob = float(sum(probs) / len(probs)) if probs else 0.0
    roc_auc = float(sum(accs) / len(accs) / 100.0) if accs else 0.0

    country_fr = weather_model._lat_lon_to_country(req.lat, req.lon)
    historical = await _historical_summary(db, country_fr)

    weather_minimal = {"date": req.date, "latitude": req.lat, "longitude": req.lon}

    return GeoPredictionResponse(
        zen_probability=zen_prob,
        risk_level=("GREEN" if zen_prob < 0.33 else ("ORANGE" if zen_prob < 0.66 else "RED")),
        weather=weather_minimal,
        model_roc_auc=roc_auc,
        historical=historical,
    )


class SensorPredictionRequest(BaseModel):
    weather_file: str | None = Field(
        None,
        description="Filename in api/data/, e.g. 'weather_48.50000_2.30000_20260606T170516Z.json'",
    )
    lat: float | None = Field(None, ge=-90, le=90, description="Auto-find latest file for these coords")
    lon: float | None = Field(None, ge=-180, le=180)

    model_config = {
        "json_schema_extra": {
            "example": {"lat": 48.5, "lon": 2.3}
        }
    }


class SensorPredictionResponse(BaseModel):
    contamination_probability: float
    accuracy: float
    source_file: str
    result_file: str
    generated_at: str


@router.post("/sensor", response_model=SensorPredictionResponse)
async def predict_sensor(req: SensorPredictionRequest):
    """
    Run the aptamer/biosensor model on a saved weather JSON file.
    Pass either `weather_file` (explicit filename) or `lat`+`lon` to auto-select
    the most recent weather file for those coordinates.

    Returns contamination_probability (%) and model accuracy (%), and writes a
    prediction_result_*.json file to api/data/.
    """
    filename = req.weather_file

    if filename is None:
        if req.lat is None or req.lon is None:
            raise HTTPException(
                status_code=422,
                detail="Provide either 'weather_file' or both 'lat' and 'lon'.",
            )
        filename = contamination.latest_weather_file(req.lat, req.lon)
        if filename is None:
            raise HTTPException(
                status_code=404,
                detail=f"No weather file found for lat={req.lat}, lon={req.lon}. "
                       "Provide a weather file in api/data/ or call /predict/risks/geo to compute risks directly.",
            )

    try:
        result = contamination.run(filename)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return SensorPredictionResponse(**result)


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
    Unified endpoint: fetches weather → runs ZEN (real Random Forest) + DON & FUM (mock)
    → saves CSV + result JSON → returns full payload.

    contamination_probability : weighted average of ZEN / DON / FUM (%)
    toxins                    : per-toxin breakdown (%)
    accuracy                  : weighted accuracy (ZEN real ROC-AUC, DON/FUM mock)
    """
    # Build features using only date/lat/lon and run per-strain models
    features = {"date": req.date, "lat": req.lat, "lon": req.lon}
    try:
        per_strain = await predict_risks_from_features(features)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    probs = [v["incertitude"] / 100.0 for v in per_strain.values() if v.get("incertitude") is not None]
    accs = [v["accuracy"] for v in per_strain.values() if v.get("accuracy") is not None]
    zen_prob = float(sum(probs) / len(probs)) if probs else 0.0
    roc_auc = float(sum(accs) / len(accs) / 100.0) if accs else 0.0

    # Use a minimal weather dict (run_unified uses defaults for missing keys)
    weather_minimal = {"date": req.date}
    result = contamination.run_unified(
        weather=weather_minimal,
        lat=req.lat,
        lon=req.lon,
        zen_probability=zen_prob,
        zen_roc_auc=roc_auc,
    )
    return FullPredictionResponse(**result)


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


@router.post("/risks")
async def predict_risks(
    file: UploadFile = File(..., description="CSV with features for prediction"),
    db: AsyncSession = Depends(get_db),
):
    """Return per-strain contamination risks and model accuracies for an uploaded CSV."""
    if not (file.filename or "").endswith(".csv"):
        raise HTTPException(status_code=422, detail="Uploaded file must be a .csv")
    content = await file.read()
    try:
        resp = await predict_risks_from_csv(content, db)
        return resp
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class RisksGeoRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    date: str | None = Field(None, description="ISO date string (e.g. 2026-06-07) to use as input for models")


@router.post("/risks/geo")
async def predict_risks_geo(req: RisksGeoRequest):
    """Given lat/lon and a date, run per-strain models using only these features (no external API calls).

    The feature contract is: `date` (ISO string), `lat`, `lon`.
    """
    # Build feature dict expected by prediction_service; models should accept these columns.
    features = {
        'date': req.date,
        'lat': req.lat,
        'lon': req.lon,
    }

    try:
        resp = await predict_risks_from_features(features)
        return resp
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
