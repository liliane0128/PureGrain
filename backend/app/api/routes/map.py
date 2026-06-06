from fastapi import APIRouter, Depends
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models.imported_record import ImportedRecord
from app.db.models.prediction_result import Prediction
from app.schemas.imported_record import MapDataItem

router = APIRouter(prefix="/map", tags=["map"])


def _risk_level_from_score(score: float | None) -> str | None:
    if score is None:
        return None
    if score >= 0.8:
        return "high"
    if score >= 0.5:
        return "medium"
    return "low"


@router.get("/data", response_model=list[MapDataItem])
async def get_map_data(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(ImportedRecord, Prediction)
        .outerjoin(Prediction, Prediction.imported_record_id == ImportedRecord.id)
        .where(ImportedRecord.latitude.isnot(None))
        .where(ImportedRecord.longitude.isnot(None))
        .order_by(desc(ImportedRecord.sample_date).nullslast())
        .limit(5000)
    )

    result = await db.execute(stmt)
    rows = result.all()

    items: list[MapDataItem] = []

    for imported_record, prediction in rows:
        risk_score = getattr(prediction, "risk_score", None)
        risk_level = getattr(prediction, "risk_level", None) or _risk_level_from_score(risk_score)

        items.append(
            MapDataItem(
                id=imported_record.id,
                country_name=(
                    imported_record.sample_country_name
                    or imported_record.reporting_country_name
                    or imported_record.origin_country_label_fr
                ),
                latitude=imported_record.latitude,
                longitude=imported_record.longitude,
                crop_group=imported_record.crop_group,
                product_name=imported_record.product_name,
                zen_value_ug_kg=imported_record.zen_value_ug_kg,
                risk_score=risk_score,
                risk_level=risk_level,
                sample_date=imported_record.sample_date,
            )
        )

    return items