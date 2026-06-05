from __future__ import annotations

import csv
from dataclasses import asdict, dataclass
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


def _to_float(value: Any) -> float | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_int(value: Any) -> int | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _to_datetime(value: Any) -> datetime | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    try:
        dt = pd.to_datetime(value, errors="coerce")
        if pd.isna(dt):
            return None
        if isinstance(dt, pd.Timestamp):
            return dt.to_pydatetime()
        if isinstance(dt, datetime):
            return dt
        if isinstance(dt, date):
            return datetime.combine(dt, datetime.min.time())
    except Exception:
        return None
    return None


def _clean_str(value: Any) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    s = str(value).strip()
    return s if s else None


def _row_to_imported_record(row: dict[str, Any]) -> ImportedRecord:
    return ImportedRecord(
        origin_country_code=_clean_str(row.get("origin_country_code")),
        origin_country_label_fr=_clean_str(row.get("origin_country_label_fr")),
        reporting_country_code=_clean_str(row.get("reporting_country_code")),
        reporting_country_name=_clean_str(row.get("reporting_country_name")),
        sample_country_code=_clean_str(row.get("sample_country_code")),
        sample_country_name=_clean_str(row.get("sample_country_name")),
        sample_date=_to_datetime(row.get("sample_date")),
        sample_year=_to_int(row.get("sample_year")),
        sample_month=_to_int(row.get("sample_month")),
        sample_day=_to_int(row.get("sample_day")),
        crop_group=_clean_str(row.get("crop_group")),
        product_name=_clean_str(row.get("product_name")),
        sampling_point=_clean_str(row.get("sampling_point")),
        param_name=_clean_str(row.get("param_name")),
        zen_detected=_to_bool(row.get("zen_detected")),
        zen_value_ug_kg=_to_float(row.get("zen_value_ug_kg")),
        lod_ug_kg=_to_float(row.get("lod_ug_kg")),
        loq_ug_kg=_to_float(row.get("loq_ug_kg")),
        result_status=_clean_str(row.get("result_status")),
        result_type=_clean_str(row.get("result_type")),
        origin_matches_reporting_country=_to_bool(row.get("origin_matches_reporting_country")),
        origin_matches_sample_country=_to_bool(row.get("origin_matches_sample_country")),
        sampling_strategy=_clean_str(row.get("sampling_strategy")),
        program_type=_clean_str(row.get("program_type")),
        sample_method=_clean_str(row.get("sample_method")),
        source_archive=_clean_str(row.get("source_archive")),
        source_file=_clean_str(row.get("source_file")),
        res_id_a=_clean_str(row.get("resId_A")),
        latitude=_to_float(row.get("latitude")),
        longitude=_to_float(row.get("longitude")),
        date=_to_datetime(row.get("date")),
        temperature_2m_mean=_to_float(row.get("temperature_2m_mean")),
        temperature_2m_max=_to_float(row.get("temperature_2m_max")),
        temperature_2m_min=_to_float(row.get("temperature_2m_min")),
        relative_humidity_2m_mean=_to_float(row.get("relative_humidity_2m_mean")),
        precipitation_sum=_to_float(row.get("precipitation_sum")),
        cloud_cover_mean=_to_float(row.get("cloud_cover_mean")),
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
        "origin_country_code",
        "sample_country_code",
        "latitude",
        "longitude",
        "sample_date",
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
            record = _row_to_imported_record(row)
            records_to_add.append(record)
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