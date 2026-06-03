from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models import Parcelle, Prediction, SensorReading
from app.schemas.parcelle import ParcelleCreate, ParcelleUpdate, ParcelleRead, PredictionHistoryItem

router = APIRouter(prefix="/parcelles", tags=["parcelles"])


@router.post("/", response_model=ParcelleRead, status_code=201)
async def create_parcelle(body: ParcelleCreate, db: AsyncSession = Depends(get_db)):
    parcelle = Parcelle(**body.model_dump())
    db.add(parcelle)
    await db.commit()
    await db.refresh(parcelle)
    return parcelle


@router.get("/", response_model=list[ParcelleRead])
async def list_parcelles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Parcelle).order_by(Parcelle.created_at.desc()))
    return result.scalars().all()


@router.get("/{parcelle_id}", response_model=ParcelleRead)
async def get_parcelle(parcelle_id: int, db: AsyncSession = Depends(get_db)):
    parcelle = await db.get(Parcelle, parcelle_id)
    if not parcelle:
        raise HTTPException(status_code=404, detail="Parcelle introuvable")
    return parcelle


@router.patch("/{parcelle_id}", response_model=ParcelleRead)
async def update_parcelle(
    parcelle_id: int, body: ParcelleUpdate, db: AsyncSession = Depends(get_db)
):
    parcelle = await db.get(Parcelle, parcelle_id)
    if not parcelle:
        raise HTTPException(status_code=404, detail="Parcelle introuvable")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(parcelle, field, value)
    await db.commit()
    await db.refresh(parcelle)
    return parcelle


@router.delete("/{parcelle_id}", status_code=204)
async def delete_parcelle(parcelle_id: int, db: AsyncSession = Depends(get_db)):
    parcelle = await db.get(Parcelle, parcelle_id)
    if not parcelle:
        raise HTTPException(status_code=404, detail="Parcelle introuvable")
    await db.delete(parcelle)
    await db.commit()


@router.get("/{parcelle_id}/history", response_model=list[PredictionHistoryItem])
async def get_prediction_history(parcelle_id: int, db: AsyncSession = Depends(get_db)):
    """Historique des prédictions pour une parcelle."""
    stmt = (
        select(Prediction)
        .join(SensorReading, Prediction.sensor_reading_id == SensorReading.id)
        .where(SensorReading.parcelle_id == parcelle_id)
        .order_by(Prediction.predicted_at.desc())
        .limit(50)
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [
        PredictionHistoryItem(
            id=p.id,
            risk_level=p.risk_level,
            risk_score=p.risk_score,
            storage_recommendation=p.storage_recommendation,
            zen_ppb=p.sensor_reading.zen_ppb if p.sensor_reading else 0,
            predicted_at=p.predicted_at,
        )
        for p in rows
    ]
