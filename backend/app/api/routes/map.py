from datetime import date, timedelta, datetime

import os
from pathlib import Path

import httpx
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Request, Response
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
        .order_by(desc(ImportedRecord.imported_at))
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
                country_name=imported_record.location_country,
                crop_type=imported_record.crop_type,
                toxin_name=imported_record.toxin_name,
                risk_score=risk_score,
                risk_level=risk_level,
            )
        )

    return items


async def _fetch_open_meteo(lat: float, lon: float, days: int = 7) -> dict:
    """Fetch daily weather data for the past `days` days (inclusive) from Open-Meteo."""
    end = date.today()
    start = end - timedelta(days=max(days - 1, 0))

    url = "https://api.open-meteo.com/v1/forecast"
    # Request hourly temperature and humidity, and daily precipitation_sum
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "hourly": "temperature_2m,relativehumidity_2m",
        "daily": "precipitation_sum",
        "timezone": "UTC",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            resp = await client.get(url, params=params)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Error contacting Open-Meteo: {e}")

    if resp.status_code != 200:
        text = resp.text[:1000] if resp.text else ""
        raise HTTPException(status_code=502, detail=f"Open-Meteo error {resp.status_code}: {text}")

    try:
        data = resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Invalid JSON from Open-Meteo: {e}")
    # expected structure: data['daily']['time'], data['daily']['temperature_2m_max'], ...
    return data


