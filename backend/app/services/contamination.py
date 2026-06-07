"""
Contamination prediction service.

Receives ZEN + DON probabilities from the LightGBM pipeline,
adds FUM mock (Fusarium verticillioides — not in LightGBM model),
saves CSV + result JSON to api/data/, and returns the full payload.
"""
import json
import hashlib
import pandas as pd
from datetime import datetime, timezone
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "api" / "data"


def _seed(lat: float, lon: float) -> int:
    return int(hashlib.md5(f"{lat:.4f}{lon:.4f}".encode()).hexdigest(), 16)


def _compute_fum(row: dict, seed_int: int) -> float:
    """FUM mock — Fusarium verticillioides. Optimal 20-30°C, less humidity-sensitive."""
    temp     = float(row.get("temperature_2m_mean")       or 25.0)
    humidity = float(row.get("relative_humidity_2m_mean") or 50.0)
    precip   = float(row.get("precipitation_sum")         or 0.0)
    temp_factor     = max(0.0, 1.0 - abs(temp - 25.0) / 18.0)
    humidity_factor = min(1.0, max(0.0, (humidity - 35.0) / 55.0))
    precip_factor   = min(1.0, precip / 10.0)
    prob  = 0.45 * temp_factor + 0.35 * humidity_factor + 0.20 * precip_factor
    noise = ((seed_int % 600) / 600.0 - 0.5) * 0.07
    return max(0.0, min(1.0, prob + noise))


def _risk(prob: float) -> str:
    if prob < 0.33:
        return "GREEN"
    if prob < 0.66:
        return "ORANGE"
    return "RED"


def run_unified(
    weather: dict,
    lat: float,
    lon: float,
    zen_probability: float,
    don_probability: float,
) -> dict:
    """
    Build final prediction payload.

    Parameters
    ----------
    weather         : daily weather dict from lgbm_pipeline
    lat, lon        : parcel coordinates
    zen_probability : ZEN probability from LightGBM (0-1)
    don_probability : DON probability from LightGBM (0-1)
    """
    s = _seed(lat, lon)
    fum_prob     = _compute_fum(weather, s)
    overall_prob = 0.40 * zen_probability + 0.35 * don_probability + 0.25 * fum_prob

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    csv_filename = f"weather_{lat:.5f}_{lon:.5f}_{timestamp}.csv"
    pd.DataFrame([{
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        **{k: weather.get(k) for k in [
            "temperature_2m_mean", "temperature_2m_max", "temperature_2m_min",
            "relative_humidity_2m_mean", "precipitation_sum",
        ]},
        "latitude": lat,
        "longitude": lon,
    }]).to_csv(DATA_DIR / csv_filename, index=False, encoding="utf-8")

    result_filename = f"prediction_result_{lat:.5f}_{lon:.5f}_{timestamp}.json"
    result = {
        "contamination_probability": round(overall_prob * 100, 1),
        "toxins": {
            "ZEN": round(zen_probability * 100, 1),
            "DON": round(don_probability * 100, 1),
            "FUM": round(fum_prob * 100, 1),
        },
        "accuracy":      0.0,
        "risk_level":    _risk(overall_prob),
        "weather":       weather,
        "model_roc_auc": 0.0,
        "source_file":   csv_filename,
        "result_file":   result_filename,
        "generated_at":  timestamp,
    }
    with open(DATA_DIR / result_filename, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    return result


def latest_weather_file(lat: float, lon: float) -> str | None:
    """Return the filename of the most recent weather CSV for these coordinates."""
    prefix     = f"weather_{lat:.5f}_{lon:.5f}_"
    candidates = sorted(DATA_DIR.glob(f"{prefix}*.csv"))
    return candidates[-1].name if candidates else None
