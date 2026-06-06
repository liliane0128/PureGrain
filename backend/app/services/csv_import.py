from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, date
from io import StringIO
from typing import Any

import pandas as pd
from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.imported_record import ImportedRecord


@dataclass
class ImportSummary:
    filename: str
    rows_read: int
    rows_inserted: int
    rows_skipped: int
    errors: list[str]


def _clean_str(value: Any) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    s = str(value).strip()
    if s in {"", "None", "nan", "NaN"}:
        return None
    return s


def _to_int(value: Any) -> int | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _to_float(value: Any) -> float | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_bool(value: Any) -> bool | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    if isinstance(value, bool):
        return value
    s = str(value).strip().lower()
    if s in {"yes", "y", "true", "1", "oui"}:
        return True
    if s in {"no", "n", "false", "0", "non"}:
        return False
    return None


def _to_datetime(value: Any) -> datetime | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    dt = pd.to_datetime(value, errors="coerce")
    if pd.isna(dt):
        return None
    if isinstance(dt, pd.Timestamp):
        return dt.to_pydatetime()
    if isinstance(dt, datetime):
        return dt
    if isinstance(dt, date):
        return datetime.combine(dt, datetime.min.time())
    return None


def _to_json_text(value: Any) -> str | None:
    s = _clean_str(value)
    if not s:
        return None
    try:
        parsed = json.loads(s)
        return json.dumps(parsed, ensure_ascii=False)
    except Exception:
        return s


def _row_to_imported_record(row: dict[str, Any]) -> ImportedRecord:
    return ImportedRecord(
        sample_id=_clean_str(row.get("sample_id")),
        source_dataset=_clean_str(row.get("source_dataset")),
        crop_type=_clean_str(row.get("crop_type")),
        location_country=_clean_str(row.get("location_country")),
        location_continent=_clean_str(row.get("location_continent")),
        timestamp=_to_datetime(row.get("timestamp")),
        sample_year=_to_int(row.get("sample_year")),
        toxin_name=_clean_str(row.get("toxin_name")),
        toxin_value_raw=_clean_str(row.get("toxin_value_raw")),
        toxin_unit=_clean_str(row.get("toxin_unit")),
        toxin_value_standardized_ug_kg=_to_float(row.get("toxin_value_standardized_ug_kg")),
        toxin_detected=_to_bool(row.get("toxin_detected")),
        fungal_species=_clean_str(row.get("fungal_species")),
        association_type=_clean_str(row.get("association_type")),
        original_metadata=_to_json_text(row.get("original_metadata")),
    )


async def import_csv(file: UploadFile, db: AsyncSession, batch_size: int = 1000) -> ImportSummary:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Le fichier doit être un CSV.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Le fichier est vide.")

    try:
        df = pd.read_csv(StringIO(content.decode("utf-8")))
    except UnicodeDecodeError:
        df = pd.read_csv(StringIO(content.decode("latin-1")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV invalide: {e}")

    required_columns = [
        "sample_id",
        "source_dataset",
        "crop_type",
        "location_country",
        "location_continent",
        "timestamp",
        "sample_year",
        "toxin_name",
        "toxin_value_raw",
        "toxin_unit",
        "toxin_value_standardized_ug_kg",
        "toxin_detected",
        "fungal_species",
        "association_type",
        "original_metadata",
    ]
    missing = [c for c in required_columns if c not in df.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"Colonnes manquantes: {missing}")

    rows_read = len(df)
    rows_inserted = 0
    rows_skipped = 0
    errors: list[str] = []
    records_to_add: list[ImportedRecord] = []

    for i, row in enumerate(df.to_dict(orient="records"), start=1):
        try:
            records_to_add.append(_row_to_imported_record(row))
        except Exception as e:
            rows_skipped += 1
            errors.append(f"Ligne {i}: {e}")

        if len(records_to_add) >= batch_size:
            db.add_all(records_to_add)
            await db.flush()
            rows_inserted += len(records_to_add)
            records_to_add.clear()

    if records_to_add:
        db.add_all(records_to_add)
        await db.flush()
        rows_inserted += len(records_to_add)

    await db.commit()

    return ImportSummary(
        filename=file.filename,
        rows_read=rows_read,
        rows_inserted=rows_inserted,
        rows_skipped=rows_skipped,
        errors=errors[:50],
    )