"""
Mock aptamer/biosensor model service.
Reads a weather CSV file produced by /map/weather and writes a prediction result file.

Replace the _compute() function body with a real model call once the model artefact is ready — the file I/O and API surface stay the same.
"""
import json
import hashlib
import pandas as pd
from datetime import datetime, timezone
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "api" / "data"


def _compute(weather_rows: list[dict]) -> tuple[float, float]:
    """
    Biologically-plausible mock for ZEN contamination probability and model accuracy.

    Fusarium (ZEN producer) risk drivers:
      - Temperature 15-25 °C  (optimal growth window)
      - Relative humidity > 60 %
      - Precipitation (wet conditions)

    Returns (contamination_probability_pct, accuracy_pct).
    """
    if not weather_rows:
        return 0.0, 0.0

    row = weather_rows[-1]  # use the most recent day

    temp = float(row.get("temperature_2m_mean") or 20.0)
    humidity = float(row.get("relative_humidity_2m_mean") or 50.0)
    precip = float(row.get("precipitation_sum") or 0.0)
    lat = float(row.get("latitude") or 0.0)
    lon = float(row.get("longitude") or 0.0)

    temp_factor = max(0.0, 1.0 - abs(temp - 20.0) / 20.0)
    humidity_factor = min(1.0, max(0.0, (humidity - 40.0) / 50.0))
    precip_factor = min(1.0, precip / 8.0)

    prob = 0.35 * temp_factor + 0.45 * humidity_factor + 0.20 * precip_factor

    # Reproducible noise seeded by location so the same field always returns the same score
    seed_int = int(hashlib.md5(f"{lat:.4f}{lon:.4f}".encode()).hexdigest(), 16)
    noise = ((seed_int % 1000) / 1000.0 - 0.5) * 0.06
    prob = max(0.0, min(1.0, prob + noise))

    # Mock accuracy: stable at ~88 % ± small location-based jitter
    accuracy = 85.0 + (seed_int % 700) / 100.0  # range 85.0 – 92.0

    return round(prob * 100, 1), round(accuracy, 1)


def run(weather_file: str) -> dict:
    """
    Read `weather_file` from the data directory, run the mock model,
    write a result JSON next to the source file, and return the payload.

    Raises FileNotFoundError if the source file does not exist.
    """
    source_path = DATA_DIR / weather_file
    if not source_path.exists():
        raise FileNotFoundError(f"Weather file not found: {weather_file}")

    df = pd.read_csv(source_path)
    weather_rows = df.to_dict(orient="records")

    contamination_probability, accuracy = _compute(weather_rows)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    stem = source_path.stem  # e.g. weather_48.50000_2.30000_20260606T170516Z
    result_filename = f"prediction_result_{stem}_{timestamp}.json"
    result_path = DATA_DIR / result_filename

    result = {
        "contamination_probability": contamination_probability,
        "accuracy": accuracy,
        "source_file": weather_file,
        "result_file": result_filename,
        "generated_at": timestamp,
    }

    with open(result_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    return result


def latest_weather_file(lat: float, lon: float) -> str | None:
    """Return the filename of the most recent weather file for these coordinates."""
    prefix = f"weather_{lat:.5f}_{lon:.5f}_"
    candidates = sorted(DATA_DIR.glob(f"{prefix}*.csv"))
    return candidates[-1].name if candidates else None
