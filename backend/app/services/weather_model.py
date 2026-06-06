"""
Weather-based ZEN risk model — loads model_weather.joblib and runs batch predictions.
Input format matches weather_added_1.csv (raw columns before any preprocessing).
"""
import io
from datetime import datetime, timezone
import httpx
import numpy as np
import pandas as pd
import joblib
from functools import lru_cache
from pathlib import Path

_OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

MODEL_PATH = Path(__file__).parent.parent / "data" / "model_weather.joblib"

# Columns to drop before prediction (leaky or irrelevant)
_DROP_COLS = [
    "zen_value_ug_kg", "result_status", "result_type",
    "lod_ug_kg", "loq_ug_kg", "param_name",
    "origin_matches_reporting_country", "origin_matches_sample_country",
    "product_name",
    "resId_A", "source_archive", "program_type", "sample_method", "source_file",
    "date", "sample_date",
    "origin_country_code", "reporting_country_code", "reporting_country_name",
    "sample_country_code", "sample_country_name",
    "zen_detected",
]

_CAT_COLS = ["origin_country_label_fr", "crop_group", "sampling_point", "sampling_strategy"]


@lru_cache(maxsize=1)
def _load() -> dict:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Weather model not found at {MODEL_PATH}. "
            "Re-run the training notebook to regenerate it."
        )
    return joblib.load(MODEL_PATH)


def _safe_encode(series: pd.Series, encoder) -> pd.Series:
    """LabelEncoder.transform with fallback to most-frequent class for unseen labels."""
    known = set(encoder.classes_)
    fallback = encoder.classes_[0]
    mapped = series.astype(str).map(lambda x: x if x in known else fallback)
    return pd.Series(encoder.transform(mapped), index=series.index)


def _prob_to_risk(p: float) -> str:
    if p < 0.33:
        return "GREEN"
    if p < 0.66:
        return "ORANGE"
    return "RED"


def _preprocess(df: pd.DataFrame) -> pd.DataFrame:
    artifact = _load()
    encoders = artifact["encoders"]
    feature_cols = artifact["feature_cols"]

    df = df.drop(columns=[c for c in _DROP_COLS if c in df.columns]).copy()

    df["month_sin"] = np.sin(2 * np.pi * df["sample_month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["sample_month"] / 12)
    df["temp_x_humidity"] = (
        df["temperature_2m_mean"] * df["relative_humidity_2m_mean"] / 100
    )
    df["temp_range"] = df["temperature_2m_max"] - df["temperature_2m_min"]

    for col in _CAT_COLS:
        if col in df.columns and col in encoders:
            df[col] = _safe_encode(df[col], encoders[col])

    missing = [c for c in feature_cols if c not in df.columns]
    if missing:
        raise KeyError(f"Missing columns in CSV: {missing}")

    return df[feature_cols]


def _lat_lon_to_country(lat: float, lon: float) -> str:
    """Rough bounding-box mapping to training-data countries."""
    if 45.7 < lat < 48.6 and 16.1 < lon < 22.9:
        return "Hongrie"
    if 48.5 < lat < 51.1 and 12.1 < lon < 18.9:
        return "Tchequie"
    if 47.7 < lat < 49.7 and 16.8 < lon < 22.6:
        return "Slovaquie"
    if 54.5 < lat < 57.8 and 8.0 < lon < 15.2:
        return "Danemark"
    if 57.5 < lat < 59.7 and 21.7 < lon < 28.2:
        return "Estonie"
    if 53.8 < lat < 56.5 and 20.9 < lon < 26.8:
        return "Lituanie"
    return "Hongrie"  # nearest-centroid fallback for out-of-range coords


async def _fetch_daily_weather(lat: float, lon: float) -> dict:
    """Fetch last 24 h from Open-Meteo and aggregate to daily stats."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m,relative_humidity_2m,precipitation,cloud_cover",
        "past_days": 1,
        "forecast_days": 0,
        "timezone": "auto",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(_OPEN_METEO_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    def last24(values: list) -> list:
        clean = [v for v in values if v is not None]
        return clean[-24:] if len(clean) >= 24 else clean

    temps = last24(data["hourly"]["temperature_2m"])
    humids = last24(data["hourly"]["relative_humidity_2m"])
    precips = last24(data["hourly"]["precipitation"])
    clouds = last24(data["hourly"]["cloud_cover"])

    if not temps or not humids:
        raise ValueError("Open-Meteo returned insufficient data for these coordinates.")

    return {
        "temperature_2m_mean": round(sum(temps) / len(temps), 2),
        "temperature_2m_max": round(max(temps), 2),
        "temperature_2m_min": round(min(temps), 2),
        "relative_humidity_2m_mean": round(sum(humids) / len(humids), 2),
        "precipitation_sum": round(sum(precips), 2) if precips else 0.0,
        "cloud_cover_mean": round(sum(clouds) / len(clouds), 2) if clouds else 50.0,
    }


async def predict_geo(
    lat: float,
    lon: float,
    crop_group: str = "maize",
    sampling_point: str = "Primary production",
) -> dict:
    """Single-location prediction: fetch today's weather then run the model."""
    weather = await _fetch_daily_weather(lat, lon)
    today = datetime.now(timezone.utc)

    df = pd.DataFrame([{
        "origin_country_label_fr": _lat_lon_to_country(lat, lon),
        "sample_year": today.year,
        "sample_month": today.month,
        "sample_day": today.day,
        "crop_group": crop_group,
        "sampling_point": sampling_point,
        "sampling_strategy": "Selective sampling",
        "latitude": lat,
        "longitude": lon,
        **weather,
    }])

    artifact = _load()
    X = _preprocess(df)
    prob = float(artifact["model"].predict_proba(X)[0, 1])

    return {
        "zen_probability": round(prob, 4),
        "risk_level": _prob_to_risk(prob),
        "weather": weather,
        "model_roc_auc": round(artifact["roc_auc"], 3),
    }


def predict_csv(csv_bytes: bytes) -> dict:
    artifact = _load()
    clf = artifact["model"]
    roc_auc = artifact["roc_auc"]

    df_raw = pd.read_csv(io.BytesIO(csv_bytes))
    X = _preprocess(df_raw)
    probs = clf.predict_proba(X)[:, 1]

    predictions = [
        {
            "row_index": int(i),
            "zen_probability": round(float(p), 4),
            "risk_level": _prob_to_risk(p),
        }
        for i, p in enumerate(probs)
    ]

    risk_counts = {"GREEN": 0, "ORANGE": 0, "RED": 0}
    for pred in predictions:
        risk_counts[pred["risk_level"]] += 1

    return {
        "total": len(df_raw),
        "detected_count": int((probs >= 0.5).sum()),
        "risk_summary": risk_counts,
        "model_roc_auc": round(roc_auc, 3),
        "predictions": predictions,
    }
