"""
Contamination prediction service.

- run()         : legacy file-based flow (used by /map/weather confirm=true)
- run_unified() : unified flow for /predict/full — takes weather dict + real ZEN
                  probability from the Random Forest, adds DON & FUM mock models,
                  saves CSV + result JSON, returns full payload.

Replace _compute_don / _compute_fum with real model calls once artefacts are ready.
"""
import json
import hashlib
import pandas as pd
from datetime import datetime, timezone
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "api" / "data"


# ── helpers ────────────────────────────────────────────────────────────────

def _seed(lat: float, lon: float) -> int:
    return int(hashlib.md5(f"{lat:.4f}{lon:.4f}".encode()).hexdigest(), 16)


def _zen_mock(row: dict, seed_int: int) -> float:
    """ZEN mock (used only by the legacy run() path, not by run_unified)."""
    temp = float(row.get("temperature_2m_mean") or 20.0)
    humidity = float(row.get("relative_humidity_2m_mean") or 50.0)
    precip = float(row.get("precipitation_sum") or 0.0)
    temp_factor = max(0.0, 1.0 - abs(temp - 20.0) / 20.0)
    humidity_factor = min(1.0, max(0.0, (humidity - 40.0) / 50.0))
    precip_factor = min(1.0, precip / 8.0)
    prob = 0.35 * temp_factor + 0.45 * humidity_factor + 0.20 * precip_factor
    noise = ((seed_int % 1000) / 1000.0 - 0.5) * 0.06
    return max(0.0, min(1.0, prob + noise))


def _compute_don(row: dict, seed_int: int) -> float:
    """
    DON (Déoxynivalénol) mock — Fusarium graminearum / culmorum.
    Optimal window: 12-22 °C, more cold-tolerant than ZEN, high humidity critical.
    """
    temp = float(row.get("temperature_2m_mean") or 17.0)
    humidity = float(row.get("relative_humidity_2m_mean") or 50.0)
    precip = float(row.get("precipitation_sum") or 0.0)
    temp_factor = max(0.0, 1.0 - abs(temp - 17.0) / 20.0)
    humidity_factor = min(1.0, max(0.0, (humidity - 45.0) / 45.0))
    precip_factor = min(1.0, precip / 6.0)
    prob = 0.30 * temp_factor + 0.50 * humidity_factor + 0.20 * precip_factor
    noise = ((seed_int % 800) / 800.0 - 0.5) * 0.08
    return max(0.0, min(1.0, prob + noise))


def _compute_fum(row: dict, seed_int: int) -> float:
    """
    Fumonisines mock — Fusarium verticillioides / proliferatum.
    Optimal window: 20-30 °C, less humidity-sensitive, maize-specific.
    """
    temp = float(row.get("temperature_2m_mean") or 25.0)
    humidity = float(row.get("relative_humidity_2m_mean") or 50.0)
    precip = float(row.get("precipitation_sum") or 0.0)
    temp_factor = max(0.0, 1.0 - abs(temp - 25.0) / 18.0)
    humidity_factor = min(1.0, max(0.0, (humidity - 35.0) / 55.0))
    precip_factor = min(1.0, precip / 10.0)
    prob = 0.45 * temp_factor + 0.35 * humidity_factor + 0.20 * precip_factor
    noise = ((seed_int % 600) / 600.0 - 0.5) * 0.07
    return max(0.0, min(1.0, prob + noise))


def _risk(prob: float) -> str:
    if prob < 0.33:
        return "GREEN"
    if prob < 0.66:
        return "ORANGE"
    return "RED"


# ── public API ─────────────────────────────────────────────────────────────

def run(weather_file: str) -> dict:
    """
    Legacy file-based flow: read CSV → ZEN mock → write result JSON.
    Called by POST /map/weather with confirm=true.
    """
    source_path = DATA_DIR / weather_file
    if not source_path.exists():
        raise FileNotFoundError(f"Weather file not found: {weather_file}")

    df = pd.read_csv(source_path)
    row = df.to_dict(orient="records")[-1]
    lat = float(row.get("latitude") or 0.0)
    lon = float(row.get("longitude") or 0.0)
    s = _seed(lat, lon)

    zen_prob = _zen_mock(row, s)
    accuracy = round(85.0 + (s % 700) / 100.0, 1)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    result_filename = f"prediction_result_{source_path.stem}_{timestamp}.json"
    result = {
        "contamination_probability": round(zen_prob * 100, 1),
        "accuracy": accuracy,
        "source_file": weather_file,
        "result_file": result_filename,
        "generated_at": timestamp,
    }
    with open(DATA_DIR / result_filename, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    return result


def run_unified(
    weather: dict,
    lat: float,
    lon: float,
    zen_probability: float,
    zen_roc_auc: float,
) -> dict:
    """
    Unified flow for POST /predict/full.

    Parameters
    ----------
    weather       : daily weather dict from weather_model._fetch_daily_weather
    lat, lon      : parcel coordinates
    zen_probability : 0-1 probability from the real Random Forest
    zen_roc_auc   : ROC-AUC of the ZEN model (0-1)

    Returns the full prediction payload and writes CSV + result JSON to api/data/.
    """
    s = _seed(lat, lon)
    row = {**weather, "latitude": lat, "longitude": lon}

    don_prob = _compute_don(row, s)
    fum_prob = _compute_fum(row, s)

    # Overall: weighted average (ZEN most established, DON second, FUM third)
    overall_prob = 0.40 * zen_probability + 0.35 * don_prob + 0.25 * fum_prob

    # Accuracy: ZEN uses real ROC-AUC, DON/FUM are mock
    don_acc = 85.0 + (s % 500) / 100.0
    fum_acc = 82.0 + (s % 600) / 100.0
    overall_acc = 0.40 * (zen_roc_auc * 100) + 0.35 * don_acc + 0.25 * fum_acc

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    # Save weather CSV
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

    # Build result
    result_filename = f"prediction_result_{lat:.5f}_{lon:.5f}_{timestamp}.json"
    result = {
        "contamination_probability": round(overall_prob * 100, 1),
        "toxins": {
            "ZEN": round(zen_probability * 100, 1),
            "DON": round(don_prob * 100, 1),
            "FUM": round(fum_prob * 100, 1),
        },
        "accuracy": round(overall_acc, 1),
        "risk_level": _risk(overall_prob),
        "weather": weather,
        "model_roc_auc": round(zen_roc_auc, 3),
        "source_file": csv_filename,
        "result_file": result_filename,
        "generated_at": timestamp,
    }
    with open(DATA_DIR / result_filename, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    return result


def latest_weather_file(lat: float, lon: float) -> str | None:
    """Return the filename of the most recent weather file for these coordinates."""
    prefix = f"weather_{lat:.5f}_{lon:.5f}_"
    candidates = sorted(DATA_DIR.glob(f"{prefix}*.csv"))
    return candidates[-1].name if candidates else None
