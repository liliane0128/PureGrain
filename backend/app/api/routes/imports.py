from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.csv_import import import_csv

router = APIRouter(prefix="/imports", tags=["imports"])


@router.post("/csv")
async def upload_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        summary = await import_csv(file=file, db=db)
        return {
            "filename": summary.filename,
            "rows_read": summary.rows_read,
            "rows_inserted": summary.rows_inserted,
            "rows_skipped": summary.rows_skipped,
            "errors": summary.errors,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'import CSV: {e}")