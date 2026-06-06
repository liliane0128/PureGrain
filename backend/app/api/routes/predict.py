import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from typing import Optional
from app.schemas.batch import BatchPredictionResponse
from sqlalchemy import select, func, case, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models.imported_record import ImportedRecord
from app.db.models.prediction_result import Prediction
from app.services import weather_model

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
    weather: dict[str, float]
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
    try:
        ml_result = await weather_model.predict_geo(
            lat=req.lat, lon=req.lon,
            crop_group=req.crop_group,
            sampling_point=req.sampling_point,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Open-Meteo request failed: {e}")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    country_fr = weather_model._lat_lon_to_country(req.lat, req.lon)
    historical = await _historical_summary(db, country_fr)

    return GeoPredictionResponse(
        zen_probability=ml_result["zen_probability"],
        risk_level=ml_result["risk_level"],
        weather=ml_result["weather"],
        model_roc_auc=ml_result["model_roc_auc"],
        historical=historical,
    )


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