@router.post("/weather")
async def weather_preview_and_save(payload: dict):
    """Endpoint to fetch weather for coordinates and optionally save CSV.

    Payload format:
    {
      "latitude": 48.5,
      "longitude": 2.3,
      "days": 7,
      "confirm": false
    }
    If `confirm` is true, a CSV will be written to `app/data/` and the filename returned.
    """
    try:
        lat = float(payload.get("latitude"))
        lon = float(payload.get("longitude"))
    except Exception:
        raise HTTPException(status_code=400, detail="latitude and longitude must be provided and numeric")

    days = int(payload.get("days", 1))
    confirm = bool(payload.get("confirm", False))

    try:
        data = await _fetch_open_meteo(lat, lon, days=days)

        # Expect hourly and daily in the response
        hourly = data.get("hourly") or {}
        daily = data.get("daily") or {}

        # Build hourly DataFrame and aggregate per day
        times_hr = hourly.get("time", [])
        temps = hourly.get("temperature_2m", [])
        hums = hourly.get("relativehumidity_2m", [])

        hr_rows = []
        for i, t in enumerate(times_hr):
            hr_rows.append({
                "time": t,
                "temperature_2m": _safe_get(hourly, "temperature_2m", i),
                "relativehumidity_2m": _safe_get(hourly, "relativehumidity_2m", i),
            })

        if hr_rows:
            hdf = pd.DataFrame(hr_rows)
            # parse times to date
            hdf["time"] = pd.to_datetime(hdf["time"], errors="coerce")
            hdf = hdf.dropna(subset=["time"]).reset_index(drop=True)
            hdf["date"] = hdf["time"].dt.date
            # convert to numeric
            hdf["temperature_2m"] = pd.to_numeric(hdf["temperature_2m"], errors="coerce")
            hdf["relativehumidity_2m"] = pd.to_numeric(hdf["relativehumidity_2m"], errors="coerce")
            grp = hdf.groupby("date")
            agg_df = grp.agg(
                temperature_2m_mean=("temperature_2m", "mean"),
                temperature_2m_max=("temperature_2m", "max"),
                temperature_2m_min=("temperature_2m", "min"),
                relative_humidity_2m_mean=("relativehumidity_2m", "mean"),
            ).reset_index()
        else:
            agg_df = pd.DataFrame(columns=["date", "temperature_2m_mean", "temperature_2m_max", "temperature_2m_min", "relative_humidity_2m_mean"])

        # daily precipitation and dates
        daily_dates = daily.get("time", [])
        daily_precip = daily.get("precipitation_sum", [])

        # Merge precipitation into agg_df by date
        precip_map = {pd.to_datetime(d).date(): v for d, v in zip(daily_dates, daily_precip)}

        rows = []
        for _, row in agg_df.iterrows():
            d = row["date"]
            rows.append({
                "date": d.isoformat(),
                "temperature_2m_mean": None if pd.isna(row["temperature_2m_mean"]) else float(row["temperature_2m_mean"]),
                "temperature_2m_max": None if pd.isna(row["temperature_2m_max"]) else float(row["temperature_2m_max"]),
                "temperature_2m_min": None if pd.isna(row["temperature_2m_min"]) else float(row["temperature_2m_min"]),
                "relative_humidity_2m_mean": None if pd.isna(row["relative_humidity_2m_mean"]) else float(row["relative_humidity_2m_mean"]),
                "precipitation_sum": precip_map.get(d, None),
                "latitude": lat,
                "longitude": lon,
            })

        # If no hourly aggregation was available, fallback to daily only
        if not rows and daily_dates:
            for i, d in enumerate(daily_dates):
                rows.append({
                    "date": d,
                    "temperature_2m_mean": None,
                    "temperature_2m_max": None,
                    "temperature_2m_min": None,
                    "relative_humidity_2m_mean": None,
                    "precipitation_sum": _safe_get(daily, "precipitation_sum", i),
                    "latitude": lat,
                    "longitude": lon,
                })

        df = pd.DataFrame(rows)

        # Keep only the most recent date row (latest available) as requested
        if not df.empty and "date" in df.columns:
            try:
                df["_date_parsed"] = pd.to_datetime(df["date"], errors="coerce")
                df = df.sort_values("_date_parsed").iloc[[-1]].drop(columns=["_date_parsed"]) 
            except Exception:
                df = df.tail(1)

        preview = {
            "n_rows": len(df),
            "aggregates": {
                "temperature_2m_mean": df["temperature_2m_mean"].astype(float).mean() if not df.empty and "temperature_2m_mean" in df.columns else None,
                "temperature_2m_max": df["temperature_2m_max"].astype(float).max() if not df.empty and "temperature_2m_max" in df.columns else None,
                "temperature_2m_min": df["temperature_2m_min"].astype(float).min() if not df.empty and "temperature_2m_min" in df.columns else None,
                "relative_humidity_2m_mean": df["relative_humidity_2m_mean"].astype(float).mean() if not df.empty and "relative_humidity_2m_mean" in df.columns else None,
                "precipitation_sum": df["precipitation_sum"].astype(float).sum() if not df.empty and "precipitation_sum" in df.columns else None,
            },
        }

        if confirm:
            # Save CSV into `app1/api/data` under the project root as requested.
            # Resolve project root and create app1/api/data if necessary.
            data_dir = Path(__file__).resolve().parents[3] / "app" / "api" / "data"
            data_dir.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
            filename = f"weather_{lat:.5f}_{lon:.5f}_{timestamp}.csv"
            filepath = data_dir / filename
            df.to_csv(filepath, index=False, encoding="utf-8")
            preview["saved"] = True
            preview["filename"] = str(filepath.name)

        preview["sample"] = df.head(5).to_dict(orient="records")

        return preview
    except HTTPException:
        raise
    except Exception as e:
        import traceback

        tb = traceback.format_exc()
        print("Error in weather_preview_and_save:", tb)
        raise HTTPException(status_code=502, detail=f"Internal error preparing weather CSV: {e}")


@router.options("/weather")
async def weather_options(request: Request):
    # Handle preflight OPTIONS requests explicitly and echo required CORS headers
    origin = request.headers.get("origin", "*")
    req_headers = request.headers.get("access-control-request-headers", "*")
    req_method = request.headers.get("access-control-request-method", "POST")
    headers = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": req_headers,
    }
    return Response(status_code=200, headers=headers)


def _safe_get(dct: dict, key: str, index: int):
    # Try several possible key variants to be robust to API naming
    candidates = [
        key,
        key.replace("relativehumidity", "relative_humidity"),
        key.replace("relative_humidity", "relativehumidity"),
        key.replace("_", ""),
        key.lower(),
    ]
    for k in candidates:
        vals = dct.get(k)
        if vals is None:
            continue
        try:
            return vals[index]
        except Exception:
            return None
    return None