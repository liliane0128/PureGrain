"""
LightGBM toxin prediction pipeline.

Flow: Open-Meteo (61 days hourly → daily) → lag features → LightGBM → ZEN + DON probabilities.
FUM is not in the model and is handled separately by a mock in contamination.py.
"""
import asyncio
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

import httpx
import pandas as pd

MODEL_PATH = Path(__file__).parent.parent / "data" / "toxin_detection_classifier.txt"
_OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

_LAGS = (1, 2, 3, 7, 14, 30, 60)
_WEATHER_COLS = [
    "temperature_2m_mean",
    "temperature_2m_max",
    "temperature_2m_min",
    "relative_humidity_2m_mean",
    "precipitation_sum",
]
_TOXIN_DUMMIES = [
    "toxin_name_deoxynivalenol",
    "toxin_name_ochratoxin",
    "toxin_name_other",
    "toxin_name_trichothecenes",
    "toxin_name_zearalenone",
]

# wheat / maize / barley are the model baseline (all crop dummies = 0)
_CROP_MAP: dict[str, dict[str, int]] = {
    "wheat":  {"crop_group_nuts": 0, "crop_group_other": 0, "crop_group_rye": 0},
    "maize":  {"crop_group_nuts": 0, "crop_group_other": 0, "crop_group_rye": 0},
    "barley": {"crop_group_nuts": 0, "crop_group_other": 0, "crop_group_rye": 0},
    "nuts":   {"crop_group_nuts": 1, "crop_group_other": 0, "crop_group_rye": 0},
    "rye":    {"crop_group_nuts": 0, "crop_group_other": 0, "crop_group_rye": 1},
}


@lru_cache(maxsize=1)
def _load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"LightGBM model not found: {MODEL_PATH}")
    import lightgbm as lgb  # lazy import — app starts even if lightgbm not installed
    return lgb.Booster(model_file=str(MODEL_PATH))


async def _fetch_daily_weather(lat: float, lon: float) -> pd.DataFrame:
    """Fetch 61 days of hourly Open-Meteo data and aggregate to daily rows."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m,relative_humidity_2m,precipitation",
        "past_days": 61,
        "forecast_days": 0,
        "timezone": "auto",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(_OPEN_METEO_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    h = data["hourly"]
    df_h = pd.DataFrame({
        "dt":   pd.to_datetime(h["time"]),
        "temp": h["temperature_2m"],
        "rh":   h["relative_humidity_2m"],
        "prec": h["precipitation"],
    }).dropna(subset=["temp", "rh"])

    df_h["date"] = df_h["dt"].dt.normalize()
    daily = (
        df_h.groupby("date")
        .agg(
            temperature_2m_mean=("temp", "mean"),
            temperature_2m_max=("temp", "max"),
            temperature_2m_min=("temp", "min"),
            relative_humidity_2m_mean=("rh", "mean"),
            precipitation_sum=("prec", "sum"),
        )
        .reset_index()
        .sort_values("date")
        .reset_index(drop=True)
    )
    return daily


def _build_features(weather_df: pd.DataFrame, crop_group: str) -> dict:
    """Build 75 lag/stat features from 60 days of weather history."""
    target_date = weather_df["date"].max()
    hist = weather_df[weather_df["date"] < target_date].set_index("date")

    feats: dict = {}

    for col in _WEATHER_COLS:
        s = hist[col].dropna() if col in hist.columns else pd.Series(dtype=float)
        for lag in _LAGS:
            feats[f"{col}_lag_{lag}"] = float(s.iloc[-lag]) if len(s) >= lag else 0.0
        n = len(s)
        feats[f"{col}_mean_last_60obs"]   = float(s.mean())   if n > 0 else 0.0
        feats[f"{col}_std_last_60obs"]    = float(s.std())    if n > 1 else 0.0
        feats[f"{col}_min_last_60obs"]    = float(s.min())    if n > 0 else 0.0
        feats[f"{col}_max_last_60obs"]    = float(s.max())    if n > 0 else 0.0
        feats[f"{col}_median_last_60obs"] = float(s.median()) if n > 0 else 0.0

    p = hist["precipitation_sum"].dropna() if "precipitation_sum" in hist.columns else pd.Series(dtype=float)
    feats["rainy_days_last_obs"]           = int((p > 0).sum())
    feats["precipitation_cumsum_last_obs"] = float(p.sum())
    feats["precipitation_mean_last_obs"]   = float(p.mean()) if len(p) > 0 else 0.0

    rh = hist["relative_humidity_2m_mean"].dropna() if "relative_humidity_2m_mean" in hist.columns else pd.Series(dtype=float)
    feats["high_humidity_days_last_obs"] = int((rh >= 80).sum())

    tx = hist["temperature_2m_max"].dropna() if "temperature_2m_max" in hist.columns else pd.Series(dtype=float)
    feats["hot_days_last_obs"] = int((tx >= 25).sum())

    tn = hist["temperature_2m_min"].dropna() if "temperature_2m_min" in hist.columns else pd.Series(dtype=float)
    feats["cold_days_last_obs"] = int((tn <= 5).sum())

    feats["day_of_year"] = int(target_date.timetuple().tm_yday)
    feats.update(_CROP_MAP.get(crop_group, _CROP_MAP["wheat"]))
    return feats


def _run_model(base_feats: dict, toxin_col: str) -> float:
    model = _load_model()
    row = {t: 0 for t in _TOXIN_DUMMIES}
    row[toxin_col] = 1
    row.update(base_feats)
    X = pd.DataFrame([{f: row.get(f, 0) for f in model.feature_name()}])
    return float(model.predict(X)[0])


async def predict_toxins(lat: float, lon: float, crop_group: str = "wheat") -> dict:
    """
    Full pipeline: Open-Meteo 61-day weather → lag features → LightGBM.

    Returns { ZEN: float, DON: float, weather: dict } with probabilities in [0, 1].
    Raises on network error or missing model file.
    """
    weather_df = await _fetch_daily_weather(lat, lon)
    base_feats = _build_features(weather_df, crop_group)

    zen_prob, don_prob = await asyncio.gather(
        asyncio.to_thread(_run_model, base_feats, "toxin_name_zearalenone"),
        asyncio.to_thread(_run_model, base_feats, "toxin_name_deoxynivalenol"),
    )

    latest = weather_df.iloc[-1]
    weather_summary = {
        "temperature_2m_mean":       round(float(latest["temperature_2m_mean"]), 2),
        "temperature_2m_max":        round(float(latest["temperature_2m_max"]), 2),
        "temperature_2m_min":        round(float(latest["temperature_2m_min"]), 2),
        "relative_humidity_2m_mean": round(float(latest["relative_humidity_2m_mean"]), 2),
        "precipitation_sum":         round(float(latest["precipitation_sum"]), 2),
        "cloud_cover_mean":          50.0,
    }

    return {"ZEN": float(zen_prob), "DON": float(don_prob), "weather": weather_summary}
